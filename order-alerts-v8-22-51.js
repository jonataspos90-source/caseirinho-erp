(function(){'use strict';
if(window.__JOHN_ORDER_ALERTS__)return;window.__JOHN_ORDER_ALERTS__=true;
const API_DEFAULT='https://john-cloud-api-production.up.railway.app';
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'{}')}catch(_){return {}}};
function cfg(){const c=read('john_cloud_config_v1');return {url:String(c.apiUrl||API_DEFAULT).replace(/\/+$/,''),token:String(c.apiKey||c.token||'')}}
function loggedIn(){try{return !!(typeof sessao!=='undefined'&&sessao)}catch(_){return false}}
async function api(path,method='GET',body){
  const c=cfg();if(!c.token)throw new Error('Entre no ERP conectado à nuvem para ativar os avisos.');
  const r=await fetch(c.url+'/api/v1/admin/order-alerts'+path,{method,cache:'no-store',
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.token},
    ...(body?{body:JSON.stringify(body)}:{})});
  const j=await r.json();if(!r.ok)throw new Error(j.error||'Não foi possível configurar os avisos.');return j;
}
function keyBytes(k){const s=atob(k.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(s,c=>c.charCodeAt(0))}
async function registration(){
  await navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'});
  return navigator.serviceWorker.ready;
}
function message(s){const e=document.getElementById('johnOrderAlertsStatus');if(e)e.textContent=s}
async function refresh(){
  try{const j=await api('/status');
    const sub=('serviceWorker' in navigator)?await (await registration()).pushManager?.getSubscription():null;
    message((j.pushConfigured?(sub&&Notification.permission==='granted'?'Avisos ativos neste aparelho.':'Ative os avisos neste aparelho.'):'Push ainda não configurado no servidor.')+
      (j.emailConfigured?' E-mail de apoio ativo: '+j.emailTo+'.':' E-mail de apoio aguardando configuração de envio.'));
    document.getElementById('johnOrderAlertsActivate').textContent=sub?'Reativar avisos neste aparelho':'Ativar avisos neste aparelho';
  }catch(e){message(e.message)}
}
async function activate(){
  if(!('Notification' in window)||!('PushManager' in window)||!('serviceWorker' in navigator))throw new Error('Este navegador não oferece avisos push. Abra o ERP no Chrome do celular.');
  // Solicita permissão no clique, antes de operações de rede.
  const permission=await Notification.requestPermission();
  if(permission!=='granted')throw new Error('Permita as notificações nas configurações do navegador e tente novamente.');
  const j=await api('/status');if(!j.pushConfigured)throw new Error('Push ainda não configurado no servidor.');
  const reg=await registration();let sub=await reg.pushManager.getSubscription();
  if(sub){
    const old=sub.options.applicationServerKey;
    if(old&&btoa(String.fromCharCode(...new Uint8Array(old))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_')!==j.publicKey){
      await api('/subscriptions','DELETE',{endpoint:sub.endpoint});await sub.unsubscribe();sub=null;
    }
  }
  sub=sub||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(j.publicKey)});
  await api('/subscriptions','POST',{subscription:sub.toJSON(),label:/Android/i.test(navigator.userAgent)?'Celular Android':'Aparelho da loja'});
  await api('/test','POST',{endpoint:sub.endpoint});await refresh();
  message('Avisos ativados. Confira a notificação de teste no celular. Você pode fechar o ERP.');
}
async function disable(){
  const sub=await (await registration()).pushManager.getSubscription();
  if(sub){await api('/subscriptions','DELETE',{endpoint:sub.endpoint});await sub.unsubscribe()}
  await refresh();
}
async function test(){
  const sub=await (await registration()).pushManager.getSubscription();
  if(!sub)throw new Error('Ative os avisos neste aparelho primeiro.');
  await api('/test','POST',{endpoint:sub.endpoint});message('Teste enviado. Confira as notificações do aparelho.');
}
function mount(){
  if(!loggedIn()){document.getElementById('johnOrderAlertsLauncher')?.remove();document.getElementById('johnOrderAlertsDialog')?.close();return}
  if(document.getElementById('johnOrderAlertsLauncher'))return;
  const launcher=document.createElement('button');launcher.id='johnOrderAlertsLauncher';launcher.type='button';
  launcher.textContent='🔔 Avisos de pedidos';launcher.style.cssText='position:fixed;bottom:18px;left:18px;z-index:2147482501;padding:12px 16px;background:#5b21b6;color:white;border:0;border-radius:16px;box-shadow:0 4px 16px #0003;font:700 14px system-ui';
  launcher.onclick=()=>{
    const dialog=document.createElement('dialog');dialog.id='johnOrderAlertsDialog';
    dialog.style.cssText='width:min(460px,calc(100vw - 36px));border:0;border-radius:20px;padding:24px;color:#172033;font:16px system-ui;box-shadow:0 16px 60px #0005';
    dialog.innerHTML='<h2 style="margin-top:0">Avisos de novos pedidos</h2><p>Receba os alertas neste aparelho mesmo com o ERP fechado. Cada celular precisa ser ativado uma vez.</p><p id="johnOrderAlertsStatus" role="status">Consultando configuração…</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button id="johnOrderAlertsActivate" type="button">Ativar avisos neste aparelho</button><button id="johnOrderAlertsTest" type="button">Enviar teste</button><button id="johnOrderAlertsDisable" type="button">Desativar neste aparelho</button><button id="johnOrderAlertsClose" type="button">Fechar</button></div><p style="font-size:13px">Mantenha as notificações do Chrome/ERP permitidas. Internet e configurações de bateria do celular podem afetar o recebimento. Os avisos continuam após encerrar a sessão; desative-os antes de deixar de usar este aparelho.</p>';
    document.body.appendChild(dialog);dialog.showModal();
    dialog.querySelectorAll('button').forEach(b=>b.style.cssText='padding:12px;border:1px solid #ddd6fe;border-radius:10px;background:#f5f3ff;color:#5b21b6;font-weight:700');
    const bind=(id,fn)=>dialog.querySelector(id).onclick=async()=>{const b=dialog.querySelector(id);b.disabled=true;try{await fn()}catch(e){message(e.message)}finally{b.disabled=false}};
    bind('#johnOrderAlertsActivate',activate);bind('#johnOrderAlertsTest',test);bind('#johnOrderAlertsDisable',disable);
    dialog.querySelector('#johnOrderAlertsClose').onclick=()=>dialog.close();
    dialog.addEventListener('close',()=>dialog.remove());refresh();
  };
  document.body.appendChild(launcher);
}
setInterval(mount,2000);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
window.JohnOrderAlerts={activate,disable,test};
})();
