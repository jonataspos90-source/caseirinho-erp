(function(){
'use strict';
if(window.__JOHN_NEXT_818__)return;window.__JOHN_NEXT_818__=true;
const VERSION='8.18.0';
const USAGE_KEY='john_next_usage_v818';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const E=id=>document.getElementById(id);
const esc=s=>S(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store=()=>{try{return window.__johnLocalStorage||window.localStorage}catch(_){return window.localStorage}};
function dbRef(){try{return window.db||(typeof db!=='undefined'?db:null)||JSON.parse(store().getItem('pcp_app_v1')||'{}')}catch(_){return {}}}
function textOnly(v){return S(v).replace(/^\s*[\u{1F000}-\u{1FAFF}\u2600-\u27BF]+\s*/u,'').trim()}
function iconOf(v){const m=S(v).match(/^\s*([\u{1F000}-\u{1FAFF}\u2600-\u27BF]+)/u);return m?.[1]||'◆'}
function setVersion(){window.JOHN_ERP_VERSION=VERSION;document.documentElement.dataset.johnNext='8180'}
function getUsage(){try{return JSON.parse(store().getItem(USAGE_KEY)||'{}')||{}}catch(_){return {}}}
function saveUsage(u){try{store().setItem(USAGE_KEY,JSON.stringify(u))}catch(_){}}
function track(page,label){if(!page)return;const u=getUsage(),x=u[page]||{count:0,label:label||page,last:0};x.count=(Number(x.count)||0)+1;x.label=label||x.label||page;x.last=Date.now();u[page]=x;saveUsage(u);renderSidebarShortcuts()}
function sourceNavButtons(){return [...document.querySelectorAll('.nav button[data-page],.nav button.john-special-nav')].filter(b=>b.dataset.page||b.dataset.special)}
function pageLabel(page){const b=sourceNavButtons().find(x=>(x.dataset.page||x.dataset.special)===page);return b?.textContent?.trim()||page}
function openPage(id){
 const btn=sourceNavButtons().find(b=>(b.dataset.page||b.dataset.special)===id);
 if(btn){btn.click();track(id,btn.textContent.trim());return true}
 try{if(typeof window.showPage==='function'){window.showPage(id);track(id,id);return true}}catch(_){}
 const pg=E(id);if(pg){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));pg.classList.remove('hidden');track(id,id);return true}
 return false;
}
function addHeader(){
 const main=document.querySelector('.main');if(!main||E('johnNextHeader'))return;
 const h=document.createElement('header');h.id='johnNextHeader';h.innerHTML=`<div class="jn-header-brand"><div class="jn-header-logo">J</div><div><b>John ERP Next</b><small id="jnActiveArea">Central de Módulos · ${VERSION}</small></div></div><div class="jn-header-search"><input id="jnGlobalSearch" placeholder="Buscar módulo, tela ou função..." autocomplete="off"><kbd>Ctrl K</kbd></div><div class="jn-header-actions"><span class="jn-online">● Online</span><button class="jn-icon-btn" id="jnHomeBtn" type="button" title="Central de módulos">▦</button><button class="jn-icon-btn" id="jnThemeBtn2" type="button" title="Alternar tema">◐</button></div>`;
 main.prepend(h);
 E('jnGlobalSearch').addEventListener('focus',()=>window.johnOpenCommandPalette?.());
 E('jnGlobalSearch').addEventListener('input',()=>{window.johnOpenCommandPalette?.();E('jnGlobalSearch').value=''});
 E('jnHomeBtn').onclick=()=>openPage('dashboard');
 E('jnThemeBtn2').onclick=()=>{const dark=document.body.classList.contains('john-dark');window.johnSetTheme?.(dark?'light':'dark')};
}
function navGroups(){
 const nav=document.querySelector('.nav');if(!nav)return [];
 let groups=[...nav.querySelectorAll('.john-module-group')].map(g=>{
   const name=g.querySelector('.john-module-name')?.textContent?.trim()||'Módulo';
   const ico=g.querySelector('.john-module-icon')?.textContent?.trim()||'◆';
   const items=[...g.querySelectorAll('.john-module-items button')].filter(b=>b.style.display!=='none').map(b=>({button:b,label:b.textContent.trim(),page:b.dataset.page||b.dataset.special||''}));
   return {id:g.dataset.module||name.toLowerCase(),name,ico,items};
 }).filter(x=>x.items.length);
 if(!groups.length){groups=[{id:'geral',name:'Módulos',ico:'▦',items:sourceNavButtons().map(b=>({button:b,label:b.textContent.trim(),page:b.dataset.page||b.dataset.special||''}))}]}
 return groups;
}
function findButton(page){return sourceNavButtons().find(b=>(b.dataset.page||b.dataset.special)===page)}
function sidebarDefaultPages(){return ['pedidos','produtos','ecommerceProdutos','ecommerceCategorias','pricing','gestaoProducao','fluxoCaixa','relatorios']}
function renderSidebarShortcuts(){
 const side=document.querySelector('.sidebar');if(!side)return;
 let host=E('johnNextSidebarShortcuts');if(!host){host=document.createElement('div');host.id='johnNextSidebarShortcuts';const tools=E('johnNavTools');(tools||side.querySelector('.john-sidebar-brand,.brand'))?.insertAdjacentElement('afterend',host)}
 const usage=getUsage();let popular=Object.entries(usage).sort((a,b)=>(Number(b[1]?.count)||0)-(Number(a[1]?.count)||0)||(Number(b[1]?.last)||0)-(Number(a[1]?.last)||0)).map(([page])=>page).filter(p=>p!=='dashboard').slice(0,6);
 if(popular.length<4)for(const p of sidebarDefaultPages())if(!popular.includes(p)&&findButton(p)){popular.push(p);if(popular.length>=6)break}
 const recent=Object.entries(usage).sort((a,b)=>(Number(b[1]?.last)||0)-(Number(a[1]?.last)||0)).map(([page])=>page).filter(p=>p!=='dashboard'&&!popular.includes(p)).slice(0,4);
 const item=p=>{const b=findButton(p),label=b?.textContent?.trim()||usage[p]?.label||p;return `<button type="button" class="jn-side-link" data-jn-side-page="${esc(p)}"><span>${esc(iconOf(label))}</span><span>${esc(textOnly(label))}</span></button>`};
 host.innerHTML=`<button type="button" class="jn-side-home" data-jn-side-page="dashboard"><span>▦</span><span>Central de Módulos</span></button><div class="jn-side-section"><div class="jn-side-title">Mais acessados</div>${popular.map(item).join('')||'<small class="jn-side-empty">Os acessos frequentes aparecerão aqui.</small>'}</div>${recent.length?`<div class="jn-side-section"><div class="jn-side-title">Recentes</div>${recent.map(item).join('')}</div>`:''}<div class="jn-side-section jn-side-bottom"><button type="button" class="jn-side-link" id="jnOpenAllModules"><span>⌕</span><span>Buscar função</span></button></div>`;
 host.querySelectorAll('[data-jn-side-page]').forEach(b=>b.onclick=()=>openPage(b.dataset.jnSidePage));
 E('jnOpenAllModules')?.addEventListener('click',()=>window.johnOpenCommandPalette?.());
}
function compactKpis(){
 const d=dbRef(),products=A(d.produtos),orders=A(d.pedidos),ecom=products.filter(p=>p?.ecommerce?.publicar===true||p?.ecommerceEnabled===true),cats=A(d?.config?.ecommerce?.categorias).filter(c=>c?.ativo!==false),pending=orders.filter(p=>!/ENTREGUE|CANCEL|FINALIZ|REJEIT/i.test(S(p?.status))).length;
 return [['Produtos',products.length],['E-commerce',ecom.length],['Categorias',cats.length],['Pedidos pendentes',pending]];
}
function renderHub(){
 const dash=E('dashboard');if(!dash)return false;
 dash.classList.add('jn-dashboard-home');
 let hub=E('johnNextHub');if(!hub){hub=document.createElement('div');hub.id='johnNextHub';dash.prepend(hub)}
 const groups=navGroups(),kpis=compactKpis();
 hub.innerHTML=`<section class="jn-home-top"><div><span class="jn-eyebrow">JOHN SISTEMAS</span><h2>Central de Módulos</h2><p>Abra uma área e acesse suas funções. Os itens mais usados ficam automaticamente na barra lateral.</p></div><div class="jn-kpi-strip">${kpis.map(k=>`<div><span>${esc(k[0])}</span><b>${esc(k[1])}</b></div>`).join('')}</div></section><div class="jn-module-toolbar"><div><h3>Módulos do ERP</h3><small>${groups.length} áreas organizadas</small></div><button type="button" class="jn-btn" id="jnExpandAll">Expandir todos</button></div><div class="jn-modules-grid">${groups.map((g,i)=>`<article class="jn-module-card ${i<2?'open':''}" data-jn-group="${esc(g.id)}"><button type="button" class="jn-module-head"><span class="jn-module-icon">${esc(g.ico)}</span><span class="jn-module-title"><b>${esc(g.name)}</b><small>${g.items.length} função(ões)</small></span><span class="jn-module-chevron">▶</span></button><div class="jn-module-links">${g.items.map((it,idx)=>`<button type="button" class="jn-module-link" data-jn-group-idx="${i}" data-jn-item-idx="${idx}"><span>${esc(iconOf(it.label))}</span><span>${esc(textOnly(it.label))}</span></button>`).join('')}</div></article>`).join('')}</div>`;
 hub.querySelectorAll('.jn-module-head').forEach(b=>b.onclick=()=>b.closest('.jn-module-card')?.classList.toggle('open'));
 hub.querySelectorAll('[data-jn-group-idx]').forEach(b=>b.onclick=()=>{const g=groups[Number(b.dataset.jnGroupIdx)],it=g?.items[Number(b.dataset.jnItemIdx)];if(it?.button){it.button.click();track(it.page,it.label)}});
 E('jnExpandAll')?.addEventListener('click',e=>{const cards=[...hub.querySelectorAll('.jn-module-card')],open=cards.every(c=>c.classList.contains('open'));cards.forEach(c=>c.classList.toggle('open',!open));e.currentTarget.textContent=open?'Expandir todos':'Recolher todos'});
 return true;
}
function setActiveArea(){
 const visible=[...document.querySelectorAll('.page')].find(p=>!p.classList.contains('hidden')&&getComputedStyle(p).display!=='none');
 const page=visible?.id||'dashboard';const label=page==='dashboard'?'Central de Módulos':textOnly(pageLabel(page));if(E('jnActiveArea'))E('jnActiveArea').textContent=label+' · '+VERSION;
 document.body.dataset.jnPage=page;
}
function stabilizeDb(){try{const d=dbRef();if(d&&typeof d==='object'){window.db=d;d.produtos=A(d.produtos);d.usuarios=A(d.usuarios);d.pessoas=A(d.pessoas);d.logs=A(d.logs);d.config=d.config&&typeof d.config==='object'?d.config:{}}}catch(e){console.warn('[John Next] base:',e)}}
function hideLegacySidebarNav(){const nav=document.querySelector('.nav');if(nav)nav.classList.add('jn-source-nav')}
function install(){setVersion();document.body.classList.add('john-next-v2');stabilizeDb();addHeader();renderSidebarShortcuts();hideLegacySidebarNav();renderHub();setActiveArea()}
function later(){[0,350,1200,2800].forEach(ms=>setTimeout(install,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',later,{once:true});else later();
document.addEventListener('click',e=>{const b=e.target.closest('.nav button[data-page],.nav button.john-special-nav');if(b){const page=b.dataset.page||b.dataset.special;track(page,b.textContent.trim());setTimeout(()=>{setActiveArea();renderSidebarShortcuts()},80)}},true);
window.addEventListener('john:session-ready',()=>setTimeout(install,80));
window.addEventListener('john:cloud-applied',()=>setTimeout(()=>{stabilizeDb();renderHub();renderSidebarShortcuts()},120));
window.johnNext={version:VERSION,refresh:install,renderHub,openPage};
})();
