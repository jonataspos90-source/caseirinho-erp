'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const src=fs.readFileSync(path.join(__dirname,'..','cashback-visibility-hotfix-v8-22-43.js'),'utf8');

test('Vendas possui submodulo Pedidos / Entregas',()=>{
  assert.match(src,/Pedidos \/ Entregas/);
  assert.match(src,/Submódulo de Vendas/);
  assert.match(src,/Marcar entregue/);
});

test('conclusao usa status do pedido como gatilho central do cashback',()=>{
  assert.match(src,/\/api\/v1\/admin\/store\/orders\/statuses/);
  assert.match(src,/ENTREGUE/);
  assert.match(src,/RETIRADO/);
  assert.match(src,/cashback será processada automaticamente|cashback será processado automaticamente|cashback.*automaticamente/i);
});

test('lista pedidos cloud e consulta configuracao sem criar credito paralelo',()=>{
  assert.match(src,/\/api\/v1\/admin\/store\/orders\?status=TODOS&limit=1000/);
  assert.match(src,/\/api\/v1\/admin\/cashback\/config/);
  assert.doesNotMatch(src,/\/cashback\/(credit|credito|grant|liberar)/i);
});
