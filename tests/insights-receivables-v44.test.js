'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root='central-caseirinho-insights/';
const get=x=>fs.readFileSync(root+x,'utf8');
test('Central exibe Conta Cliente, cartões separados e usa arquivos PWA atualizados',()=>{
 const html=get('index.html'),app=get('app.js'),mod=get('conta-cliente-recebimentos.js'),sw=get('sw.js');
 assert.match(html,/data-view="receivables"/);
 assert.match(html,/id="receivableStats"/);
 assert.match(html,/id="receivableOrders"/);
 assert.match(html,/conta-cliente-recebimentos\.js\?v=20261110-1/);
 assert.match(sw,/caseirinho-insights-app-shell-v44-accounts-receivable-20261110/);
 assert.match(sw,/conta-cliente-recebimentos\.js\?v=20261110-1/);
 assert.match(app,/CaseirinhoInsightsReceivablesBridge/);
 assert.match(mod,/Cartão da venda/);
 assert.match(mod,/Cartão de recebimento/);
 assert.match(mod,/Registrar recebimento/);
 assert.match(mod,/A_CONCILIAR/);
});
test('Finalização apresenta escolha da forma, valor pago, saldo e confirmação explícita',()=>{
 const s=get('app.js');
 assert.match(s,/id="quickPaymentMethod"/);
 assert.match(s,/value="CREDITO"/);
 assert.match(s,/value="DEBITO"/);
 assert.match(s,/value="CONTA_CLIENTE"/);
 assert.match(s,/id="quickPaymentAmount"/);
 assert.match(s,/paymentAmountCents:amountCents/);
 assert.match(s,/paymentRequestId:completionRequestIds.get\(code\)/);
 assert.match(s,/Pagamento parcial: cashback precisa ficar pendente/);
 assert.match(s,/paymentChecked:payment/);
});
test('Módulo de contas e service worker têm sintaxe válida',()=>{
 for(const path of ['app.js','conta-cliente-recebimentos.js','sw.js'])assert.doesNotThrow(()=>new vm.Script(get(path)));
});
