const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const commerce=fs.readFileSync(path.join(root,'commerce-engine-v8-15-0.js'),'utf8');
const management=fs.readFileSync(path.join(root,'management-engine-v8-16-0.js'),'utf8');
const sync=fs.readFileSync(path.join(root,'caseirinho-commerce-sync-v8-21.js'),'utf8');

test('menu lateral contém módulos E-commerce, Motor Comercial e Central Gerencial',()=>{
  assert.match(html,/nome:'E-commerce'/);
  assert.match(html,/nome:'Motor Comercial'/);
  assert.match(html,/nome:'Central Gerencial'/);
  assert.match(html,/page:'ecommerceCategorias'/);
});

test('motores expõem API global e sincronizam com o E-commerce',()=>{
  assert.match(commerce,/window\.JohnCommerceEngine815=/);
  assert.match(commerce,/syncEcommerce/);
  assert.match(management,/window\.JohnManagementEngine816=/);
  assert.match(management,/syncEcommerce/);
});

test('catálogo obrigatório contém pão caseiro e rosquinha com imagem',()=>{
  assert.match(sync,/Pão Caseiro/);
  assert.match(sync,/Rosquinha Trançada com Açúcar/);
  assert.match(sync,/e\.publicar=true/);
  assert.match(sync,/data:image\/svg\+xml/);
});
