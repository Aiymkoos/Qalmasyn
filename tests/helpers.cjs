const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.webmanifest': 'application/manifest+json' };

async function startServer() {
  const server = http.createServer(async (req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try {
      // Never expose production keys to automated tests, including the real service worker.
      const body = pathname === '/config.js' ? 'window.QALMASYN_CONFIG={};' : await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-store' }).end(body);
    } catch { res.writeHead(404).end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}

function launchBrowser() {
  return chromium.launch({ headless: true,
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
}

async function openApp(browser, url, { width = 390, language = 'ru', onlineDb = false } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 },
    isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const db = { offers: [
    { id: 1, restaurant: 'Тестовая пекарня', dish: 'Пакет свежей выпечки', category: 'bakery',
      old_price: 3300, price: 990, floor: 500, portions: 3, pickup_start: '20:00', pickup: '21:00',
      address: 'Тестовый адрес, 1', district: 'center', photo: 'assets/hero.jpg', description: 'Тестовый набор.' },
    { id: 2, restaurant: 'Тестовое кафе', dish: 'Кофе и круассан', category: 'cafe',
      old_price: 2800, price: 1290, floor: 700, portions: 4, pickup_start: '19:30', pickup: '21:30',
      address: 'Тестовый адрес, 2', district: 'center', photo: 'assets/coffee.jpg', description: 'Тестовое предложение.' }
  ], bookings: [], createCalls: 0, cancelCalls: 0 };
  await context.addInitScript(({ language }) => {
    localStorage.setItem('qalmasyn-lang', language);
    // Fixed demo time keeps prices and filters independent of the test runner's timezone.
    const NativeDate = Date;
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : ['2026-10-20T20:00:00'])); }
      static now() { return new NativeDate('2026-10-20T20:00:00').getTime(); }
    };
  }, { language });
  await context.route('**/*', async route => {
    const request = route.request(), target = new URL(request.url());
    if (target.origin === url && target.pathname === '/config.js') {
      return route.fulfill({ contentType: 'text/javascript', body: `window.QALMASYN_CONFIG=${JSON.stringify(
        onlineDb ? { supabaseUrl: 'https://db.qalmasyn.test', supabaseAnonKey: 'test-only' } : {}
      )};` });
    }
    if (target.hostname === 'db.qalmasyn.test') {
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204 });
      if (target.pathname === '/rest/v1/offers') return route.fulfill({ json: db.offers });
      const data = request.postDataJSON();
      if (target.pathname.endsWith('/create_booking')) db.createCalls++;
      if (target.pathname.endsWith('/cancel_booking')) db.cancelCalls++;
      await new Promise(resolve => setTimeout(resolve, 100));
      if (target.pathname.endsWith('/create_booking')) {
        const offer = db.offers.find(o => o.id === data.p_offer_id);
        if (!offer || offer.portions < 1) return route.fulfill({ status: 409, json: { error: 'sold out' } });
        offer.portions--;
        db.bookings.push({ ...data, code: data.p_code });
        return route.fulfill({ json: [{ code: data.p_code }] });
      }
      if (target.pathname.endsWith('/cancel_booking')) {
        const index = db.bookings.findIndex(b => b.code === data.p_code);
        if (index >= 0) {
          const [booking] = db.bookings.splice(index, 1);
          db.offers.find(o => o.id === booking.p_offer_id).portions++;
        }
        return route.fulfill({ status: 204 });
      }
      return route.abort();
    }
    if (target.origin === url || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(target.hostname)) return route.continue();
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.locator('#offers [data-offer]').first().waitFor();
  return { context, page, db };
}

module.exports = { startServer, launchBrowser, openApp };
