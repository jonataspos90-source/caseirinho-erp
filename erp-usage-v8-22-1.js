(function(){
'use strict';
if(window.__JOHN_ERP_USAGE_8221__)return;window.__JOHN_ERP_USAGE_8221__=true;
const S=v=>String(v??''),A=v=>Array.isArray(v)?v:[],E=id=>document.getElementById(id);
function cfg(){let c={};try{c=JSON.parse(localStorage.getItem('john_cloud_config_v1')||'{}')||{}}catch(_){}return{api:S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),token:S(c.apiKey||c.token||'')}}
function isERP(x){return /^ERP:/i.test(S(x?.appVersion))||/^erp-/i.test(S(x?.clientId))}
function active(x){const t=new Date(x?.lastSeenAt||0).getTime();return Number.isFinite(t)&&Date.now()-t<5*60000}
function label(id,text){const el=E(id),sm=el?.parentElement?.querySelector('small');if(sm)sm.textContent=text}
async function render(){
 const c=cfg();if(!c.token)return;
 try{await window.johnERPUsage820?.heartbeat?.()}catch(_){}
 let r;try{r=await fetch(c.api+'/api/v1/admin/store/usage/summary',{cache:'no-store',headers:{Authorization:'Bearer '+c.token,'Cache-Control':'no-cache'}})}catch(_){return}
 if(!r?.ok)return;let j={};try{j=await r.json()}catch(_){return}
 const clients=A(j.clients),erp=clients.filter(isERP),store=clients.filter(x=>!isERP(x));
 const erpNow=erp.filter(active),storeNow=store.filter(active);
 const values={
  ua87Now:erpNow.length,
  ua87Day:erpNow.filter(x=>x.standalone).length,
  ua87All:erpNow.filter(x=>!x.standalone).length,
  ua87Pwa:storeNow.filter(x=>x.standalone).length,
  ua87Web:storeNow.filter(x=>!x.standalone).length
 };
 Object.entries(values).forEach(([id,v])=>{if(E(id))E(id).textContent=String(v)});
 label('ua87Now','ERP ativos agora');
 label('ua87Day','ERP App/PWA agora');
 label('ua87All','ERP navegador agora');
 label('ua87Pwa','Loja/App PWA agora');
 label('ua87Web','Loja/App navegador agora');
 const note=document.querySelector('#usoAppV87 .john-v870-note');if(note)note.innerHTML='<b>Online em tempo real:</b> os cinco primeiros cards mostram somente dispositivos com ping recebido nos últimos 5 minutos, separados entre ERP e Loja/App.';
 }
function schedule(){[250,800,1600].forEach(ms=>setTimeout(render,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
setInterval(render,60000);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-page="usoAppV87"],#ua87Refresh'))setTimeout(render,650)},true);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(render,250)});
window.JohnERPUsage8221={render};
})();