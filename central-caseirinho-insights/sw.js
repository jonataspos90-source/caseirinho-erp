/* Central Caseirinho Insights — cache SOMENTE de arquivos públicos; nenhuma informação de clientes */
const CACHE='caseirinho-insights-app-shell-v49-product-names-20261110';
const SHELL=['./','./index.html','./styles.css?v=20261110-product-names-2','./app.js?v=20261110-product-names-2','./category-manager.js?v=20261110-1','./sales-stock-levels.js?v=43-stock-visible','./cashback-pending-erp.js?v=1','./order-reject.js?v=4','./financeiro.js?v=20261110-platform-1','./platform-sales.js?v=20261110-platform-1','./conta-cliente-recebimentos.js?v=20261110-1','./financeiro.css?v=20261110-platform-1','./operations-recovery.js?v=1','./manifest.webmanifest?v=2','./icon.svg'];
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
  event.respondWith(fetch(req,{cache:'no-store'}).then(response=>{if(response.ok && /\.(?:js|css)$/.test(url.pathname)){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});}return response;}).catch(()=>caches.match(req)));
});
