(function(){
'use strict';
if(window.__JOHN_SERVER_CATALOG_HYDRATION_8224__)return;
window.__JOHN_SERVER_CATALOG_HYDRATION_8224__=true;

const VERSION='8.22.4';
const DEFAULT_API='https://john-cloud-api-production.up.railway.app';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const N=v=>Number(v)||0;
let running=null,lastFingerprint='';

function parse(v,fallback={}){try{const x=JSON.parse(v);return x&&typeof x==='object'?x:fallback}catch(_){return fallback}}
function config(){const c=parse(localStorage.getItem('john_cloud_config_v1')||'{}',{});return{apiUrl:S(c.apiUrl||DEFAULT_API).replace(/\/+$/,''),slug:S(window.__JOHN_TENANT__?.slug||c.storeSlug||'caseirinho').trim().toLowerCase()}}
function currentDb(){try{return typeof db!=='undefined'&&db&&typeof db==='object'?db:(window.db||null)}catch(_){return window.db||null}}
function fingerprint(cat){return [cat?.version||'',cat?.publishedAt||cat?.publicadoEm||'',A(cat?.produtos).length,A(cat?.loja?.categorias).length].join('|')}
function saveLocal(d){try{const key=typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1';(typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage).setItem(key,JSON.stringify(d))}catch(e){console.warn('[John V8.22.4] persistência local:',e)}}
function normalizeCategory(c,i){return{id:S(c?.id||('CAT_'+(i+1))),nome:S(c?.nome||c?.name||'Categoria'),descricao:S(c?.descricao||''),emoji:S(c?.emoji||'✨'),ordem:Number.isFinite(Number(c?.ordem))?Number(c.ordem):(i+1),ativo:c?.ativo!==false,geral:S(c?.id).toUpperCase()==='GERAL'||c?.geral===true}}
function matchProduct(d,cp){const id=S(cp?.id||cp?.produtoId),code=S(cp?.codigo);return A(d?.produtos).find(p=>S(p?.id)===id)||A(d?.produtos).find(p=>code&&S(p?.codigo)===code)||null}
function canonicalizeProduct(p,cp,cats){
 const e=p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'&&!Array.isArray(p.ecommerce)?p.ecommerce:{};
 const catId=S(cp?.categoriaId||'');const cat=cats.find(c=>S(c.id)===catId);
 const imgs=[...new Set([cp?.imagem,...A(cp?.imagens)].map(S).filter(x=>x&& !/^blob:/i.test(x)&& !/^data:/i.test(x)))].slice(0,5);
 e.publicar=true;
 e.categoriaId=catId&&catId.toUpperCase()!=='GERAL'?catId:'';
 e.categoria=e.categoriaId?S(cp?.categoria||cat?.nome||''):'';
 e.nomeComercial=S(cp?.nomeComercial||cp?.nome||p.nome||'');
 e.descricao=S(cp?.descricao||'');
 e.precoEcommerce=N(cp?.precoEcommerce||cp?.preco||0);
 e.precoModo=S(cp?.precoModo||'ECOMMERCE');
 e.precoOrigem=S(cp?.precoOrigem||'ECOMMERCE');
 e.quantidadeMinima=Math.max(.0001,N(cp?.quantidadeMinima)||1);
 e.limitePedido=Math.max(0,N(cp?.limitePedido));
 e.disponibilidade=S(cp?.disponibilidade||'AMBOS');
 e.antecedenciaDias=Math.max(0,Math.round(N(cp?.antecedenciaDias)));
 e.destaque=cp?.destaque===true;
 e.novidade=cp?.novidade===true;
 e.imagem=imgs[0]||'';
 e.imagens=imgs;
 return imgs.length>0;
}
function mergeCatalog(d,cat){
 d.config=d.config&&typeof d.config==='object'&&!Array.isArray(d.config)?d.config:{};
 d.config.ecommerce=d.config.ecommerce&&typeof d.config.ecommerce==='object'&&!Array.isArray(d.config.ecommerce)?d.config.ecommerce:{};
 const serverCats=A(cat?.loja?.categorias).map(normalizeCategory).filter(c=>c.id&&c.nome);
 d.config.ecommerce.categorias=serverCats;
 const matched=new Set();let products=0,images=0;
 for(const cp of A(cat?.produtos)){
   const p=matchProduct(d,cp);if(!p)continue;
   matched.add(S(p.id||p.codigo));
   if(canonicalizeProduct(p,cp,serverCats))images++;
   products++;
 }
 let unpublished=0;
 for(const p of A(d?.produtos)){
   const key=S(p?.id||p?.codigo);if(matched.has(key))continue;
   if(p?.ecommerce&&p.ecommerce.publicar===true){p.ecommerce.publicar=false;unpublished++}
 }
 d.config.ecommerce.nome=S(cat?.loja?.nome||d.config.ecommerce.nome||'');
 d.config.ecommerce.subtitulo=S(cat?.loja?.subtitulo||d.config.ecommerce.subtitulo||'');
 return{products,images,unpublished,categoryCount:serverCats.filter(c=>S(c.id).toUpperCase()!=='GERAL').length};
}
function rerender(){try{window.johnEcommerceCategoriasV4?.render?.()}catch(_){}try{if(typeof renderEcomProducts==='function')renderEcomProducts()}catch(_){}try{if(typeof renderOnline==='function')renderOnline()}catch(_){}try{if(typeof renderProducts==='function'&&document.querySelector('#produtos:not(.hidden)'))renderProducts()}catch(_){}}
async function fetchCatalog(){const c=config();const r=await fetch(c.apiUrl+'/api/v1/public/store/'+encodeURIComponent(c.slug)+'/catalog?_john8224='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-store','Pragma':'no-cache'}});let j={};try{j=await r.json()}catch(_){}if(!r.ok)throw new Error(j?.error||('HTTP '+r.status));return j}
async function hydrate(force=false){
 if(running)return running;
 running=(async()=>{const d=currentDb();if(!d)throw new Error('Base do ERP ainda não foi carregada.');const cat=await fetchCatalog();const fp=fingerprint(cat);if(!force&&fp&&fp===lastFingerprint)return{skipped:true};const result=mergeCatalog(d,cat);lastFingerprint=fp;saveLocal(d);rerender();window.dispatchEvent(new CustomEvent('john:storefront-hydrated',{detail:{version:VERSION,authoritative:true,...result}}));return result})().finally(()=>{running=null});
 return running;
}
window.johnHydrateStorefrontFromServerV819=hydrate;
window.johnHydrateStorefrontFromServerV8224=hydrate;
function schedule(force=false,ms=250){setTimeout(()=>hydrate(force).catch(e=>console.warn('[John V8.22.4] hidratação do catálogo:',e)),ms)}
window.addEventListener('john:session-ready',()=>schedule(true,250));
window.addEventListener('john:cloud-applied',()=>schedule(true,300));
document.addEventListener('DOMContentLoaded',()=>schedule(true,900));
})();
