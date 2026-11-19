/* Navegação por tarefas em telas extensas; preserva componentes e ações existentes. */
(function(){
'use strict';
const byId=id=>document.getElementById(id);
const configs=[
 {root:'products',name:'Produtos e Preços',items:[
  {key:'catalog',label:'🍝 Catálogo e preços',elements:['#products > .notice','#products > .toolbar','#draftProducts','#productsList']},
  {key:'categories',label:'🏷️ Categorias',elements:['#categoryManagerPanel']}
 ]},
 {root:'sales',name:'Vendas & Estoque',items:[
  {key:'performance',label:'📈 Indicadores de vendas',elements:['#sales > .grid.two:has(#salesTopRevenue)']},
  {key:'stock',label:'📦 Estoque mínimo e máximo',elements:['#salesStockFeatureNotice','#stockSmartSection']},
  {key:'analysis',label:'📊 Análise e curva ABC',elements:['#sales > .grid.two:has(#salesAbcSummary)','#sales > .card:not(.sales-filter-card)','#sales > .notice:last-child']}
 ]},
 {root:'receivables',name:'Conta Cliente',items:[
  {key:'debts',label:'👤 Saldos de clientes',elements:['#debtPanel']},
  {key:'convenios',label:'🧾 Convênios e duplicatas',elements:['#convenioPanel']},
  {key:'orders',label:'💳 Vendas e recebimentos',elements:['#receivables > .card:not(.debt-panel)','#receivables > .notice:last-child']}
 ]}
];
function setup(config){
 const root=byId(config.root);
 if(!root||root.querySelector('.cw-tabs'))return;
 const tabs=document.createElement('nav');tabs.className='cw-tabs';tabs.setAttribute('aria-label','Áreas de '+config.name);
 const screens=new Map(),groups=new Map();
 for(const item of config.items){
  const target=document.createElement('div');target.className='cw-screen';target.dataset.area=item.key;
  target.setAttribute('aria-label',item.label);
  root.append(target);screens.set(item.key,target);
  const button=document.createElement('button');button.type='button';button.dataset.area=item.key;
  button.className='cw-tab';button.textContent=item.label;button.setAttribute('aria-pressed','false');tabs.append(button);
 }
 for(const item of config.items){
  const target=screens.get(item.key);
  for(const selector of item.elements){
   const elements=[...root.querySelectorAll(selector)].filter(el=>el!==target&&!el.closest('.cw-screen'));
   elements.forEach(el=>target.append(el));
  }
 }
 const head=root.querySelector(':scope > .section-head');
 if(head)head.insertAdjacentElement('afterend',tabs);else root.prepend(tabs);
 function choose(key){
  if(!screens.has(key))return;
  for(const [name,element] of screens)element.hidden=name!==key;
  tabs.querySelectorAll('button').forEach(b=>{const active=b.dataset.area===key;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))});
  try{sessionStorage.setItem('caseirinho-cw-'+config.root,key)}catch(_){}
 }
 tabs.addEventListener('click',e=>{const button=e.target.closest('button[data-area]');if(button)choose(button.dataset.area)});
 let initial=config.items[0].key;
 try{const stored=sessionStorage.getItem('caseirinho-cw-'+config.root);if(screens.has(stored))initial=stored}catch(_){}
 choose(initial);
 // Ações que abrem um item específico nunca deixam o cliente em uma aba escondida.
 if(config.root==='products'){
  root.querySelector('#createProduct')?.addEventListener('click',()=>choose('catalog'));
  document.addEventListener('click',e=>{
   const button=e.target.closest('[data-view="products"]');
   if(button&&e.target.dataset.productView==='categories')choose('categories');
  });
  root.querySelector('#categoryManagerPanel')?.addEventListener('click',e=>{if(e.target.matches('#categoryRefresh'))choose('categories')});
 }
 // Gráficos e contadores permanecem na raiz, visíveis independentemente do submódulo.
}
function init(){configs.forEach(setup)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();