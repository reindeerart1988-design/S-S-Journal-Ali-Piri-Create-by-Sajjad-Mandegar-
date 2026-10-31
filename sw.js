const CACHE_NAME='ss-journal-v40';
const APP_SHELL=['./backtest.css?v=40','./backtest-core.js?v=40','./backtest.js?v=40','./','./index.html','./styles.css?v=40','./app.js?v=40','./ui-enhance.js?v=40','./ux.js?v=40','./subscription.js?v=40','./tips-private.js?v=40','./manifest.json','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('ss-journal-')&&k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;
 e.respondWith(fetch(r).then(res=>{if(res.ok){const copy=res.clone();e.waitUntil(caches.open(CACHE_NAME).then(c=>c.put(r,copy)));}return res;}).catch(async()=>await caches.match(r)||Response.error()));
});
