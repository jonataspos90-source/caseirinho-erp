const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');

test('multiempresa carrega diretamente no head',()=>{
  const head=html.indexOf('<head>');
  const multi=html.indexOf('multiempresa-v8-12-0.js?v=8133');
  assert.ok(head>=0&&multi>head&&multi<html.indexOf('</head>'));
});

test('plataforma e experiência ecommerce carregam diretamente no html',()=>{
  assert.match(html,/production-stability-v8-10-5\.js\?v=8133/);
  assert.match(html,/platform-admin-v8-12-0\.js\?v=8133/);
  assert.match(html,/ecommerce-customer-experience-v8-13-0\.js\?v=8133/);
});
