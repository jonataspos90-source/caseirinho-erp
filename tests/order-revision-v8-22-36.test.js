const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const src=fs.readFileSync('ecommerce-order-revision-v8-22-36.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('módulo de revisão possui sintaxe válida',()=>{
  assert.doesNotThrow(()=>new Function(src));
});

test('pedido aceito mantém ações úteis',()=>{
  assert.match(src,/Revisar itens/);
  assert.match(src,/PDF/);
  assert.match(src,/PIX no App/);
});

test('item indisponível permite remover ou substituir',()=>{
  assert.match(src,/Estou sem este item/);
  assert.match(src,/Remover do pedido/);
  assert.match(src,/Substituir por outro/);
  assert.match(src,/revision-proposal/);
});

test('novo pedido revisado pode ser importado e original é marcado substituído',()=>{
  assert.match(src,/Importar revisão/);
  assert.match(src,/SUBSTITUIDO/);
  assert.match(src,/restante=0/);
});

test('service worker injeta módulo V8.22.36 preservando contratos anteriores',()=>{
  assert.match(sw,/john-erp-pwa-v8\.22\.31-category-save/);
  assert.match(sw,/production-recovery-v8-22-15\.js\?v=82218/);
  assert.match(sw,/ecommerce-order-revision-v8-22-36\.js/);
});
