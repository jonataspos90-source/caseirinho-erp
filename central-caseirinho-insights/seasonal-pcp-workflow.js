/* Etapa PCP: status real de produção, fila por pedido, diagnóstico operacional. */
(function(){
'use strict';
const $=id=>document.getElementById(id),s=x=>String(x??'');
const esc=x=>s(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const steps=['LIBERADO_PARA_PRODUCAO','EM_PRODUCAO','PRODUZIDO','EMBALADO','PRONTO'];
const labels={LIBERADO_PARA_PRODUCAO:'Liberado',EM_PRODUCAO:'Em produção',PRODUZIDO:'Produzido',EMBALADO:'Embalado',PRONTO:'Pronto'};
let loadedAt=0,busy=false;
const bridge=()=>window.CaseirinhoSeasonMerchBridge;
function mount(){
 const report=$('productionReport');if(!report||$('seasonPcpWorkflow'))return;
 const box=document.createElement('div');box.id='seasonPcpWorkflow';box.style.cssText='margin:16px 0 22px;padding:16px;border:1px solid #d5e6d9;border-radius:15px;background:#f8fcf9';
 box.innerHTML='<div class="section-head"><div><h3>👩‍🍳 Acompanhamento da produção</h3><p>Os pedidos avançam somente com sinal confirmado. A etapa é registrada no pedido e no histórico de auditoria.</p></div><button class="btn" type="button" id="seasonPcpRefresh">↻ Atualizar operação</button></div><div id="seasonPcpHealth" class="grid stats"></div><div id="seasonPcpAlert" class="notice" role="status">Carregue a operação para conferir os pedidos.</div><div id="seasonPcpCards"></div>';
 report.prepend(box);$('seasonPcpRefresh').onclick=load;
 $('seasonPcpCards').addEventListener('click',async e=>{
  const b=e.target.closest('button[data-pcp-next]');if(!b||busy)return;
  const id=b.dataset.pcpId,next=b.dataset.pcpNext,code=b.dataset.pcpCode;
  if(Date.now()-loadedAt>10*60*1000){notice('Consulta antiga. Atualize antes de avançar a produção.',true);return}
  if(!confirm('Confirmar pedido #'+code+' como '+labels[next]+'? Essa ação fica registrada no histórico.'))return;
  busy=true;b.disabled=true;b.textContent='Salvando...';
  try{
   const result=await bridge().api('seasonal-orders/'+encodeURIComponent(id)+'/production',{method:'POST',body:{status:next,confirm:true}});
   if(!result?.ok)throw Error('O servidor não confirmou a etapa.');
   notice('✅ Pedido #'+code+' atualizado para '+labels[next]+'.');
   await load();
   // Atualiza a lista original de pedidos para não mostrar a situação anterior.
   $('seasonLoadOrders')?.click();
  }catch(err){notice('Não foi possível avançar o pedido #'+code+': '+err.message,true)}
  finally{busy=false;b.disabled=false}
 });
}
function notice(message,error=false){const x=$('seasonPcpAlert');if(!x)return;x.textContent=message;x.style.color=error?'#9b2929':'#1b6241'}
function healthCard(title,value){return '<div class="stat"><strong>'+esc(title)+'</strong><div class="n">'+esc(value)+'</div></div>'}
async function load(){
 mount();const b=bridge();if(!b?.st?.token)return notice('Entre com seu login administrativo.',true);
 const reload=$('seasonPcpRefresh');reload.disabled=true;reload.textContent='Consultando...';
 try{
  const results=await Promise.all([b.api('seasonal-operation-health'),b.api('seasonal-orders')]);
  const h=results[0],o=results[1];if(!h.ok||!o.ok||!Array.isArray(o.orders))throw Error('A API não entregou dados completos');
  const health=$('seasonPcpHealth');
  health.innerHTML=healthCard('Encomendas ativas',h.campaigns.accepting)+healthCard('Produtos publicados',h.products.published)+healthCard('Publicação pendente',h.products.pending)+healthCard('Sinal pendente',h.orders.awaitingDeposit)+healthCard('Produção liberada',h.orders.productionReady);
  const problems=h.products.incomplete;
  notice('Última consulta: '+new Date(h.checkedAt).toLocaleString('pt-BR')+(problems?' · Atenção: '+problems+' produto(s) incompleto(s) para publicação.':' · Cadastros preservados; operação em consulta.'));
  const list=o.orders.filter(x=>x.seasonal?.campaignId&&!['CANCELADO','CANCELLED','RECUSADO','REJEITADO','REJECTED','ENTREGUE','RETIRADO','FINALIZADO','CONCLUIDO'].includes(s(x.status).toUpperCase()))
   .sort((a,b)=>s(a.deliveryDate).localeCompare(s(b.deliveryDate))||s(a.code).localeCompare(s(b.code)));
  $('seasonPcpCards').innerHTML=list.length?'<div class="mobile-list">'+list.map(x=>{
   const p=x.seasonal||{},paid=p.depositStatus==='PAID';
   const stage=paid?s(p.productionStatus||steps[0]).toUpperCase():'AGUARDANDO_SINAL';
   const index=steps.indexOf(stage),next=paid&&index>=0&&index<steps.length-1?steps[index+1]:'';
   const date=/^\d{4}-\d{2}-\d{2}$/.test(s(x.deliveryDate))?s(x.deliveryDate).slice(8)+'/'+s(x.deliveryDate).slice(5,7)+'/'+s(x.deliveryDate).slice(0,4):'A confirmar';
   return '<article class="mobile-record"><div class="mobile-record-head"><b>Pedido #'+esc(x.code)+' · '+esc(x.name)+'</b><span class="badge '+(paid?'good':'warn')+'">'+esc(labels[stage]||'Aguardando sinal')+'</span></div><p>📅 '+esc(date)+' · '+esc(x.mode==='ENTREGA'?'Entrega':'Retirada')+' · '+esc(p.campaignTitle||'Encomendas')+'</p><p>'+ (Array.isArray(x.items)?x.items:[]).map(i=>esc(s(i.quantidade??i.quantity??1)+' × '+s(i.nome||i.name||'Produto'))).join(' · ')+'</p><div class="record-actions">'+(next?'<button class="btn small primary" type="button" data-pcp-id="'+esc(x.id)+'" data-pcp-code="'+esc(x.code)+'" data-pcp-next="'+esc(next)+'">✓ Marcar '+esc(labels[next])+'</button>':paid?'<span class="badge good">✅ Preparação concluída</span>':'<span class="badge warn">🔒 Produção não liberada sem sinal</span>')+'</div></article>';
  }).join('')+'</div>':'<p class="notice">Nenhuma encomenda pendente de produção.</p>';
  loadedAt=Date.now();
 }catch(err){notice('Falha no diagnóstico. Nenhum dado foi alterado: '+err.message,true);$('seasonPcpCards').textContent='Confira a conexão antes de atualizar os pedidos.'}
 finally{reload.disabled=false;reload.textContent='↻ Atualizar operação'}
}
function start(){
 mount();
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-workspace="production"]');if(b)load()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();