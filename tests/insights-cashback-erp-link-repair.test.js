'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const app=fs.readFileSync('central-caseirinho-insights/app.js','utf8');
const sw=fs.readFileSync('central-caseirinho-insights/sw.js','utf8');
const html=fs.readFileSync('central-caseirinho-insights/index.html','utf8');
test('edição de cashback apresenta opção de reparo ao detectar conflito ERP',()=>{
 assert.match(app,/id="quickCashbackRepair" hidden/);
 assert.match(app,/error\.httpStatus===409/);
 assert.match(app,/Repare a integração/);
 assert.match(app,/data-action="repairCashbackERP"/);
 assert.match(app,/function repairCashbackERP\(code\)/);
 assert.match(app,/reconcile-erp.*method:'POST'/);
 assert.match(app,/if\(type==='repairCashbackERP'\)return repairCashbackERP/);
});
test('reparo ERP não repete aprovação nem altera pagamento automaticamente',()=>{
 const start=app.indexOf('async function repairCashbackERP(code)');
 const end=app.indexOf('function showFinishAlert(',start);
 assert.ok(start>=0&&end>start);
 const fn=app.slice(start,end);
 assert.doesNotMatch(fn,/cashback-decision|\/complete/);
 assert.match(fn,/Nenhum cashback foi aprovado e nenhum pagamento foi lançado/);
 assert.match(fn,/window\.confirm/);
});
test('PWA carrega a versão do reparo do vínculo',()=>{
 assert.match(html,/app\.js\?v=20261111-connection-receivables-2/);
 assert.match(sw,/caseirinho-insights-app-shell-v53-connection-receivables-20261111/);
 assert.match(sw,/app\.js\?v=20261111-connection-receivables-2/);
 assert.doesNotThrow(()=>new vm.Script(app));
});
