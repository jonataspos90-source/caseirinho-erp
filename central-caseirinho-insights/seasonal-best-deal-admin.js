/* Caseirinho — Pack Virtual de Encomendas: escolha 2+ SKUs e um preço total fixo. */
(function(){
'use strict';
const $=id=>document.getElementById(id),s=x=>String(x??'');
const money=x=>(Number(x)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const normal=x=>s(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const cents=x=>Math.round((Number(x)||0)*100);
const selection=()=>{try{return[...seasonPackSelected].map(String)}catch(_){return[]}};
const pool=()=>{try{return typeof seasonMerchPackPool==='function'?seasonMerchPackPool():[]}catch(_){return[]}};
function preview(){
 const target=$('seasonBestDealPreview');if(!target)return;
 const ids=selection(),products=new Map(pool().map(p=>[s(p.id),p]));
 const chosen=ids.map(id=>products.get(id)).filter(Boolean);
 const campaign=s($('seasonMerchCampaign')?.value);
 const qty=Number($('seasonPackQuantity')?.value),price=typeof seasonPackPriceNumber==='function'?seasonPackPriceNumber($('seasonPackPrice')?.value):Number($('seasonPackPrice')?.value);
 const active=$('seasonPackActive')?.checked;
 const valid=!!campaign&&ids.length>=2&&ids.length===chosen.length&&Number.isInteger(qty)&&qty>=2&&qty<=100&&Number.isFinite(price)&&price>0;
 const lowest=chosen.length?Math.min(...chosen.map(p=>cents(p.price))):0;
 const highest=chosen.length?Math.max(...chosen.map(p=>cents(p.price))):0;
 const minRetail=lowest*qty,maxRetail=highest*qty,offer=cents(price);
 const guarantee=valid&&lowest>0&&offer<minRetail;
 const newProducts=chosen.filter(p=>!p.inCampaign).length;
 const save=$('seasonPackSave');
 if(save)save.disabled=!!active&&!guarantee||!valid;
 target.className='season-bestdeal-preview'+(guarantee?' is-good':'');
 target.replaceChildren();
 const title=document.createElement('b'),info=document.createElement('small'),extra=document.createElement('small'),status=document.createElement('strong');
 if(!campaign){
  title.textContent='1. Selecione a campanha de encomendas.';
  info.textContent='O Pack Virtual ficará exclusivamente na campanha escolhida, sem alterar a loja comum.';
 }else if(ids.length<2){
  title.textContent='2. Marque pelo menos dois produtos ou sabores.';
  info.textContent='Pode escolher empadas, panquecas ou outros itens ativos do catálogo. Não precisa cadastrá-los outra vez.';
 }else if(!valid){
  title.textContent=ids.length+' itens participantes selecionados.';
  info.textContent='3. Informe quantidade total de unidades e o preço fechado do pack.';
 }else{
  title.textContent='🎁 '+qty+' unidades de sabores à escolha por '+money(price);
  info.textContent='Preço equivalente: '+money(price/qty)+' por unidade. Avulso varia de '+money(minRetail/100)+' a '+money(maxRetail/100)+' conforme os sabores.';
  extra.textContent=chosen.length+' produtos participantes'+(newProducts?' · '+newProducts+' será(ão) vinculado(s) à campanha automaticamente':' · todos já vinculados à campanha');
  status.textContent=guarantee?
   '✅ Valor garantido para qualquer combinação: economia mínima de '+money((minRetail-offer)/100)+'.':
   '⚠️ Para garantir preço único em todas as combinações, informe um total inferior a '+money(minRetail/100)+'.';
  status.className=guarantee?'season-virtual-success':'season-virtual-warning';
 }
 target.append(title,info);
 if(extra.textContent)target.append(extra);
 if(status.textContent)target.append(status);
 const label=$('seasonPackSave');
 if(label)label.textContent='🚀 Salvar e publicar Pack Virtual';
}
function gotoPack(reset=false){
 const desired=$('seasonMerchCampaign')?.value||$('seasonCampaignSelect')?.value||$('seasonExclusiveCampaign')?.value;
 if(desired&&typeof seasonMerchSelectCampaign==='function'&&$('seasonMerchCampaign')?.value!==desired)
  seasonMerchSelectCampaign(desired);
 if(typeof seasonMerchTabSet==='function')seasonMerchTabSet('pack');
 if(reset&&typeof seasonMerchReset==='function')seasonMerchReset('PACK');
 preview();
 $('seasonMerchPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
 $('seasonPackName')?.focus({preventScroll:true});
}
function example(kind){
 gotoPack(true);
 const isEmpada=kind==='empadas';
 const qty=isEmpada?5:12;
 const name=isEmpada?'Pack Virtual — 5 Empadas':'Pack Virtual — 12 Panquecas';
 const chosen=pool().filter(p=>{
  const term=normal(p.name+' '+(p.variantLabel||''));
  return isEmpada?
   term.includes('empada')&&!term.includes('empadao')&&!term.includes('camarao')&&!/pack|combo|kit/.test(term):
   term.includes('panqueca')&&!/pack|combo|kit/.test(term);
 });
 $('seasonPackName').value=name;
 $('seasonPackQuantity').value=qty;
 $('seasonPackDescription').value='Escolha '+qty+' unidades e combine os sabores participantes por um preço único.';
 $('seasonPackPrice').value=isEmpada?'47.99':'139.99';
 if(typeof seasonPackSelected!=='undefined')seasonPackSelected=new Set(chosen.map(p=>s(p.id)));
 if(typeof seasonMerchPackOptions==='function')seasonMerchPackOptions();
 preview();
 if(chosen.length<2) {
  const status=$('seasonMerchStatus');
  if(status){status.hidden=false;status.className='notice warn';status.textContent='Encontrei menos de 2 produtos deste tipo. Selecione manualmente os produtos participantes ou confirme que os sabores estão ativos no catálogo.';}
 }
}
function init(){
 const panel=$('seasonMerchPackPanel'),merch=$('seasonMerchPanel');
 if(!panel||!merch||$('seasonBestDealPreview'))return;
 const feature=document.createElement('article');
 feature.id='seasonVirtualPackLaunch';feature.className='season-virtual-launch';
 feature.innerHTML='<div><strong>🎁 Pack Virtual de Encomendas</strong>'+
  '<p>Escolha dois ou mais produtos, informe quantas unidades o cliente poderá combinar e defina um preço único. Ex.: 5 empadas por R$ 47,99.</p>'+
  '<small>Sem criar novos produtos. Os sabores ficam disponíveis apenas na campanha de encomendas.</small></div>'+
  '<button type="button" class="btn primary" id="seasonVirtualPackOpen">➕ Novo Pack Virtual</button>';
 merch.insertAdjacentElement('beforebegin',feature);
 $('seasonVirtualPackOpen').addEventListener('click',()=>gotoPack(true));
 const top=document.createElement('div');top.className='season-bestdeal-entry';
 top.innerHTML='<div><strong>🎁 Cadastre seu Pack Virtual</strong><small>Defina um preço total para qualquer mistura de sabores e publique na vitrine de encomendas.</small></div>'+
  '<button class="btn" type="button" id="seasonGoBestDeal">➕ Criar novo</button>';
 merch.insertBefore(top,merch.querySelector('.merch-tabs'));
 $('seasonGoBestDeal').addEventListener('click',()=>gotoPack(true));
 const guide=document.createElement('div');guide.className='season-bestdeal-guide';
 guide.innerHTML='<b>Comece com um modelo ou personalize do zero</b><p>Você pode selecionar qualquer conjunto de produtos existentes ou exclusivos da campanha, configurar a quantidade e editar o valor fechado.</p>'+
 '<div class="toolbar"><button type="button" class="btn" data-season-virtual-example="empadas">🥟 5 Empadas · R$ 47,99</button>'+
 '<button type="button" class="btn" data-season-virtual-example="panquecas">🥞 12 Panquecas · R$ 139,99</button></div>';
 panel.insertBefore(guide,panel.querySelector('.form-grid'));
 guide.addEventListener('click',e=>{const b=e.target.closest('[data-season-virtual-example]');if(b)example(b.dataset.seasonVirtualExample);});
 const counter=document.createElement('p');counter.id='seasonPackSelectedCount';counter.className='season-pack-virtual-count';
 $('seasonPackProductSearch').insertAdjacentElement('afterend',counter);
 const p=document.createElement('div');p.id='seasonBestDealPreview';p.className='season-bestdeal-preview';p.setAttribute('role','status');p.setAttribute('aria-live','polite');
 $('seasonPackProductList').insertAdjacentElement('afterend',p);
 for(const id of ['seasonPackName','seasonPackQuantity','seasonPackPrice','seasonPackActive','seasonMerchCampaign','seasonPackSelect']){
  $(id)?.addEventListener('input',preview);$(id)?.addEventListener('change',preview);
 }
 const observer=new MutationObserver(()=>preview());
 observer.observe($('seasonPackProductList'),{childList:true});
 window.CaseirinhoVirtualPackAdmin={preview,gotoPack,example};
 if(typeof seasonMerchPackOptions==='function')seasonMerchPackOptions();
 preview();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();