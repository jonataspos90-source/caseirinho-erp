const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function harness(options={}){
 const storage=new Map(), jobs=[],timers=[],elements=new Map();let tick;
 if(options.station){storage.set('john_cloud_config_v1',JSON.stringify({apiUrl:'https://api.example',apiKey:'test-only'}));elements.set('stationSettings',{});elements.set('stationConnection',{});}
 const doc={getElementById:k=>elements.get(k),createElement:tag=>{const e={style:{},remove(){},addEventListener(){}};if(tag==='iframe'){e.contentWindow={focus(){},addEventListener(_,cb){e.done=cb},print(){jobs.push(e.srcdoc);e.done()}}}return e},body:{dataset:options.station?{printStation:'caseirinho'}:{},appendChild(e){if(e.id)elements.set(e.id,e);if(e.onload)e.onload()}}};
 const ctx={window:{},AbortController,fetch:async()=>({ok:true,json:async()=>({orders:options.remote||[]})}),document:doc,sessao:{id:'operator'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},navigator:{locks:{async request(n,opt,fn){if(ctx.locked)return fn(null);ctx.locked=true;try{return await fn({})}finally{ctx.locked=false}}}},setInterval:fn=>{tick=fn},setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout(){},Date,console};
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
test('comanda destaca origem, entrega completa e pagamento pendente sem presumir Pix pago',()=>{const h=harness();const html=h.api.receipt(order('4',{modalidade:'ENTREGA',formaPagamento:'Pix',cliente:{nome:'Maria',telefone:'11999990000'},entrega:{logradouro:'Rua Teste',numero:'42',complemento:'Casa 2',bairro:'Centro',cidade:'Ferraz',uf:'SP',cep:'08500-000',referencia:'Portão verde'}}));for(const value of ['PEDIDO DO CASEIRINHO','PENDENTE — NÃO PAGO','Maria','11999990000','Rua Teste','Casa 2','Portão verde'])assert.ok(html.includes(value),value)});
test('pago exige confirmação explícita e estorno permanece pendente',()=>{const h=harness();assert.equal(h.api.paymentLabel({formaPagamento:'Cartão de crédito'}),'PENDENTE — NÃO PAGO');assert.equal(h.api.paymentLabel({mercadoPago:{status:'APROVADO'}}),'PAGO');assert.match(h.api.paymentLabel({mercadoPago:{status:'ESTORNADO'}}),/^PENDENTE/);assert.match(h.api.paymentLabel({mercadoPago:{status:'PENDENTE'},statusPagamento:'PAGO'}),/^PENDENTE/)});
test('aviso de Pix do cliente manda conferir extrato e não marca como pago',()=>{const h=harness(),o=order('pix-report',{pagamentoPix:{status:'INFORMADO_PELO_CLIENTE'}});assert.match(h.api.paymentLabel(o),/PENDENTE.*CONFERIR EXTRATO/);const html=h.api.receipt(o);assert.match(html,/CLIENTE AVISOU QUE PAGOU PIX/);assert.match(html,/CONFERIR NO EXTRATO/)});

test('monitor consulta pedidos sem sessão do ERP e usa a mesma proteção de duplicidade',async()=>{const h=harness({station:true,remote:[order('remote')]});h.ctx.sessao=null;enable(h);await new Promise(r=>setImmediate(r));await h.tick();await h.tick();assert.equal(h.jobs.length,1);assert.ok(h.jobs[0].includes('remote'))});
test('recupera hoje em São Paulo sem testes, cancelados ou reenvio de comandas',()=>{const h=harness();const state={enabled:true,since:Date.now(),seen:{old:'anterior',sent:'encaminhado',failed:'falha'}};const rows=[order('old',{createdAt:'2026-10-23T10:00:00Z'}),order('sent',{createdAt:'2026-10-23T11:00:00Z'}),order('failed',{createdAt:'2026-10-23T11:00:00Z'}),order('test',{createdAt:'2026-10-23T11:00:00Z',cliente:{telefone:'5511989310929'}}),order('cancel',{createdAt:'2026-10-23T11:00:00Z',status:'CANCELADO'}),order('yesterday',{createdAt:'2026-10-23T01:00:00Z'})];assert.equal(h.api.recoverTodayRows(rows,state,'2026-10-23'),1);assert.deepEqual([...state.pending],['old']);assert.equal(h.api.recoverTodayRows(rows,state,'2026-10-23'),0)});
test('pedido anterior enfileirado é impresso uma única vez',async()=>{const h=harness();const o=order('old',{createdAt:'2026-10-23T10:00:00Z'});const state={enabled:true,since:Date.now(),seen:{old:'anterior'}};h.api.recoverTodayRows([o],state,'2026-10-23');h.put('caseirinho_thermal_v1',state);h.put('john_ecommerce_cloud_inbox_v1',[o]);await h.tick();await h.tick();assert.equal(h.jobs.length,1);assert.equal(h.state().pending.length,0)});
test('aviso fala Chegou um novo pedido, Caseirinho! em português',async()=>{const h=harness();const spoken=[];h.ctx.window.SpeechSynthesisUtterance=function(t){this.text=t};h.ctx.window.speechSynthesis={getVoices:()=>[],speak:u=>spoken.push(u)};await h.api.enableSound();assert.equal(spoken[0].text,'Chegou um novo pedido, Caseirinho!');assert.equal(spoken[0].lang,'pt-BR');assert.equal(spoken[0].pitch,1.35);assert.equal(spoken[0].rate,1.08);enable(h);h.put('john_ecommerce_cloud_inbox_v1',[order('sound')]);await h.tick();await h.tick();assert.equal(spoken.length,2)});

test('comanda mostra valores oficiais de cada item, descontos e total Pix sem descontar promoções duas vezes',()=>{
 const h=harness();
 const o=order('financeiro',{
  formaPagamento:'Pix pelo QR Code do CNPJ (conferência manual)',
  subtotalOriginal:55,subtotal:45,descontoPromocional:10,descontoCupom:5,valorFrete:0,total:40,
  itens:[
   {nome:'Lasanha Molho Branco',quantidade:1,precoUnitario:30,total:30,totalOriginal:35,economia:5},
   {nome:'Panqueca',quantidade:2,precoUnitario:7.5,total:15,totalOriginal:20,economia:5}
  ],
  observacao:'[DISPONIBILIDADE A CONFIRMAR — Item sem saldo registrado]\\n[PEDIDO FORA DO HORÁRIO · Primeiro atendimento amanhã.]'
 });
 const html=h.api.receipt(o);
 for(const text of ['Lasanha Molho Branco','Panqueca','Unit.:','30,00','15,00','PIX A COBRAR','69.195.483/0001-23'])assert.ok(html.includes(text),text);
 assert.match(html,/Descontos totais/);assert.match(html,/15,00/);
 assert.match(html,/PIX A COBRAR[^<]*40,00/);
 assert.doesNotMatch(html,/DISPONIBILIDADE A CONFIRMAR/);
 assert.match(html,/PEDIDO FORA DO HORÁRIO/);
});
test('sem total oficial a comanda não inventa um valor Pix nem marca pagamento como confirmado',()=>{
 const h=harness(),o=order('sem-total',{formaPagamento:'Pix',itens:[{nome:'Item sem preço',quantidade:2}]});
 const html=h.api.receipt(o);
 assert.match(html,/Conferir valor no ERP/);
 assert.match(html,/PENDENTE — NÃO PAGO/);
});
