(function(){
'use strict';
if(window.__JOHN_CENTRAL_MODULES_8223__)return;
window.__JOHN_CENTRAL_MODULES_8223__=true;
const VERSION='8.22.3';
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
function ensureNextCss(){
 let link=document.getElementById('johnNextCss8223');
 if(!link){
  link=document.createElement('link');
  link.id='johnNextCss8223';link.rel='stylesheet';link.href='./john-next-v8-17.css?v=8223';
  document.head.appendChild(link);
 }
}
function installStyle(){
 if(document.getElementById('johnCentralOnly8223Style'))return;
 const s=document.createElement('style');
 s.id='johnCentralOnly8223Style';
 s.textContent=`
 .sidebar .john-module-group[data-module="motorcomercial"],
 .sidebar .john-module-group[data-module="centralgerencial"]{display:none!important}
 #johnNextHub .jn-module-card[data-jn-group="motorcomercial"],
 #johnNextHub .jn-module-card[data-jn-group="centralgerencial"]{display:block!important}
 body.john-next-v2 #johnNextHub{max-width:1460px;margin:0 auto 18px}
 body.john-next-v2 .jn-home-top{border:1px solid #dce5ef;border-radius:19px;background:#fff;padding:18px 20px;box-shadow:0 10px 28px rgba(26,54,86,.08)}
 body.john-next-v2 .jn-kpi-strip{display:grid;grid-template-columns:repeat(4,minmax(90px,1fr));gap:8px;margin-top:14px}
 body.john-next-v2 .jn-kpi-strip>div{border:1px solid #dce5ef;border-radius:12px;background:#f8fbff;padding:10px 11px}
 body.john-next-v2 .jn-kpi-strip span{display:block;font-size:9px;color:#71819a;text-transform:uppercase}.jn-kpi-strip b{font-size:18px}
 body.john-next-v2 .jn-module-toolbar{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:18px 2px 10px}
 body.john-next-v2 .jn-modules-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;align-items:start}
 body.john-next-v2 .jn-module-card{border:1px solid #dce5ef;border-radius:15px;background:#fff;box-shadow:0 10px 28px rgba(26,54,86,.08);overflow:hidden;min-width:0}
 body.john-next-v2 .jn-module-head{width:100%;border:0;background:transparent;padding:13px 14px;display:flex;align-items:center;gap:10px;text-align:left;color:#152238}
 body.john-next-v2 .jn-module-title{flex:1}.jn-module-title b{display:block}.jn-module-title small{display:block;color:#71819a;font-size:10px;margin-top:2px}
 body.john-next-v2 .jn-module-links{display:none;border-top:1px solid #dce5ef;padding:7px}.jn-module-card.open .jn-module-links{display:grid!important}
 body.john-next-v2 .jn-module-link{border:0;background:transparent;padding:8px 9px;border-radius:8px;text-align:left;display:flex;gap:7px;color:#152238}
 body.john-next-v2 .jn-btn{border:1px solid #dce5ef;background:#fff;border-radius:10px;padding:8px 11px;font-weight:800}
 @media(max-width:1180px){body.john-next-v2 .jn-modules-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:820px){body.john-next-v2 .main{padding:72px 12px 24px!important}body.john-next-v2 .jn-modules-grid{grid-template-columns:1fr!important}body.john-next-v2 .jn-kpi-strip{grid-template-columns:repeat(2,1fr)!important}body.john-next-v2 .jn-home-top{padding:16px!important}body.john-next-v2 .jn-home-top h2{font-size:25px!important}body.john-next-v2 .jn-module-toolbar{align-items:flex-end!important}}
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
 document.documentElement.dataset.johnNext='8223';
 document.title='John Sistema ERP · V8.22.3';
 const a=document.getElementById('jnActiveArea');
 if(a)a.textContent=S(a.textContent).replace(/\b8\.(?:18\.0|21\.1|22\.0|22\.1|22\.2)\b/g,VERSION);
}
function refreshHub(){try{window.johnNext?.renderHub?.()}catch(_){}patchVersion()}
function install(){
 ensureNextCss();installStyle();
 makeGroup('motorcomercial','🚀','Motor Comercial',motor,t=>window.JohnCommerce822?.open?.(t));
 makeGroup('centralgerencial','📊','Central Gerencial',gerencial,t=>window.JohnManagement822?.open?.(t));
 refreshHub();
}
[0,120,350,750,1400,2600,4500,7000].forEach(ms=>setTimeout(install,ms));
window.addEventListener('john:session-ready',()=>setTimeout(install,60));
window.addEventListener('john:cloud-applied',()=>setTimeout(install,80));
document.addEventListener('click',e=>{if(e.target.closest?.('#johnNextHub,.nav,.jn-side-home,#jnHomeBtn'))setTimeout(install,60)},true);
window.JohnCentralModules8223={install,refreshHub,version:VERSION};
})();
