const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const cx=fs.readFileSync('ecommerce-customer-experience-v8-13-0.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('fila mantém PDF e não expõe editar excluir ou cancelar',()=>{
  const actions=cx.slice(
    cx.indexOf('function actionHtml'),
    cx.indexOf('function freightHtml')
  );
  assert.match(actions,/data-cx-pdf/);
  assert.match(actions,/>PDF</);
  assert.doesNotMatch(actions,/Editar|Excluir|Cancelar pedido/);
});

test('fluxo de frete segue cotação, resposta do cliente e aceite',()=>{
  assert.match(cx,/Cotação/);
  assert.match(cx,/Aguardando cliente/);
  assert.match(cx,/AGUARDANDO_ACEITE_ERP/);
  assert.match(cx,/Aceitar/);
  assert.match(cx,/Rejeitar/);
});

test('recusa do frete é exibida como Cancelado e não libera nova cotação',()=>{
  assert.match(cx,/decision==='REJEITADO'.*return'CANCELADO'/s);
  assert.match(cx,/disabled>Cancelado/);
  const actions=cx.slice(
    cx.indexOf('function actionHtml'),
    cx.indexOf('function freightHtml')
  );
  assert.doesNotMatch(actions,/Nova cotação/);
});

test('aceito mantém indicador Aceito e PDF',()=>{
  const actions=cx.slice(
    cx.indexOf('function actionHtml'),
    cx.indexOf('function freightHtml')
  );
  assert.match(actions,/disabled>Aceito/);
  assert.match(actions,/data-cx-pdf/);
});

test('rejeitado mantém indicador Rejeitado e PDF',()=>{
  const actions=cx.slice(
    cx.indexOf('function actionHtml'),
    cx.indexOf('function freightHtml')
  );
  assert.match(actions,/disabled>Rejeitado/);
  assert.match(actions,/data-cx-pdf/);
});

test('PDF do pedido inclui cliente itens valores e impressão',()=>{
  assert.match(cx,/function printOrderPdf/);
  assert.match(cx,/Cliente:/);
  assert.match(cx,/Produto/);
  assert.match(cx,/Subtotal:/);
  assert.match(cx,/window\.print/);
});

test('filtros data de até e status existem',()=>{
  assert.match(cx,/johnCxFrom/);
  assert.match(cx,/johnCxTo/);
  assert.match(cx,/johnCxStatus/);
});

test('horário de entrega usa endpoint novo',()=>{
  assert.match(cx,/customer-delivery-time/);
  assert.match(cx,/data-cx-time/);
});

test('service worker injeta plataforma e experiência',()=>{
  assert.match(sw,/platform-admin-v8-12-0\.js/);
  assert.match(sw,/ecommerce-customer-experience-v8-13-0\.js/);
  assert.match(sw,/john-erp-pwa-v8\.13\.0-customer-experience/);
});
