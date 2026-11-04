'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=p=>fs.readFileSync('central-caseirinho-insights/'+p,'utf8');
test('Central Financeira tem vendas diárias, DRE, lançamentos e ativos',()=>{
 const html=read('index.html');
 for(const id of ['finance','finDaily','finDre','finEntries','finAssets','finForm','finMonth','finFrom','finTo','finStatus','finPaidDate','finRepeat','finLife'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/data-view="finance"/);
 assert.match(html,/financeiro\.js\?v=1/);
});
test('formulário não exige produto cadastrado nem controla estoque',()=>{
 const js=read('financeiro.js');
 assert.match(js,/type:'RESALE_COST'/);
 assert.match(js,/RE[S]?ALE_COST/);
 assert.doesNotMatch(js,/estoque\/baixa|stock-decrement/i);
 assert.match(js,/method:'PUT'/);
 assert.match(js,/method:'DELETE'/);
 assert.match(js,/recordVersion:/);
});
test('autenticação existente é usada no financeiro e há proteção contra CSV fórmula',()=>{
 const js=read('financeiro.js');
 assert.match(js,/sessionStorage\.getItem\(SESSION\)/);
 assert.match(js,/Authorization/);
 assert.match(js,/credentials:'omit'/);
 assert.match(js,/\[=\+\\\-@/);
});
test('PWA inclui scripts e estilos atualizados',()=>{
 const sw=read('sw.js'),html=read('index.html');
 assert.match(sw,/financeiro\.js\?v=1/);
 assert.match(sw,/caseirinho-insights-app-shell-v23/);
 assert.match(html,/app\.js\?v=23/);
 assert.match(html,/styles\.css\?v=23/);
});
test('módulo financeiro é sintaticamente válido',()=>{new vm.Script(read('financeiro.js'));});
