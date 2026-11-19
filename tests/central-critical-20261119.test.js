'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const load=n=>fs.readFileSync(path.join(__dirname,'..','central-caseirinho-insights',n),'utf8');
test('nova central inclui módulos PCP, produção, painéis e sem duplicar app',()=>{
 const html=load('index.html');
 for(const n of ['seasonal-production-report.js','seasonal-pcp-workflow.js','daily-ops-pulse.js','home-card-images-admin.js','seasonal-workspace.js'])assert.ok(html.includes(n),n);
 assert.equal((html.match(/<script src="\.\/app\.js\?/g)||[]).length,1);
});
test('produção bloqueia venda sem sinal e exige confirmação do operador',()=>{
 const prod=load('seasonal-pcp-workflow.js'),report=load('seasonal-production-report.js');
 assert.match(prod,/depositStatus==='PAID'/);
 assert.match(prod,/confirm\(/);
 assert.match(prod,/seasonal-orders\/.*production/);
 assert.match(report,/prodPrintCards/);
 assert.match(report,/prodGrouped/);
 assert.match(report,/lastRefreshAt/);
});
test('painel de gestão é somente leitura e não altera lançamento financeiro',()=>{
 const pulse=load('daily-ops-pulse.js');
 assert.match(pulse,/seasonal-operation-health/);
 assert.doesNotMatch(pulse,/method:\s*['"]POST['"]/);
 assert.doesNotMatch(pulse,/confirm-payment/);
});
test('novos componentes são JavaScript sintaticamente válido',()=>{
 for(const n of ['seasonal-production-report.js','seasonal-pcp-workflow.js','daily-ops-pulse.js','seasonal-workspace.js','home-card-images-admin.js'])new vm.Script(load(n),{filename:n});
});