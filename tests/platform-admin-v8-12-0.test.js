const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const multi=fs.readFileSync('multiempresa-v8-12-0.js','utf8');
const panel=fs.readFileSync('platform-admin-v8-12-0.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const stability=fs.readFileSync('production-stability-v8-10-5.js','utf8');

test('V8.12.0 mantém namespace por tenant',()=>{
  assert.match(multi,/john:\$\{slug\}:\$\{key\}/);
  assert.match(multi,/Storage\.prototype\.getItem/);
});

test('Modo Suporte usa fragmento e sessão assinada',()=>{
  assert.match(multi,/john-support/);
  assert.match(multi,/supportPayload\?\.support===true/);
  assert.match(panel,/u\.hash='john-support='/);
  assert.match(panel,/support-session/);
});

test('painel usa sessão ERP e não contém PLATFORM_ADMIN_KEY',()=>{
  assert.match(panel,/cloudToken/);
  assert.match(panel,/Authorization':'Bearer '/);
  assert.doesNotMatch(panel,/PLATFORM_ADMIN_KEY/);
  assert.doesNotMatch(panel,/X-John-Platform-Key/);
});

test('painel administra criar editar suspender ativar e suporte',()=>{
  assert.match(panel,/Nova empresa/);
  assert.match(panel,/Editar empresa/);
  assert.match(panel,/suspend/);
  assert.match(panel,/activate/);
  assert.match(panel,/supportEnter/);
});

test('módulos da policy são aplicados à navegação',()=>{
  assert.match(multi,/MODULE_MATCHERS/);
  assert.match(multi,/applyTenantPolicy/);
  assert.match(multi,/johnModuleAllowed/);
});

test('service worker V8.13 preserva multiempresa e painel da V8.12',()=>{
  assert.match(sw,/multiempresa-v8-12-0\.js\?v=8132/);
  assert.match(sw,/platform-admin-v8-12-0\.js\?v=8132/);
  assert.match(sw,/john-erp-pwa-v8\.13\.2-customer-experience/);
});

test('estabilidade existente permanece e possui fallback dos novos módulos',()=>{
  assert.match(stability,/stabilizeOrdersTable/);
  assert.match(stability,/ensureMultiempresa/);
  assert.match(stability,/ensurePlatformOwner/);
});
