const CACHE='qalmasyn-v2';
const ASSETS=['./','./index.html','./styles.css','./app.js','./i18n.js','./supabase.js','./config.js','./manifest.webmanifest','./assets/lucide.min.js','./assets/hero.jpg','./assets/pancakes.jpg','./assets/coffee.jpg','./assets/vegetables.jpg','./assets/bakery.jpg','./assets/pizza.jpg','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||fetch(event.request).then(response=>{if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}return response;}).catch(()=>caches.match('./index.html'))));});
