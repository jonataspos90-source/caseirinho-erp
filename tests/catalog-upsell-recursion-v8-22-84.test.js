'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
function boot(){
 let generated=0;
 const db={produtos:[{id:'p1',nome:'Nhoque',precoVenda:34.99,ecommerce:{publicar:true,precoEcommerce:29.90,adicionais:[{id:'a1',produtoId:'p2',nome:'Queijo',preco:3}]}},{id:'p2',nome:'Queijo',ecommerce:{publicar:false}}]};
 const window={db,addEventListener(){},dispatchEvent(){},__johnPublicarEcomLocal:()=>{generated++;return{loja:{},produtos:[{id:'p1',nome:'Nhoque',preco:34.99}]}}};
 const context=vm.createContext({window,document:{readyState:'loading',addEventListener(){}},setTimeout(){},clearTimeout(){},console,localStorage:{getItem(){return null},setItem(){}},CustomEvent:class{},URL,encodeURIComponent});
 let source=fs.readFileSync(path.join(root,'ecommerce-upsell-v8-22-23.js'),'utf8');
 // Expor somente no sandbox o instalador privado real, sem iniciar a UI.
 source=source.replace(/\}\)\(\);\s*$/,'window.installHookForTest=installCatalogHook;})();');
 vm.runInContext(source,context);
 return {window,context,getGenerated:()=>generated};
}
function installOtherWrapper(window){
 const previous=window.__johnPublicarEcomLocal;
 window.__johnPublicarEcomLocal=function(){const cat=previous.apply(this,arguments);cat.loja.nome='Caseirinho';return cat};
}
test('reinstalar adicionais após outro wrapper não cria ciclo',()=>{
 const {window,getGenerated}=boot();
 window.installHookForTest();
 const firstHook=window.__johnPublicarEcomLocal;
 installOtherWrapper(window);
 window.installHookForTest();
 const cat=window.__johnPublicarEcomLocal(true);
 assert.equal(cat.loja.nome,'Caseirinho');
 assert.equal(cat.produtos[0].adicionais[0].preco,3);
 assert.equal(getGenerated(),1);
 assert.equal(firstHook(true).produtos[0].id,'p1');
 assert.equal(getGenerated(),2);
});
test('intercalações repetidas dos módulos preservam uma geração por chamada',()=>{
 const {window,getGenerated}=boot();
 for(let i=0;i<30;i++){window.installHookForTest();installOtherWrapper(window);}
 window.installHookForTest();
 assert.equal(window.__johnPublicarEcomLocal(true).produtos.length,1);
 assert.equal(getGenerated(),1);
});
test('publicação completa após reinstalações envia preço salvo e adicionais uma vez',async()=>{
 const {window,context,getGenerated}=boot();
 for(let i=0;i<5;i++){window.installHookForTest();installOtherWrapper(window);}
 window.installHookForTest();
 const sent=[];window.adminFetch=async(p,o)=>{sent.push({path:p,body:JSON.parse(o.body)});return {total:1}};
 vm.runInContext(fs.readFileSync(path.join(root,'caseirinho-commerce-sync-v8-21.js'),'utf8'),context);
 await window.JohnCaseirinhoCatalogSync821.publishDirect(true);
 assert.equal(sent.length,1);
 assert.equal(sent[0].body.produtos[0].preco,29.90);
 assert.equal(sent[0].body.produtos[0].adicionais[0].preco,3);
 assert.equal(getGenerated(),1);
});
