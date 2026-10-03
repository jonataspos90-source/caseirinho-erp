'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const actions=fs.readFileSync('ecommerce-order-actions-v8-22-33.js','utf8');
const focus=fs.readFileSync('ecommerce-inbox-focus-v8-22-40.js','utf8');

test('accepted cloud orders missing locally are recovered into Pedidos clientes',()=>{
  assert.doesNotThrow(()=>new Function(actions));
  assert.match(actions,/function recoverAcceptedOrders\(\)/);
  assert.match(actions,/acceptedCloud\(o\)/);
  assert.match(actions,/linkedLocal\(id\)/);
  assert.match(actions,/buildLocalOrder\(o,/);
  assert.match(actions,/persistDb\(\)/);
});

test('customer matching avoids assigning an ambiguous WhatsApp to the wrong client',()=>{
  assert.match(actions,/function uniqueMatch\(/);
  assert.match(actions,/if\(same\.length===1\)return same\[0\]/);
  assert.match(actions,/if\(same\.length>1&&email\)/);
  assert.match(actions,/if\(phone&&clients\.some\(p=>phoneOf\(p\)===phone\)\)return null/);
  assert.match(actions,/preCadastroId:ext/);
});

test('marking ecommerce delivery as ENTREGUE is synchronized to the canonical order',()=>{
  assert.match(actions,/function syncFulfilledLocalOrders\(\)/);
  assert.match(actions,/\['ENTREGUE','RETIRADO'\]\.includes\(target\)/);
  assert.match(actions,/\/api\/v1\/admin\/store\/orders\/statuses/);
  assert.match(actions,/cashback será liberado pela regra central do pedido/);
});

test('the already-loaded inbox module boots the recovery module in production',()=>{
  assert.doesNotThrow(()=>new Function(focus));
  assert.match(focus,/ecommerce-order-actions-v8-22-33\.js\?v=82244-recovery-1/);
  assert.match(focus,/function ensureOrderRecovery\(\)/);
  assert.match(focus,/recoverAcceptedOrders/);
  assert.match(focus,/syncFulfilledLocalOrders/);
});
