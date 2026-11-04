'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('central-caseirinho-insights/index.html','utf8');
const app=fs.readFileSync('central-caseirinho-insights/app.js','utf8');
test('central operacional aparece no Insights e possui estruturas para auditoria',()=>{
 assert.match(html,/data-view="operations"/);
 for(const id of ['opsRefresh','opsFeedback','opsStats','opsOrderList','opsCatalogAlerts'])assert.match(html,new RegExp('id="'+id+'"'));
});
test('auditoria utiliza API autenticada existente, sem alterar pedidos',()=>{
 assert.match(app,/api\('operations-audit'\)/);
 assert.match(app,/Authorization:'Bearer '/);
 assert.match(app,/function renderOpsAudit\(/);
 assert.match(app,/if\(tab==='operations'\)loadOpsAudit\(\)/);
 assert.doesNotMatch(app,/fetch\(.*operations-audit.*method:'POST'/);
});
