(function(){
'use strict';
if(window.__JOHN_SERVER_CATALOG_HYDRATION_8190__)return;
window.__JOHN_SERVER_CATALOG_HYDRATION_8190__=true;

const VERSION='8.19.0';
const DEFAULT_API='https://john-cloud-api-production.up.railway.app';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const N=v=>Number(v)||0;
let running=null,lastFingerprint='';

function parse(v,fallback={}){try{const x=JSON.parse(v);return x&&typeof x==='object'?x:fallback}catch(_){return fallback}}
function config(){
  const c=parse(localStorage.getItem('john_cloud_config_v1')||'{}',{});
  return {
    apiUrl:S(c.apiUrl||DEFAULT_API).replace(/\/+$/,''),
    slug:S(window.__JOHN_TENANT__?.slug||c.storeSlug||'caseirinho').trim().toLowerCase()
  };
}
function currentDb(){try{return typeof db!=='undefined'&&db&&typeof db==='object'?db:null}catch(_){return null}}
function fingerprint(cat){return [cat?.version||'',cat?.publishedAt||cat?.publicadoEm||'',A(cat?.produtos).length,A(cat?.loja?.categorias).length].join('|')}
function saveLocal(d){
  try{
    if(typeof DB_KEY!=='undefined')localStorage.setItem(DB_KEY,JSON.stringify(d));
    else localStorage.setItem('pcp_app_v1',JSON.stringify(d));
  }catch(e){console.warn('[John V8.19] persistência local:',e)}
}
function normalizeCategory(c,i){
  return {
    id:S(c?.id||('CAT_'+(i+1))),
    nome:S(c?.nome||c?.name||'Categoria'),
    descricao:S(c?.descricao||''),
    emoji:S(c?.emoji||'✨'),
    ordem:Number.isFinite(Number(c?.ordem))?Number(c.ordem):(i+1),
    ativo:c?.ativo!==false,
    geral:S(c?.id).toUpperCase()==='GERAL'||c?.geral===true
  };
}
function generalCategory(d){
  const old=A(d?.config?.ecommerce?.categorias).find(c=>S(c?.id).toUpperCase()==='GERAL');
  const active=typeof d?.ecommerceGeralControl?.ativo==='boolean'?d.ecommerceGeralControl.ativo:(old?.ativo===true);
  return {id:'GERAL',nome:'Geral',descricao:'Ver todo o catálogo em uma única visão.',emoji:'🛍️',ordem:0,ativo:active,geral:true};
}
function matchProduct(d,cp){
  const id=S(cp?.id||cp?.produtoId);
  const code=S(cp?.codigo);
  return A(d?.produtos).find(p=>S(p?.id)===id)||A(d?.produtos).find(p=>code&&S(p?.codigo)===code)||null;
}
function mergeCatalog(d,cat){
  d.config=d.config&&typeof d.config==='object'&&!Array.isArray(d.config)?d.config:{};
  d.config.ecommerce=d.config.ecommerce&&typeof d.config.ecommerce==='object'&&!Array.isArray(d.config.ecommerce)?d.config.ecommerce:{};

  const serverCats=A(cat?.loja?.categorias).map(normalizeCategory).filter(c=>c.id&&c.nome);
  const nonGeneral=serverCats.filter(c=>c.id.toUpperCase()!=='GERAL'&&!c.geral);
  const general=serverCats.find(c=>c.id.toUpperCase()==='GERAL'||c.geral)||generalCategory(d);
  d.config.ecommerce.categorias=[{...general,id:'GERAL',nome:'Geral',ordem:0,geral:true},...nonGeneral];

  let products=0,images=0,categories=0;
  for(const cp of A(cat?.produtos)){
    const p=matchProduct(d,cp);if(!p)continue;
    const e=p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'&&!Array.isArray(p.ecommerce)?p.ecommerce:{};
    const catId=S(cp?.categoriaId);
    const catName=S(cp?.categoria);
    if(catId&&catId.toUpperCase()!=='GERAL'){
      e.categoriaId=catId;e.categoria=catName||nonGeneral.find(c=>S(c.id)===catId)?.nome||e.categoria||'';categories++;
    }
    const imgs=[...new Set([cp?.imagem,...A(cp?.imagens)].map(S).filter(Boolean))].slice(0,5);
    if(imgs.length){e.imagem=imgs[0];e.imagens=imgs;images++;}
    e.publicar=true;
    if(!(N(e.precoEcommerce)>0)&&N(cp?.preco)>0)e.precoEcommerce=N(cp.preco);
    products++;
  }
  return {products,images,categories,categoryCount:nonGeneral.length};
}
function rerender(){
  try{window.johnEcommerceCategoriasV4?.render?.()}catch(_){}
  try{if(typeof renderEcomProducts==='function')renderEcomProducts()}catch(_){}
  try{if(typeof renderOnline==='function')renderOnline()}catch(_){}
  try{if(typeof renderProducts==='function'&&document.querySelector('#produtos:not(.hidden)'))renderProducts()}catch(_){}
}
function installButton(){
  const publish=document.getElementById('catPublicarV4');
  if(!publish||document.getElementById('johnReloadServerCatalog819'))return;
  const b=document.createElement('button');b.id='johnReloadServerCatalog819';b.type='button';b.className='btn secondary';b.textContent='↻ Recarregar categorias e fotos do servidor';
  b.onclick=async()=>{b.disabled=true;const old=b.textContent;b.textContent='Recarregando…';try{const r=await hydrate(true);window.toast?.(`Servidor restaurado: ${r.categoryCount} categorias, ${r.images} produto(s) com foto.`)}catch(e){alert('Não foi possível recarregar o catálogo: '+e.message)}finally{b.disabled=false;b.textContent=old}};
  publish.parentElement?.insertBefore(b,publish);
}
async function fetchCatalog(){
  const c=config();
  const r=await fetch(c.apiUrl+'/api/v1/public/store/'+encodeURIComponent(c.slug)+'/catalog?_john819='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-store'}});
  let j={};try{j=await r.json()}catch(_){}
  if(!r.ok)throw new Error(j?.error||('HTTP '+r.status));
  return j;
}
async function hydrate(force=false){
  if(running)return running;
  running=(async()=>{
    const d=currentDb();if(!d)throw new Error('Base do ERP ainda não foi carregada.');
    const cat=await fetchCatalog();
    const fp=fingerprint(cat);
    if(!force&&fp&&fp===lastFingerprint){installButton();return {skipped:true,categoryCount:A(cat?.loja?.categorias).filter(c=>S(c?.id).toUpperCase()!=='GERAL').length,images:A(cat?.produtos).filter(p=>p?.imagem||A(p?.imagens).length).length};}
    const result=mergeCatalog(d,cat);
    lastFingerprint=fp;
    try{localStorage.setItem('john_ecommerce_public_v1',JSON.stringify(cat))}catch(_){}
    saveLocal(d);
    rerender();installButton();
    window.dispatchEvent(new CustomEvent('john:storefront-hydrated',{detail:{version:VERSION,...result}}));
    return result;
  })().finally(()=>{running=null});
  return running;
}
window.johnHydrateStorefrontFromServerV819=hydrate;

function schedule(force=false,ms=250){setTimeout(()=>hydrate(force).catch(e=>console.warn('[John V8.19] hidratação do catálogo:',e)),ms)}
window.addEventListener('john:session-ready',()=>schedule(true,250));
window.addEventListener('john:cloud-applied',()=>schedule(false,300));
document.addEventListener('DOMContentLoaded',()=>{schedule(false,900);setTimeout(installButton,1400)});
document.addEventListener('click',e=>{const id=e.target?.closest?.('[data-page]')?.dataset?.page;if(['ecommerceCategorias','ecomProducts','onlineProducts','ecommerceProdutosOnline'].includes(id||'')){schedule(false,120);setTimeout(installButton,180)}} ,true);
})();
