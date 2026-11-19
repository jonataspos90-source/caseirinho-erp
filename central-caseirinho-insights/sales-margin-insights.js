/* Indicadores de margem estimada a partir do relatório ABC existente.
   Somente leitura: não altera DRE, custo ou pedidos. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>Number(x||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const pct=x=>Number(x||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2})+'%';
function mount(){
 const screen=document.querySelector('#sales .cw-screen[data-area="profit"]');if(!screen||$('salesMargins'))return;
 const box=document.createElement('article');box.id='salesMargins';box.className='card';box.style.marginTop='12px';
 box.innerHTML='<div class="section-head"><div><h3>🧮 Rentabilidade estimada dos produtos</h3><p>Usa o relatório oficial de vendas e custos de fichas técnicas. Somente produtos com custo confiável entram na margem.</p></div><button type="button" class="btn primary" id="salesMarginRefresh">🔎 Consultar vendas</button></div><div class="grid stats" id="salesMarginStats"></div><div class="notice" id="salesMarginInfo">Consulte as vendas para analisar margens.</div><h4>Produtos por margem estimada</h4><div style="overflow:auto"><table style="width:100%;min-width:580px"><thead><tr><th>Produto</th><th>Receita de itens</th><th>Custo estimado</th><th>Margem R$</th><th>Margem %</th></tr></thead><tbody id="salesMarginRows"></tbody></table></div><p class="subtitle">Margem bruta estimada = receita dos itens − custo da ficha × quantidade vendida. Não representa lucro líquido ou DRE: tributos, taxas, frete e despesas não contemplados na ficha podem reduzir a margem. Não contabiliza produtos sem ficha confiável.</p>';
 screen.append(box);
 $('salesMarginRefresh').onclick=()=>$('salesRefresh')?.click();
 render();
}
function stat(label,value,note){return '<div class="stat"><strong>'+esc(label)+'</strong><div class="n">'+esc(value)+'</div><small>'+esc(note||'')+'</small></div>'}
function render(){
 const report=window.CaseirinhoInsightsStockBridge?.report?.();
 if(!report||!$('salesMarginStats'))return;
 const items=Array.isArray(report.products)?report.products:[];
 const valid=items.filter(p=>p.unitCost!=null&&Number.isFinite(Number(p.estimatedMargin))&&Number(p.revenue)>0);
 const revenue=valid.reduce((sum,p)=>sum+Number(p.revenue||0),0);
 const cost=valid.reduce((sum,p)=>sum+Number(p.estimatedTotalCost||0),0);
 const margin=valid.reduce((sum,p)=>sum+Number(p.estimatedMargin||0),0);
 const salesRevenue=Number(report.totals?.itemRevenue||0);
 const uncovered=items.length-valid.length;
 $('salesMarginStats').innerHTML=stat('Receita com custo conhecido',money(revenue),'Somente SKUs confiáveis')+
 stat('Custos estimados',money(cost),'Conforme ficha técnica')+
 stat('Margem estimada',money(margin),'Antes de demais despesas')+
 stat('Margem percentual',revenue>0?pct(margin/revenue*100):'—','Produtos com custo válido')+
 stat('Cobertura da receita',salesRevenue>0?pct(revenue/salesRevenue*100):'—','Receita analisável');
 $('salesMarginInfo').textContent='Período: '+String(report.period?.from||'—')+' até '+String(report.period?.to||'—')+' · '+uncovered+' produto(s) sem custo/margem calculável. Confira as fichas antes de decidir preços.';
 const sorted=valid.slice().sort((a,b)=>Number(a.estimatedMargin||0)/Math.max(.01,Number(a.revenue||0))-Number(b.estimatedMargin||0)/Math.max(.01,Number(b.revenue||0)));
 $('salesMarginRows').innerHTML=sorted.length?sorted.map(p=>{
  const value=Number(p.estimatedMargin||0),share=value/Math.max(.01,Number(p.revenue||0))*100;
  return '<tr><td>'+esc(p.name||p.productId)+'</td><td>'+money(p.revenue)+'</td><td>'+money(p.estimatedTotalCost)+'</td><td><b>'+money(value)+'</b></td><td>'+pct(share)+'</td></tr>';
 }).join(''):'<tr><td colspan="5">Não há produtos com custo completo. Cadastre ou ajuste as fichas técnicas.</td></tr>';
}
function init(){
 mount();
 document.addEventListener('caseirinho:sales-updated',render);
 document.querySelector('#sales .cw-tabs')?.addEventListener('click',e=>{if(e.target.closest('[data-area="profit"]'))render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();