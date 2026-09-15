(function(){
'use strict';
const V='8.16.1';
const E=id=>document.getElementById(id);const A=x=>Array.isArray(x)?x:[];const S=x=>String(x??'');const N=x=>Number(x)||0;
function dbx(){return window.db||{};}
function store(){try{return localStorage}catch(_){return null}}
function snapshot(){try{return JSON.parse(store()?.getItem('john_ecommerce_public_v1')||'null')}catch(_){return null}}
function toast(m){try{window.toast?.(m)}catch(_){console.log(m)}}
function eCfg(){const d=dbx();d.config=d.config&&typeof d.config==='object'?d.config:{};d.config.ecommerce=d.config.ecommerce&&typeof d.config.ecommerce==='object'?d.config.ecommerce:{};d.config.ecommerce.categorias=A(d.config.ecommerce.categorias);return d.config.ecommerce}
function product(id){return A(dbx().produtos).find(p=>S(p.id)===S(id))}
function publishedLocal(){return A(dbx().produtos).filter(p=>p?.ecommerce?.publicar===true)}
function mergeFromSnapshot(opts={}){
 const snap=snapshot(); if(!snap||!A(snap.produtos).length)return {ok:false,reason:'SEM_SNAPSHOT',restoredProducts:0,restoredCategories:0};
 const cfg=eCfg(); let rc=0,rp=0;
 const have=new Set(A(cfg.categorias).map(c=>S(c.id)));
 for(const c of A(snap.loja?.categorias)){
   if(!c||!S(c.id)||have.has(S(c.id)))continue;
   cfg.categorias.push({id:S(c.id),nome:S(c.nome)||'Categoria',descricao:S(c.descricao),emoji:S(c.emoji)||'✨',ordem:N(c.ordem),ativo:c.ativo!==false,geral:!!c.geral});have.add(S(c.id));rc++;
 }
 for(const cp of A(snap.produtos)){
   const p=product(cp.id)||A(dbx().produtos).find(x=>S(x.codigo)===S(cp.codigo)); if(!p)continue;
   p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'?p.ecommerce:{};
   const e=p.ecommerce;
   if(!e.categoriaId&&cp.categoriaId)e.categoriaId=cp.categoriaId;
   if(!e.categoria&&cp.categoria)e.categoria=cp.categoria;
   if(!(N(e.precoEcommerce)>0)&&N(cp.preco)>0)e.precoEcommerce=N(cp.preco);
   if(!A(e.imagens).length&&A(cp.imagens).length)e.imagens=A(cp.imagens).slice(0,5);
   if(!e.imagem&&cp.imagem)e.imagem=cp.imagem;
   if(!e.disponibilidade&&cp.disponibilidade)e.disponibilidade=cp.disponibilidade;
   if(e.antecedenciaDias==null&&cp.antecedenciaDias!=null)e.antecedenciaDias=cp.antecedenciaDias;
   if(e.quantidadeMinima==null&&cp.quantidadeMinima!=null)e.quantidadeMinima=cp.quantidadeMinima;
   if(e.limitePedido==null&&cp.limitePedido!=null)e.limitePedido=cp.limitePedido;
   if(e.destaque==null)e.destaque=!!cp.destaque;if(e.novidade==null)e.novidade=!!cp.novidade;
   if(opts.restorePublish!==false&&e.publicar!==true){e.publicar=true;rp++;}
 }
 try{typeof window.save==='function'?window.save():localStorage.setItem(typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1',JSON.stringify(dbx()))}catch(_){ }
 try{window.johnCloudCapturarAlteracoes?.()}catch(_){ }
 return {ok:true,restoredProducts:rp,restoredCategories:rc,totalSnapshot:A(snap.produtos).length};
}
function enforceMenu(){
 const nav=document.querySelector('.nav.john-modular-nav,.nav');if(!nav)return false;
 let g=nav.querySelector('.john-module-group[data-module="ecommerce"]');if(!g)return false;
 const items=g.querySelector('.john-module-items');if(!items)return false;
 const add=(id,label,click)=>{let b=items.querySelector(`[data-page="${id}"]`);if(!b){b=document.createElement('button');b.type='button';b.className='john-special-nav';b.dataset.page=id;b.dataset.permissionPage='produtos';items.appendChild(b)}b.textContent=label;b.style.removeProperty('display');b.onclick=click;return b};
 add('ecommerceCategorias','🗂️ Categorias da Loja',()=>{try{showPage('ecommerceCategorias')}catch(_){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));E('ecommerceCategorias')?.classList.remove('hidden')}window.johnEcommerceCategoriasV4?.render?.()});
 add('ecommerceProdutos','🛍️ Produtos E-commerce',()=>{try{showPage('ecommerceProdutos')}catch(_){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));E('ecommerceProdutos')?.classList.remove('hidden')}try{window.johnV890RenderEcomMaintenance?.()}catch(_){ } setTimeout(()=>{try{document.querySelector('[data-page="ecommerceProdutos"]')?.dispatchEvent(new Event('john:open'))}catch(_){}},20)});
 add('ecommerceProdutosOnline','🌐 Produtos Online',()=>{try{showPage('ecommerceProdutosOnline')}catch(_){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));E('ecommerceProdutosOnline')?.classList.remove('hidden')}try{E('on84Load')?.click()}catch(_){}});
 let repair=items.querySelector('[data-page="ecommerceRecuperarV8161"]');if(!repair){repair=document.createElement('button');repair.type='button';repair.className='john-special-nav';repair.dataset.page='ecommerceRecuperarV8161';items.appendChild(repair)}repair.textContent='🧰 Recuperar catálogo';repair.style.removeProperty('display');repair.onclick=recoverUI;
 // remove duplicates only outside E-commerce; never remove canonical E-commerce buttons
 nav.querySelectorAll('.john-module-group:not([data-module="ecommerce"]) [data-page="ecommerceCategorias"],.john-module-group:not([data-module="ecommerce"]) [data-page="ecommerceProdutos"]').forEach(x=>x.remove());
 return true;
}
function makeRecoveryPage(){let p=E('ecommerceRecuperarV8161');if(p)return p;const main=document.querySelector('.main');if(!main)return null;p=document.createElement('section');p.id='ecommerceRecuperarV8161';p.className='page hidden';p.innerHTML=`<div class="topbar"><div><h1>🧰 Recuperar catálogo E-commerce</h1><div class="subtitle">Restaura categorias, vínculos, preço E-commerce e marcação de publicação a partir do último catálogo válido salvo neste dispositivo.</div></div></div><div class="panel"><div class="panel-body"><div id="rec8161Status" class="subtitle"></div><div class="actions" style="margin-top:14px"><button class="btn primary" id="rec8161Run">Recuperar categorias e produtos</button><button class="btn secondary" id="rec8161Publish">Publicar catálogo recuperado</button></div><div style="margin-top:12px" class="subtitle"><b>Proteção:</b> esta versão impede publicação vazia quando já existe um catálogo válido no dispositivo.</div></div></div>`;main.appendChild(p);E('rec8161Run').onclick=()=>{const r=mergeFromSnapshot({restorePublish:true});status(r);enforceMenu();try{window.johnEcommerceCategoriasV4?.render?.()}catch(_){};try{window.johnV890RenderEcomMaintenance?.()}catch(_){} };E('rec8161Publish').onclick=async()=>{const r=mergeFromSnapshot({restorePublish:true});status(r);if(!r.ok)return;try{await window.JohnV880?.canonicalPublish?.(false);toast('Catálogo recuperado e publicado.')}catch(e){alert('Não foi possível publicar: '+e.message)}};return p}
function status(r){const el=E('rec8161Status');if(!el)return;if(!r.ok)el.innerHTML='⚠️ Não encontrei um catálogo anterior salvo neste navegador. As páginas e menus foram restaurados, mas será necessário marcar os produtos para publicação novamente.';else el.innerHTML=`✅ Snapshot encontrado com <b>${r.totalSnapshot}</b> produto(s). Categorias recuperadas: <b>${r.restoredCategories}</b>. Produtos reativados para publicação: <b>${r.restoredProducts}</b>.`;}
function recoverUI(){const p=makeRecoveryPage();try{showPage('ecommerceRecuperarV8161')}catch(_){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));p?.classList.remove('hidden')}const snap=snapshot();status(snap?{ok:true,totalSnapshot:A(snap.produtos).length,restoredCategories:0,restoredProducts:0}:{ok:false});}
function protectPublish(){
 const obj=window.JohnV880;if(!obj||typeof obj.canonicalPublish!=='function'||obj.canonicalPublish.__v8161)return;
 const old=obj.canonicalPublish.bind(obj);const wrapped=async function(silent=false,opts={}){
   const snap=snapshot(),snapCount=A(snap?.produtos).length,current=publishedLocal().length;
   if(current===0&&snapCount>0){const r=mergeFromSnapshot({restorePublish:true});if(r.ok&&r.restoredProducts>0)toast(`Proteção V8.16.1: ${r.restoredProducts} produto(s) restaurado(s) antes da publicação.`)}
   const before=publishedLocal().length;if(before===0&&snapCount>0)throw new Error('Publicação vazia bloqueada. Use E-commerce > Recuperar catálogo para restaurar os produtos.');
   return old(silent,opts);
 };wrapped.__v8161=true;obj.canonicalPublish=wrapped;window.johnV880Publish=wrapped;
}
function autoRecover(){const snap=snapshot();if(!A(snap?.produtos).length)return;const curr=publishedLocal().length;if(curr===0){const r=mergeFromSnapshot({restorePublish:true});if(r.ok&&(r.restoredProducts||r.restoredCategories))toast(`Catálogo recuperado automaticamente: ${r.restoredProducts} produto(s), ${r.restoredCategories} categoria(s).`)}}
function init(){makeRecoveryPage();enforceMenu();autoRecover();protectPublish();window.JohnEcommerceRecoveryV8161={mergeFromSnapshot,enforceMenu,recoverUI,version:V};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1600),{once:true});else setTimeout(init,700);
[2500,5000,9000,15000].forEach(ms=>setTimeout(()=>{enforceMenu();protectPublish()},ms));
document.addEventListener('click',()=>setTimeout(()=>{enforceMenu();protectPublish()},80),true);
window.addEventListener('john:cloud-applied',()=>setTimeout(()=>{enforceMenu();autoRecover();protectPublish()},120));
})();
