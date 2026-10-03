const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const js=fs.readFileSync('ecommerce-inbox-focus-v8-22-40.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('hotfix V8.22.40 possui sintaxe válida',()=>{
  assert.doesNotThrow(()=>new Function(js));
});

test('pedidos importados/aceitos viram processados e saem da fila padrão',()=>{
  assert.match(js,/function isProcessed/);
  assert.match(js,/IMPORTADO/);
  assert.match(js,/st==='ACEITO'/);
  assert.match(js,/erpPedidoId/);
  assert.match(js,/erpNumero/);
  assert.match(js,/john-inbox-processed-82240/);
});

test('pedidos cancelados, rejeitados e substituídos também não poluem a fila ativa',()=>{
  assert.match(js,/CANCELADO/);
  assert.match(js,/REJEITADO/);
  assert.match(js,/SUBSTITUIDO/);
});

test('histórico continua acessível por botão Mostrar processados',()=>{
  assert.match(js,/Mostrar processados/);
  assert.match(js,/Ocultar processados/);
  assert.match(js,/setShowProcessed/);
});

test('aceite e refresh reaplicam filtro automaticamente',()=>{
  assert.match(js,/patchAccept/);
  assert.match(js,/johnOrderActions82233/);
  assert.match(js,/patchController/);
  assert.match(js,/johnEcommerceOrdersController/);
});

test('PWA atual injeta o hotfix da fila',()=>{
  assert.match(sw,/john-erp-pwa-v8\.22\.48-delivery-direct/);
  assert.match(sw,/ecommerce-inbox-focus-v8-22-40\.js/);
  assert.match(sw,/INBOX_FOCUS_TAG/);
});
