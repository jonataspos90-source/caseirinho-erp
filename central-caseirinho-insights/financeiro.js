(function(){
'use strict';
const API='https://john-cloud-api-production.up.railway.app/api/v1/admin/store/insights/finance';
const SESSION='caseirinho_insights_erp_session_v6';
const el=id=>document.getElementById(id);
const text=v=>String(v==null?'':v);
const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number(v)||0;
const brl=v=>n(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const T={
 SALE_MANUAL:'Venda manual',OTHER_INCOME:'Outras receitas',PRODUCTION_COST:'Produção',
 RESALE_COST:'Produtos para revenda',FIXED:'Despesa fixa',VARIABLE:'Despesa variável',TAX:'Impostos',ASSET:'Ativo'
};
const state={data:null,tab:'daily',editing:null,requestId:null,loading:false};
const utcToday=()=>{
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
 return p.year+'-'+p.month+'-'+p.day;
};
const pad=v=>String(v).padStart(2,'0');
const endOfMonth=m=>{const [y,mo]=m.split('-').map(Number);return y+'-'+pad(mo)+'-'+pad(new Date(Date.UTC(y,mo,0)).getUTCDate());};
const validMonth=m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(text(m));
const getToken=()=>{try{const x=JSON.parse(sessionStorage.getItem(SESSION)||'{}');return Number(x.expiresAt)>Date.now()?x.token||'':'';}catch(_){return '';}};
const show=(msg,error)=>{
 const e=el('finNotice');if(!e)return;e.textContent=msg;e.className='notice'+(error?' error':' success');
};
async function api(path='',options={}){
 const token=getToken();if(!token)throw Error('Sua sessão do ERP expirou. Entre novamente.');
 let r;
 try{
  r=await fetch(API+path,{method:options.method||'GET',cache:'no-store',credentials:'omit',
   headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json','Cache-Control':'no-store'},
   body:options.body?JSON.stringify(options.body):undefined});
 }catch(e){throw Error('Falha de conexão. Antes de repetir, atualize e confira se o lançamento foi salvo.');}
 const obj=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(obj.error||('Erro HTTP '+r.status));
 return obj;
}
function card(label,value,hint){
 return '<div class="stat"><strong>'+esc(label)+'</strong><div class="n">'+esc(value)+'</div><small>'+esc(hint||'')+'</small></div>';
}
function table(headers,rows){
 if(!rows.length)return '<div class="notice">Nenhum registro encontrado para os filtros selecionados.</div>';
 return '<div class="table-wrap"><table class="table"><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
}
function setTab(tab){
 state.tab=tab;
 const ids={daily:'finDaily',dre:'finDre',entries:'finEntries',assets:'finAssets'};
 for(const [key,id] of Object.entries(ids))el(id).hidden=key!==tab;
 document.querySelectorAll('[data-fin-tab]').forEach(b=>{
  b.classList.toggle('primary',b.dataset.finTab===tab);
  b.setAttribute('aria-selected',b.dataset.finTab===tab?'true':'false');
 });
 el('finFormPanel').hidden=true;
 render();
}
async function load(){
 if(state.loading||!getToken())return;
 const month=el('finMonth').value,from=el('finFrom').value,to=el('finTo').value;
 if(!validMonth(month)||!from||!to||from>to){show('Confira o mês e o período informado.',true);return;}
 state.loading=true;el('finRefresh').disabled=true;el('finConsult').disabled=true;
 show('Consultando vendas e lançamentos no ERP...');
 try{
  state.data=await api('?month='+encodeURIComponent(month)+'&from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to));
  render();show('Atualizado. Resultado gerencial do mês '+month+'. Vendas aceitas são apenas previsão.');
 }catch(e){show('Não foi possível carregar: '+text(e.message),true);}
 finally{state.loading=false;el('finRefresh').disabled=false;el('finConsult').disabled=false;}
}
function render(){
 const d=state.data;if(!d)return;
 const x=d.dre||{},tot=d.totals||{};
 el('finKpis').innerHTML=[
  card('🛒 Pedidos no período',tot.includedOrders||0,'Aceitos e concluídos, sem testes'),
  card('✅ Vendas concluídas',brl(x.realizedSales),'Receita reconhecida no DRE no mês'),
  card('⏳ Vendas ainda aceitas',brl(x.provisionalSales),'Previsão, não é resultado realizado'),
  card('💵 Vendas manuais',brl(x.manualSales),'Lançamentos fora do aplicativo'),
  card('📉 Total das despesas',brl(n(x.costProduction)+n(x.costResale)+n(x.taxes)+n(x.fixed)+n(x.variable)),'Sem investimento em ativos'),
  card('📊 Resultado do mês',brl(x.operating),'DRE gerencial, após depreciação')
 ].join('');
 if(state.tab==='daily')renderDaily();
 if(state.tab==='dre')renderDre();
 if(state.tab==='entries')renderEntries();
 if(state.tab==='assets')renderAssets();
}
function renderDaily(){
 const d=state.data||{},days=d.days||[];
 const rows=days.map(x=>'<tr><td>'+esc(x.date.split('-').reverse().join('/'))+'</td><td>'+n(x.orders)+'</td><td>'+brl(x.confirmed)+'</td><td>'+brl(x.completed)+'</td><td>'+brl(x.provisional)+'</td><td>'+brl(x.discount)+'</td><td>'+brl(x.freight)+'</td></tr>');
 el('finDailyTable').innerHTML=table(['Data do pedido','Pedidos','Vendas confirmadas','Concluídas','Ainda aceitas','Descontos','Frete separado'],rows);
}
function dreRow(label,value,strong=false){
 return '<tr'+(strong?' class="fin-emphasis"':'')+'><td>'+esc(label)+'</td><td style="text-align:right">'+brl(value)+'</td></tr>';
}
function renderDre(){
 const x=state.data.dre||{};
 const rows=[
  dreRow('(+) Vendas concluídas do aplicativo',x.realizedSales),
  dreRow('(+) Vendas lançadas manualmente',x.manualSales),
  dreRow('(=) Receita de vendas',x.revenue,true),
  dreRow('(-) Custo dos ingredientes/produção',-n(x.costProduction)),
  dreRow('(-) Compras de produtos para revenda',-n(x.costResale)),
  dreRow('(-) Tributos',-n(x.taxes)),
  dreRow('(=) Resultado após custos e impostos',x.contribution,true),
  dreRow('(-) Despesas fixas: aluguel, água, luz, internet...',-n(x.fixed)),
  dreRow('(-) Despesas variáveis',-n(x.variable)),
  dreRow('(-) Depreciação mensal dos ativos (estimativa)',-n(x.depreciation)),
  dreRow('(+) Outras receitas',x.otherIncome),
  dreRow('(=) Resultado operacional do mês',x.operating,true),
  dreRow('Margem sobre receita (%)',x.marginPct),
  dreRow('ⓘ Vendas ainda aceitas (fora do resultado)',x.provisionalSales),
  dreRow('ⓘ Resultado estimado incluindo as aceitas',x.estimatedOperating),
  dreRow('ⓘ Investimentos/ativos adquiridos (fora das despesas)',x.assetsAcquired)
 ];
 // Margem percentual é apresentada separadamente para não aplicar formatação de moeda.
 rows[12]='<tr><td>Margem sobre receita (%)</td><td style="text-align:right">'+esc(n(x.marginPct).toFixed(2).replace('.',','))+'%</td></tr>';
 el('finDreTable').innerHTML=table(['Demonstração do mês '+x.month,'Valor'],rows);
 const h=state.data.history||[];
 el('finHistory').innerHTML=table(['Mês','Receita concluída + venda manual','Resultado DRE','Vendas aceitas (previsão)'],
  h.map(x=>'<tr><td>'+esc(x.month)+'</td><td>'+brl(x.revenue)+'</td><td>'+brl(x.result)+'</td><td>'+brl(x.provisional)+'</td></tr>'));
}
function filteredEntries(){
 const all=(state.data?.entries||[]).filter(x=>x.type!=='ASSET');
 const term=text(el('finSearch')?.value).toLowerCase(),kind=el('finKindFilter')?.value||'ALL',month=el('finMonth').value;
 return all.filter(x=>x.competency===month&&(kind==='ALL'||x.type===kind)
  &&(x.description+' '+x.category+' '+x.supplier).toLowerCase().includes(term));
}
function actions(entry){
 const attrs=' data-fin-id="'+esc(entry.id)+'"';
 return '<button type="button" class="btn small" data-fin-edit'+attrs+'>✏️ Editar</button> '+
 '<button type="button" class="btn small" data-fin-delete'+attrs+'>🗑️ Excluir</button>';
}
function renderEntries(){
 const items=filteredEntries();
 el('finEntriesTable').innerHTML=table(['Data / competência','Tipo','Descrição','Valor','Situação','Vencimento','Ações'],
  items.map(x=>'<tr><td>'+esc(x.date)+'<br><small>'+esc(x.competency)+'</small></td><td>'+esc(T[x.type]||x.type)+'</td><td><b>'+esc(x.description)+'</b><br><small>'+esc(x.category||'')+'</small></td><td>'+brl(x.amount)+'</td><td>'+esc(x.status)+'</td><td>'+esc(x.dueDate||'—')+'</td><td>'+actions(x)+'</td></tr>'));
}
function renderAssets(){
 const items=(state.data?.entries||[]).filter(x=>x.type==='ASSET');
 el('finAssetsTable').innerHTML=table(['Aquisição','Bem / descrição','Valor do investimento','Vida útil estimada','Situação','Ações'],
  items.map(x=>'<tr><td>'+esc(x.date)+'</td><td><b>'+esc(x.description)+'</b><br><small>'+esc(x.category||'')+'</small></td><td>'+brl(x.amount)+'</td><td>'+n(x.usefulLifeMonths)+' meses</td><td>'+esc(x.status)+'</td><td>'+actions(x)+'</td></tr>'));
}
function updateConditional(){
 const type=el('finType').value;
 el('finLifeLabel').hidden=type!=='ASSET';
 el('finRepeatLabel').hidden=!['FIXED','VARIABLE'].includes(type)||!!state.editing;
 if(type==='ASSET')el('finLife').value=el('finLife').value||'60';
}
function openForm(entry=null,forceType=null){
 state.editing=entry||null;state.requestId=null;
 const type=entry?.type||forceType||'PRODUCTION_COST',date=entry?.date||utcToday();
 el('finFormTitle').textContent=entry?'✏️ Editar lançamento':'➕ Novo lançamento';
 const props={finType:type,finDescription:entry?.description||'',finCategory:entry?.category||'',finAmount:entry?.amount??'',
  finDate:date,finCompetency:entry?.competency||date.slice(0,7),finStatus:entry?.status||'PAGO',
  finDueDate:entry?.dueDate||'',finPaidDate:entry?.paidDate||'',finSupplier:entry?.supplier||'',
  finLife:entry?.usefulLifeMonths||60,finNotes:entry?.notes||'',finRepeat:'1'};
 for(const [id,value] of Object.entries(props))el(id).value=value;
 updateConditional();
 el('finFormPanel').hidden=false;
 el('finFormPanel').scrollIntoView({behavior:'smooth',block:'start'});
 el('finDescription').focus();
}
async function save(ev){
 ev.preventDefault();const btn=el('finSave');if(btn.disabled)return;
 const body={
  type:el('finType').value,description:el('finDescription').value,category:el('finCategory').value,
  amount:Number(el('finAmount').value),date:el('finDate').value,competency:el('finCompetency').value,
  status:el('finStatus').value,dueDate:el('finDueDate').value,paidDate:el('finPaidDate').value,
  supplier:el('finSupplier').value,usefulLifeMonths:Number(el('finLife').value),
  notes:el('finNotes').value,repeatMonths:Number(el('finRepeat').value)
 };
 if(!body.description.trim()||!(body.amount>0)||!body.date){show('Informe descrição, valor e data.',true);return;}
 if(body.repeatMonths>1&&!confirm('Gerar '+body.repeatMonths+' lançamentos mensais? Os próximos ficarão PENDENTES para conferência.'))return;
 btn.disabled=true;
 try{
  if(state.editing){
   body.recordVersion=state.editing.recordVersion;
   await api('/entries/'+encodeURIComponent(state.editing.id),{method:'PUT',body});
  }else{
   if(!state.requestId)state.requestId=crypto.randomUUID();
   body.requestId=state.requestId;
   await api('/entries',{method:'POST',body});
  }
  state.requestId=null;state.editing=null;
  el('finFormPanel').hidden=true;await load();
  show('✅ Lançamento salvo no financeiro.');
 }catch(e){show('Não confirmado: '+text(e.message)+'. Se houve falha de rede, consulte o mês antes de tentar novamente.',true);}
 finally{btn.disabled=false;}
}
async function remove(id){
 const item=(state.data?.entries||[]).find(x=>x.id===id);if(!item)return;
 if(!confirm('Excluir o lançamento "'+item.description+'" de '+brl(item.amount)+'? Ele deixará de entrar no DRE.'))return;
 try{await api('/entries/'+encodeURIComponent(id),{method:'DELETE',body:{recordVersion:item.recordVersion}});await load();show('Lançamento excluído do resultado.');}
 catch(e){show('Não foi possível excluir: '+text(e.message),true);}
}
function asCSV(rows,file){
 const clean=v=>{let s=text(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const body='\ufeff'+rows.map(r=>r.map(clean).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([body],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=file;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
}
function exportCsv(){
 const data=state.data;if(!data){show('Consulte os dados antes de exportar.',true);return;}
 const month=el('finMonth').value;
 if(state.tab==='daily')return asCSV([
 ['Data','Pedidos','Total confirmado','Concluído','Em aberto','Descontos','Frete'],
 ...(data.days||[]).map(x=>[x.date,x.orders,x.confirmed,x.completed,x.provisional,x.discount,x.freight])
 ],'caseirinho-vendas-diarias-'+month+'.csv');
 if(state.tab==='dre'){const x=data.dre;return asCSV([
 ['Indicador','Valor'],['Vendas concluídas',x.realizedSales],['Vendas manuais',x.manualSales],['Receita',x.revenue],
 ['Custo produção',x.costProduction],['Custo revenda',x.costResale],['Tributos',x.taxes],['Despesas fixas',x.fixed],
 ['Despesas variáveis',x.variable],['Depreciação estimada',x.depreciation],['Outras receitas',x.otherIncome],
 ['Resultado',x.operating],['Vendas aceitas ainda não concluídas',x.provisionalSales],['Investimento em ativos',x.assetsAcquired]
 ],'caseirinho-dre-'+month+'.csv');}
 const entries=state.tab==='assets'?(data.entries||[]).filter(x=>x.type==='ASSET'):filteredEntries();
 return asCSV([['Data','Competência','Tipo','Descrição','Categoria','Valor','Situação','Vencimento','Pagamento','Fornecedor','Observações'],
 ...entries.map(x=>[x.date,x.competency,T[x.type]||x.type,x.description,x.category,x.amount,x.status,x.dueDate,x.paidDate,x.supplier,x.notes])],
 'caseirinho-'+(state.tab==='assets'?'ativos':'despesas')+'-'+month+'.csv');
}
function init(){
 const today=utcToday(),month=today.slice(0,7);
 el('finMonth').value=month;el('finFrom').value=month+'-01';el('finTo').value=endOfMonth(month);
 el('finRefresh').addEventListener('click',load);
 el('finConsult').addEventListener('click',load);
 el('finMonth').addEventListener('change',()=>{const m=el('finMonth').value;if(!validMonth(m))return;el('finFrom').value=m+'-01';el('finTo').value=endOfMonth(m);load();});
 el('finFrom').addEventListener('change',()=>{});
 document.querySelectorAll('[data-fin-tab]').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.finTab)));
 el('finNew').addEventListener('click',()=>openForm());
 el('finNewAsset').addEventListener('click',()=>openForm(null,'ASSET'));
 el('finType').addEventListener('change',updateConditional);
 el('finForm').addEventListener('submit',save);
 el('finCancel').addEventListener('click',()=>{el('finFormPanel').hidden=true;state.editing=null;state.requestId=null;});
 el('finSearch').addEventListener('input',renderEntries);
 el('finKindFilter').addEventListener('change',renderEntries);
 el('finCsv').addEventListener('click',exportCsv);
 el('finPrint').addEventListener('click',()=>{if(!state.data)return show('Consulte os dados antes de imprimir.',true);window.print();});
 document.addEventListener('click',e=>{
  const edit=e.target.closest('[data-fin-edit]');
  if(edit){const entry=(state.data?.entries||[]).find(x=>x.id===edit.dataset.finId);if(entry)openForm(entry);return;}
  const del=e.target.closest('[data-fin-delete]');if(del)remove(del.dataset.finId);
 });
 setTab('daily');
}
window.CaseirinhoFinance={load,render};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();