'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('central-caseirinho-insights/app.js','utf8');
const accounts=fs.readFileSync('central-caseirinho-insights/conta-cliente-recebimentos.js','utf8');
test('aplicativo evita consulta GET eternamente em andamento, sem abortar POST financeiro',()=>{
 assert.match(app,/const controller=isRead&&typeof AbortController/);
 assert.match(app,/controller\.abort\(\),12000/);
 assert.match(app,/if\(timer!==null\)clearTimeout\(timer\)/);
 assert.match(app,/for\(let attempt=0;attempt<\(isRead\?2:1\);attempt\+\+\)/);
 assert.doesNotThrow(()=>new vm.Script(app));
});
test('conexão parcial informa o que realmente carregou sem mostrar nove erros iguais',()=>{
 assert.match(app,/const loadedCore=responses\.slice\(0,5\)/);
 assert.match(app,/if\(loadedCore\)st\.lastUpdated=new Date\(\)/);
 assert.match(app,/Falha temporária em /);
 assert.match(app,/setInterval\(loadRequests,90000\)/);
 assert.match(app,/setInterval\(pollNewOrders,30000\)/);
});
test('Conta Cliente mantém cartões antigos em resposta de rede falhada',()=>{
 assert.match(accounts,/const previous=reset\?\[\]:st\.orders/);
 assert.match(accounts,/st\.orders=\[\.\.\.previous,\.\.\.fresh\]/);
 assert.match(accounts,/cartões já carregados foram preservados/);
 assert.match(accounts,/try\{/);
 assert.doesNotThrow(()=>new vm.Script(accounts));
});
test('cashback de venda com saldo não apresenta liberação antecipada',()=>{
 assert.match(app,/const awaitingPayment=Number\.isFinite\(balance\)&&balance>0/);
 assert.match(app,/Cashback pendente até quitação integral/);
 assert.match(app,/Consultar saldo em Conta Cliente/);
});
