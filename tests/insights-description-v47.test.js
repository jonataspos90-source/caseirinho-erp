'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const root='central-caseirinho-insights/';
const read=name=>fs.readFileSync(root+name,'utf8');
test('O cartão do produto oferece editor direto da descrição comercial',()=>{
 const app=read('app.js'),html=read('index.html');
 assert.match(app,/data-action="descriptionProduct"/);
 assert.match(app,/function editProductDescription\(id\)/);
 assert.match(app,/id="productDescriptionText"/);
 assert.match(app,/maxlength="1200"/);
 assert.match(app,/async function saveProductDescription\(event\)/);
 assert.match(app,/productDescriptionEditForm/);
 assert.match(app,/getVerifiedProduct\(pid\)/);
 assert.match(app,/data-action="photosProduct"/);
 assert.match(app,/data-action="editProduct"/);
 assert.match(html,/app\.js\?v=20261110-descriptions-1/);
});
test('A gravação da descrição é isolada e confirma o retorno antes de informar sucesso',()=>{
 const app=read('app.js');
 assert.match(app,/catalog\/'\+encodeURIComponent\(pid\)\+'\/description'/);
 assert.match(app,/body:\{description,expectedUpdatedAt:current\.updatedAt\}/);
 assert.match(app,/s\(fresh\.description\)\.trim\(\)===description/);
 assert.match(app,/st\.catalog=st\.catalog\.map/);
 assert.match(app,/Descrição atualizada e conferida no ERP e na loja/);
 assert.match(app,/A conexão caiu durante a gravação/);
});
test('PWA invalida cache para carregar botão e estilos atualizados',()=>{
 const sw=read('sw.js'),html=read('index.html'),css=read('styles.css');
 assert.match(sw,/caseirinho-insights-app-shell-v48-platform-sales-20261110/);
 assert.match(sw,/app\.js\?v=20261110-descriptions-1/);
 assert.match(html,/styles\.css\?v=20261110-descriptions-1/);
 assert.match(css,/product-description-preview/);
 assert.doesNotThrow(()=>new vm.Script(read('app.js')));
});
