const CACHE_NAME='riptwosec-scan-v49-government-oqc';
const CORE_ASSETS=[
  './','./index.html','./help.html','./privacy.html','./terms.html','./manifest.webmanifest',
  './css/style.css','./css/cyber-ai-theme.css?v=2','./css/system-upgrade.css?v=2',
  './js/theme.js?v=17','./js/state.js?v=2','./js/utils.js?v=3','./js/app.js?v=8',
  './js/oqc-strict-review.js?v=3','./js/system-upgrade.js?v=2',
  './js/image-analyzer.js?v=1','./js/preprocess-service.js?v=1','./js/government-oqc.js?v=1',
  './js/document-extractor.js?v=2','./js/multi-ocr-service.js?v=1','./js/oqc-brain.js?v=2',
  './js/user-learning.js?v=1','./js/ocr-dashboard-ui.js?v=1'
];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)));self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))));self.clients.claim();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  if(new URL(event.request.url).origin!==self.location.origin)return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match('./index.html'))));
});
