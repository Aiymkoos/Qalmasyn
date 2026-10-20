const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs/promises');
const path = require('node:path');
const { startServer, launchBrowser } = require('./helpers.cjs');
const origin = 'https://qalmasyn.test';

async function worker() {
  const listeners = {}, stores = new Map();
  const absolute = value => new URL(typeof value === 'string' ? value : value.url, origin + '/').href;
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        async put(request, response) { store.set(absolute(request), response.clone()); },
        async match(request, options = {}) {
          const key = absolute(request);
          for (const [url, response] of store) {
            if (url === key || (options.ignoreSearch && url.split('?')[0] === key.split('?')[0])) return response.clone();
          }
        },
        async addAll(requests) {
          for (const request of requests) {
            const url = new URL(absolute(request));
            const file = path.join(__dirname, '..', url.pathname === '/' ? 'index.html' : url.pathname);
            const contents = await fs.readFile(file);
            store.set(url.href, new Response(contents));
          }
        }
      };
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
    async match(request, options) {
      for (const name of stores.keys()) {
        const found = await (await caches.open(name)).match(request, options);
        if (found) return found;
      }
    }
  };
  let network = async request => new Response('network: ' + absolute(request));
  const self = { location: new URL(origin + '/sw.js'),
    registration: { scope: origin + '/' }, clients: { claim: async () => {} },
    skipWaiting: async () => {}, addEventListener: (type, handler) => { listeners[type] = handler; } };
  const source = await fs.readFile(path.join(__dirname, '..', 'sw.js'), 'utf8');
  vm.runInNewContext(source, { self, caches, URL, Response, Request, fetch: request => network(request) });
  return {
    caches, setNetwork: handler => { network = handler; },
    async dispatch(type, request) {
      const pending = [];
      let response;
      listeners[type]({ request, waitUntil: promise => pending.push(promise),
        respondWith: promise => { response = promise; } });
      const result = response === undefined ? undefined : await response;
      await Promise.all(pending);
      return result;
    }
  };
}

test('precache contains existing files and the versioned assets used by HTML', async () => {
  const sw = await worker();
  await sw.dispatch('install');
  const html = await fs.readFile(path.join(__dirname, '..', 'index.html'), 'utf8');
  for (const [, asset] of html.matchAll(/(?:src|href)="((?:styles\.css|app\.js|i18n\.js)[^"]*)"/g)) {
    assert.ok(await sw.caches.match(origin + '/' + asset), `Missing exact precache URL: ${asset}`);
  }
});

test('activation removes legacy app caches without deleting other apps', async () => {
  const sw = await worker();
  await sw.caches.open('qalmasyn-v1');
  await sw.caches.open('qalmasyn-v2');
  await sw.caches.open('other-app');
  await sw.dispatch('activate');
  assert.deepEqual(await sw.caches.keys(), ['other-app']);
});

test('API requests bypass even a poisoned legacy cache, including different query strings', async () => {
  const sw = await worker();
  const cache = await sw.caches.open('qalmasyn-v2');
  await cache.put('https://db.supabase.co/rest/v1/offers?select=*&order=id.asc', new Response('[{"id":1,"portions":0}]'));
  const api = new Request('https://db.supabase.co/rest/v1/offers?select=id&limit=1');
  assert.equal(await sw.dispatch('fetch', api), undefined, 'Cross-origin API must use the browser network');
  assert.equal(await sw.dispatch('fetch', new Request(origin + '/api/offers')), undefined);
  assert.equal(await sw.dispatch('fetch', new Request(origin + '/app.js', { method: 'POST' })), undefined);
});

test('online shell requests get fresh contents, offline lookup preserves query parameters', async () => {
  const sw = await worker();
  await sw.dispatch('fetch', new Request(origin + '/app.js?v=17'));
  sw.setNetwork(async () => new Response('updated application'));
  assert.equal(await (await sw.dispatch('fetch', new Request(origin + '/app.js?v=17'))).text(), 'updated application');
  sw.setNetwork(async () => { throw new TypeError('offline'); });
  assert.equal(await (await sw.dispatch('fetch', new Request(origin + '/app.js?v=17'))).text(), 'updated application');
  const otherVersion = await sw.dispatch('fetch', new Request(origin + '/app.js?v=999'));
  assert.equal(otherVersion.type, 'error', 'Uncached version must not receive old JS or HTML');
});

test('HTML fallback is only for navigation', async () => {
  const sw = await worker();
  await sw.dispatch('install');
  sw.setNetwork(async () => { throw new TypeError('offline'); });
  const navigation = { url: origin + '/?source=qr', method: 'GET', mode: 'navigate' };
  const response = await sw.dispatch('fetch', navigation);
  assert.match(await response.text(), /<title>Qalmasyn/);
  const missing = await sw.dispatch('fetch', new Request(origin + '/styles.css?v=missing'));
  assert.equal(missing.type, 'error');
});

test('navigation outside the app shell cannot poison its offline HTML fallback', async () => {
  const sw = await worker();
  await sw.dispatch('install');
  sw.setNetwork(async () => new Response('JPEG-BYTES', {
    headers: { 'Content-Type': 'image/jpeg' },
  }));
  for (const pathname of ['/assets/hero.jpg', '/other-page']) {
    assert.equal(await sw.dispatch('fetch', {
      url: origin + pathname, method: 'GET', mode: 'navigate',
    }), undefined, 'Unrelated navigations must bypass the app shell cache');
  }
  sw.setNetwork(async () => { throw new TypeError('offline'); });
  const response = await sw.dispatch('fetch', {
    url: origin + '/?source=qr', method: 'GET', mode: 'navigate',
  });
  assert.match(await response.text(), /<title>Qalmasyn/);
});

test('a non-HTML response at the shell URL does not replace cached HTML', async () => {
  const sw = await worker();
  await sw.dispatch('install');
  sw.setNetwork(async () => new Response('Unexpected upstream response', {
    headers: { 'Content-Type': 'text/plain' },
  }));
  await sw.dispatch('fetch', { url: origin + '/', method: 'GET', mode: 'navigate' });
  sw.setNetwork(async () => { throw new TypeError('offline'); });
  for (const pathname of ['/', '/?source=qr']) {
    const response = await sw.dispatch('fetch', {
      url: origin + pathname, method: 'GET', mode: 'navigate',
    });
    assert.match(await response.text(), /<title>Qalmasyn/);
  }
});

test('real browser installs the worker on a strict server and reloads offline', { timeout: 30000 }, async t => {
  const server = await startServer(), browser = await launchBrowser();
  t.after(async () => { await browser.close(); await server.close(); });
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();
  await page.goto(server.url, { waitUntil: 'load' });
  await page.waitForFunction(() => navigator.serviceWorker.controller, { }, { timeout: 8000 });
  const keys = await page.evaluate(() => caches.keys());
  assert.equal(keys.length, 1);
  await context.setOffline(true);
  await page.goto(server.url + '/?source=qr', { waitUntil: 'load' });
  await page.locator('#offers [data-offer]').first().waitFor();
  assert.equal(await page.locator('#offers [data-offer]').count(), 6);
  assert.equal(await page.evaluate(() => typeof window.QalmasynDB.loadOffers), 'function');
  assert.equal(await page.locator('.hero-visual img').evaluate(img => img.complete && img.naturalWidth > 0), true);
});
