const CACHE_NAME='riptwosec-scan-v31';
const CORE_ASSETS=[
  './',
  './index.html',
  './help.html',
  './privacy.html',
  './terms.html',
  './manifest.webmanifest',
  './css/style.css',
  './css/features.css',
  './css/background.css',
  './css/tool-cleanup.css',
  './css/output-rim.css',
  './css/pro-tool.css?v=6',
  './css/themes.css?v=3',
  './css/theme-contrast.css?v=19',
  './js/state.js',
  './js/theme.js?v=14',
  './js/utils.js',
  './js/ocr-skills.js?v=2',
  './js/dictionary-it.js',
  './js/custom-rules.js',
  './js/text-cleaner.js?v=8',
  './js/quality-review.js?v=2',
  './js/crop.js',
  './js/ocr.js?v=7',
  './js/pdf-handler.js',
  './js/batch.js',
  './js/search.js',
  './js/exporter.js?v=5',
  './js/history.js',
  './js/app.js?v=5',
  './js/scan-3d.js?v=5'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  event.respondWith(
    caches.match(event.request).then(cached=>{
      if(cached)return cached;
      return fetch(event.request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));
        return response;
      }).catch(()=>caches.match('./index.html'));
    })
  );
});
