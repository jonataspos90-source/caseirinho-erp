(function(){
'use strict';
if(window.__JOHN_FREE_FREIGHT_82234__)return;
window.__JOHN_FREE_FREIGHT_82234__=true;

const VERSION='8.22.34';
const CLOUD_KEY='john_cloud_config_v1';
const INBOX_KEYS=['john_ecommerce_cloud_inbox_v1','john_ecommerce_inbox_v1'];
const S=v=>String(v??'');
const N=v=>Number(v)||0;
let currentQuoteId='';
let busy=false;

function read(k,f){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(_){return f}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(_){return false}}
function toast(m){try{if(typeof window.toast==='function')return window.toast(m)}catch(_){}alert(m)}
function cloud(){const c=read(CLOUD_KEY,{})||{};return{apiUrl:S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),apiKey:S(c.apiKey||c.token||'')}}
function actor(){try{return typeof usuarioAtual==='function'?(usuarioAtual()?.nome||usuarioAtual()?.login||'ERP'):'ERP'}catch(_){return'ERP'}}
async function admin(path,opt={}){const c=cloud();if(!c.apiKey)throw new Error('Sessão do ERP sem credencial de nuvem. Entre novamente.');const r=await fetch(c.apiUrl+path+(path.includes('?')?'&':'?')+'_v82234='+Date.now(),{cache:'no-store',...opt,headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.apiKey,'X-ERP-User':S(actor()),'Cache-Control':'no-store',...(opt.headers||{})}});let j={};try{j=await r.json()}catch(_){}if(!r.ok)throw new Error(j?.error||('Erro HTTP '+r.status));return j}
function parseMoney(v){let x=S(v).trim().replace(/\s/g,'');if(!x)return NaN;if(x.includes(',')&&x.includes('.'))x=x.lastIndexOf(',')>x.lastIndexOf('.')?x.replace(/\./g,'').replace(',','.'):x.replace(/,/g,'');else if(x.includes(','))x=x.replace(',','.');const n=Number(x);return Number.isFinite(n)?n:NaN}
function patchInbox(id,r){for(const k of INBOX_KEYS){const rows=read(k,[]);if(!Array.isArray(rows))continue;const i=rows.findIndex(x=>S(x?.id)===S(id));if(i<0)continue;const old=rows[i],payload=old?.payload&&typeof old.payload==='object'?{...old.payload}:old?.payload;if(payload&&typeof payload==='object'){payload.valorFrete=0;payload.total=r.total;payload.freteStatus=r.freteStatus;payload.freteDecisaoCliente=r.freteDecisaoCliente;payload.status=r.status;payload.freteAprovado=true;payload.mensagemCliente=r.mensagemCliente||payload.mensagemCliente}rows[i]={...old,valorFrete:0,total:r.total,freteStatus:r.freteStatus,freteDecisaoCliente:r.freteDecisaoCliente,status:r.status,payload,updatedAt:new Date().toISOString()};write(k,rows)}}
function enhanceQuoteButton(){const b=document.getElementById('fq87Approve'),v=document.getElementById('fq87Value');if(!b||!v)return;if(!v.dataset.free82234){v.dataset.free82234='1';v.addEventListener('input',enhanceQuoteButton);v.addEventListener('change',enhanceQuoteButton)}if(busy){b.disabled=true;b.textContent='Frete grátis + aceitando...';return}const n=parseMoney(v.value);if(n===0){b.textContent='Frete grátis e aceitar pedido';b.title='R$ 0,00 será tratado como frete grátis e o pedido será aceito automaticamente.'}else{b.title='';if(!/salvando/i.test(b.textContent))b.textContent='Enviar valor ao cliente'}}
function wrapQuoteFunction(name){const fn=window[name];if(typeof fn!=='function'||fn.__free82234)return false;const wrapped=async function(id){currentQuoteId=S(id);const r=await fn.apply(this,arguments);setTimeout(enhanceQuoteButton,20);setTimeout(enhanceQuoteButton,80);return r};wrapped.__free82234=true;wrapped.__original=fn;window[name]=wrapped;return true}
function installQuotePatch(){const a=window.johnV870Quote,b=window.johnV8Quote;if(typeof a==='function'&&!a.__free82234){const original=a;const wrapped=async function(id){currentQuoteId=S(id);const r=await original.apply(this,arguments);setTimeout(enhanceQuoteButton,20);setTimeout(enhanceQuoteButton,80);return r};wrapped.__free82234=true;wrapped.__original=original;window.johnV870Quote=wrapped;if(b===original)window.johnV8Quote=wrapped;return true}if(typeof b==='function'&&!b.__free82234)return wrapQuoteFunction('johnV8Quote');return false}
async function freeFreightAndAccept(button){if(busy)return;const id=S(currentQuoteId);if(!id){toast('Não consegui identificar o pedido da cotação. Feche e abra a cotação novamente.');return}busy=true;enhanceQuoteButton();try{const km=Math.max(0,N(document.getElementById('fq87Km')?.value));const r=await admin('/api/v1/admin/store/orders/'+encodeURIComponent(id)+'/shipping-quote',{method:'PUT',body:JSON.stringify({valorFrete:0,distanciaKm:km||null,origem:'MANUAL_ERP',aprovado:true})});patchInbox(id,r);document.getElementById('johnV870Quote')?.classList.remove('open');try{window.johnEcommerceOrdersController?.render?.()}catch(_){}if(r.autoAccept!==true||S(r.freteDecisaoCliente).toUpperCase()!=='ACEITO')throw new Error('O servidor ainda não confirmou a regra de frete grátis automático. Atualize o ERP e tente novamente.');const actions=window.johnOrderActions82233;if(!actions||typeof actions.accept!=='function')throw new Error('Rotina de aceite automático ainda não carregou. Atualize a página e tente novamente.');await actions.accept(id)}catch(e){toast(e?.message||'Não foi possível aplicar o frete grátis e aceitar o pedido.')}finally{busy=false;enhanceQuoteButton()}}
function onClick(e){const b=e.target?.closest?.('#fq87Approve');if(!b)return;const v=parseMoney(document.getElementById('fq87Value')?.value);if(v!==0)return;e.preventDefault();e.stopImmediatePropagation();freeFreightAndAccept(b)}

document.addEventListener('click',onClick,true);
const mo=new MutationObserver(()=>{installQuotePatch();enhanceQuoteButton()});try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(_){}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{installQuotePatch();enhanceQuoteButton()},{once:true});else{installQuotePatch();enhanceQuoteButton()}
[300,800,1500,3000,6000].forEach(ms=>setTimeout(()=>{installQuotePatch();enhanceQuoteButton()},ms));
window.johnFreeFreight82234={version:VERSION,freeFreightAndAccept,installQuotePatch};
})();
