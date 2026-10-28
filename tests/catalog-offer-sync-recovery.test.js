'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

function boot(){
  const storage=new Map();
  const calls=[];
  const db={produtos:[{id:'p1',codigo:'E01',nome:'Empada',precoVenda:13.99,ecommerce:{publicar:true,precoEcommerce:13.99,promocao:{ativo:true,precoPromocional:11.99},packVirtual:{ativo:true,packId:'misto',tipo:'LEVE_X_PAGUE_Y',quantidadeLeve:5,quantidadePague:4,produtoIds:['p1','p2']}}}]};
  const window={db,addEventListener(){},dispatchEvent(){},__johnPublicarEcomLocal:()=>({loja:{},produtos:[{id:'p1',codigo:'E01',preco:13.99}]})};
  const localStorage={getItem:key=>storage.get(key)||null,setItem:(key,val)=>storage.set(key,val)};
  const context={window,db,localStorage,document:{readyState:'loading',addEventListener(){}},setTimeout(){return 1},clearTimeout(){},console,URL,encodeURIComponent,CustomEvent:class{}};
  context.adminFetch=async(path,options)=>{calls.push({path,body:JSON.parse(options.body)});return{total:1}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..','caseirinho-commerce-sync-v8-21.js'),'utf8'),context);
  return{db,window,calls,api:window.JohnCaseirinhoCatalogSync821};
}

test('alterar apenas a promoção ou Pack muda a impressão digital e ativa sincronização',()=>{
  const {db,api}=boot();
  const original=api.catalogFingerprint();
  db.produtos[0].ecommerce.promocao.precoPromocional=10.99;
  const changedPromo=api.catalogFingerprint();
  assert.notEqual(changedPromo,original);
  db.produtos[0].ecommerce.packVirtual.quantidadePague=3;
  assert.notEqual(api.catalogFingerprint(),changedPromo);
});

test('publicador recupera ofertas do ERP mesmo quando gerador local esquece esses campos',async()=>{
  const {api,calls}=boot();
  await api.publish(true);
  const published=calls.find(x=>x.path==='/api/v1/admin/store/catalog');
  assert.ok(published,'publicação enviada à API');
  assert.equal(published.body.produtos[0].promocao.precoPromocional,11.99);
  assert.equal(published.body.produtos[0].packVirtual.packId,'misto');
});

test('desativação explícita do Pack é publicada sem apagar o registro da regra',async()=>{
  const {db,api,calls}=boot();
  db.produtos[0].ecommerce.packVirtual={ativo:false,packId:'misto'};
  await api.publish(true);
  assert.equal(calls[0].body.produtos[0].packVirtual.ativo,false);
});

test('Preço E-commerce salvo prevalece sobre preço antigo gerado pelo catálogo',async()=>{
  const {db,api,calls}=boot();
  db.produtos[0].precoVenda=34.99;
  db.produtos[0].ecommerce.precoEcommerce=29.90;
  await api.publish(true);
  const p=calls[0].body.produtos[0];
  assert.equal(p.preco,29.90);
  assert.equal(p.precoRegular,29.90);
  assert.equal(p.precoEcommerce,29.90);
  assert.equal(p.precoERP,34.99);
  assert.equal(p.precoOrigem,'ECOMMERCE');
});

test('nova publicação usa o último Preço E-commerce salvo',async()=>{
  const {db,api,calls}=boot();
  db.produtos[0].ecommerce.precoEcommerce=29.90;
  await api.publish(true);
  db.produtos[0].ecommerce.precoEcommerce=27.90;
  await api.publish(true);
  assert.equal(calls[1].body.produtos[0].preco,27.90);
  assert.equal(calls[1].body.produtos[0].precoRegular,27.90);
  assert.equal(calls[1].body.produtos[0].promocao.precoPromocional,11.99);
});
