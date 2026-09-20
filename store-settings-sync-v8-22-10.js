(function(){
'use strict';
if(window.__JOHN_STORE_SETTINGS_SYNC_82210__)return;
window.__JOHN_STORE_SETTINGS_SYNC_82210__=true;
const VERSION='8.22.10';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
let lastFp='',publishing=null,reconciling=null;
function storage(){try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}catch(_){return localStorage}}
function dbRef(){try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){};try{return window.db||null}catch(_){return null}}
function dbKey(){try{return typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1'}catch(_){return 'pcp_app_v1'}}
function saveDb(){const d=dbRef();if(!d)return;try{storage().setItem(dbKey(),JSON.stringify(d))}catch(_){} }
function cloudCfg(){let c={};try{c=JSON.parse(storage().getItem('john_cloud_config_v1')||'{}')||{}}catch(_){}return{apiUrl:S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),slug:S(c.storeSlug||'caseirinho')||'caseirinho'} }
function store(){const d=dbRef();return A(d?.lojas).find(x=>S(x?.padrao).toUpperCase()==='SIM'&&S(x?.status||'ATIVA').toUpperCase()!=='INATIVA')||A(d?.lojas).find(x=>S(x?.status||'ATIVA').toUpperCase()!=='INATIVA')||A(d?.lojas)[0]||null}
function pixCfg(){const d=dbRef();if(!d)return{};d.config=d.config&&typeof d.config==='object'?d.config:{};return d.config.impressaoPedidos=d.config.impressaoPedidos&&typeof d.config.impressaoPedidos==='object'?d.config.impressaoPedidos:{} }
function ts(v){const n=Date.parse(S(v));return Number.isFinite(n)?n:0}
function localUpdatedAt(){const l=store()||{},p=pixCfg();return Math.max(ts(l.atualizadoEm),ts(p.atualizadoEm))}
function remoteUpdatedAt(cat){return ts(cat?.publishedAt||cat?.publicadoEm||cat?.updatedAt||cat?.loja?.updatedAt)}
function fingerprint(){const l=store()||{},p=pixCfg();return JSON.stringify({store:[l.id,l.nome,l.telefone,l.whatsapp,l.email,l.endereco,l.numero,l.bairro,l.cidade,l.uf,l.cep,l.apresentacao,l.horarioFuncionamento,l.atualizadoEm],pix:[p.chavePix,p.pixNomeRecebedor,p.pixCidade,p.documento,p.documentoTipo,p.atualizadoEm]})}
async function cloudSync(){try{window.johnCloudCapturarAlteracoes?.();await window.johnCloudFlushIncremental?.(true)}catch(e){console.warn('[John '+VERSION+'] sync cloud:',e)} }
async function publish(){if(publishing)return publishing;publishing=(async()=>{await cloudSync();const fn=window.JohnV880?.canonicalPublish||window.publicarCatalogoEcommerce||window.JohnCaseirinhoCatalogSync821?.publish;if(typeof fn!=='function')throw new Error('Publicador do E-commerce não carregado.');const out=await fn(true);lastFp=fingerprint();return out})().finally(()=>{publishing=null});return publishing}
async function syncChanged(force=false){const fp=fingerprint();if(!force&&(!fp||fp===lastFp))return;try{await publish();window.dispatchEvent(new CustomEvent('john:store-settings-synced',{detail:{version:VERSION}}))}catch(e){console.warn('[John '+VERSION+'] publicação de dados da loja/PIX:',e)} }
async function fetchCatalog(){const c=cloudCfg();const r=await fetch(c.apiUrl+'/api/v1/public/store/'+encodeURIComponent(c.slug)+'/catalog?_settings='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-store','Pragma':'no-cache'}});let j={};try{j=await r.json()}catch(_){}if(!r.ok)throw new Error(j?.error||('HTTP '+r.status));return j}
function applyCatalog(cat){const d=dbRef();if(!d||!cat?.loja)return false;const remote=cat.loja,published=remoteUpdatedAt(cat);let changed=false;
 const l=store();if(l&&published>=ts(l.atualizadoEm)){
   const map={nome:remote.nome||remote.nomeLoja,razao:remote.razao,cnpj:remote.cnpj,telefone:remote.telefone,whatsapp:remote.whatsapp,email:remote.email,apresentacao:remote.apresentacao||remote.subtitulo,horarioFuncionamento:remote.horarioFuncionamento,cep:remote.cep,endereco:remote.endereco||remote.logradouro,numero:remote.numero,complemento:remote.complemento,bairro:remote.bairro,cidade:remote.cidade,uf:remote.uf};
   for(const [k,v] of Object.entries(map)){if(S(v)&&S(l[k])!==S(v)){l[k]=v;changed=true}}
 }
 const rp=remote.pix,p=pixCfg();if(rp&&published>=ts(p.atualizadoEm)){
   let pixChanged=false;
   if(S(rp.chave)&&S(p.chavePix)!==S(rp.chave)){p.chavePix=S(rp.chave);pixChanged=true}
   if(S(rp.nome)&&S(p.pixNomeRecebedor)!==S(rp.nome)){p.pixNomeRecebedor=S(rp.nome);pixChanged=true}
   if(S(rp.cidade)&&S(p.pixCidade)!==S(rp.cidade)){p.pixCidade=S(rp.cidade);pixChanged=true}
   if(pixChanged){p.atualizadoEm=cat.publishedAt||cat.publicadoEm||new Date().toISOString();changed=true}
 }
 if(changed){saveDb();try{window.renderLojas?.()}catch(_){};try{window.renderCamposPix?.()}catch(_){} }
 return changed
}
async function reconcile(){if(reconciling)return reconciling;reconciling=(async()=>{
  try{
    const cat=await fetchCatalog();
    const localTs=localUpdatedAt(),remoteTs=remoteUpdatedAt(cat);
    if(localTs>0&&localTs>remoteTs){
      lastFp='';
      await syncChanged(true);
      return 'LOCAL_PUBLISHED';
    }
    const changed=applyCatalog(cat);
    lastFp=fingerprint();
    return changed?'REMOTE_APPLIED':'IN_SYNC';
  }catch(e){
    console.warn('[John '+VERSION+'] reconciliação loja/PIX:',e);
    lastFp='';
    await syncChanged(true);
    return 'LOCAL_PUBLISHED_FALLBACK';
  }
 })().finally(()=>{reconciling=null});return reconciling}
function installWatch(){lastFp=fingerprint();setInterval(()=>syncChanged(false),1800);document.addEventListener('submit',e=>{if(e.target?.id==='lojaForm'){setTimeout(()=>syncChanged(false),400);setTimeout(()=>syncChanged(false),1800)}},true);document.addEventListener('click',e=>{const id=e.target?.id||'';if(id==='configSalvarImpressao'||id==='btnSalvarLojaFinal'){setTimeout(()=>syncChanged(false),1000);setTimeout(()=>syncChanged(false),3000)}},true)}
async function boot(){await reconcile();installWatch()}
window.JohnStoreSettingsSync82210={version:VERSION,reconcile,publish,syncChanged,fetchCatalog};
window.addEventListener('john:storefront-hydrated',()=>setTimeout(()=>reconcile(),250));
window.addEventListener('john:cloud-applied',()=>setTimeout(()=>reconcile(),300));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
})();
