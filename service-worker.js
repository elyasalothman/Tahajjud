self.addEventListener('install', (e)=>{
  e.waitUntil(
    caches.open('rafiq-cache-v1').then(c=>c.addAll([
      './',
      './index.html',
      './assets/css/styles.css',
      './assets/js/app.js',
      './assets/js/config.js',
      './pages/resources.html'
    ]))
  );
});
self.addEventListener('fetch', (e)=>{
  e.respondWith(
    caches.match(e.request).then((r)=> r || fetch(e.request))
  );
});
