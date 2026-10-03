(function(){'use strict';
if(window.__JOHN_CASHBACK_VISIBILITY_82243__)return;
window.__JOHN_CASHBACK_VISIBILITY_82243__=true;

const CASHBACK='./cashback-engine-v8-22-42.js?v=82243';
const S=v=>String(v??'');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function toast(message){try{if(typeof window.toast==='function')return window.toast(message)}catch(_){}console.warn('[Cashback]',message)}

function motorGroup(){
  return [...document.querySelectorAll('.john-module-group')].find(g=>/motor\s+comercial/i.test(S(g.querySelector('.john-module-name')?.textContent)));
}

function ensureNavItem(){
  const group=motorGroup();
  const host=group?.querySelector('.john-module-items');
  if(!host)return false;
  let btn=host.querySelector('button[data-special="cashback"]');
  let created=false;
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='john-special-nav';
    btn.dataset.special='cashback';
    btn.innerHTML='💰 Cashback';
    host.appendChild(btn);
    created=true;
  }
  if(btn.dataset.cbVisibilityBound!=='1'){
    btn.dataset.cbVisibilityBound='1';
    btn.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();openCashback()},{capture:true});
  }
  if(created)setTimeout(()=>{try{window.johnNext?.renderHub?.();window.johnNext?.refresh?.()}catch(_){}},60);
  return true;
}

function ensureTab(){
  const tabs=document.getElementById('ce822Tabs');
  if(!tabs)return false;
  let btn=tabs.querySelector('[data-cetab="cashback"]');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.dataset.cetab='cashback';
    btn.textContent='Cashback';
    const loyalty=tabs.querySelector('[data-cetab="loyalty"]');
    if(loyalty)loyalty.insertAdjacentElement('afterend',btn);else tabs.appendChild(btn);
  }
  return true;
}

function ensureCashbackScript(){
  if(window.JohnCashback82242?.open)return Promise.resolve(true);
  return new Promise(resolve=>{
    let s=document.querySelector('script[data-john-cashback-82242],script[src*="cashback-engine-v8-22-42.js"]');
    if(!s){
      s=document.createElement('script');
      s.src=CASHBACK;
      s.async=false;
      s.dataset.johnCashback82242='1';
      document.head.appendChild(s);
    }
    let done=false;
    const finish=ok=>{if(done)return;done=true;resolve(ok)};
    s.addEventListener?.('load',()=>finish(true),{once:true});
    s.addEventListener?.('error',()=>finish(false),{once:true});
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(window.JohnCashback82242?.open){clearInterval(timer);finish(true)}
      else if(tries>=40){clearInterval(timer);finish(false)}
    },100);
  });
}

async function showMotor(){
  try{
    if(window.JohnCommerce822?.open){await window.JohnCommerce822.open('dash');return true}
  }catch(_){}
  const group=motorGroup();
  const fallback=[...group?.querySelectorAll('.john-module-items button')||[]].find(b=>b.dataset.special!=='cashback');
  if(fallback){fallback.click();await sleep(120);return true}
  return !!document.getElementById('motorComercial');
}

async function openCashback(){
  try{
    await showMotor();
    ensureTab();
    const ok=await ensureCashbackScript();
    ensureTab();
    if(ok&&window.JohnCashback82242?.open){await window.JohnCashback82242.open();return}
    toast('Não foi possível carregar o Cashback. Atualize o ERP e tente novamente.');
  }catch(e){console.error('[Cashback visibility]',e);toast('Falha ao abrir Cashback: '+(e?.message||e))}
}

document.addEventListener('click',ev=>{
  const b=ev.target?.closest?.('[data-cetab="cashback"]');
  if(!b)return;
  ev.preventDefault();
  ev.stopImmediatePropagation();
  openCashback();
},true);

function install(){ensureNavItem();ensureTab();ensureCashbackScript()}
const observer=new MutationObserver(()=>{ensureNavItem();ensureTab()});
if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
[0,300,900,1800,3500].forEach(ms=>setTimeout(install,ms));
window.addEventListener('john:session-ready',()=>setTimeout(install,80));
window.addEventListener('john:cloud-applied',()=>setTimeout(install,120));
window.JohnCashbackVisibility82243={install,open:openCashback};
})();
