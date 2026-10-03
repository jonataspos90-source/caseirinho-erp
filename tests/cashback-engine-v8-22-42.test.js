'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const cb=fs.readFileSync('cashback-engine-v8-22-42.js','utf8');
const commerce=fs.readFileSync('commerce-engine-v8-22-0.js','utf8');

test('Cashback ERP module has valid JavaScript',()=>{
  assert.doesNotThrow(()=>new Function(cb));
});

test('Cashback is exposed as Motor Comercial tab',()=>{
  assert.match(cb,/data-cetab/);
  assert.match(cb,/cashback/);
  assert.match(cb,/Configuração do Cashback/);
  assert.match(commerce,/cashback-engine-v8-22-42\.js/);
});

test('ERP config controls generation and redemption rules',()=>{
  assert.match(cb,/cb42Percent/);
  assert.match(cb,/cb42Min/);
  assert.match(cb,/cb42MaxUse/);
  assert.match(cb,/excludeShipping/);
  assert.match(cb,/allowPartialRedemption/);
  assert.match(cb,/\/api\/v1\/admin\/cashback\/config/);
});

test('ERP supports balance sorting, 30 day inactivity and direct customer search',()=>{
  assert.match(cb,/balance_desc/);
  assert.match(cb,/balance_asc/);
  assert.match(cb,/inactiveDays=30/);
  assert.match(cb,/Nome, CPF, CNPJ, telefone ou ID/);
  assert.match(cb,/\/api\/v1\/admin\/cashback\/customers/);
});

test('Cashback ledger extract is visible from ERP',()=>{
  assert.match(cb,/Extrato de Cashback/);
  assert.match(cb,/transactions/);
  assert.match(cb,/Saldo em aberto/);
  assert.match(cb,/Parado há \+30 dias/);
});
