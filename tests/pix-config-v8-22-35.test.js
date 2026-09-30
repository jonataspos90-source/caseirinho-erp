const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const src=fs.readFileSync('caseirinho-pix-config-v8-22-35.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('configuração PIX oficial possui JavaScript válido',()=>{
  assert.doesNotThrow(()=>new Function(src));
});

test('Caseirinho fixa chave PIX CNPJ oficial',()=>{
  assert.match(src,/OFFICIAL='69195483000123'/);
  assert.match(src,/c\.documentoTipo='CNPJ'/);
  assert.match(src,/c\.chavePix=OFFICIAL/);
});

test('campos oficiais ficam protegidos contra alteração acidental',()=>{
  assert.match(src,/key\.readOnly=true/);
  assert.match(src,/doc\.readOnly=true/);
  assert.match(src,/type\.disabled=true/);
});

test('PWA carrega a configuração PIX oficial',()=>{
  assert.match(sw,/caseirinho-pix-config-v8-22-35\.js/);
  assert.match(sw,/PIX_OFFICIAL/);
  assert.match(sw,/PIX_OFFICIAL_TAG/);
});
