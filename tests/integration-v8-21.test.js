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
  assert.match(sync,/caseirinho-pao-caseiro/);
  assert.match(sync,/caseirinho-rosquinha-trancada/);
  assert.match(sync,/function retireFromStoreCatalog/);
  assert.match(sync,/p\.status='INATIVO'/);
  assert.match(sync,/e\.publicar=false/);
  assert.match(sync,/cat\.produtos=kept/);
  assert.doesNotMatch(sync,/const REQUIRED=\[\s*\{/);
});
