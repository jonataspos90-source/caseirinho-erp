'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');

function build(){
  let publishes=0;
  const direct=async()=>{publishes++;return {ok:true,total:2}};
  const window={
    db:{produtos:[]}, 
    addEventListener(){},dispatchEvent(){},
    JohnCaseirinhoCatalogSync821:{publish:direct,publishDirect:direct},
    JohnV880:{canonicalPublish:()=>window.publicarCatalogoEcommerce()},
    publicarCatalogoEcommerce:()=>window.JohnV880.canonicalPublish()
  };
  const ctx=vm.createContext({window,document:{},setTimeout(){},CustomEvent:class {},console});
  const code=fs.readFileSync(path.join(root,'catalog-category-grade-sync-v8-22-30.js'),'utf8');
  vm.runInContext(code,ctx);
  return {window,direct,getCalls:()=>publishes};
}
test('publicador original imune a aliases circulares dos scripts legados',async()=>{
  const {window,getCalls}=build();
  const pub=window.JohnCatalogCategoryGradeSync82231.publish;
  const done=await pub(true);
  assert.equal(done.ok,true);
  assert.equal(getCalls(),1);
});
test('duas publicações simultâneas usam só um PUT de catálogo',async()=>{
  const {window,getCalls}=build();
  const pub=window.JohnCatalogCategoryGradeSync82231.publish;
  const [a,b]=await Promise.all([pub(true),pub(true)]);
  assert.equal(a.ok,true);
  assert.equal(b.ok,true);
  assert.equal(getCalls(),1);
});
test('reinstalação tardia não troca a referência direta por um wrapper recursivo',async()=>{
  const {window,direct,getCalls}=build();
  window.JohnCatalogCategoryGradeSync82231.install();
  window.publicarCatalogoEcommerce=()=>window.JohnV880.canonicalPublish();
  window.JohnCatalogCategoryGradeSync82231.install();
  assert.equal(window.JohnCaseirinhoCatalogSync821.publishDirect,direct);
  await window.JohnCatalogCategoryGradeSync82231.publish(true);
  assert.equal(getCalls(),1);
});
test('publicação segura versionada e carregada sem cache anterior',()=>{
  const main=fs.readFileSync(path.join(root,'caseirinho-commerce-sync-v8-21.js'),'utf8');
  const worker=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
  assert.match(main,/publishDirect:authoritativePublish/);
  assert.match(worker,/john-erp-pwa-v8\.22\.65-catalog-publish-recursion-guard/);
  assert.match(worker,/caseirinho-commerce-sync-v8-21\.js\?v=82265/);
  assert.match(worker,/catalog-category-grade-sync-v8-22-30\.js\?v=82265/);
});
