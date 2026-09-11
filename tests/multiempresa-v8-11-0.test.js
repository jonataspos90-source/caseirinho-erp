const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const multi=fs.readFileSync('multiempresa-v8-11-0.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const stability=fs.readFileSync('production-stability-v8-10-5.js','utf8');

test('storage ganha namespace por tenant',()=>{
  assert.match(multi,/john:\$\{slug\}:\$\{key\}/);
  assert.match(multi,/Storage\.prototype\.getItem/);
  assert.match(multi,/Storage\.prototype\.setItem/);
});

test('migração legada só ocorre quando o slug antigo é o mesmo tenant',()=>{
  assert.match(multi,/legacySlug!==tenantSlug/);
  assert.match(multi,/Copi/);
});

test('ERP novo usa token de sessão individual no login',()=>{
  assert.match(multi,/cloudToken:c\.token/);
  assert.match(multi,/apiKey:c\.token/);
  assert.match(multi,/erp-login/);
  assert.doesNotMatch(multi,/apiKey\s*:\s*['\"][^'\"]+['\"]/);
});

test('cliente não recebe lista de tenants',()=>{
  assert.doesNotMatch(multi,/\/api\/v1\/platform/);
  assert.doesNotMatch(multi,/tenants\b/);
});

test('primeiro MASTER depende de bootstrap',()=>{
  assert.match(multi,/bootstrap\/master/);
  assert.match(multi,/johnBootToken/);
});

test('service worker injeta multiempresa antes do fechamento do head',()=>{
  assert.match(sw,/indexOf\('<\/head>'\)/);
  assert.match(sw,/MULTI_TAG/);
  assert.match(sw,/multiempresa-v8-11-0\.js/);
});

test('service worker continua apagando somente caches do ERP',()=>{
  assert.match(sw,/startsWith\('john-erp-pwa-'\)/);
});

test('camada de estabilidade foi preservada',()=>{
  assert.match(stability,/isSafeChangeGet/);
  assert.match(stability,/stabilizeOrdersTable/);
  assert.match(stability,/ensureMultiempresa/);
});
