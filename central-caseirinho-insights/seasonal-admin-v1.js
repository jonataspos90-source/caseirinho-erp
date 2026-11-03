(()=>{
'use strict';
const E=id=>document.getElementById(id),S=x=>String(x??''),N=x=>Number(x)||0;
const M=x=>N(x).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=x=>S(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const admin={campaigns:[],products:[],orders:[],rules:new Map(),tab:'campaigns',loading:false};
const api=(path,opts)=>window.CaseirinhoSeasonalApi?.(path,opts)||Promise.reject(new Error('Faça login administrativo novamente.'));
function status(message,error=false){
 const e=E('seasonalAdminError');e.hidden=false;e.className='notice '+(error?'error':'success');e.textContent=message;
}
function tabs(name){
 admin.tab=name;
 E('seasonalAdminCampaigns').hidden=name!=='campaigns';E('seasonalAdminOrders').hidden=name!=='orders';
 document.querySelectorAll('[data-seasonal-admin-tab]').forEach(b=>b.className='btn'+(b.dataset.seasonalAdminTab===name?' primary':''));
 if(name==='orders')loadOrders();else renderCampaigns();
}
async function load(){
 if(admin.loading)return;
 admin.loading=true;E('seasonalAdminError').hidden=true;
 try{
  const data=await api('seasonal-campaigns');
  admin.campaigns=data.campaigns||[];admin.products=data.products||[];
  renderCampaigns();renderProducts();
  if(admin.tab==='orders')await loadOrders();
 }catch(e){status('Não foi possível carregar campanhas: '+e.message,true)}
 finally{admin.loading=false;}
}
function readProductInputs(){
 document.querySelectorAll('[data-seasonal-admin-prod]').forEach(row=>{
  const id=row.dataset.seasonalAdminProd;if(!admin.rules.has(id))return;
  const rule=admin.rules.get(id)||{};
  rule.minQuantity=Number(row.querySelector('[data-seasonal-min]')?.value)||1;
  rule.maxQuantity=Number(row.querySelector('[data-seasonal-max]')?.value)||0;
  admin.rules.set(id,rule);
 });
}
function renderProducts(){
 const q=S(E('seasonalProductSearch').value).trim().toLowerCase();
 E('seasonalAdminSelected').textContent=admin.rules.size+' selecionados';
 E('seasonalAdminProducts').innerHTML=admin.products.filter(p=>(S(p.name)+' '+S(p.category)+' '+S(p.id)).toLowerCase().includes(q))
  .map(p=>{
   const rule=admin.rules.get(p.id),checked=!!rule;
   return '<div class="seasonal-admin-product" data-seasonal-admin-prod="'+esc(p.id)+'">'+
     '<label><input type="checkbox" data-seasonal-toggle '+(checked?'checked':'')+'><b>'+esc(p.name)+'</b><small> · '+esc(p.category||'')+' · '+M(p.price)+'</small></label>'+
     '<label>Mínimo<input type="number" min="1" max="10000" step="1" data-seasonal-min value="'+N(rule?.minQuantity||1)+'" '+(!checked?'disabled':'')+'></label>'+
     '<label>Máximo (0 = sem limite)<input type="number" min="0" max="10000" step="1" data-seasonal-max value="'+N(rule?.maxQuantity||0)+'" '+(!checked?'disabled':'')+'></label></div>';
  }).join('')||'<div class="notice">Não há produtos encontrados para o filtro.</div>';
}
function editCampaign(c){
 E('seasonalCampaignId').value=c.id;E('seasonalTitle').value=c.title;E('seasonalDescription').value=c.description||'';
 E('seasonalBannerTextAdmin').value=c.bannerText||'';E('seasonalOrderFrom').value=c.orderFrom;
 E('seasonalOrderUntil').value=c.orderUntil;E('seasonalFulfillmentDates').value=(c.fulfillmentDates||[]).join('\n');
 E('seasonalPickup').checked=c.allowPickup;E('seasonalDelivery').checked=c.allowDelivery;E('seasonalActive').checked=c.active;
 E('seasonalMinQty').value=c.minTotalQuantity||1;E('seasonalMinValue').value=c.minimumOrderValue||0;
 E('seasonalMaxValue').value=c.maximumOrderValue||0;
 admin.rules=new Map((c.products||[]).map(p=>[p.id,{minQuantity:N(p.minQuantity||1),maxQuantity:N(p.maxQuantity||0)}]));
 renderProducts();
 E('seasonalAdminForm').scrollIntoView({behavior:'smooth',block:'start'});
 status('Editando campanha '+c.title+'.');
}
function clearForm(){
 E('seasonalAdminForm').reset();E('seasonalCampaignId').value='';admin.rules.clear();
 E('seasonalMinQty').value=1;E('seasonalMinValue').value=0;E('seasonalMaxValue').value=0;
 E('seasonalPickup').checked=true;E('seasonalDelivery').checked=true;E('seasonalActive').checked=true;
 renderProducts();
}
function renderCampaigns(){
 const list=admin.campaigns;
 E('seasonalAdminKpis').innerHTML=
  '<article class="card"><b>'+list.length+'</b><small>Campanhas cadastradas</small></article>'+
  '<article class="card"><b>'+list.filter(c=>c.status==='ABERTA').length+'</b><small>Recebendo pedidos</small></article>'+
  '<article class="card"><b>'+list.filter(c=>c.status==='AGENDADA').length+'</b><small>Agendadas</small></article>';
 E('seasonalAdminCards').innerHTML=list.map(c=>
  '<article class="card seasonal-admin-campaign"><div><h3>🎄 '+esc(c.title)+'</h3>'+
  '<p><b>'+esc(c.status)+'</b> · '+esc(c.orderFrom)+' até '+esc(c.orderUntil)+'</p>'+
  '<p>📦 '+(c.products||[]).length+' produtos · '+(c.fulfillmentDates||[]).length+' data(s) · 50% de sinal</p></div>'+
  '<button class="btn primary" data-seasonal-edit="'+esc(c.id)+'">✏️ Editar</button></article>'
 ).join('')||'<p class="notice">Nenhuma campanha cadastrada. Crie uma data sazonal abaixo.</p>';
}
function readCampaign(){
 readProductInputs();
 const dates=[...new Set(S(E('seasonalFulfillmentDates').value).split(/[\n,; ]+/).map(x=>x.trim()).filter(Boolean))].sort();
 const products=[...admin.rules].map(([id,r])=>({id,minQuantity:Number(r.minQuantity),maxQuantity:Number(r.maxQuantity)}));
 const campaign={id:S(E('seasonalCampaignId').value),title:S(E('seasonalTitle').value).trim(),description:S(E('seasonalDescription').value).trim(),
 bannerText:S(E('seasonalBannerTextAdmin').value).trim(),orderFrom:E('seasonalOrderFrom').value,orderUntil:E('seasonalOrderUntil').value,
 fulfillmentDates:dates,allowPickup:E('seasonalPickup').checked,allowDelivery:E('seasonalDelivery').checked,
 minimumOrderValue:Number(E('seasonalMinValue').value)||0,maximumOrderValue:Number(E('seasonalMaxValue').value)||0,
 minTotalQuantity:Number(E('seasonalMinQty').value)||1,products,active:E('seasonalActive').checked};
 if(!campaign.title||!campaign.orderFrom||!campaign.orderUntil||!dates.length||!products.length)throw new Error('Informe nome, prazo, datas de recebimento e pelo menos um produto.');
 if(!campaign.allowPickup&&!campaign.allowDelivery)throw new Error('Habilite entrega ou retirada.');
 if(dates.some(d=>!/^20\d\d-\d\d-\d\d$/.test(d)||d<campaign.orderUntil))throw new Error('Datas de entrega devem ser iguais ou posteriores ao fechamento das encomendas.');
 return campaign;
}
async function save(ev){
 ev.preventDefault();let campaign;
 try{campaign=readCampaign()}catch(e){status(e.message,true);return;}
 if(!window.confirm('Publicar '+campaign.title+' com '+campaign.products.length+' produto(s)? Todos os pedidos da campanha exigirão 50% de sinal no Pix e restante no recebimento.'))return;
 const btn=E('seasonalAdminSubmit');btn.disabled=true;btn.textContent='Publicando...';
 try{const result=await api('seasonal-campaigns',{method:'POST',body:campaign});await load();const updated=admin.campaigns.find(x=>x.id===result.id);if(updated)editCampaign(updated);status('✅ Campanha salva na loja e no ERP. O banner ficará visível quando a campanha estiver ativa.');}
 catch(e){status('Falha ao publicar campanha: '+e.message+'. A atualização não foi confirmada.',true);}
 finally{btn.disabled=false;btn.textContent='✅ Publicar campanha no ERP e loja';}
}
function orderFilter(){
 const q=S(E('seasonalAdminOrderSearch').value).toLowerCase(),filter=E('seasonalAdminOrderStatus').value,date=E('seasonalAdminOrderDate').value;
 return admin.orders.filter(x=>{
  const s=x.seasonal||{};
  const match=!q||(S(x.name)+' '+S(x.phone)+' '+S(x.code)+' '+S(s.campaignTitle)).toLowerCase().includes(q);
  return match&&(!date||x.deliveryDate===date)&&(filter==='all'||filter==='deposit'&&s.depositStatus!=='PAID'||filter==='paid'&&s.depositStatus==='PAID'||
   filter==='balance'&&s.depositStatus==='PAID'&&s.balanceStatus!=='PAID'||filter==='settled'&&s.depositStatus==='PAID'&&s.balanceStatus==='PAID');
 });
}
function renderOrders(){
 const rows=orderFilter(),all=admin.orders;
 E('seasonalAdminOrderKpis').innerHTML=
  '<article class="card"><b>'+all.length+'</b><small>Encomendas registradas</small></article>'+
  '<article class="card"><b>'+all.filter(x=>x.seasonal?.depositStatus==='PAID').length+'</b><small>Sinais confirmados</small></article>'+
  '<article class="card"><b>'+all.filter(x=>x.seasonal?.balanceStatus==='PAID').length+'</b><small>Pedidos quitados</small></article>'+
  '<article class="card"><b>'+M(all.reduce((sum,x)=>sum+(x.seasonal?.balanceStatus==='PAID'?0:N(x.seasonal?.balanceDue)),0))+'</b><small>Saldos por receber</small></article>';
 E('seasonalAdminOrderList').innerHTML=rows.length?rows.map(o=>{
  const v=o.seasonal||{},sinal=v.depositStatus==='PAID',quitado=v.balanceStatus==='PAID';
  return '<article class="card seasonal-admin-order"><h3>📦 Pedido '+esc(o.code)+' · '+esc(o.name)+'</h3>'+
   '<p>🎁 '+esc(v.campaignTitle||'Campanha')+' · '+esc(o.deliveryDate||'')+' · '+(o.mode==='ENTREGA'?'Entrega':'Retirada')+
   '<br>WhatsApp: '+esc(o.phone)+' · Situação: '+esc(o.status)+' · '+esc(o.integration)+'</p>'+
   '<div class="seasonal-financial"><span>Total <b>'+M(o.total)+'</b></span><span>Sinal <b>'+M(v.depositDue)+'</b><small>'+(sinal?'✅ Confirmado':'⏳ Pendente')+'</small></span>'+
   '<span>Restante <b>'+M(v.balanceDue)+'</b><small>'+(quitado?'✅ Confirmado':'⏳ Na entrega')+'</small></span></div>'+
   (!sinal?'<button class="btn primary" data-seasonal-payment="'+esc(o.id)+'" data-stage="DEPOSIT">💚 Confirmar recebimento do sinal</button>':
    !quitado?'<button class="btn primary" data-seasonal-payment="'+esc(o.id)+'" data-stage="BALANCE">✅ Confirmar saldo na entrega</button>':
     '<span class="badge good">✅ Pedido quitado</span>')+'</article>';
 }).join(''):'<p class="notice">Nenhuma encomenda encontrada.</p>';
}
async function loadOrders(){
 try{const result=await api('seasonal-orders');admin.orders=result.orders||[];renderOrders();}
 catch(e){status('Não foi possível carregar as encomendas: '+e.message,true)}
}
async function confirmPayment(id,stage){
 const order=admin.orders.find(x=>x.id===id);if(!order)return;
 const label=stage==='DEPOSIT'?'sinal':'saldo na entrega/retirada',amount=stage==='DEPOSIT'?order.seasonal.depositDue:order.seasonal.balanceDue;
 const reference=window.prompt('Informe referência do pagamento de '+M(amount)+' ('+label+') para o pedido '+order.code+'.\nEx.: número do comprovante Pix ou conferência de recebimento presencial.');
 if(!reference||reference.trim().length<3)return;
 if(!window.confirm('Confirma que o valor '+M(amount)+' foi REALMENTE recebido? Não basta o cliente ter enviado um comprovante. '+(stage==='BALANCE'?'O pedido já foi entregue/retirado.':'')))return;
 try{await api('seasonal-orders/'+encodeURIComponent(id)+'/confirm-payment',{method:'POST',body:{stage,paymentVerified:true,reference:reference.trim(),...(stage==='BALANCE'?{delivered:true}:{})}});
  status('✅ '+label+' confirmado para o pedido '+order.code+'.');await loadOrders();
 }catch(e){status('Não foi possível confirmar pagamento: '+e.message,true)}
}
function bind(){
 E('seasonalAdminRefresh')?.addEventListener('click',load);
 E('seasonalProductSearch')?.addEventListener('input',()=>{readProductInputs();renderProducts()});
 E('seasonalAdminProducts')?.addEventListener('change',e=>{
  const row=e.target.closest('[data-seasonal-admin-prod]');if(!row)return;
  const id=row.dataset.seasonalAdminProd;if(e.target.matches('[data-seasonal-toggle]')){
   if(e.target.checked)admin.rules.set(id,{minQuantity:1,maxQuantity:0});else admin.rules.delete(id);
  }else if(admin.rules.has(id))readProductInputs();
  renderProducts();
 });
 E('seasonalAdminCards')?.addEventListener('click',e=>{
  const b=e.target.closest('[data-seasonal-edit]');if(!b)return;
  const c=admin.campaigns.find(x=>x.id===b.dataset.seasonalEdit);if(c)editCampaign(c);
 });
 E('seasonalAdminForm')?.addEventListener('submit',save);
 E('seasonalAdminClear')?.addEventListener('click',clearForm);
 document.querySelectorAll('[data-seasonal-admin-tab]').forEach(b=>b.addEventListener('click',()=>tabs(b.dataset.seasonalAdminTab)));
 ['seasonalAdminOrderSearch','seasonalAdminOrderDate'].forEach(id=>E(id)?.addEventListener('input',renderOrders));
 E('seasonalAdminOrderStatus')?.addEventListener('change',renderOrders);
 E('seasonalAdminOrderList')?.addEventListener('click',e=>{
  const b=e.target.closest('[data-seasonal-payment]');if(b)confirmPayment(b.dataset.seasonalPayment,b.dataset.stage);
 });
}
window.CaseirinhoSeasonalAdmin={load};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();