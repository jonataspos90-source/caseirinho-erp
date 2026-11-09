'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const file=name=>fs.readFileSync('central-caseirinho-insights/'+name,'utf8');
test('Central abre o Financeiro como submódulo, com navegação desktop e mobile',()=>{
 const html=file('index.html'),app=file('app.js');
 assert.match(html,/id="financeiro" class="section"/);
 assert.match(html,/data-view="financeiro"/);
 assert.match(app,/financeiro:'Financeiro e DRE'/);
 assert.match(app,/if\(tab==='financeiro'\)window\.CaseirinhoFinance\?\.load\(\)/);
});
test('DRE, vendas diárias, custos, contas fixas e ativos possuem áreas separadas',()=>{
 const html=file('index.html');
 for(const id of ['finDre','finDaily','finDailyFrom','finDailyTo','finDailyApply','finDailyToday','finDailyReset','finDailyInfo','finEntries','finFixed','finAssets','finEntryForm','finMonth'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/data-fin-kind="COMPRA_REVENDA"/);
 assert.match(html,/data-fin-preset="ALUGUEL"/);
 assert.match(html,/data-fin-preset="AGUA"/);
 assert.match(html,/data-fin-preset="LUZ"/);
 assert.match(html,/data-fin-preset="INTERNET"/);
});
test('Financeiro exige token do ERP e usa API autenticada',()=>{
 const script=file('financeiro.js');
 assert.match(script,/Authorization:'Bearer '/);
 assert.match(script,/caseirinho_insights_erp_session_v6/);
 assert.match(script,/\/overview\?month=/);
 assert.match(script,/\/entries/);
});
test('PWA versionado inclui os novos arquivos, sem guardar dados de vendas em cache',()=>{
 const sw=file('sw.js'),html=file('index.html');
 const v=html.match(/app\.js\?v=(\d+)/)?.[1];
 assert.ok(Number(v)>=23,'aplicativo deve carregar versão financeira ou posterior');
 assert.ok(Number(sw.match(/caseirinho-insights-app-shell-v(\d+)/)?.[1])>=41,'O PWA deve invalidar caches de versões anteriores');
 const financialScript=html.match(/financeiro\.js\?v=[^"']+/)?.[0];
 const financialCss=html.match(/financeiro\.css\?v=[^"']+/)?.[0];
 assert.ok(financialScript&&financialCss,'Financeiro deve estar carregado no HTML');
 assert.ok(sw.includes(financialScript)&&sw.includes(financialCss),'PWA deve armazenar exatamente as versões usadas no HTML');
 assert.match(sw,new RegExp('app\\.js\\?v='+v));
 assert.match(sw,/if\(url\.origin!==self\.location\.origin/);
});

test('vendas por data da compra permite dia único ou intervalo sem mudar DRE e exporta CSV filtrado',()=>{
 const js=file('financeiro.js'),html=file('index.html');
 assert.ok(js.includes("'/daily?from='"));
 assert.ok(js.includes('async function applyDailyFilter'));
 assert.ok(js.includes('const from=a||b,to=b||a'));
 assert.ok(js.includes('state.dailyRange={from,to}'));
 assert.ok(js.includes('currentDailyDays().map'));
 assert.ok(js.includes("state.tab==='daily'&&state.dailyRange"));
 assert.ok(html.includes('data da compra'));
 assert.ok(html.includes('finDailyInfo'));
});

test('funcionários possuem submódulo e conta contábil própria visível no DRE',()=>{
 const html=file('index.html'),js=file('financeiro.js'),erp=fs.readFileSync('management-engine-v8-22-0.js','utf8');
 for(const id of ['finPayrollPanel','finPayrollKpis','finPayroll','finPayrollSearch','finEmployeeName','finEmployeeField','finPayMethod','finPayMethodField'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/data-fin-tab="payroll"/);
 assert.match(html,/data-fin-kind="PAGAMENTO_FUNCIONARIO"/);
 assert.match(js,/PAGAMENTO_FUNCIONARIO/);
 assert.match(js,/account|3\.02\.01/);
 assert.match(js,/d\.payrollCents/);
 assert.match(js,/state\.tab==='payroll'/);
 assert.match(js,/employeeName:/);
 assert.match(erp,/finTab=payroll/);
});
test('PWA carrega financeiro de pessoal atualizado e sem cache antigo',()=>{
 const html=file('index.html'),sw=file('sw.js');
 assert.ok(html.includes('financeiro.js?v=5'));
 assert.ok(html.includes('financeiro.css?v=4'));
 assert.ok(sw.includes('financeiro.js?v=5'));
 assert.ok(sw.includes('financeiro.css?v=4'));
 assert.ok(Number(sw.match(/caseirinho-insights-app-shell-v(\d+)/)?.[1])>=41,'O PWA deve invalidar caches de versões anteriores');
});

test('Despesas de funcionários têm módulo e configurações de custo/preço de venda persistentes',()=>{
 const html=file('index.html'),js=file('financeiro.js'),sw=file('sw.js');
 for(const id of ['finEmployeeExpensesPanel','finEmployeePriceBasis','finEmployeePriceSave','finEmployeeExpenseKpis','finEmployeeProduct',
  'finProductQty','finManualUnitPrice','finEmployeeExpenseSearch','finEmployeeExpenseList'])
  assert.ok(html.includes('id="'+id+'"'),'Faltou '+id);
 assert.ok(html.includes('data-fin-tab="employeeExpenses"'));
 assert.ok(html.includes('data-fin-kind="DESPESA_FUNCIONARIO"'));
 assert.ok(js.includes("DESPESA_FUNCIONARIO"));
 assert.ok(js.includes("'PRECO_VENDA'"));
 assert.ok(js.includes("'/employee-expense/settings'"));
 assert.ok(js.includes("'/employee-expense/products'"));
 assert.ok(js.includes("method:'PUT'"));
 assert.ok(js.includes("employeeExpensesCents"));
 assert.ok(js.includes("3.02.02"));
 assert.ok(sw.includes('financeiro.js?v=5'));
 assert.ok(Number(sw.match(/caseirinho-insights-app-shell-v(\d+)/)?.[1])>=41,'O PWA deve invalidar caches de versões anteriores');
 assert.doesNotThrow(()=>new (require('node:vm').Script)(js));
});
test('ERP tem atalho para despesas de funcionários sem duplicar lançamentos',()=>{
 const erp=fs.readFileSync('management-engine-v8-22-0.js','utf8');
 assert.ok(erp.includes('finTab=employeeExpenses'));
 assert.ok(erp.includes('finTab=payroll'));
});
