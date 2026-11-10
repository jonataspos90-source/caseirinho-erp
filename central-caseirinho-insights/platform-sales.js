(()=>{'use strict';
if(window.CaseirinhoPlatformSales)return;
const ROOT='https://john-cloud-api-production.up.railway.app/api/v1/admin/store/insights/finance';
const SESSION='caseirinho_insights_erp_session_v6';
const E=id=>document.getElementById(id),S=x=>String(x??''),N=x=>Number(x)||0,A=x=>Array.isArray(x)?x:[];
const esc=x=>S(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=x=>(N(x)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const cents=x=>Math.round(Number(S(x).replace(',','.'))*100);
const labels={'IFOOD':'iFood','99FOOD':'99Food','OUTRA':'Outra'};
const today=()=>{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day};
const plusDay=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const session=()=>{try{const s=JSON.parse(sessionStorage.getItem(SESSION)||'{}');return s.expiresAt>Date.now()+10000?s.token:null}catch(_){return null}};
const st={products:[],entries:[],groups:[],totals:null,loading:false,saving:false,edit:null,key:null,productLoaded:false,from:'',to:'',frequency:'DAY',platform:'ALL'};
async function api(path,options={}){
 const token=session();if(!token)throw Error('Entre novamente com o usuário do ERP.');
 let r;try{r=await fetch(ROOT+path,{method:options.method||'GET',cache:'no-store',credentials:'omit',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Cache-Control':'no-store'},
  body:options.body?JSON.stringify(options.body):undefined});}
 catch(_){throw Error('Conexão indisponível. Confira o histórico antes de repetir a operação.');}
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'HTTP '+r.status);return j;
}
function notice(t,error=false){const x=E('finPlatformNotice');if(x){x.textContent=t;x.className='notice '+(error?'error':'success')}}
function options(id=''){return'<option value="">Selecione um produto...</option>'+st.products.map(p=>
 '<option value="'+esc(p.id)+'"'+(p.id===id?' selected':'')+'>'+esc(p.name+' · '+p.unit+' · '+(p.unitCostCents==null?'Custo pendente':brl(p.unitCostCents)))+'</option>').join('')}
function costLabel(div){
 const id=div.querySelector('.platform-product')?.value,p=st.products.find(x=>x.id===id),small=div.querySelector('.platform-cost-hint');
 if(small)small.textContent=!p?'Selecione o produto':p.unitCostCents===null?'⚠️ Sem custo completo na ficha. Informe custo manual para obter margem.':'📋 Custo sugerido pelo ERP: '+brl(p.unitCostCents)+' / '+p.unit+' · '+p.costStatus;
}
function addLine(initial={}){
 const root=E('finPlatformLines');if(!root||root.children.length>=80)return;
 const div=document.createElement('div');div.className='platform-line';
 div.innerHTML='<label>Produto<select class="platform-product">'+options(initial.productId||'')+'</select></label>'+
 '<label>Qtd.<input class="platform-qty" type="number" min="0.001" step="0.001" value="'+esc(initial.quantity??1)+'"></label>'+
 '<label>Preço na plataforma (R$)<input class="platform-price" type="number" min="0.01" step="0.01" value="'+(initial.unitPriceCents==null?'':(initial.unitPriceCents/100).toFixed(2))+'"></label>'+
 '<label>Custo manual/unit. (R$) opcional<input class="platform-cost" type="number" min="0" step="0.01" placeholder="Ficha ERP ou manual" value="'+(initial.costOrigin==='MANUAL'?(initial.unitCostCents/100).toFixed(2):'')+'"></label>'+
 '<div class="platform-line-footer"><small class="platform-cost-hint"></small><button type="button" class="btn small platform-remove">Remover</button></div>';
 root.appendChild(div);costLabel(div);preview();
}
function showFields(){
 const items=E('finPlatformMode').value==='ITEMS';
 E('finPlatformTotalFields').hidden=items;E('finPlatformItemsFields').hidden=!items;
 E('finPlatformOtherWrap').hidden=E('finPlatformName').value!=='OUTRA';
 E('finPlatformPaidWrap').hidden=E('finPlatformStatus').value!=='PAGO';
 if(items&&!E('finPlatformLines').children.length)addLine();
 preview();
}
function dates(){
 const t=today(),f=E('finPlatformFrequency').value;
 E('finPlatformTo').value=t;E('finPlatformFrom').value=f==='DAY'?t:f==='WEEK'?plusDay(t,-6):t.slice(0,7)+'-01';
}
function readForm(){
 const mode=E('finPlatformMode').value;
 const lines=mode==='ITEMS'?[...E('finPlatformLines').querySelectorAll('.platform-line')].map(div=>{
  const manual=div.querySelector('.platform-cost').value;
  return{productId:div.querySelector('.platform-product').value,quantity:Number(div.querySelector('.platform-qty').value),
   unitPriceCents:cents(div.querySelector('.platform-price').value),
   ...(manual===''?{}:{manualUnitCostCents:cents(manual)})};
 }):[];
 const grossCents=mode==='ITEMS'?lines.reduce((sum,x)=>sum+Math.round(x.quantity*x.unitPriceCents),0):cents(E('finPlatformGross').value);
 return{platform:E('finPlatformName').value,otherPlatform:E('finPlatformOtherName').value.trim(),mode,
  frequency:E('finPlatformFrequency').value,from:E('finPlatformFrom').value,to:E('finPlatformTo').value,
  grossCents,totalCostCents:mode==='TOTAL'&&E('finPlatformTotalCost').value!==''?cents(E('finPlatformTotalCost').value):null,
  lines,commissionPercent:Number(E('finPlatformCommission').value),extraFeeCents:cents(E('finPlatformExtraFees').value||0),
  discountCents:cents(E('finPlatformDiscount').value||0),status:E('finPlatformStatus').value,
  paidAt:E('finPlatformStatus').value==='PAGO'?E('finPlatformPaidAt').value:null,
  reference:E('finPlatformReference').value.trim(),notes:E('finPlatformNotes').value.trim()};
}
function estimate(body){
 const gross=body.grossCents;
 if(!Number.isSafeInteger(gross)||gross<=0)return{error:'Informe o valor bruto ou os produtos e preços.'};
 if(!Number.isFinite(body.commissionPercent)||body.commissionPercent<0||body.commissionPercent>100)return{error:'Comissão percentual inválida.'};
 const fees=Math.round(gross*body.commissionPercent/100)+body.extraFeeCents+body.discountCents;
 if(!Number.isFinite(fees)||fees<0||fees>gross)return{error:'Taxas e descontos não podem superar o faturamento.'};
 let cost=body.mode==='TOTAL'?body.totalCostCents:0,missing=[];
 if(body.mode==='ITEMS'){
  if(!body.lines.length)return{error:'Adicione os produtos da venda.'};
  for(const x of body.lines){
   const prod=st.products.find(p=>p.id===x.productId);
   if(!prod||!Number.isFinite(x.quantity)||x.quantity<=0||!Number.isInteger(x.unitPriceCents)||x.unitPriceCents<=0)
    return{error:'Selecione produtos, quantidades e preços positivos em todas as linhas.'};
   const unit=x.manualUnitCostCents!==undefined?x.manualUnitCostCents:prod.unitCostCents;
   if(unit===null||unit===undefined)missing.push(prod.name);
   else cost+=Math.round(unit*x.quantity);
  }
  if(missing.length)cost=null;
 }
 return{gross,fees,payout:gross-fees,cost,margin:cost===null?null:gross-fees-cost,
  pct:cost===null?null:Math.round((gross-fees-cost)/gross*10000)/100,missing};
}
function preview(){
 const root=E('finPlatformPreview');if(!root)return;
 const result=estimate(readForm());
 if(result.error){root.innerHTML='<span class="muted">'+esc(result.error)+'</span>';return}
 const fields=[['Bruto',brl(result.gross)],['Taxas',brl(result.fees)],['Repasse previsto',brl(result.payout)],
  ['Custo',result.cost===null?'Não identificado':brl(result.cost)],
  ['Margem estimada',result.margin===null?'Incompleta':brl(result.margin)],
  ['Margem sobre bruto',result.pct===null?'—':result.pct+'%']];
 root.innerHTML='<div class="platform-preview-grid">'+fields.map(([a,b])=>'<div><small>'+esc(a)+'</small><strong>'+esc(b)+'</strong></div>').join('')+'</div>'+
 (result.cost===null?'<p class="notice warn">⚠️ Margem não calculável sem custo completo'+(result.missing?.length?': '+esc(result.missing.join(', ')):'')+'.</p>':
 '<small>Margem gerencial estimada, antes de impostos/despesas não informados.</small>');
}
function reset(){
 E('finPlatformForm').reset();st.edit=null;st.key=null;
 E('finPlatformLines').innerHTML='';E('finPlatformSave').textContent='💾 Salvar receita da plataforma';
 dates();showFields();
}
function edit(row){
 const x=row.externalSale;st.edit={id:row.id,recordVersion:row.recordVersion};st.key=null;
 E('finPlatformName').value=x.platform;E('finPlatformOtherName').value=x.platform==='OUTRA'?x.platformName:'';
 E('finPlatformMode').value=x.mode;E('finPlatformFrequency').value=x.frequency;
 E('finPlatformFrom').value=x.from;E('finPlatformTo').value=x.to;
 E('finPlatformGross').value=(x.grossCents/100).toFixed(2);
 E('finPlatformTotalCost').value=x.mode==='TOTAL'&&x.costCents!==null?(x.costCents/100).toFixed(2):'';
 E('finPlatformCommission').value=x.commissionPercent;E('finPlatformExtraFees').value=(x.extraFeeCents/100).toFixed(2);
 E('finPlatformDiscount').value=(x.discountCents/100).toFixed(2);
 E('finPlatformStatus').value=row.status;E('finPlatformPaidAt').value=row.paidAt||'';
 E('finPlatformReference').value=x.reference||'';E('finPlatformNotes').value=x.notes||'';
 E('finPlatformLines').innerHTML='';
 if(x.mode==='ITEMS')for(const item of A(x.lines))addLine(item);
 showFields();E('finPlatformSave').textContent='💾 Atualizar lançamento';
 E('finPlatformForm').scrollIntoView({block:'start',behavior:'smooth'});
 notice('Editando venda '+x.platformName+'. A margem será recalculada com os custos atuais disponíveis no ERP.');
}
function render(){
 const t=st.totals;
 E('finPlatformTotals').innerHTML=!t?'':[
 ['💵','Faturamento bruto',brl(t.grossCents),t.records+' registro(s)'],
 ['🧾','Taxas cobradas',brl(t.feesCents),'Despesas variáveis na DRE'],
 ['💳','Repasse previsto',brl(t.payoutCents),'Bruto menos taxas'],
 ['✅','Repasse marcado recebido',brl(t.receivedCents),'Somente conferidos'],
 ['🥟','Custo identificado',brl(t.knownCostCents),'Custo dos produtos'],
 ['📊','Margem estimada',t.estimatedMarginCents===null?'Incompleta':brl(t.estimatedMarginCents),
 t.missingMargin?t.missingMargin+' lançamento(s) sem custo':t.estimatedMarginPercent+'% sobre vendas']
 ].map(([icon,title,val,note])=>'<div class="stat"><span class="icon">'+icon+'</span><strong>'+esc(title)+'</strong><div class="n">'+esc(val)+'</div><small>'+esc(note)+'</small></div>').join('');
 E('finPlatformGroups').innerHTML=st.groups.length?'<div class="platform-group-grid">'+st.groups.map(g=>
 '<article class="platform-group-card"><h4>'+esc(g.platform)+' · '+esc(g.period)+'</h4><p>Bruto: <b>'+brl(g.grossCents)+'</b> · '+g.records+' registro(s)</p>'+
 '<p>Taxas: '+brl(g.feesCents)+' · Repasse: '+brl(g.payoutCents)+'</p><p><b>Margem: '+(g.estimatedMarginCents===null?
 '⚠️ Incompleta':brl(g.estimatedMarginCents)+' ('+g.estimatedMarginPercent+'%)')+'</b></p></article>').join('')+'</div>':
 '<div class="notice">Nenhuma venda cadastrada para este período.</div>';
 E('finPlatformEntries').innerHTML=st.entries.length?'<div class="platform-entry-grid">'+st.entries.map(r=>{
 const x=r.externalSale;return'<article class="platform-entry-card"><div class="platform-entry-head"><strong>'+esc(x.platformName)+
 '</strong><span class="badge '+(r.status==='PAGO'?'good':'warn')+'">'+(r.status==='PAGO'?'Recebido':'A receber')+'</span></div>'+
 '<small>'+esc(x.from)+(x.to!==x.from?' a '+esc(x.to):'')+' · '+(x.mode==='ITEMS'?'Produtos':'Avulsa')+'</small>'+
 '<p>Faturamento <b>'+brl(x.grossCents)+'</b> · Taxas <b>'+brl(x.feesCents)+'</b><br>Repasse <b>'+
 brl(x.payoutCents)+'</b> · Margem <b>'+(x.estimatedMarginCents==null?'⚠️ Incompleta':brl(x.estimatedMarginCents))+'</b></p>'+
 (x.reference?'<small>Referência: '+esc(x.reference)+'</small>':'')+
 (x.mode==='ITEMS'?'<details><summary>Ver produtos</summary><ul>'+x.lines.map(p=>'<li>'+esc(p.productName)+' · '+p.quantity+
 ' × '+brl(p.unitPriceCents)+' = '+brl(p.lineTotalCents)+'</li>').join('')+'</ul></details>':'')+
 '<div class="toolbar"><button type="button" class="btn small" data-pl-edit="'+esc(r.id)+'">✏️ Editar</button>'+
 '<button type="button" class="btn small" data-pl-delete="'+esc(r.id)+'">🗑️ Excluir</button></div></article>';
 }).join('')+'</div>':'<div class="notice">Sem lançamentos individuais.</div>';
}
async function load(force=false){
 if(st.loading)return;st.loading=true;
 const from=st.from||today().slice(0,7)+'-01',to=st.to||today();
 try{
  const q=new URLSearchParams({from,to,frequency:st.frequency,platform:st.platform});
  const [sales,products]=await Promise.all([api('/platform-sales?'+q),st.productLoaded&&!force?Promise.resolve(null):api('/platform-sales/products')]);
  st.entries=A(sales.entries);st.groups=A(sales.summary?.groups);st.totals=sales.summary?.totals||null;
  if(products){st.products=A(products.products);st.productLoaded=true;
   for(const row of E('finPlatformLines').querySelectorAll('.platform-line')){
    const s=row.querySelector('.platform-product'),id=s.value;s.innerHTML=options(id);costLabel(row);
   }
  }
  render();preview();if(sales.limited)notice('Mais de 5000 registros: reduza o período para consultar todos.',true);
 }catch(e){notice('Erro ao consultar vendas de plataformas: '+e.message,true)}
 finally{st.loading=false}
}
async function save(ev){
 ev.preventDefault();if(st.saving)return;
 const body=readForm(),p=estimate(body);
 if(p.error)return notice(p.error,true);
 if(!body.from||!body.to||body.from>body.to||body.to>today())return notice('Confira as datas de venda.',true);
 const span=(Date.parse(body.to+'T12:00:00Z')-Date.parse(body.from+'T12:00:00Z'))/86400000;
 if(body.frequency==='DAY'&&span!==0||body.frequency==='WEEK'&&span>6||
 body.frequency==='MONTH'&&(span>30||body.from.slice(0,7)!==body.to.slice(0,7)))
  return notice('Diário: 1 dia; semanal: até 7 dias; mensal: dentro de um mês.',true);
 if(body.platform==='OUTRA'&&body.otherPlatform.length<2)return notice('Informe o nome da outra plataforma.',true);
 if(body.mode==='ITEMS'&&new Set(body.lines.map(x=>x.productId)).size!==body.lines.length)return notice('Não repita o produto: aumente a quantidade.',true);
 if(body.status==='PAGO'&&!body.paidAt)return notice('Informe a data do repasse recebido.',true);
 if(!confirm('Registrar faturamento de '+brl(p.gross)+' para '+(labels[body.platform]||body.otherPlatform)+
 ', taxa '+brl(p.fees)+' e repasse esperado '+brl(p.payout)+'? Essa receita não pode duplicar um pedido da loja.'))return;
 st.saving=true;E('finPlatformSave').disabled=true;
 if(!st.key)st.key=crypto.randomUUID();
 try{
  const result=await api('/platform-sales'+(st.edit?'/'+encodeURIComponent(st.edit.id):''),{method:st.edit?'PATCH':'POST',
   body:{...body,idempotencyKey:st.key,...(st.edit?{recordVersion:st.edit.recordVersion}:{})}});
  const check=await api('/platform-sales?'+new URLSearchParams({from:body.from.slice(0,7)+'-01',to:body.to,frequency:'DAY',platform:'ALL'}));
  if(!A(check.entries).some(x=>x.id===result.entry?.id&&x.externalSale.grossCents===p.gross))
   throw Error('Lançamento enviado, mas ainda não confirmado na leitura. Confira o histórico antes de repetir.');
  reset();st.from=body.from.slice(0,7)+'-01';st.to=body.to;E('finPlatformFilterFrom').value=st.from;E('finPlatformFilterTo').value=st.to;
  await load();await window.CaseirinhoFinance?.load?.();
  notice('✅ Venda lançada e conferida. Repasse previsto: '+brl(p.payout)+'.');
 }catch(e){notice('Gravação não confirmada: '+e.message+'. Confira o histórico antes de repetir.',true)}
 finally{st.saving=false;E('finPlatformSave').disabled=false;E('finPlatformSave').textContent=st.edit?'💾 Atualizar lançamento':'💾 Salvar receita da plataforma'}
}
async function remove(id){
 if(st.saving)return;
 const r=st.entries.find(x=>x.id===id);if(!r||!confirm('Excluir '+r.externalSale.platformName+' de '+brl(r.amountCents)+'? Altera a DRE.'))return;
 st.saving=true;
 try{await api('/platform-sales/'+encodeURIComponent(id),{method:'DELETE',body:{recordVersion:r.recordVersion}});
  await load();if(st.entries.some(x=>x.id===id))throw Error('Lançamento ainda no histórico.');
  await window.CaseirinhoFinance?.load?.();notice('Lançamento excluído e DRE atualizada.');
 }catch(e){notice('Exclusão não confirmada: '+e.message,true)}
 finally{st.saving=false}
}
function filter(){
 const from=E('finPlatformFilterFrom').value,to=E('finPlatformFilterTo').value;
 if(!from||!to||from>to||(Date.parse(to)-Date.parse(from))/86400000>366)return notice('Informe período válido de até 366 dias.',true);
 st.from=from;st.to=to;st.frequency=E('finPlatformFilterFrequency').value;st.platform=E('finPlatformFilterName').value;load();
}
function exportCSV(){
 const rows=[['Plataforma','Tipo','Data início','Data fim','Situação','Faturamento','Comissão','Taxas','Descontos','Repasse previsto','Custo','Margem','Margem %','Itens','Referência']];
 for(const r of st.entries){const x=r.externalSale;rows.push([x.platformName,x.mode,x.from,x.to,r.status,x.grossCents/100,
  x.commissionCents/100,x.extraFeeCents/100,x.discountCents/100,x.payoutCents/100,x.costCents==null?'':x.costCents/100,
  x.estimatedMarginCents==null?'':x.estimatedMarginCents/100,x.estimatedMarginPercent??'',
  x.lines.map(p=>p.productName+' × '+p.quantity).join(' | '),x.reference])}
 const csv='\ufeff'+rows.map(r=>r.map(x=>'"'+S(x).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;
 a.download='caseirinho-plataformas-'+st.from+'-a-'+st.to+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function init(){
 if(!E('finPlatformForm'))return;
 st.from=today().slice(0,7)+'-01';st.to=today();
 E('finPlatformFilterFrom').value=st.from;E('finPlatformFilterTo').value=st.to;reset();
 E('finPlatformForm').addEventListener('submit',save);E('finPlatformCancel').addEventListener('click',reset);
 E('finPlatformRefresh').addEventListener('click',()=>load(true));
 E('finPlatformAddLine').addEventListener('click',()=>addLine());
 E('finPlatformFilterApply').addEventListener('click',filter);E('finPlatformExport').addEventListener('click',exportCSV);
 E('finPlatformForm').addEventListener('input',e=>{const row=e.target.closest('.platform-line');if(row)costLabel(row);preview()});
 E('finPlatformForm').addEventListener('change',e=>{
  if(['finPlatformMode','finPlatformName','finPlatformStatus'].includes(e.target.id))showFields();
  if(e.target.id==='finPlatformFrequency')dates();
  const row=e.target.closest('.platform-line');if(row)costLabel(row);preview();
 });
 document.addEventListener('click',e=>{
  const removeLine=e.target.closest('.platform-remove');if(removeLine){removeLine.closest('.platform-line')?.remove();preview();return}
  const editButton=e.target.closest('[data-pl-edit]');if(editButton){const r=st.entries.find(x=>x.id===editButton.dataset.plEdit);if(r)edit(r);return}
  const deleteButton=e.target.closest('[data-pl-delete]');if(deleteButton)remove(deleteButton.dataset.plDelete);
 });
}
window.CaseirinhoPlatformSales={load,version:'20261110.1'};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();