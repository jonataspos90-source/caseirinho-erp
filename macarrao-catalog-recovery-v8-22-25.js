(function(){
'use strict';
if(window.__JOHN_MACARRAO_RECOVERY_82225__)return;
window.__JOHN_MACARRAO_RECOVERY_82225__=true;

const VERSION='8.22.25.1';
const DEFAULT_API='https://john-cloud-api-production.up.railway.app';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const N=v=>Number(v)||0;
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return v}};

function currentDb(){try{return typeof db!=='undefined'&&db&&typeof db==='object'?db:(window.db||null)}catch(_){return window.db||null}}
function cfg(){let c={};try{c=JSON.parse(localStorage.getItem('john_cloud_config_v1')||'{}')||{}}catch(_){}return{api:S(c.apiUrl||DEFAULT_API).replace(/\/+$/,''),slug:S(window.__JOHN_TENANT__?.slug||c.storeSlug||'caseirinho').trim().toLowerCase()||'caseirinho'}}
function isMac(p){return /macarrao|talharim/.test(norm([p?.nome,p?.nomeComercial,p?.gradeNome,p?.categoria,p?.descricao,p?.variacaoLabel].filter(Boolean).join(' ')))}
function match(d,p){const id=S(p?.id||p?.produtoId),code=S(p?.codigo);return A(d?.produtos).find(x=>S(x?.id)===id)||A(d?.produtos).find(x=>code&&S(x?.codigo)===code)||null}
function copyGrade(t,p){for(const k of ['gradeId','gradeNome','gradeDescricao','gradeProdutoCapaId','gradeTipoOpcao','gradeTituloOpcao','gradePluralOpcao','variacaoId','variacaoLabel','variacaoOrdem'])if(p?.[k]!==undefined)t[k]=clone(p[k])}
function restoreProduct(d,p){const ts=new Date().toISOString();const e={publicar:true,categoriaId:S(p?.categoriaId||''),categoria:S(p?.categoria||''),nomeComercial:S(p?.nomeComercial||p?.nome||''),descricao:S(p?.descricao||''),precoEcommerce:N(p?.precoEcommerce||p?.preco),precoModo:S(p?.precoModo||'ECOMMERCE'),precoOrigem:S(p?.precoOrigem||'ECOMMERCE'),quantidadeMinima:Math.max(.0001,N(p?.quantidadeMinima)||1),limitePedido:Math.max(0,N(p?.limitePedido)),disponibilidade:S(p?.disponibilidade||'AMBOS'),antecedenciaDias:Math.max(0,Math.round(N(p?.antecedenciaDias))),destaque:p?.destaque===true,novidade:p?.novidade===true,imagem:S(p?.imagem||''),imagens:A(p?.imagens).filter(Boolean)};copyGrade(e,p);const x={id:S(p?.id||p?.produtoId),codigo:S(p?.codigo||''),nome:S(p?.nome||p?.nomeComercial||'Macarrão recuperado'),status:'ATIVO',ativo:true,unidade:S(p?.unidade||'UN'),gtin:S(p?.gtin||''),plu:S(p?.plu||''),temCaixa:false,embalagem:S(p?.embalagem||''),fator:N(p?.fator)||1,custoInicial:N(p?.custoInicial||p?.custo),precoVenda:N(p?.precoVenda||p?.preco),margem:N(p?.margem),tipos:A(p?.tipos).length?clone(p.tipos):['Produto acabado'],associados:A(p?.associados),anexos:A(p?.anexos),obs:S(p?.obs||p?.descricao||''),criadoEm:ts,atualizadoEm:ts,operadorAtualizacao:'John ERP '+VERSION,ecommerce:e};copyGrade(x,p);d.produtos.push(x);return x}
function persist(d){try{const key=typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1';(typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage).setItem(key,JSON.stringify(d));return true}catch(e){console.warn('[John '+VERSION+'] persistência:',e);return false}}
function rerender(){for(const fn of ['renderProducts','johnV8RenderProducts','renderEcomProducts','renderOnline']){try{if(typeof window[fn]==='function')window[fn]()}catch(_){}}}
async function catalog(){const c=cfg(),r=await fetch(c.api+'/api/v1/public/store/'+encodeURIComponent(c.slug)+'/catalog?_mac_recovery='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-store','Pragma':'no-cache'}});let j={};try{j=await r.json()}catch(_){}if(!r.ok)throw new Error(j?.error||('HTTP '+r.status));return j}
async function recover(){const d=currentDb();if(!d||!Array.isArray(d.produtos))return{ok:false,reason:'db-not-ready'};const cat=await catalog(),published=A(cat?.produtos).filter(isMac),restored=[];for(const p of published){if(!match(d,p))restored.push(restoreProduct(d,p))}d.config=d.config&&typeof d.config==='object'&&!Array.isArray(d.config)?d.config:{};d.config.ecommerce=d.config.ecommerce&&typeof d.config.ecommerce==='object'&&!Array.isArray(d.config.ecommerce)?d.config.ecommerce:{};d.config.ecommerce.grades=A(d.config.ecommerce.grades);const wanted=new Set(published.map(p=>S(p?.gradeId)).filter(Boolean));let grades=0;for(const g of A(cat?.loja?.grades)){const id=S(g?.id);if(id&&wanted.has(id)&&!d.config.ecommerce.grades.some(x=>S(x?.id)===id)){d.config.ecommerce.grades.push(clone(g));grades++}}if(restored.length||grades){persist(d);rerender();try{window.dispatchEvent(new CustomEvent('john:macarrao-recovered',{detail:{version:VERSION,restored:restored.length,grades,names:restored.map(x=>x.nome)}}))}catch(_){}console.info('[John '+VERSION+'] macarrões recuperados:',restored.map(x=>x.nome))}return{ok:true,published:published.length,restored:restored.length,grades,names:restored.map(x=>x.nome)}}
function schedule(ms){setTimeout(()=>recover().catch(e=>console.warn('[John '+VERSION+'] recuperação de macarrões:',e)),ms)}
function loadCatalogConsistency(){
 if(window.__JOHN_CATALOG_CATEGORY_GRADE_SYNC_82230__||document.querySelector('script[data-john-catalog-82230]'))return;
 const s=document.createElement('script');s.src='./catalog-category-grade-sync-v8-22-30.js?v=82230';s.async=false;s.dataset.johnCatalog82230='1';
 s.onerror=()=>console.warn('[John '+VERSION+'] não foi possível carregar a consistência de categoria/grade V8.22.30.');
 (document.head||document.documentElement).appendChild(s);
}
window.JohnMacarraoRecovery82225={version:VERSION,recover};
loadCatalogConsistency();
window.addEventListener('john:session-ready',()=>{loadCatalogConsistency();schedule(300)});
window.addEventListener('john:cloud-applied',()=>{loadCatalogConsistency();schedule(500)});
document.addEventListener('DOMContentLoaded',()=>{loadCatalogConsistency();schedule(1200)});
[2500,5000].forEach(schedule);
})();
