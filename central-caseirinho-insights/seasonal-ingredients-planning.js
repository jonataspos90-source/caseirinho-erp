/* Pré-lista de insumos a partir das fichas técnicas ERP e das encomendas pagas.
   Somente leitura. Não desconta saldo de estoque nem gera pedido de compra. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const txt=x=>String(x??'');
const esc=x=>txt(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const amount=x=>Number(x);
const fmt=x=>Number(x).toLocaleString('pt-BR',{maximumFractionDigits:3});
let snapshot=null;
function mount(){
 const report=$('productionReport');if(!report||$('seasonIngredients'))return;
 const div=document.createElement('section');div.id='seasonIngredients';div.style.cssText='margin:20px 0 0;padding:18px;border:1px solid #d9e9dd;border-radius:15px;background:white';
 div.innerHTML='<h3>🥔 Pré-lista de ingredientes da produção</h3><p class="subtitle">Cálculo teórico baseado nas fichas técnicas. Selecione as encomendas no relatório acima e consulte os insumos. Não movimenta estoque ou cria compras.</p><div class="toolbar"><button type="button" class="btn primary" id="ingredientsCalc">📋 Calcular ingredientes selecionados</button><button type="button" class="btn" id="ingredientsCsv" disabled>⬇ Exportar CSV</button><button type="button" class="btn" id="ingredientsPrint" disabled>🖨️ Imprimir</button></div><p id="ingredientsMessage" class="notice">Aguardando seleção de encomendas.</p><div style="overflow:auto"><table style="width:100%;min-width:500px"><thead><tr><th>Insumo / Componente</th><th>Necessidade teórica</th><th>Unidade ERP</th><th>Produtos de origem</th></tr></thead><tbody id="ingredientsRows"></tbody></table></div><div id="ingredientsWarnings"></div><p class="subtitle">Fórmula: quantidade encomendada × quantidade do componente ÷ rendimento da ficha. Confira a compatibilidade de unidades, perdas, conversões e saldos antes de comprar.</p>';
 report.append(div);
 $('ingredientsCalc').onclick=calculate;
 $('ingredientsCsv').onclick=csv;
 $('ingredientsPrint').onclick=print;
}
function selectedIds(){return new Set([...document.querySelectorAll('#prodTable .prod-pick:checked')].map(x=>String(x.dataset.id)))}
async function calculate(){
 mount();const bridge=window.CaseirinhoSeasonMerchBridge;
 if(!bridge?.st?.token)return alert('Faça login administrativo para calcular ingredientes.');
 const chosen=selectedIds();if(!chosen.size)return alert('Selecione primeiro as encomendas no relatório de produção.');
 const btn=$('ingredientsCalc');btn.disabled=true;btn.textContent='Calculando...';snapshot=null;
 $('ingredientsCsv').disabled=true;$('ingredientsPrint').disabled=true;
 try{
  const [o,f]=await Promise.all([bridge.api('seasonal-orders'),bridge.api('fichas')]);
  if(!o?.ok||!Array.isArray(o.orders)||!f?.ok||!Array.isArray(f.fichas)||!Array.isArray(f.products))throw Error('Dados de encomendas ou fichas incompletos');
  const source=o.orders.filter(x=>chosen.has(String(x.id)));
  if(source.length!==chosen.size)throw Error('A lista mudou. Atualize encomendas e refaça a seleção.');
  const orders=source.filter(x=>x.seasonal?.depositStatus==='PAID'&&!['CANCELADO','RECUSADO','REJEITADO','ENTREGUE','RETIRADO','FINALIZADO','CONCLUIDO'].includes(String(x.status).toUpperCase()));
  const excluded=source.length-orders.length;
  const productMap=new Map(f.products.map(x=>[String(x.id),x]));
  const fichaMap=new Map(f.fichas.filter(x=>String(x.status||'ATIVO').toUpperCase()!=='INATIVO').map(x=>[String(x.productId),x]));
  const rows=new Map(),warnings=[];
  if(excluded)warnings.push(excluded+' pedido(s) excluído(s) por falta de sinal confirmado ou por estarem cancelados/concluídos.');
  for(const order of orders){
   const items=Array.isArray(order.items)?order.items:[];
   for(const item of items){
    const id=String(item.produtoId||item.productId||''),name=String(item.nome||item.name||id),qty=amount(item.quantidade??item.quantity);
    if(!(qty>0)||!Number.isFinite(qty)){warnings.push('Pedido #'+order.code+': quantidade inválida para '+name);continue}
    const ficha=fichaMap.get(id);
    if(!ficha){warnings.push('Pedido #'+order.code+': '+name+' sem ficha técnica vinculada; não calculado.');continue}
    const yieldQty=amount(ficha.yield);
    if(!(yieldQty>0)||!Array.isArray(ficha.components)||!ficha.components.length){warnings.push(name+': rendimento ou componentes da ficha inválidos.');continue}
    for(const comp of ficha.components){
     const componentId=String(comp.produtoId||comp.productId||''),componentQty=amount(comp.quantidade??comp.quantity);
     if(!componentId||!(componentQty>0)){warnings.push(name+': componente sem código ou quantidade válida.');continue}
     const product=productMap.get(componentId),key=componentId;
     const required=qty*componentQty/yieldQty;
     if(!rows.has(key))rows.set(key,{id:key,name:String(product?.name||'Insumo '+key),unit:String(product?.unit||'A CONFERIR'),total:0,parents:new Set()});
     const row=rows.get(key);row.total+=required;row.parents.add(name);
     if(!product)warnings.push('Insumo '+componentId+' não localizado entre os produtos do ERP; confira unidade.');
    }
   }
  }
  const sorted=[...rows.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  snapshot={rows:sorted,warnings:[...new Set(warnings)],orders:orders.length,checkedAt:new Date()};
  $('ingredientsRows').innerHTML=sorted.length?sorted.map(r=>'<tr><td>'+esc(r.name)+'</td><td><b>'+fmt(r.total)+'</b></td><td>'+esc(r.unit)+'</td><td>'+esc([...r.parents].join(', '))+'</td></tr>').join(''):'<tr><td colspan="4">Nenhum componente calculável. Confira fichas e produtos vinculados.</td></tr>';
  $('ingredientsMessage').textContent='Consultado em '+snapshot.checkedAt.toLocaleString('pt-BR')+' · '+orders.length+' encomenda(s) com sinal confirmado · '+sorted.length+' insumos calculados.';
  $('ingredientsWarnings').innerHTML=snapshot.warnings.length?'<p class="notice" style="color:#8a4d12"><b>Itens para conferir:</b><br>'+snapshot.warnings.map(esc).join('<br>')+'</p>':'';
  $('ingredientsCsv').disabled=!sorted.length;$('ingredientsPrint').disabled=!sorted.length;
 }catch(err){
  $('ingredientsMessage').textContent='Não foi possível calcular: '+err.message+' Nenhum estoque, produto ou pedido foi alterado.';
  $('ingredientsRows').textContent='';
 }finally{btn.disabled=false;btn.textContent='📋 Calcular ingredientes selecionados'}
}
function ensureFresh(){
 if(!snapshot||Date.now()-snapshot.checkedAt.getTime()>10*60*1000){alert('Atualize o cálculo antes de imprimir ou exportar.');return false}return true;
}
function csv(){
 if(!ensureFresh())return;
 const data=[['Insumo','Código ERP','Quantidade teórica','Unidade','Origem'],...snapshot.rows.map(r=>[r.name,r.id,String(Number(r.total.toFixed(3))).replace('.',','),r.unit,[...r.parents].join(' | ')])];
 const output='\ufeff'+data.map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([output],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='caseirinho-necessidade-insumos.csv';a.click();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function print(){
 if(!ensureFresh())return;
 const w=window.open('','_blank');if(!w)return alert('Permita a janela de impressão.');
 const doc='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Insumos Caseirinho</title><style>body{font:12px Arial;padding:20px;color:#123c2c}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:8px;text-align:left}th{background:#eee}</style></head><body><h1>Caseirinho — pré-lista de insumos</h1><p>Emitido: '+esc(snapshot.checkedAt.toLocaleString('pt-BR'))+' · '+snapshot.orders+' encomenda(s)</p><table><thead><tr><th>Insumo</th><th>Quantidade teórica</th><th>Unidade</th><th>Origem</th></tr></thead><tbody>'+snapshot.rows.map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+fmt(r.total)+'</td><td>'+esc(r.unit)+'</td><td>'+esc([...r.parents].join(', '))+'</td></tr>').join('')+'</tbody></table><h3>Ressalvas</h3><p>'+snapshot.warnings.map(esc).join('<br>')+'</p><p>Conferir unidades, estoque atual, perdas e conversões antes de emitir pedido de compra.</p></body></html>';
 w.document.write(doc);w.document.close();w.onload=()=>w.print();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();