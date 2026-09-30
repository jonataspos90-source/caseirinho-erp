(function(){
'use strict';
if(window.__JOHN_CATALOG_CATEGORY_GRADE_SYNC_82230__)return;
window.__JOHN_CATALOG_CATEGORY_GRADE_SYNC_82230__=true;

const VERSION='8.22.30';
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
function normalizeGradeCategories(){
 const d=dbRef();if(!d||!Array.isArray(d.produtos))return 0;
 const byId=new Map(d.produtos.map(p=>[S(p?.id),p]).filter(([id])=>id));
 let changed=0;
 for(const g of grades(d)){
   if(!g||g.ativo===false)continue;
   const ids=A(g.variantes).map(v=>S(v?.produtoId)).filter(Boolean);if(!ids.length)continue;
   const coverId=S(g.produtoCapaId)||ids[0];
   const cover=byId.get(coverId)||ids.map(id=>byId.get(id)).find(Boolean);if(!cover)continue;
   const sources=[cover,...ids.map(id=>byId.get(id)).filter(Boolean)];
   let cat=null;
   for(const p of sources){cat=findCategory(d,p?.ecommerce||{});if(cat)break}
   if(!cat)continue;
   for(const id of ids){
     const p=byId.get(id);if(!p)continue;
     const e=p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'&&!Array.isArray(p.ecommerce)?p.ecommerce:{};
     if(S(e.categoriaId)!==S(cat.id)||S(e.categoria)!==S(cat.nome)){
       e.categoriaId=S(cat.id);e.categoria=S(cat.nome);
       p.atualizadoEm=new Date().toISOString();p.operadorAtualizacao='Consistência Grade '+VERSION;changed++;
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
 const candidates=[window.publicarCatalogoEcommerce,window.JohnCaseirinhoCatalogSync821?.publish,window.JohnV880?.canonicalPublish];
 for(const fn of candidates){if(typeof fn==='function'&&!fn.__johnOrdered82230){basePublish=fn;return fn}}
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
orderedPublish.__johnOrdered82230=true;

function install(){
 captureBase();if(typeof basePublish!=='function')return false;
 window.publicarCatalogoEcommerce=orderedPublish;
 if(window.JohnCaseirinhoCatalogSync821)window.JohnCaseirinhoCatalogSync821.publish=orderedPublish;
 if(window.JohnV880)window.JohnV880.canonicalPublish=orderedPublish;
 if(window.JohnManagement822){
   window.JohnManagement822.syncEcommerce=async function(reason='management-82230'){
     const out=await orderedPublish(true);
     try{window.dispatchEvent(new CustomEvent('john:ecommerce-sync',{detail:{source:'management-82230',reason}}))}catch(_){}
     return out;
   };
 }
 return true;
}

[300,900,1800,3500,7500,12000].forEach(ms=>setTimeout(install,ms));
window.addEventListener('john:session-ready',()=>setTimeout(install,150));
window.addEventListener('john:cloud-applied',()=>setTimeout(install,150));
window.addEventListener('john:ecommerce-sync',()=>setTimeout(install,50));
window.JohnCatalogCategoryGradeSync82230={version:VERSION,install,flushLocal,normalizeGradeCategories,publish:orderedPublish};
})();
