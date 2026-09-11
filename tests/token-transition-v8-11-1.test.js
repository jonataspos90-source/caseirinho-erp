const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const multi=fs.readFileSync('multiempresa-v8-11-0.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const stability=fs.readFileSync('production-stability-v8-10-5.js','utf8');

test('V8.11.1 não limpa chave legada do tenant original antes da sessão V2',()=>{
  assert.match(multi,/isOriginalLegacyTenant/);
  assert.match(multi,/tenantSlug===legacySlug/);
  assert.match(multi,/c\.apiKey=S\(legacy\.apiKey\)\.trim\(\)/);
  assert.match(multi,/LEGACY_TRANSITION/);
});

test('sessão individual V2 continua com prioridade',()=>{
  const sessionPos=multi.indexOf("sess?.cloudToken&&tokenAlive");
  const legacyPos=multi.indexOf("isOriginalLegacyTenant");
  assert.ok(sessionPos>=0 && legacyPos>sessionPos);
  assert.match(multi,/c\.apiKey=sess\.cloudToken/);
  assert.match(multi,/SESSION_V2/);
});

test('tenant novo não herda credencial legada',()=>{
  assert.match(multi,/Para qualquer outra empresa/);
  assert.match(multi,/if\(c\.apiKey\)\{\s*c\.apiKey='';/s);
  assert.match(multi,/TENANT_LOGIN_REQUIRED/);
});

test('migração de storage continua copiando e não apagando a base antiga',()=>{
  assert.match(multi,/migrateLegacyStorage/);
  assert.match(multi,/rawSet\(storage,dest,value\)/);
  const migrationBlock=multi.slice(
    multi.indexOf('function migrateLegacyStorage'),
    multi.indexOf('migrateLegacyStorage(localStorage)')
  );
  assert.doesNotMatch(migrationBlock,/rawRemove\(storage,key\)/);
});

test('service worker força cache V8.11.1',()=>{
  assert.match(sw,/john-erp-pwa-v8\.11\.1-multiempresa/);
  assert.match(sw,/multiempresa-v8-11-0\.js\?v=8111/);
});

test('camada de estabilidade aponta para o mesmo arquivo canônico',()=>{
  assert.match(stability,/multiempresa-v8-11-0\.js\?v=8111/);
});

test('não foram criados arquivos hotfix empilhados',()=>{
  assert.doesNotMatch(multi,/hotfix-v8-11-1/i);
});
