const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');

test('V8.14 multiempresa carrega diretamente no head',()=>{
  const head=html.indexOf('<head>');
  const multi=html.indexOf('multiempresa-v8-12-0.js?v=8140');
  assert.ok(head>=0&&multi>head&&multi<html.indexOf('</head>'));
});

test('V8.14 plataforma e experiência ecommerce carregam diretamente no html',()=>{
  assert.match(html,/production-stability-v8-10-5\.js\?v=8140/);
  assert.match(html,/platform-admin-v8-12-0\.js\?v=8140/);
  assert.match(html,/ecommerce-customer-experience-v8-13-0\.js\?v=8140/);
});

test('index legado delega a fila ao controlador consolidado',()=>{
  assert.match(html,/window\.johnEcommerceOrdersController\?\.refresh/);
  assert.match(html,/window\.johnEcommerceOrdersController\?\.render/);
  assert.doesNotMatch(html,/window\.johnV8EditOrder=editOrderV8/);
  assert.doesNotMatch(html,/window\.johnV8DeleteOrder=deleteOrderV8/);
});


test('renderers antigos da fila foram aposentados no index',()=>{
  assert.doesNotMatch(html,/johnV880DeleteCloudOrder/);
  assert.doesNotMatch(html,/decorateTerminalDeletes/);
  assert.doesNotMatch(html,/refreshOrdersV88/);
  assert.doesNotMatch(html,/renderAuthoritative/);
  assert.doesNotMatch(html,/johnV83RejectOrder/);
  assert.doesNotMatch(html,/johnV8EditOrder/);
  assert.doesNotMatch(html,/johnV8DeleteOrder/);
  assert.doesNotMatch(html,/Excluir da operação/);
  assert.doesNotMatch(html,/Cancelar pedido/);
});

test('fila antiga V8.3 preserva apenas filtro de origem da tela normal',()=>{
  const m=html.match(/<script id="john-v83-critical-sync-fix">([\s\S]*?)<\/script>/);
  assert.ok(m);
  assert.match(m[1],/installOriginFilter/);
  assert.doesNotMatch(m[1],/\/api\/v1\/admin\/store\/orders/);
  assert.doesNotMatch(m[1],/setInterval/);
});
