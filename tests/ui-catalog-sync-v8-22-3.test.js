const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const central=fs.readFileSync('central-modules-hotfix-v8-22-2.js','utf8');
const sync=fs.readFileSync('caseirinho-commerce-sync-v8-21.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('Central de Módulos carrega CSS de forma independente do service worker',()=>{
  assert.match(central,/johnNextCss8223/);
  assert.match(central,/john-next-v8-17\.css\?v=8223/);
  assert.match(central,/jn-modules-grid/);
  assert.match(central,/@media\(max-width:820px\)/);
});

test('Motor Comercial e Central Gerencial permanecem fora do menu lateral',()=>{
  assert.match(central,/data-module="motorcomercial"/);
  assert.match(central,/data-module="centralgerencial"/);
  assert.match(central,/display:none!important/);
});

test('sincronizador não reativa nem republica produto existente',()=>{
  assert.match(sync,/const existed=!!p/);
  assert.match(sync,/if\(!existed\)e\.publicar=true/);
  assert.doesNotMatch(sync,/\np\.status='ATIVO';/);
  assert.doesNotMatch(sync,/\ne\.publicar=true;/);
});

test('alterações de catálogo são enviadas após save do ERP',()=>{
  assert.match(sync,/installSaveHook/);
  assert.match(sync,/schedulePublished\('erp-save'/);
  assert.match(sync,/startup-reconcile/);
  assert.match(sync,/quantidadeMinima/);
});

test('PWA invalida caches anteriores e carrega os módulos atuais com cache-busting',()=>{
  assert.match(sw,/const CACHE='john-erp-pwa-v8\.22\.\d+[-\w]*'/);
  assert.match(sw,/keys\.filter\(k=>k!==CACHE&&k\.startsWith\('john-erp-pwa-'\)\)/);
  assert.match(sw,/john-next-v8-17\.css\?v=\d+/);
  assert.match(sw,/caseirinho-commerce-sync-v8-21\.js\?v=\d+/);
  assert.match(sw,/transaction-persistence-v8-22-13\.js/);
});
