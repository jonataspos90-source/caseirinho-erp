'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=x=>fs.readFileSync('central-caseirinho-insights/'+x,'utf8');
test('recusa aparece na página Pedidos e carrega após o app.js',()=>{
 const html=read('index.html'),sw=read('sw.js');
 assert.match(html,/app\.js\?v=30/);
 assert.match(html,/order-reject\.js\?v=2/);
 assert.ok(html.indexOf('app.js?v=30')<html.indexOf('order-reject.js?v=2'));
 assert.match(sw,/caseirinho-insights-app-shell-v32/);
 assert.match(sw,/order-reject\.js\?v=2/);
 assert.doesNotThrow(()=>new vm.Script(read('order-reject.js')));
});
test('recusa exige motivo e confirmação antes de chamar a API',()=>{
 const s=read('order-reject.js');
 assert.match(s,/\/orders\/'.+\/reject/);
 assert.match(s,/confirmReject:true/);
 assert.match(s,/reason\.length<8/);
 assert.match(s,/confirmo|confirm/i);
 assert.match(s,/confirmado|CONFIRMAR RECUSA DEFINITIVA/);
 assert.match(s,/NÃO|Não|não/);
});
