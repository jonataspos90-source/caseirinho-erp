(function(){
'use strict';
const ROOT='https://john-cloud-api-production.up.railway.app/api/v1/admin/store/insights/finance';
const KEY='caseirinho_insights_erp_session_v6';
const E=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=c=>(Number(c||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmt=s=>s?String(s).slice(0,10).split('-').reverse().join('/'):'—';
let data=null,visible=[];
const labels={ALL:'Todos os lançamentos',REVENUE:'Receitas (pedidos e avulsas)',RECEITA_AVULSA:'Vendas avulsas',CUSTO_PRODUCAO:'Custos de produção',COMPRA_REVENDA:'Compras para revenda',DESPESA_FIXA:'Contas fixas',DESPESA_VARIAVEL:'Despesas variáveis',PAGAMENTO_FUNCIONARIO:'Pagamentos de funcionários',DESPESA_FUNCIONARIO:'Despesas com funcionários',TRIBUTO:'Impostos e tributos',ATIVO:'Ativos e investimentos',DAILY:'Vendas diárias'};
function monthLocal(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return p.year+'-'+p.month;}
function lastDay(m){const [y,n]=m.split('-').map(Number);return new Date(Date.UTC(y,n,0)).toISOString().slice(0,10);}
function status(message,error=false){const x=E('finReportStatus');x.textContent=message;x.className='notice'+(error?' error':' success');}
function token(){try{const x=JSON.parse(sessionStorage.getItem(KEY)||'{}');return Number(x.expiresAt)>Date.now()+10000?x.token:'';}catch(_){return'';}}
function range(){
 const mode=E('finReportMode').value,m=E('finReportMonth').value;
 const from=mode==='MONTH'?m+'-01':E('finReportFrom').value;
 const to=mode==='MONTH'?lastDay(m):E('finReportTo').value;
 if(!from||!to||from>to)throw Error('Informe um período válido (De até Até).');
 const span=(Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000;
 if(span>366)throw Error('O intervalo máximo é de 366 dias.');
 if(E('finReportClosedOnly').checked&&to>=monthLocal()+'-01')throw Error('Para consultar apenas competências com mês calendário encerrado, selecione uma data final anterior ao mês atual.');
 return{from,to};
}
function selectMode(){
 const month=E('finReportMode').value==='MONTH';
 E('finReportMonthWrap').hidden=!month;E('finReportFromWrap').hidden=month;E('finReportToWrap').hidden=month;
}
function table(rows){
 if(!rows.length)return'<div class="empty">Nenhum registro encontrado para os filtros selecionados.</div>';
 return'<div class="table-wrap"><table class="table"><thead><tr><th>Competência / data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Situação</th><th>Valor</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+esc(fmt(x.date))+'</td><td>'+esc(x.kind)+'</td><td>'+esc(x.description)+'</td><td>'+esc(x.category)+'</td><td>'+esc(x.status)+'</td><td>'+money(x.amountCents)+'</td></tr>').join('')+'</tbody></table></div>';
}
function render(){
 if(!data)return;
 const kind=E('finReportKind').value,term=E('finReportSearch').value.trim().toLowerCase(),pay=E('finReportPayment').value;
 const entries=(data.entries||[]).filter(x=>pay==='ALL'||x.status===pay);
 const mapped=entries.map(x=>({date:x.competenceDate,kind:labels[x.kind]||x.kind,
  code:x.kind,description:x.description+(x.employeeName?' · '+x.employeeName:''),
  category:x.category||'',status:x.status,amountCents:Number(x.amountCents||0)}));
 const sales=(data.days||[]).map(x=>({date:x.day,kind:'Vendas concluídas',code:'SALES',
  description:String(x.completedCount||0)+' pedido(s) finalizado(s)',
  category:'App '+money(x.appCents)+' · ERP '+money(x.erpCents),status:'CONCLUÍDO',amountCents:Number(x.completedCents||0)}));
 const days=(data.days||[]).map(x=>({date:x.day,kind:'Vendas diárias',code:'DAILY',description:String(x.completedCount||0)+' pedido(s)',
 category:'App '+money(x.appCents)+' · ERP '+money(x.erpCents)+' · Avulsas '+money(x.manualCents),status:'REALIZADO',amountCents:Number(x.completedCents||0)+Number(x.manualCents||0)}));
 const assetRows=[];
 if(kind==='ATIVO'){
  for(const a of data.assets||[]){
   if(a.purchaseDate>=data.from&&a.purchaseDate<=data.to)assetRows.push({date:a.purchaseDate,kind:'Aquisição de ativo',code:'ATIVO',description:a.name,category:a.category,status:'INVESTIMENTO',amountCents:Number(a.amountCents||0)});
   for(const p of a.installments||[]){
    const inPaid=p.status==='PAGO'&&p.paidAt>=data.from&&p.paidAt<=data.to;
    const inDue=p.dueDate>=data.from&&p.dueDate<=data.to;
    if(inDue)assetRows.push({date:p.dueDate,kind:'Parcela prevista',code:'ATIVO',description:a.name+' · '+p.number+'/'+a.installmentsCount,category:'Vencimento',status:p.status,amountCents:Number(p.amountCents||0)});
    if(inPaid)assetRows.push({date:p.paidAt,kind:'Pagamento de investimento',code:'ATIVO',description:a.name+' · '+p.number+'/'+a.installmentsCount,category:'Saída de caixa',status:'PAGO',amountCents:Number(p.amountCents||0)});
   }
  }
 }
 let rows=kind==='DAILY'?days:kind==='REVENUE'?[...mapped.filter(x=>x.code==='RECEITA_AVULSA'),...sales]:
 kind==='ATIVO'?[...mapped.filter(x=>x.code==='ATIVO'),...assetRows]:
 kind==='ALL'?[...mapped,...sales]:mapped.filter(x=>x.code===kind);
 rows=rows.filter(x=>(pay==='ALL'||kind==='DAILY'||x.status===pay)&&(!term||(x.kind+' '+x.description+' '+x.category+' '+x.status).toLowerCase().includes(term)))
   .sort((a,b)=>a.date.localeCompare(b.date)||a.description.localeCompare(b.description));
 visible=rows;
 const total=rows.reduce((s,x)=>s+Number(x.amountCents||0),0);
 let detail=rows.length+' linha(s) encontradas • Total listado: '+money(total)+'.';
 if(kind==='ATIVO'){
  const acquired=rows.filter(x=>x.kind==='Aquisição de ativo').reduce((n,x)=>n+x.amountCents,0);
  const due=rows.filter(x=>x.kind==='Parcela prevista').reduce((n,x)=>n+x.amountCents,0);
  const paid=rows.filter(x=>x.kind==='Pagamento de investimento').reduce((n,x)=>n+x.amountCents,0);
  detail='Ativos · '+rows.length+' registros · Aquisições: '+money(acquired)+' · Parcelas com vencimento: '+money(due)+' · Pagamentos registrados: '+money(paid)+'. Movimentos não devem ser somados entre si.';
 }
 if(kind==='ALL')detail+=' A soma reúne receitas e gastos; não representa resultado. Consulte o DRE para o lucro.';
 E('finReportSummary').textContent=detail;
 E('finReportResults').innerHTML=table(rows);
 E('finReportPeriod').textContent='Período '+fmt(data.from)+' a '+fmt(data.to)+' · '+(data.months||[]).map(x=>x.month+(x.calendarEnded?' (calendário encerrado)':' (em andamento)')).join(', ');
}
async function load(){
 let dates;try{dates=range();}catch(e){status(e.message,true);return;}
 const btn=E('finReportApply');btn.disabled=true;
 try{
  const tok=token();if(!tok)throw Error('Entre com o login do ERP.');
  const res=await fetch(ROOT+'/report?from='+encodeURIComponent(dates.from)+'&to='+encodeURIComponent(dates.to),{
   credentials:'omit',cache:'no-store',headers:{Authorization:'Bearer '+tok,'Cache-Control':'no-store'}});
  const d=await res.json().catch(()=>({}));
  if(!res.ok)throw Error(d.error||'Erro '+res.status);
  data=d;render();
  status('✅ Relatório consultado por competência. Os valores são lidos no ERP, sem alterar os registros.');
 }catch(e){status('Não foi possível gerar o relatório: '+e.message,true);}
 finally{btn.disabled=false;}
}
function exportCsv(){
 if(!data)return status('Consulte um período antes de exportar.',true);
 const protect=v=>{let s=String(v??'');if(/^[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const head=['Competência/data','Tipo','Descrição','Categoria','Situação','Valor R$'];
 const csv='\ufeff'+[head,...visible.map(x=>[x.date,x.kind,x.description,x.category,x.status,(Number(x.amountCents)/100).toFixed(2).replace('.',',')])]
  .map(row=>row.map(protect).join(';')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='caseirinho-relatorio-'+E('finReportKind').value+'-'+data.from+'-'+data.to+'.csv';
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function bind(){
 if(!E('finReportApply'))return;
 const current=monthLocal();
 // Relatórios abrem na competência atual; meses encerrados seguem disponíveis no filtro.
 E('finReportMonth').value=current;
 E('finReportFrom').value=current+'-01';E('finReportTo').value=lastDay(current);
 E('finReportClosedOnly').checked=false;
 E('finReportMode').addEventListener('change',selectMode);selectMode();
 E('finReportApply').addEventListener('click',load);
 E('finReportKind').addEventListener('change',render);
 E('finReportSearch').addEventListener('input',render);
 E('finReportPayment').addEventListener('change',render);
 E('finReportCsv').addEventListener('click',exportCsv);
 E('finReportPrint').addEventListener('click',()=>window.print());
}
window.CaseirinhoFinanceReports={load};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();