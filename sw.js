const CACHE = 'qalmasyn-v3';
const ASSETS = [
  './', './index.html', './styles.css?v=22', './app.js?v=17', './i18n.js?v=7',
  './supabase.js', './config.js', './manifest.webmanifest', './assets/lucide.min.js',
  './assets/hero.jpg', './assets/pancakes.jpg', './assets/coffee.jpg',
  './assets/vegetables.jpg', './assets/bakery.jpg', './assets/pizza.jpg', './assets/app-icon.svg'
];
const ASSET_PATHS = new Set(ASSETS.map(asset => new URL(asset, self.registration.scope).pathname));
const SHELL_PATHS = new Set(['./', './index.html'].map(asset =>
  new URL(asset, self.registration.scope).pathname));

self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE)
    .then(cache => cache.addAll(ASSETS.map(asset =>
      new Request(new URL(asset, self.registration.scope), { cache: 'reload' }))))
    .then(() => self.skipWaiting())
));

self.addEventListener('activate', event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('qalmasyn-') && key !== CACHE)
      .map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));

async function networkFirst(request, navigation) {
  try {
    const response = await fetch(request);
    const html = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase() === 'text/html';
    if (response.ok && (!navigation || html)) {
      // A full or unavailable cache must not break a successful online request.
      try {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
        if (navigation) await cache.put('./index.html', response.clone());
      } catch {}
    }
    return response;
  } catch {
    try {
      const cache = await caches.open(CACHE);
      return await cache.match(request)
        || (navigation && await cache.match('./index.html'))
        || Response.error();
    } catch { return Response.error(); }
  }
}

self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  // Supabase, 2GIS and other external requests always go to the network.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const navigation = request.mode === 'navigate';
  if (navigation && !SHELL_PATHS.has(url.pathname)) return;
  if (!navigation && !ASSET_PATHS.has(url.pathname)) return;
  // Exact URLs retain query parameters; never substitute HTML for a script or API response.
  event.respondWith(networkFirst(request, navigation));
});
