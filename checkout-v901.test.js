const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const app=fs.readFileSync(path.join(__dirname,'app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'service-worker.js'),'utf8');

test('checkout envia LGPD verdadeiro ao backend',()=>{
  assert.match(app,/lgpd:\s*\{/);
  assert.match(app,/consent:true/);
  assert.match(app,/policyVersion:/);
});

test('checkout envia clientRequestId e preserva retry',()=>{
  assert.match(app,/clientRequestIdFor\(body\)/);
  assert.match(app,/PENDING_ORDER_KEY/);
  assert.match(app,/removeLocal\(PENDING_ORDER_KEY\)/);
});

test('checkbox LGPD é obrigatório no HTML',()=>{
  assert.match(html,/id="consent" type="checkbox" required/);
});

test('polling não recarrega catálogo completo a cada 30 segundos',()=>{
  assert.match(app,/catalog\/version/);
  assert.doesNotMatch(app,/setInterval\(\(\)=>\{if\(!document\.hidden\)loadCatalog\(true\)\},30000\)/);
});

test('service worker continua sem injeção de scripts',()=>{
  assert.doesNotMatch(sw,/injectPatch|PATCH_TAG|html\.replace/);
});
