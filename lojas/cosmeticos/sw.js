/* Service worker dedicado à loja de cosméticos.
   Nunca cacheia API, pagamentos, nomes, telefones ou pedidos.
   Nunca intercepta o domínio do Caseirinho. */
const CACHE='john-beauty-preview-v3';
const SHELL=['./','./index.html','./beauty-premium.css','./beauty-premium.js','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./privacidade.html'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('john-beauty-preview-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})())});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(!url.pathname.includes('/lojas/cosmeticos/'))return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).catch(async()=>await caches.match('./index.html')||Response.error()));return;
 }
 event.respondWith(caches.match(req).then(hit=>hit||fetch(req)));
});
