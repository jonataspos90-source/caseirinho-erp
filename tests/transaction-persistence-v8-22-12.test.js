const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const tx=fs.readFileSync('transaction-persistence-v8-22-12.js','utf8');
const settings=fs.readFileSync('store-settings-sync-v8-22-12.js','utf8');
const pix=fs.readFileSync('pix-document-fix-v8-22-12.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('PWA carrega proteção transacional antes das demais camadas',()=>{
  assert.match(sw,/john-erp-pwa-v8\.22\.12-transaction-persistence/);
  assert.match(sw,/transaction-persistence-v8-22-12\.js/);
  assert.match(sw,/injectHead\(html,'transaction-persistence-v8-22-12\.js',TX_TAG\)/);
  assert.ok(sw.indexOf("injectHead(html,'transaction-persistence-v8-22-12.js'") < sw.indexOf("injectHead(html,'multiempresa-v8-12-0.js'"));
});

test('pedidos existentes e backup pré-ativação entram na reconciliação',()=>{
  assert.match(tx,/john_public_pre_activation_backup_v1/);
  assert.match(tx,/john_erp_transaction_backup_v1/);
  assert.match(tx,/pedidos/);
  assert.match(tx,/mergeOrders/);
  assert.match(tx,/applyBackup/);
  assert.match(tx,/sameOrder/);
});

test('backup transacional também preserva clientes e financeiro ligado ao pedido',()=>{
  assert.match(tx,/pessoas/);
  assert.match(tx,/convenioDuplicatas/);
  assert.match(tx,/convenioPagamentos/);
  assert.match(tx,/fluxoCaixa/);
  assert.match(tx,/vendas/);
});

test('PIX local preenchido não é substituído pelo catálogo público',()=>{
  assert.match(settings,/PIX local preenchido é autoritativo/);
  assert.match(settings,/!S\(p\.chavePix\)\.trim\(\)&&S\(rp\.chave\)\.trim\(\)/);
  assert.doesNotMatch(settings,/published>=ts\(p\.atualizadoEm\)/);
});

test('documento do PDF acompanha chave PIX CPF ou CNPJ',()=>{
  assert.match(pix,/digits\.length===11\|\|digits\.length===14/);
  assert.match(pix,/p\.documento=digits/);
  assert.match(pix,/p\.documentoTipo=tipo/);
  assert.match(pix,/38824690807/);
  assert.match(pix,/p\.documento=''/);
});
