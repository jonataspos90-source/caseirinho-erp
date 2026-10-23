const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness(){
 const storage=new Map(), jobs=[],timers=[],elements=new Map();let tick;
 const doc={getElementById:k=>elements.get(k),createElement:tag=>{const e={style:{},remove(){},addEventListener(){}};if(tag==='iframe'){e.contentWindow={focus(){},addEventListener(_,cb){e.done=cb},print(){jobs.push(e.srcdoc);e.done()}}}return e},body:{appendChild(e){if(e.id)elements.set(e.id,e);if(e.onload)e.onload()}}};
 const ctx={window:{},document:doc,sessao:{id:'operator'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},navigator:{locks:{async request(n,opt,fn){if(ctx.locked)return fn(null);ctx.locked=true;try{return await fn({})}finally{ctx.locked=false}}}},setInterval:fn=>{tick=fn},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},Date,console};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../thermal-orders.js','utf8'),ctx);
 const put=(k,v)=>storage.set(k,JSON.stringify(v));
 return{ctx,jobs,put,tick:async()=>{tick();await new Promise(r=>setImmediate(r))},state:()=>JSON.parse(storage.get('caseirinho_thermal_v1')),api:ctx.window.CaseirinhoThermal};
}
const order=(id,extra={})=>({id,createdAt:new Date().toISOString(),status:'NOVO',itens:[{nome:'Nhoque',quantidade:2}],...extra});
function enable(h){h.put('caseirinho_thermal_v1',{enabled:true,since:Date.now()-1000,seen:{}})}
test('encaminha uma vez mesmo após repetidas consultas',async()=>{const h=harness();enable(h);h.put('john_ecommerce_cloud_inbox_v1',[order('1')]);await h.tick();await h.tick();assert.equal(h.jobs.length,1);assert.equal(h.state().seen['1'],'encaminhado')});
test('não imprime históricos, cancelados ou fora da sessão',async()=>{const h=harness();enable(h);h.put('john_ecommerce_cloud_inbox_v1',[order('old',{createdAt:'2020-01-01'}),order('cancel',{status:'CANCELADO'})]);await h.tick();assert.equal(h.jobs.length,0);h.put('john_ecommerce_cloud_inbox_v1',[order('new')]);h.ctx.sessao=null;await h.tick();assert.equal(h.jobs.length,0)});
test('fila encaminha pedidos distintos em ordem',async()=>{const h=harness();enable(h);h.put('john_ecommerce_cloud_inbox_v1',[order('1'),order('2')]);await h.tick();await h.tick();await h.tick();assert.equal(h.jobs.length,2)});
test('conteúdo recebido é escapado e pedido de Jonatas recebe TESTE',()=>{const h=harness();const html=h.api.receipt(order('3',{cliente:{nome:'<script>alert(1)</script>',telefone:'11989310929'}}));assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(html.includes('*** TESTE ***'));assert.ok(html.includes('80mm'))});
test('registro de envio sobrevive ao recarregamento',async()=>{const h=harness();enable(h);h.put('john_ecommerce_cloud_inbox_v1',[order('1')]);await h.tick();const h2=harness();h2.put('caseirinho_thermal_v1',h.state());h2.put('john_ecommerce_cloud_inbox_v1',[order('1')]);await h2.tick();assert.equal(h2.jobs.length,0)});
