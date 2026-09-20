const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const multi=fs.readFileSync('multiempresa-v8-12-0.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const stability=fs.readFileSync('production-stability-v8-10-5.js','utf8');

test('versão atual não limpa chave legada do tenant original antes da sessão V2',()=>{assert.match(multi,/isOriginalLegacyTenant/);assert.match(multi,/tenantSlug===legacySlug/);assert.match(multi,/c\.apiKey=S\(legacy\.apiKey\)\.trim\(\)/);assert.match(multi,/LEGACY_TRANSITION/)});
test('sessão individual V2 continua com prioridade',()=>{const sessionPos=multi.indexOf("sess?.cloudToken&&tokenAlive");const legacyPos=multi.indexOf("isOriginalLegacyTenant");assert.ok(sessionPos>=0&&legacyPos>sessionPos);assert.match(multi,/c\.apiKey=sess\.cloudToken/);assert.match(multi,/SESSION_V2/)});
test('tenant novo não herda credencial legada',()=>{assert.match(multi,/Token de DISPOSITIVO/);assert.match(multi,/if\(c\.apiKey\)c\.apiKey=''/);assert.match(multi,/TENANT_LOGIN_REQUIRED/)});
test('migração de storage continua copiando e não apagando a base antiga',()=>{assert.match(multi,/migrateLegacyStorage/);assert.match(multi,/rawSet\(storage,dest,value\)/);const block=multi.slice(multi.indexOf('function migrateLegacyStorage'),multi.indexOf('migrateLegacyStorage(localStorage)'));assert.doesNotMatch(block,/rawRemove\(storage,key\)/)});
test('service worker força cache atual e multiempresa 8.12',()=>{assert.match(sw,/const CACHE='john-erp-pwa-v8\.22\.\d+[-\w]*'/);assert.match(sw,/multiempresa-v8-12-0\.js\?v=\d+/);assert.match(sw,/transaction-persistence-v8-22-13\.js/)});
test('camada de estabilidade aponta para o arquivo canônico multiempresa 8.12',()=>{assert.match(stability,/multiempresa-v8-12-0\.js\?v=8140/)});
test('não foram criados hotfixes de token empilhados',()=>{assert.doesNotMatch(multi,/hotfix-v8-11-1/i)});
