(function(){
'use strict';
const API='https://john-cloud-api-production.up.railway.app/api/v1/admin/store/insights/finance';
const KEY='caseirinho_insights_erp_session_v6';
const TYPES={CUSTO_PRODUCAO:'Custos de produção',COMPRA_REVENDA:'Compras para revenda',DESPESA_FIXA:'Contas fixas',DESPESA_VARIAVEL:'Despesas variáveis',PAGAMENTO_FUNCIONARIO:'Pagamento de funcionários',DESPESA_FUNCIONARIO:'Despesas com funcionários',TRIBUTO:'Impostos e taxas',ATIVO:'Ativos / investimentos',RECEITA_AVULSA:'Venda fora do aplicativo'};
const CATS={
 CUSTO_PRODUCAO:{INGREDIENTES:'Ingredientes',EMBALAGENS_PRODUCAO:'Embalagens',OUTROS_CUSTOS:'Outros custos'},
 COMPRA_REVENDA:{PRODUTOS_REVENDA:'Mercadorias para revenda',FRETE_COMPRA:'Frete da compra'},
 DESPESA_FIXA:{ALUGUEL:'Aluguel',AGUA:'Água',LUZ:'Luz',INTERNET:'Internet',TELEFONE:'Telefone',SISTEMAS:'Sistemas',SALARIOS:'Salários',OUTRAS_FIXAS:'Outras fixas'},
 DESPESA_VARIAVEL:{FRETE_ENTREGAS:'Fretes/entregas',TAXAS_CARTAO:'Taxas de cartão',MARKETING:'Marketing',MANUTENCAO:'Manutenção',OUTRAS_VARIAVEIS:'Outras despesas'},
 PAGAMENTO_FUNCIONARIO:{SALARIO:'Salário',COMISSAO:'Comissão',HORAS_EXTRAS:'Horas extras',FERIAS:'Férias',DECIMO_TERCEIRO:'13º salário',BONUS:'Bonificação',ENCARGOS:'Encargos de pessoal',BENEFICIOS:'Benefícios',RESCISAO:'Rescisão',OUTROS_PESSOAL:'Outras despesas com pessoal'},
 DESPESA_FUNCIONARIO:{CONSUMO_PRODUTO:'Consumo de produto do ERP',ALIMENTACAO:'Alimentação',UNIFORME:'Uniforme',TRANSPORTE:'Transporte',MATERIAL:'Materiais',OUTRAS_DESPESAS:'Outras despesas do funcionário'},
 TRIBUTO:{IMPOSTOS:'Impostos',TAXAS:'Taxas',OUTROS_TRIBUTOS:'Outros tributos'},
 ATIVO:{EQUIPAMENTOS:'Equipamentos',MAQUINAS:'Máquinas',MOVEIS:'Móveis',REFRIGERACAO:'Refrigeração',VEICULOS:'Veículos',OUTROS_ATIVOS:'Outros ativos'},
 RECEITA_AVULSA:{VENDA_FORA_APP:'Venda fora do aplicativo',OUTRA_RECEITA:'Outra receita'}
};
const el=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=c=>(Number(c||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const datestr=x=>x?String(x).slice(0,10).split('-').reverse().join('/'):'—';
const nowBR=()=>{const x=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),p=Object.fromEntries(x.map(i=>[i.type,i.value]));return p.year+'-'+p.month+'-'+p.day;};
const state={data:null,month:'',tab:'dre',editing:null,loading:false,dailyRange:null,dailyData:null,dailyLoading:false,employeePriceBasis:'CUSTO',employeeBasisLoaded:false,employeeProducts:[]};
function session(){
 try{const x=JSON.parse(sessionStorage.getItem(KEY)||'{}');return x.token&&Number(x.expiresAt)>Date.now()+10000?x.token:'';}catch(_){return ''}
}
async function api(path,options={}){
 const token=session();if(!token)throw Error('Sua sessão expirou. Saia e entre novamente na Central.');
 let res;
 try{res=await fetch(API+path,{method:options.method||'GET',cache:'no-store',credentials:'omit',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Cache-Control':'no-store'},
  body:options.body?JSON.stringify(options.body):undefined});
 }catch(_){throw Error('Sem conexão com a API. Nenhum lançamento foi confirmado.');}
 const d=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(d.error||'Erro HTTP '+res.status);
 return d;
}
function message(text,error=false){el('finMessage').textContent=text;el('finMessage').className='notice'+(error?' error':' success');}
function number(x){return Number(x)||0;}
function row(cells){return '<tr>'+cells.map(x=>'<td>'+x+'</td>').join('')+'</tr>';}
function table(headers,rows){
 if(!rows.length)return'<div class="empty">Nenhum registro encontrado neste mês.</div>';
 return'<div class="table-wrap"><table class="table"><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';
}
function kpi(icon,label,amount,desc){return'<div class="stat"><span class="icon">'+icon+'</span><strong>'+esc(label)+'</strong><div class="n">'+esc(amount)+'</div><small>'+esc(desc||'')+'</small></div>';}
function currentDailyDays(){return state.dailyData?.days||state.data?.days||[];}
function dailyPath(from,to){return '/daily?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to);}
function clearDailyFilter(){
 state.dailyData=null;state.dailyRange=null;el('finDailyFrom').value='';el('finDailyTo').value='';render();
}
async function applyDailyFilter(){
 if(state.dailyLoading)return;
 const a=el('finDailyFrom').value,b=el('finDailyTo').value;
 if(!a&&!b){clearDailyFilter();return;}
 // Apenas uma data preenchida significa apenas aquele dia.
 const from=a||b,to=b||a;
 if(from>to){message('A data inicial deve ser anterior ou igual à data final.',true);return;}
 const difference=(Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000;
 if(!Number.isFinite(difference)||difference>366){message('O filtro permite até 366 dias.',true);return;}
 state.dailyLoading=true;el('finDailyApply').disabled=true;
 try{
  const data=await api(dailyPath(from,to));
  state.dailyRange={from,to};state.dailyData=data;
  el('finDailyFrom').value=from;el('finDailyTo').value=to;
  render();
  message('✅ Período consultado: '+datestr(from)+(from===to?'':' a '+datestr(to))+'. O DRE mensal continua na competência selecionada.');
 }catch(error){message('Falha ao consultar período: '+error.message,true);}
 finally{state.dailyLoading=false;el('finDailyApply').disabled=false;}
}

function fillEmployeeProducts(preferred){
 const selected=el('finEmployeeProduct'),value=preferred??selected.value;
 selected.innerHTML='<option value="">Selecione um produto...</option>'+
  state.employeeProducts.map(p=>'<option value="'+esc(p.id)+'">'+esc((p.code?p.code+' · ':'')+p.name)+'</option>').join('');
 if(value&&state.employeeProducts.some(p=>p.id===value))selected.value=value;
}
function employeeProductPreview(){
 const isProduct=el('finKind').value==='DESPESA_FUNCIONARIO'&&el('finCategory').value==='CONSUMO_PRODUTO';
 el('finProductField').hidden=!isProduct;
 const amount=el('finAmount');amount.readOnly=isProduct;
 if(!isProduct){el('finManualUnitField').hidden=true;return;}
 const product=state.employeeProducts.find(p=>p.id===el('finEmployeeProduct').value);
 const quantity=Number(el('finProductQty').value);
 const price=product?Number(state.employeePriceBasis==='CUSTO'?product.costCents:product.saleCents):0;
 const manual=Number(el('finManualUnitPrice').value);
 el('finManualUnitField').hidden=!(product&&price<=0);
 const unitCents=price>0?price:Math.round(manual*100);
 const total=Number.isFinite(quantity)&&quantity>0&&unitCents>0?Math.round(quantity*unitCents):0;
 amount.value=total>0?(total/100).toFixed(2):'';
 const mode=state.employeePriceBasis==='CUSTO'?'custo':'preço de venda';
 const hint=!state.employeeBasisLoaded?'Carregue a configuração antes de lançar produtos.':
  !product?'Escolha um produto do cadastro do ERP.':
  quantity<=0?'Informe a quantidade utilizada.':
  !price&&!manual?'Sem '+mode+' no cadastro: informe manualmente o valor unitário e confira-o.':
  'Valorização pelo '+mode+': '+money(total)+(price<=0?' • preço unitário informado manualmente':' • valor do cadastro ERP');
 el('finEmployeeProductHint').textContent=hint+' Não gera venda nem baixa automática de estoque.';
}
async function employeeExtras(){
 try{
  const [settings,products]=await Promise.all([api('/employee-expense/settings'),api('/employee-expense/products')]);
  state.employeePriceBasis=settings.priceBasis||'CUSTO';state.employeeBasisLoaded=true;
  state.employeeProducts=products.products||[];
  el('finEmployeePriceBasis').value=state.employeePriceBasis;
  fillEmployeeProducts();employeeProductPreview();
 }catch(err){
  state.employeeBasisLoaded=false;state.employeeProducts=[];fillEmployeeProducts();
  message('DRE carregado, mas configuração de despesas com funcionários indisponível: '+err.message,true);
 }
}
async function saveEmployeePriceBasis(){
 const button=el('finEmployeePriceSave'),basis=el('finEmployeePriceBasis').value;
 button.disabled=true;
 try{
  const data=await api('/employee-expense/settings',{method:'PUT',body:{priceBasis:basis}});
  state.employeePriceBasis=data.priceBasis;state.employeeBasisLoaded=true;employeeProductPreview();
  message('✅ Configuração salva: '+(basis==='CUSTO'?'custo':'preço de venda')+
   '. Válida para novos lançamentos e edições, sem recalcular despesas anteriores.');
 }catch(err){message('Erro ao salvar configuração: '+err.message,true);}
 finally{button.disabled=false;}
}

function setTab(tab){
 state.tab=tab;
 const all=['dre','daily','entries','fixed','payroll','employeeExpenses','assets'];
 for(const t of all)el('fin'+t[0].toUpperCase()+t.slice(1)+'Panel').hidden=t!==tab;
 document.querySelectorAll('[data-fin-tab]').forEach(b=>b.classList.toggle('primary',b.dataset.finTab===tab));
 if(tab==='entries')el('finEntryForm').scrollIntoView({block:'nearest',behavior:'smooth'});
 render();
}
function populateTypes(){
 el('finKind').innerHTML=Object.entries(TYPES).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join('');
 populateCategories();
}
function populateCategories(preferred){
 const kind=el('finKind').value,categories=CATS[kind]||{};
 el('finCategory').innerHTML=Object.entries(categories).map(([k,v])=>'<option value="'+k+'">'+esc(v)+'</option>').join('');
 if(preferred&&categories[preferred])el('finCategory').value=preferred;
 const isFixed=kind==='DESPESA_FIXA',isPayroll=kind==='PAGAMENTO_FUNCIONARIO',isExpense=kind==='DESPESA_FUNCIONARIO';
 el('finRepeat').closest('label').hidden=!isFixed;
 el('finEmployeeField').hidden=!(isPayroll||isExpense);el('finPayMethodField').hidden=!isPayroll;
 el('finEmployeeName').required=isPayroll||isExpense;el('finSupplierField').hidden=isPayroll||isExpense;
 employeeProductPreview();
 if(!isFixed)el('finRepeat').checked=false;
 if(kind==='RECEITA_AVULSA')message('Receita manual: registre apenas vendas fora do aplicativo, para evitar contagem duplicada.');
}
function resetForm(kind='CUSTO_PRODUCAO',category){
 state.editing=null;el('finEntryForm').reset();el('finKind').value=kind;
 populateCategories(category);
 el('finDate').value=state.month?state.month+'-01':nowBR();
 el('finStatus').value='PAGO';el('finPaidAt').disabled=false;el('finPaidAt').value=nowBR();
 el('finEmployeeName').value='';el('finPayMethod').value='PIX';
 el('finEmployeeProduct').value='';el('finProductQty').value='1';el('finManualUnitPrice').value='';employeeProductPreview();
 el('finSave').textContent='💾 Salvar lançamento';
}
function preset(cat){
 resetForm('DESPESA_FIXA',cat);el('finDescription').value=CATS.DESPESA_FIXA[cat]+' · '+state.month;el('finRepeat').checked=true;setTab('entries');el('finAmount').focus();
}
function startKind(kind){
 resetForm(kind);
 if(kind==='PAGAMENTO_FUNCIONARIO'){el('finStatus').value='PENDENTE';el('finPaidAt').value='';el('finPaidAt').disabled=true;}
 setTab('entries');
 (kind==='PAGAMENTO_FUNCIONARIO'||kind==='DESPESA_FUNCIONARIO'?el('finEmployeeName'):el('finDescription')).focus();
}
function edit(id){
 const x=state.data?.entries?.find(e=>e.id===id);if(!x)return;
 state.editing=x;el('finKind').value=x.kind;populateCategories(x.category);
 el('finDescription').value=x.description;el('finAmount').value=(Number(x.amountCents)/100).toFixed(2);
 el('finDate').value=x.competenceDate;el('finDue').value=x.dueDate||'';
 el('finStatus').value=x.status;el('finPaidAt').value=x.paidAt||'';
 el('finSupplier').value=x.supplier||'';el('finNotes').value=x.notes||'';
 el('finEmployeeName').value=x.employeeName||'';el('finPayMethod').value=x.paymentMethod||'PIX';
 fillEmployeeProducts(x.productId||'');el('finProductQty').value=x.quantity||1;
 el('finManualUnitPrice').value=x.valuationSource==='MANUAL'?((Number(x.unitPriceCents)||0)/100).toFixed(2):'';
 employeeProductPreview();
 el('finRepeat').checked=x.repeatMonthly===true;el('finSave').textContent='💾 Atualizar lançamento';
 setTab('entries');el('finDescription').focus();
}
async function load(){
 if(state.loading)return;
 if(!session()){message('Entre com seu usuário e senha do ERP antes de consultar o Financeiro.',true);return;}
 state.loading=true;el('finRefresh').disabled=true;message('Consultando vendas e lançamentos financeiros…');
 try{
  state.month=el('finMonth').value||nowBR().slice(0,7);el('finMonth').value=state.month;
  state.data=await api('/overview?month='+encodeURIComponent(state.month));
  await employeeExtras();
  if(state.dailyRange){
   try{state.dailyData=await api(dailyPath(state.dailyRange.from,state.dailyRange.to));}
   catch(error){state.dailyData=null;message('DRE atualizado; período não carregou: '+error.message,true);}
  }
  render();
  message('Financeiro sincronizado com o ERP • competência '+state.month+' • '+new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}));
 }catch(e){message('Não foi possível consultar o financeiro: '+e.message,true);}
 finally{state.loading=false;el('finRefresh').disabled=false;}
}
function render(){
 const data=state.data;if(!data)return;
 const d=data.summary||{},days=currentDailyDays(),entries=data.entries||[];
 el('finKpis').innerHTML=[
  kpi('✅','Vendas realizadas (App + ERP)',money(d.confirmedCents),number(d.orders)+' pedido(s) concluído(s)'),
  kpi('💵','Receita total',money(d.revenueCents),'Inclui vendas fora do app lançadas'),
  kpi('🕓','Pedidos em andamento',money(d.pendingCents),'Fora do DRE até a conclusão'),
  kpi('🥟','Custos + revenda',money(d.costCents),'Compras lançadas neste mês'),
  kpi('🏠','Despesas e tributos',money(number(d.fixedCents)+number(d.variableCents)+number(d.taxesCents)),'Sem despesas com pessoal'),
  kpi('👥','Pagamento de funcionários',money(d.payrollCents),'Conta gerencial 3.02.01 • competência do mês'),
  kpi('🧾','Despesas dos funcionários',money(d.employeeExpensesCents),'Conta 3.02.02 • separada de salários'),
  kpi('📊','Resultado do mês',money(d.netCents),'Margem: '+(d.marginPercent===null?'—':d.marginPercent+'%')),
  kpi('🧰','Investimento em ativos',money(d.assetsCents),'Não reduz o DRE diretamente'),
  kpi('⏳','Gastos a pagar',money(d.unpaidOperatingCents),'Competência já incluída no DRE')
 ].join('');
 const dreRows=[
  ['(+) Vendas concluídas pelo aplicativo',d.confirmedCents],
  ['(+) Receitas / vendas lançadas fora do app',d.manualRevenueCents],
  ['(=) RECEITA OPERACIONAL',d.revenueCents,true],
  ['(-) Custos de produção',-number(d.productionCents)],
  ['(-) Compras para revenda (sem estoque)',-number(d.resaleCents)],
  ['(=) RESULTADO BRUTO',d.grossCents,true],
  ['(-) Despesas fixas (aluguel, água, luz, internet etc.)',-number(d.fixedCents)],
  ['(-) Pagamento de funcionários — conta 3.02.01',-number(d.payrollCents)],
  ['(-) Despesas com funcionários — conta 3.02.02',-number(d.employeeExpensesCents)],
  ['(-) Despesas variáveis',-number(d.variableCents)],
  ['(-) Impostos e taxas lançados',-number(d.taxesCents)],
  ['(=) RESULTADO GERENCIAL DO MÊS',d.netCents,true],
  ['(i) Investimentos/ativos (fora do DRE)',d.assetsCents],
 ];
 el('finDre').innerHTML='<div class="fin-dre">'+dreRows.map(([name,value,highlight])=>
  '<div class="fin-dre-row'+(highlight?' fin-dre-total':'')+'"><span>'+esc(name)+'</span><strong>'+money(value)+'</strong></div>').join('')+'</div>'+
  '<p class="notice">Resultado sem depreciação e sem tributos não lançados. Valores por competência; contas pendentes também afetam o resultado. Vendas em andamento não compõem receita realizada. Vendas concluídas são agrupadas pela data da compra, mesmo quando entregues depois.</p>';
 const total=days.reduce((a,x)=>({count:a.count+number(x.completedCount),completed:a.completed+number(x.completedCents),
  manual:a.manual+number(x.manualCents),pending:a.pending+number(x.pendingCents)}),{count:0,completed:0,manual:0,pending:0});
 const range=state.dailyRange?datestr(state.dailyRange.from)+(state.dailyRange.from===state.dailyRange.to?'':' até '+datestr(state.dailyRange.to)):'mês '+state.month;
 el('finDailyInfo').textContent='Período: '+range+' • '+total.count+' pedidos concluídos • Receita: '+money(total.completed+total.manual)+' • Em andamento: '+money(total.pending)+' (fora do DRE).';
 el('finDaily').innerHTML=table(['Data da compra','Pedidos concluídos','App','Pedidos ERP próprios','Receita total pedidos','Venda avulsa','Total realizado','Em andamento'],
  days.map(x=>row([esc(datestr(x.day)),esc(x.completedCount),money(x.appCents),money(x.erpCents),
   money(x.completedCents),money(x.manualCents),'<b>'+money(number(x.completedCents)+number(x.manualCents))+'</b>',
   esc(x.pendingCount)+' pedidos · '+money(x.pendingCents)])));
 const q=el('finSearch').value.toLowerCase().trim(),f=el('finFilter').value;
 const list=entries.filter(x=>(f==='ALL'||x.kind===f)&&(!q||(x.description+' '+(x.supplier||'')+' '+(x.employeeName||'')).toLowerCase().includes(q)));
 el('finEntries').innerHTML=entryTable(list);
 el('finFixed').innerHTML=entryTable(entries.filter(x=>x.kind==='DESPESA_FIXA'&&x.category!=='SALARIOS'));
 const personnel=entries.filter(x=>x.kind==='PAGAMENTO_FUNCIONARIO'||x.kind==='DESPESA_FIXA'&&x.category==='SALARIOS');
 const paid=personnel.filter(x=>x.status==='PAGO').reduce((a,x)=>a+number(x.amountCents),0);
 const toPay=personnel.filter(x=>x.status==='PENDENTE').reduce((a,x)=>a+number(x.amountCents),0);
 el('finPayrollKpis').innerHTML=[
  kpi('👥','Despesas com pessoal',money(d.payrollCents),'Conta gerencial 3.02.01'),
  kpi('✅','Pago',money(paid),'Já quitado'),
  kpi('⏳','A pagar',money(toPay),'Já considerado no DRE por competência')
 ].join('');
 const employeeFilter=el('finPayrollSearch').value.trim().toLowerCase();
 el('finPayroll').innerHTML=entryTable(personnel.filter(x=>(x.employeeName||x.description||'').toLowerCase().includes(employeeFilter)));
 const expenses=entries.filter(x=>x.kind==='DESPESA_FUNCIONARIO');
 const productsUsed=expenses.filter(x=>x.category==='CONSUMO_PRODUTO');
 el('finEmployeeExpenseKpis').innerHTML=[
  kpi('🧾','Despesas funcionários',money(d.employeeExpensesCents),'Conta 3.02.02'),
  kpi('📦','Produtos utilizados',money(productsUsed.reduce((a,x)=>a+number(x.amountCents),0)),productsUsed.length+' lançamento(s)'),
  kpi('👥','Lançamentos',String(expenses.length),'Salários ficam na conta 3.02.01')
 ].join('');
 const searchExpense=el('finEmployeeExpenseSearch').value.trim().toLowerCase();
 el('finEmployeeExpenseList').innerHTML=entryTable(expenses.filter(x=>
  ((x.employeeName||'')+' '+(x.productName||'')+' '+x.description).toLowerCase().includes(searchExpense)));
 el('finAssets').innerHTML=entryTable(entries.filter(x=>x.kind==='ATIVO'));
}
function entryTable(entries){
 return table(['Competência','Lançamento','Categoria','Valor','Status / vencimento','Ações'],entries.map(x=>{
  const pending=x.status==='PENDENTE';
  const late=pending&&x.dueDate&&x.dueDate<nowBR();
  const actions='<button type="button" class="btn small" data-fin-edit="'+esc(x.id)+'">✏️ Editar</button> '+
   (x.repeatMonthly?'<button class="btn small" type="button" data-fin-repeat="'+esc(x.id)+'">➡️ Próx. mês</button> ':'')+
   '<button type="button" class="btn small" data-fin-delete="'+esc(x.id)+'">🗑️</button>';
  return row([esc(datestr(x.competenceDate)),'<b>'+esc(x.description)+'</b><br><small>'+esc(TYPES[x.kind])+(x.employeeName?' · Funcionário: '+esc(x.employeeName):x.supplier?' · '+esc(x.supplier):'')+(x.productName?' · '+esc(x.productName)+' × '+esc(x.quantity)+' · '+esc(x.priceBasis==='PRECO_VENDA'?'preço venda':'custo'):'')+'</small>',esc(CATS[x.kind]?.[x.category]||x.category),
   money(x.amountCents),'<span class="badge '+(late?'warn':pending?'light':'good')+'">'+(late?'VENCIDO':esc(x.status))+'</span><br><small>Vence: '+esc(datestr(x.dueDate))+'</small>',actions]);
 }));
}
async function save(event){
 event.preventDefault();
 const button=el('finSave');button.disabled=true;
 try{
  const amount=Number(String(el('finAmount').value).replace(',','.'));
  if(!Number.isFinite(amount)||amount<=0)throw Error('Informe o valor.');
  const data={
   kind:el('finKind').value,category:el('finCategory').value,description:el('finDescription').value.trim(),
   amountCents:Math.round(amount*100),competenceDate:el('finDate').value,
   dueDate:el('finDue').value||null,status:el('finStatus').value,
   paidAt:el('finStatus').value==='PAGO'?(el('finPaidAt').value||el('finDate').value):null,
   employeeName:el('finKind').value==='PAGAMENTO_FUNCIONARIO'?el('finEmployeeName').value.trim():null,
   paymentMethod:el('finKind').value==='PAGAMENTO_FUNCIONARIO'?el('finPayMethod').value:null,
   supplier:el('finSupplier').value,notes:el('finNotes').value,repeatMonthly:el('finRepeat').checked
  };
  if(data.kind==='RECEITA_AVULSA'&&!state.editing&&!confirm('Confirma que esta receita NÃO foi registrada no aplicativo? Lançar duas vezes duplicaria o DRE.'))return;
  if(state.editing){
   await api('/entries/'+encodeURIComponent(state.editing.id),{method:'PATCH',body:{...data,recordVersion:state.editing.recordVersion}});
  }else await api('/entries',{method:'POST',body:data});
  const month=data.competenceDate.slice(0,7);if(month!==state.month){state.month=month;el('finMonth').value=month;}
  resetForm(data.kind);await load();message('✅ Lançamento salvo no ERP com sucesso.');
 }catch(e){message('Não foi possível salvar: '+e.message,true);}
 finally{button.disabled=false;}
}
async function erase(id){
 const x=state.data?.entries?.find(x=>x.id===id);if(!x)return;
 if(!confirm('Excluir o lançamento "'+x.description+'" de '+money(x.amountCents)+'? Esta ação altera o DRE.'))return;
 try{await api('/entries/'+encodeURIComponent(id),{method:'DELETE',body:{recordVersion:x.recordVersion}});await load();message('Lançamento excluído; DRE recalculado.');}
 catch(e){message('Não foi possível excluir: '+e.message,true);}
}
async function repeat(id){
 const x=state.data?.entries?.find(x=>x.id===id);if(!x)return;
 if(!confirm('Copiar a conta '+x.description+' para o próximo mês como PENDENTE?'))return;
 try{
  const r=await api('/entries/'+encodeURIComponent(id)+'/copy-next-month',{method:'POST',body:{}});
  message(r.already?'Conta já existia no próximo mês; não houve duplicidade.':'Conta gerada para o próximo mês. Abra a competência seguinte para ver.');
 }catch(e){message('Não foi possível repetir: '+e.message,true);}
}
function csvCell(x){
 let a=String(x??'');if(/^[=+@-]/.test(a))a="'"+a;
 return '"'+a.replace(/"/g,'""')+'"';
}
function downloadCsv(){
 const data=state.data;if(!data)return message('Atualize o Financeiro primeiro.',true);
 const toReais=v=>(Number(v||0)/100).toFixed(2).replace('.',',');
 let lines;
 if(state.tab==='daily'){
  lines=[['Data da compra','Concluídos','Vendas App R$','Vendas ERP R$','Total pedidos R$','Receita avulsa R$','Realizado R$','Em andamento','A realizar R$'],
   ...currentDailyDays().map(x=>[x.day,x.completedCount,toReais(x.appCents),toReais(x.erpCents),toReais(x.completedCents),toReais(x.manualCents),
    toReais(Number(x.completedCents)+Number(x.manualCents)),x.pendingCount,toReais(x.pendingCents)])];
 }else if(state.tab==='dre'){
  const d=data.summary||{};
  lines=[['Conta DRE','Valor R$'],['Receita pedidos concluídos',toReais(d.confirmedCents)],
   ['Vendas fora do app',toReais(d.manualRevenueCents)],['Receita gerencial',toReais(d.revenueCents)],
   ['Custos de produção',toReais(d.productionCents)],['Compras revenda',toReais(d.resaleCents)],
   ['Resultado bruto',toReais(d.grossCents)],['Despesas fixas',toReais(d.fixedCents)],
   ['Pagamento de funcionários (3.02.01)',toReais(d.payrollCents)],
   ['Despesas variáveis',toReais(d.variableCents)],['Tributos lançados',toReais(d.taxesCents)],
   ['Resultado gerencial',toReais(d.netCents)],['Ativos fora do DRE',toReais(d.assetsCents)]];
 }else{
  const filtered=(data.entries||[]).filter(x=>
   state.tab==='fixed'?(x.kind==='DESPESA_FIXA'&&x.category!=='SALARIOS'):
   state.tab==='payroll'?(x.kind==='PAGAMENTO_FUNCIONARIO'||(x.kind==='DESPESA_FIXA'&&x.category==='SALARIOS')):
   state.tab==='assets'?x.kind==='ATIVO':true);
  lines=[['Tipo','Conta DRE','Competência','Categoria','Funcionário','Descrição','Forma pagamento','Fornecedor','Valor R$','Status','Vencimento','Pagamento','Observações'],
   ...filtered.map(x=>[TYPES[x.kind],
    (x.kind==='PAGAMENTO_FUNCIONARIO'||x.category==='SALARIOS')?'3.02.01':'',
    x.competenceDate,CATS[x.kind]?.[x.category]||x.category,x.employeeName||'',x.description,x.paymentMethod||'',x.supplier||'',
    toReais(x.amountCents),x.status,x.dueDate,x.paidAt,x.notes])];
 }
 const csv='\ufeff'+lines.map(items=>items.map(csvCell).join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');
 link.href=url;
 link.download='caseirinho-'+state.tab+'-'+(state.tab==='daily'&&state.dailyRange?state.dailyRange.from+'-ate-'+state.dailyRange.to:state.month)+'.csv';
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),4000);
}
function bind(){
 if(!el('finMonth'))return;
 state.month=nowBR().slice(0,7);el('finMonth').value=state.month;
 populateTypes();resetForm();setTab('dre');
 const initialTab=new URLSearchParams(window.location.search).get('finTab');
 if(['payroll','daily','entries','fixed','assets'].includes(initialTab))setTab(initialTab);
 el('finMonth').addEventListener('change',()=>{state.month=el('finMonth').value;clearDailyFilter();resetForm();load();});
 el('finDailyApply').addEventListener('click',applyDailyFilter);
 el('finDailyReset').addEventListener('click',()=>{clearDailyFilter();message('Exibindo vendas do mês '+state.month+'.');});
 el('finDailyToday').addEventListener('click',()=>{el('finDailyFrom').value=nowBR();el('finDailyTo').value=nowBR();applyDailyFilter();});
 el('finRefresh').addEventListener('click',load);
 el('finEntryForm').addEventListener('submit',save);
 el('finKind').addEventListener('change',()=>populateCategories());
 el('finPayrollSearch').addEventListener('input',render);
 el('finStatus').addEventListener('change',()=>{
  const pending=el('finStatus').value==='PENDENTE';
  el('finPaidAt').disabled=pending;
  if(pending)el('finPaidAt').value='';
  else if(!el('finPaidAt').value)el('finPaidAt').value=nowBR();
 });
 el('finCancel').addEventListener('click',()=>resetForm());
 el('finCsv').addEventListener('click',downloadCsv);
 el('finPrint').addEventListener('click',()=>window.print());
 el('finSearch').addEventListener('input',render);el('finFilter').addEventListener('change',render);
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-fin-tab],[data-fin-kind],[data-fin-preset],[data-fin-edit],[data-fin-delete],[data-fin-repeat]');
  if(!b)return;
  if(b.dataset.finTab)setTab(b.dataset.finTab);
  if(b.dataset.finKind)startKind(b.dataset.finKind);
  if(b.dataset.finPreset)preset(b.dataset.finPreset);
  if(b.dataset.finEdit)edit(b.dataset.finEdit);
  if(b.dataset.finDelete)erase(b.dataset.finDelete);
  if(b.dataset.finRepeat)repeat(b.dataset.finRepeat);
 });
}
window.CaseirinhoFinance={load};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
