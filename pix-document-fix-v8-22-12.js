(function(){
'use strict';
if(window.__JOHN_PIX_DOCUMENT_FIX_82212__)return;
window.__JOHN_PIX_DOCUMENT_FIX_82212__=true;
const VERSION='8.22.12',S=v=>String(v??'');
function storage(){try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}catch(_){return localStorage}}
function dbRef(){try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){};try{return window.db||null}catch(_){return null}}
function dbKey(){try{return typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1'}catch(_){return'pcp_app_v1'}}
function pixCfg(){const d=dbRef();if(!d)return null;d.config=d.config&&typeof d.config==='object'?d.config:{};return d.config.impressaoPedidos=d.config.impressaoPedidos&&typeof d.config.impressaoPedidos==='object'?d.config.impressaoPedidos:{} }
function save(){const d=dbRef();if(!d)return;try{storage().setItem(dbKey(),JSON.stringify(d))}catch(_){};try{window.JohnTransactionPersistence82212?.refreshBackup?.()}catch(_){}}
function normalize(mark=false){const p=pixCfg();if(!p)return false;const raw=S(p.chavePix).trim(),digits=raw.replace(/\D/g,''),isDoc=(digits.length===11||digits.length===14)&&S(raw).replace(/[\d.\-\/\s]/g,'')==='';let changed=false;if(isDoc){const tipo=digits.length===11?'CPF':'CNPJ';if(S(p.documento)!==digits){p.documento=digits;changed=true}if(S(p.documentoTipo).toUpperCase()!==tipo){p.documentoTipo=tipo;changed=true}}else if(raw&&S(p.documento).replace(/\D/g,'')==='38824690807'){
 // Não reaproveitar o CPF legado como documento de uma chave PIX nova que não seja CPF/CNPJ.
 p.documento='';changed=true;
 }
 if(changed||mark){if(mark)p.atualizadoEm=new Date().toISOString();save();try{window.renderCamposPix?.()}catch(_){}}return changed}
function wrapPrint(){const base=window.imprimirPedido;if(typeof base!=='function'||base.__pix82212)return false;const w=function(){try{window.JohnTransactionPersistence82212?.applyBackup?.()}catch(_){}normalize(false);return base.apply(this,arguments)};w.__pix82212=true;window.imprimirPedido=w;return true}
function boot(){try{window.JohnTransactionPersistence82212?.applyBackup?.()}catch(_){}normalize(false);wrapPrint();let n=0;const t=setInterval(()=>{n++;wrapPrint();if(n>50)clearInterval(t)},400);document.addEventListener('click',e=>{if((e.target?.id||'')==='configSalvarImpressao')setTimeout(()=>{normalize(true);try{window.JohnStoreSettingsSync82212?.syncChanged?.(true)}catch(_){}},180)},true)}
window.JohnPixDocumentFix82212={version:VERSION,normalize};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,260),{once:true});else setTimeout(boot,260);
})();