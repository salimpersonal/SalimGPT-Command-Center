const CACHE = 'salimgpt-v2-20261015-2';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './assets/styles.css',
  './assets/js/main.js', './assets/js/domain.js', './assets/js/storage.js',
  './assets/js/icons.js', './assets/js/i18n.js', './assets/js/cloud.js',
  './assets/img/sg-logo.webp', './assets/img/icon-192.png', './assets/img/icon-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(fetch(req).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy));
    }
    return response;
  }).catch(async () => (await caches.match(req)) || Response.error()));
});
