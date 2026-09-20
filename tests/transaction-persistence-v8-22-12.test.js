const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const tx=fs.readFileSync('transaction-persistence-v8-22-13.js','utf8');
const settings=fs.readFileSync('store-settings-sync-v8-22-13.js','utf8');
const pix=fs.readFileSync('pix-document-fix-v8-22-13.js','utf8');
const integrity=fs.readFileSync('production-integrity-v8-22-14.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('PWA carrega proteção transacional e integridade V8.22.14',()=>{
  assert.match(sw,/john-erp-pwa-v8\.22\.14-production-integrity/);
  assert.match(sw,/transaction-persistence-v8-22-13\.js/);
  assert.match(sw,/production-integrity-v8-22-14\.js/);
  assert.match(sw,/injectHead\(html,'transaction-persistence-v8-22-13\.js',TX_TAG\)/);
  assert.ok(sw.indexOf("injectHead(html,'transaction-persistence-v8-22-13.js'") < sw.indexOf("injectHead(html,'multiempresa-v8-12-0.js'"));
  assert.ok(sw.indexOf("injectBefore(html,'pix-document-fix-v8-22-13.js'") < sw.indexOf("injectBefore(html,'production-integrity-v8-22-14.js'"));
});

test('pedidos existentes e backup pré-ativação continuam protegidos',()=>{
  assert.match(tx,/john_public_pre_activation_backup_v1/);
  assert.match(tx,/john_erp_transaction_backup_v1/);
  assert.match(tx,/pedidos/);
  assert.match(tx,/mergeOrders/);
  assert.match(tx,/applyBackup/);
  assert.match(tx,/sameOrder/);
});

test('pedidos também são recuperados da base autoritativa da API',()=>{
  assert.match(tx,/\/api\/v1\/admin\/sync\/export/);
  assert.match(tx,/fetchCloudDb/);
  assert.match(tx,/reconcileCloud/);
  assert.match(tx,/remote\.pedidos/);
  assert.match(tx,/john:orders-cloud-restored/);
});

test('backup transacional preserva clientes e financeiro ligado ao pedido',()=>{
  for(const s of ['pessoas','convenioDuplicatas','convenioPagamentos','fluxoCaixa','vendas'])assert.match(tx,new RegExp(s));
});

test('PIX da impressão vem sempre do Cadastro da Loja',()=>{
  assert.match(settings,/origem='CADASTRO_LOJA'/);
  assert.match(settings,/function storePix/);
  assert.match(settings,/applyStorePixToPrint/);
  assert.match(settings,/a origem do PIX é sempre o Cadastro da Loja/);
  assert.doesNotMatch(settings,/PIX local preenchido é autoritativo/);
});

test('PDF força leitura do PIX do Cadastro da Loja e intercepta o HTML final',()=>{
  assert.match(pix,/function storePix/);
  assert.match(pix,/origem:'CADASTRO_LOJA'/);
  assert.match(integrity,/function injectPix/);
  assert.match(integrity,/johnPixAuthority82214/);
  assert.match(integrity,/Dados carregados do Cadastro da Loja/);
});

test('persistência do último pedido possui fila contra gravações concorrentes',()=>{
  assert.match(integrity,/saveQueued=true/);
  assert.match(integrity,/while\(saveQueued\)/);
  assert.match(integrity,/johnCloudFlushIncremental/);
  assert.match(integrity,/persistDb\(\)/);
});
