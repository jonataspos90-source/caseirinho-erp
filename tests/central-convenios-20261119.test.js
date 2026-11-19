'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const dir='central-caseirinho-insights/';
const read=n=>fs.readFileSync(dir+n,'utf8');
test('convênios constam na aba de recebimentos e carregam pelo app',()=>{
 const html=read('index.html'),app=read('app.js');
 for(const id of ['convenioPanel','convenioRefresh','convenioExport','convenioSearch','convenioFilter','convenioStats','convenioRows'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/convenios-receber\.js\?v=20261119-1/);
 assert.match(app,/CaseirinhoConvenios\?\.load\?\.\(\)/);
});
test('cache atualizado cobre JS e manifesto não guarda dados de clientes',()=>{
 const sw=read('sw.js');
 assert.match(sw,/v70-convenios-20261119/);
 assert.match(sw,/convenios-receber\.js\?v=20261119-1/);
 assert.match(sw,/app\.js\?v=20261119-convenios/);
 assert.match(sw,/styles\.css\?v=20261119-convenios/);
 assert.match(sw,/url\.origin/);
});
test('módulo convênios utiliza exclusivamente consulta GET, sem alterar pagamento',()=>{
 const js=read('convenios-receber.js');
 assert.match(js,/\.api\('receivables\/convenios'\)/);
 assert.match(js,/linkedStore/);
 assert.match(js,/overdue/);
 assert.match(js,/convenioExport/);
 assert.doesNotMatch(js,/method:\s*['"](POST|PUT|PATCH|DELETE)|confirm-payment|\/payments['"]/);
});
