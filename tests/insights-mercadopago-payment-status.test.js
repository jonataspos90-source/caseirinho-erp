'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=x=>fs.readFileSync('central-caseirinho-insights/'+x,'utf8');
test('pedidos exibem pagamento confirmado, valor recebido e método real Pix ou cartão',()=>{
 const s=read('app.js');
 assert.match(s,/function paymentBadge\(order\)/);
 assert.match(s,/✅ PAGO MP/);
 assert.match(s,/providerPaidAmount/);
 assert.match(s,/verifiedPaymentMethod/);
 assert.match(s,/⏳ MP:/);
 assert.match(s,/\['Data','Pedido','Cliente','Itens pedidos','Total','Status \/ ERP','Pagamento','Ações'\]/);
});
test('opção Conferir MP usa API autenticada, não sinaliza pagamento sem aprovação',()=>{
 const s=read('app.js');
 assert.match(s,/data-action="verifyOrderPayment"/);
 assert.match(s,/async function verifyOrderPayment\(code\)/);
 assert.match(s,/verify-payment/);
 assert.match(s,/out\.statusPagamento==='APROVADO'/);
 assert.match(s,/Não foi registrado como recebido/);
 assert.match(s,/paymentChecks\.has\(code\)/);
});
test('formulário de aceite preservado e cliente com Pix manual não depende da operadora',()=>{
 const s=read('app.js');
 assert.match(s,/function isMercadoPagoOrder\(order\)/);
 assert.match(s,/conferência manual/);
 assert.match(s,/quickAcceptOrder\(code\)/);
 assert.match(s,/Aceite não confirmado/); // erro real da API é apresentado no painel
});
test('PWA versão nova evita cache antigo e JavaScript válido',()=>{
 assert.match(read('index.html'),/app\.js\?v=27/);
 assert.match(read('sw.js'),/caseirinho-insights-app-shell-v27/);
 assert.match(read('sw.js'),/app\.js\?v=27/);
 assert.doesNotThrow(()=>new vm.Script(read('app.js')));
});