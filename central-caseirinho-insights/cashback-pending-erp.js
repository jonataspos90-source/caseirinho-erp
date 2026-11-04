/* Caseirinho Insights: aprovação de cashback antecipada à integração ERP.
 * Não concede crédito; a liberação continua sujeita à entrega e integração.
 */
'use strict';
(function(){
 if(typeof quickCashbackOrder!=='function'||typeof quickSaveCashback!=='function'||typeof fulfillStatus!=='function')return;
 const oldDecision=quickCashbackOrder,oldSave=quickSaveCashback,oldFinish=quickFinishOrder;
 const pendingDecision=code=>{const f=fulfillStatus(code);return f?.canPreApprove===true&&f?.canApprove!==true&&f?.approvalPendingERP===true};
 const pendingApproved=code=>{const f=fulfillStatus(code);return f?.approval==='APROVADO'&&f?.erpPending&&f?.integration!=='IMPORTADO'};
 quickCashbackOrder=async function(code){
  const waiting=pendingDecision(code),f=fulfillStatus(code);
  if(waiting)f.canApprove=true;
  try{await oldDecision(code);}
  finally{if(waiting)f.canApprove=false;}
  if(waiting){
   const content=document.getElementById('modalContent');
   if(!content)return;
   const note=document.createElement('div');note.className='notice warn';note.setAttribute('role','status');
   note.textContent='Você pode APROVAR o cashback agora. O crédito só será liberado depois da integração do pedido com o ERP e da entrega ou retirada confirmada.';
   content.prepend(note);
  }
  const status=fulfillStatus(code);
  if(status?.erpPending&&status.erpLinked&&status.integration==='IMPORTANDO'){
   const content=document.getElementById('modalContent');
   if(content&&!content.querySelector('[data-action="reconcileErpCashback"]')){
    const button=document.createElement('button');button.type='button';button.className='btn';
    button.dataset.action='reconcileErpCashback';button.dataset.order=code;
    button.textContent='🔄 Reconciliar integração ERP';
    content.appendChild(button);
   }
  }
 };
 quickSaveCashback=async function(code){
  const waiting=pendingDecision(code),f=fulfillStatus(code);
  if(waiting)f.canApprove=true;
  try{await oldSave(code);}
  finally{if(waiting)f.canApprove=false;}
  if(waiting&&fulfillStatus(code)?.approval==='APROVADO')
   toast('💚 Cashback aprovado. Crédito aguardando integração ERP e confirmação da entrega.');
 };
 quickFinishOrder=function(code){
  if(pendingApproved(code)){
   modal('⚠️ Cashback aprovado — integração pendente',
    '<div class="notice warn">O cashback já foi APROVADO para este pedido, mas o número ERP ainda não foi conciliado. Para preservar o benefício, use Reconciliar ERP antes de finalizar. O saldo não será liberado antecipadamente.</div>'+
    '<button class="btn primary" type="button" data-action="cashbackBackToDecision" data-order="'+String(code).replace(/[^a-zA-Z0-9_-]/g,'')+'">💚 Voltar ao cashback e reconciliar ERP</button>');
   return;
  }
  return oldFinish(code);
 };
 const locks=new Set();
 document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-action="reconcileErpCashback"],[data-action="cashbackBackToDecision"]');
  if(!b)return;
  e.preventDefault();e.stopImmediatePropagation();
  const code=b.dataset.order;
  if(b.dataset.action==='cashbackBackToDecision'){quickCashbackOrder(code);return;}
  if(locks.has(code))return;
  if(!window.confirm('Reconciliar o pedido '+code+' com o ERP agora? A API verificará os vínculos e evitará importação duplicada.'))return;
  locks.add(code);b.disabled=true;b.textContent='⏳ Verificando integração...';
  try{
   const out=await api('orders/'+encodeURIComponent(code)+'/reconcile-erp',{method:'POST',body:{}});
   if(!out?.erpImported)throw Error('A importação ainda não foi confirmada.');
   await loadAll();nav('orders');
   await quickCashbackOrder(code);
   toast('✅ Pedido '+code+' integrado ao ERP. Conclua a decisão de cashback.');
  }catch(error){
   toast('Não foi possível concluir a integração: '+error.message+'. A aprovação do cashback pode ficar registrada, mas o saldo aguardará conciliação.',true);
  }finally{locks.delete(code);b.disabled=false;b.textContent='🔄 Reconciliar integração ERP';}
 },true);
})();
