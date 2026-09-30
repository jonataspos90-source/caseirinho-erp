(function(){
'use strict';
if(window.__CASEIRINHO_PIX_CONFIG_82235__)return;
window.__CASEIRINHO_PIX_CONFIG_82235__=true;

const OFFICIAL='69195483000123';
const S=v=>String(v??'');
const E=id=>document.getElementById(id);
function database(){try{return (typeof db!=='undefined'&&db)||window.db||null}catch(_){return window.db||null}}
function persist(){
  const d=database();if(!d)return false;
  try{if(typeof save==='function'){save();return true}}catch(_){}
  try{if(typeof __johnLocalStorage!=='undefined'&&typeof DB_KEY!=='undefined'){__johnLocalStorage.setItem(DB_KEY,JSON.stringify(d));return true}}catch(_){}
  try{localStorage.setItem('pcp_app_v1',JSON.stringify(d));return true}catch(_){return false}
}
function ensureOfficial(){
  const d=database();if(!d)return false;
  d.config=d.config&&typeof d.config==='object'?d.config:{};
  const c=d.config.impressaoPedidos=d.config.impressaoPedidos&&typeof d.config.impressaoPedidos==='object'?d.config.impressaoPedidos:{};
  let changed=false;
  if(S(c.documentoTipo).toUpperCase()!=='CNPJ'){c.documentoTipo='CNPJ';changed=true}
  if(S(c.documento).replace(/\D/g,'')!==OFFICIAL){c.documento=OFFICIAL;changed=true}
  if(S(c.chavePix).replace(/\D/g,'')!==OFFICIAL){c.chavePix=OFFICIAL;changed=true}
  if(changed){c.pixOficialCaseirinho=true;c.pixAtualizadoEm=new Date().toISOString();persist()}
  return true;
}
function decorateConfig(){
  if(!ensureOfficial())return;
  const key=E('configChavePixPedido');
  const doc=E('configDocumentoQr');
  const type=E('configDocumentoQrTipo');
  if(key){key.value=OFFICIAL;key.readOnly=true;key.title='PIX oficial do Caseirinho'}
  if(doc){doc.value=OFFICIAL;doc.readOnly=true}
  if(type){type.value='CNPJ';type.disabled=true}
  if(key&&!E('caseirinhoPixOfficialNote')){
    const n=document.createElement('div');n.id='caseirinhoPixOfficialNote';n.style.cssText='margin-top:8px;padding:10px 12px;border-radius:10px;background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46;font-size:12px;font-weight:750;line-height:1.45';
    n.innerHTML='<b>PIX oficial do Caseirinho</b><br>CNPJ 69.195.483/0001-23. O QR Code do App usa esta chave e preenche automaticamente o valor exato de cada pedido aceito.';
    key.insertAdjacentElement('afterend',n);
  }
}
function init(){ensureOfficial();decorateConfig()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,500),{once:true});else setTimeout(init,180);
const mo=new MutationObserver(()=>{if(E('configChavePixPedido'))decorateConfig()});
try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(_){}
document.addEventListener('click',e=>{const p=e.target.closest?.('[data-page]')?.dataset?.page;if(p==='config')setTimeout(decorateConfig,180)},true);
[900,2200,5000].forEach(ms=>setTimeout(init,ms));
window.CaseirinhoPixConfig82235={version:'8.22.35',key:OFFICIAL,ensure:ensureOfficial};
})();
