(function(){
'use strict';
if(window.CaseirinhoReceivables)return;
const E=id=>document.getElementById(id),S=x=>String(x??''),N=x=>Number(x)||0,A=x=>Array.isArray(x)?x:[];
const moneyC=x=>N(x)/100===0?'R$ 0,00':(N(x)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const esc=x=>S(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatDate=x=>{const d=new Date(x);return Number.isFinite(d.getTime())?d.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'};
const methods={PIX:'Pix',CREDITO:'Cartão de crédito',DEBITO:'Cartão de débito',DINHEIRO:'Dinheiro',TRANSFERENCIA:'Transferência'};
const st={orders:[],stats:null,offset:0,total:0,query:'',filter:'ALL',busy:false,details:null,requestId:null,requestAmount:null,requestMethod:null};
const bridge=()=>window.CaseirinhoInsightsReceivablesBridge;
function notice(message,bad=false){
 const e=E('receivableFeedback');if(!e)return;
 e.textContent=message;e.className='notice '+(bad?'error':'success');
}
function pill(status){
 const labels={QUITADO:'✅ Quitado',PARCIAL:'🟡 Parcial',PENDENTE:'⏳ A receber',A_CONCILIAR:'🔎 A conciliar',SEM_VALOR:'Sem valor'};
 return '<span class="badge '+(status==='QUITADO'?'good':status==='PARCIAL'?'warn':'light')+'">'+(labels[status]||esc(status))+'</span>';
}
function summarize(){
 const d=st.stats;if(!d)return;
 E('receivableStats').innerHTML=[
  ['🛒','Vendas concluídas',moneyC(d.salesCents),'Receita de produtos no DRE, sem somar pagamentos'],
  ['💰','Recebido dos pedidos',moneyC(d.receivedCents),'Total confirmado, inclusive pagamentos parciais'],
  ['💳','Saldo de clientes',moneyC(d.outstandingCents),'Pedidos concluídos com valor ainda não recebido'],
  ['🧾','Pagamentos parciais',d.partiallyPaid||0,'Pedidos que têm recebimento e ainda devem'],
  ['📦','Pedidos em andamento',d.pendingOrders||0,'Ainda não finalizados'],
  ['👤','Clientes com saldo',d.customerAccounts||0,'Clientes vinculados a pedido concluído com saldo'],
  ['🔎','Vendas antigas a conciliar',d.unreconciledCount||0,'Sem comprovante no sistema; não presumir dívida']
 ].map(([icon,label,value,info])=>'<div class="stat"><span class="icon">'+icon+'</span><strong>'+esc(label)+'</strong><div class="n">'+esc(value)+'</div><small>'+esc(info)+'</small></div>').join('');
}
function orderCard(x){
 const eligible=x.eligible&&x.balanceCents>0&&!x.onlinePending;
 const status=x.completed?'Venda concluída':'Pedido em andamento';
 const action=eligible?'<button class="btn small primary" type="button" data-account-pay="'+esc(x.code)+'">💵 Registrar pagamento</button>':'';
 return '<article class="receivable-card"><div class="receivable-top"><div><b>Venda #'+esc(x.code)+'</b> <small>'+esc(formatDate(x.createdAt))+'</small><p><strong>'+esc(x.customerName||'Cliente')+'</strong> · '+esc(x.customerPhone||'')+'</p></div>'+pill(x.paymentStatus)+'</div>'+
  '<div class="receivable-amounts"><span>Venda<br><b>'+moneyC(x.totalCents)+'</b></span><span>Recebido comprovado<br><b>'+moneyC(x.receivedCents)+'</b></span><span>'+(x.reconciled?'A receber':'A conciliar')+'<br><b>'+(x.reconciled?moneyC(x.balanceCents):'—')+'</b></span></div>'+
  '<div class="receivable-bottom"><small>'+esc(status)+' · '+esc(x.paymentMode||'A definir')+(x.onlinePending?' · ⚠️ Confira pagamento online':'')+'</small><div><button class="btn small" type="button" data-account-open="'+esc(x.code)+'">📑 Ver cartões</button> '+action+'</div></div></article>';
}
function render(){
 const root=E('receivableOrders');if(!root)return;
 root.innerHTML=st.orders.length?st.orders.map(orderCard).join(''):'<div class="empty">Nenhum pedido encontrado. Ajuste a pesquisa ou os filtros.</div>';
 summarize();
 const more=E('receivableMore');if(more){more.hidden=st.orders.length>=st.total;more.textContent='Carregar mais pedidos ('+st.orders.length+' de '+st.total+')';}
}
async function load(reset=true){
 if(st.busy||!bridge()?.api)return;
 st.busy=true;const btn=E('receivableRefresh');if(btn){btn.disabled=true;btn.textContent='Consultando...'}
 // Só substitui cartões após receber a resposta. Falha de rede não apaga vendas já exibidas.
 try{
  const params=new URLSearchParams({limit:'100',offset:String(reset?0:st.offset),search:st.query,filter:st.filter});
  const result=await bridge().api('receivables?'+params.toString());
  const previous=reset?[]:st.orders;
  const seen=new Set(previous.map(x=>x.orderId));
  const fresh=A(result.orders).filter(x=>!seen.has(x.orderId)&&!!seen.add(x.orderId));
  st.orders=[...previous,...fresh];
  st.stats=result.summary;st.total=N(result.total);
  st.offset=st.orders.length;render();
  notice(st.orders.length+' pedido(s) exibido(s) · '+st.total+' localizado(s).'+(result.truncated?' O histórico ultrapassou o limite da consulta; solicite paginação adicional.':''));
 }catch(error){notice('Conexão indisponível para Contas e Recebimentos. Os cartões já carregados foram preservados; toque em Atualizar contas para consultar novamente.',true);}
 finally{st.busy=false;if(btn){btn.disabled=false;btn.textContent='↻ Atualizar contas'}}
}
async function detail(code,showForm=false){
 try{
  const result=await bridge().api('receivables/'+encodeURIComponent(code)),x=result.order;
  st.details=x;st.requestId=null;
  const paid=Number(x.legacyReceivedCents)||0;
  const sale='<article class="receivable-sale-block"><h3>🛒 Cartão da venda #'+esc(x.code)+'</h3>'+
    '<p><b>Cliente:</b> '+esc(x.customerName)+'<br><b>Compra:</b> '+esc(formatDate(x.orderDate))+
    '<br><b>Situação:</b> '+esc(x.status)+'<br><b>Produtos:</b> '+moneyC(x.itemRevenueCents)+
    ' · <b>Frete:</b> '+moneyC(x.freightCents)+'<br><b>Total da venda:</b> '+moneyC(x.totalCents)+'</p>'+
    '<p><b>Recebido comprovado:</b> '+moneyC(x.receivedCents)+' · <b>'+(x.reconciled?'Saldo':'Diferença a conciliar')+':</b> '+moneyC(x.balanceCents)+' '+pill(x.paymentStatus)+'</p></article>';
  const history=A(x.receipts).map(r=>'<article class="receivable-payment-block"><h4>💰 Cartão de recebimento</h4>'+
    '<p><b>'+moneyC(r.amountCents)+'</b> · '+esc(methods[r.method]||r.method)+'<br>'+
    '<small>'+esc(formatDate(r.occurredAt))+' · '+esc(r.recordedBy||'ERP')+
    (r.reference?' · Ref. '+esc(r.reference):'')+'</small></p></article>').join('');
  const old=paid?'<article class="receivable-payment-block"><h4>💰 Recebimento anterior confirmado</h4><p><b>'+moneyC(paid)+'</b><br><small>Pagamento confirmado por integração ou lançamento manual anterior. Não será cobrado novamente.</small></p></article>':'';
  const form=x.eligible&&x.balanceCents>0&&!x.onlinePending?'<div class="receivable-pay-form" id="accountPaymentForm">'+
    '<h3>➕ Receber pagamento</h3><p class="muted">Registre somente um valor que entrou realmente no caixa, na conta bancária ou na maquininha.</p>'+
    '<div class="form-grid"><label>Forma de recebimento<select id="accountPaymentMethod">'+Object.entries(methods).map(([k,v])=>'<option value="'+k+'">'+v+'</option>').join('')+'</select></label>'+
    '<label>Valor recebido agora (R$)<input id="accountPaymentAmount" type="number" min="0.01" step="0.01" max="'+(x.balanceCents/100).toFixed(2)+'" value="'+(x.balanceCents/100).toFixed(2)+'"></label></div>'+
    '<label class="form-label" for="accountPaymentReference">Comprovante / referência (recomendado)</label><input id="accountPaymentReference" maxlength="140" placeholder="Nº transação, NSU ou referência do Pix">'+
    '<label class="quick-check"><input type="checkbox" id="accountPaymentConfirm"> Confirmo que esse valor foi efetivamente recebido.</label>'+
    '<p id="accountPaymentError" class="notice error" hidden></p>'+
    '<button class="btn primary" id="accountPaymentSubmit" type="button" data-account-submit="'+esc(code)+'">✅ Registrar recebimento</button></div>':
    (x.onlinePending?'<div class="notice warn">Pagamento online em andamento. Confira o Mercado Pago antes de efetuar outra baixa.</div>':'');
  bridge().modal('💳 Conta Cliente · pedido #'+code,
    sale+'<h3>Histórico de pagamentos</h3>'+(old+history||'<div class="notice">Nenhum recebimento registrado até agora.</div>')+form);
  if(showForm)setTimeout(()=>E('accountPaymentAmount')?.focus(),0);
 }catch(error){notice('Não foi possível abrir os cartões: '+error.message,true);}
}
async function pay(code){
 if(st.busy)return;
 const x=st.details;if(!x||x.code!==code)return;
 const method=E('accountPaymentMethod')?.value,raw=Number(E('accountPaymentAmount')?.value);
 const amountCents=Math.round(raw*100),reference=S(E('accountPaymentReference')?.value).trim();
 const error=e=>{const el=E('accountPaymentError');if(el){el.textContent=e;el.hidden=false;}};
 if(!methods[method]||!Number.isFinite(raw)||!Number.isSafeInteger(amountCents)||amountCents<=0||amountCents>x.balanceCents)
  return error('Informe um valor positivo até '+moneyC(x.balanceCents)+' e escolha uma forma de pagamento.');
 if(E('accountPaymentConfirm')?.checked!==true)return error('Confirme que o dinheiro realmente foi recebido.');
 if(!confirm('Confirmar recebimento de '+moneyC(amountCents)+' por '+methods[method]+' do pedido #'+code+'?'))return;
 if(st.requestAmount!==amountCents||st.requestMethod!==method||!st.requestId){
  st.requestId=crypto.randomUUID();st.requestAmount=amountCents;st.requestMethod=method;
 }
 st.busy=true;const button=E('accountPaymentSubmit');if(button){button.disabled=true;button.textContent='Gravando...'}
 try{
  const response=await bridge().api('receivables/'+encodeURIComponent(code)+'/payments',{method:'POST',
    body:{method,amountCents,reference,idempotencyKey:st.requestId,confirmReceived:true}});
  const id=response.receipt?.id;
  const after=await bridge().api('receivables/'+encodeURIComponent(code));
  if(!A(after.order?.receipts).some(r=>r.id===id))throw Error('O servidor recebeu o lançamento, mas a conferência do recibo falhou. Atualize antes de tentar novamente.');
  st.requestId=null;st.requestAmount=null;st.requestMethod=null;
  st.busy=false; // Libera a consulta para atualizar cartões e indicadores após a baixa.
  await load(true);await detail(code);
  notice('✅ Recebimento de '+moneyC(amountCents)+' registrado e conferido. Saldo: '+moneyC(response.balanceCents)+'.');
 }catch(e){error('Lançamento não confirmado: '+e.message+'. Consulte os cartões antes de repetir para evitar duplicidade.');}
 finally{st.busy=false;if(button){button.disabled=false;button.textContent='✅ Registrar recebimento'}}
}
function csv(){
 const fields=['Pedido','Cliente','Data compra','Status venda','Forma','Valor venda','Recebido','A receber','Status financeiro'];
 const all=[fields,...st.orders.map(x=>[x.code,x.customerName,x.createdAt,x.status,x.paymentMode,
  (x.totalCents/100).toFixed(2),(x.receivedCents/100).toFixed(2),(x.balanceCents/100).toFixed(2),x.paymentStatus])];
 const body='\ufeff'+all.map(row=>row.map(cell=>'"'+S(cell).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const uri=URL.createObjectURL(new Blob([body],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=uri;a.download='caseirinho-conta-cliente-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(uri),1500);
}
function bind(){
 E('receivableRefresh')?.addEventListener('click',()=>load(true));
 E('receivableSearch')?.addEventListener('change',e=>{st.query=S(e.target.value).trim();load(true)});
 E('receivableFilter')?.addEventListener('change',e=>{st.filter=S(e.target.value);load(true)});
 E('receivableMore')?.addEventListener('click',()=>load(false));
 E('receivableExport')?.addEventListener('click',csv);
 document.addEventListener('click',e=>{
  const button=e.target.closest('[data-account-open],[data-account-pay],[data-account-submit]');if(!button)return;
  if(button.dataset.accountOpen)return detail(button.dataset.accountOpen);
  if(button.dataset.accountPay)return detail(button.dataset.accountPay,true);
  if(button.dataset.accountSubmit)return pay(button.dataset.accountSubmit);
 });
}
window.CaseirinhoReceivables={load,detail,version:'20261110.1'};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();