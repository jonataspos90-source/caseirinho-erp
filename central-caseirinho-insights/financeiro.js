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
const currentMonthBR=()=>nowBR().slice(0,7);
const monthValid=month=>/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month||''));
function monthLabel(month){
 if(!monthValid(month))return 'Competência inválida';
 const [y,m]=month.split('-').map(Number);
 return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(y,m-1,1,12)));
}
function selectedCompetence(){
 const input=el('finMonth');
 return monthValid(input?.value)?input.value:currentMonthBR();
}
function ensureCurrentMonth(){
 if(state.userSelectedMonth)return;
 const current=currentMonthBR();
 if(el('finMonth')&&el('finMonth').value!==current)el('finMonth').value=current;
 state.month=current;
 showSelectedCompetence();
}
function showSelectedCompetence(){
 const month=selectedCompetence();
 const label=el('finMonthCaption');
 if(label)label.textContent='Competência selecionada: '+monthLabel(month);
 return month;
}
function clearPreviousMonthData(month){
 state.data=null;
 const containers=['finKpis','finDre','finRevenueKpis','finRevenueList','finDaily','finDailyInfo',
  'finEntries','finFixed','finPayroll','finPayrollKpis','finEmployeeExpenseKpis',
  'finEmployeeExpenseList','finAssets'];
 for(const id of containers){const node=el(id);if(node)node.replaceChildren();}
 const loaded=el('finLoadedMonth');
 if(loaded)loaded.textContent='Consultando competência '+monthLabel(month)+'…';
}
const state={data:null,month:'',tab:'entries',editing:null,loading:false,dailyRange:null,dailyData:null,dailyLoading:false,employeePriceBasis:'CUSTO',employeeBasisLoaded:false,employeeProducts:[],loadedMonth:'',pendingReload:false,userSelectedMonth:false};
function session(){
 try{const x=JSON.parse(sessionStorage.getItem(KEY)||'{}');return x.token&&Number(x.expiresAt)>Date.now()+10000?x.token:'';}catch(_){return ''}
}
async function api(path,options={}){
 const token=session();if(!token)throw Error('Sua sessão expirou. Saia e entre novamente na Central.');
 let res;
 const controller=new AbortController(),method=options.method||'GET';
 const timer=setTimeout(()=>controller.abort(),method==='GET'?30000:45000);
 try{res=await fetch(API+path,{method,signal:controller.signal,cache:'no-store',credentials:'omit',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Cache-Control':'no-store'},
  body:options.body?JSON.stringify(options.body):undefined});
 }catch(error){throw Error(error.name==='AbortError'?'A API demorou a responder. '+(method==='GET'?'Tente atualizar novamente.':'Consulte os lançamentos antes de repetir a operação.'): 'Falha de conexão com a API. '+(method==='GET'?'Tente atualizar.':'Consulte os lançamentos antes de repetir a operação.'));}
 finally{clearTimeout(timer);}
 const d=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(d.error||'Erro HTTP '+res.status);
 return d;
}
let rolloverPromise=null;
function reconcileMonth(){
 if(!rolloverPromise)rolloverPromise=api('/monthly/rollover',{method:'POST',body:{}})
  .catch(error=>({ok:false,error:error.message}))
  .finally(()=>{rolloverPromise=null;});
 return rolloverPromise;
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

const employeeTypes=p=>Array.isArray(p?.types)?p.types:[];
const employeeBasis=p=>employeeTypes(p).some(t=>String(t).toLowerCase().includes('produto acabado'))?'PRECO_VENDA':state.employeePriceBasis;
function fillEmployeeProducts(preferred){
 const selected=el('finEmployeeProduct'),filter=el('finEmployeeProductType'),value=preferred??selected.value;
 const oldFilter=filter.value||'__all';
 const types=[...new Set(state.employeeProducts.flatMap(employeeTypes))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 filter.innerHTML='<option value="__all">Todos os tipos</option>'+types.map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join('')+
  (state.employeeProducts.some(p=>!employeeTypes(p).length)?'<option value="__none">Sem tipo cadastrado</option>':'');
 filter.value=Array.from(filter.options).some(o=>o.value===oldFilter)?oldFilter:'__all';
 const matches=p=>filter.value==='__all'||(filter.value==='__none'?!employeeTypes(p).length:employeeTypes(p).includes(filter.value));
 if(preferred&&state.employeeProducts.some(p=>p.id===preferred&&!matches(p)))filter.value='__all';
 const visible=state.employeeProducts.filter(matches);
 selected.innerHTML='<option value="">'+(visible.length?'Selecione um produto...':'Nenhum produto deste tipo')+'</option>'+
  visible.map(p=>'<option value="'+esc(p.id)+'">'+esc((p.code?p.code+' · ':'')+p.name)+'</option>').join('');
 if(value&&visible.some(p=>p.id===value))selected.value=value;
}
function employeeProductPreview(){
 const isProduct=el('finKind').value==='DESPESA_FUNCIONARIO'&&el('finCategory').value==='CONSUMO_PRODUTO';
 el('finProductField').hidden=!isProduct;
 const amount=el('finAmount');amount.readOnly=isProduct;
 if(!isProduct){el('finManualUnitField').hidden=true;return;}
 const product=state.employeeProducts.find(p=>p.id===el('finEmployeeProduct').value);
 const quantity=Number(el('finProductQty').value);
 const basis=employeeBasis(product);
 const price=product?Number(basis==='CUSTO'?product.costCents:product.saleCents)||0:0;
 const manual=Number(el('finManualUnitPrice').value);
 el('finManualUnitField').hidden=!(product&&price<=0);
 const unitCents=price>0?price:Math.round(manual*100);
 const total=Number.isFinite(quantity)&&quantity>0&&unitCents>0?Math.round(quantity*unitCents):0;
 amount.value=total>0?(total/100).toFixed(2):'';
 const mode=basis==='CUSTO'?'custo':'preço de venda';
 el('finEmployeeUnitValue').value=product&&unitCents>0?money(unitCents):'—';
 const hint=!state.employeeBasisLoaded?'Catálogo ou configuração indisponível. Atualize o Financeiro antes de lançar produtos.':
  !product?'Escolha um produto do cadastro do ERP.':
  quantity<=0?'Informe a quantidade utilizada.':
  !price&&!manual?'Sem '+mode+' no cadastro: informe manualmente o valor unitário e confira-o.':
  'Valorização pelo '+mode+': '+money(total)+(price<=0?' • preço unitário informado manualmente':' • valor do cadastro ERP');
 el('finEmployeeProductHint').textContent=hint+' Não gera venda nem baixa automática de estoque.';
}
let employeeExtrasPromise=null;
function employeeExtras(){
 if(employeeExtrasPromise)return employeeExtrasPromise;
 employeeExtrasPromise=fetchEmployeeExtras().finally(()=>{employeeExtrasPromise=null;});
 return employeeExtrasPromise;
}
async function fetchEmployeeExtras(){
 if(!session())return;
 try{
  const [settings,products]=await Promise.all([api('/employee-expense/settings'),api('/employee-expense/products')]);
  state.employeePriceBasis=settings.priceBasis||'CUSTO';state.employeeBasisLoaded=true;
  if(!Array.isArray(products.products)||products.products.some(p=>!Array.isArray(p.types)))throw Error('A API de tipos de produto ainda não está atualizada.');
  state.employeeProducts=products.products;
  el('finEmployeePriceBasis').value=state.employeePriceBasis;
  fillEmployeeProducts();employeeProductPreview();
 }catch(err){
  state.employeeBasisLoaded=false;state.employeeProducts=[];fillEmployeeProducts();employeeProductPreview();
  el('finEmployeeProductHint').textContent='Não foi possível carregar o catálogo: '+err.message+' Use Atualizar financeiro para tentar novamente.';
  if(state.tab==='employeeExpenses'||(state.tab==='entries'&&el('finKind').value==='DESPESA_FUNCIONARIO'))message('Catálogo de funcionários indisponível: '+err.message,true);
 }
}
async function saveEmployeePriceBasis(){
 const button=el('finEmployeePriceSave'),basis=el('finEmployeePriceBasis').value;
 button.disabled=true;
 try{
  const data=await api('/employee-expense/settings',{method:'PUT',body:{priceBasis:basis}});
  state.employeePriceBasis=data.priceBasis;state.employeeBasisLoaded=true;employeeProductPreview();
  message('✅ Configuração salva: '+(basis==='CUSTO'?'custo':'preço de venda')+
   '. Válida para os demais tipos; produtos acabados usam preço de venda. Não recalcula despesas anteriores.');
 }catch(err){message('Erro ao salvar configuração: '+err.message,true);}
 finally{button.disabled=false;}
}

const MODULES={platforms:['🍔 iFood / 99Food','Receitas, taxas e repasses de plataformas'],
 revenue:['💵 Receitas e vendas','Vendas concluídas e receitas fora do aplicativo'],
 entries:['🧾 Custos e despesas','Lançamentos de compras, custos e despesas operacionais'],
 fixed:['🏠 Contas fixas','Aluguel, energia, água e demais compromissos recorrentes'],
 payroll:['👥 Pagamento de funcionários','Salários, encargos, comissões, férias e benefícios'],
 employeeExpenses:['🧾 Despesas de funcionários','Consumo de produtos, transporte, alimentação e outros gastos'],
 assets:['🧰 Ativos e investimentos','Cadastro patrimonial, parcelas, pagamentos e depreciação'],
 daily:['📅 Vendas por dia','Receitas concluídas por data da compra'],
 reports:['📑 Relatórios financeiros','Filtros por período, categoria, status e competência encerrada'],
 dre:['📊 DRE por competência','Resultado gerencial após registro de receitas e despesas']};
function updateSidebar(){
 document.querySelectorAll('.side .nav [data-fin-tab]').forEach(b=>b.classList.toggle('active',b.dataset.finTab===state.tab&&el('financeiro')?.classList.contains('active')));
 if(el('financeiro')?.classList.contains('active')){
  el('pageTitle').textContent=MODULES[state.tab][0].replace(/^[^ ]+ /,'');
  el('finSectionTitle').textContent=MODULES[state.tab][0];
  el('finSectionDescription').textContent=MODULES[state.tab][1];
 }
}
function setTab(tab){
 if(!MODULES[tab])tab='entries';
 state.tab=tab;
 for(const t of Object.keys(MODULES)){const panel=el('fin'+t[0].toUpperCase()+t.slice(1)+'Panel');if(panel)panel.hidden=t!==tab;}
 el('finKpis').hidden=tab!=='dre';
 el('finCsv').hidden=['assets','reports','revenue','platforms'].includes(tab);
 el('finPrint').hidden=tab==='reports';
 updateSidebar();
 if(tab==='entries'&&el('financeiro')?.classList.contains('active'))el('finEntryForm').scrollIntoView({block:'nearest',behavior:'smooth'});
 if(tab==='employeeExpenses'&&!state.employeeBasisLoaded&&session())void employeeExtras();
 if(tab==='platforms')window.CaseirinhoPlatformSales?.load?.();
 if(tab==='assets')window.CaseirinhoAssetRegistry?.load?.();
 if(tab==='fixed')window.CaseirinhoRent?.load?.();
 if(tab==='reports')window.CaseirinhoFinanceReports?.load?.();
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
 el('finEmployeeProductType').value='__all';fillEmployeeProducts('');el('finEmployeeProduct').value='';el('finProductQty').value='1';el('finManualUnitPrice').value='';employeeProductPreview();
 el('finSave').textContent='💾 Salvar lançamento';
}
function preset(cat){
 if(cat==='ALUGUEL'){setTab('fixed');el('finRentAmount')?.focus();return;}
 resetForm('DESPESA_FIXA',cat);el('finDescription').value=CATS.DESPESA_FIXA[cat]+' · '+state.month;el('finRepeat').checked=true;setTab('entries');el('finAmount').focus();
}
function startKind(kind){
 if(kind==='ATIVO'){setTab('assets');message('Cadastre o bem e suas parcelas no módulo Ativos e investimentos. Os lançamentos antigos permanecem disponíveis.');return;}
 resetForm(kind);
 if(kind==='PAGAMENTO_FUNCIONARIO'){el('finStatus').value='PENDENTE';el('finPaidAt').value='';el('finPaidAt').disabled=true;}
 setTab('entries');
 (kind==='PAGAMENTO_FUNCIONARIO'||kind==='DESPESA_FUNCIONARIO'?el('finEmployeeName'):el('finDescription')).focus();
}
function edit(id){
 const x=state.data?.entries?.find(e=>e.id===id);if(!x)return;
 if(x.externalSale){setTab('platforms');message('Edite vendas de plataforma na aba iFood / 99Food.');return;}
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
 const month=showSelectedCompetence();
 // When another month is selected during a request, its previous results must never appear.
 if(state.loading){
  if(state.month===month&&!state.pendingReload)return;
  state.pendingReload=true;
  clearPreviousMonthData(month);
  message('Consultando '+monthLabel(month)+'…');
  return;
 }
 if(!session()){message('Entre com seu usuário e senha do ERP antes de consultar o Financeiro.',true);return;}
 state.loading=true;
 state.month=month;
 state.loadedMonth='';
 clearPreviousMonthData(month);
 el('finRefresh').disabled=true;
 message('Consultando vendas e lançamentos de '+monthLabel(month)+'…');
 // O catálogo de consumo não depende do fechamento mensal ou do DRE.
 void employeeExtras();
 try{
  const rollover=await reconcileMonth();
  // No cached or previous-month data may be used as a substitute for this response.
  const response=await api('/overview?month='+encodeURIComponent(month));
  if(response.month!==month)throw Error('A API retornou a competência '+String(response.month||'desconhecida')+' em vez de '+month+'.');
  if(selectedCompetence()!==month){
   state.pendingReload=true;
   return;
  }
  state.data=response;
  state.loadedMonth=month;
  // Draw validated month data first; loading employee settings must not block DRE.
  render();
  const loaded=el('finLoadedMonth');
  if(loaded)loaded.textContent='Dados confirmados: '+monthLabel(month)+' • '+(response.entries||[]).length+' lançamentos financeiros.';
  if(state.tab==='assets')window.CaseirinhoAssetRegistry?.load?.();
  if(state.tab==='fixed')window.CaseirinhoRent?.load?.();
  if(state.dailyRange){
   try{
    const daily=await api(dailyPath(state.dailyRange.from,state.dailyRange.to));
    if(selectedCompetence()===month){state.dailyData=daily;render();}
   }catch(error){state.dailyData=null;message('DRE atualizado; período diário indisponível: '+error.message,true);}
  }
  message('✅ Financeiro sincronizado • competência '+monthLabel(month)+' • '+new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+(rollover?.error?' • Confirmação automática não executada: '+rollover.error:''),!!rollover?.error);
  // Catálogo carregado independentemente, sem bloquear o botão de atualização.
 }catch(error){
  if(selectedCompetence()===month){
   clearPreviousMonthData(month);
   message('Não foi possível consultar '+monthLabel(month)+': '+error.message+'. Não exibiremos números de outra competência.',true);
  }else state.pendingReload=true;
 }finally{
  state.loading=false;
  el('finRefresh').disabled=false;
  if(state.pendingReload){
   state.pendingReload=false;
   void load();
  }
 }
}

function render(){
 const data=state.data;if(!data||data.month!==state.month||state.loadedMonth!==state.month)return;
 const d=data.summary||{},days=currentDailyDays(),entries=data.entries||[];
 el('finKpis').innerHTML=[
  kpi('✅','Vendas realizadas (App + ERP)',money(d.confirmedCents),number(d.orders)+' pedido(s) concluído(s)'),
  kpi('💵','Receita total',money(d.revenueCents),'Inclui receitas iFood, 99Food e avulsas'),
  kpi('🕓','Pedidos em andamento',money(d.pendingCents),'Fora do DRE até a conclusão'),
  kpi('🥟','Custos + revenda',money(d.costCents),'Compras lançadas neste mês'),
  kpi('🏠','Despesas e tributos',money(number(d.fixedCents)+number(d.variableCents)+number(d.taxesCents)),'Sem despesas com pessoal'),
  kpi('👥','Pagamento de funcionários',money(d.payrollCents),'Conta gerencial 3.02.01 • competência do mês'),
  kpi('🧾','Despesas dos funcionários',money(d.employeeExpensesCents),'Conta 3.02.02 • separada de salários'),
  kpi('📊','Resultado do mês',money(d.netCents),'Margem: '+(d.marginPercent===null?'—':d.marginPercent+'%')),
  kpi('🧰','Investimento em ativos',money(number(d.assetsCents)+number(d.assetRegistry?.acquiredCents)),'Bens adquiridos; sem dupla despesa no DRE'),
  kpi('⏳','Gastos a pagar',money(d.unpaidOperatingCents),'Competência já incluída no DRE')
 ].join('');
 el('finRevenueKpis').innerHTML=[
  kpi('✅','Vendas concluídas',money(d.confirmedCents),number(d.orders)+' pedidos'),
  kpi('💵','Receitas avulsas',money(d.manualRevenueCents),'Lançamentos fora do app'),
  kpi('📈','Receita total',money(d.revenueCents),'Competência '+state.month)
 ].join('');
 el('finRevenueList').innerHTML=entryTable(entries.filter(x=>x.kind==='RECEITA_AVULSA'));
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
  ['(-) Despesas variáveis (inclusive taxas das plataformas)',-number(d.variableCents)],
  ['(i) Taxas de plataformas já incluídas nas despesas variáveis',number(d.externalPlatformFeesCents)],
  ['(-) Impostos e taxas lançados',-number(d.taxesCents)],
  ['(=) RESULTADO OPERACIONAL ANTES DAS PARCELAS DE ATIVOS',d.operatingNetCents,true],
  ['(-) Parcelas de ativos da competência — despesa gerencial',-number(d.assetInstallmentExpenseCents)],
  ['(=) RESULTADO GERENCIAL APÓS INVESTIMENTOS',d.netCents,true],
  ['(i) Depreciação contábil estimada — informativo, NÃO deduzida',d.depreciationCents],
  ['(i) Resultado estimado pelo critério de depreciação',d.accountingNetEstimateCents],
  ['(i) Ativos antigos lançados no mês (fora do DRE)',d.assetsCents],
  ['(i) Bens adquiridos no cadastro patrimonial (fora do DRE)',d.assetRegistry?.acquiredCents],
  ['(i) Parcelas de investimentos pagas no mês (fluxo de caixa)',d.assetRegistry?.paidCents],
  ['(i) Parcelas previstas no mês (fluxo de caixa)',d.assetRegistry?.installmentDueCents],
 ];
 el('finDre').innerHTML='<div class="fin-dre">'+dreRows.map(([name,value,highlight])=>
  '<div class="fin-dre-row'+(highlight?' fin-dre-total':'')+'"><span>'+esc(name)+'</span><strong>'+money(value)+'</strong></div>').join('')+'</div>'+
  '<p class="notice">Resultado gerencial por competência do vencimento: cada parcela de ativo reduz o resultado, mesmo pendente. A depreciação é apenas informativa e não é abatida novamente. O resultado gerencial NÃO equivale ao lucro contábil. A confirmação automática de pagamento é administrativa e não consulta banco. Vendas em andamento não compõem receita realizada.</p>';
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
  const actions=x.externalSale?'<button type="button" class="btn small" data-fin-tab="platforms">🍔 Abrir em iFood / 99Food</button>':
   '<button type="button" class="btn small" data-fin-edit="'+esc(x.id)+'">✏️ Editar</button> '+
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
  if(el('finKind').value==='DESPESA_FIXA'&&el('finCategory').value==='ALUGUEL'&&!state.editing)
   throw Error('Cadastre o aluguel pelo módulo Contas fixas → Aluguel recorrente, para evitar duplicidade.');
  const data={
   kind:el('finKind').value,category:el('finCategory').value,description:el('finDescription').value.trim(),
   amountCents:Math.round(amount*100),competenceDate:el('finDate').value,
   dueDate:el('finDue').value||null,status:el('finStatus').value,
   paidAt:el('finStatus').value==='PAGO'?(el('finPaidAt').value||el('finDate').value):null,
   employeeName:['PAGAMENTO_FUNCIONARIO','DESPESA_FUNCIONARIO'].includes(el('finKind').value)?el('finEmployeeName').value.trim():null,
   productId:el('finEmployeeProduct').value,quantity:Number(el('finProductQty').value),
   manualUnitPriceCents:Math.round(Number(el('finManualUnitPrice').value)*100),
   paymentMethod:el('finKind').value==='PAGAMENTO_FUNCIONARIO'?el('finPayMethod').value:null,
   supplier:el('finSupplier').value,notes:el('finNotes').value,repeatMonthly:el('finRepeat').checked
  };
  if(data.kind==='DESPESA_FUNCIONARIO'&&data.category==='CONSUMO_PRODUTO'){
   if(!state.employeeBasisLoaded)throw Error('Configuração custo/preço de venda indisponível.');
   if(!data.productId)throw Error('Selecione o produto utilizado.');
   if(!Number.isFinite(data.quantity)||data.quantity<=0)throw Error('Quantidade do produto inválida.');
   if(!confirm('Confirmar despesa de '+money(data.amountCents)+' pela base '+(employeeBasis(state.employeeProducts.find(p=>p.id===data.productId))==='CUSTO'?'CUSTO':'PREÇO DE VENDA')+'? Não gera venda nem baixa estoque.'))return;
  }
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
   ['Despesas com funcionários (3.02.02)',toReais(d.employeeExpensesCents)],
   ['Despesas variáveis',toReais(d.variableCents)],['Tributos lançados',toReais(d.taxesCents)],
   ['Parcelas de ativos da competência',toReais(d.assetInstallmentExpenseCents)],
   ['Depreciação apenas informativa',toReais(d.depreciationCents)],
   ['Resultado gerencial após parcelas',toReais(d.netCents)],['Ativos antigos fora do DRE',toReais(d.assetsCents)],
   ['Bens adquiridos na competência',toReais(d.assetRegistry?.acquiredCents)],
   ['Parcelas de investimento pagas',toReais(d.assetRegistry?.paidCents)]];
 }else{
  const filtered=(data.entries||[]).filter(x=>
   state.tab==='fixed'?(x.kind==='DESPESA_FIXA'&&x.category!=='SALARIOS'):
   state.tab==='payroll'?(x.kind==='PAGAMENTO_FUNCIONARIO'||(x.kind==='DESPESA_FIXA'&&x.category==='SALARIOS')):
   state.tab==='employeeExpenses'?x.kind==='DESPESA_FUNCIONARIO':
   state.tab==='assets'?x.kind==='ATIVO':true);
  lines=[['Tipo','Conta DRE','Competência','Categoria','Funcionário','Produto','Quantidade','Base de preço','Descrição','Forma pagamento','Fornecedor','Valor R$','Status','Vencimento','Pagamento','Observações'],
   ...filtered.map(x=>[TYPES[x.kind],
    (x.kind==='PAGAMENTO_FUNCIONARIO'||x.category==='SALARIOS')?'3.02.01':x.kind==='DESPESA_FUNCIONARIO'?'3.02.02':'',
    x.competenceDate,CATS[x.kind]?.[x.category]||x.category,x.employeeName||'',x.productName||'',x.quantity||'',x.priceBasis||'',
    x.description,x.paymentMethod||'',x.supplier||'',toReais(x.amountCents),x.status,x.dueDate,x.paidAt,x.notes])];
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
 state.month=currentMonthBR();el('finMonth').value=state.month;showSelectedCompetence();
 populateTypes();resetForm();setTab('entries');
 const initialTab=new URLSearchParams(window.location.search).get('finTab');
 if(Object.keys(MODULES).includes(initialTab))setTab(initialTab);
 el('finMonth').addEventListener('change',()=>{
  state.userSelectedMonth=true;
  state.month=selectedCompetence();
  showSelectedCompetence();
  clearDailyFilter();resetForm();
  void load();
 });
 el('finCurrentMonth')?.addEventListener('click',()=>{
  const month=currentMonthBR();
  el('finMonth').value=month;
  state.userSelectedMonth=false;
  state.month=month;
  showSelectedCompetence();
  clearDailyFilter();resetForm();
  void load();
 });
 // Android may restore the form value when returning from the background.
 // On a new visit to the finance module, the initial month is always the current one.
 window.addEventListener('pageshow',event=>{
  if(!event.persisted)return;
  const month=selectedCompetence();
  if(state.loadedMonth!==month){state.month=month;showSelectedCompetence();void load();}
 });
 el('finDailyApply').addEventListener('click',applyDailyFilter);
 el('finDailyReset').addEventListener('click',()=>{clearDailyFilter();message('Exibindo vendas do mês '+state.month+'.');});
 el('finDailyToday').addEventListener('click',()=>{el('finDailyFrom').value=nowBR();el('finDailyTo').value=nowBR();applyDailyFilter();});
 el('finRefresh').addEventListener('click',load);
 el('finEntryForm').addEventListener('submit',save);
 el('finKind').addEventListener('change',()=>populateCategories());
 el('finCategory').addEventListener('change',employeeProductPreview);
 el('finEmployeeProductType').addEventListener('change',()=>{el('finManualUnitPrice').value='';fillEmployeeProducts('');el('finEmployeeProduct').value='';employeeProductPreview();});
 el('finEmployeeProduct').addEventListener('change',()=>{el('finManualUnitPrice').value='';employeeProductPreview();});
 el('finProductQty').addEventListener('input',employeeProductPreview);
 el('finManualUnitPrice').addEventListener('input',employeeProductPreview);
 el('finEmployeePriceSave').addEventListener('click',saveEmployeePriceBasis);
 el('finEmployeeExpenseSearch').addEventListener('input',render);
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
 // Seleciona o submódulo antes da navegação geral, inclusive no Android.
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-view="financeiro"][data-fin-tab]');
  if(b&&MODULES[b.dataset.finTab])setTab(b.dataset.finTab);
 },true);
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-fin-tab],[data-fin-kind],[data-fin-preset],[data-fin-edit],[data-fin-delete],[data-fin-repeat]');
  if(!b)return;
  if(b.dataset.finTab&&b.dataset.finTab!==state.tab)setTab(b.dataset.finTab);
  if(b.dataset.finKind)startKind(b.dataset.finKind);
  if(b.dataset.finPreset)preset(b.dataset.finPreset);
  if(b.dataset.finEdit)edit(b.dataset.finEdit);
  if(b.dataset.finDelete)erase(b.dataset.finDelete);
  if(b.dataset.finRepeat)repeat(b.dataset.finRepeat);
 });
}
window.CaseirinhoFinance={load,setTab,updateSidebar,reconcile:reconcileMonth,ensureCurrentMonth};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
