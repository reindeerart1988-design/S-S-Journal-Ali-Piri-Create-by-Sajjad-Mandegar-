const CACHE_NAME='ss-journal-v53';
const APP_SHELL=['./backtest-pdf.js?v=53','./vendor/html2canvas.min.js?v=53','./vendor/jspdf.umd.min.js?v=53','./backtest.css?v=53','./backtest-core.js?v=53','./backtest.js?v=53','./','./index.html','./styles.css?v=53','./app.js?v=53','./ui-enhance.js?v=53','./ux.js?v=53','./subscription.js?v=53','./tips-private.js?v=53','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ss-journal-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
 e.respondWith(fetch(r).then(res=>{if(res.ok){const copy=res.clone();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.put(r,copy)));}return res;}).catch(async()=>await caches.match(r)||Response.error()));
});
