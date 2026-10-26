const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const commerce=fs.readFileSync(path.join(root,'commerce-engine-v8-22-0-core.js'),'utf8');
const management=fs.readFileSync(path.join(root,'management-engine-v8-22-0.js'),'utf8');
const sync=fs.readFileSync(path.join(root,'caseirinho-commerce-sync-v8-21.js'),'utf8');

test('menu lateral contém módulos E-commerce, Motor Comercial e Central Gerencial',()=>{
  assert.match(html,/nome:'E-commerce'/);
  assert.match(html,/nome:'Motor Comercial'/);
  assert.match(html,/nome:'Central Gerencial'/);
  assert.match(html,/page:'ecommerceCategorias'/);
});

test('motores expõem API global e sincronizam com o E-commerce',()=>{
  assert.match(commerce,/window\.JohnCommerce822=/);
  assert.match(commerce,/syncEcommerce/);
  assert.match(management,/window\.JohnManagement822=/);
  assert.match(management,/syncEcommerce/);
});

test('produtos encerrados são inativados e removidos da publicação sem apagar histórico',()=>{
  assert.match(sync,/caseirinho-rosquinha-trancada/);
  const retired=sync.slice(sync.indexOf('const RETIRED_PRODUCTS=['),sync.indexOf('];',sync.indexOf('const RETIRED_PRODUCTS=[')));
  assert.doesNotMatch(retired,/caseirinho-pao-caseiro/);
  assert.match(sync,/function retireFromStoreCatalog/);
  assert.match(sync,/p\.status='INATIVO'/);
  assert.match(sync,/e\.publicar=false/);
  assert.match(sync,/cat\.produtos=kept/);
  assert.doesNotMatch(sync,/const REQUIRED=\[\s*\{/);
});
test('pão Caseiro é restaurado uma vez e a rosquinha continua fora do catálogo',()=>{
  assert.match(sync,/function restorePaoCaseiroOnce/);
  assert.match(sync,/p\.status='ATIVO';e\.publicar=true/);
  assert.match(sync,/ecommercePaoCaseiroRestauradoV82278/);
  assert.match(sync,/const RETIRED_PRODUCTS=\[\s*\{ids:\['caseirinho-rosquinha-trancada'\]/);
});
