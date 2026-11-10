'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const read=x=>fs.readFileSync('central-caseirinho-insights/'+x,'utf8');

function setup(product){
 const root={innerHTML:''},message={textContent:'',hidden:true,className:''};
 const doc={
  readyState:'loading',addEventListener(){},querySelectorAll(){return[]},
  getElementById:id=>id==='stockLevelsPanel'?root:id==='stockResult'?message:null
 };
 const report={window42:{from:'2026-09-29',to:'2026-11-09'},period:{from:'2026-10-01',to:'2026-11-09'},products:[product]};
 let patched=null,refreshes=0,productRefreshes=0;
 const fakeWindow={confirm:()=>true,CaseirinhoInsightsStockBridge:{
  report:()=>report,
  api:async(path,opts)=>{assert.equal(path,'product-sales-abc/stock-levels');patched=opts.body;return{ok:true}},
  refresh:async()=>{refreshes++;if(patched){report.products[0].stockMinimum=patched.items[0].minimum;report.products[0].stockMaximum=patched.items[0].maximum}},
  refreshCatalog:async()=>{productRefreshes++}
 }};
 const ctx={window:fakeWindow,document:doc,console,Number,String,Array,Math,Set,Map,Date,Intl};
 vm.runInNewContext(read('sales-stock-levels.js'),ctx);
 return{mod:fakeWindow.CaseirinhoSalesStockLevels,root,message,report,got:()=>({patched,refreshes,productRefreshes})};
}
const product={
 name:'Panqueca Frango',code:'000087',unit:'UN',productId:'prd123',stockProductId:'prd123',
 stockUpdatedAt:'2026-11-09T00:00:00.000Z',
 quantity42d:12,quantity:12,revenue:143.88,abc:'A',category:'Massas',
 stockMinimum:0,stockMaximum:0,stockAvailable:1
};

test('Central própria inclui ranking e estoque, sem abrir tela do ERP principal',()=>{
 const html=read('index.html'),app=read('app.js'),sw=read('sw.js');
 assert.match(html,/id="stockLevelsPanel"/);
 assert.match(html,/data-view="sales">📈 Vendas & Estoque/);
 assert.match(html,/sales-stock-levels\.js\?v=/);
 assert.match(app,/CaseirinhoInsightsStockBridge/);
 assert.match(app,/caseirinho:sales-updated/);
 assert.match(sw,/sales-stock-levels\.js\?v=/);
 assert.ok(sw.includes('caseirinho-insights-app-shell-v47-descriptions-20261110'));
 assert.match(html,/conta-cliente-recebimentos\.js\?v=/);
 assert.match(html,/id="openSalesStockFromDashboard"/);
 assert.match(html,/id="salesStockTopLink"/);
 assert.ok(html.indexOf('id="stockSmartSection"')<html.indexOf('id="salesTopRevenue"'));
 assert.match(app,/O módulo de estoque não foi carregado/);
});
test('Recomendação por 42 dias respeita unidade inteira, decimal e zero vendas',()=>{
 const {mod}=setup(product);
 const a=mod.recommendation({unit:'UN',quantity42d:12});
 assert.equal(a.minimum,2);
 assert.equal(a.maximum,4);
 const b=mod.recommendation({unit:'KG',quantity42d:0.5});
 assert.equal(b.minimum,0.048);
 assert.equal(b.maximum,0.131);
 assert.equal(mod.recommendation({unit:'UN',quantity42d:0}),null);
});
test('Aplicação altera apenas mínimo/máximo, valida pela releitura e atualiza cadastro',async()=>{
 const app=setup({...product});
 await app.mod.apply(['prd123']);
 const {patched,refreshes,productRefreshes}=app.got();
 assert.equal(patched.items.length,1);
 assert.deepEqual(Object.keys(patched.items[0]).sort(),['expectedUpdatedAt','maximum','minimum','productId']);
 assert.equal(patched.items[0].minimum,2);
 assert.equal(patched.items[0].maximum,4);
 assert.equal(refreshes,1);
 assert.equal(productRefreshes,1);
 assert.match(app.message.textContent,/conferido\(s\) diretamente no ERP/);
});
test('Produto sem vendas no horizonte não permite aplicação automática',async()=>{
 const app=setup({...product,quantity42d:0});
 await app.mod.apply(['prd123']);
 assert.equal(app.got().patched,null);
 assert.match(app.message.textContent,/desatualizado/);
});
