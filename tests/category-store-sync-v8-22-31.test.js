const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const save=fs.readFileSync('product-category-store-sync-v8-22-31.js','utf8');
const grade=fs.readFileSync('catalog-category-grade-sync-v8-22-30.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('Categoria Loja é gravada no ecommerce do produto e propagada à grade',()=>{
  assert.match(save,/e\.categoriaId=S\(cat\.id\)/);
  assert.match(save,/e\.categoria=S\(cat\.nome\)/);
  assert.match(save,/gradeForProduct/);
  assert.match(save,/g\.variantes/);
  assert.match(save,/johnCloudFlushIncremental/);
  assert.match(save,/publicarCatalogoEcommerce/);
});

test('salvamento do produto preserva a categoria selecionada mesmo se rotina legada falhar',()=>{
  assert.match(save,/function wrapSave/);
  assert.match(save,/const before=el\?remember\(el\):null/);
  assert.match(save,/finalizePending\(before\)/);
});

test('grade usa a alteração de produto mais recente em vez de forçar a capa',()=>{
  assert.match(grade,/function stamp/);
  assert.match(grade,/candidates\.sort\(\(a,b\)=>b\.ts-a\.ts/);
  assert.doesNotMatch(grade,/const coverId=.*ids\[0\]/);
});

test('service worker atual continua carregando as duas proteções de categoria',()=>{
  assert.match(sw,/catalog-category-grade-sync-v8-22-30\.js\?v=82239/);
  assert.match(sw,/product-category-store-sync-v8-22-31\.js\?v=82239/);
  assert.match(sw,/john-erp-pwa-v8\.22\.39-delivery-moto/);
});
