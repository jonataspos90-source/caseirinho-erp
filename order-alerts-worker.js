/* Avisos recebidos pelo navegador mesmo quando as páginas do ERP estão fechadas. */
self.addEventListener('push',event=>{
  let p={};try{p=event.data?.json()||{}}catch(_){}
  const title=String(p.title||'Novo aviso do Caseirinho').slice(0,160);
  const base=new URL('./',self.registration.scope);
  // O servidor não pode direcionar o clique para outro site.
  let url=base.href;
  try{const u=new URL(p.url||'./',base);if(u.origin===base.origin&&u.pathname.startsWith(base.pathname))url=u.href}catch(_){}
  event.waitUntil(self.registration.showNotification(title,{
    body:String(p.body||'Abra o ERP para conferir o aviso.').slice(0,300),
    icon:new URL('icons/icon-192.png',base).href,badge:new URL('icons/icon-192.png',base).href,
    tag:String(p.tag||'caseirinho-aviso').slice(0,100),renotify:true,
    requireInteraction:p.kind!=='test',vibrate:[200,100,200],
    data:{url,orderId:String(p.orderId||'')}
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const base=new URL('./',self.registration.scope);
  let url=base.href;
  try{const u=new URL(event.notification.data?.url||'./',base);if(u.origin===base.origin&&u.pathname.startsWith(base.pathname))url=u.href}catch(_){}
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{
    for(const c of clients)if(c.url.startsWith(base.href)){
      await c.focus();c.postMessage({type:'JOHN_NEW_ORDER',orderId:event.notification.data?.orderId});return;
    }
    return self.clients.openWindow(url);
  }));
});
