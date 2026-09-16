(function(){
'use strict';
if(window.__JOHN_CENTRAL_MODULES_8221__)return;window.__JOHN_CENTRAL_MODULES_8221__=true;
const VERSION='8.22.1';
const S=v=>String(v??'');
const motor=[
 ['dash','📈 Visão Geral','produtos'],['offers','🎯 Upsell / Cross-sell','produtos'],['combos','🧺 Combos Inteligentes','produtos'],['coupons','🏷️ Cupons','produtos'],['loyalty','⭐ Fidelidade','produtos'],['capacity','🏭 Capacidade','produtos'],['abandoned','🛒 Carrinhos Abandonados','produtos'],['relationship','❤️ Relacionamento','produtos'],['ratings','⭐ Avaliações','produtos']
];
const gerencial=[
 ['cockpit','🎛️ Cockpit do Gestor','dashboard'],['pricing','💲 Pricing Multicanal','pricing'],['fees','🛵 iFood / 99 / Taxas','pricing'],['alerts','🚨 Alertas e Exceções','dashboard'],['pcp','🏭 PCP + Compras Inteligentes','fichas'],['finance','💰 Financeiro Gerencial','dashboard'],['approval','✅ Aprovações','config'],['automation','⚙️ Automações','config'],['quality','📦 Lotes / FEFO / Perdas','estoque'],['ops','🧰 Tarefas / Manutenção','config'],['assistant','🤖 Pergunte ao John','dashboard'],['health','🩺 Saúde / Auditoria','config']
];
function allowed(perm){try{if(typeof window.permissao==='function'&&typeof window.usuarioAtual==='function'&&window.usuarioAtual())return !!window.permissao(perm,'ver')}catch(_){}return true}
function makeGroup(id,icon,name,defs,open){
 const nav=document.querySelector('.nav');if(!nav||nav.querySelector(`.john-module-group[data-module="${id}"]`))return false;
 const g=document.createElement('div');g.className='john-module-group';g.dataset.module=id;
 const h=document.createElement('button');h.type='button';h.className='john-module-toggle';h.innerHTML=`<span class="john-module-icon">${icon}</span><span class="john-module-name">${name}</span><span class="john-module-chevron">▶</span>`;
 const items=document.createElement('div');items.className='john-module-items';
 h.onclick=()=>{const yes=!g.classList.contains('open');document.querySelectorAll('.john-module-group').forEach(x=>x.classList.remove('open'));if(yes)g.classList.add('open')};
 defs.forEach(([tab,label,perm])=>{if(!allowed(perm))return;const b=document.createElement('button');b.type='button';b.className='john-special-nav';b.dataset.special=(id==='motorcomercial'?'commerce_':'management_')+tab;b.dataset.permissionPage=perm;b.textContent=label;b.onclick=()=>open(tab);items.appendChild(b)});
 if(!items.children.length)return false;g.append(h,items);const cfg=nav.querySelector('.john-module-group[data-module="config"]');cfg?nav.insertBefore(g,cfg):nav.appendChild(g);return true;
}
function patchVersion(){window.JOHN_ERP_VERSION=VERSION;document.documentElement.dataset.johnNext='8221';const a=document.getElementById('jnActiveArea');if(a)a.textContent=S(a.textContent).replace(/\b8\.18\.0\b|\b8\.21\.1\b|\b8\.22\.0\b/g,VERSION)}
function refreshHub(){try{window.johnNext?.renderHub?.()}catch(_){}patchVersion()}
function install(){
 const a=makeGroup('motorcomercial','🚀','Motor Comercial',motor,t=>window.JohnCommerce822?.open?.(t));
 const b=makeGroup('centralgerencial','📊','Central Gerencial',gerencial,t=>window.JohnManagement822?.open?.(t));
 if(a||b)refreshHub();else patchVersion();
}
[300,900,1800,3200,5000,7500].forEach(ms=>setTimeout(install,ms));
window.addEventListener('john:session-ready',()=>setTimeout(install,150));
window.addEventListener('john:cloud-applied',()=>setTimeout(install,200));
document.addEventListener('click',e=>{if(e.target.closest?.('#johnNextHub,.nav,.jn-side-home'))setTimeout(()=>{install();refreshHub()},120)},true);
window.JohnCentralModules8221={install,version:VERSION};
})();