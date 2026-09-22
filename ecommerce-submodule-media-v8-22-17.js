(function(){
'use strict';
if(window.__JOHN_ECOMMERCE_SUBMODULE_MEDIA_82217__)return;
window.__JOHN_ECOMMERCE_SUBMODULE_MEDIA_82217__=true;
const VERSION='8.22.17';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let observer=null;
function storage(){try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}catch(_){return localStorage}}
function dbRef(){try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){}return window.db||null}
function dbKey(){try{return typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1'}catch(_){return 'pcp_app_v1'}}
function persist(){const d=dbRef();if(!d)return false;try{storage().setItem(dbKey(),JSON.stringify(d));return true}catch(e){console.warn('[John '+VERSION+'] persistência:',e);return false}}
function toastMsg(m){try{if(typeof toast==='function')return toast(m)}catch(_){}alert(m)}
function currentProduct(){
 const d=dbRef();if(!d||!Array.isArray(d.produtos))return null;
 const id=S(document.getElementById('produtoId')?.value).trim();
 const code=S(document.getElementById('produtoCodigo')?.value).trim();
 const name=S(document.getElementById('produtoNome')?.value).trim().toLowerCase();
 return (id&&d.produtos.find(p=>S(p?.id)===id))||(code&&d.produtos.find(p=>S(p?.codigo)===code))||(name&&[...d.produtos].reverse().find(p=>S(p?.nome).trim().toLowerCase()===name))||null;
}
async function publish(){
 const fn=window.publicarCatalogoEcommerce||window.JohnCaseirinhoCatalogSync821?.publish;
 if(typeof fn==='function')await fn(true);
}
function imageUrlFromCard(card){
 const img=card?.querySelector?.('img');
 return S(card?.dataset?.strictMediaUrl||img?.getAttribute?.('src')||img?.src).trim();
}
async function removePhoto(url,card){
 const p=currentProduct();
 if(!p)return toastMsg('Produto não localizado. Salve o cadastro e tente novamente.');
 const e=p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'&&!Array.isArray(p.ecommerce)?p.ecommerce:{};
 const all=[...new Set([e.imagem,...A(e.imagens)].map(S).filter(Boolean))];
 if(!all.includes(url)&&url)all.push(url);
 if(!confirm('Excluir esta foto do produto no E-commerce?'))return;
 const next=all.filter(x=>x!==url);
 e.imagens=next.slice(0,5);
 e.imagem=e.imagens[0]||'';
 p.atualizadoEm=new Date().toISOString();
 p.operadorAtualizacao='John ERP '+VERSION;
 try{if(typeof imageState!=='undefined'&&Array.isArray(imageState)){for(let i=imageState.length-1;i>=0;i--)if(S(imageState[i])===url)imageState.splice(i,1)}}catch(_){}
 const direct=document.getElementById('produtoEcomImagem');if(direct&&S(direct.value)===url)direct.value=e.imagem||'';
 if(!persist())return toastMsg('Não foi possível salvar a exclusão da foto.');
 try{if(typeof save==='function')save()}catch(_){}
 try{card?.remove()}catch(_){}
 try{if(typeof renderImages==='function')renderImages()}catch(_){}
 try{window.renderEcomProducts?.();window.renderOnline?.()}catch(_){}
 const st=document.getElementById('produtoEcomUploadStatus');if(st){st.textContent='Foto removida do produto. Atualizando o E-commerce...';st.style.color='#15803d'}
 try{await publish();if(st)st.textContent='Foto excluída do produto e removida do E-commerce.';toastMsg('Foto excluída do E-commerce.')}catch(err){console.error(err);if(st){st.textContent='Foto removida do cadastro local, mas a publicação falhou: '+(err?.message||err);st.style.color='#b42318'}toastMsg('Foto removida do produto, mas houve falha ao publicar o catálogo.')}
}
function enhanceGallery(){
 const g=document.getElementById('produtoEcomGaleria');if(!g)return false;
 [...g.querySelectorAll('.media-card, [data-strict-media-url], div')].forEach(card=>{
   const img=card.querySelector?.('img');if(!img||card.dataset.johnDeletePhoto82217==='1')return;
   const url=imageUrlFromCard(card);if(!url)return;
   card.dataset.johnDeletePhoto82217='1';
   let actions=card.querySelector('.media-actions');if(!actions){actions=document.createElement('div');actions.className='media-actions';card.appendChild(actions)}
   const b=document.createElement('button');b.type='button';b.className='btn danger john-delete-photo-82217';b.textContent='🗑 Excluir foto';b.style.cssText='margin-top:6px;border:1px solid #fecaca;background:#fff1f2;color:#991b1b;border-radius:8px;padding:6px 9px;font-weight:800;cursor:pointer';
   b.onclick=e=>{e.preventDefault();e.stopPropagation();removePhoto(url,card)};
   actions.appendChild(b);
 });
 return true;
}
function removeOldInlineButton(){const b=document.getElementById('johnOpenBatch82216');if(b)b.remove()}
function style(){if(document.getElementById('johnEcomSub82217Style'))return;const s=document.createElement('style');s.id='johnEcomSub82217Style';s.textContent=`#ecommerceManutencaoLote82217{padding:4px 0}.jes-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:16px}.jes-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;box-shadow:0 8px 28px rgba(15,23,42,.06)}.jes-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.jes-card h3{margin:0 0 6px}.jes-card p{margin:0 0 14px;color:#64748b}.jes-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;background:#4f46e5;color:#fff}.jes-soft{background:#eef2ff;color:#3730a3}.jes-nav{display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;border:0;background:transparent;text-align:left;cursor:pointer;font:inherit}.jes-nav:hover{background:rgba(99,102,241,.08)}.jes-sub{padding-left:30px!important;font-size:13px;opacity:.95}@media(max-width:800px){.jes-grid{grid-template-columns:1fr}}`;document.head.appendChild(s)}
function ensurePage(){
 style();let p=document.getElementById('ecommerceManutencaoLote82217');if(p)return p;
 p=document.createElement('section');p.id='ecommerceManutencaoLote82217';p.className='page hidden';
 p.innerHTML=`<div class="jes-head"><div><h1 style="margin:0">🛒 E-commerce · Manutenção</h1><div style="color:#64748b;margin-top:4px">Submódulo para manutenção em lote e gestão das imagens dos produtos.</div></div><button type="button" class="jes-btn jes-soft" id="jesBack82217">Voltar</button></div><div class="jes-grid"><div class="jes-card"><h3>✏️ Nome Comercial em lote</h3><p>Filtre por tipo de produto, altere nomes comerciais, aplique prefixos, sufixos e localizar/substituir.</p><button type="button" class="jes-btn" id="jesOpenBatch82217">Abrir manutenção em lote</button></div><div class="jes-card"><h3>🖼️ Fotos dos produtos</h3><p>A exclusão de fotos agora fica disponível diretamente na galeria do cadastro do produto. A foto é desvinculada e o catálogo é republicado.</p><button type="button" class="jes-btn jes-soft" id="jesGoProducts82217">Ir para Produtos</button></div></div>`;
 (document.querySelector('main.main')||document.querySelector('main')||document.body).appendChild(p);
 document.getElementById('jesOpenBatch82217').onclick=()=>{if(typeof window.abrirManutencaoEcommerceLote==='function')window.abrirManutencaoEcommerceLote();else toastMsg('A manutenção em lote ainda está carregando. Tente novamente em alguns segundos.')};
 document.getElementById('jesBack82217').onclick=()=>history.back();
 document.getElementById('jesGoProducts82217').onclick=()=>{const target=[...document.querySelectorAll('button,a,[role=button]')].find(x=>/^\s*Produtos\s*$/i.test(S(x.textContent)));if(target)target.click();else toastMsg('Abra Produtos e edite o item desejado para excluir a foto.')};
 return p;
}
function showSubmodule(){
 const p=ensurePage();document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));p.classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'});
}
function injectNav(){
 if(document.getElementById('johnEcomSubNav82217'))return true;
 const roots=[...document.querySelectorAll('aside,nav,.sidebar,.side,.menu')];
 for(const root of roots){
   const ecom=[...root.querySelectorAll('button,a,[role=button],div,span')].find(x=>/^\s*(🛒\s*)?E-?commerce\s*$/i.test(S(x.textContent)));
   if(!ecom)continue;
   const host=ecom.closest('li,.nav-group,.menu-group,.nav-item')||ecom.parentElement||root;
   const b=document.createElement('button');b.id='johnEcomSubNav82217';b.type='button';b.className='jes-nav jes-sub';b.innerHTML='↳ Manutenção do E-commerce';b.onclick=showSubmodule;
   host.insertAdjacentElement('afterend',b);return true;
 }
 return false;
}
function installFallbackCard(){
 if(document.getElementById('johnEcomSubFallback82217'))return;
 const candidates=[...document.querySelectorAll('.page,section')].filter(x=>/E-commerce/i.test(S(x.textContent)));
 const host=candidates.find(x=>!x.querySelector('#produtoForm')&&x.offsetParent!==null)||null;if(!host)return;
 const card=document.createElement('div');card.id='johnEcomSubFallback82217';card.className='jes-card';card.style.marginBottom='14px';card.innerHTML='<h3>🧰 Manutenção do E-commerce</h3><p>Nome Comercial em lote e gestão de fotos dos produtos.</p><button type="button" class="jes-btn">Abrir submódulo</button>';card.querySelector('button').onclick=showSubmodule;host.prepend(card);
}
function boot(){
 removeOldInlineButton();ensurePage();enhanceGallery();injectNav();installFallbackCard();
 if(observer)observer.disconnect();observer=new MutationObserver(()=>{removeOldInlineButton();enhanceGallery();injectNav();installFallbackCard()});observer.observe(document.documentElement,{subtree:true,childList:true});
 window.JohnEcommerceMaintenance82217={version:VERSION,open:showSubmodule,enhanceGallery,removePhoto};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250),{once:true});else setTimeout(boot,250);
})();
