/*
 * Caseirinho — relatório operacional de contas a receber.
 * Usa a API administrativa autenticada; não guarda nomes, telefones ou saldos no cache.
 * Uma venda é contada uma vez; pagamentos não geram receita nova.
 */
(() => {
 'use strict';
 const el = id => document.getElementById(id);
 const bridge = () => window.CaseirinhoInsightsReceivablesBridge;
 const str = value => String(value == null ? '' : value);
 const number = value => Number(value) || 0;
 const escapeHtml = value => str(value).replace(/[&<>"']/g, ch =>
  ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const money = cents => (number(cents)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const digits = value => str(value).replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'');
 const dateBR = value => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}) : '—';
 };
 let busy = false, entries = [], incomplete = false;

 function notice(text, error = false) {
  const node = el('debtNotice');if(!node)return;
  node.className = 'notice' + (error ? ' error' : '');
  node.textContent = text;
 }
 function consolidate(orders){
  const byCustomer = new Map(), unsettled = [];
  for(const order of orders){
   const amount = number(order.balanceCents);
   if(!order.completed || !order.eligible || !(amount>0) || order.onlinePending)continue;
   if(order.reconciled !== true){unsettled.push(order);continue;}
   const phone=digits(order.customerPhone);
   // Nunca junte homônimos sem telefone verificável.
   const key=/^\d{10,11}$/.test(phone)?'tel:'+phone:'pedido:'+str(order.code||order.orderId);
   if(!byCustomer.has(key))byCustomer.set(key,{
    key, phone:/^\d{10,11}$/.test(phone)?phone:'', name:str(order.customerName||'Cliente não identificado'),
    totalCents:0, orders:[], oldest:null
   });
   const group=byCustomer.get(key);
   group.totalCents += amount;
   group.orders.push({code:order.code, balanceCents:amount, createdAt:order.createdAt});
   const date=Date.parse(order.createdAt);
   if(Number.isFinite(date)) group.oldest=Math.min(group.oldest??date,date);
  }
  return {customers:[...byCustomer.values()].sort((a,b)=>b.totalCents-a.totalCents),
          unsettledCount:unsettled.length};
 }
 function draw(){
  const summary=el('debtSummary'),results=el('debtRows');if(!summary||!results)return;
  const query=str(el('debtSearch')?.value).trim().toLowerCase();
  const total=entries.reduce((sum,x)=>sum+x.totalCents,0);
  const customerCount=entries.length,orderCount=entries.reduce((sum,x)=>sum+x.orders.length,0);
  summary.innerHTML='<div class="grid stats debt-stats">'+
   '<div class="stat"><strong>👤 Clientes com saldo</strong><div class="n">'+customerCount+'</div><small>Identificados por telefone quando disponível</small></div>'+
   '<div class="stat"><strong>🧾 Pedidos com saldo</strong><div class="n">'+orderCount+'</div><small>Pedidos concluídos e conciliados</small></div>'+
   '<div class="stat"><strong>💳 Total a receber</strong><div class="n">'+escapeHtml(money(total))+'</div><small>Não se soma novamente à receita da DRE</small></div></div>';
  const view=entries.filter(x=>(x.name+' '+x.phone+' '+x.orders.map(y=>y.code).join(' ')).toLowerCase().includes(query));
  results.innerHTML=view.length?view.map((x,i)=>{
   const text='Olá, '+x.name.split(/\s+/)[0]+'! Tudo bem? 💚 Aqui é do Caseirinho Massas Artesanais. Podemos conversar sobre o saldo dos seus pedidos? Se já tiver realizado o pagamento, por favor nos informe para conferirmos. Obrigado!';
   const url=x.phone?'https://wa.me/55'+x.phone+'?text='+encodeURIComponent(text):'';
   const orders=x.orders.map(o=>'<span class="debt-order">#'+escapeHtml(o.code)+' · '+money(o.balanceCents)+'</span>').join(' ');
   return '<article class="debt-customer"><div><strong>'+escapeHtml(x.name)+'</strong><small>'+escapeHtml(x.phone||'Sem telefone vinculado')+
     ' · '+x.orders.length+' pedido(s) · Mais antigo: '+escapeHtml(dateBR(x.oldest))+'</small><div class="debt-orders">'+orders+'</div></div>'+
     '<div class="debt-actions"><strong>'+money(x.totalCents)+'</strong>'+
     (url?'<a class="btn small whatsapp" href="'+escapeHtml(url)+'" target="_blank" rel="noopener noreferrer">💬 Conversar</a>':'')+'</div></article>';
  }).join(''):'<div class="empty">Nenhum cliente com saldo confirmado neste filtro.</div>';
 }
 async function load(){
  if(busy || !bridge()?.api)return;
  busy=true;
  const button=el('debtRefresh');if(button){button.disabled=true;button.textContent='Consultando contas…';}
  notice('Consultando os pagamentos confirmados dos pedidos concluídos…');
  try{
   const orders=[],pageSize=100,maxPages=25;
   let total=null,offset=0;incomplete=false;
   for(let page=0;page<maxPages;page++){
    const params=new URLSearchParams({limit:String(pageSize),offset:String(offset),filter:'OPEN'});
    const response=await bridge().api('receivables?'+params);
    if(!Array.isArray(response.orders))throw Error('A API não retornou uma lista válida.');
    orders.push(...response.orders);
    total=Number(response.total);
    offset+=response.orders.length;
    if(response.orders.length<pageSize || (Number.isFinite(total)&&offset>=total))break;
    if(page===maxPages-1)incomplete=true;
   }
   const {customers,unsettledCount}=consolidate(orders);
   entries=customers;
   draw();
   el('debtSearch').hidden=false;
   el('debtCsv').disabled=!entries.length;
   notice(customerCountMessage(customers.length,unsettledCount,incomplete));
  }catch(error){
   notice('Não foi possível atualizar o relatório: '+str(error.message)+' Os resultados anteriores foram preservados.',true);
  }finally{
   busy=false;if(button){button.disabled=false;button.textContent='↻ Consultar saldos';}
  }
 }
 function customerCountMessage(count,unsettledCount,truncated){
  return count+' cliente(s) com saldo confirmado neste relatório. '+
   (unsettledCount?unsettledCount+' pedido(s) sem conciliação financeira foram excluídos do valor a cobrar. ':'')+
   (truncated?'⚠️ Limite de paginação alcançado; totais incompletos. ':'')+
   'Não classifique como vencido sem uma data de vencimento registrada.';
 }
 function exportCsv(){
  if(!entries.length)return;
  const safe = value => {
   let s=str(value);
   if(/^[=+@\-]/.test(s))s="'"+s; // Impedir fórmulas no Excel.
   return '"'+s.replace(/"/g,'""')+'"';
  };
  const rows=[['Cliente','Telefone','Pedidos','Valor a receber (R$)','Data do pedido mais antigo']];
  for(const entry of entries)rows.push([
   entry.name,entry.phone,entry.orders.map(x=>x.code).join(' | '),
   (entry.totalCents/100).toFixed(2),entry.oldest?dateBR(entry.oldest):''
  ]);
  const blob=new Blob(['\ufeff'+rows.map(row=>row.map(safe).join(';')).join('\r\n')],
    {type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='caseirinho-clientes-com-saldo-'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function bind(){
  el('debtRefresh')?.addEventListener('click',load);
  el('debtCsv')?.addEventListener('click',exportCsv);
  el('debtSearch')?.addEventListener('input',draw);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
 else bind();
 window.CaseirinhoDevedores={load,version:'20261119.1'};
})();
