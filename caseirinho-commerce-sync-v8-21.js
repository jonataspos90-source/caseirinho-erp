(function(){
'use strict';
if(window.__JOHN_CASEIRINHO_SYNC_8225__)return;
window.__JOHN_CASEIRINHO_SYNC_8225__=true;
const VERSION='8.22.5';
const S=v=>String(v??'');
const N=v=>Number(v)||0;
const A=v=>Array.isArray(v)?v:[];
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const now=()=>new Date().toISOString();
const SYNC_FP_KEY='john_catalog_last_sync_v8225';
let syncTimer=null;
let publishPromise=null;
let lastSyncedFingerprint='';
try{lastSyncedFingerprint=localStorage.getItem(SYNC_FP_KEY)||''}catch(_){}

function currentDb(){try{return typeof db!=='undefined'?db:(window.db||null)}catch(_){return window.db||null}}
function persist(){
  try{
    const d=currentDb();if(!d)return;
    const key=typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1';
    (typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage).setItem(key,JSON.stringify(d));
  }catch(e){console.warn('[John V8.22.5] persistência:',e)}
}
function svgData(title,subtitle,base,accent){
  const esc=x=>S(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900"><rect width="1200" height="900" fill="#f8f4ea"/><rect x="78" y="86" width="1044" height="728" rx="26" fill="#fffdf8" stroke="#d8c9a8" stroke-width="4"/><ellipse cx="600" cy="560" rx="300" ry="170" fill="${esc(base)}" opacity="0.18"/><path d="M420 565c30-87 126-148 245-148 129 0 230 69 261 164-71 40-176 64-292 64-93 0-173-17-214-40z" fill="${esc(base)}" opacity="0.75"/><path d="M455 495c26-54 84-89 152-89 70 0 134 37 162 96-53 22-115 34-183 34-49 0-94-6-131-16z" fill="#fff6d6" opacity="0.95"/><text x="110" y="180" font-family="Inter,Arial,sans-serif" font-size="78" font-weight="800" fill="#5b3b10">${esc(title)}</text><text x="112" y="245" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="600" fill="#8a6b3d">${esc(subtitle)}</text><text x="110" y="770" font-family="Inter,Arial,sans-serif" font-size="26" font-weight="700" fill="#7b1438">Caseirinho · imagem padrão do catálogo</text></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
const REQUIRED=[
  {id:'caseirinho-pao-caseiro',codigo:'900035',nome:'Pão Caseiro',unidade:'UN',preco:11.99,categoria:'Pães',descricao:'Pão caseiro artesanal, pronto para venda no E-commerce.',imagem:svgData('Pão Caseiro','Categoria Pães · Caseirinho','#c08457','#f59e0b')},
  {id:'caseirinho-rosquinha-trancada',codigo:'900036',nome:'Rosquinha Trançada com Açúcar',unidade:'UN',preco:1.49,categoria:'Pães',descricao:'Rosquinha trançada com açúcar, pronta para venda no E-commerce.',imagem:svgData('Rosquinha Trançada','Categoria Pães · Caseirinho','#d97706','#fcd34d')}
];
function nextCode(d){let max=0;for(const p of A(d?.produtos)){const n=parseInt(S(p?.codigo).replace(/\D/g,''),10);if(Number.isFinite(n))max=Math.max(max,n)}return String(max+1).padStart(6,'0')}
function findCategory(d,name){const cats=A(d?.config?.ecommerce?.categorias).filter(c=>S(c?.id).toUpperCase()!=='GERAL');return cats.find(c=>norm(c?.nome)===norm(name))||cats.find(c=>norm(c?.nome).includes(norm(name))||norm(name).includes(norm(c?.nome)))||null}
function findProduct(d,spec){return A(d?.produtos).find(p=>norm(p?.nome)===norm(spec.nome))||A(d?.produtos).find(p=>norm(p?.nome).includes(norm(spec.nome))||norm(spec.nome).includes(norm(p?.nome)))||A(d?.produtos).find(p=>S(p?.codigo)===S(spec.codigo))||null}
function catalogFingerprint(){
 const d=currentDb();
 return JSON.stringify(A(d?.produtos).map(p=>({
  id:S(p?.id||p?.codigo||p?.nome),status:S(p?.status||''),preco:N(p?.precoVenda),
  publicar:p?.ecommerce?.publicar===true,categoriaId:S(p?.ecommerce?.categoriaId||''),
  precoEcommerce:N(p?.ecommerce?.precoEcommerce),quantidadeMinima:N(p?.ecommerce?.quantidadeMinima),
  limitePedido:N(p?.ecommerce?.limitePedido),disponibilidade:S(p?.ecommerce?.disponibilidade||''),
  antecedenciaDias:N(p?.ecommerce?.antecedenciaDias),imagem:S(p?.ecommerce?.imagem||''),
  imagens:A(p?.ecommerce?.imagens).map(S)
 })).sort((a,b)=>a.id.localeCompare(b.id)));
}

function isData(x){return /^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(S(x))}
function isInlineSvg(x){return /^data:image\/svg\+xml(?:;charset=[^,]+)?,/i.test(S(x))}
function isBlob(x){return /^blob:/i.test(S(x))}
function stableUrl(x){const v=S(x).trim();return /^https?:\/\//i.test(v)}
function apiAdmin(path,opt={}){
 if(typeof adminFetch==='function')return adminFetch(path,opt);
 throw new Error('A conexão autenticada com a API ainda não foi carregada. Abra Configurações → Nuvem / API e teste a conexão.');
}
async function uploadOne(dataUrl,filename,productId=''){
 const r=await apiAdmin('/api/v1/admin/store/media',{method:'POST',body:JSON.stringify({dataUrl,filename,productId})});
 const url=S(r?.url).trim();
 if(!stableUrl(url))throw new Error('A API não devolveu uma URL permanente para a imagem.');
 return url;
}
async function ensureRemoteImages(cat){
 const d=currentDb();
 for(const cp of A(cat?.produtos)){
   const p=A(d?.produtos).find(x=>S(x?.id)===S(cp?.id))||A(d?.produtos).find(x=>S(x?.codigo)===S(cp?.codigo));
   const e=p?.ecommerce||{};
   const all=[...new Set([cp?.imagem,...A(cp?.imagens),e?.imagem,...A(e?.imagens)].map(S).filter(Boolean))].slice(0,5);
   const urls=[];
   for(let i=0;i<all.length;i++){
     const src=all[i];
     if(stableUrl(src)||isInlineSvg(src)){urls.push(src);continue}
     if(isBlob(src))throw new Error(`A foto de ${cp?.nome||cp?.codigo||'um produto'} ainda é temporária. Selecione a foto novamente para enviá-la ao servidor.`);
     if(isData(src)){
       const ext=(src.match(/^data:image\/([^;]+)/i)?.[1]||'webp').replace('jpeg','jpg');
       const url=await uploadOne(src,`${S(cp?.codigo||cp?.id||'produto')}_${i+1}.${ext}`,S(cp?.id||''));
       urls.push(url);
     }
   }
   cp.imagem=urls[0]||'';cp.imagens=urls.slice(0,5);
   if(p){p.ecommerce=p.ecommerce||{};p.ecommerce.imagem=cp.imagem;p.ecommerce.imagens=[...cp.imagens]}
 }
 persist();
 return cat;
}
async function authoritativePublish(silent=false){
 if(publishPromise)return publishPromise;
 publishPromise=(async()=>{
   const base=window.__johnPublicarEcomLocal;
   if(typeof base!=='function')throw new Error('O gerador local do catálogo ainda não foi carregado.');
   let cat=base(true)||{loja:{},produtos:[]};
   cat={...cat,produtos:A(cat.produtos).map(p=>({...p,imagens:[...A(p?.imagens)]}))};
   await ensureRemoteImages(cat);
   const result=await apiAdmin('/api/v1/admin/store/catalog',{method:'PUT',body:JSON.stringify({...cat,replaceCatalog:true,removedProductIds:[]})});
   try{localStorage.setItem('john_ecommerce_public_v1',JSON.stringify(cat))}catch(_){}
   try{await window.johnHydrateStorefrontFromServerV8225?.(true)}catch(e){console.warn('[John V8.22.5] hidratação pós-publicação:',e)}
   try{await window.johnV84Cloud?.loadOnline?.()}catch(_){}
   if(!silent)window.toast?.(`Catálogo publicado: ${result?.total??A(cat.produtos).length} produto(s). Todos os navegadores receberão esta mesma versão.`);
   try{window.dispatchEvent(new CustomEvent('john:ecommerce-sync',{detail:{source:'authoritative-publish',version:VERSION,total:A(cat.produtos).length}}))}catch(_){}
   lastSyncedFingerprint=catalogFingerprint();
   try{localStorage.setItem(SYNC_FP_KEY,lastSyncedFingerprint)}catch(_){}
   return cat;
 })().finally(()=>{publishPromise=null});
 return publishPromise;
}
async function syncPublished(reason){
  try{await authoritativePublish(true)}catch(e){console.warn('[John V8.22.5] publicar catálogo:',e);return {ok:false,reason,error:e?.message||String(e),at:now()}}
  try{if(typeof window.johnCloudCapturarAlteracoes==='function')await Promise.resolve(window.johnCloudCapturarAlteracoes())}catch(e){console.warn('[John V8.22.5] capturar alterações:',e)}
  try{if(typeof window.johnCloudFlushIncremental==='function')await Promise.resolve(window.johnCloudFlushIncremental(true))}catch(e){console.warn('[John V8.22.5] flush:',e)}
  lastSyncedFingerprint=catalogFingerprint();
  try{localStorage.setItem(SYNC_FP_KEY,lastSyncedFingerprint)}catch(_){}
  return {ok:true,reason,at:now()};
}
function schedulePublished(reason,delay=500){
 clearTimeout(syncTimer);
 syncTimer=setTimeout(async()=>{
  const fp=catalogFingerprint();
  if(fp&&fp===lastSyncedFingerprint)return;
  await syncPublished(reason);
 },delay);
}
async function ensure(requiredSync=false){
  const d=currentDb();if(!d||!Array.isArray(d.produtos))return {changed:0};
  let changed=0;
  for(const spec of REQUIRED){
    let p=findProduct(d,spec);const existed=!!p;
    if(!p){
      p={id:spec.id,codigo:A(d.produtos).some(x=>S(x.codigo)===spec.codigo)?nextCode(d):spec.codigo,nome:spec.nome,status:'ATIVO',unidade:spec.unidade,gtin:'',plu:'',temCaixa:false,embalagem:'',fator:1,custoInicial:0,precoVenda:spec.preco,margem:65,tipos:['Produto acabado'],associados:[],anexos:[],obs:spec.descricao,criadoEm:now(),atualizadoEm:now(),operadorAtualizacao:'John ERP V8.22.5'};
      d.produtos.push(p);changed++;
    }
    p.unidade=p.unidade||spec.unidade;
    p.precoVenda=N(p.precoVenda)>0?N(p.precoVenda):spec.preco;
    p.tipos=A(p.tipos).length?A(p.tipos):['Produto acabado'];
    const e=p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'&&!Array.isArray(p.ecommerce)?p.ecommerce:{};
    const cat=findCategory(d,spec.categoria);
    const before=JSON.stringify({status:p.status,publicar:e.publicar,categoriaId:e.categoriaId,categoria:e.categoria,preco:e.precoEcommerce,img:e.imagem,nome:e.nomeComercial,desc:e.descricao,min:e.quantidadeMinima});
    if(!existed)e.publicar=true;
    e.nomeComercial=e.nomeComercial||spec.nome;
    e.descricao=e.descricao||spec.descricao;
    e.precoEcommerce=N(e.precoEcommerce)>0?N(e.precoEcommerce):spec.preco;
    e.precoModo=e.precoModo||'ECOMMERCE';e.precoOrigem=e.precoOrigem||'CADASTRO_PRODUTO';
    e.disponibilidade=e.disponibilidade||'AMBOS';
    e.quantidadeMinima=N(e.quantidadeMinima)>0?N(e.quantidadeMinima):1;
    e.limitePedido=N(e.limitePedido)>=0?N(e.limitePedido):0;
    e.antecedenciaDias=Math.max(0,Math.round(N(e.antecedenciaDias)));
    if(cat){e.categoriaId=S(cat.id);e.categoria=S(cat.nome)}else{e.categoria=S(e.categoria||spec.categoria)}
    const imgs=[...new Set([e.imagem,...A(e.imagens),spec.imagem].filter(Boolean))].slice(0,5);
    e.imagem=imgs[0]||spec.imagem;e.imagens=imgs;
    const after=JSON.stringify({status:p.status,publicar:e.publicar,categoriaId:e.categoriaId,categoria:e.categoria,preco:e.precoEcommerce,img:e.imagem,nome:e.nomeComercial,desc:e.descricao,min:e.quantidadeMinima});
    if(before!==after){p.atualizadoEm=now();changed++;}
  }
  if(changed){persist();try{window.renderEcomProducts?.()}catch(_){}try{window.renderOnline?.()}catch(_){}try{window.johnV8RenderProducts?.()}catch(_){} if(requiredSync)await syncPublished('required-products')}
  return {changed,activeProducts:A(d.produtos).filter(p=>p?.ecommerce?.publicar===true&&S(p?.status||'ATIVO').toUpperCase()!=='INATIVO').length};
}
function installSaveHook(){
 const original=window.save;
 if(typeof original!=='function'||original.__johnCatalogSync8225)return false;
 const wrapped=function(){const r=original.apply(this,arguments);schedulePublished('erp-save',350);return r};
 wrapped.__johnCatalogSync8225=true;window.save=wrapped;return true;
}
function bindPublishButtons(){
 const fn=()=>authoritativePublish(false).catch(e=>{console.error(e);alert('Falha ao publicar: '+e.message)});
 for(const id of ['catPublicarV4','on88Publish','ac85Publish']){const b=document.getElementById(id);if(b&&!b.dataset.johnAuthoritative8225){b.dataset.johnAuthoritative8225='1';b.onclick=fn}}
 if(window.JohnV880&&window.JohnV880.canonicalPublish!==authoritativePublish)window.JohnV880.canonicalPublish=authoritativePublish;
 window.johnV880Publish=authoritativePublish;
 window.publicarCatalogoEcommerce=function(silent=false){return authoritativePublish(silent)};
}
function boot(){
 ensure(false).then(()=>schedulePublished('startup-reconcile',250)).catch(console.warn);
 bindPublishButtons();
 [0,300,900,1800,3500,7000].forEach(ms=>setTimeout(()=>{installSaveHook();bindPublishButtons()},ms));
}
window.JohnCaseirinhoCatalogSync821={version:VERSION,ensure,syncPublished,schedulePublished,catalogFingerprint,required:REQUIRED,publish:authoritativePublish,ensureRemoteImages};
window.JohnCaseirinhoCatalogSync825=window.JohnCaseirinhoCatalogSync821;
window.addEventListener('john:storefront-hydrated',()=>setTimeout(()=>ensure(true).catch(console.warn),120));
window.addEventListener('john:cloud-applied',()=>setTimeout(()=>ensure(false).catch(console.warn),160));
document.addEventListener('click',()=>setTimeout(bindPublishButtons,0),true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,700),{once:true});else setTimeout(boot,700);
})();
