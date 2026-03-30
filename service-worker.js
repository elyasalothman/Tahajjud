const CACHE_NAME = 'rafiq-cache-v1.2.0';
const ASSETS = [
  './', './index.html', './assets/css/styles.css', './assets/js/app.js',
  './assets/data/adhkar.json', './assets/data/benefits.json', './assets/data/learning.json', './assets/data/resources.json'
];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(res => res || fetch(e.request))));
