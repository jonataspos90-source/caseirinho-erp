'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
function boot(config={apiKey:'test-only'},status=200){
 const calls=[];
 const values=new Map([['john_cloud_config_v1',JSON.stringify({apiUrl:'https://api.example.test',...config})]]);
 const window={addEventListener(){},dispatchEvent(){},db:{produtos:[]},__johnPublicarEcomLocal:()=>({loja:{},produtos:[]})};
 const context=vm.createContext({window,document:{readyState:'loading',addEventListener(){}},localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},setTimeout(){},clearTimeout(){},AbortController,CustomEvent:class{},console,URL,encodeURIComponent,fetch:async(url,opt)=>{calls.push({url,opt});return{ok:status===200,status,json:async()=>status===200?{total:0}:{error:'Token expirado'}}}});
 for(const p of ['catalog-publish-fix-v8-22-8.js','caseirinho-commerce-sync-v8-21.js'])vm.runInContext(fs.readFileSync(path.join(root,p),'utf8'),context);
 return {window,calls};
}
test('publicação autentica usando window.adminFetch sem variável global nem service worker',async()=>{
 const {window,calls}=boot();
 await window.JohnCaseirinhoCatalogSync821.publishDirect(true);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://api.example.test/api/v1/admin/store/catalog');
 assert.equal(calls[0].opt.headers.Authorization,'Bearer test-only');
});
test('configuração legada token autentica pela mesma ponte',async()=>{
 const {window,calls}=boot({token:'test-legacy'});
 await window.JohnCaseirinhoCatalogSync821.publishDirect(true);
 assert.equal(calls[0].opt.headers.Authorization,'Bearer test-legacy');
});
test('rejeição de autenticação da API é preservada e não publica sem credencial',async()=>{
 const {window,calls}=boot({apiKey:'test-only'},401);
 await assert.rejects(window.JohnCaseirinhoCatalogSync821.publishDirect(true),/Token expirado/);
 assert.equal(calls.length,1);
});
test('credencial ausente bloqueia antes do envio',async()=>{
 const {window,calls}=boot({});
 await assert.rejects(window.JohnCaseirinhoCatalogSync821.publishDirect(true),/Sessão da API não disponível/);
 assert.equal(calls.length,0);
});
test('HTML raiz carrega a ponte antes do publicador mesmo na primeira visita',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const bridge=html.indexOf('<script src="./catalog-publish-fix-v8-22-8.js?v=82283"');
 const publisher=html.indexOf('<script src="./caseirinho-commerce-sync-v8-21.js?v=82283"');
 assert.ok(bridge>0&&publisher>bridge);
});
