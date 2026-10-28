'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=name=>fs.readFileSync(require('node:path').join(__dirname,'..',name),'utf8');
function experience(){
 const window={},document={getElementById:()=>null,createElement:()=>({}),head:{appendChild(){}},addEventListener(){}};
 const ctx=vm.createContext({window,document,console,setTimeout(){},localStorage:{getItem:()=>null}});
 const source=read('ecommerce-customer-experience-v8-13-0.js').replace('addCss();\nsetTimeout(install','window.testPaymentFlow={state,actionHtml,actionType,openOrderAvailability};addCss();\nsetTimeout(install');
 vm.runInContext(source,ctx);return window.testPaymentFlow;
}
const pending={id:'order-test',status:'NOVO',modalidade:'RETIRADA',formaPagamento:'Cartão de crédito online (Mercado Pago)',encomendaConfirmacao:{status:'PENDENTE'},freteStatus:'NAO_APLICA'};
test('unpaid order with pending availability exposes confirmation before payment',()=>{
 const x=experience(),s=x.state(pending);assert.equal(s,'AGUARDANDO_DISPONIBILIDADE');assert.equal(x.actionType(pending), 'CONFIRMAR_DISPONIBILIDADE');const html=x.actionHtml(pending,s);assert.match(html,/data-cx-availability="order-test"/);assert.doesNotMatch(html,/data-cx-accept/);
});
test('confirmed availability returns to awaiting bank payment without accepting unpaid orders',()=>{
 const x=experience(),o={...pending,encomendaConfirmacao:{status:'CONFIRMADO'}};assert.equal(x.state(o),'AGUARDANDO_PAGAMENTO');assert.doesNotMatch(x.actionHtml(o,x.state(o)),/data-cx-accept|data-cx-availability/);
});
test('freight still needs quoting after availability confirmation',()=>{
 const x=experience(),o={...pending,modalidade:'ENTREGA',encomendaConfirmacao:{status:'CONFIRMADO'},freteStatus:'COTACAO_PENDENTE'};assert.equal(x.state(o),'COTACAO_PENDENTE');assert.match(x.actionHtml(o,x.state(o)),/data-cx-quote/);
});
test('terminal and already imported orders are not reopened for availability',()=>{
 const x=experience();assert.equal(x.state({...pending,status:'CANCELADO'}),'CANCELADO');assert.equal(x.state({...pending,status:'REJEITADO'}),'REJEITADO');assert.equal(x.state({...pending,status:'ACEITO'}),'ACEITO');assert.equal(x.state({...pending,statusIntegracao:'IMPORTADO'}),'ACEITO');
});
test('confirmation action opens the selected order without approving it',async()=>{
 const source=read('ecommerce-customer-experience-v8-13-0.js').replace('addCss();\nsetTimeout(install','window.testPaymentFlow={openOrderAvailability};addCss();\nsetTimeout(install');
 let selected;const window={CaseirinhoEncomendas82270:{openOrders:async id=>{selected=id}}};const document={getElementById:()=>null,createElement:()=>({}),head:{appendChild(){}},addEventListener(){}};
 vm.runInNewContext(source,{window,document,console,setTimeout(){}});const button={};await window.testPaymentFlow.openOrderAvailability('order-test',button);assert.equal(selected,'order-test');assert.equal(button.disabled,false);
});
test('availability page uses the configured authenticated API when adminFetch is private',async()=>{
 const window={addEventListener(){}};let request;const document={readyState:'loading',addEventListener(){}};
 const ctx=vm.createContext({window,document,console,setTimeout(){},localStorage:{getItem:()=>JSON.stringify({apiUrl:'https://api.example.test',apiKey:'fake-test-token'})},fetch:async(url,opt)=>{request={url,opt};return{ok:true,json:async()=>({orders:[]})}}});
 vm.runInContext(read('caseirinho-encomendas-v8-22-70.js').replace('={openAvailability,openOrders,loadOrders};','={openAvailability,openOrders,loadOrders,api};'),ctx);
 await window.CaseirinhoEncomendas82270.api('/api/v1/admin/store/orders?status=TODOS');assert.equal(request.url,'https://api.example.test/api/v1/admin/store/orders?status=TODOS');assert.equal(request.opt.headers.Authorization,'Bearer fake-test-token');
});
test('PWA upgrades both availability modules and preserves one copy of each',async()=>{
 const ctx=vm.createContext({self:{addEventListener(){}},importScripts(){},Headers,Response});vm.runInContext(read('service-worker.js'),ctx);
 ctx.response=new Response('<body><script src="./ecommerce-customer-experience-v8-13-0.js?v=8140"></script><script src="./caseirinho-encomendas-v8-22-70.js?v=82270"></script></body>',{headers:{'content-type':'text/html'}});
 const out=await vm.runInContext('injectScripts(response)',ctx);const html=await out.text();assert.match(html,/ecommerce-customer-experience-v8-13-0\.js\?v=20261028-payment-flow/);assert.match(html,/caseirinho-encomendas-v8-22-70\.js\?v=20261028-order-review/);assert.equal((html.match(/caseirinho-encomendas-v8-22-70\.js/g)||[]).length,1);
});
