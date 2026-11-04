/* Central Caseirinho Insights — cache SOMENTE de arquivos públicos; nenhuma informação de clientes */
const CACHE='caseirinho-insights-app-shell-v24';
const SHELL=['./','./index.html','./styles.css?v=20','./app.js?v=24','./financeiro.js?v=1','./financeiro.css?v=1','./operations-recovery.js?v=1','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('caseirinho-insights-app-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  // URLs /api, /auth ou respostas com dados privados não são armazenadas.
  if(/\/(?:api|auth|admin)\//i.test(url.pathname))return;
  if(req.mode==='navigate'){
    event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>caches.match('./index.html')));
    return;
  }
  event.respondWith(caches.match(req).then(cached=>cached||fetch(req)));
});
