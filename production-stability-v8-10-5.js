(function(){
'use strict';
if(window.__JOHN_PROD_STABILITY_8105__)return;
window.__JOHN_PROD_STABILITY_8105__=true;

const S=v=>String(v??'');
const sleepFrame=fn=>requestAnimationFrame(()=>requestAnimationFrame(fn));
let userInteractionSeq=0;

['pointerdown','touchstart','wheel','keydown'].forEach(ev=>
  window.addEventListener(
    ev,
    ()=>{userInteractionSeq++},
    {passive:true,capture:true}
  )
);

function bridgeDb(){
  try{
    if(!window.db && typeof db!=='undefined' && db)window.db=db;

    const d=(typeof db!=='undefined'&&db)||window.db;
    if(!d||typeof d!=='object')return;

    const pedidos=Array.isArray(d.pedidos)?d.pedidos:[];
    for(const p of pedidos){
      if(p&&p.pagamentoIntegral===true){
        p.restante=0;
        const total=Number(
          p.valorTotal??p.total??p.subtotal??0
        )||0;

        if(!(Number(p.valorPagoDireto)>0)&&total>0){
          p.valorPagoDireto=total;
        }
      }
    }
  }catch(_){}
}

bridgeDb();
setInterval(bridgeDb,4000);
window.addEventListener('focus',bridgeDb,{passive:true});
document.addEventListener('click',bridgeDb,true);

const nativeFetch=window.fetch.bind(window);
const inFlight=new Map();

function isSafeChangeGet(req){
  if(req.method!=='GET')return false;

  try{
    const u=new URL(req.url,location.href);
    return (
      /\/api\/v1\/admin\/store\/orders\/changes$/.test(u.pathname) ||
      /\/api\/v1\/admin\/sync\/changes$/.test(u.pathname)
    );
  }catch(_){
    return false;
  }
}
function isOrdersChange(req){
  try{
    return /\/api\/v1\/admin\/store\/orders\/changes$/.test(
      new URL(req.url,location.href).pathname
    );
  }catch(_){
    return false;
  }
}

window.fetch=async function(input,init){
  let req;
  try{
    req=new Request(input,init);
  }catch(_){
    return nativeFetch(input,init);
  }

  if(!isSafeChangeGet(req)){
    return nativeFetch(input,init);
  }

  const key=req.method+' '+req.url;
  const interactionAtStart=userInteractionSeq;
  const yAtStart=window.scrollY;
  const xAtStart=window.scrollX;

  let p=inFlight.get(key);

  if(!p){
    p=nativeFetch(req).finally(()=>inFlight.delete(key));
    inFlight.set(key,p);
  }

  const response=await p;

  if(isOrdersChange(req)){
    setTimeout(()=>sleepFrame(()=>{
      if(
        userInteractionSeq===interactionAtStart &&
        Math.abs(window.scrollY-yAtStart)>2
      ){
        window.scrollTo(xAtStart,yAtStart);
      }
      stabilizeOrdersTable();
    }),60);
  }

  return response.clone();
};

let cssApplied=false;

function addCss(){
  if(cssApplied)return;
  cssApplied=true;

  const st=document.createElement('style');
  st.id='john-prod-stability-8105-css';
  st.textContent=`
    body{overflow-anchor:none}
    [data-john-orders-stable="1"]{table-layout:fixed!important;width:100%!important}
    [data-john-orders-stable="1"] th,
    [data-john-orders-stable="1"] td{vertical-align:middle!important}
    [data-john-orders-stable="1"] th:last-child,
    [data-john-orders-stable="1"] td:last-child{min-width:250px!important}
    [data-john-orders-stable="1"] td:last-child button,
    [data-john-orders-stable="1"] td:last-child .btn{white-space:nowrap!important}
    @media(max-width:760px){
      [data-john-orders-wrap="1"]{
        overflow-x:auto!important;
        -webkit-overflow-scrolling:touch;
        overscroll-behavior-x:contain
      }
      [data-john-orders-stable="1"]{min-width:930px!important}
    }
  `;
  document.head.appendChild(st);
}

function stabilizeOrdersTable(){
  addCss();

  const headings=[...document.querySelectorAll('h1,h2,h3')];
  const active=headings.some(
    x=>/Pedidos do E-?commerce|Fila de pedidos online/i.test(
      S(x.textContent)
    )
  );

  if(!active)return;

  const tables=[...document.querySelectorAll('table')];
  for(const t of tables){
    const text=S(t.textContent);

    if(
      /PEDIDO/i.test(text) &&
      /STATUS/i.test(text) &&
      /AÇÕES|ACOES/i.test(text)
    ){
      t.dataset.johnOrdersStable='1';

      const wrap=t.parentElement;
      if(wrap)wrap.dataset.johnOrdersWrap='1';
    }
  }
}

let stabilizeScheduled=false;

const mo=new MutationObserver(()=>{
  if(stabilizeScheduled)return;
  stabilizeScheduled=true;

  setTimeout(()=>{
    stabilizeScheduled=false;
    stabilizeOrdersTable();
  },180);
});

if(document.documentElement){
  mo.observe(
    document.documentElement,
    {childList:true,subtree:true}
  );
}

if(document.readyState==='loading'){
  document.addEventListener(
    'DOMContentLoaded',
    ()=>{
      bridgeDb();
      stabilizeOrdersTable();
    },
    {once:true}
  );
}else{
  stabilizeOrdersTable();
}

setTimeout(stabilizeOrdersTable,1200);
setTimeout(stabilizeOrdersTable,4000);

/*
  V8.11.0:
  O service worker injeta multiempresa-v8-11-0.js no <head>, antes do ERP.
  Este loader é apenas contingência da PRIMEIRA navegação após atualizar o SW.
  Na navegação seguinte o módulo já entra cedo e não é recarregado.
*/
function ensureMultiempresa(){
  if(
    window.__JOHN_MULTIEMPRESA_8110__ ||
    document.querySelector('script[data-john-multiempresa]')
  ){
    return;
  }

  const s=document.createElement('script');
  s.src='./multiempresa-v8-11-0.js?v=8111';
  s.async=false;
  s.dataset.johnMultiempresa='1';
  s.onerror=()=>console.warn(
    '[John ERP] módulo multiempresa não carregado; nenhuma alteração de dados foi feita.'
  );

  document.head.appendChild(s);
}

ensureMultiempresa();

console.info(
  '[John ERP] estabilidade V8.10.5 preservada · Multiempresa V8.11.1'
);
})();