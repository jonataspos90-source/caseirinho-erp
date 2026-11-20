'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('central-caseirinho-insights/app.js','utf8');
const css=fs.readFileSync('central-caseirinho-insights/styles.css','utf8');
test('resumo por pedido apresenta produtos e unidades separadamente',()=>{
 assert.match(js,/function orderItemCount\(order\)/);
 assert.match(js,/unidades<\/p>/);
 assert.match(js,/function itemListHtml\(order\)/);
 assert.match(css,/receipt-item-values/);
});
test('composição financeira deixa explícitos descontos e divergência, sem alterar pedidos',()=>{
 assert.match(js,/function orderFinancialSummary\(order\)/);
 assert.match(js,/order\.couponDiscount/);
 assert.match(js,/order\.originalSubtotal/);
 assert.match(js,/composição|conciliação/i);
 assert.match(js,/pagamento não foram alterados/);
 assert.doesNotMatch(js,/fetch\([^\n]*orderFinancialSummary/);
 assert.doesNotThrow(()=>new vm.Script(js));
});
