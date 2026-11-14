/* Ofertas de quantidade e preco fechado para encomendas: usa o cadastro sazonal oficial. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const v=x=>String(x==null?'':x);
const price=x=>Number(x||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const normalize=x=>v(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function pool(){
  try{return typeof seasonMerchPackPool==='function'?seasonMerchPackPool():[];}catch(_){return [];}
}
function selectedIds(){
  try{return [...seasonPackSelected].map(String);}catch(_){return [];}
}
function preview(){
 const box=$('seasonBestDealPreview');if(!box)return;
 const ids=selectedIds(),items=pool().filter(p=>ids.includes(v(p.id)));
 const qty=Math.floor(Number($('seasonPackQuantity')?.value||0));
 const total=Number($('seasonPackPrice')?.value||0);
 const active=$('seasonPackActive')?.checked;
 const valid=qty>=2&&qty<=100&&Number.isFinite(total)&&total>0&&items.length>0;
 const min=items.length?Math.min(...items.map(p=>Number(p.price)||0)):0;
 const max=items.length?Math.max(...items.map(p=>Number(p.price)||0)):0;
 const safe=(x)=>Math.round(x*100)/100;
 const best=valid&&min>0&&safe(qty*min)>safe(total);
 const save=$('seasonPackSave');
 box.className='season-bestdeal-preview '+(best?'is-good':'');
 if(!items.length){
  box.innerHTML='<b>1. Escolha os sabores participantes.</b><small>Depois informe quantas unidades o cliente poderá combinar e o valor fechado do combo.</small>';
 }else if(!valid){
  box.innerHTML='<b>'+items.length+' sabor(es) selecionado(s)</b><small>Informe quantidade de 2 a 100 e preço fechado maior que zero para ver a oferta.</small>';
 }else{
  const low=safe(qty*min),high=safe(qty*max),minSave=safe(low-total),maxSave=safe(high-total);
  box.innerHTML='<b>'+(best?'🔥 MELHOR NEGÓCIO':'🎁 COMBO DE ENCOMENDAS')+' · '+qty+' unidades por '+price(total)+'</b>'+
   '<small>Preço equivalente: '+price(safe(total/qty))+' por unidade · '+items.length+' sabor(es) à escolha</small>'+
   '<small>Avulso com estes sabores: de '+price(low)+' a '+price(high)+' (dependendo da combinação)</small>'+
   (best?'<strong>Economia a partir de '+price(minSave)+' · até '+price(maxSave)+'</strong>':
   '<strong class="warning">Atenção: este preço não gera desconto para todas as combinações. A loja só aplicará o pack quando ele for mais barato que a compra avulsa.</strong>')+
   (active?'':'<small>⚠ O pack está inativo e não aparecerá na loja.</small>');
 }
 if(save)save.textContent='🚀 Salvar e publicar combo na loja';
}
function preset(type){
 const isEmpada=type==='empadas',name=isEmpada?'Combo 5 Empadas':'Combo 10 Panquecas',quantity=isEmpada?5:10;
 try{
  if(typeof seasonMerchTabSet==='function')seasonMerchTabSet('pack');
  if(typeof seasonMerchReset==='function')seasonMerchReset('PACK');
  const eligible=pool().filter(p=>{
   const name=normalize(p.name+' '+(p.variantLabel||''));
   return (isEmpada?name.includes('empada')&&!name.includes('camarao'):name.includes('panqueca'));
  });
  $('seasonPackName').value=name;
  $('seasonPackQuantity').value=quantity;
  $('seasonPackDescription').value='Escolha '+quantity+' unidades e combine seus sabores favoritos.';
  $('seasonPackProductSearch').value='';
  if(typeof seasonPackSelected!=='undefined')seasonPackSelected=new Set(eligible.map(p=>v(p.id)));
  if(typeof seasonMerchPackOptions==='function')seasonMerchPackOptions();
  preview();
  if(!eligible.length){
   const status=$('seasonMerchStatus');
   if(status){status.hidden=false;status.className='notice warn';status.textContent='Nenhum sabor de '+(isEmpada?'empada':'panqueca')+' participante desta campanha. Inclua os produtos na campanha antes de publicar o combo.';}
  }
  $('seasonPackPrice').focus();
  $('seasonMerchPackPanel').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(err){console.error('[Combos de encomenda]',err);}
}
function init(){
 const panel=$('seasonMerchPackPanel'),target=$('seasonMerchPanel');
 if(!panel||!target||$('seasonBestDealPreview'))return;
 const top=document.createElement('div');top.className='season-bestdeal-entry';
 top.innerHTML='<div><strong>🔥 Melhor Negócio · Combos de Encomendas</strong><small>Cadastre X empadas ou X panquecas por um preço fechado. O cliente escolhe os sabores na loja.</small></div>'+
 '<button class="btn primary" type="button" id="seasonGoBestDeal">➕ Criar combo de encomenda</button>';
 target.insertBefore(top,target.querySelector('.merch-tabs'));
 const guide=document.createElement('div');guide.className='season-bestdeal-guide';
 guide.innerHTML='<b>🎁 Cadastro rápido: quantidade + preço fechado</b><p>Use um modelo ou crie sua própria combinação. O cadastro permanece separado dos produtos avulsos e é publicado diretamente na campanha escolhida.</p>'+
 '<div class="toolbar"><button type="button" class="btn" data-season-bestdeal-preset="empadas">🥟 5 Empadas</button><button type="button" class="btn" data-season-bestdeal-preset="panquecas">🥞 10 Panquecas</button></div>';
 panel.insertBefore(guide,panel.querySelector('.form-grid'));
 const p=document.createElement('div');p.id='seasonBestDealPreview';p.className='season-bestdeal-preview';p.setAttribute('role','status');p.setAttribute('aria-live','polite');
 $('seasonPackProductList').insertAdjacentElement('afterend',p);
 const css=document.createElement('style');css.textContent='.season-bestdeal-entry{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin:14px 0;padding:16px;border:1px solid #d6bd72;border-radius:14px;background:linear-gradient(115deg,#fff9e8,#f1fbef)}.season-bestdeal-entry strong{display:block;color:#154d3c;font-size:17px}.season-bestdeal-entry small{display:block;color:#56685c;margin-top:5px}.season-bestdeal-guide{border:1px dashed #d5ad69;border-radius:13px;padding:13px;margin:11px 0;background:#fff9ec}.season-bestdeal-guide p{margin:7px 0;font-size:13px}.season-bestdeal-preview{display:grid;gap:6px;border-radius:12px;padding:13px;margin:12px 0;background:#f6f7f5;border:1px solid #c9d3c9;color:#204c38}.season-bestdeal-preview.is-good{background:#eaf8ee;border-color:#7ab68b}.season-bestdeal-preview b{font-size:16px}.season-bestdeal-preview small{display:block;color:#50645c}.season-bestdeal-preview strong{color:#087348}.season-bestdeal-preview .warning{color:#a45219}@media(max-width:680px){.season-bestdeal-entry{align-items:stretch}.season-bestdeal-entry button{width:100%}}';
 document.head.appendChild(css);
 $('seasonGoBestDeal').addEventListener('click',()=>{if(typeof seasonMerchTabSet==='function')seasonMerchTabSet('pack');panel.scrollIntoView({behavior:'smooth',block:'start'});$('seasonPackName')?.focus();});
 guide.addEventListener('click',e=>{const b=e.target.closest('[data-season-bestdeal-preset]');if(b)preset(b.dataset.seasonBestdealPreset);});
 for(const id of ['seasonPackName','seasonPackQuantity','seasonPackPrice','seasonPackActive','seasonMerchCampaign','seasonPackSelect']){
  $(id)?.addEventListener('input',preview);$(id)?.addEventListener('change',()=>setTimeout(preview,0));
 }
 $('seasonPackProductList').addEventListener('change',()=>setTimeout(preview,0));
 const observer=new MutationObserver(()=>preview());
 observer.observe($('seasonPackProductList'),{childList:true});
 // Apos salvar, a lista de packs e atualizada pela API; nova escolha continua editavel.
 preview();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();