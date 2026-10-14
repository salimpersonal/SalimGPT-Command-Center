/* SalimGPT Command Center offline shell. No automatic posting or network monitoring. */
const CACHE='sgcc-shell-v2.0.0';
const FILES=['./','./index.html','./css/app.css','./js/app.js','./js/views.js','./js/forms.js','./js/cloud.js','./js/sync-core.js','./js/store.js','./js/db.js','./js/utils.js','./js/constants.js','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/hero.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sgcc-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));});
self.addEventListener('fetch',event=>{const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;const type=req.destination;if(type==='document'){
 event.respondWith(fetch(req).then(res=>{if(res.ok){const clone=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',clone));}return res;}).catch(()=>caches.match('./index.html')));return;}
 event.respondWith(fetch(req).then(res=>{if(res.ok)caches.open(CACHE).then(c=>c.put(req,res.clone()));return res;}).catch(()=>caches.match(req)));
});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=event.notification.data?.url||self.registration.scope;event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{for(const c of clients){if(c.url.startsWith(self.registration.scope)){c.focus();return;}}return self.clients.openWindow(url);}));});
