/* Pedido recusado não representa venda concluída: recusa auditada via API do ERP. */
(function(){
 'use strict';
 const API='https://john-cloud-api-production.up.railway.app/api/v1/admin/store/insights';
 const KEY='caseirinho_insights_erp_session_v6';
 const $=s=>document.querySelector(s);
 const token=()=>{try{const a=JSON.parse(sessionStorage.getItem(KEY)||'{}');return Number(a.expiresAt)>Date.now()?a.token||'':'';}catch{return '';}};
 const dialog=document.createElement('dialog');dialog.id='opsRejectDialog';dialog.className='caseirinho-ops-dialog';
 dialog.innerHTML='<form method="dialog"><h2>🚫 Recusar pedido</h2><p id="opsRejectCode"></p><p><strong>A recusa remove o pedido dos resultados de vendas e do DRE. Não cancela recebimentos nem estorna dinheiro.</strong></p><label>Motivo da recusa<textarea id="opsRejectReason" rows="3" minlength="8" maxlength="400" required placeholder="Ex.: Cliente cancelou antes da entrega"></textarea></label><label class="ops-reject-confirm"><input type="checkbox" id="opsRejectConfirmed"> Confirmo que o pedido não foi entregue e que não há pagamento recebido a estornar.</label><p id="opsRejectFeedback" role="alert"></p><div class="ops-reject-actions"><button value="cancel" type="submit">Voltar</button><button id="opsRejectSave" type="button">🚫 Confirmar recusa</button></div></form>';
 document.body.appendChild(dialog);
 const codeOf=btn=>btn?.dataset?.order||'';
 const canReject=(status)=>/^(NOVO|PENDENTE|ACEITO|ABERTO|PRONTO|AGUARDANDO)/i.test(status||'');
 function buttons(){
  const target=$('#ordersTable');if(!target)return;
  const hosts=[...target.querySelectorAll('[data-action="quickAcceptOrder"],[data-action="quickFinishOrder"]')];
  for(const anchor of hosts){
   const code=codeOf(anchor),container=anchor.parentElement;
   if(!code||!container||container.querySelector('[data-ops-reject]'))continue;
   const row=anchor.closest('tr,.mobile-record'),badge=(row?.querySelectorAll('td')[5]?.textContent||row?.textContent||'').toUpperCase();
   if(!canReject(badge)||/CONCLUIDO|RETIRADO|ENTREGUE|REJEITADO/.test(badge))continue;
   const b=document.createElement('button');b.type='button';b.className='btn small ops-reject-button';b.dataset.opsReject=code;b.textContent='🚫 Recusar';
   b.title='Recusar este pedido e impedir a entrada no DRE';container.appendChild(b);
  }
 }
 let queued=false;
 const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;buttons();});});
 const start=()=>{const table=$('#ordersTable');if(table){observer.observe(table,{childList:true,subtree:true});buttons();}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 document.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-ops-reject]');if(!b)return;
  ev.preventDefault();ev.stopPropagation();
  dialog.dataset.code=codeOf(b)||b.dataset.opsReject;
  $('#opsRejectCode').textContent='Pedido: '+dialog.dataset.code;
  $('#opsRejectReason').value='';$('#opsRejectConfirmed').checked=false;$('#opsRejectFeedback').textContent='';
  dialog.showModal();
 });
 $('#opsRejectSave').addEventListener('click',async()=>{
  const code=dialog.dataset.code,reason=$('#opsRejectReason').value.trim(),confirmed=$('#opsRejectConfirmed').checked;
  if(reason.length<8||!confirmed){$('#opsRejectFeedback').textContent='Preencha o motivo e confirme as condições da recusa.';return;}
  if(!window.confirm('CONFIRMAR RECUSA DEFINITIVA do pedido '+code+'? Ele não entrará no DRE.'))return;
  const b=$('#opsRejectSave');b.disabled=true;b.textContent='⏳ Salvando recusa...';
  try{
   const auth=token();if(!auth)throw Error('Sua sessão expirou. Entre novamente no ERP.');
   const res=await fetch(API+'/orders/'+encodeURIComponent(code)+'/reject',{method:'POST',headers:{'Authorization':'Bearer '+auth,'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify({reason,confirmReject:true}),cache:'no-store',credentials:'omit'});
   const data=await res.json().catch(()=>({}));
   if(!res.ok||!data.ok)throw Error(data.error||'Servidor não confirmou a recusa.');
   $('#opsRejectFeedback').textContent='✅ Pedido recusado e excluído do DRE. Atualizando lista...';
   window.location.reload();
  }catch(e){$('#opsRejectFeedback').textContent='Não foi possível recusar: '+e.message;}
  finally{b.disabled=false;b.textContent='🚫 Confirmar recusa';}
 });
})();