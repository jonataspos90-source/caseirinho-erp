(function(){
'use strict';
if(window.__JOHN_ECOM_INBOX_FOCUS_82240__)return;
window.__JOHN_ECOM_INBOX_FOCUS_82240__=true;

const VERSION='8.22.40';
const INBOX_KEYS=['john_ecommerce_cloud_inbox_v1','john_ecommerce_inbox_v1'];
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/[\s-]+/g,'_');
let showProcessed=false;
let renderQueued=false;
let observer=null;

function read(k,f){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(_){return f}}
function rows(){for(const k of INBOX_KEYS){const x=read(k,null);if(Array.isArray(x)&&x.length)return x}return[]}
function state(o){return norm(o?.status||o?.payload?.status||'')}
function integration(o){return norm(o?.statusIntegracao||o?.integration_status||'')}
function isProcessed(o){
  if(!o)return false;
  const st=state(o),integ=integration(o);
  if(['CANCELADO','REJEITADO','SUBSTITUIDO'].includes(st))return true;
  if(['IMPORTADO'].includes(integ))return true;
  if(st==='ACEITO'&&(integ==='IMPORTANDO'||!!o?.erpPedidoId||!!o?.erpNumero))return true;
  return false;
}
function rowCode(tr){
  const td=tr?.querySelector?.('td:nth-child(2)');if(!td)return'';
  const txt=S(td.textContent);const m=txt.match(/WEB-[A-Z0-9-]+/i);return m?m[0]:txt.trim().split(/\s+/)[0];
}
function orderForRow(tr){
  const code=rowCode(tr);if(!code)return null;
  return rows().find(o=>S(o?.codigo||o?.code||o?.id)===S(code))||null;
}
function ensureStyle(){
  if(document.getElementById('johnInboxFocus82240Style'))return;
  const s=document.createElement('style');s.id='johnInboxFocus82240Style';s.textContent=`
    .john-inbox-processed-82240{display:none!important}
    .john-inbox-focus-toolbar-82240{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:10px 0 12px;padding:10px 12px;border:1px solid #dbe3ef;border-radius:12px;background:#f8fafc}
    .john-inbox-focus-toolbar-82240 .john-inbox-focus-copy{display:flex;align-items:center;gap:8px;color:#334155;font-size:12px;font-weight:700}
    .john-inbox-focus-dot-82240{width:9px;height:9px;border-radius:50%;background:#16a34a;box-shadow:0 0 0 4px rgba(22,163,74,.10)}
    .john-inbox-focus-toggle-82240{border:1px solid #cbd5e1;background:#fff;color:#334155;border-radius:10px;padding:8px 11px;font-weight:800;font-size:12px;cursor:pointer;min-height:38px}
    .john-inbox-focus-toggle-82240.active{background:#172033;color:#fff;border-color:#172033}
    @media(max-width:700px){.john-inbox-focus-toolbar-82240{align-items:stretch}.john-inbox-focus-toggle-82240{width:100%}}
  `;document.head.appendChild(s);
}
function tableRoot(){return document.getElementById('ecommercePedidosRecebidos')}
function ensureToolbar(){
  const root=tableRoot();if(!root)return null;
  let bar=document.getElementById('johnInboxFocus82240');
  if(bar)return bar;
  ensureStyle();
  bar=document.createElement('div');bar.id='johnInboxFocus82240';bar.className='john-inbox-focus-toolbar-82240';
  bar.innerHTML='<div class="john-inbox-focus-copy"><span class="john-inbox-focus-dot-82240"></span><span>Fila de pedidos: mostrando somente o que ainda precisa de ação.</span></div><button type="button" class="john-inbox-focus-toggle-82240" data-inbox-toggle-82240>Mostrar processados</button>';
  const table=root.matches?.('table')?root:root.querySelector?.('table');
  if(table&&table.parentNode)table.parentNode.insertBefore(bar,table);else root.prepend(bar);
  bar.querySelector('[data-inbox-toggle-82240]').addEventListener('click',()=>{showProcessed=!showProcessed;apply()});
  return bar;
}
function updateToolbar(processedCount){
  const bar=ensureToolbar();if(!bar)return;
  const btn=bar.querySelector('[data-inbox-toggle-82240]');
  if(btn){btn.classList.toggle('active',showProcessed);btn.textContent=showProcessed?'Ocultar processados':`Mostrar processados${processedCount?` (${processedCount})`:''}`;}
  const copy=bar.querySelector('.john-inbox-focus-copy span:last-child');
  if(copy)copy.textContent=showProcessed?'Exibindo pendentes e processados.':'Fila de pedidos: mostrando somente o que ainda precisa de ação.';
}
function apply(){
  renderQueued=false;
  const root=tableRoot();if(!root)return;
  ensureToolbar();
  let processedCount=0;
  root.querySelectorAll('tbody tr').forEach(tr=>{
    const o=orderForRow(tr),processed=isProcessed(o);
    if(processed)processedCount++;
    tr.classList.toggle('john-inbox-processed-82240',processed&&!showProcessed);
    tr.dataset.inboxState82240=processed?'PROCESSADO':'PENDENTE';
  });
  updateToolbar(processedCount);
}
function schedule(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(apply)}
function patchController(){
  const c=window.johnEcommerceOrdersController;if(!c||c.__inboxFocus82240)return false;
  const render=typeof c.render==='function'?c.render.bind(c):null;
  const refresh=typeof c.refresh==='function'?c.refresh.bind(c):null;
  if(render)c.render=function(){const r=render(...arguments);setTimeout(schedule,0);setTimeout(schedule,80);return r};
  if(refresh)c.refresh=async function(){const r=await refresh(...arguments);setTimeout(schedule,0);setTimeout(schedule,120);return r};
  c.__inboxFocus82240=true;return true;
}
function patchAccept(){
  const a=window.johnOrderActions82233;if(!a||a.__inboxFocus82240||typeof a.accept!=='function')return false;
  const original=a.accept.bind(a);
  a.accept=async function(){const r=await original(...arguments);[0,80,350,900].forEach(ms=>setTimeout(schedule,ms));return r};
  a.__inboxFocus82240=true;return true;
}
function attachObserver(){
  const root=tableRoot();if(!root||observer)return false;
  observer=new MutationObserver(schedule);observer.observe(root,{childList:true,subtree:true});return true;
}
function init(){patchController();patchAccept();attachObserver();schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,250),{once:true});else setTimeout(init,120);
[500,1200,2500,5000,9000].forEach(ms=>setTimeout(init,ms));
window.johnEcommerceInboxFocus82240={version:VERSION,apply,isProcessed,get showProcessed(){return showProcessed},setShowProcessed(v){showProcessed=!!v;apply()}};
})();
