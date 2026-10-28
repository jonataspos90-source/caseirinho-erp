'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const canonical=html.slice(html.indexOf('async function canonicalPublish('),html.indexOf('\nasync function publishImages()',html.indexOf('async function canonicalPublish(')));
test('rotina lexical usada pelo botão das grades usa o coordenador atual',async()=>{
 let calls=0;
 const window={JohnCatalogCategoryGradeSync82231:{publish:async silent=>{calls++;assert.equal(silent,false);return {ok:true}}}};
 const publish=vm.runInNewContext(canonical+';canonicalPublish',{window});
 assert.equal((await publish(false)).ok,true);
 assert.equal(calls,1);
});
test('grades usam entrada direta quando coordenador ainda não carregou',async()=>{
 const window={JohnCaseirinhoCatalogSync821:{publishDirect:async()=>({ok:true})},publicarCatalogoEcommerce(){throw Error('alias legado');}};
 const publish=vm.runInNewContext(canonical+';canonicalPublish',{window});
 assert.equal((await publish(true)).ok,true);
});
test('PUT inclui grade e rótulo atualizados usando applyGrades real',async()=>{
 const calls=[];
 const grade={id:'g1',nome:'Torta',tipoOpcao:'PESO',produtoCapaId:'p1',variantes:[{produtoId:'p1',rotulo:'700 gr',ordem:1}]};
 const window={db:{produtos:[{id:'p1',codigo:'T01',nome:'Torta',ecommerce:{publicar:true}}]},addEventListener(){},dispatchEvent(){},__johnPublicarEcomLocal:()=>({loja:{},produtos:[{id:'p1',codigo:'T01'}]})};
 const context=vm.createContext({window,localStorage:{getItem(){return null},setItem(){}},document:{readyState:'loading',addEventListener(){}},setTimeout(){},clearTimeout(){},console,CustomEvent:class{},URL,encodeURIComponent,adminFetch:async(p,o)=>{calls.push(JSON.parse(o.body));return {total:1}}});
 const helpers=['gradeOptionDefaults','gradeOptionMeta','applyGrades'].map(name=>html.split('\n').find(l=>l.startsWith('function '+name+'('))).join('\n');
 const apply=vm.runInNewContext("const S=v=>String(v??''), A=v=>Array.isArray(v)?v:[], N=v=>Number(v)||0;const grades=()=>[grade];"+helpers+';applyGrades',{grade});
 window.JohnV880={applyGrades:apply};
 vm.runInContext(fs.readFileSync(path.join(root,'caseirinho-commerce-sync-v8-21.js'),'utf8'),context);
 await window.JohnCaseirinhoCatalogSync821.publishDirect(true);
 assert.equal(calls.length,1);
 assert.equal(calls[0].loja.grades[0].nome,'Torta');
 assert.equal(calls[0].produtos[0].variacaoLabel,'700 gr');
 grade.variantes[0].rotulo='800 gr';
 await window.JohnCaseirinhoCatalogSync821.publishDirect(true);
 assert.equal(calls[1].produtos[0].variacaoLabel,'800 gr');
 assert.equal(calls[1].produtos[0].gradeProdutoCapaId,'p1');
});
