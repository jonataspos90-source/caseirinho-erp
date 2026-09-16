(function(){
'use strict';
if(window.__JOHN_CENTRAL_MODULES_8222__)return;
window.__JOHN_CENTRAL_MODULES_8222__=true;
const VERSION='8.22.2';
const S=v=>String(v??'');
const motor=[
 ['dash','📈 Visão Geral','produtos'],['offers','🎯 Upsell / Cross-sell','produtos'],['combos','🧺 Combos Inteligentes','produtos'],['coupons','🏷️ Cupons','produtos'],['loyalty','⭐ Fidelidade','produtos'],['capacity','🏭 Capacidade','produtos'],['abandoned','🛒 Carrinhos Abandonados','produtos'],['relationship','❤️ Relacionamento','produtos'],['ratings','⭐ Avaliações','produtos']
];
const gerencial=[
 ['cockpit','🎛️ Cockpit do Gestor','dashboard'],['pricing','💲 Pricing Multicanal','pricing'],['fees','🛵 iFood / 99 / Taxas','pricing'],['alerts','🚨 Alertas e Exceções','dashboard'],['pcp','🏭 PCP + Compras Inteligentes','fichas'],['finance','💰 Financeiro Gerencial','dashboard'],['approval','✅ Aprovações','config'],['automation','⚙️ Automações','config'],['quality','📦 Lotes / FEFO / Perdas','estoque'],['ops','🧰 Tarefas / Manutenção','config'],['assistant','🤖 Pergunte ao John','dashboard'],['health','🩺 Saúde / Auditoria','config']
];
function allowed(perm){
 try{if(typeof window.permissao==='function'&&typeof window.usuarioAtual==='function'&&window.usuarioAtual())return !!window.permissao(perm,'ver')}catch(_){}
 return true;
}
function installStyle(){
 if(document.getElementById('johnCentralOnly8222Style'))return;
 const s=document.createElement('style');
 s.id='johnCentralOnly8222Style';
 s.textContent=`
 .sidebar .john-module-group[data-module="motorcomercial"],
 .sidebar .john-module-group[data-module="centralgerencial"]{display:none!important}
 #johnNextHub .jn-module-card[data-jn-group="motorcomercial"],
 #johnNextHub .jn-module-card[data-jn-group="centralgerencial"]{display:block!important}
 `;
 document.head.appendChild(s);
}
function makeGroup(id,icon,name,defs,open){
 const nav=document.querySelector('.nav');
 if(!nav)return false;
 let g=nav.querySelector(`.john-module-group[data-module="${id}"]`);
 if(!g){
  g=document.createElement('div');g.className='john-module-group';g.dataset.module=id;
  const h=document.createElement('button');h.type='button';h.className='john-module-toggle';h.innerHTML=`<span class="john-module-icon">${icon}</span><span class="john-module-name">${name}</span><span class="john-module-chevron">▶</span>`;
  const items=document.createElement('div');items.className='john-module-items';
  h.onclick=()=>{const yes=!g.classList.contains('open');document.querySelectorAll('.john-module-group').forEach(x=>x.classList.remove('open'));if(yes)g.classList.add('open')};
  g.append(h,items);
  const cfg=nav.querySelector('.john-module-group[data-module="config"]');cfg?nav.insertBefore(g,cfg):nav.appendChild(g);
 }
 const items=g.querySelector('.john-module-items');
 defs.forEach(([tab,label,perm])=>{
  if(!allowed(perm))return;
  const special=(id==='motorcomercial'?'commerce_':'management_')+tab;
  let b=items.querySelector(`[data-special="${special}"]`);
  if(!b){b=document.createElement('button');b.type='button';b.className='john-special-nav';b.dataset.special=special;b.dataset.permissionPage=perm;items.appendChild(b)}
  b.textContent=label;b.onclick=()=>open(tab);b.style.display='block';
 });
 return true;
}
function patchVersion(){
 window.JOHN_ERP_VERSION=VERSION;
 document.documentElement.dataset.johnNext='8222';
 document.title='John Sistema ERP · V8.22.2';
 const a=document.getElementById('jnActiveArea');
 if(a)a.textContent=S(a.textContent).replace(/\b8\.(?:18\.0|21\.1|22\.0|22\.1)\b/g,VERSION);
}
function refreshHub(){
 try{window.johnNext?.renderHub?.()}catch(_){}
 patchVersion();
}
function install(){
 installStyle();
 makeGroup('motorcomercial','🚀','Motor Comercial',motor,t=>window.JohnCommerce822?.open?.(t));
 makeGroup('centralgerencial','📊','Central Gerencial',gerencial,t=>window.JohnManagement822?.open?.(t));
 refreshHub();
}
[150,450,900,1600,2800,4500,7000].forEach(ms=>setTimeout(install,ms));
window.addEventListener('john:session-ready',()=>setTimeout(install,80));
window.addEventListener('john:cloud-applied',()=>setTimeout(install,120));
document.addEventListener('click',e=>{if(e.target.closest?.('#johnNextHub,.nav,.jn-side-home,#jnHomeBtn'))setTimeout(install,80)},true);
window.JohnCentralModules8222={install,refreshHub,version:VERSION};
})();
