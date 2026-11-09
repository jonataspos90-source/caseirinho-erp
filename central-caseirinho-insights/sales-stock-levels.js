(function(){
'use strict';
if(window.CaseirinhoSalesStockLevels)return;
const E=id=>document.getElementById(id),S=v=>String(v??''),N=v=>Number(v)||0,A=v=>Array.isArray(v)?v:[];
const money=v=>N(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const qty=(v,d=2)=>N(v).toLocaleString('pt-BR',{maximumFractionDigits:d});
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={lead:2,review:7,safety:2,filter:'all',sort:'revenue',query:'',selected:new Set(),custom:new Map(),busy:false};
function bridge(){return window.CaseirinhoInsightsStockBridge}
function report(){return bridge()?.report?.()||null}
function wholeUnit(x){return !['KG','G','L','LT','ML','M','M2','M3'].includes(S(x.unit).toUpperCase())}
function step(x){return wholeUnit(x)?1:0.001}
function roundUp(n,s){return Math.round(Math.ceil((n-1e-9)/s)*s*1000)/1000}
function recommendation(x){
 const demand=N(x.quantity42d)/42;
 if(!(demand>0))return null;
 const s=step(x);
 return{rate:demand,minimum:Math.max(s,roundUp(demand*(state.lead+state.safety),s)),
  maximum:Math.max(s,roundUp(demand*(state.lead+state.review+state.safety),s))};
}
function rows(){
 const r=report();
 return A(r?.products).map(x=>{
  const suggestion=recommendation(x),balance=x.stockAvailable==null?null:Number(x.stockAvailable);
  const available=!!(x.stockProductId&&x.stockUpdatedAt&&suggestion);
  const cover=balance!=null&&suggestion?.rate>0?balance/suggestion.rate:null;
  const shortage=balance!=null&&suggestion?balance<suggestion.minimum:false;
  const excess=balance!=null&&suggestion?balance>suggestion.maximum:false;
  return{...x,suggestion,balance,available,cover,shortage,excess};
 });
}
function filteredRows(){
 const q=state.query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),list=rows().filter(x=>
  (!q||[x.code,x.name,x.category].some(v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(q)))&&
  (state.filter==='all'||state.filter==='A'&&x.abc==='A'||state.filter==='low'&&x.shortage||
   state.filter==='unconfigured'&&x.stockMinimum===0&&x.stockMaximum===0||
   state.filter==='relevant'&&x.available));
 const sorts={
  revenue:(a,b)=>N(b.revenue)-N(a.revenue),
  quantity:(a,b)=>N(b.quantity)-N(a.quantity),
  daily:(a,b)=>N(b.suggestion?.rate)-N(a.suggestion?.rate),
  coverage:(a,b)=>(a.cover??1e12)-(b.cover??1e12)};
 list.sort(sorts[state.sort]||sorts.revenue);
 return list;
}
function badge(x){
 if(!x.suggestion)return '<span class="stock-chip">Sem vendas nos 42 dias</span>';
 if(x.balance==null)return '<span class="stock-chip">Saldo indisponível</span>';
 if(x.shortage)return '<span class="stock-chip stock-danger">⚠️ Repor</span>';
 if(x.excess)return '<span class="stock-chip stock-warn">Acima do máximo</span>';
 return '<span class="stock-chip stock-ok">Dentro da faixa</span>';
}
function setMessage(text,kind='neutral'){
 const e=E('stockResult');if(!e)return;
 e.hidden=false;e.className='notice '+(kind==='error'?'error':kind==='success'?'success':'');
 e.textContent=text;
}
function getNumbers(x){
 const c=state.custom.get(S(x.stockProductId));
 return c||x.suggestion||null;
}
function validNumbers(x,v){
 if(!v||!x.available||v.minimum===''||v.maximum==='')return false;
 const min=Number(v.minimum),max=Number(v.maximum),s=step(x);
 return Number.isFinite(min)&&Number.isFinite(max)&&min>=0&&max>=min&&max<=999999&&
  Math.abs(Math.round(min*1000)-min*1000)<1e-6&&Math.abs(Math.round(max*1000)-max*1000)<1e-6&&
  (!wholeUnit(x)||(Number.isInteger(min)&&Number.isInteger(max)));
}
function render(){
 const root=E('stockLevelsPanel'),r=report();
 if(!root)return;
 if(!r){root.innerHTML='<div class="notice">Consulte as vendas acima para calcular o estoque sugerido.</div>';return}
 const all=rows(),items=filteredRows();
 const suggested=all.filter(x=>x.available).length,below=all.filter(x=>x.shortage).length;
 const noBalance=all.filter(x=>x.suggestion&&x.balance==null).length;
 const leader=[...all].sort((a,b)=>b.revenue-a.revenue)[0];
 root.innerHTML='<div class="stock-kpis">'+
  '<div class="stock-kpi"><small>Produtos com sugestão</small><strong>'+suggested+'</strong></div>'+
  '<div class="stock-kpi"><small>Abaixo do mínimo sugerido</small><strong>'+below+'</strong></div>'+
  '<div class="stock-kpi"><small>Saldo não informado</small><strong>'+noBalance+'</strong></div>'+
  '<div class="stock-kpi"><small>Maior faturamento</small><strong style="font-size:15px">'+esc(leader?.name||'—')+'</strong></div></div>'+
  '<div class="stock-settings">'+
   '<label>Prazo para repor (dias)<input id="stockLeadDays" type="number" min="0" max="180" step="1" value="'+state.lead+'"></label>'+
   '<label>Intervalo entre reposições (dias)<input id="stockReviewDays" type="number" min="1" max="180" step="1" value="'+state.review+'"></label>'+
   '<label>Estoque de segurança (dias)<input id="stockSafetyDays" type="number" min="0" max="180" step="1" value="'+state.safety+'"></label>'+
   '<button class="btn primary" type="button" id="stockRecalculate">Calcular sugestão</button></div>'+
  '<p class="muted stock-help"><b>Como calculamos:</b> média diária = vendas dos últimos 42 dias ÷ 42 (inclusive dias sem vendas). Mínimo = média diária × (prazo para repor + segurança). Máximo = média diária × (prazo + intervalo entre reposições + segurança). Arredondamento por unidade do produto. A média é histórica, não uma garantia de demanda futura.</p>'+
  '<div class="toolbar stock-filters"><input id="stockQuery" type="search" placeholder="Pesquisar produto/código" value="'+esc(state.query)+'">'+
   '<select id="stockFilter"><option value="all"'+(state.filter==='all'?' selected':'')+'>Todos</option><option value="A"'+(state.filter==='A'?' selected':'')+'>Curva A</option>'+
   '<option value="low"'+(state.filter==='low'?' selected':'')+'>⚠️ Abaixo do mínimo</option>'+
   '<option value="unconfigured"'+(state.filter==='unconfigured'?' selected':'')+'>Sem mín/máx cadastrado</option>'+
   '<option value="relevant"'+(state.filter==='relevant'?' selected':'')+'>Com sugestão</option></select>'+
   '<select id="stockSort"><option value="revenue"'+(state.sort==='revenue'?' selected':'')+'>Maior faturamento</option>'+
   '<option value="quantity"'+(state.sort==='quantity'?' selected':'')+'>Maior quantidade</option>'+
   '<option value="daily"'+(state.sort==='daily'?' selected':'')+'>Maior giro diário</option>'+
   '<option value="coverage"'+(state.sort==='coverage'?' selected':'')+'>Menor cobertura</option></select>'+
   '<button type="button" class="btn" id="stockExport">⬇ Exportar estoque CSV</button></div>'+
  '<div class="stock-scroll"><table class="stock-table"><thead><tr>'+
   '<th><input id="stockPickAll" type="checkbox" aria-label="Selecionar produtos desta página"></th>'+
   '<th>Produto e desempenho</th><th>Vendas / 42 dias</th><th>Saldo ERP</th><th>Min / Máx atual</th><th>Min / Máx sugerido</th><th>Situação</th><th>Ação</th>'+
   '</tr></thead><tbody>'+items.map(x=>{
    const v=getNumbers(x),id=esc(x.stockProductId),integer=wholeUnit(x),precision=integer?0:3;
    return '<tr><td><input type="checkbox" data-stock-select="'+id+'"'+(state.selected.has(x.stockProductId)?' checked':'')+(x.available&&!state.busy?'':' disabled')+'></td>'+
    '<td><b>'+esc(x.name)+'</b><small>'+esc(x.code||'')+' · '+esc(x.category||'')+' · ABC '+esc(x.abc)+'</small><small>Receita '+money(x.revenue)+'</small></td>'+
    '<td><b>'+qty(x.quantity42d,3)+' '+esc(x.unit||'UN')+'</b><small>'+qty(x.suggestion?.rate,3)+'/dia</small></td>'+
    '<td><b>'+(x.balance==null?'Não informado':qty(x.balance,3))+'</b><small>'+(x.cover==null?'Cobertura indisponível':qty(x.cover,1)+' dias de cobertura')+'</small></td>'+
    '<td>'+qty(x.stockMinimum,precision)+' / '+qty(x.stockMaximum,precision)+'</td>'+
    '<td>'+(x.available?'<div class="stock-edit"><label>Mín<input type="number" data-stock-min="'+id+'" min="0" max="999999" step="'+(integer?1:0.001)+'" value="'+v.minimum+'"></label>'+
       '<label>Máx<input type="number" data-stock-max="'+id+'" min="0" max="999999" step="'+(integer?1:0.001)+'" value="'+v.maximum+'"></label></div>':'<small>Sem dados suficientes ou produto não localizado</small>')+'</td>'+
    '<td>'+badge(x)+'</td><td><button type="button" class="btn small primary" data-stock-apply="'+id+'"'+(x.available&&!state.busy?'':' disabled')+'>Aplicar</button></td></tr>';
   }).join('')+'</tbody></table></div>'+
  '<div class="stock-footer"><button class="btn primary" type="button" id="stockApplySelected"'+(state.selected.size&&!state.busy?'':' disabled')+'>✅ Aplicar selecionados ('+state.selected.size+')</button>'+
  '<span class="muted">Máximo de 50 produtos por aplicação. Confirmação obrigatória.</span></div>'+
  '<div id="stockResult" role="status" class="notice" hidden></div>'+
  '<p class="muted stock-help"><b>Importante:</b> este cadastro altera apenas <code>estoqueMinimo</code> e <code>estoqueMaximo</code> do produto no ERP. Não muda saldo físico, preço nem as quantidades mínimas/máximas permitidas no carrinho do cliente. Produtos novos, sem vendas ou sob encomenda exigem revisão manual; validade e sazonalidade não entram automaticamente no cálculo.</p>';
 bind();
}
function saveCustom(id){
 const data=rows().find(x=>S(x.stockProductId)===S(id));if(!data)return;
 const min=document.querySelector('[data-stock-min="'+id+'"]'),max=document.querySelector('[data-stock-max="'+id+'"]');
 state.custom.set(S(id),{minimum:min?.value??'',maximum:max?.value??''});
}
async function apply(ids){
 if(state.busy||!bridge()?.api)return setMessage('Reabra a Central e entre novamente para aplicar.','error');
 const all=rows(),byId=new Map(all.map(x=>[S(x.stockProductId),x]));
 const unique=[...new Set(ids.map(S))];
 if(!unique.length)return setMessage('Selecione ao menos um produto com sugestão válida.','error');
 if(unique.length>50)return setMessage('Selecione no máximo 50 produtos por vez.','error');
 const changes=[];
 for(const id of unique){
  const x=byId.get(id);
  if(!x?.available)return setMessage('Produto desatualizado: recarregue a análise.','error');
  const numbers=getNumbers(x);
  if(!validNumbers(x,numbers))return setMessage('Valores inválidos para '+x.name+'. Máximo precisa ser maior ou igual ao mínimo e a unidade deve ser respeitada.','error');
  changes.push({productId:id,minimum:Number(numbers.minimum),maximum:Number(numbers.maximum),expectedUpdatedAt:x.stockUpdatedAt});
 }
 const msg='Confirmar novo estoque mínimo/máximo em '+changes.length+' cadastro(s) de produtos no ERP? Esta ação não altera saldo físico, preços nem limites de compra da loja.';
 if(!window.confirm(msg))return;
 state.busy=true;
 setMessage('Aplicando os novos parâmetros no ERP. Não feche a tela durante a confirmação.');
 const payload={items:changes,period:{from:report()?.window42?.from,to:report()?.window42?.to,days:42},
  parameters:{leadDays:state.lead,reviewDays:state.review,safetyDays:state.safety}};
 let failure=null;
 try{await bridge().api('product-sales-abc/stock-levels',{method:'PATCH',body:payload})}catch(error){failure=error}
 try{
  await bridge().refresh();
  const after=A(bridge().report()?.products);
  const confirmed=changes.every(c=>{
   const p=after.find(x=>S(x.stockProductId)===c.productId);
   return !!p&&Math.abs(N(p.stockMinimum)-c.minimum)<0.0001&&Math.abs(N(p.stockMaximum)-c.maximum)<0.0001;
  });
  if(confirmed){
   changes.forEach(c=>{state.selected.delete(c.productId);state.custom.delete(c.productId)});
   state.busy=false;render();setMessage('✅ '+changes.length+' produto(s) atualizado(s) e conferido(s) diretamente no ERP.', 'success');
  }else{
   state.busy=false;render();
   setMessage('Alteração não confirmada no cadastro do ERP. '+(failure?.message||'Atualize e confira os valores antes de tentar novamente.'),'error');
  }
 }catch(error){
  state.busy=false;render();
  setMessage('Não foi possível verificar os cadastros após salvar. '+(failure?.message||error.message)+'. Não repita a operação antes de consultar o ERP.','error');
 }
}
function download(){
 const d=filteredRows(),p=report()?.period||{},headers=['Código','Produto','Curva ABC','Categoria','Quantidade período','Receita período','Quantidade últimos 42 dias','Média diária 42 dias','Saldo cadastrado','Estoque mínimo atual','Estoque máximo atual','Estoque mínimo sugerido','Estoque máximo sugerido','Status'];
 const rows=[headers,...d.map(x=>[x.code,x.name,x.abc,x.category,x.quantity,x.revenue,x.quantity42d,x.suggestion?.rate??'',x.balance??'',x.stockMinimum,x.stockMaximum,x.suggestion?.minimum??'',x.suggestion?.maximum??'',x.balance==null?'Saldo indisponível':x.shortage?'Abaixo mínimo':x.excess?'Acima máximo':'Dentro da faixa'])];
 const csv='\ufeff'+rows.map(x=>x.map(y=>'"'+S(y).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=url;a.download='central-caseirinho-vendas-estoque-'+S(p.from)+'-'+S(p.to)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function bind(){
 const update=E('stockRecalculate');
 if(update)update.onclick=()=>{
  const a=Number(E('stockLeadDays').value),b=Number(E('stockReviewDays').value),c=Number(E('stockSafetyDays').value);
  if(![a,b,c].every(Number.isInteger)||a<0||a>180||b<1||b>180||c<0||c>180)return setMessage('Informe dias inteiros válidos: prazo de 0 a 180, intervalo de 1 a 180 e segurança de 0 a 180.','error');
  state.lead=a;state.review=b;state.safety=c;state.custom.clear();state.selected.clear();render();
 };
 const search=E('stockQuery');if(search)search.onchange=()=>{state.query=search.value;render()};
 const filter=E('stockFilter');if(filter)filter.onchange=()=>{state.filter=filter.value;render()};
 const sort=E('stockSort');if(sort)sort.onchange=()=>{state.sort=sort.value;render()};
 const csv=E('stockExport');if(csv)csv.onclick=download;
 document.querySelectorAll('[data-stock-min],[data-stock-max]').forEach(el=>el.oninput=()=>saveCustom(el.dataset.stockMin||el.dataset.stockMax));
 document.querySelectorAll('[data-stock-select]').forEach(el=>el.onchange=()=>{
  if(el.checked)state.selected.add(el.dataset.stockSelect);else state.selected.delete(el.dataset.stockSelect);
  const b=E('stockApplySelected');if(b){b.disabled=!state.selected.size;b.textContent='✅ Aplicar selecionados ('+state.selected.size+')'}
 });
 const all=E('stockPickAll');if(all)all.onchange=()=>{
  for(const el of document.querySelectorAll('[data-stock-select]:not(:disabled)')){
   if(all.checked&&state.selected.size>=50)break;
   el.checked=all.checked;
   if(el.checked)state.selected.add(el.dataset.stockSelect);else state.selected.delete(el.dataset.stockSelect);
  }
  const b=E('stockApplySelected');if(b){b.disabled=!state.selected.size;b.textContent='✅ Aplicar selecionados ('+state.selected.size+')'}
 };
 document.querySelectorAll('[data-stock-apply]').forEach(btn=>btn.onclick=()=>apply([btn.dataset.stockApply]));
 const selected=E('stockApplySelected');if(selected)selected.onclick=()=>apply([...state.selected]);
}
window.CaseirinhoSalesStockLevels={render,rows,recommendation,apply,version:'1'};
document.addEventListener('caseirinho:sales-updated',render);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',render,{once:true});else render();
})();