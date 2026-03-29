const CACHE_NAME = 'rafiq-cache-v0.6.3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './assets/css/styles.css?v=0.6.3',
  './assets/js/app.js?v=0.6.3',
  './assets/js/config.json',
  './data/benefits.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); 
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k); }))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((res) => res || fetch(event.request)));
});
