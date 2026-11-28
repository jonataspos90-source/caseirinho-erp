/* Central Caseirinho Insights — cache SOMENTE de arquivos públicos; nenhuma informação de clientes */
const CACHE='caseirinho-insights-app-shell-v89-ficha80-20261128';
const SHELL=['./','./index.html','./styles.css?v=20261122-month-current83','./app.js?v=20261128-ficha80-v89','./cart-recovery.js?v=20261122-3','./cart-recovery.css?v=20261122-3','./store-hours-admin.js?v=20261116-2','./store-hours-admin.css?v=20261116-1','./seasonal-merch-admin.js?v=20261117-save-verify1','./seasonal-best-deal-admin.js?v=20261116-virtual3','./seasonal-bulk-products.js?v=20261118-publish-fix-2','./season-virtual-packs.css?v=20261116-virtual1','./category-manager.js?v=20261110-1','./sales-stock-levels.js?v=43-stock-visible','./cashback-pending-erp.js?v=1','./order-reject.js?v=4','./financeiro.js?v=20261126-finance-nav86','./platform-sales.js?v=20261110-platform-1','./asset-registry.js?v=20261122-monthly-payment2','./finance-reports.js?v=20261122-month-current83','./rent-recurring.js?v=20261122-1','./conta-cliente-recebimentos.js?v=20261111-2','./financeiro.css?v=20261122-month-current83','./operations-recovery.js?v=1','./manifest.webmanifest?v=20261119-central','./devedores.js?v=20261119-1','./convenios-receber.js?v=20261119-1','./icon.svg','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png','./icons/apple-touch-icon.png','./seasonal-production-report.js?v=20261119-1','./seasonal-pcp-workflow.js?v=20261119-1','./seasonal-ingredients-planning.js?v=20261119-1','./daily-ops-pulse.js?v=20261119-1','./sales-margin-insights.js?v=20261119-1','./partner-store-directory.js?v=20261121-1','./seasonal-workspace.js?v=20261119-1','./seasonal-workspace.css?v=20261119-1','./workspace-modules.js?v=20261119-1','./workspace-modules.css?v=20261119-1','./home-card-images-admin.js?v=20261119-1'];
// Cache apenas do app-shell público. API autenticada, pedidos, clientes e tokens nunca são armazenados.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Um arquivo opcional indisponível não deve impedir a instalação inteira.
    await Promise.allSettled(SHELL.map(async path => {
      try {
        const request = new Request(path, {cache:'reload'});
        const response = await fetch(request);
        if(response.ok) await cache.put(request, response);
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('caseirinho-insights-app-shell-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if(request.method !== 'GET') return;
  const url = new URL(request.url);
  if(url.origin!==self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if(/\/(?:api|auth|admin)\//i.test(url.pathname)) return;

  if(request.mode === 'navigate') {
    event.respondWith(fetch(request, {cache:'no-store'}).catch(async () =>
      (await caches.match(new URL('./index.html', self.registration.scope).href)) ||
      new Response('Sem conexão. Reconecte para acessar os dados do Caseirinho.', {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})
    ));
    return;
  }
  // Financeiro e interface: online usa sempre a versão publicada; cache só no modo offline.
  // Stale-while-revalidate exibia no Android um HTML antigo com outra competência.
  if(/\.(?:js|css|svg|png|webmanifest)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request, {cache:'no-store'});
        if(response.ok) await cache.put(request, response.clone());
        return response;
      } catch (_) {
        return (await cache.match(request)) || Response.error();
      }
    })());
  }
});
