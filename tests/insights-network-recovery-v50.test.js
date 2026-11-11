'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const source=fs.readFileSync('central-caseirinho-insights/app.js','utf8');
const start=source.indexOf('async function api(path,options){');
const end=source.indexOf('function nav(tab){',start);
assert.ok(start>=0&&end>start);
const helpers=source.slice(start,end);
function setup(fetcher,online=true){
 const st={token:'test-session',api:'https://example.test'};
 const s=x=>String(x==null?'':x);
 const timers=(fn)=>queueMicrotask(fn);
 return new Function('fetch','st','s','navigator','setTimeout',helpers+';return {api,fetchDashboardGroups};')(
  fetcher,st,s,{onLine:online},timers);
}
const success=()=>({ok:true,status:200,json:async()=>({ok:true})});
test('GET falhado na rede tenta uma vez adicional sem alterar autenticação',async()=>{
 let attempts=0;
 const {api}=setup(async(_url,init)=>{assert.match(init.headers.Authorization,/Bearer test-session/);if(++attempts===1)throw Error('conexão falhou');return success();});
 assert.equal((await api('summary')).ok,true);
 assert.equal(attempts,2);
});
test('PATCH não é repetido automaticamente quando a rede falha',async()=>{
 let attempts=0;
 const {api}=setup(async()=>{attempts++;throw Error('resposta perdida')});
 await assert.rejects(api('catalog/product/description',{method:'PATCH',body:{description:'Teste'}}),e=>e.networkError===true);
 assert.equal(attempts,1);
});
test('GET com resposta 503 tenta novamente, mas resposta 401 não',async()=>{
 let count=0;
 const {api}=setup(async()=>++count===1?{ok:false,status:503,json:async()=>({error:'indisponível'})}:success());
 assert.equal((await api('catalog')).ok,true);assert.equal(count,2);
 let unauthorized=0;
 const denied=setup(async()=>{unauthorized++;return{ok:false,status:401,json:async()=>({error:'Sessão expirada'})};});
 await assert.rejects(denied.api('summary'),e=>e.httpStatus===401);
 assert.equal(unauthorized,1);
});
test('Atualização do painel limita consultas simultâneas a três',async()=>{
 let active=0,max=0;
 const {fetchDashboardGroups}=setup(async()=>{
  active++;max=Math.max(max,active);
  await new Promise(resolve=>setImmediate(resolve));
  active--;return success();
 });
 const responses=await fetchDashboardGroups(['summary','contacts','orders','catalog','requests','product-categories','product-drafts','merchandising','order-fulfillment']);
 assert.equal(responses.length,9);
 assert.ok(responses.every(x=>x.status==='fulfilled'));
 assert.ok(max<=3);
});
test('Painel não inventa horário de atualização quando todas as consultas falham',()=>{
 assert.match(source,/if\(loadedCore\)st\.lastUpdated=new Date\(\)/);
 assert.match(source,/st\.dataStatus=!loaded\?'offline'/);
 assert.match(source,/dados anteriores foram preservados/);
});
