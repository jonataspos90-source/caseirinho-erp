'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=f=>fs.readFileSync('central-caseirinho-insights/'+f,'utf8');
test('nova tela de pedidos oferece aceite na própria lista e filtro por NOVO',()=>{
 const s=read('app.js'),h=read('index.html');
 assert.match(h,/value="NEW">🆕 Novos/);
 assert.match(h,/id="orderQuickNewFilter"/);
 assert.match(s,/data-action="quickAcceptOrder"/);
 assert.match(s,/✅ Aceitar pedido/);
 assert.match(s,/quickAcceptOrder\(b\.dataset\.order\)/);
 assert.match(s,/approvalChannel|AC[E]?ITO|ACEITO/);
});
test('pedidos ACEITO mostram Finalizar pedido e não solicitam segundo aceite',()=>{
 const s=read('app.js');
 assert.match(s,/data-action="quickFinishOrder"/);
 assert.match(s,/quickFinishOrder\(b\.dataset\.order\)/);
 assert.match(s,/\['ACEITO','ABERTO','PRONTO'\]/);
 assert.match(s,/quickCashback/);
 assert.match(s,/fulfillmentDelivered/);
 assert.match(s,/fulfillmentPayment/);
});
test('finalização rápida usa o mesmo endpoint seguro e não duplica clique',()=>{
 const s=read('app.js');
 assert.match(s,/confirmOrderComplete\(code\)/);
 assert.match(s,/completionPending\.has\(code\)/);
 assert.match(s,/completionPending\.add\(code\)/);
 assert.match(s,/completionPending\.delete\(code\)/);
 assert.match(s,/input\.checked=true/);
});
test('código do pedido, nome e total exigem confirmação antes do aceite',()=>{
 const s=read('app.js');
 assert.match(s,/window\.confirm\('ACEITAR pedido #'/);
 assert.match(s,/status==='NOVO'|\['NOVO','PENDENTE'/);
 assert.ok(s.includes("api('orders/'+encodeURIComponent(code)+'/accept'"));
});
test('versão publicada está atualizada no HTML e service worker',()=>{
 const html=read('index.html'),sw=read('sw.js');
 const version=html.match(/app\.js\?v=(\d+)/)?.[1];
 assert.ok(Number(version)>=25);
 assert.ok(sw.includes('app.js?v='+version));
 assert.ok(sw.includes('caseirinho-insights-app-shell-v31'));
});
test('código JavaScript do painel é válido',()=>new vm.Script(read('app.js')));
