'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const get=path=>fs.readFileSync('central-caseirinho-insights/'+path,'utf8');
test('cada pedido aceito apresenta ação de cashback e indicação do resultado',()=>{
 const js=get('app.js');
 assert.match(js,/data-action="quickCashbackOrder"/);
 assert.match(js,/💚 Cashback aprovado/);
 assert.match(js,/🚫 Cashback não liberado/);
 assert.match(js,/💚 Decidir cashback/);
 assert.match(js,/if\(\['ACEITO','ABERTO','PRONTO'\]\.includes\(status\)\)/);
});
test('modal mostra duas escolhas explícitas e exige confirmar antes de salvar',()=>{
 const js=get('app.js');
 assert.match(js,/name="quickCashbackDecision" value="APROVADO"/);
 assert.match(js,/name="quickCashbackDecision" value="REJEITADO"/);
 assert.match(js,/data-action="quickSaveCashback"/);
 assert.match(js,/if\(!\['APROVADO','REJEITADO'\]\.includes\(decision\)\)/);
 assert.match(js,/window\.confirm\(value/);
 assert.match(js,/cashback-decision/);
 assert.match(js,/quickCashbackPending\.has\(code\)/);
});
test('não concede saldo ao registrar decisão nem finaliza automaticamente',()=>{
 const js=get('app.js');
 const start=js.indexOf('async function quickSaveCashback(');
 const end=js.indexOf('function quickFinishOrder(',start);
 assert.ok(start>0&&end>start);
 const flow=js.slice(start,end);
 assert.match(flow,/cashback-decision/);
 assert.doesNotMatch(flow,/\/release-cashback|\/complete'/);
 assert.match(flow,/Crédito somente após entrega/);
});
test('finalização rápida pede escolha de cashback e confirmação de entrega e recebimento',()=>{
 const js=get('app.js');
 assert.match(js,/1️⃣ Escolha o cashback/);
 assert.match(js,/quickCashbackDecision/);
 assert.match(js,/fulfillmentDelivered/);
 assert.match(js,/fulfillmentPayment/);
 assert.match(js,/input\.name='fulfillmentCashback'/);
 assert.match(js,/return confirmOrderComplete\(code\)/);
});
test('atualização do PWA carrega nova regra e script válido',()=>{
 const html=get('index.html'),sw=get('sw.js');
 const version=html.match(/app\.js\?v=(\d+)/)?.[1];
 assert.ok(Number(version)>=26);
 assert.ok(sw.includes('caseirinho-insights-app-shell-v31'));
 assert.ok(sw.includes('app.js?v='+version));
 assert.doesNotThrow(()=>new vm.Script(get('app.js')));
});