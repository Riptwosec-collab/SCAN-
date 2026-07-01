const CACHE_NAME='riptwosec-scan-v44-oqc-token-clean';
const CORE_ASSETS=[
  './',
  './index.html',
  './help.html',
  './privacy.html',
  './terms.html',
  './manifest.webmanifest',
  './css/style.css',
  './css/cyber-ai-theme.css?v=2',
  './css/features.css',
  './css/background.css',
  './css/tool-cleanup.css',
  './css/output-rim.css',
  './css/pro-tool.css?v=9',
  './css/themes.css?v=5',
  './css/theme-contrast.css?v=21',
  './css/multi-ocr-oqc.css?v=1',
  './css/multi-ocr-live-ui.css?v=2',
  './css/ocr-layout-formatter.css?v=1',
  './js/state.js?v=2',
  './js/theme.js?v=17',
  './js/utils.js?v=3',
  './js/token-protector.js?v=1',
  './js/thai-normalizer.js?v=1',
  './js/field-validator.js?v=1',
  './js/symbol-score.js?v=1',
  './js/pdf-accuracy-pipeline.js?v=1',
  './js/ocr-skills.js?v=3',
  './js/pdf-skills.js?v=1',
  './js/paddle-client.js?v=2',
  './js/dictionary-it.js',
  './js/custom-rules.js',
  './js/text-cleaner.js?v=10',
  './js/quality-review.js?v=3',
  './js/crop.js',
  './js/ocr.js?v=10',
  './js/image-quality.js?v=1',
  './js/pdf-handler.js?v=4',
  './js/batch.js?v=2',
  './js/search.js',
  './js/exporter.js?v=6',
  './js/history.js',
  './js/app.js?v=8',
  './js/multi-ocr-oqc.js?v=1',
  './js/multi-ocr-live-ui.js?v=1',
  './js/ocr-layout-formatter.js?v=1',
  './js/oqc-strict-review.js?v=2',
  './js/scan-3d.js?v=5'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));
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
