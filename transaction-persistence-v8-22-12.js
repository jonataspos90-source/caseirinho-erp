(function(){
'use strict';
if(window.__JOHN_TX_PERSIST_82212__)return;
window.__JOHN_TX_PERSIST_82212__=true;
const VERSION='8.22.12';
const DB_KEY='pcp_app_v1';
const BACKUP_KEY='john_erp_transaction_backup_v1';
const PRE_ACTIVATION_KEY='john_public_pre_activation_backup_v1';
const STARTED_AT=new Date().toISOString();
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(_){return v}};
function st(){try{return window.localStorage}catch(_){return null}}
function parse(raw){try{const x=JSON.parse(raw||'null');return x&&typeof x==='object'&&!Array.isArray(x)?x:null}catch(_){return null}}
function read(key){try{return parse(st()?.getItem(key))}catch(_){return null}}
function write(key,val){try{st()?.setItem(key,JSON.stringify(val));return true}catch(_){return false}}
function dbRef(){try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){};try{return window.db||null}catch(_){return null}}
function orderKeys(o){const out=[];if(S(o?.id))out.push('id:'+S(o.id));if(S(o?.ecommercePedidoId))out.push('ecom:'+S(o.ecommercePedidoId));if(Number(o?.numero)>0)out.push('num:'+Number(o.numero));return out}
function sameOrder(a,b){const ka=new Set(orderKeys(a));return orderKeys(b).some(k=>ka.has(k))}
function personKey(p){if(S(p?.id))return'id:'+S(p.id);const cpf=S(p?.cpf).replace(/\D/g,'');if(cpf)return'cpf:'+cpf;const tel=S(p?.telefone||p?.celular).replace(/\D/g,'');return tel?'tel:'+tel:''}
function nonEmptyPix(p){return !!S(p?.chavePix||p?.documento||p?.pixNomeRecebedor).trim()}
function normalizePix(p){p=p&&typeof p==='object'?clone(p):{};const raw=S(p.chavePix).trim(),digits=raw.replace(/\D/g,'');const docKey=(digits.length===11||digits.length===14)&&S(raw).replace(/[\d.\-\/\s]/g,'')==='';if(docKey){p.documento=digits;p.documentoTipo=digits.length===11?'CPF':'CNPJ'}return p}
function snapshotFromDb(d){if(!d||typeof d!=='object')return null;const pedidos=clone(A(d.pedidos));const ids=new Set(pedidos.map(p=>S(p?.clienteId)).filter(Boolean));const pessoas=clone(A(d.pessoas).filter(p=>ids.has(S(p?.id))||S(p?.tipo).toUpperCase()==='CLIENTE'));
 return{version:VERSION,capturedAt:new Date().toISOString(),pedidos,pessoas,convenioDuplicatas:clone(A(d.convenioDuplicatas)),convenioPagamentos:clone(A(d.convenioPagamentos)),fluxoCaixa:clone(A(d.fluxoCaixa)),vendas:clone(A(d.vendas)),pix:normalizePix(d?.config?.impressaoPedidos||{})};}
function mergeOrders(base,extra,preferBase=true){const out=clone(A(base));for(const x of A(extra)){const ix=out.findIndex(y=>sameOrder(y,x));if(ix<0)out.push(clone(x));else if(!preferBase)out[ix]=clone(x)}return out}
function mergePeople(base,extra,preferBase=true){const out=clone(A(base));for(const x of A(extra)){const k=personKey(x),ix=k?out.findIndex(y=>personKey(y)===k):-1;if(ix<0)out.push(clone(x));else if(!preferBase)out[ix]=clone(x)}return out}
function mergeSnapshot(primary,secondary){if(!primary)return secondary?clone(secondary):null;if(!secondary)return clone(primary);const out=clone(primary);out.pedidos=mergeOrders(primary.pedidos,secondary.pedidos,true);out.pessoas=mergePeople(primary.pessoas,secondary.pessoas,true);for(const k of ['convenioDuplicatas','convenioPagamentos','fluxoCaixa','vendas']){const seen=new Set(A(out[k]).map(x=>S(x?.id)).filter(Boolean));for(const x of A(secondary[k])){const id=S(x?.id);if(!id||!seen.has(id)){out[k].push(clone(x));if(id)seen.add(id)}}}
 if(!nonEmptyPix(out.pix)&&nonEmptyPix(secondary.pix))out.pix=normalizePix(secondary.pix);return out}
function buildBootBackup(){const existing=read(BACKUP_KEY),pre=read(PRE_ACTIVATION_KEY),current=read(DB_KEY);let snap=existing?clone(existing):null;
 // O backup de pré-ativação tem prioridade sobre a base que acabou de ser substituída pela nuvem.
 if(!snap&&pre)snap=snapshotFromDb(pre);
 if(!snap&&current)snap=snapshotFromDb(current);
 if(snap&&pre)snap=mergeSnapshot(snap,snapshotFromDb(pre));
 if(snap&&current)snap=mergeSnapshot(snap,snapshotFromDb(current));
 if(snap){snap.bootCapturedAt=STARTED_AT;write(BACKUP_KEY,snap)}return snap}
const BOOT_BACKUP=buildBootBackup();
let ready=false,wrapping=false;
function persistDb(d){try{const store=typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:st();store?.setItem(DB_KEY,JSON.stringify(d));return true}catch(_){return false}}
function applyBackup(){const d=dbRef(),b=read(BACKUP_KEY)||BOOT_BACKUP;if(!d||!b)return false;let changed=false;
 const before=JSON.stringify(A(d.pedidos));d.pedidos=mergeOrders(A(b.pedidos),A(d.pedidos),true);if(JSON.stringify(d.pedidos)!==before)changed=true;
 const peopleBefore=JSON.stringify(A(d.pessoas));d.pessoas=mergePeople(A(b.pessoas),A(d.pessoas),true);if(JSON.stringify(d.pessoas)!==peopleBefore)changed=true;
 for(const k of ['convenioDuplicatas','convenioPagamentos','fluxoCaixa','vendas']){if(!Array.isArray(d[k]))d[k]=[];const merged=[];const seen=new Set();for(const x of [...A(b[k]),...A(d[k])]){const id=S(x?.id)||JSON.stringify(x);if(seen.has(id))continue;seen.add(id);merged.push(clone(x))}if(JSON.stringify(merged)!==JSON.stringify(d[k])){d[k]=merged;changed=true}}
 d.config=d.config&&typeof d.config==='object'?d.config:{};const localPix=d.config.impressaoPedidos&&typeof d.config.impressaoPedidos==='object'?d.config.impressaoPedidos:{};if(nonEmptyPix(b.pix)){
   const protectedPix=normalizePix(b.pix);if(JSON.stringify(localPix)!==JSON.stringify(protectedPix)){d.config.impressaoPedidos={...localPix,...protectedPix};changed=true}
 }
 if(changed){persistDb(d);try{window.renderAll?.()}catch(_){};try{window.renderCamposPix?.()}catch(_){} }
 return changed}
function refreshBackup(){if(!ready)return;const d=dbRef();if(!d)return;const snap=snapshotFromDb(d);if(snap)write(BACKUP_KEY,snap)}
function wrapSave(){if(wrapping)return;const f=window.save;if(typeof f!=='function'||f.__johnTxPersist82212)return;wrapping=true;const w=function(){const r=f.apply(this,arguments);setTimeout(refreshBackup,0);return r};w.__johnTxPersist82212=true;window.save=w;wrapping=false}
function markPixUpdated(){const d=dbRef();if(!d)return;d.config=d.config&&typeof d.config==='object'?d.config:{};const p=d.config.impressaoPedidos=d.config.impressaoPedidos&&typeof d.config.impressaoPedidos==='object'?d.config.impressaoPedidos:{};const n=normalizePix(p);Object.assign(p,n,{atualizadoEm:new Date().toISOString()});persistDb(d);setTimeout(refreshBackup,0)}
function boot(){applyBackup();ready=true;refreshBackup();wrapSave();let n=0;const t=setInterval(()=>{n++;wrapSave();if(n>40)clearInterval(t)},500);
 document.addEventListener('click',e=>{const id=e.target?.id||'';if(id==='configSalvarImpressao')setTimeout(markPixUpdated,80)},true);
 window.addEventListener('beforeunload',refreshBackup);
}
window.JohnTransactionPersistence82212={version:VERSION,applyBackup,refreshBackup,backupKey:BACKUP_KEY};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,40),{once:true});else setTimeout(boot,40);
})();