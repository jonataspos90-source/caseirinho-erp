'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('vitrine antiga encaminha clientes para a Beauty independente',()=>{
 const src=read('lojas/cosmeticos/index.html');
 assert.match(src,/location\.replace\("https:\/\/beauty-app-api-production\.up\.railway\.app\/"\)/);
 assert.match(src,/preview=central/);
});
test('os rascunhos da Central antiga permanecem recuperáveis',()=>{
 const src=read('beauty-central/index.html');
 assert.match(src,/Beauty Central antiga \(rascunhos locais\)/);
 assert.match(src,/beauty-app-api-production\.up\.railway\.app\/central\//);
 assert.match(read('beauty-central/app.js'),/john_beauty_central_catalog_v1/);
});
test('Caseirinho não carrega painéis administrativos Beauty',()=>{
 const src=read('central-caseirinho-insights/index.html');
 assert.doesNotMatch(src,/partner-store-directory\.js/);
 const directory=read('lojas/index.html');
 assert.match(directory,/beauty-app-api-production\.up\.railway\.app/);
});
