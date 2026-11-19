/* Relatório de produção de encomendas — leitura sem alterações de pedidos. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const qty=x=>{const n=Number(x);return Number.isFinite(n)&&n>0?n:0};
const fmt=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:3});
const date=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s))?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4):String(s||'Sem data');
let orders=[],loaded=false,selectedCodes=new Set(),lastRefresh='',lastRefreshAt=0;
function rows(){
 const from=$('prodFrom').value,to=$('prodTo').value,camp=$('prodCampaign').value,mode=$('prodMode').value,term=$('prodSearch').value.trim().toLowerCase();
 return orders.filter(o=>{
  const d=String(o.deliveryDate||'').slice(0,10),s=o.seasonal||{},state=String(o.status||'').toUpperCase();
  if(['CANCELADO','CANCELLED','REJEITADO','RECUSADO','REJECTED','ESTORNADO','ENTREGUE','RETIRADO','FINALIZADO','CONCLUIDO','COMPLETED','DELIVERED'].includes(state))return false;
  if(from&&d<from||to&&d>to||camp&&String(s.campaignId)!==camp)return false;
  if(mode==='confirmed'&&s.depositStatus!=='PAID'||mode==='pending'&&s.depositStatus==='PAID')return false;
  return !term||(String(o.code)+' '+String(o.name)+' '+String(o.phone)+' '+String(s.campaignTitle)).toLowerCase().includes(term);
 });
}
function itemsOf(o){return Array.isArray(o.items)?o.items:Array.isArray(o.itens)?o.itens:[]}
function itemName(p){return String(p.name||p.nome||p.descricao||p.produtoNome||'Produto não identificado').trim()}
function itemId(p){return String(p.produtoId||p.productId||p.id||'')}
function itemQty(p){return qty(p.quantity??p.quantidade??p.qty??1)}
function chosen(){return rows().filter(o=>selectedCodes.has(String(o.id)))}
function summarize(list){
 const groups=new Map(),errors=[];
 for(const o of list){
  const entries=itemsOf(o);
  if(!entries.length)errors.push('Pedido #'+o.code+' sem itens; confira no ERP');
  for(const p of entries){
   const q=itemQty(p),name=itemName(p),id=itemId(p),key=id?'id:'+id:'name:'+name.toLocaleLowerCase('pt-BR');
   if(!q){errors.push('Quantidade inválida: pedido #'+o.code+' — '+name);continue}
   if(!groups.has(key))groups.set(key,{name,id,quantity:0,orders:new Map()});
   const g=groups.get(key);g.quantity+=q;g.orders.set(o.code,(g.orders.get(o.code)||0)+q);
  }
 }
 return {groups:[...groups.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')),errors};
}
function draw(){
 const list=rows(),picked=chosen(),summary=summarize(picked);
 $('prodTotalOrders').textContent=list.length;
 $('prodSelected').textContent=picked.length;
 $('prodUnits').textContent=fmt(summary.groups.reduce((s,g)=>s+g.quantity,0));
 $('prodItemCount').textContent=summary.groups.length;
 $('prodWarning').textContent=summary.errors.length?summary.errors.join(' | '):'';
 $('prodTable').innerHTML=list.length?list.map(o=>{
  const s=o.seasonal||{},checked=selectedCodes.has(String(o.id)),paid=s.depositStatus==='PAID';
  return '<tr><td><input class="prod-pick" type="checkbox" data-id="'+esc(o.id)+'" '+(checked?'checked':'')+' aria-label="Selecionar pedido '+esc(o.code)+'"></td><td><b>#'+esc(o.code)+'</b><br><small>'+esc(o.name)+'</small></td><td>'+esc(date(o.deliveryDate))+'</td><td>'+esc(s.campaignTitle||'—')+'</td><td>'+itemsOf(o).map(p=>esc(fmt(itemQty(p))+' × '+itemName(p))).join('<br>')+'</td><td><span style="color:'+(paid?'#176538':'#975600')+'">'+(paid?'Sinal confirmado':'Aguardando sinal')+'</span></td></tr>'
 }).join(''):'<tr><td colspan="6">Nenhum pedido encontrado no período e filtros escolhidos.</td></tr>';
 $('prodGrouped').innerHTML=summary.groups.length?summary.groups.map(g=>'<tr><td>'+esc(g.name)+'</td><td><b>'+esc(fmt(g.quantity))+'</b></td><td>'+[...g.orders].map(([c,q])=>'#'+esc(c)+' ('+esc(fmt(q))+')').join(', ')+'</td></tr>').join(''):'<tr><td colspan="3">Selecione pedidos para montar a produção.</td></tr>';
 const pending=picked.filter(o=>o.seasonal?.depositStatus!=='PAID').length;
 $('prodPending').textContent=pending?'Atenção: '+pending+' pedido(s) sem sinal confirmado foram selecionados. Não iniciar produção até conferência.':'Produção baseada nos pedidos selecionados.';
 $('prodPrint').disabled=!picked.length||!summary.groups.length||!!summary.errors.length;
 $('prodPrintCards').disabled=!picked.length||!!summary.errors.length;
}
function controls(){
 const root=$('seasonOrdersPanel');
 if(!root||$('productionReport'))return;
 const box=document.createElement('article');box.id='productionReport';box.className='card';box.style.marginTop='18px';
 box.innerHTML='<h3>👩‍🍳 Mapa de produção de encomendas</h3><p class="subtitle">Agrupe produtos por data de entrega e imprima a ordem de produção e fichas por cliente. Apenas consulta: não altera pedidos nem confirma pagamentos.</p>'+
 '<div class="toolbar" style="display:flex;flex-wrap:wrap;gap:8px;align-items:end">'+
 '<label>De <input type="date" id="prodFrom"></label><label>Até <input type="date" id="prodTo"></label>'+
 '<label>Campanha <select id="prodCampaign"><option value="">Todas</option></select></label>'+
 '<label>Sinal <select id="prodMode"><option value="confirmed">Confirmado (produção)</option><option value="pending">Pendente</option><option value="all">Todos (conferência)</option></select></label>'+
 '<label>Buscar <input type="search" id="prodSearch" placeholder="Pedido ou cliente"></label>'+
 '<button type="button" class="btn" id="prodReload">🔄 Atualizar</button></div>'+
 '<p id="prodTimestamp" class="subtitle"></p><div class="toolbar"><button type="button" class="btn small" id="prodAll">Selecionar filtrados</button><button type="button" class="btn small" id="prodNone">Limpar seleção</button></div>'+
 '<div class="toolbar" style="display:flex;flex-wrap:wrap;gap:8px"><span class="badge">Pedidos exibidos: <b id="prodTotalOrders">0</b></span><span class="badge">Selecionados: <b id="prodSelected">0</b></span><span class="badge">Produtos distintos: <b id="prodItemCount">0</b></span><span class="badge">Unidades: <b id="prodUnits">0</b></span></div>'+
 '<div style="overflow:auto;max-height:400px"><table style="width:100%;min-width:690px"><thead><tr><th>✓</th><th>Pedido / Cliente</th><th>Entrega</th><th>Campanha</th><th>Itens</th><th>Sinal</th></tr></thead><tbody id="prodTable"></tbody></table></div>'+
 '<h4>📋 Consolidação de produção</h4><div style="overflow:auto"><table style="width:100%;min-width:460px"><thead><tr><th>Produto / Sabor</th><th>Total para produzir</th><th>Pedidos vinculados</th></tr></thead><tbody id="prodGrouped"></tbody></table></div>'+
 '<p class="notice" id="prodPending"></p><p class="notice" id="prodWarning" style="color:#a12525"></p>'+
 '<div class="toolbar"><button type="button" class="btn primary" id="prodPrint" disabled>🖨️ Imprimir mapa de produção</button><button type="button" class="btn" id="prodPrintCards" disabled>🏷️ Imprimir fichas por pedido</button></div>'+
 '<p class="subtitle">Os relatórios possuem vínculo por número de pedido, identificação do cliente, data de entrega, quantidade, checklist e espaço de assinatura. Dados até 400 pedidos por consulta; confira o período em campanhas com grande volume.</p>';
 root.appendChild(box);
 ['prodFrom','prodTo','prodCampaign','prodMode','prodSearch'].forEach(id=>$(id).addEventListener('input',()=>{selectedCodes.clear();draw()}));
 $('prodAll').onclick=()=>{rows().forEach(o=>selectedCodes.add(String(o.id)));draw()};
 $('prodNone').onclick=()=>{selectedCodes.clear();draw()};
 $('prodTable').addEventListener('change',e=>{if(!e.target.matches('.prod-pick'))return;const id=e.target.dataset.id;if(e.target.checked)selectedCodes.add(id);else selectedCodes.delete(id);draw()});
 $('prodReload').onclick=load;
 $('prodPrint').onclick=()=>printReport(false);
 $('prodPrintCards').onclick=()=>printReport(true);
 const today=new Date();const y=today.getFullYear(),m=String(today.getMonth()+1).padStart(2,'0'),d=String(today.getDate()).padStart(2,'0');
 $('prodFrom').value=y+'-'+m+'-'+d;
 $('prodTo').value='';
 draw();
}
async function load(){
 controls();
 const bridge=window.CaseirinhoSeasonMerchBridge;
 if(!bridge?.api)return;
 const b=$('prodReload');b.disabled=true;b.textContent='Consultando...';
 try{
  const result=await bridge.api('seasonal-orders');
  if(!result?.ok||!Array.isArray(result.orders))throw Error('Retorno incompleto');
  orders=result.orders;loaded=true;lastRefreshAt=Date.now();lastRefresh=new Date().toLocaleString('pt-BR');
  $('prodTimestamp').textContent='Atualizado em '+lastRefresh+(orders.length===400?' · Atenção: limite de 400 pedidos retornados.':'');
  const prev=$('prodCampaign').value,campaigns=new Map(orders.map(o=>[String(o.seasonal?.campaignId||''),String(o.seasonal?.campaignTitle||'Campanha')]).filter(([id])=>id));
  $('prodCampaign').innerHTML='<option value="">Todas</option>'+[...campaigns].map(([id,title])=>'<option value="'+esc(id)+'">'+esc(title)+'</option>').join('');
  if(campaigns.has(prev))$('prodCampaign').value=prev;
  selectedCodes.clear();draw();
 }catch(err){$('prodTimestamp').textContent='Falha na atualização: '+err.message+'. Dados anteriores preservados; não imprima produção sem atualizar.';$('prodPrint').disabled=true;$('prodPrintCards').disabled=true}
 finally{b.disabled=false;b.textContent='🔄 Atualizar'}
}
function htmlDoc(title,body){
 return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>'+
 '@page{size:A4;margin:13mm}body{font:12px Arial,sans-serif;color:#18352b}h1{font-size:21px;border-bottom:3px solid #276349;padding-bottom:10px}h2{font-size:15px;margin-top:18px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #9caaa1;padding:7px;vertical-align:top;text-align:left}th{background:#e5eee8}section{break-inside:avoid}.sheet{break-after:page}.sheet:last-child{break-after:auto}.muted{color:#53655b}.notice{border:1px solid #bd821e;padding:10px}footer{margin-top:16px;font-size:10px}.check{display:inline-block;border:1px solid #777;width:12px;height:12px;margin-right:6px}'+
 '</style></head><body>'+body+'</body></html>';
}
function printReport(cards){
 const list=chosen();
 if(!loaded||!list.length)return alert('Atualize e selecione pelo menos um pedido.');
 if(Date.now()-lastRefreshAt>10*60*1000)return alert('Os pedidos não são atualizados há mais de 10 minutos. Clique em Atualizar antes de imprimir para não produzir pedidos alterados.');
 const {groups,errors}=summarize(list);
 if(errors.length)return alert('Existem itens inválidos. Confira os pedidos antes de imprimir.');
 const pending=list.filter(o=>o.seasonal?.depositStatus!=='PAID');
 if(pending.length&&!confirm(pending.length+' pedido(s) sem sinal confirmado. Deseja imprimir para conferência? Não libere produção sem confirmação.'))return;
 const heading='<h1>Caseirinho Massas Artesanais</h1><p><b>'+esc(cards?'Fichas de separação e identificação':'Mapa consolidado de produção')+'</b> · Emitido: '+esc(new Date().toLocaleString('pt-BR'))+'</p><p>Pedidos: '+list.length+' · Produtos distintos: '+groups.length+' · Quantidade total: '+fmt(groups.reduce((sum,g)=>sum+g.quantity,0))+'</p>';
 const banner=pending.length?'<p class="notice"><b>ATENÇÃO:</b> '+pending.length+' pedido(s) sem confirmação do sinal. Impressão para conferência; não significa liberação de produção.</p>':'';
 const table= '<table><thead><tr><th>Produto / Sabor</th><th>Quantidade total</th><th>Pedidos de origem</th><th>Produzido</th><th>Conferido</th></tr></thead><tbody>'+groups.map(g=>'<tr><td>'+esc(g.name)+'</td><td><b>'+fmt(g.quantity)+'</b></td><td>'+[...g.orders].map(([code,q])=>'#'+esc(code)+' ('+fmt(q)+')').join(', ')+'</td><td>☐</td><td>☐</td></tr>').join('')+'</tbody></table>';
 const details=list.slice().sort((a,b)=>String(a.deliveryDate).localeCompare(String(b.deliveryDate))).map(o=>{
  const p=o.seasonal||{};
  return '<section class="sheet"><h2>Pedido #'+esc(o.code)+' — '+esc(o.name)+'</h2><p><b>Data:</b> '+esc(date(o.deliveryDate))+' · <b>'+esc(o.mode==='ENTREGA'?'Entrega':'Retirada')+'</b> · <b>Campanha:</b> '+esc(p.campaignTitle)+'</p><p><b>Telefone:</b> '+esc(o.phone)+' · <b>Sinal:</b> '+(p.depositStatus==='PAID'?'Confirmado':'PENDENTE')+' · <b>Saldo:</b> '+(p.balanceStatus==='PAID'?'Quitado':'Pendente')+'</p><table><thead><tr><th>Produto</th><th>Quantidade</th><th>Produzido</th><th>Embalado</th></tr></thead><tbody>'+itemsOf(o).map(i=>'<tr><td>'+esc(itemName(i))+'</td><td>'+fmt(itemQty(i))+'</td><td>☐</td><td>☐</td></tr>').join('')+'</tbody></table><p>Observações de produção: __________________________________________________________</p><p>Separado por: _____________________ Conferido por: _____________________</p><p>Entrega/retirada: ______________________ Assinatura: _______________________</p></section>';
 }).join('');
 const body=heading+banner+(cards?details:'<h2>Total por produto (ordem para cozinha)</h2>'+table+'<p>Responsável pela produção: __________________________ Data/hora: _______________________</p><h2>Rastreabilidade por pedido</h2>'+details);
 const w=window.open('','_blank');
 if(!w)return alert('O navegador bloqueou a janela de impressão. Permita pop-ups para a Central.');
 w.document.open();w.document.write(htmlDoc(cards?'Fichas de encomendas':'Mapa de produção',body));w.document.close();w.focus();
 w.onload=()=>w.print();
}
function start(){
 controls();
 const bridge=window.CaseirinhoSeasonMerchBridge;
 if(bridge?.st?.token)load();
 document.querySelectorAll('[data-season-admin-tab="orders"]').forEach(b=>b.addEventListener('click',()=>{if(!loaded)load()}));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();