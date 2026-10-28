'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','caseirinho-encomendas-v8-22-70.js'),'utf8').replace('={openAvailability,openOrders,loadOrders};','={openAvailability,openOrders,loadOrders,filteredOrders,managedOrders,orderStatusLabel,ensureOrdersNavigation};');
function load(document={readyState:'loading',addEventListener(){}}){const window={addEventListener(){}};vm.runInNewContext(source,{window,document,setTimeout(){},console});return window.CaseirinhoEncomendas82270}
const order=(id,status='PENDENTE',extra={})=>({id,codigo:'WEB-'+id,cliente:{nome:'João Garcia',telefone:'(11) 99999-0000'},status:'NOVO',itens:[{produtoId:'massa',disponibilidade:'SOB_ENCOMENDA'}],encomendaConfirmacao:{status},...extra});
test('default view shows pending analysis and confirmed orders remain available in their filter',()=>{
 const m=load(),list=[order('1'),order('2','CONFIRMADO'),order('3','AGUARDANDO_CONTATO')];assert.deepEqual(Array.from(m.filteredOrders(list),o=>o.id),['1']);assert.deepEqual(Array.from(m.filteredOrders(list,'CONFIRMADO'),o=>o.id),['2']);assert.equal(m.filteredOrders(list,'TODOS').length,3);
});
test('search matches accents, order number and formatted WhatsApp',()=>{
 const m=load(),list=[order('123')];assert.equal(m.filteredOrders(list,'TODOS','joao').length,1);assert.equal(m.filteredOrders(list,'TODOS','WEB-123').length,1);assert.equal(m.filteredOrders(list,'TODOS','11999990000').length,1);assert.equal(m.filteredOrders(list,'TODOS','inexistente').length,0);
});
test('finished orders and orders without availability items are excluded from operational control',()=>{
 const m=load(),list=[order('1'),order('2','PENDENTE',{status:'CANCELADO'}),order('3','PENDENTE',{status:'FINALIZADO'}),order('4','PENDENTE',{itens:[],encomendaConfirmacao:null})];assert.deepEqual(Array.from(m.managedOrders(list),o=>o.id),['1']);
});
test('updated confirmation has the correct display label',()=>{
 const m=load(),o=order('1');assert.equal(m.orderStatusLabel(o),'Aguardando análise');o.encomendaConfirmacao.status='CONFIRMADO';assert.equal(m.orderStatusLabel(o),'Confirmada');
});
function navigation(existing=false){
 const received={dataset:{page:'ecommercePedidosRecebidos'}},other={dataset:{page:'ecommerceCategorias'}};
 const nav={children:[received,other],querySelector:()=>received,appendChild(b){this.children.push(b);b.parentElement=this}};
 received.parentElement=nav;other.parentElement=nav;Object.defineProperty(received,'nextElementSibling',{get:()=>nav.children[nav.children.indexOf(received)+1]});
 const old=existing?{id:'ceOrdersNav82270',dataset:{page:'ceOrdersPage82270'},textContent:'🕘 Encomendas para confirmar',parentElement:{}}:null;
 received.insertAdjacentElement=(position,b)=>{const i=nav.children.indexOf(b);if(i>=0)nav.children.splice(i,1);nav.children.splice(1,0,b);b.parentElement=nav};
 const document={readyState:'loading',addEventListener(){},getElementById:id=>nav.children.find(b=>b.id===id)||(old?.id===id?old:null),querySelector:selector=>selector.includes('data-module="ecommerce"')?nav:null,createElement:()=>({dataset:{}})};
 return {api:load(document),nav};
}
test('submodule appears once immediately after received orders inside Ecommerce',()=>{
 const h=navigation();h.api.ensureOrdersNavigation();h.api.ensureOrdersNavigation();assert.equal(h.nav.children.length,3);const b=h.nav.children[1];assert.equal(b.textContent,'📦 Encomendas e Disponibilidade');assert.equal(b.dataset.page,'ceOrdersPage82270');assert.equal(typeof b.onclick,'function');
});
test('existing misplaced menu entry moves to Ecommerce instead of creating a duplicate',()=>{
 const h=navigation(true);h.api.ensureOrdersNavigation();assert.equal(h.nav.children.length,3);assert.equal(h.nav.children[1].id,'ceOrdersNav82270');assert.equal(h.nav.children[1].parentElement,h.nav);
});
