(function(root){'use strict';
// Apenas apresentação: os valores registrados no pedido não são alterados.
function amount(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function pick(...vs){for(const v of vs){const n=amount(v);if(n!==null)return n}return null}
function round(n){return Math.round((n+Number.EPSILON)*100)/100}
function breakdown(input={}){
  const o={...(input.payload||{}),...input},v=o.valores||{},items=[...(Array.isArray(o.itens)?o.itens:[]),...(Array.isArray(o.adicionaisEcommerce)?o.adicionaisEcommerce:[])];
  const freight=round(Math.max(0,pick(o.valorFrete,typeof o.frete==='number'?o.frete:null,v.taxa_entrega,0)));
  const knownTotal=pick(o.total,o.valorTotal,v.total);
  const priced=items.length&&items.every(i=>pick(i.total,i.precoUnitario,i.preco_unitario,i.preco,i.valorUnitario)!==null);
  const itemSum=priced?round(items.reduce((s,i)=>s+(pick(i.total)??((pick(i.quantidade,i.qtd,1))*pick(i.precoUnitario,i.preco_unitario,i.preco,i.valorUnitario,0))),0)):null;
  const coupon=pick(o.descontoCupom,o.cupom?.desconto,o.comercial?.coupon?.discount,0);
  const cashback=pick(o.cashbackDiscount,o.cashback?.used,0);
  const gross=round(Math.max(0,pick(o.subtotalOriginal,v.subtotalOriginal,itemSum,
    amount(o.subtotal)!==null?Number(o.subtotal)+coupon:null,v.subtotal,
    knownTotal!==null?knownTotal-freight+coupon+cashback:0)));
  const total=round(Math.max(0,knownTotal??gross-coupon-cashback+freight));
  const discounts=round(Math.max(0,gross+freight-total));
  const adjustment=round(Math.max(0,total-gross-freight));
  const pending=String(o.freteStatus||'').toUpperCase()==='COTACAO_PENDENTE';
  return {products:gross,freight,discounts,adjustment,total,pending,
    pickup:String(o.modalidade||'').toUpperCase()==='RETIRADA'};
}
function money(n){return n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function lines(o){
  const b=breakdown(o),out=[['Produtos',money(b.products)]];
  if(b.discounts>0)out.push(['Descontos / cashback','- '+money(b.discounts)]);
  out.push(['Frete',b.pending?'A calcular':money(b.freight)+(b.pickup?' (retirada)':'')]);
  if(b.adjustment>0)out.push(['Ajustes do pedido',money(b.adjustment)]);
  out.push([b.pending?'Total atual (frete a calcular)':'Total do pedido',money(b.total)]);
  return out;
}
function text(o,separator='\n'){return lines(o).map(([label,value])=>label+': '+value).join(separator)}
root.JohnOrderAmounts={breakdown,lines,text};
})(typeof window!=='undefined'?window:globalThis);
