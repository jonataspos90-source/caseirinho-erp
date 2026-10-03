(function(){'use strict';
const CORE='./commerce-engine-v8-22-0-core.js?v=82241';
const CASHBACK='./cashback-engine-v8-22-42.js?v=82243';
const CASHBACK_VISIBILITY='./cashback-visibility-hotfix-v8-22-43.js?v=82243';
const S=v=>String(v??'');
const N=v=>Number(v)||0;
const A=v=>Array.isArray(v)?v:[];
const norm=v=>S(v).trim().toUpperCase().replace(/\s+/g,'');
function toast(message){try{if(typeof window.toast==='function')return window.toast(message)}catch(_){}alert(message)}
function cloudCfg(){let c={};try{c=JSON.parse(localStorage.getItem('john_cloud_config_v1')||'{}')||{}}catch(_){}return{api:S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),token:S(c.apiKey||c.token||'')}}
function actor(){try{return S(window.usuarioAtual?.()?.nome||window.usuarioAtual?.()?.login||'ERP')}catch(_){return'ERP'}}
async function api(path,opt={}){const c=cloudCfg();if(!c.token)throw new Error('Token do ERP não configurado.');const r=await fetch(c.api+path,{...opt,cache:'no-store',headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.token,'X-ERP-User':actor(),...(opt.headers||{})}});let j={};try{j=await r.json()}catch(_){}if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j}
function getCfg(){try{return window.JohnCommerce822?.getConfig?.()||{}}catch(_){return{}}}
async function persist(cfg,success){try{const r=await api('/api/v1/admin/commerce-engine',{method:'PUT',body:JSON.stringify(cfg)});try{await window.JohnCommerce822?.load?.()}catch(_){}try{window.dispatchEvent(new CustomEvent('john:commerce-config-saved',{detail:{source:'coupon-reliability-82241',config:r.config||cfg}}))}catch(_){}toast(success||'Motor Comercial salvo e publicado na Loja.');return true}catch(e){console.error('[Motor Comercial][Cupons] falha ao salvar',e);toast('Falha ao salvar cupom: '+e.message);return false}}
function couponById(cfg,id){return A(cfg.coupons).find(c=>S(c.id)===S(id))}
function locked(c){return !!c&&(c.locked===true||norm(c.code||c.codigo)==='CASEIRINHO10')}
function loadCashback(){if(window.__JOHN_CASHBACK_82242__||document.querySelector('script[data-john-cashback-82242]'))return;const s=document.createElement('script');s.src=CASHBACK;s.dataset.johnCashback82242='1';s.async=false;s.onerror=()=>toast('Não foi possível carregar o módulo Cashback. Atualize a página.');document.head.appendChild(s)}
function loadCashbackVisibility(){if(window.__JOHN_CASHBACK_VISIBILITY_82243__||document.querySelector('script[data-john-cashback-visibility-82243]'))return;const s=document.createElement('script');s.src=CASHBACK_VISIBILITY;s.dataset.johnCashbackVisibility82243='1';s.async=false;s.onerror=()=>toast('Não foi possível ativar a visualização do Cashback. Atualize a página.');document.head.appendChild(s)}
function install(){
  loadCashbackVisibility();
  loadCashback();
  if(window.__JOHN_COUPON_RELIABILITY_82241__)return;window.__JOHN_COUPON_RELIABILITY_82241__=true;
  document.addEventListener('click',async ev=>{
    const t=ev.target?.closest?.('#ceAddCoupon,[data-toggle-coupon],[data-del-coupon],#ce822Save');if(!t)return;
    const couponTab=document.querySelector('[data-cetab="coupons"].active');
    if(t.id==='ce822Save'&&!couponTab)return;
    ev.preventDefault();ev.stopImmediatePropagation();
    if(t.dataset.ceBusy==='1')return;t.dataset.ceBusy='1';t.disabled=true;
    try{
      let cfg=getCfg();cfg={...cfg,coupons:A(cfg.coupons).map(c=>({...c}))};
      if(t.id==='ceAddCoupon'){
        const code=norm(document.getElementById('ceCouponCode')?.value),value=N(document.getElementById('ceCouponValue')?.value);
        if(!code||value<=0){toast('Informe o código e o valor do cupom.');return}
        if(code==='CASEIRINHO10'){toast('CASEIRINHO10 é o cupom automático de primeira compra e não precisa ser cadastrado manualmente.');return}
        if(cfg.coupons.some(c=>norm(c.code||c.codigo)===code)){toast('Já existe um cupom com este código.');return}
        cfg.coupons.push({id:(crypto.randomUUID?.()||('ce_'+Date.now()+'_'+Math.random().toString(36).slice(2))),code,type:S(document.getElementById('ceCouponType')?.value||'PERCENT'),value,minSubtotal:N(document.getElementById('ceCouponMin')?.value),maxDiscount:N(document.getElementById('ceCouponMax')?.value)||null,startAt:document.getElementById('ceCouponStart')?.value||null,endAt:document.getElementById('ceCouponEnd')?.value||null,active:true});
        await persist(cfg,'Cupom '+code+' salvo e publicado na Loja.');
        return;
      }
      if(t.dataset.toggleCoupon){
        const c=couponById(cfg,t.dataset.toggleCoupon);if(!c)return toast('Cupom não encontrado.');if(locked(c))return toast('O CASEIRINHO10 é automático e permanece ativo para validar primeira compra.');c.active=c.active===false;await persist(cfg,'Status do cupom '+norm(c.code||c.codigo)+' atualizado.');return;
      }
      if(t.dataset.delCoupon){
        const c=couponById(cfg,t.dataset.delCoupon);if(!c)return toast('Cupom não encontrado.');if(locked(c))return toast('O CASEIRINHO10 é um cupom do sistema e não pode ser excluído.');cfg.coupons=cfg.coupons.filter(x=>S(x.id)!==S(t.dataset.delCoupon));await persist(cfg,'Cupom '+norm(c.code||c.codigo)+' excluído.');return;
      }
      if(t.id==='ce822Save')await persist(cfg,'Cupons confirmados e publicados na Loja.');
    }finally{t.dataset.ceBusy='0';t.disabled=false}
  },true);
}
function loadCore(){if(window.JohnCommerce822){install();return}const s=document.createElement('script');s.src=CORE;s.async=false;s.onload=install;s.onerror=()=>toast('Não foi possível carregar o Motor Comercial. Atualize a página.');document.head.appendChild(s)}
loadCore();
})();