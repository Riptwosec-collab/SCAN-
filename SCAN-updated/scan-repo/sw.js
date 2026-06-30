const CACHE_NAME='riptwosec-scan-v35';
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
  './css/pro-tool.css?v=9',
  './css/themes.css?v=5',
  './css/theme-contrast.css?v=21',
  './js/state.js?v=1',
  './js/theme.js?v=17',
  './js/utils.js?v=3',
  './js/ocr-skills.js?v=2',
  './js/pdf-skills.js?v=1',
  './js/paddle-client.js?v=2',
  './js/dictionary-it.js',
  './js/custom-rules.js',
  './js/text-cleaner.js?v=9',
  './js/quality-review.js?v=3',
  './js/crop.js',
  './js/ocr.js?v=9',
  './js/image-quality.js?v=1',
  './js/pdf-handler.js?v=3',
  './js/batch.js?v=2',
  './js/search.js',
  './js/exporter.js?v=6',
  './js/history.js',
  './js/app.js?v=8',
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
  if(new URL(event.request.url).origin!==self.location.origin)return;
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
