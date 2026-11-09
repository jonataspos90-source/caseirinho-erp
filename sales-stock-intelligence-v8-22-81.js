(function(){
'use strict';
if(window.JohnSalesStockIntel)return;
const $=id=>document.getElementById(id), S=x=>String(x??''), N=x=>Number(x)||0, A=x=>Array.isArray(x)?x:[];
const esc=x=>S(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=x=>N(x).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const num=(x,d=0)=>N(x).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:Math.max(d,3)});
const norm=x=>S(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const isoDate=date=>{const d=new Date(date);return [d.getFullYear(),S(d.getMonth()+1).padStart(2,'0'),S(d.getDate()).padStart(2,'0')].join('-')};
const today=new Date(), earliest=new Date(today.getFullYear(),today.getMonth(),today.getDate()-29);
const state={start:isoDate(earliest),end:isoDate(today),query:'',sort:'revenue',channel:'TODOS',lead:2,review:7,safety:2,selected:new Set(),busy:false};
function dbx(){try{return window.db||db||{}}catch(_){return{}}}
function allProducts(){return A(dbx().produtos||dbx().products)}
function stock(p){try{if(typeof window.estoqueProduto==='function')return N(window.estoqueProduto(p.id));if(typeof estoqueProduto==='function')return N(estoqueProduto(p.id))}catch(_){}return N(p.saldo??p.estoqueAtual??p.stock??p.saldoDisponivel)}
function cost(p){try{if(typeof window.custoProduto==='function')return N(window.custoProduto(p.id));if(typeof custoProduto==='function')return N(custoProduto(p.id))}catch(_){}return N(p.custoMedio??p.custoAtual??p.custo??p.custoInicial)}
function dateOf(v){return S(v.data||v.dataVenda||v.dataPedido||v.criadoEm||v.createdAt).slice(0,10)}
const BAD_STATUS=new Set(['CANCELADO','CANCELADA','REJEITADO','REJEITADA','INATIVO','EXCLUIDO','ESTORNADO','DEVOLVIDO']);
function excluded(x){const st=norm(x?.status);return BAD_STATUS.has(st)||x?.pedidoTeste===true||x?.teste===true||x?.isTest===true||x?.isTeste===true||x?.simulacao===true}
function orderIndex(){
 const m=new Map();
 for(const o of A(dbx().pedidos)){for(const id of [o.id,o.ecommercePedidoId,o.origemPedidoId])if(id)m.set(S(id),o)}
 return m;
}
function channelFor(v,o){
 const x=norm(o?.canalVenda||o?.origem||v.canalVenda||v.origem);
 if(x.includes('ECOMMERCE')||x.includes('WEB')||x.includes('PEDIDO_RECONCILIADO'))return 'ECOMMERCE';
 if(x.includes('WHATS'))return 'WHATSAPP';
 if(x.includes('BALCAO')||x.includes('LOJA')||x.includes('PDV'))return 'LOJA';
 return 'OUTROS';
}
function salesLines(){
 const orderById=orderIndex(), seen=new Set(), out=[];
 for(const v of A(dbx().vendas)){
  if(!v||excluded(v))continue;
  const date=dateOf(v);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date<state.start||date>state.end)continue;
  const id=S(v.id||'');
  if(id&&seen.has(id))continue;
  if(id)seen.add(id);
  const o=orderById.get(S(v.origemPedidoId||v.pedidoId||''))||null;
  if(o&&(excluded(o)||BAD_STATUS.has(norm(o.statusEcommerce))))continue;
  const channel=channelFor(v,o);
  if(state.channel!=='TODOS'&&state.channel!==channel)continue;
  const productId=S(v.produtoId||v.itemId);
  const quantity=N(v.quantidade);
  if(!productId||quantity<=0)continue;
  const revenue=N(v.valorLiquido??v.total??(N(v.precoUnitario)*quantity));
  const historic=N(v.cmv??(N(v.custoUnitario)*quantity));
  out.push({id,productId,date,quantity,revenue,cmv:historic,channel,hasCost:historic>0});
 }
 return out;
}
function daySpan(){
 const a=new Date(state.start+'T12:00:00'),b=new Date(state.end+'T12:00:00');
 const d=Math.round((b.getTime()-a.getTime())/86400000)+1;
 return Number.isFinite(d)?Math.max(1,d):30;
}
function stepOf(p){const u=norm(p.unidade||p.unidadeMedida||'UN');return /^(KG|G|L|LT|ML|M|M2|M3)$/.test(u)?0.001:1}
function ceilStep(value,step){return Math.round(Math.ceil((value-1e-9)/step)*step*1000)/1000}
function recommendation(rate,p){
 if(!(rate>0))return null;
 const step=stepOf(p), minimum=Math.max(step,ceilStep(rate*(state.lead+state.safety),step));
 const maximum=Math.max(minimum,ceilStep(rate*(state.lead+state.review+state.safety),step));
 return{min:minimum,max:maximum};
}
function compute(){
 const ps=allProducts(), byId=new Map(ps.map(p=>[S(p.id),p])), lines=salesLines(), map=new Map();
 for(const p of ps)map.set(S(p.id),{p,id:S(p.id),quantity:0,revenue:0,cmv:0,costEstimated:false,days:new Set(),transactions:0,firstHalf:0,lastHalf:0});
 const pivot=new Date(state.start+'T12:00:00');pivot.setDate(pivot.getDate()+Math.floor(daySpan()/2));
 const pivotDate=isoDate(pivot);
 for(const v of lines){
  const p=byId.get(v.productId);
  if(!p)continue;
  const r=map.get(v.productId);r.quantity+=v.quantity;r.revenue+=v.revenue;
  if(v.hasCost)r.cmv+=v.cmv;
  else {r.cmv+=cost(p)*v.quantity;r.costEstimated=true}
  r.days.add(v.date);r.transactions++;
  if(v.date<pivotDate)r.firstHalf+=v.quantity;else r.lastHalf+=v.quantity;
 }
 const period=daySpan(), values=[...map.values()].map(r=>{
  const p=r.p,rate=r.quantity/period,proposal=recommendation(rate,p),onHand=stock(p);
  return{...r,rate,proposal,stock:onHand,coverage:rate>0?onHand/rate:null,
   profit:r.revenue-r.cmv,margin:r.revenue>0?(r.revenue-r.cmv)/r.revenue*100:0,
   currentMin:N(p.estoqueMinimo??p.minimo),currentMax:N(p.estoqueMaximo??p.maximo),
   active:norm(p.status||'ATIVO')!=='INATIVO',
   confidence:r.days.size>=3?'Adequada':r.quantity>0?'Amostra pequena':'Sem vendas'};
 });
 const revenueAll=values.reduce((sum,r)=>sum+r.revenue,0);
 let accumulated=0;
 for(const r of values.slice().sort((a,b)=>b.revenue-a.revenue)){
  const before=accumulated;accumulated+=r.revenue;
  r.share=revenueAll?r.revenue/revenueAll*100:0;
  r.abc=!r.revenue?'-':before/revenueAll<0.80?'A':before/revenueAll<0.95?'B':'C';
 }
 return{values,lines,period,revenueAll};
}
function visibleRows(data){
 const q=norm(state.query);
 const list=data.values.filter(r=>!q||[r.p.nome,r.p.codigo,r.p.gtin,r.p.plu].some(v=>norm(v).includes(q)));
 const order={revenue:(a,b)=>b.revenue-a.revenue,quantity:(a,b)=>b.quantity-a.quantity,profit:(a,b)=>b.profit-a.profit,margin:(a,b)=>b.margin-a.margin,coverage:(a,b)=>(a.coverage??1e9)-(b.coverage??1e9)};
 list.sort((order[state.sort]||order.revenue));
 return list;
}
function statusLabel(r){
 if(!r.proposal)return '<span class="mg-badge mg-soft">Sem giro</span>';
 if(r.stock<r.currentMin||r.stock<r.proposal.min)return '<span class="mg-badge mg-danger">Repor</span>';
 if(r.stock>r.proposal.max)return '<span class="mg-badge mg-warn">Excesso</span>';
 return '<span class="mg-badge mg-good">Coberto</span>';
}
function style(){
 if($('johnSalesStockStyle'))return;
 const s=document.createElement('style');s.id='johnSalesStockStyle';
 s.textContent='#mg822Body .ss-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}#mg822Body .ss-kpi{padding:14px;border:1px solid #d9e7e5;border-radius:12px;background:#f6fffc}#mg822Body .ss-kpi small{color:#546b67;display:block}#mg822Body .ss-kpi strong{font-size:20px;display:block;margin-top:5px}#mg822Body .ss-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}#mg822Body .ss-field label{display:block;font-weight:750;font-size:12px;margin-bottom:5px}#mg822Body .ss-field input,#mg822Body .ss-field select{width:100%;padding:9px;border:1px solid #cbd5e1;border-radius:8px;box-sizing:border-box;background:#fff}#mg822Body .ss-small{font-size:11px;color:#64748b}#mg822Body .ss-tbl{width:100%;border-collapse:collapse;font-size:12px;white-space:nowrap}#mg822Body .ss-tbl td,#mg822Body .ss-tbl th{padding:9px;border-bottom:1px solid #e2e8f0;text-align:left}#mg822Body .ss-tbl td:first-child{max-width:270px;white-space:normal}#mg822Body .ss-tbl input[type=number]{width:66px;padding:6px;border:1px solid #cbd5e1;border-radius:7px}#mg822Body .ss-tbl .ss-bars{height:5px;width:95px;background:#e2e8f0;border-radius:9px;margin-top:4px}#mg822Body .ss-tbl .ss-bars i{display:block;height:100%;background:#0f766e;border-radius:9px}#mg822Body .ss-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}#mg822Body .ss-help{color:#425466;font-size:12px;line-height:1.5}#mg822Body .ss-message{margin:8px 0;padding:10px;border-radius:8px;background:#eff6ff;color:#1e40af}#mg822Body .ss-scroll{overflow-x:auto}#mg822Body button[disabled]{opacity:.45;cursor:not-allowed}@media(max-width:800px){#mg822Body .ss-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}#mg822Body .ss-filters{grid-template-columns:repeat(2,minmax(0,1fr))}}';
 document.head.appendChild(s);
}
function render(){
 style();
 const d=compute(),rows=visibleRows(d),sold=d.values.filter(r=>r.quantity>0),sumQty=d.lines.reduce((s,x)=>s+x.quantity,0),sumCmv=d.values.reduce((s,x)=>s+x.cmv,0);
 const top=d.values.slice().sort((a,b)=>b.revenue-a.revenue)[0];
 const below=d.values.filter(r=>r.proposal&&r.stock<r.proposal.min).length;
 const selectedCount=rows.filter(r=>state.selected.has(r.id)&&r.proposal&&r.active).length;
 const rowHtml=rows.map(r=>{
  const p=r.p,canApply=!!r.proposal&&r.active,trend=r.firstHalf>0?((r.lastHalf-r.firstHalf)/r.firstHalf*100):null;
  const pct=r.share||0,selected=state.selected.has(r.id)?' checked':'';
  const min=r.proposal?num(r.proposal.min,stepOf(p)===1?0:3):'—',max=r.proposal?num(r.proposal.max,stepOf(p)===1?0:3):'—';
  return '<tr><td><input type="checkbox" data-ss-pick="'+esc(r.id)+'"'+selected+(canApply?'':' disabled')+' aria-label="Selecionar '+esc(p.nome)+'"></td>'+
   '<td><b>'+esc(p.nome||'Produto sem nome')+'</b><div class="ss-small">'+esc(p.codigo||r.id)+' · '+esc(p.unidade||'UN')+(r.active?'':' · Inativo')+'</div></td>'+
   '<td><span class="mg-badge '+(r.abc==='A'?'mg-good':r.abc==='B'?'mg-warn':'mg-soft')+'">'+esc(r.abc)+'</span><div class="ss-bars"><i style="width:'+Math.min(100,pct*4)+'%"></i></div><small>'+num(pct,1)+'%</small></td>'+
   '<td><b>'+num(r.quantity,2)+'</b><div class="ss-small">'+num(r.rate,2)+'/dia</div></td>'+
   '<td><b>'+money(r.revenue)+'</b></td><td>'+money(r.profit)+'<div class="ss-small">'+num(r.margin,1)+'%'+(r.costEstimated?'*':'')+'</div></td>'+
   '<td>'+num(r.stock,2)+'<div class="ss-small">'+(r.coverage===null?'—':num(r.coverage,1)+' dias')+'</div></td>'+
   '<td>'+num(r.currentMin,2)+' / '+num(r.currentMax,2)+'</td>'+
   '<td>'+(canApply?'<input type="number" min="0" step="'+stepOf(p)+'" data-ss-min="'+esc(r.id)+'" value="'+r.proposal.min+'"> / <input type="number" min="0" step="'+stepOf(p)+'" data-ss-max="'+esc(r.id)+'" value="'+r.proposal.max+'">':'—')+
    '<div class="ss-small">'+esc(r.confidence)+'</div></td>'+
   '<td>'+statusLabel(r)+(trend===null?'':'<div class="ss-small">Tend.: '+(trend>=0?'+':'')+num(trend,0)+'%</div>')+'</td>'+
   '<td><button class="mg-btn mg-primary" data-ss-apply="'+esc(r.id)+'"'+(canApply&&!state.busy?'':' disabled')+'>Aplicar</button></td></tr>';
 }).join('');
 const selector=(value,text)=>'<option value="'+esc(value)+'"'+(state.sort===value?' selected':'')+'>'+esc(text)+'</option>';
 return '<div class="mg-panel"><h2>📈 Performance de Vendas & Estoque Inteligente</h2><p class="ss-help">Ranking por produto com base nas vendas registradas no ERP (inclusive vendas reconciliadas do e-commerce). A data considerada é a <b>data da venda/compra</b>, não a entrega. Pedidos em aberto não são considerados vendas. Operações sinalizadas como teste ou canceladas são excluídas.</p>'+
 '<div class="ss-kpis"><div class="ss-kpi"><small>Faturamento dos produtos</small><strong>'+money(d.revenueAll)+'</strong></div><div class="ss-kpi"><small>Quantidade vendida</small><strong>'+num(sumQty,2)+'</strong></div><div class="ss-kpi"><small>Lucro bruto estimado</small><strong>'+money(d.revenueAll-sumCmv)+'</strong></div><div class="ss-kpi"><small>Itens abaixo do mínimo sugerido</small><strong>'+below+'</strong></div></div>'+
 '<div class="ss-small" style="margin:9px 0">Produtos com venda: '+sold.length+' · Líder em faturamento: '+esc(top&&top.revenue>0?top.p.nome:'sem dados')+' · Produtos com custo estimado marcados com *.</div></div>'+
 '<div class="mg-panel"><h3>Filtros e parâmetros da reposição</h3><div class="ss-filters">'+
 '<div class="ss-field"><label>Data inicial (compra)</label><input id="ssStart" type="date" value="'+esc(state.start)+'"></div>'+
 '<div class="ss-field"><label>Data final (compra)</label><input id="ssEnd" type="date" value="'+esc(state.end)+'"></div>'+
 '<div class="ss-field"><label>Canal</label><select id="ssChannel">'+['TODOS','ECOMMERCE','LOJA','WHATSAPP','OUTROS'].map(v=>'<option '+(state.channel===v?'selected':'')+'>'+v+'</option>').join('')+'</select></div>'+
 '<div class="ss-field"><label>Ordenar ranking</label><select id="ssSort">'+selector('revenue','Maior faturamento')+selector('quantity','Mais unidades')+selector('profit','Maior lucro bruto')+selector('margin','Maior margem %')+selector('coverage','Menor cobertura de estoque')+'</select></div>'+
 '<div class="ss-field"><label>Buscar produto/código</label><input id="ssQuery" type="search" value="'+esc(state.query)+'" placeholder="Ex.: Nhoque ou 000084"></div>'+
 '<div class="ss-field"><label>Prazo para repor (dias)</label><input id="ssLead" type="number" min="0" max="180" value="'+state.lead+'"></div>'+
 '<div class="ss-field"><label>Intervalo entre reposições (dias)</label><input id="ssReview" type="number" min="1" max="180" value="'+state.review+'"></div>'+
 '<div class="ss-field"><label>Estoque de segurança (dias)</label><input id="ssSafety" type="number" min="0" max="180" value="'+state.safety+'"></div></div>'+
 '<div class="ss-actions"><button id="ssUpdate" class="mg-btn mg-primary">Atualizar análise</button><button id="ssCsv" class="mg-btn mg-soft">Exportar CSV</button></div>'+
 '<p class="ss-help"><b>Como é calculado:</b> demanda média diária = unidades vendidas ÷ '+d.period+' dias. Mínimo sugerido = média diária × (prazo de reposição + segurança). Máximo sugerido = média diária × (prazo + intervalo + segurança), arredondado à unidade do produto. Curva ABC: A até 80%, B até 95% e C restante do faturamento acumulado. Os parâmetros e o resultado são sugestões; nenhuma alteração é automática.</p></div>'+
 '<div class="mg-panel"><h3>Ranking e sugestão de estoque</h3><p class="ss-help">Você pode ajustar os números sugeridos antes de aplicar. Produtos sem vendas no período não recebem sugestão automática. Para itens fabricados sob encomenda ou perecíveis, avalie validade, capacidade de produção e demanda sazonal.</p>'+
 '<div class="ss-scroll"><table class="ss-tbl"><thead><tr><th><input type="checkbox" id="ssSelectAll" aria-label="Selecionar todos com sugestão"></th><th>Produto / Código</th><th>ABC</th><th>Qtd.</th><th>Receita</th><th>Lucro bruto</th><th>Saldo / Cobertura</th><th>Mín/Máx atual</th><th>Mín/Máx sugerido</th><th>Situação</th><th>Ação</th></tr></thead><tbody>'+rowHtml+'</tbody></table></div>'+
 '<div class="ss-actions"><button class="mg-btn mg-primary" id="ssApplySelected"'+(selectedCount&&!state.busy?'':' disabled')+'>Aplicar selecionados ('+selectedCount+')</button> <span class="ss-small">Alterações são gravadas nos campos estoqueMinimo e estoqueMaximo do cadastro do produto.</span></div>'+
 '<div id="ssMessage" role="status" aria-live="polite"></div></div>';
}
function refresh(){if($('mg822Body')){$('mg822Body').innerHTML=render();bind()}}
function params(){
 const start=$('ssStart')?.value,end=$('ssEnd')?.value;
 if(!start||!end||start>end){message('Informe um período válido, com a data inicial anterior à final.');return false}
 state.start=start;state.end=end;state.query=S($('ssQuery')?.value||'').trim();
 state.channel=S($('ssChannel')?.value||'TODOS');
 state.sort=S($('ssSort')?.value||'revenue');
 const numeric=(id,fallback,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number($(id)?.value))?Number($(id)?.value):fallback));
 state.lead=numeric('ssLead',2,0,180);state.review=numeric('ssReview',7,1,180);state.safety=numeric('ssSafety',2,0,180);
 state.selected.clear();
 return true;
}
function message(t){const el=$('ssMessage');if(el){el.className='ss-message';el.textContent=t}else if(typeof window.toast==='function')window.toast(t)}
function exportCSV(){
 const d=compute(),rows=visibleRows(d),header=['codigo','produto','unidade','curva_abc','qtd_vendida','receita','cmv_estimado','lucro_bruto_estimado','margem_pct','media_diaria','estoque_atual','cobertura_dias','minimo_atual','maximo_atual','minimo_sugerido','maximo_sugerido','amostra'];
 const data=[header,...rows.map(r=>[r.p.codigo||'',r.p.nome||'',r.p.unidade||'UN',r.abc,r.quantity,r.revenue,r.cmv,r.profit,r.margin,r.rate,r.stock,r.coverage??'',r.currentMin,r.currentMax,r.proposal?.min??'',r.proposal?.max??'',r.confidence])];
 const csv='\ufeff'+data.map(row=>row.map(x=>'"'+S(x).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='caseirinho_performance_estoque_'+state.start+'_a_'+state.end+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function canEdit(){try{
 if(typeof window.permissao==='function')return !!window.permissao('produtos','editar');
 if(typeof permissao==='function')return !!permissao('produtos','editar');
 }catch(_){}return false}
function actor(){try{return S(window.usuarioAtual?.()?.nome||window.usuarioAtual?.()?.login||'ERP')}catch(_){return'ERP'}}
async function saveLocal(){
 if(typeof window.saveDB==='function'){await window.saveDB();return}
 if(typeof saveDB==='function'){await saveDB();return}
 const key=typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1';
 const store=window.__johnLocalStorage||localStorage;store.setItem(key,JSON.stringify(dbx()));
}
async function apply(ids){
 if(state.busy)return;
 if(!canEdit()){message('Seu usuário não tem permissão para editar produtos.');return}
 const data=compute(),look=new Map(data.values.map(r=>[r.id,r])),changes=[];
 for(const id of ids){
  const r=look.get(S(id));if(!r?.proposal||!r.active)continue;
  const minEl=document.querySelector('[data-ss-min="'+CSS.escape(S(id))+'"]');
  const maxEl=document.querySelector('[data-ss-max="'+CSS.escape(S(id))+'"]');
  const minimum=Number(minEl?.value),maximum=Number(maxEl?.value);
  if(!Number.isFinite(minimum)||!Number.isFinite(maximum)||minimum<0||maximum<minimum){message('Mínimo/máximo inválido para '+S(r.p.nome)+'. Confira os valores.');return}
  changes.push({p:r.p,min:minimum,max:maximum,oldMin:r.p.estoqueMinimo,oldMax:r.p.estoqueMaximo});
 }
 if(!changes.length){message('Selecione produtos com vendas no período e sugestão disponível.');return}
 if(!confirm('Aplicar mínimo e máximo no cadastro de '+changes.length+' produto(s)? Essa alteração não modifica o saldo físico.'))return;
 state.busy=true;const time=new Date().toISOString();
 for(const c of changes){c.p.estoqueMinimo=c.min;c.p.estoqueMaximo=c.max;c.p.atualizadoEm=time}
 const db=dbx();db.logs=A(db.logs);
 db.logs.push({id:'stockintel-'+Date.now(),data:time,usuario:actor(),modulo:'Performance de Vendas e Estoque',acao:'MIN_MAX_APLICADO',detalhes:JSON.stringify({periodo:[state.start,state.end],lead:state.lead,review:state.review,safety:state.safety,produtos:changes.map(c=>({id:c.p.id,codigo:c.p.codigo,de:[c.oldMin,c.oldMax],para:[c.min,c.max]}))})});
 try{await saveLocal()}
 catch(e){
  for(const c of changes){c.p.estoqueMinimo=c.oldMin;c.p.estoqueMaximo=c.oldMax}
  db.logs.pop();state.busy=false;message('Não foi possível gravar os produtos: '+e.message);return;
 }
 try{
  if(typeof window.johnCloudCapturarAlteracoes==='function')await window.johnCloudCapturarAlteracoes();
  if(typeof window.johnCloudFlushIncremental!=='function')throw Error('Sincronização incremental indisponível');
  const result=await window.johnCloudFlushIncremental(true);
  if(result?.error||N(result?.pending)>0)throw Error(result?.error||result.pending+' alteração(ões) pendente(s)');
  state.selected.clear();state.busy=false;refresh();message(changes.length+' produto(s) atualizado(s) e sincronizado(s) com o ERP.');
 }catch(e){
  state.selected.clear();state.busy=false;refresh();
  message(changes.length+' produto(s) salvo(s) localmente, mas a nuvem não confirmou a sincronização: '+e.message+'. Confira antes de usar outro dispositivo.');
 }
}
function bind(){
 const up=$('ssUpdate');if(up)up.onclick=()=>{if(params())refresh()};
 const exportButton=$('ssCsv');if(exportButton)exportButton.onclick=exportCSV;
 const pickAll=$('ssSelectAll');if(pickAll)pickAll.onchange=()=>{
  document.querySelectorAll('[data-ss-pick]:not(:disabled)').forEach(input=>{input.checked=pickAll.checked;if(input.checked)state.selected.add(input.dataset.ssPick);else state.selected.delete(input.dataset.ssPick)});
  if($('ssApplySelected')){$('ssApplySelected').disabled=!state.selected.size;$('ssApplySelected').textContent='Aplicar selecionados ('+state.selected.size+')'}
 };
 document.querySelectorAll('[data-ss-pick]').forEach(input=>input.onchange=()=>{
  if(input.checked)state.selected.add(input.dataset.ssPick);else state.selected.delete(input.dataset.ssPick);
  if($('ssApplySelected')){$('ssApplySelected').disabled=!state.selected.size;$('ssApplySelected').textContent='Aplicar selecionados ('+state.selected.size+')'}
 });
 document.querySelectorAll('[data-ss-apply]').forEach(button=>button.onclick=()=>apply([button.dataset.ssApply]));
 const selected=$('ssApplySelected');if(selected)selected.onclick=()=>apply([...state.selected]);
}
window.JohnSalesStockIntel={render,bind,compute,refresh,version:'8.22.81'};
})();