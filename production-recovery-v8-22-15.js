(function(){
'use strict';
if(window.__JOHN_REAL_PWA_RECOVERY_82215__)return;
window.__JOHN_REAL_PWA_RECOVERY_82215__=true;
const VERSION='8.22.18',DB_KEY='pcp_app_v1',PRE='john_public_pre_activation_backup_v1',TX='john_erp_transaction_backup_v1';
const S=v=>String(v??''),A=v=>Array.isArray(v)?v:[],N=v=>Number(v)||0;
const st=()=>{try{return window.__johnLocalStorage||localStorage}catch(_){return localStorage}};
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function dbRef(){try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){}return window.db||null}
function parseKey(k){try{const x=JSON.parse(st().getItem(k)||'null');return x&&typeof x==='object'?x:null}catch(_){return null}}
function saveDb(){const d=dbRef();if(!d)return false;try{st().setItem(DB_KEY,JSON.stringify(d));return true}catch(e){console.warn('[John '+VERSION+'] salvar base:',e);return false}}
function sameOrder(a,b){if(!a||!b)return false;const ai=S(a.id),bi=S(b.id);if(ai&&bi&&ai===bi)return true;const an=N(a.numero),bn=N(b.numero);return an>0&&bn>0&&an===bn}
function mergeBackupOrders(){const d=dbRef();if(!d)return{restored:0,found102:false};d.pedidos=A(d.pedidos);d.pessoas=A(d.pessoas);let restored=0,found102=d.pedidos.some(x=>N(x.numero)===102);for(const key of [PRE,TX]){const b=parseKey(key);if(!b)continue;const src=A(b.pedidos);for(const p of src){if(d.pedidos.some(x=>sameOrder(x,p)))continue;d.pedidos.push(p);restored++;if(N(p.numero)===102)found102=true;const cid=S(p.clienteId);if(cid&&!d.pessoas.some(x=>S(x.id)===cid)){const pessoa=A(b.pessoas).find(x=>S(x.id)===cid);if(pessoa)d.pessoas.push(pessoa)}}}if(restored){saveDb();try{window.JohnTransactionPersistence82213?.refreshBackup?.()}catch(_){};setTimeout(()=>{try{window.johnCloudCapturarAlteracoes?.();window.johnCloudFlushIncremental?.(true)}catch(_){}},300);try{typeof renderAll==='function'&&renderAll()}catch(_){}}return{restored,found102}}
function activeStore(){const d=dbRef();return A(d?.lojas).find(x=>S(x?.padrao).toUpperCase()==='SIM'&&S(x?.status||'ATIVA').toUpperCase()!=='INATIVA')||A(d?.lojas).find(x=>S(x?.status||'ATIVA').toUpperCase()!=='INATIVA')||A(d?.lojas)[0]||null}
function first(...v){for(const x of v)if(S(x).trim())return S(x).trim();return''}
function pix(){const l=activeStore();if(!l)return{};const p=l.pix&&typeof l.pix==='object'?l.pix:(l.pagamentoPix&&typeof l.pagamentoPix==='object'?l.pagamentoPix:(l.pixConfig&&typeof l.pixConfig==='object'?l.pixConfig:{}));return{chave:first(p.chave,p.key,p.chavePix,l.chavePix,l.pixChave,l.chave_pix,l.chavePIX,l.pixKey),nome:first(p.nome,p.recebedor,p.nomeRecebedor,l.pixNomeRecebedor,l.nomeRecebedorPix,l.pixNome,l.recebedorPix,l.nome,l.razao),cidade:first(p.cidade,l.pixCidade,l.cidadePix,l.cidade),documento:first(p.documento,p.cpfCnpj,l.pixDocumento,l.documentoPix,l.cpfCnpjPix)}}
function pixBlock(){const p=pix();if(!p.chave)return'';let qr='';try{if(typeof window.JohnQRCodeSvg==='function')qr=window.JohnQRCodeSvg(p.chave,150)||''}catch(_){}return `<section id="johnPixReal82215" class="pay" style="display:grid;grid-template-columns:${qr?'165px 1fr':'1fr'};gap:14px;align-items:center;margin-top:15px;border:2px solid #111827;border-radius:10px;padding:12px;page-break-inside:avoid">${qr?`<div>${qr}</div>`:''}<div><h2 style="margin:0 0 8px">Pagamento via PIX</h2><p><b>Chave PIX:</b><br><span class="key" style="font-size:15px;font-weight:800;overflow-wrap:anywhere">${esc(p.chave)}</span></p>${p.nome?`<p><b>Recebedor:</b> ${esc(p.nome)}</p>`:''}${p.cidade?`<p><b>Cidade:</b> ${esc(p.cidade)}</p>`:''}<small>PIX carregado do Cadastro da Loja.</small></div></section>`}
function isPixOrder(h){const x=S(h);return /Pedido\s+n[ºo]?|Pedido/i.test(x)&&/Forma\s+de\s+pagamento:[\s\S]{0,120}PIX/i.test(x)}
function injectPix(h){let x=S(h);if(!isPixOrder(x)||x.includes('johnPixReal82215'))return x;const b=pixBlock();if(!b)return x;const footer=x.search(/<div class=["']footer["']/i);if(footer>=0)return x.slice(0,footer)+b+x.slice(footer);const body=x.toLowerCase().lastIndexOf('</body>');return body>=0?x.slice(0,body)+b+x.slice(body):x+b}
let bridge=false;
function installPrintBridge(){if(bridge||typeof window.open!=='function')return false;const base=window.open.bind(window);window.open=function(){const w=base.apply(window,arguments);try{if(!w?.document||typeof w.document.write!=='function')return w;const write=w.document.write.bind(w.document);w.document.write=function(){const args=[...arguments],joined=args.map(S).join('');return write(injectPix(joined))};}catch(_){}return w};bridge=true;return true}
function loadScript(key,src){if(window[key]||document.querySelector(`script[data-john-recovery="${src}"]`))return;const s=document.createElement('script');s.src=src;s.async=false;s.dataset.johnRecovery=src;s.onerror=()=>console.warn('[John '+VERSION+'] não foi possível carregar '+src);(document.head||document.documentElement).appendChild(s)}
function loadEcommerceImprovements(){loadScript('__JOHN_ECOMMERCE_BATCH_MEDIA_82216__','./ecommerce-batch-media-v8-22-16.js?v=82218');loadScript('__JOHN_ECOMMERCE_SUBMODULE_82217__','./ecommerce-submodule-media-v8-22-17.js?v=82218')}
function recoverModules(){
 try{window.JohnCentralModules8223?.install?.()}catch(e){console.warn('[John '+VERSION+'] central modules:',e)}
 try{window.johnNext?.refresh?.()}catch(e){console.warn('[John '+VERSION+'] johnNext refresh:',e)}
 try{window.johnNext?.renderHub?.()}catch(e){console.warn('[John '+VERSION+'] johnNext hub:',e)}
 try{typeof window.renderAll==='function'&&window.renderAll()}catch(_){}
}
function scheduleModuleRecovery(){[120,350,800,1500,2800,4500,7000,10000].forEach(ms=>setTimeout(recoverModules,ms))}
function boot(){const r=mergeBackupOrders();installPrintBridge();loadEcommerceImprovements();scheduleModuleRecovery();let n=0;const t=setInterval(()=>{installPrintBridge();loadEcommerceImprovements();if(n%4===0)recoverModules();n++;if(n>48)clearInterval(t)},250);try{window.dispatchEvent(new CustomEvent('john:pwa-recovery',{detail:{version:VERSION,...r}}))}catch(_){};console.info('[John '+VERSION+'] recuperação de módulos ativa',r)}
window.addEventListener('john:session-ready',()=>setTimeout(recoverModules,120));
window.addEventListener('john:cloud-applied',()=>setTimeout(recoverModules,180));
window.JohnRealPwaRecovery82215={version:VERSION,mergeBackupOrders,pix,pixBlock,injectPix,installPrintBridge,loadEcommerceImprovements,recoverModules};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,40),{once:true});else setTimeout(boot,40);
})();
