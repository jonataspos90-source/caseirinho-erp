'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');

function boot(fetch){
 const source=fs.readFileSync(path.join(__dirname,'../catalog-publish-fix-v8-22-8.js'),'utf8');
 const window={addEventListener(){}};
 const localStorage={getItem:k=>k==='john_cloud_config_v1'?JSON.stringify({
  apiUrl:'https://john-cloud-api-production.up.railway.app',
  apiKey:'test-only-key',
  storeSlug:'caseirinho'
 }):null};
 const sandbox={window,localStorage,fetch,AbortController,setTimeout:()=>1,clearTimeout:()=>{},console};
 vm.runInNewContext(source,sandbox);
 return window;
}
test('falha de conexão ao publicar catálogo explica pendência sem alegar sucesso',async()=>{
 const window=boot(async()=>{throw new TypeError('Failed to fetch')});
 await assert.rejects(
  window.adminFetch('/api/v1/admin/store/catalog',{method:'PUT',body:'{}'}),
  /produto foi salvo no ERP, mas a publicação não foi confirmada/
 );
});
test('falha de upload de imagens é identificada separadamente',async()=>{
 const window=boot(async()=>{throw new TypeError('Failed to fetch')});
 await assert.rejects(
  window.adminFetch('/api/v1/admin/store/media',{method:'POST',body:'{}'}),
  /envio de imagem/
 );
});
test('resposta positiva confirmada continua retornando dados da API',async()=>{
 const window=boot(async()=>({ok:true,json:async()=>({ok:true,total:2})}));
 const data=await window.adminFetch('/api/v1/admin/store/catalog',{method:'PUT',body:'{}'});
 assert.equal(data.total,2);
});
test('requisições idênticas de PUT simultâneas não disparam publicação duplicada',async()=>{
 let calls=0;let release;
 const gate=new Promise(resolve=>release=resolve);
 const window=boot(async()=>{calls++;await gate;return{ok:true,json:async()=>({ok:true})}});
 const first=window.adminFetch('/api/v1/admin/store/catalog',{method:'PUT',body:'{}'});
 const second=window.adminFetch('/api/v1/admin/store/catalog',{method:'PUT',body:'{}'});
 release();
 await Promise.all([first,second]);
 assert.equal(calls,1);
});
test('PWA atualiza assets da comunicação com API sem trocar conteúdo do cadastro',()=>{
 const worker=fs.readFileSync(path.join(__dirname,'../service-worker.js'),'utf8');
 assert.match(worker,/v8\.22\.66-catalog-network-diagnostics/);
 assert.match(worker,/catalog-publish-fix-v8-22-8\.js\?v=82266/);
});
