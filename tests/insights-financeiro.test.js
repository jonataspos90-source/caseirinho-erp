'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const file=name=>fs.readFileSync('central-caseirinho-insights/'+name,'utf8');
test('Central abre o Financeiro como submódulo, com navegação desktop e mobile',()=>{
 const html=file('index.html'),app=file('app.js');
 assert.match(html,/id="financeiro" class="section"/);
 assert.match(html,/data-view="financeiro"/);
 assert.match(app,/financeiro:'Financeiro e DRE'/);
 assert.match(app,/if\(tab==='financeiro'\)window\.CaseirinhoFinance\?\.load\(\)/);
});
test('DRE, vendas diárias, custos, contas fixas e ativos possuem áreas separadas',()=>{
 const html=file('index.html');
 for(const id of ['finDre','finDaily','finEntries','finFixed','finAssets','finEntryForm','finMonth'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/data-fin-kind="COMPRA_REVENDA"/);
 assert.match(html,/data-fin-preset="ALUGUEL"/);
 assert.match(html,/data-fin-preset="AGUA"/);
 assert.match(html,/data-fin-preset="LUZ"/);
 assert.match(html,/data-fin-preset="INTERNET"/);
});
test('Financeiro exige token do ERP e usa API autenticada',()=>{
 const script=file('financeiro.js');
 assert.match(script,/Authorization:'Bearer '/);
 assert.match(script,/caseirinho_insights_erp_session_v6/);
 assert.match(script,/\/overview\?month=/);
 assert.match(script,/\/entries/);
});
test('PWA versionado inclui os novos arquivos, sem guardar dados de vendas em cache',()=>{
 const sw=file('sw.js'),html=file('index.html');
 assert.match(sw,/caseirinho-insights-app-shell-v23/);
 assert.match(sw,/financeiro\.js\?v=1/);
 assert.match(sw,/financeiro\.css\?v=1/);
 assert.match(html,/app\.js\?v=23/);
 assert.match(sw,/if\(url\.origin!==self\.location\.origin/);
});
