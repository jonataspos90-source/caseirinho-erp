(function(){
'use strict';
if(window.__JOHN_STORE_SETTINGS_SYNC_82213__)return;
window.__JOHN_STORE_SETTINGS_SYNC_82213__=true;
const VERSION='8.22.13';
const S=v=>String(v??''),A=v=>Array.isArray(v)?v:[];
let lastFp='',publishing=null,reconciling=null;
function storage(){try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}catch(_){return localStorage}}
function dbRef(){try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){};try{return window.db||null}catch(_){return null}}
function dbKey(){try{return typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1'}catch(_){return'pcp_app_v1'}}
function saveDb(){const d=dbRef();if(!d)return;try{storage().setItem(dbKey(),JSON.stringify(d))}catch(_){} }
function cloudCfg(){let c={};try{c=JSON.parse(storage().getItem('john_cloud_config_v1')||'{}')||{}}catch(_){}return{apiUrl:S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),slug:S(c.storeSlug||'caseirinho')||'caseirinho'} }
function store(){const d=dbRef();return A(d?.lojas).find(x=>S(x?.padrao).toUpperCase()==='SIM'&&S(x?.status||'ATIVA').toUpperCase()!=='INATIVA')||A(d?.lojas).find(x=>S(x?.status||'ATIVA').toUpperCase()!=='INATIVA')||A(d?.lojas)[0]||null}
function pixCfg(){const d=dbRef();if(!d)return{};d.config=d.config&&typeof d.config==='object'?d.config:{};return d.config.impressaoPedidos=d.config.impressaoPedidos&&typeof d.config.impressaoPedidos==='object'?d.config.impressaoPedidos:{} }
function first(...vals){for(const v of vals){if(S(v).trim())return S(v).trim()}return''}
function storePix(l=store()){
  if(!l)return{};
  const p=l.pix&&typeof l.pix==='object'?l.pix:(l.pagamentoPix&&typeof l.pagamentoPix==='object'?l.pagamentoPix:(l.pixConfig&&typeof l.pixConfig==='object'?l.pixConfig:{}));
  const chave=first(p.chave,p.key,p.chavePix,l.chavePix,l.pixChave,l.chave_pix,l.chavePIX,l.pixKey);
  const nome=first(p.nome,p.recebedor,p.nomeRecebedor,l.pixNomeRecebedor,l.nomeRecebedorPix,l.pixNome,l.recebedorPix,l.nome,l.razao);
  const cidade=first(p.cidade,l.pixCidade,l.cidadePix,l.cidade);
  const documento=first(p.documento,p.cpfCnpj,l.pixDocumento,l.documentoPix,l.cpfCnpjPix);
  const documentoTipo=first(p.documentoTipo,p.tipoDocumento,l.pixDocumentoTipo,l.tipoDocumentoPix);
  return{chave,nome,cidade,documento,documentoTipo};
}
function normalizeDoc(x){const raw=S(x.chave).trim(),digits=raw.replace(/\D/g,''),isDoc=(digits.length===11||digits.length===14)&&S(raw).replace(/[\d.\-\/\s]/g,'')==='';if(isDoc){x.documento=digits;x.documentoTipo=digits.length===11?'CPF':'CNPJ'}return x}
function applyStorePixToPrint(){const sp=normalizeDoc(storePix()),p=pixCfg();let changed=false;const map={chavePix:sp.chave,pixNomeRecebedor:sp.nome,pixCidade:sp.cidade,documento:sp.documento,documentoTipo:sp.documentoTipo};for(const[k,v]of Object.entries(map)){if(S(p[k])!==S(v)){p[k]=v;changed=true}}if(changed){p.origem='CADASTRO_LOJA';p.atualizadoEm=new Date().toISOString();saveDb();try{window.renderCamposPix?.()}catch(_){}}return changed}
function fingerprint(){const l=store()||{},sp=storePix(l);return JSON.stringify({store:[l.id,l.nome,l.telefone,l.whatsapp,l.email,l.endereco,l.numero,l.bairro,l.cidade,l.uf,l.cep,l.apresentacao,l.horarioFuncionamento,l.atualizadoEm],pix:[sp.chave,sp.nome,sp.cidade,sp.documento,sp.documentoTipo]})}
async function cloudSync(){try{window.johnCloudCapturarAlteracoes?.();await window.johnCloudFlushIncremental?.(true)}catch(e){console.warn('[John '+VERSION+'] sync cloud:',e)}}
async function publish(){if(publishing)return publishing;publishing=(async()=>{applyStorePixToPrint();await cloudSync();const fn=window.JohnV880?.canonicalPublish||window.publicarCatalogoEcommerce||window.JohnCaseirinhoCatalogSync821?.publish;if(typeof fn!=='function')throw new Error('Publicador do E-commerce não carregado.');const out=await fn(true);lastFp=fingerprint();return out})().finally(()=>{publishing=null});return publishing}
async function syncChanged(force=false){const fp=fingerprint();if(!force&&(!fp||fp===lastFp))return;try{await publish();window.dispatchEvent(new CustomEvent('john:store-settings-synced',{detail:{version:VERSION}}))}catch(e){console.warn('[John '+VERSION+'] publicação de dados da loja/PIX:',e)}}
async function fetchCatalog(){const c=cloudCfg(),r=await fetch(c.apiUrl+'/api/v1/public/store/'+encodeURIComponent(c.slug)+'/catalog?_settings='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-store','Pragma':'no-cache'}});let j={};try{j=await r.json()}catch(_){}if(!r.ok)throw new Error(j?.error||('HTTP '+r.status));return j}
function applyCatalog(cat){const d=dbRef();if(!d||!cat?.loja)return false;const remote=cat.loja;let changed=false;const l=store();if(l){const map={nome:remote.nome||remote.nomeLoja,razao:remote.razao,cnpj:remote.cnpj,telefone:remote.telefone,whatsapp:remote.whatsapp,email:remote.email,apresentacao:remote.apresentacao||remote.subtitulo,horarioFuncionamento:remote.horarioFuncionamento,cep:remote.cep,endereco:remote.endereco||remote.logradouro,numero:remote.numero,complemento:remote.complemento,bairro:remote.bairro,cidade:remote.cidade,uf:remote.uf};for(const[k,v]of Object.entries(map)){if(!S(l[k]).trim()&&S(v).trim()){l[k]=v;changed=true}}}
 // Regra V8.22.13: a origem do PIX é sempre o Cadastro da Loja. O catálogo remoto só hidrata o cadastro da loja quando ele ainda está vazio.
 if(l&&remote.pix&&typeof remote.pix==='object'){
   const sp=storePix(l),rp=remote.pix;
   if(!S(sp.chave).trim()&&S(rp.chave).trim()){l.pix={...(l.pix&&typeof l.pix==='object'?l.pix:{}),chave:S(rp.chave),nome:S(rp.nome||''),cidade:S(rp.cidade||''),documento:S(rp.documento||''),documentoTipo:S(rp.documentoTipo||'')};changed=true}
 }
 if(changed)saveDb();applyStorePixToPrint();if(changed){try{window.renderLojas?.()}catch(_){}}return changed}
async function reconcile(){if(reconciling)return reconciling;reconciling=(async()=>{try{const cat=await fetchCatalog();const changed=applyCatalog(cat);lastFp=fingerprint();return changed?'REMOTE_FILLED_STORE_FIELDS':'STORE_REGISTRATION_PRIORITY'}catch(e){console.warn('[John '+VERSION+'] reconciliação loja/PIX:',e);applyStorePixToPrint();lastFp=fingerprint();return'STORE_LOCAL_ONLY'}})().finally(()=>{reconciling=null});return reconciling}
function onStoreSaved(){const l=store();if(l)l.atualizadoEm=new Date().toISOString();applyStorePixToPrint();saveDb();try{window.JohnTransactionPersistence82213?.refreshBackup?.()}catch(_){}lastFp='';setTimeout(()=>syncChanged(true),250)}
function installWatch(){lastFp=fingerprint();setInterval(()=>{applyStorePixToPrint();syncChanged(false)},2500);document.addEventListener('submit',e=>{if(e.target?.id==='lojaForm')setTimeout(onStoreSaved,120)},true);document.addEventListener('click',e=>{const id=e.target?.id||'';if(id==='btnSalvarLojaFinal')setTimeout(onStoreSaved,120)},true)}
async function boot(){applyStorePixToPrint();await reconcile();installWatch()}
window.JohnStoreSettingsSync82213={version:VERSION,reconcile,publish,syncChanged,fetchCatalog,applyStorePixToPrint,storePix};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,180),{once:true});else setTimeout(boot,180);
})();