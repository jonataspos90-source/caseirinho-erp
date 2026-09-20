(function(){
'use strict';
if(window.__JOHN_PIX_DOCUMENT_FIX_82211__)return;
window.__JOHN_PIX_DOCUMENT_FIX_82211__=true;
const VERSION='8.22.11';
const S=v=>String(v??'');
function storage(){try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}catch(_){return localStorage}}
function dbRef(){try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){};try{return window.db||null}catch(_){return null}}
function dbKey(){try{return typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1'}catch(_){return 'pcp_app_v1'}}
function pixCfg(){const d=dbRef();if(!d)return null;d.config=d.config&&typeof d.config==='object'?d.config:{};return d.config.impressaoPedidos=d.config.impressaoPedidos&&typeof d.config.impressaoPedidos==='object'?d.config.impressaoPedidos:{} }
function saveDb(){const d=dbRef();if(!d)return;try{storage().setItem(dbKey(),JSON.stringify(d))}catch(_){} }
function normalizeDocumentFromPix(markUpdated=false){const p=pixCfg();if(!p)return false;const raw=S(p.chavePix).trim();if(!raw)return false;const digits=raw.replace(/\D/g,'');const looksDocument=!/^\+/.test(raw)&&(digits.length===11||digits.length===14)&&S(raw).replace(/[\d.\-\/\s]/g,'')==='';if(!looksDocument)return false;const tipo=digits.length===11?'CPF':'CNPJ';let changed=false;if(S(p.documento)!==digits){p.documento=digits;changed=true}if(S(p.documentoTipo).toUpperCase()!==tipo){p.documentoTipo=tipo;changed=true}if(changed){if(markUpdated)p.atualizadoEm=new Date().toISOString();saveDb();try{window.renderCamposPix?.()}catch(_){} }return changed}
function installPrintGuard(){const base=window.imprimirPedido;if(typeof base!=='function'||base.__pix82211)return false;const wrapped=function(){normalizeDocumentFromPix(false);return base.apply(this,arguments)};wrapped.__pix82211=true;window.imprimirPedido=wrapped;return true}
function installSaveGuard(){document.addEventListener('click',e=>{const id=e.target?.id||'';if(id!=='configSalvarImpressao')return;setTimeout(()=>{const changed=normalizeDocumentFromPix(true);if(changed){try{window.JohnStoreSettingsSync82210?.syncChanged?.(true)}catch(_){}}},250)},true)}
function boot(){normalizeDocumentFromPix(false);installPrintGuard();installSaveGuard();let tries=0;const t=setInterval(()=>{tries++;installPrintGuard();if(tries>20)clearInterval(t)},500)}
window.JohnPixDocumentFix82211={version:VERSION,normalizeDocumentFromPix};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,300),{once:true});else setTimeout(boot,300);
})();
