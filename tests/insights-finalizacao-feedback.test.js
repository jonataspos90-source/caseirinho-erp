'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync('central-caseirinho-insights/'+p,'utf8');
const js=read('app.js');
test('o primeiro botão abre conferência e nunca altera o pedido sozinho',()=>{
 const a=js.indexOf('function quickFinishOrder(code){'),b=js.indexOf('function quickConfirmOrder(code){',a);
 assert.ok(a>0&&b>a);
 const body=js.slice(a,b);
 assert.match(body,/PEDIDO AINDA NÃO FINALIZADO/);
 assert.match(body,/CONFIRMAR .*E FINALIZAR AGORA/);
 assert.match(body,/id="fulfillmentDelivered"/);
 assert.match(body,/id="fulfillmentPayment"/);
 assert.match(body,/quickCashbackDecision/);
 assert.doesNotMatch(body,/orders\/.*\/complete/);
});
test('o modal de confirmação efetivamente aparece com pedido aprovado pelo MP e duas etapas',()=>{
 const a=js.indexOf('function quickFinishOrder(code){'),b=js.indexOf('function quickConfirmOrder(code){',a);
 let dialog=null;
 const order={code:'100010',name:'Cliente',total:278.76,providerPaidAmount:278.76,paymentStatus:'APROVADO',payment:'Cartão online (Mercado Pago)',items:[]};
 const f={status:'ACEITO',approval:'PENDENTE',modalidade:'RETIRADA',canApprove:false,eligible:false,reasons:['Somente segunda compra concluída'],erpLinked:true,integration:'IMPORTADO'};
 const sandbox={
  orderLookup:()=>order,fulfillStatus:()=>f,
  modal:(title,body)=>{dialog={title,body};},
  E:()=>({setAttribute(){},scrollTo(){},focus(){}}),
  toast:(x)=>{throw Error(x)},s:x=>String(x||''),n:Number,
  brl:x=>'R$ '+Number(x).toFixed(2),esc:x=>String(x),isMercadoPagoOrder:()=>true
 };
 vm.runInNewContext(js.slice(a,b)+'\nquickFinishOrder("100010")',sandbox);
 assert.match(dialog.title,/100010/);
 assert.match(dialog.body,/⏳ PEDIDO AINDA NÃO FINALIZADO/);
 assert.match(dialog.body,/value="REJEITADO" checked/);
 assert.match(dialog.body,/id="fulfillmentPayment" checked/);
 assert.match(dialog.body,/Confirmo que o cliente retirou/);
 assert.match(dialog.body,/quickConfirmOrder/);
});
test('erros de confirmação são mostrados dentro da janela, não apenas no canto da tela',()=>{
 const a=js.indexOf('function showFinishAlert('),b=js.indexOf('async function manageOrderFulfillment(',a);
 const part=js.slice(a,b);
 assert.match(part,/id="quickFinishAlert"/);
 assert.match(part,/box\.textContent=message/);
 assert.match(part,/showFinishAlert\('Para concluir o pedido/);
});
test('sucesso do servidor é reconhecido antes do recarregamento e não confundido com falha da lista',()=>{
 const a=js.indexOf('async function confirmOrderComplete(code){'),b=js.indexOf('async function releaseOrderCashback(',a);
 assert.ok(a>0&&b>a);
 const p=js.slice(a,b);
 assert.match(p,/completionPending\.add\(code\)/);
 assert.match(p,/if\(!out\?\.ok/);
 assert.match(p,/✅ PEDIDO #/);
 assert.match(p,/await loadAll\(\);nav\('orders'\)/);
 assert.match(p,/Pedido finalizado, mas a lista não atualizou/);
 assert.match(p,/showFinishAlert\('Pedido '\+code\+' NÃO teve a conclusão confirmada/);
 assert.match(p,/finally\{\s*completionPending\.delete\(code\)/);
});
test('o cache do PWA carrega o script e CSS corretos',()=>{
 const html=read('index.html'),sw=read('sw.js');
 assert.match(html,/app\.js\?v=28/);
 assert.match(html,/styles\.css\?v=28/);
 assert.match(sw,/caseirinho-insights-app-shell-v28/);
 assert.match(sw,/app\.js\?v=28/);
 assert.match(sw,/styles\.css\?v=28/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
