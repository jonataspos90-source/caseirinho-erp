const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'central-modules-hotfix-v8-22-2.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
test('Motor Comercial e Central Gerencial não ficam visíveis na barra lateral',()=>{
 assert.match(src,/\.sidebar \.john-module-group\[data-module="motorcomercial"\]/);
 assert.match(src,/\.sidebar \.john-module-group\[data-module="centralgerencial"\]/);
 assert.match(src,/display:none!important/);
});
test('os grupos continuam existentes para a Central de Módulos',()=>{
 assert.match(src,/makeGroup\('motorcomercial'/);
 assert.match(src,/makeGroup\('centralgerencial'/);
 assert.match(src,/johnNext\?\.renderHub/);
});
test('PWA injeta a versão 8.22.3',()=>{
 assert.match(sw,/john-erp-pwa-v8\.22\.3-ui-catalog-sync/);
 assert.match(sw,/central-modules-hotfix-v8-22-2\.js/);
});
