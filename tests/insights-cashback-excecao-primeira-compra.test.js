'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=x=>fs.readFileSync('central-caseirinho-insights/'+x,'utf8');
const s=read('app.js');
test('opção de exceção de primeira compra com justificativa',()=>{
 assert.match(s,/canOverrideFirstPurchase===true/);
 assert.match(s,/EXCEÇÃO de primeira compra/);
 assert.match(s,/quickOverrideReason/);
 assert.match(s,/Justificativa obrigatória/);
});
test('aprovação excepcional exige razão e vai para endpoint dedicado à decisão',()=>{
 assert.match(s,/overrideReason.length<12/);
 assert.match(s,/overrideFirstPurchase:requestedOverride/);
 assert.match(s,/cashback-decision/);
 assert.match(s,/Crédito somente após entrega/);
});
test('PWA v30 carrega a nova interface',()=>{
 assert.match(read('index.html'),/app.js\?v=30/);
 assert.match(read('sw.js'),/caseirinho-insights-app-shell-v31/);
 assert.doesNotThrow(()=>new vm.Script(s));
});