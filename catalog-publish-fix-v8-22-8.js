(function(){
'use strict';
if(window.__JOHN_CATALOG_PUBLISH_FIX_8228__)return;
window.__JOHN_CATALOG_PUBLISH_FIX_8228__=true;

const VERSION='8.22.8';
const CLOUD_KEY='john_cloud_config_v1';
let catalogPutPromise=null;
const S=v=>String(v??'');

function storage(){
  try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}
  catch(_){return localStorage}
}
function cfg(){
  let c={};
  try{c=JSON.parse(storage().getItem(CLOUD_KEY)||'{}')||{}}catch(_){}
  return {
    apiUrl:S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),
    apiKey:S(c.apiKey),
    storeSlug:S(c.storeSlug||'caseirinho')||'caseirinho'
  };
}
function currentUser(){
  try{if(typeof usuarioAtual==='function'){const u=usuarioAtual();return S(u?.nome||u?.login||'ERP-Ecommerce')||'ERP-Ecommerce'}}catch(_){}
  return 'ERP-Ecommerce';
}
async function request(path,opt={}){
  const c=cfg();
  if(!c.apiUrl||!c.apiKey)throw new Error('Sessão da API não disponível neste dispositivo.');
  const controller=new AbortController();
  const timeoutMs=path.includes('/admin/store/catalog')?120000:60000;
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const r=await fetch(c.apiUrl+path,{
      ...opt,
      cache:'no-store',
      signal:opt.signal||controller.signal,
      headers:{
        'Content-Type':'application/json',
        'Authorization':'Bearer '+c.apiKey,
        'X-ERP-User':currentUser(),
        ...(opt.headers||{})
      }
    });
    let d={};try{d=await r.json()}catch(_){}
    if(!r.ok)throw new Error(d?.error||('HTTP '+r.status));
    return d;
  }catch(err){
    if(err?.name==='AbortError'){
      throw new Error(path.includes('/admin/store/catalog')
        ?'A publicação está demorando mais de 2 minutos. Tente novamente sem fechar o aplicativo.'
        :'A API demorou para responder. Tente novamente.');
    }
    throw err;
  }finally{clearTimeout(timer)}
}

async function robustAdminFetch(path,opt={}){
  const method=S(opt?.method||'GET').toUpperCase();
  const isCatalogPut=method==='PUT'&&path.includes('/api/v1/admin/store/catalog');
  if(!isCatalogPut)return request(path,opt);
  if(catalogPutPromise)return catalogPutPromise;
  catalogPutPromise=request(path,opt).finally(()=>{catalogPutPromise=null});
  return catalogPutPromise;
}

function install(){
  window.adminFetch=robustAdminFetch;
  if(window.JohnMediaSyncFix8226){
    window.JohnMediaSyncFix8226.publish=async function(){
      const fn=window.publicarCatalogoEcommerce||window.JohnCaseirinhoCatalogSync825?.publish||window.JohnCaseirinhoCatalogSync821?.publish;
      if(typeof fn!=='function')return false;
      await fn(true);
      return true;
    };
  }
}

install();
[250,700,1500,3000,6000].forEach(ms=>setTimeout(install,ms));
window.addEventListener('john:session-ready',()=>setTimeout(install,100));
window.addEventListener('john:cloud-applied',()=>setTimeout(install,100));
window.JohnCatalogPublishFix8228={version:VERSION,adminFetch:robustAdminFetch};
})();
