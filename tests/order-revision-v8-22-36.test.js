const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const src=fs.readFileSync('ecommerce-order-revision-v8-22-37.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('módulo de revisão estável possui sintaxe válida',()=>{
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

test('service worker injeta módulo V8.22.37 preservando contratos anteriores na release atual',()=>{
  assert.match(sw,/john-erp-pwa-v8\.22\.39-delivery-moto/);
  assert.match(sw,/production-recovery-v8-22-15\.js\?v=82218/);
  assert.match(sw,/ecommerce-order-revision-v8-22-37\.js/);
  assert.doesNotMatch(sw,/const ORDER_REVISION='\.\/ecommerce-order-revision-v8-22-36\.js'/);
});

test('renderizador estável não observa toda a árvore DOM em loop',()=>{
  assert.doesNotMatch(src,/new MutationObserver/);
  assert.match(src,/scheduleDecorate/);
  assert.match(src,/dataset\.sig/);
});
