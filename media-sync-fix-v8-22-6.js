(function(){
'use strict';
if(window.__JOHN_MEDIA_SYNC_FIX_8226__)return;
window.__JOHN_MEDIA_SYNC_FIX_8226__=true;

const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const CLOUD_KEY='john_cloud_config_v1';
const VERSION='8.22.6';

function storage(){
  try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}
  catch(_){return localStorage}
}
function parse(v,f={}){try{const x=JSON.parse(v||'null');return x&&typeof x==='object'?x:f}catch(_){return f}}
function cloudCfg(){
  const c=parse(storage().getItem(CLOUD_KEY)||'{}',{});
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
async function directAdminFetch(path,opt={}){
  const c=cloudCfg();
  if(!c.apiUrl||!c.apiKey)throw new Error('Sessão da API não disponível neste dispositivo.');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),45000);
  try{
    const r=await fetch(c.apiUrl+path,{
      ...opt,
      signal:opt.signal||controller.signal,
      cache:'no-store',
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
    if(err?.name==='AbortError')throw new Error('A API demorou mais de 45 segundos para responder.');
    throw err;
  }finally{clearTimeout(timer)}
}
function installAdminFallback(){
  try{if(typeof window.adminFetch!=='function')window.adminFetch=directAdminFetch}catch(_){}
}
function dbRef(){
  try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){}
  try{if(window.db&&typeof window.db==='object')return window.db}catch(_){}
  return null;
}
function dbKey(){try{return typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1'}catch(_){return 'pcp_app_v1'}}
function persistDb(d){
  if(!d)return false;
  try{storage().setItem(dbKey(),JSON.stringify(d));return true}catch(e){console.warn('[John '+VERSION+'] persistência:',e);return false}
}
function stableUrl(x){return /^https?:\/\//i.test(S(x).trim())}
function inlineSvg(x){return /^data:image\/svg\+xml/i.test(S(x).trim())}
function norm(x){return S(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()}
function fieldValue(ids){
  for(const id of ids){const el=document.getElementById(id);if(el&&S(el.value).trim())return S(el.value).trim()}
  return '';
}
function resolveProduct(){
  const d=dbRef();if(!d||!Array.isArray(d.produtos))return null;
  const id=fieldValue(['produtoId','pId','produto_id']);
  const code=fieldValue(['produtoCodigo','pCodigo','codigoProduto','produtoCode']);
  const name=fieldValue(['produtoNome','pNome','nomeProduto']);
  let p=null;
  if(id)p=d.produtos.find(x=>S(x?.id)===id)||null;
  if(!p&&code)p=d.produtos.find(x=>S(x?.codigo)===code)||null;
  if(!p&&name)p=[...d.produtos].reverse().find(x=>norm(x?.nome)===norm(name))||null;
  return p;
}
function galleryRemoteUrls(){
  const out=[];
  document.querySelectorAll('#produtoEcomGaleria [data-strict-media-url]').forEach(card=>{
    const u=S(card.dataset.strictMediaUrl||card.querySelector('img')?.src).trim();
    if(stableUrl(u)&&!out.includes(u))out.push(u);
  });
  const direct=S(document.getElementById('produtoEcomImagem')?.value).trim();
  if(stableUrl(direct)&&!out.includes(direct))out.push(direct);
  return out;
}
function matchingRequiredSpec(p){
  const sync=window.JohnCaseirinhoCatalogSync825||window.JohnCaseirinhoCatalogSync821;
  const req=A(sync?.required);
  return req.find(s=>S(s?.id)===S(p?.id)||S(s?.codigo)===S(p?.codigo)||norm(s?.nome)===norm(p?.nome))||null;
}
function cleanProductImages(p,preferred=[]){
  if(!p)return false;
  const e=p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'&&!Array.isArray(p.ecommerce)?p.ecommerce:{};
  const existing=[...new Set([e.imagem,...A(e.imagens)].map(S).filter(Boolean))];
  const remote=[...new Set([...preferred,...existing.filter(stableUrl)].filter(stableUrl))];
  let final;
  if(remote.length){
    final=[...remote,...existing.filter(x=>!stableUrl(x)&&!inlineSvg(x))];
  }else{
    final=existing;
  }
  final=[...new Set(final)].slice(0,5);
  const before=JSON.stringify({imagem:e.imagem||'',imagens:A(e.imagens)});
  e.imagem=final[0]||'';
  e.imagens=final;
  p.atualizadoEm=new Date().toISOString();
  if(remote.length){
    const spec=matchingRequiredSpec(p);
    if(spec)spec.imagem='';
  }
  return before!==JSON.stringify({imagem:e.imagem||'',imagens:A(e.imagens)});
}
function cleanupAllRemoteProducts(){
  const d=dbRef();if(!d||!Array.isArray(d.produtos))return 0;
  let changed=0;
  for(const p of d.produtos){
    const e=p?.ecommerce;
    if(!e)continue;
    const hasRemote=[e.imagem,...A(e.imagens)].some(stableUrl);
    if(hasRemote&&cleanProductImages(p,[]))changed++;
    else if(hasRemote){const spec=matchingRequiredSpec(p);if(spec)spec.imagem=''}
  }
  if(changed)persistDb(d);
  return changed;
}
function status(msg,error=false){
  const el=document.getElementById('produtoEcomUploadStatus');
  if(!el)return;
  el.textContent=msg;
  el.style.color=error?'#b42318':'#15803d';
}
async function publishNow(){
  installAdminFallback();
  const fn=window.publicarCatalogoEcommerce||window.JohnCaseirinhoCatalogSync825?.publish||window.JohnCaseirinhoCatalogSync821?.publish;
  if(typeof fn!=='function')return false;
  await fn(true);
  return true;
}
function attachUploadedImages(p,urls){
  if(!p||!urls.length)return false;
  const d=dbRef();
  cleanProductImages(p,urls);
  persistDb(d);
  try{if(typeof renderImages==='function')renderImages()}catch(_){}
  try{window.renderEcomProducts?.()}catch(_){}
  return true;
}
function installSubmitRescue(){
  if(document.documentElement.dataset.mediaSyncFix8226==='1')return;
  document.documentElement.dataset.mediaSyncFix8226='1';
  document.addEventListener('submit',ev=>{
    if(ev.target?.id!=='produtoForm')return;
    const p=resolveProduct();
    const urls=galleryRemoteUrls();
    if(!urls.length)return;
    if(p)attachUploadedImages(p,urls);
    setTimeout(async()=>{
      const target=p||resolveProduct();
      if(!target){status('A foto está no servidor, mas o produto não foi localizado para concluir o vínculo.',true);return}
      attachUploadedImages(target,urls);
      cleanupAllRemoteProducts();
      try{
        await publishNow();
        status(`${urls.length} foto(s) vinculada(s) e publicadas no E-commerce.`);
      }catch(err){
        console.error('[John '+VERSION+'] publicação após foto:',err);
        status('Foto vinculada ao produto, mas a publicação falhou: '+(err?.message||err),true);
      }
    },320);
  },true);
}
function reconcileSoon(){
  installAdminFallback();
  [60,250,650,1200].forEach(ms=>setTimeout(()=>cleanupAllRemoteProducts(),ms));
}

installAdminFallback();
installSubmitRescue();
reconcileSoon();
window.addEventListener('john:storefront-hydrated',()=>setTimeout(()=>{cleanupAllRemoteProducts();installAdminFallback()},180));
window.addEventListener('john:cloud-applied',()=>setTimeout(()=>{cleanupAllRemoteProducts();installAdminFallback()},180));
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{cleanupAllRemoteProducts();installAdminFallback();installSubmitRescue()},350),{once:true});
window.JohnMediaSyncFix8226={version:VERSION,reconcile:cleanupAllRemoteProducts,publish:publishNow};
})();
