(function(){
'use strict';
if(window.__JOHN_PIX_CONFIG_STAY_82222__)return;
window.__JOHN_PIX_CONFIG_STAY_82222__=true;
const VERSION='8.22.22';
const KEY='john_pix_print_config_v82222';
const S=v=>String(v??'');
let lastPageId='',lastScroll=0,restoreTimer=null;
function store(){try{return window.__johnLocalStorage||localStorage}catch(_){return localStorage}}
function dbRef(){try{return window.db||(typeof db!=='undefined'?db:null)}catch(_){return window.db||null}}
function dbKey(){try{return typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1'}catch(_){return 'pcp_app_v1'}}
function saveDb(){const d=dbRef();if(!d)return;try{store().setItem(dbKey(),JSON.stringify(d))}catch(_){}}
function visiblePage(){return [...document.querySelectorAll('.page')].find(p=>!p.classList.contains('hidden')&&getComputedStyle(p).display!=='none')||null}
function fieldByLabel(rx){
 const labels=[...document.querySelectorAll('label')];
 const l=labels.find(x=>rx.test(S(x.textContent)));
 if(!l)return null;
 if(l.htmlFor){const f=document.getElementById(l.htmlFor);if(f)return f}
 return l.parentElement?.querySelector('input,select,textarea')||l.closest('div')?.querySelector('input,select,textarea')||null;
}
function fields(){return{
 tipo:fieldByLabel(/Documento do QR Code/i),
 documento:fieldByLabel(/CPF\s*\/\s*CNPJ usado no QR Code/i),
 pix:fieldByLabel(/Chave PIX exibida no pedido/i)
}}
function readSaved(){try{return JSON.parse(store().getItem(KEY)||'{}')||{}}catch(_){return{}}}
function persistFields(){
 const f=fields();if(!f.tipo&&!f.documento&&!f.pix)return false;
 const data={tipo:S(f.tipo?.value),documento:S(f.documento?.value),pix:S(f.pix?.value),atualizadoEm:new Date().toISOString()};
 try{store().setItem(KEY,JSON.stringify(data))}catch(_){}
 const d=dbRef();if(d){d.config=d.config&&typeof d.config==='object'?d.config:{};d.config.impressao=d.config.impressao&&typeof d.config.impressao==='object'?d.config.impressao:{};d.config.impressao.qrDocumentoTipo=data.tipo;d.config.impressao.qrDocumentoValor=data.documento;d.config.impressao.chavePix=data.pix;saveDb()}
 return true;
}
function restoreFields(force=false){
 const f=fields(),saved=readSaved(),d=dbRef(),cfg=d?.config?.impressao||{};
 const vals={tipo:S(cfg.qrDocumentoTipo||saved.tipo),documento:S(cfg.qrDocumentoValor||saved.documento),pix:S(cfg.chavePix||saved.pix)};
 for(const [k,el] of Object.entries(f)){if(!el)continue;const v=vals[k];if(v&&(force||!S(el.value).trim())){el.value=v;try{el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}catch(_){} }}
}
function captureView(){const p=visiblePage();lastPageId=p?.id||'';lastScroll=window.scrollY||0;persistFields()}
function restoreView(){
 restoreFields(true);
 if(lastPageId){
  const pg=document.getElementById(lastPageId);
  if(pg){document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));pg.classList.remove('hidden')}
  try{if(typeof window.showPage==='function')window.showPage(lastPageId)}catch(_){}
 }
 try{window.scrollTo(0,lastScroll)}catch(_){}
}
function scheduleRestore(){clearTimeout(restoreTimer);[60,180,420,900].forEach(ms=>setTimeout(restoreView,ms))}
function isTargetArea(el){const t=S(el?.closest?.('.card,section,form,.panel,div')?.textContent);return /Impressão de Pedidos, QR e Separação/i.test(t)||/CPF\s*\/\s*CNPJ usado no QR Code/i.test(S(document.body.textContent))}
function install(){
 restoreFields(false);
 const f=fields();[f.tipo,f.documento,f.pix].filter(Boolean).forEach(el=>{if(el.dataset.johnPixStay82222)return;el.dataset.johnPixStay82222='1';['input','change','blur'].forEach(ev=>el.addEventListener(ev,persistFields))});
}
document.addEventListener('submit',e=>{if(isTargetArea(e.target)){captureView();scheduleRestore()}},true);
document.addEventListener('click',e=>{const b=e.target.closest?.('button,input[type=submit]');if(!b)return;const txt=S(b.textContent||b.value);if(/salvar|gravar|aplicar/i.test(txt)&&isTargetArea(b)){captureView();scheduleRestore()}},true);
const mo=new MutationObserver(()=>install());
function boot(){install();mo.observe(document.documentElement,{subtree:true,childList:true});[300,900,1800,3500].forEach(ms=>setTimeout(install,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.JohnPixConfigStay82222={version:VERSION,persist:persistFields,restore:restoreFields};
})();