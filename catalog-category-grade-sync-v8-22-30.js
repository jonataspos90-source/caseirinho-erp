(function(){
'use strict';
if(window.__JOHN_CATALOG_CATEGORY_GRADE_SYNC_82231__)return;
window.__JOHN_CATALOG_CATEGORY_GRADE_SYNC_82231__=true;

const VERSION='8.22.31';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
let basePublish=null;
let publishing=null;

function storage(){try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}catch(_){return localStorage}}
function dbRef(){try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){};try{return window.db||null}catch(_){return null}}
function dbKey(){try{return typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1'}catch(_){return'pcp_app_v1'}}
function persist(){const d=dbRef();if(!d)return false;try{storage().setItem(dbKey(),JSON.stringify(d));return true}catch(e){console.warn('[John '+VERSION+'] persistência:',e);return false}}
function categories(d){return A(d?.config?.ecommerce?.categorias).filter(c=>c&&c.ativo!==false&&S(c.id)&&S(c.nome))}
function grades(d){return A(d?.config?.ecommerce?.grades||d?.ecommerceGrades||d?.gradesEcommerce)}
function findCategory(d,data){
 const cs=categories(d),id=S(data?.categoriaId),name=norm(data?.categoria);
 return cs.find(c=>S(c.id)===id)||cs.find(c=>norm(c.nome)===name)||null;
}
function stamp(p){
 for(const v of [p?.atualizadoEm,p?.updatedAt,p?.updated_at,p?.criadoEm,p?.createdAt]){
   const t=Date.parse(S(v));if(Number.isFinite(t)&&t>0)return t;
 }
 return 0;
}
function normalizeGradeCategories(){
 const d=dbRef();if(!d||!Array.isArray(d.produtos))return 0;
 const byId=new Map(d.produtos.map(p=>[S(p?.id),p]).filter(([id])=>id));
 let changed=0;
 for(const g of grades(d)){
   if(!g||g.ativo===false)continue;
   const ids=A(g.variantes).map(v=>S(v?.produtoId)).filter(Boolean);if(!ids.length)continue;
   const candidates=[];
   for(const id of ids){
     const p=byId.get(id);if(!p)continue;
     const cat=findCategory(d,p?.ecommerce||{});if(!cat)continue;
     candidates.push({p,cat,ts:stamp(p),order:ids.indexOf(id)});
   }
   if(!candidates.length)continue;
   candidates.sort((a,b)=>b.ts-a.ts||a.order-b.order);
   const cat=candidates[0].cat;
   for(const id of ids){
     const p=byId.get(id);if(!p)continue;
     const e=p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'&&!Array.isArray(p.ecommerce)?p.ecommerce:{};
     if(S(e.categoriaId)!==S(cat.id)||S(e.categoria)!==S(cat.nome)){
       e.categoriaId=S(cat.id);e.categoria=S(cat.nome);
       p.atualizadoEm=new Date().toISOString();p.operadorAtualizacao='Categoria Loja '+VERSION;changed++;
     }
   }
 }
 if(changed){persist();try{window.renderEcomProducts?.();window.renderOnline?.()}catch(_){}}
 return changed;
}
async function flushLocal(){
 const changed=normalizeGradeCategories();
 try{if(typeof window.johnCloudCapturarAlteracoes==='function')await Promise.resolve(window.johnCloudCapturarAlteracoes())}catch(e){console.warn('[John '+VERSION+'] captura cloud:',e)}
 try{if(typeof window.johnCloudFlushIncremental==='function')await Promise.resolve(window.johnCloudFlushIncremental(true))}catch(e){console.warn('[John '+VERSION+'] flush cloud:',e)}
 return changed;
}
function captureBase(){
 // A entrada mais segura é a função original do serviço, não wrappers globais.
 // Os wrappers podem chamar orderedPublish novamente (ciclo / stack overflow).
 const direct=window.JohnCaseirinhoCatalogSync821?.publishDirect||
   window.JohnCaseirinhoCatalogSync825?.publishDirect;
 if(typeof direct==='function'&&direct!==orderedPublish&&!direct.__johnOrdered82231){
   basePublish=direct;return direct;
 }
 const candidates=[window.JohnCaseirinhoCatalogSync821?.publish,window.publicarCatalogoEcommerce,window.JohnV880?.canonicalPublish];
 for(const fn of candidates){
   if(typeof fn!=='function'||fn===orderedPublish||fn.__johnOrdered82231||fn.__johnCatalogWrapper82231)continue;
   // Nunca troque uma referência original já identificada por um wrapper tardio.
   if(typeof basePublish==='function'&&basePublish!==fn)return basePublish;
   basePublish=fn;return fn;
 }
 return basePublish;
}
async function orderedPublish(silent=false){
 if(publishing)return publishing;
 publishing=(async()=>{
   const fn=captureBase();if(typeof fn!=='function')throw new Error('Publicador do E-commerce ainda não foi carregado.');
   const normalized=await flushLocal();
   const result=await fn(!!silent);
   try{window.dispatchEvent(new CustomEvent('john:catalog-ordered-sync',{detail:{version:VERSION,gradeCategoriesNormalized:normalized}}))}catch(_){}
   return result;
 })().finally(()=>{publishing=null});
 return publishing;
}
orderedPublish.__johnOrdered82231=true;

function install(){
 captureBase();if(typeof basePublish!=='function')return false;
 window.publicarCatalogoEcommerce=orderedPublish;
 if(window.JohnCaseirinhoCatalogSync821)window.JohnCaseirinhoCatalogSync821.publish=orderedPublish;
 if(window.JohnV880)window.JohnV880.canonicalPublish=orderedPublish;
 if(window.JohnManagement822){
   window.JohnManagement822.syncEcommerce=async function(reason='management-82231'){
     const out=await orderedPublish(true);
     try{window.dispatchEvent(new CustomEvent('john:ecommerce-sync',{detail:{source:'management-82231',reason}}))}catch(_){}
     return out;
   };
 }
 return true;
}

[300,900,1800,3500,7500,12000].forEach(ms=>setTimeout(install,ms));
window.addEventListener('john:session-ready',()=>setTimeout(install,150));
window.addEventListener('john:cloud-applied',()=>setTimeout(install,150));
window.addEventListener('john:ecommerce-sync',()=>setTimeout(install,50));
window.JohnCatalogCategoryGradeSync82231={version:VERSION,install,flushLocal,normalizeGradeCategories,publish:orderedPublish};
})();
