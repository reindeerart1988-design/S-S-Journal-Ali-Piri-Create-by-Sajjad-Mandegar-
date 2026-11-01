const CACHE_NAME='ss-journal-v42';
const APP_SHELL=['./backtest-pdf.js?v=42','./vendor/html2canvas.min.js?v=42','./vendor/jspdf.umd.min.js?v=42','./backtest.css?v=42','./backtest-core.js?v=42','./backtest.js?v=42','./','./index.html','./styles.css?v=42','./app.js?v=42','./ui-enhance.js?v=42','./ux.js?v=42','./subscription.js?v=42','./tips-private.js?v=42','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ss-journal-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
 e.respondWith(fetch(r).then(res=>{if(res.ok){const copy=res.clone();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.put(r,copy)));}return res;}).catch(async()=>await caches.match(r)||Response.error()));
});
