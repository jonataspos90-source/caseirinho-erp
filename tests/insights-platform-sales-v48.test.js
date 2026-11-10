'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root='central-caseirinho-insights/';
const f=name=>fs.readFileSync(root+name,'utf8');
test('Financeiro inclui aba de plataformas e criação por total ou produto',()=>{
 const html=f('index.html'),app=f('financeiro.js');
 for(const id of ['finPlatformsPanel','finPlatformForm','finPlatformName','finPlatformMode','finPlatformFrequency',
  'finPlatformGross','finPlatformTotalCost','finPlatformLines','finPlatformAddLine','finPlatformCommission','finPlatformExtraFees',
  'finPlatformDiscount','finPlatformTotals','finPlatformGroups','finPlatformEntries','finPlatformFilterFrequency','finPlatformFilterName'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/data-fin-tab="platforms"/);
 assert.match(html,/platform-sales\.js\?v=20261110-platform-1/);
 assert.match(html,/financeiro\.js\?v=20261110-platform-1/);
 assert.match(app,/const all=\['platforms','dre'/);
 assert.match(app,/CaseirinhoPlatformSales\?\.load/);
});
test('Entrada mostra taxas, repasse e margem sem inventar custo',()=>{
 const js=f('platform-sales.js'),html=f('index.html');
 assert.match(js,/function estimate\(body\)/);
 assert.match(js,/cost===null\?'Não identificado'/);
 assert.match(js,/Margem não calculável sem custo completo/);
 assert.match(js,/unitCostCents/);
 assert.match(js,/idempotencyKey:st\.key/);
 assert.match(js,/recordVersion:st\.edit\.recordVersion/);
 assert.match(js,/platform-sales\/products/);
 assert.match(js,/data-pl-delete/);
 assert.match(html,/Repasse previsto não equivale a dinheiro confirmado/);
});
test('DRE exibe taxas já incluídas e novos assets atualizados no PWA',()=>{
 const js=f('financeiro.js'),sw=f('sw.js'),html=f('index.html'),css=f('financeiro.css');
 assert.match(js,/Taxas de plataformas já incluídas nas despesas variáveis/);
 assert.match(js,/data-fin-tab="platforms"/);
 assert.match(sw,/caseirinho-insights-app-shell-v48-platform-sales-20261110/);
 assert.match(sw,/platform-sales\.js\?v=20261110-platform-1/);
 assert.match(html,/financeiro\.css\?v=20261110-platform-1/);
 assert.match(css,/platform-preview-grid/);
 for(const name of ['financeiro.js','platform-sales.js','sw.js'])
  assert.doesNotThrow(()=>new vm.Script(f(name)),name);
});
