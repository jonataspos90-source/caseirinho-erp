(function(){
'use strict';
if(window.__JOHN_STORE_SETTINGS_SYNC_8229__)return;
window.__JOHN_STORE_SETTINGS_SYNC_8229__=true;
const VERSION='8.22.9';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
let lastFp='',publishing=null,hydrating=null;
function storage(){try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}catch(_){return localStorage}}
function dbRef(){try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){};try{return window.db||null}catch(_){return null}}
function dbKey(){try{return typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1'}catch(_){return 'pcp_app_v1'}}
function saveDb(){const d=dbRef();if(!d)return;try{storage().setItem(dbKey(),JSON.stringify(d))}catch(_){} }
function cloudCfg(){let c={};try{c=JSON.parse(storage().getItem('john_cloud_config_v1')||'{}')||{}}catch(_){}return{apiUrl:S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),slug:S(c.storeSlug||'caseirinho')||'caseirinho'} }
function store(){const d=dbRef();return A(d?.lojas).find(x=>S(x?.padrao).toUpperCase()==='SIM'&&S(x?.status||'ATIVA').toUpperCase()!=='INATIVA')||A(d?.lojas).find(x=>S(x?.status||'ATIVA').toUpperCase()!=='INATIVA')||A(d?.lojas)[0]||null}
function pixCfg(){const d=dbRef();if(!d)return{};d.config=d.config&&typeof d.config==='object'?d.config:{};return d.config.impressaoPedidos=d.config.impressaoPedidos&&typeof d.config.impressaoPedidos==='object'?d.config.impressaoPedidos:{} }
function fingerprint(){const l=store()||{},p=pixCfg();return JSON.stringify({store:[l.id,l.nome,l.telefone,l.whatsapp,l.email,l.endereco,l.numero,l.bairro,l.cidade,l.uf,l.cep,l.apresentacao,l.horarioFuncionamento,l.atualizadoEm],pix:[p.chavePix,p.pixNomeRecebedor,p.pixCidade,p.documento,p.documentoTipo,p.atualizadoEm]})}
async function cloudSync(){try{window.johnCloudCapturarAlteracoes?.();await window.johnCloudFlushIncremental?.(true)}catch(e){console.warn('[John '+VERSION+'] sync cloud:',e)} }
async function publish(){if(publishing)return publishing;publishing=(async()=>{await cloudSync();const fn=window.JohnV880?.canonicalPublish||window.publicarCatalogoEcommerce||window.JohnCaseirinhoCatalogSync825?.publish;if(typeof fn!=='function')throw new Error('Publicador do E-commerce não carregado.');return await fn(true)})().finally(()=>{publishing=null});return publishing}
async function syncChanged(){const fp=fingerprint();if(!fp||fp===lastFp)return;lastFp=fp;try{await publish();window.dispatchEvent(new CustomEvent('john:store-settings-synced',{detail:{version:VERSION}}))}catch(e){console.warn('[John '+VERSION+'] publicação de dados da loja/PIX:',e)} }
async function fetchCatalog(){const c=cloudCfg();const r=await fetch(c.apiUrl+'/api/v1/public/store/'+encodeURIComponent(c.slug)+'/catalog?_settings='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-store','Pragma':'no-cache'}});let j={};try{j=await r.json()}catch(_){}if(!r.ok)throw new Error(j?.error||('HTTP '+r.status));return j}
function ts(v){const n=Date.parse(S(v));return Number.isFinite(n)?n:0}
function applyCatalog(cat){const d=dbRef();if(!d||!cat?.loja)return false;const remote=cat.loja,published=ts(cat.publishedAt||cat.publicadoEm||cat.updatedAt);let changed=false;
 const l=store();if(l&&published>=ts(l.atualizadoEm)){
   const map={nome:remote.nome||remote.nomeLoja,razao:remote.razao,cnpj:remote.cnpj,telefone:remote.telefone,whatsapp:remote.whatsapp,email:remote.email,apresentacao:remote.apresentacao||remote.subtitulo,horarioFuncionamento:remote.horarioFuncionamento,cep:remote.cep,endereco:remote.endereco||remote.logradouro,numero:remote.numero,complemento:remote.complemento,bairro:remote.bairro,cidade:remote.cidade,uf:remote.uf};
   for(const [k,v] of Object.entries(map)){if(S(v)&&S(l[k])!==S(v)){l[k]=v;changed=true}}
 }
 const rp=remote.pix,p=pixCfg();if(rp&&published>=ts(p.atualizadoEm)){
   if(S(rp.chave)&&S(p.chavePix)!==S(rp.chave)){p.chavePix=S(rp.chave);changed=true}
   if(S(rp.nome)&&S(p.pixNomeRecebedor)!==S(rp.nome)){p.pixNomeRecebedor=S(rp.nome);changed=true}
   if(S(rp.cidade)&&S(p.pixCidade)!==S(rp.cidade)){p.pixCidade=S(rp.cidade);changed=true}
   if(changed)p.atualizadoEm=cat.publishedAt||cat.publicadoEm||new Date().toISOString();
 }
 if(changed){saveDb();try{window.renderLojas?.()}catch(_){};try{window.renderCamposPix?.()}catch(_){} }
 return changed
}
async function hydrate(){if(hydrating)return hydrating;hydrating=(async()=>{try{const cat=await fetchCatalog();const changed=applyCatalog(cat);lastFp=fingerprint();return changed}catch(e){console.warn('[John '+VERSION+'] hidratação loja/PIX:',e);return false}})().finally(()=>{hydrating=null});return hydrating}
function installWatch(){lastFp=fingerprint();setInterval(()=>syncChanged(),1800);document.addEventListener('submit',e=>{if(e.target?.id==='lojaForm')setTimeout(()=>syncChanged(),350)},true);document.addEventListener('click',e=>{const id=e.target?.id||'';if(id==='configSalvarImpressao'||id==='btnSalvarLojaFinal')setTimeout(()=>syncChanged(),800)},true)}
function boot(){hydrate().finally(()=>installWatch())}
window.JohnStoreSettingsSync8229={version:VERSION,hydrate,publish,syncChanged};
window.addEventListener('john:storefront-hydrated',()=>setTimeout(()=>hydrate(),250));
window.addEventListener('john:cloud-applied',()=>setTimeout(()=>hydrate(),300));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,900),{once:true});else setTimeout(boot,900);
})();
