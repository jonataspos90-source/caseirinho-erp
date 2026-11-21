/* PWA isolado Beauty Central: apenas assets estáticos; nenhum dado privado em cache. */
const CACHE='john-beauty-central-v1';
const SHELL=['./','./index.html','./style.css','./app.js','./modelos-iniciais.json','./manifest.webmanifest','../lojas/cosmeticos/icon-192.png','../lojas/cosmeticos/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{for(const k of await caches.keys())if(k.startsWith('john-beauty-central-')&&k!==CACHE)await caches.delete(k);await self.clients.claim()})())});
self.addEventListener('fetch',e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==location.origin||!u.pathname.includes('/beauty-central/'))return;
 if(e.request.mode==='navigate')e.respondWith(fetch(e.request).catch(()=>caches.match('./index.html')));
 else e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
