(function(){
'use strict';
if(window.__JOHN_ECOMMERCE_RECOVERY_SERVER_8224__)return;
window.__JOHN_ECOMMERCE_RECOVERY_SERVER_8224__=true;
const V='8.22.4';
const E=id=>document.getElementById(id);
function toast(m){try{window.toast?.(m)}catch(_){console.log(m)}}
async function recoverFromServer(){
 if(typeof window.johnHydrateStorefrontFromServerV8224!=='function'&&typeof window.johnHydrateStorefrontFromServerV819!=='function')throw new Error('Sincronizador do catálogo do servidor ainda não foi carregado.');
 const fn=window.johnHydrateStorefrontFromServerV8224||window.johnHydrateStorefrontFromServerV819;
 return fn(true);
}
function makeRecoveryPage(){
 let p=E('ecommerceRecuperarV8161');if(p)return p;
 const main=document.querySelector('.main');if(!main)return null;
 p=document.createElement('section');p.id='ecommerceRecuperarV8161';p.className='page hidden';
 p.innerHTML=`<div class="topbar"><div><h1>🧰 Recuperar catálogo E-commerce</h1><div class="subtitle">Recarrega a versão publicada no servidor. O navegador não restaura mais snapshots locais antigos.</div></div></div><div class="panel"><div class="panel-body"><div id="rec8161Status" class="subtitle">A API/PostgreSQL é a fonte única do catálogo publicado.</div><div class="actions" style="margin-top:14px"><button class="btn primary" id="rec8161Run">Recarregar catálogo do servidor</button></div><div style="margin-top:12px" class="subtitle"><b>Proteção:</b> fotos, preços, categorias, disponibilidade e publicação são lidos da mesma versão do servidor em todos os navegadores.</div></div></div>`;
 main.appendChild(p);
 E('rec8161Run').onclick=async()=>{const b=E('rec8161Run'),s=E('rec8161Status');b.disabled=true;s.textContent='Recarregando do servidor...';try{const r=await recoverFromServer();s.textContent=`✅ Catálogo recarregado. ${r?.products??0} produto(s), ${r?.images??0} com foto.`;toast('Catálogo recarregado do servidor.')}catch(e){s.textContent='❌ '+e.message}finally{b.disabled=false}};
 return p;
}
function enforceMenu(){
 const nav=document.querySelector('.nav.john-modular-nav,.nav');if(!nav)return false;
 const g=nav.querySelector('.john-module-group[data-module="ecommerce"]');const items=g?.querySelector('.john-module-items');if(!items)return false;
 let repair=items.querySelector('[data-page="ecommerceRecuperarV8161"]');
 if(!repair){repair=document.createElement('button');repair.type='button';repair.className='john-special-nav';repair.dataset.page='ecommerceRecuperarV8161';items.appendChild(repair)}
 repair.textContent='🧰 Recarregar catálogo do servidor';repair.style.removeProperty('display');repair.onclick=()=>{const p=makeRecoveryPage();try{showPage('ecommerceRecuperarV8161')}catch(_){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));p?.classList.remove('hidden')}};
 return true;
}
function init(){makeRecoveryPage();enforceMenu();window.JohnEcommerceRecoveryV8161={recoverFromServer,enforceMenu,version:V,source:'server'}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1200),{once:true});else setTimeout(init,500);
[2500,5000,9000].forEach(ms=>setTimeout(enforceMenu,ms));
window.addEventListener('john:cloud-applied',()=>setTimeout(enforceMenu,120));
})();
