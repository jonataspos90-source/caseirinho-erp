'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root='central-caseirinho-insights/';
const read=x=>fs.readFileSync(root+x,'utf8');
test('Gerenciar categorias está em Produtos e preços, inclusive no celular',()=>{
 const html=read('index.html'),css=read('styles.css');
 assert.match(html,/id="categoryManagerPanel"/);
 assert.match(html,/id="categoryCreate"/);
 assert.match(html,/id="categoryManagerList"/);
 assert.match(html,/id="categoryRefresh"/);
 assert.match(css,/@media\(max-width:650px\).*?category-grid/s);
 assert.ok(html.indexOf('id="categoryManagerPanel"')>html.indexOf('<section id="products"'));
 assert.ok(html.indexOf('id="categoryManagerPanel"')<html.indexOf('id="productsList"'));
});
test('Ações criam, editam e excluem categorias via API; exclusão bloqueada quando há produtos',()=>{
 const module=read('category-manager.js'),app=read('app.js');
 assert.match(module,/method:id\?'PATCH':'POST'/);
 assert.match(module,/method:'DELETE'/);
 assert.match(module,/c\.productCount>0/);
 assert.match(module,/bridge\(\)\?\.filterProducts/);
 assert.match(module,/b\.reload\(\)/);
 assert.match(app,/CaseirinhoCategoryBridge/);
 assert.match(app,/categoryId=E\('editCategory'\)/);
 assert.match(app,/categoryChanged\?\{categoryId\}/);
 assert.match(app,/published\.categoryId===expected\.categoryId/);
});
test('Serviço e PWA carregam as versões atualizadas sem erros de sintaxe',()=>{
 const html=read('index.html'),sw=read('sw.js');
 assert.match(html,/category-manager\.js\?v=20261110-1/);
 assert.match(sw,/caseirinho-insights-app-shell-v47-descriptions-20261110/);
 assert.match(sw,/category-manager\.js\?v=20261110-1/);
 for(const file of ['app.js','category-manager.js','sw.js'])assert.doesNotThrow(()=>new vm.Script(read(file)));
});
