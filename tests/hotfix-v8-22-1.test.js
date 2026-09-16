const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const central=fs.readFileSync(path.join(root,'central-modules-hotfix-v8-22-2.js'),'utf8');
const usage=fs.readFileSync(path.join(root,'erp-usage-v8-22-1.js'),'utf8');

test('PWA injeta módulos centrais e recuperação mesmo sobre shell antigo',()=>{
  assert.match(sw,/john-erp-pwa-v8\.22\.5-persistent-media/);
  assert.match(sw,/commerce-engine-v8-22-0\.js/);
  assert.match(sw,/management-engine-v8-22-0\.js/);
  assert.match(sw,/catalog-deep-recovery-v8-18-1\.js/);
  assert.match(sw,/central-modules-hotfix-v8-22-2\.js/);
});
test('Motor Comercial e Central Gerencial alimentam a central sem aparecer na sidebar',()=>{
  assert.match(central,/Motor Comercial/);
  assert.match(central,/Central Gerencial/);
  assert.match(central,/john-module-group/);
  assert.match(central,/window\.JohnCommerce822/);
  assert.match(central,/window\.JohnManagement822/);
  assert.match(central,/\.sidebar \.john-module-group\[data-module="motorcomercial"\]/);
  assert.match(central,/\.sidebar \.john-module-group\[data-module="centralgerencial"\]/);
  assert.match(central,/johnNext\?\.renderHub/);
});
test('Uso App separa ERP PWA de Loja PWA',()=>{
  assert.match(usage,/ERP App\/PWA agora/);
  assert.match(usage,/ERP navegador agora/);
  assert.match(usage,/Loja\/App PWA agora/);
  assert.match(usage,/Loja\/App navegador agora/);
  assert.match(usage,/5\*60000/);
});
