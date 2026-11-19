'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=fs.readFileSync('central-caseirinho-insights/app.js','utf8');
test('primeiro painel prioriza apenas cinco consultas essenciais',()=>{
 assert.match(app,/const paths=\['summary','orders','requests','contacts','catalog'\]/);
 assert.match(app,/const optionalPaths=\['product-categories','product-drafts','merchandising','order-fulfillment'\]/);
});
test('carregamento de apoio não bloqueia o fim da sincronização principal',()=>{
 const body=app.slice(app.indexOf('async function loadAll(){'),app.indexOf('async function refreshOrdersAfterRejection'));
 assert.ok(body.includes("st.syncing=false;E('refreshBtn').disabled=false;render();"));
 assert.match(body,/void loadOptionalDashboard\(\)/);
 assert.ok(body.indexOf('void loadOptionalDashboard()')>body.indexOf('st.syncing=false;'));
});
test('sincronização de apoio permanece protegida contra duplicação',()=>{
 assert.match(app,/if\(optionalDashboardRequest\)return optionalDashboardRequest;/);
 assert.match(app,/finally\{optionalDashboardRequest=null;\}/);
});
