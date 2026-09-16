(function(){
'use strict';
if(window.__JOHN_NEXT_817__)return;window.__JOHN_NEXT_817__=true;
const VERSION='8.17.0';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const E=id=>document.getElementById(id);
const esc=s=>S(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store=()=>{try{return window.__johnLocalStorage||window.localStorage}catch(_){return window.localStorage}};
function dbRef(){try{return window.db||(typeof db!=='undefined'?db:null)||JSON.parse(store().getItem('pcp_app_v1')||'{}')}catch(_){return {}}}
function textOnly(v){return S(v).replace(/^\s*[\u{1F000}-\u{1FAFF}\u2600-\u27BF]+\s*/u,'').trim()}
function iconOf(v){const m=S(v).match(/^\s*([\u{1F000}-\u{1FAFF}\u2600-\u27BF]+)/u);return m?.[1]||'◆'}
function setVersion(){window.JOHN_ERP_VERSION=VERSION;document.documentElement.dataset.johnNext='8170'}
function addHeader(){
 const main=document.querySelector('.main');if(!main||E('johnNextHeader'))return;
 const h=document.createElement('header');h.id='johnNextHeader';h.innerHTML=`<div class="jn-header-brand"><div class="jn-header-logo">J</div><div><b>John ERP Next</b><small id="jnActiveArea">Gestão integrada · ${VERSION}</small></div></div><div class="jn-header-search"><input id="jnGlobalSearch" placeholder="Buscar módulo, tela ou função..." autocomplete="off"><kbd>Ctrl K</kbd></div><div class="jn-header-actions"><button class="jn-icon-btn" id="jnModulesBtn" type="button" title="Central de módulos">▦</button><button class="jn-icon-btn" id="jnRefreshBtn" type="button" title="Atualizar indicadores">↻</button><button class="jn-icon-btn" id="jnThemeBtn2" type="button" title="Alternar tema">◐</button></div>`;
 main.prepend(h);
 E('jnGlobalSearch').addEventListener('focus',()=>window.johnOpenCommandPalette?.());
 E('jnGlobalSearch').addEventListener('input',()=>{window.johnOpenCommandPalette?.();E('jnGlobalSearch').value=''});
 E('jnModulesBtn').onclick=()=>openPage('dashboard');E('jnRefreshBtn').onclick=()=>{renderHealth();renderHub()};E('jnThemeBtn2').onclick=()=>{const dark=document.body.classList.contains('john-dark');window.johnSetTheme?.(dark?'light':'dark')};
}
function openPage(id){
 const btn=document.querySelector(`.nav [data-page="${CSS.escape(id)}"]`);if(btn){btn.click();return true}
 try{if(typeof window.showPage==='function')return !!window.showPage(id)}catch(_){}
 const pg=E(id);if(pg){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));pg.classList.remove('hidden');return true}
 return false;
}
function navGroups(){
 const nav=document.querySelector('.nav');if(!nav)return [];
 return [...nav.querySelectorAll('.john-module-group')].map(g=>{
   const name=g.querySelector('.john-module-name')?.textContent?.trim()||'Módulo';
   const ico=g.querySelector('.john-module-icon')?.textContent?.trim()||'◆';
   const items=[...g.querySelectorAll('.john-module-items button')].filter(b=>b.style.display!=='none').map(b=>({button:b,label:b.textContent.trim(),page:b.dataset.page||'',special:b.dataset.special||''}));
   return {id:g.dataset.module||name.toLowerCase(),name,ico,items};
 }).filter(x=>x.items.length);
}
function renderHub(){
 const dash=E('dashboard');if(!dash)return false;
 let hub=E('johnNextHub');if(!hub){hub=document.createElement('div');hub.id='johnNextHub';const top=dash.querySelector('.topbar');top?top.insertAdjacentElement('afterend',hub):dash.prepend(hub)}
 const groups=navGroups();const d=dbRef();const products=A(d.produtos);const ecom=products.filter(p=>p?.ecommerce?.publicar===true||p?.ecommerceEnabled===true);const cats=A(d?.config?.ecommerce?.categorias).filter(c=>c?.ativo!==false);
 hub.innerHTML=`<div class="jn-hero"><div><h2>Seu negócio, em um só lugar</h2><p>Central operacional do John ERP. Acesse módulos, identifique pendências e navegue sem alterar a lógica das telas já existentes.</p><div class="jn-hero-actions"><button class="jn-btn primary" data-jn-open="pedidos">Abrir pedidos</button><button class="jn-btn" data-jn-open="ecommerceProdutos">Produtos E-commerce</button><button class="jn-btn" data-jn-open="pricing">Pricing</button><button class="jn-btn" data-jn-open="gestaoProducao">Produção</button></div></div><div class="jn-hero-health"><div class="jn-mini"><span>Produtos</span><b>${products.length}</b></div><div class="jn-mini"><span>E-commerce</span><b>${ecom.length}</b></div><div class="jn-mini"><span>Categorias</span><b>${cats.length}</b></div><div class="jn-mini"><span>Versão</span><b>${VERSION}</b></div></div></div>
 <div class="jn-section-title"><h3>Central de módulos</h3><span>${groups.length} áreas disponíveis</span></div><div class="jn-modules-grid">${groups.map((g,i)=>`<article class="jn-module-card ${['comercial','ecommerce'].includes(g.id)?'open':''}" data-jn-group="${esc(g.id)}"><button type="button" class="jn-module-head"><span class="jn-module-icon">${esc(g.ico)}</span><span class="jn-module-title"><b>${esc(g.name)}</b><small>${g.items.length} função(ões)</small></span><span class="jn-module-chevron">▶</span></button><div class="jn-module-links">${g.items.map((it,idx)=>`<button type="button" class="jn-module-link" data-jn-group-idx="${i}" data-jn-item-idx="${idx}"><span>${esc(iconOf(it.label))}</span><span>${esc(textOnly(it.label))}</span></button>`).join('')}</div></article>`).join('')}</div>
 <div class="jn-section-title"><h3>Saúde operacional</h3><span>Leitura local da empresa ativa</span></div><div id="johnNextHealth" class="jn-health-grid"></div>
 <div class="jn-section-title"><h3>Acessos rápidos</h3><span>Operação diária</span></div><div class="jn-shortcuts"><button class="jn-shortcut" data-jn-open="produtos">＋ Produto</button><button class="jn-shortcut" data-jn-open="pedidos">🛒 Pedido</button><button class="jn-shortcut" data-jn-open="producao">🏭 Produção</button><button class="jn-shortcut" data-jn-open="entradas">🚚 Entrada</button><button class="jn-shortcut" data-jn-open="fluxoCaixa">🏦 Caixa</button><button class="jn-shortcut" data-jn-open="relatorios">📊 Relatórios</button></div>`;
 hub.querySelectorAll('.jn-module-head').forEach(b=>b.onclick=()=>b.closest('.jn-module-card')?.classList.toggle('open'));
 hub.querySelectorAll('[data-jn-open]').forEach(b=>b.onclick=()=>openPage(b.dataset.jnOpen));
 hub.querySelectorAll('[data-jn-group-idx]').forEach(b=>b.onclick=()=>{const g=groups[Number(b.dataset.jnGroupIdx)],it=g?.items[Number(b.dataset.jnItemIdx)];it?.button?.click()});
 renderHealth();return true;
}
function imgSources(p){const e=p?.ecommerce||{};return [e.imagem,...A(e.imagens),p?.imagem,...A(p?.imagens),...A(p?.anexos).map(a=>a?.conteudo||a?.url)].filter(Boolean)}
function stockOf(p){
 try{if(typeof window.saldoProduto==='function')return Number(window.saldoProduto(p.id))||0}catch(_){}
 return Number(p?.saldo??p?.estoqueAtual??0)||0;
}
function renderHealth(){
 const host=E('johnNextHealth');if(!host)return;const d=dbRef();const products=A(d.produtos);const ecommerce=products.filter(p=>p?.ecommerce?.publicar===true||p?.ecommerceEnabled===true);const noImg=ecommerce.filter(p=>!imgSources(p).length);const noPrice=ecommerce.filter(p=>Number(p?.ecommerce?.precoEcommerce??p?.ecommercePrice??0)<=0);const low=products.filter(p=>Number(p?.estoqueMinimo)>0&&stockOf(p)<Number(p.estoqueMinimo));const pending=A(d.pedidos).filter(p=>!/ENTREGUE|CANCEL|FINALIZ|REJEIT/i.test(S(p?.status))).length;const cats=A(d?.config?.ecommerce?.categorias).filter(c=>c?.ativo!==false).length;
 const rows=[['Produtos online',ecommerce.length,'Catálogo configurado','ok'],['Sem foto',noImg.length,noImg.length?'Revisar imagens':'Tudo certo',noImg.length?'warn':'ok'],['Sem preço E-commerce',noPrice.length,noPrice.length?'Não publicar':'Tudo certo',noPrice.length?'err':'ok'],['Estoque abaixo mín.',low.length,low.length?'Repor/produzir':'Tudo certo',low.length?'warn':'ok'],['Pedidos pendentes',pending,'Operação atual',pending?'warn':'ok'],['Categorias ativas',cats,cats?'Loja organizada':'Cadastrar categorias',cats?'ok':'warn']];
 host.innerHTML=rows.map(r=>`<div class="jn-health-card ${r[3]}"><span>${esc(r[0])}</span><b>${esc(r[1])}</b><small>${esc(r[2])}</small></div>`).join('');
}
function trackActive(){
 const active=document.querySelector('.nav button.active');const label=active?.textContent?.trim();if(label&&E('jnActiveArea'))E('jnActiveArea').textContent=textOnly(label)+' · '+VERSION;
}
function stabilizeDb(){
 try{const d=dbRef();if(d&&typeof d==='object'){window.db=d;d.produtos=A(d.produtos);d.usuarios=A(d.usuarios);d.pessoas=A(d.pessoas);d.logs=A(d.logs);d.config=d.config&&typeof d.config==='object'?d.config:{}}}catch(e){console.warn('[John Next] base:',e)}
}
function repairImages(){
 const d=dbRef();let n=0;for(const p of A(d.produtos)){const e=p.ecommerce=p.ecommerce||{};if((!e.imagem&&!A(e.imagens).length)){const src=imgSources(p)[0];if(src){e.imagem=src;e.imagens=[src];n++}}}if(n){try{store().setItem('pcp_app_v1',JSON.stringify(d))}catch(_){}}return n
}
function install(){setVersion();document.body.classList.add('john-next');stabilizeDb();repairImages();addHeader();renderHub();trackActive()}
function later(){[0,350,1200,2800].forEach(ms=>setTimeout(install,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',later,{once:true});else later();
document.addEventListener('click',e=>{if(e.target.closest('.nav button,[data-page]'))setTimeout(()=>{trackActive();if(E('dashboard')&&!E('dashboard').classList.contains('hidden'))renderHub()},80)},true);
window.addEventListener('john:session-ready',()=>setTimeout(install,80));
window.addEventListener('john:cloud-applied',()=>setTimeout(()=>{stabilizeDb();repairImages();renderHealth()},120));
window.johnNext={version:VERSION,refresh:install,repairImages,renderHealth,openPage};
})();
