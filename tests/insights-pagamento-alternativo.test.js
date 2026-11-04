'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync('central-caseirinho-insights/'+p,'utf8');
const js=read('app.js');
test('pedido antigo com Mercado Pago recusado oferece Alterar pagamento na linha de Pedidos',()=>{
 assert.match(js,/data-action="changePaymentMethod"/);
 assert.match(js,/function changePaymentMethod\(code\)/);
 assert.match(js,/function saveManualPayment\(code\)/);
 assert.match(js,/PIX_MANUAL/);
 assert.match(js,/CREDITO_PRESENCIAL/);
 assert.match(js,/TRANSFERENCIA/);
});
test('pagamento manual só pode ser confirmado com conferência e valor total correto',()=>{
 assert.match(js,/manualPaymentReceived/);
 assert.match(js,/Math\.round\(amount\*100\)/);
 assert.match(js,/justification\.length<12/);
 assert.match(js,/window\.confirm\('CONFIRMAR RECEBIMENTO REAL/);
 assert.match(js,/confirmReceived:true/);
});
test('reconhecimento manual prevalece visualmente sobre tentativa MP recusada, preservando histórico',()=>{
 const a=js.indexOf('function paymentBadge(order){'),b=js.indexOf('const paymentChecks=',a);
 const source=js.slice(a,b);
 assert.ok(a>=0&&b>a);
 assert.ok(source.indexOf('manualPayment')<source.indexOf("status==='REJEITADO'"));
 assert.match(source,/RECEBIDO MANUAL/);
 assert.match(source,/MP original/);
});
test('alteração manual não finaliza, não gera cashback e informa aceite posterior',()=>{
 const a=js.indexOf('async function saveManualPayment(code){'),b=js.indexOf('function orderButton(order){',a);
 const code=js.slice(a,b);
 assert.match(code,/manual-payment/);
 assert.match(code,/Agora clique em Aceitar pedido/);
 assert.doesNotMatch(code,/\/complete/);
 assert.doesNotMatch(code,/cashback-decision/);
});
test('o novo PWA de pedidos versão 30 tem JS e CSS atuais',()=>{
 assert.match(read('index.html'),/app\.js\?v=30/);
 assert.match(read('index.html'),/styles\.css\?v=30/);
 assert.match(read('sw.js'),/caseirinho-insights-app-shell-v30/);
 assert.match(read('sw.js'),/app\.js\?v=30/);
 assert.match(read('sw.js'),/styles\.css\?v=30/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
