const CACHE='caseirinho-loja-v9.1.0-customer-experience';
const SHELL=[
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    for(const url of SHELL){
      try{
        const response=await fetch(url,{cache:'reload'});
        if(response.ok)await cache.put(url,response.clone());
      }catch(_){}
    }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(
      keys
        .filter(k=>k.startsWith('caseirinho-loja-')&&k!==CACHE)
        .map(k=>caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);

  // API e ViaCEP nunca passam pelo cache do PWA.
  if(/john-cloud-api-production\.up\.railway\.app$/.test(url.host)||/viacep\.com\.br$/.test(url.host))return;

  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const net=await fetch(req,{cache:'no-store'});
        if(net.ok)(await caches.open(CACHE)).put('./index.html',net.clone()).catch(()=>{});
        return net;
      }catch(_){
        return (await caches.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith((async()=>{
      try{
        const net=await fetch(req,{cache:'no-cache'});
        if(net.ok)(await caches.open(CACHE)).put(req,net.clone()).catch(()=>{});
        return net;
      }catch(_){
        return (await caches.match(req)) || Response.error();
      }
    })());
  }
});
