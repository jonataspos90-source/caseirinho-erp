/* Caseirinho Gestão — Convênios e Fiado: leitura consultiva, sem baixa financeira. */
(function(){
 'use strict';
 if(window.CaseirinhoConvenios)return;
 const E=id=>document.getElementById(id),S=x=>String(x??''),A=x=>Array.isArray(x)?x:[],N=x=>Number(x)||0;
 const esc=x=>S(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=cents=>(N(cents)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
 const dateBR=value=>/^\d{4}-\d{2}-\d{2}$/.test(S(value))?value.slice(8,10)+'/'+value.slice(5,7)+'/'+value.slice(0,4):'Sem data';
 let invoices=[],busy=false,lastLoaded=0,summary=null;
 function feedback(message,error=false){
  const node=E('convenioNotice');if(!node)return;
  node.className='notice'+(error?' error':'');
  node.textContent=message;
 }
 function visible(){
  const search=S(E('convenioSearch')?.value).trim().toLowerCase(),filter=E('convenioFilter')?.value||'ALL';
  return invoices.filter(item=>{
   if(search&&!([item.customerName,item.customerPhone,item.orderNumber,item.customerId].join(' ').toLowerCase().includes(search)))return false;
   if(filter==='OVERDUE'&&!item.overdue)return false;
   if(filter==='SEPARATE'&&item.linkedStore)return false;
   if(filter==='LINKED'&&!item.linkedStore)return false;
   return true;
  });
 }
 function render(){
  const stats=E('convenioStats'),holder=E('convenioRows');if(!stats||!holder)return;
  const rows=visible(),gross=rows.reduce((sum,x)=>sum+N(x.balanceCents),0),
   overlapped=rows.filter(x=>x.linkedStore),unique=rows.filter(x=>!x.linkedStore);
  const independent=unique.reduce((sum,x)=>sum+N(x.balanceCents),0);
  stats.innerHTML=[
   ['🧾','Duplicatas neste filtro',rows.length,'Documentos financeiros do ERP'],
   ['📅','Vencidas',rows.filter(x=>x.overdue).length,'Confira pagamentos realizados fora do sistema'],
   ['💳','Saldo a conferir',money(gross),'Não representa automaticamente cobrança autorizada'],
   ['🔗','Com vínculo à loja',overlapped.length,'Não somar novamente aos pedidos']
  ].map(([icon,title,value,desc])=>'<div class="stat"><span class="icon">'+icon+'</span><strong>'+title+'</strong><div class="n">'+esc(value)+'</div><small>'+esc(desc)+'</small></div>').join('');
  const byCustomer=new Map();
  for(const x of rows){
   const key=x.customerId||'doc:'+x.id;
   if(!byCustomer.has(key))byCustomer.set(key,{name:x.customerName||'Cliente',documents:[],amount:0});
   const client=byCustomer.get(key);client.documents.push(x);client.amount+=N(x.balanceCents);
  }
  const customers=[...byCustomer.values()].sort((a,b)=>b.amount-a.amount);
  holder.innerHTML=customers.length?customers.map(client=>
    '<article class="debt-customer"><div><strong>'+esc(client.name)+'</strong><small>'+client.documents.length+
    ' duplicata(s) · confira no ERP antes de cobrar</small>'+
    client.documents.map(doc=>'<div class="convenio-document"><span>Pedido '+esc(doc.orderNumber||'—')+' · Venc. '+
     esc(dateBR(doc.dueDate))+'</span><b>'+money(doc.balanceCents)+'</b>'+
     (doc.linkedStore?'<span class="badge warn">🔗 Vinculada à loja — conferir duplicidade</span>':
      doc.overdue?'<span class="badge warn">Vencimento anterior à data atual</span>':'')+'</div>').join('')+
    '</div><div class="debt-actions"><strong>'+money(client.amount)+'</strong></div></article>'
   ).join(''):'<div class="empty">Nenhuma duplicata neste filtro.</div>';
  const independentLabel=E('convenioIndependent');
  if(independentLabel)independentLabel.textContent='Sem vínculo identificado com pedidos da loja: '+money(independent)+
   '. Este subtotal também exige conferência antes de cobrança.';
 }
 async function load(force=false){
  if(busy||!window.CaseirinhoInsightsReceivablesBridge?.api)return;
  if(!force&&lastLoaded&&Date.now()-lastLoaded<90000)return;
  busy=true;const button=E('convenioRefresh');
  if(button){button.disabled=true;button.textContent='Consultando...';}
  feedback('Conferindo duplicatas e vínculos com os pedidos da loja...');
  try{
   const result=await window.CaseirinhoInsightsReceivablesBridge.api('receivables/convenios');
   if(!result?.ok||!Array.isArray(result.invoices))throw Error('A API não retornou duplicatas válidas.');
   invoices=A(result.invoices);summary=result.summary||{};lastLoaded=Date.now();
   render();
   feedback(invoices.length+' duplicata(s) com saldo no ERP. '+
    (summary.linkedStoreCount||0)+' vinculada(s) a pedidos da loja: não some estes valores ao saldo de e-commerce sem conciliar.');
   E('convenioExport').disabled=!invoices.length;
  }catch(err){
   feedback('Não foi possível conferir os convênios: '+S(err.message)+'. Nenhum saldo foi alterado.',true);
  }finally{busy=false;if(button){button.disabled=false;button.textContent='↻ Atualizar convênios';}}
 }
 function exportCsv(){
  const data=visible();if(!data.length)return;
  const quote=value=>{
   let x=S(value);
   if(/^[=+\-@]/.test(x))x="'"+x;
   return '"'+x.replace(/"/g,'""')+'"';
  };
  const table=[['Cliente','Número pedido ERP','Vencimento','Valor documento (R$)','Pago (R$)','Saldo (R$)','Vencida','Vinculada a loja']];
  data.forEach(x=>table.push([x.customerName,x.orderNumber,x.dueDate||'',(N(x.amountCents)/100).toFixed(2),
   (N(x.paidCents)/100).toFixed(2),(N(x.balanceCents)/100).toFixed(2),x.overdue?'Sim':'Não',x.linkedStore?'Sim — conferir duplicidade':'Não']));
  const blob=new Blob(['\ufeff'+table.map(row=>row.map(quote).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
  const uri=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=uri;a.download='caseirinho-convenios-conferencia-'+new Date().toISOString().slice(0,10)+'.csv';
  a.click();setTimeout(()=>URL.revokeObjectURL(uri),1500);
 }
 function bind(){
  E('convenioRefresh')?.addEventListener('click',()=>load(true));
  E('convenioFilter')?.addEventListener('change',render);
  E('convenioSearch')?.addEventListener('input',render);
  E('convenioExport')?.addEventListener('click',exportCsv);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
 window.CaseirinhoConvenios={load,version:'20261119.1'};
})();
