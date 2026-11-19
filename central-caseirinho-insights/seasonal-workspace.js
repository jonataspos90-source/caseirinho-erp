/* Encomendas Sazonais: navegação limpa por áreas sem recriar cadastros ou handlers. */
(function(){
'use strict';
const id=x=>document.getElementById(x);
function setup(){
 const root=id('sazonais'),campaigns=id('seasonCampaignsPanel'),orders=id('seasonOrdersPanel');
 if(!root||!campaigns||!orders||id('seasonWorkspaceNav'))return;
 const card=campaigns.querySelector(':scope > article.card'),cards=id('seasonCampaignCards');
 const merch=id('seasonMerchPanel'),bulk=id('seasonBulkPanel'),exclusive=id('seasonExclusivePanel');
 const productList=id('seasonProductList'),save=id('seasonSave');
 if(!card||!merch||!bulk||!exclusive||!productList||!save||!cards)return;
 const start=Array.from(card.children).find(e=>e.tagName==='H3'&&e.textContent.includes('Produtos já cadastrados'));
 if(!start)return;
 const productNodes=[];
 for(let el=start;el&&el!==merch;el=el.nextElementSibling)productNodes.push(el);
 const panels={};
 const make=(name,header,description)=>{
  const section=document.createElement('section');section.className='season-workspace-panel';section.dataset.workspacePanel=name;
  section.setAttribute('aria-label',header);
  const head=document.createElement('div');head.className='season-workspace-head';
  const h=document.createElement('h3');h.textContent=header;
  const p=document.createElement('p');p.textContent=description;
  head.append(h,p);section.append(head);campaigns.append(section);panels[name]=section;
  return section;
 };
 const products=make('products','📦 Produtos do ERP','Selecione os produtos já cadastrados que participarão da campanha, sem criar cópias.');
 productNodes.forEach(el=>products.append(el));
 const exclusives=make('exclusives','🍝 Produtos exclusivos','Cadastre e edite produtos específicos das encomendas e acompanhe seus rascunhos.');
 exclusives.append(exclusive);
 const merchandising=make('merch','🏷️ Categorias, grades e packs','Organize categorias, sabores, tamanhos e packs especiais da campanha.');
 merchandising.append(merch);
 const publishing=make('publishing','🚀 Publicação na loja','Controle importação, pendências e publicação sem misturar com o cadastro.');
 publishing.append(bulk);
 card.classList.add('season-workspace-campaign');
 const header=document.createElement('div');header.className='season-workspace-head';
 header.innerHTML='<h3>📅 Cadastro e configuração da campanha</h3><p>Defina período, datas de entrega, fotos, regras e disponibilidade. Os produtos e os packs ficam em áreas próprias.</p>';
 card.prepend(header);
 const nav=document.createElement('nav');nav.id='seasonWorkspaceNav';nav.className='season-workspace-nav';nav.setAttribute('aria-label','Submódulos de encomendas');
 const tabs=[
  ['campaigns','📅 Campanhas'],['products','📦 Produtos ERP'],['exclusives','🍝 Exclusivos'],
  ['merch','🏷️ Categorias e packs'],['publishing','🚀 Publicação'],['orders','🧾 Pedidos e sinais'],['production','👩‍🍳 Produção']
 ];
 tabs.forEach(([key,label])=>{
  const b=document.createElement('button');b.type='button';b.className='season-workspace-tab';b.dataset.workspace=key;b.textContent=label;
  b.setAttribute('aria-pressed','false');nav.append(b);
 });
 const oldTabs=root.querySelector('.merch-tabs:has([data-season-admin-tab])');
 if(oldTabs){oldTabs.style.display='none';oldTabs.parentNode.insertBefore(nav,oldTabs)}
 else root.insertBefore(nav,campaigns);
 const originalCampaign=root.querySelector('[data-season-admin-tab="campaigns"]');
 const originalOrders=root.querySelector('[data-season-admin-tab="orders"]');
 function switchTo(key){
  const isOrders=key==='orders'||key==='production';
  (isOrders?originalOrders:originalCampaign)?.click();
  card.style.display=key==='campaigns'?'':'none';
  cards.style.display=key==='campaigns'?'':'none';
  Object.entries(panels).forEach(([name,p])=>{p.style.display=name===key?'':'none'});
  Array.from(orders.children).forEach(child=>{
   const isReport=child.id==='productionReport';
   child.style.display=key==='production'?(isReport?'':'none'):(isReport?'none':'');
  });
  if(key==='production'&&!id('productionReport')){
   const note=document.createElement('p');note.id='seasonProductionLoading';note.className='notice';
   note.textContent='Relatório de produção indisponível nesta versão. Atualize a Central para carregar o módulo.';
   orders.append(note);
  }else{
   const note=id('seasonProductionLoading');if(note)note.remove();
  }
  nav.querySelectorAll('button').forEach(b=>{
   const active=b.dataset.workspace===key;
   b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));
  });
  try{sessionStorage.setItem('caseirinho-season-workspace',key)}catch(_){}
 }
 nav.addEventListener('click',e=>{
  const button=e.target.closest('button[data-workspace]');
  if(!button)return;
  switchTo(button.dataset.workspace);
 });
 document.querySelectorAll('[data-view="sazonais"]').forEach(button=>button.addEventListener('click',()=>{
  // Acessar pelo menu lateral preserva o submódulo ativo, sem duplicar informações.
  const selected=nav.querySelector('.active')?.dataset.workspace||'campaigns';
  switchTo(selected);
 }));
 let initial='campaigns';
 try{const stored=sessionStorage.getItem('caseirinho-season-workspace');if(tabs.some(([key])=>key===stored))initial=stored}catch(_){}
 switchTo(initial);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();