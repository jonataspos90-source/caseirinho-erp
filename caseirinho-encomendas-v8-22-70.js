(function(){
'use strict';
if(window.__CASEIRINHO_ENCOMENDAS_82270__)return;
window.__CASEIRINHO_ENCOMENDAS_82270__=true;
const S=v=>String(v??''),N=v=>Number(v)||0,A=v=>Array.isArray(v)?v:[];
const E=id=>document.getElementById(id),esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
const decisionOptions=[['PENDENTE','Aguardando análise'],['PRONTA_ENTREGA','Tenho pronta entrega'],['PRODUZIR','Produzir sob encomenda'],['INDISPONIVEL','Indisponível / negociar']];
let saving=false,loading=false;
const selected=new Set();
function database(){try{return typeof db!=='undefined'?db:window.db}catch(_){return window.db||{}}}
function products(){return A(database()?.produtos).filter(p=>norm([...(A(p.tipos)),p.tipo,p.tipoProduto,p.classificacao].join(' ')).includes('ACABADO')&&norm(p.status||'ATIVO')!=='INATIVO')}
function canEdit(){try{return typeof permissao!=='function'||permissao('produtos','editar')}catch(_){return false}}
function notice(message){const el=E('ceStatus82270');if(el)el.textContent=message;else if(typeof window.toast==='function')window.toast(message);else alert(message)}
function style(){
 if(E('ceStyle82270'))return;
 const el=document.createElement('style');el.id='ceStyle82270';
 el.textContent='.ce82270{margin:14px 0;border:1px solid #dbe5e9;border-radius:14px;background:#fff;padding:16px;color:#152238}.ce82270 input,.ce82270 select,.ce82270 textarea{width:100%;box-sizing:border-box;padding:9px;border:1px solid #cdd8e2;border-radius:8px;background:#fff;color:#152238}.ce82270 button{border:0;background:#7b1438;color:#fff;border-radius:8px;padding:10px 13px;font-weight:700;cursor:pointer}.ce82270 button:disabled{opacity:.5;cursor:wait}.ce82270 button.secondary{background:#eef2f6;color:#122236}.ce82270 .fields{display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin:12px 0}.ce82270 .tbl{overflow:auto;max-height:54vh}.ce82270 table{border-collapse:collapse;min-width:720px;width:100%}.ce82270 td,.ce82270 th{padding:9px;border-bottom:1px solid #edf0f4;text-align:left;font-size:13px}.ce82270 .bar{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin:12px 0}.ce82270 .order{background:#fafbfc;border:1px solid #e0e5eb;border-radius:12px;padding:12px;margin:10px 0}.ce82270 .order-item{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:8px;align-items:end;margin:10px 0}.ce82270 .hint{color:#596577;font-size:12px;margin-top:5px}@media(max-width:650px){.ce82270 .fields,.ce82270 .order-item{grid-template-columns:1fr}.ce82270{padding:10px}}';
 el.textContent+=' .ce82270 .order-filters{grid-template-columns:2fr 1fr}@media(max-width:650px){.ce82270 .order-filters{grid-template-columns:1fr}}';
 document.head.appendChild(el);
}
function ensurePage(){
 let p=E('ceAvailabilityPage82270');if(p)return p;
 p=document.createElement('section');p.className='page hidden';p.id='ceAvailabilityPage82270';
 p.innerHTML='<div class="ce82270"><div class="bar" style="justify-content:space-between"><h2>📦 Disponibilidade e Encomendas · Produtos Acabados</h2><button class="secondary" id="ceBack82270">Voltar</button></div><p>Defina pronta entrega, sob encomenda ou ambos. É possível selecionar vários produtos sem mexer nos preços.</p><div class="fields"><label>Pesquisar produto ou código<input id="ceSearch82270" placeholder="Nome, código ou categoria"></label><label>Filtrar modalidade<select id="ceFilter82270"><option value="">Todas</option><option value="PRONTA_ENTREGA">Pronta entrega</option><option value="SOB_ENCOMENDA">Sob encomenda</option><option value="AMBOS">Ambos</option></select></label><label>Modalidade em lote<select id="ceBulk82270"><option value="">Escolher</option><option value="PRONTA_ENTREGA">Pronta entrega</option><option value="SOB_ENCOMENDA">Sob encomenda</option><option value="AMBOS">Ambos</option></select></label></div><div class="bar"><button id="ceSelectVisible82270" class="secondary">Selecionar filtrados</button><button id="ceClear82270" class="secondary">Limpar seleção</button><button id="ceApply82270">Aplicar modalidade à seleção</button><span id="ceCount82270">0 selecionados</span></div><div class="tbl"><table><thead><tr><th>Sel.</th><th>Produto acabado</th><th>Modalidade</th><th>Antecedência (dias)</th></tr></thead><tbody id="ceRows82270"></tbody></table></div><div class="bar"><button id="ceSave82270">Salvar e publicar no aplicativo</button><span id="ceStatus82270" role="status"></span></div><p class="hint">O estoque é consultado separadamente: marcar pronta entrega não cria estoque fictício. A loja confirma a disponibilidade real no pedido.</p></div>';
 (document.querySelector('main.main')||document.querySelector('main')||document.body).appendChild(p);
 E('ceBack82270').onclick=()=>{p.classList.add('hidden');E('manutencao')?.classList.remove('hidden')};
 E('ceSearch82270').oninput=render;
 E('ceFilter82270').onchange=render;
 E('ceSelectVisible82270').onclick=()=>{visible().forEach(x=>selected.add(S(x.id)));render()};
 E('ceClear82270').onclick=()=>{selected.clear();render()};
 E('ceApply82270').onclick=()=>{
   const mode=E('ceBulk82270').value;if(!mode||!selected.size)return notice('Selecione produtos e a modalidade.');
   for(const id of selected){const row=E('ceRows82270')?.querySelector('[data-id="'+CSS.escape(id)+'"]');if(row)row.querySelector('select.ceMode82270').value=mode;else drafts.set(id,{...(drafts.get(id)||{}),mode})}
   E('ceRows82270').querySelectorAll('tr[data-id]').forEach(row=>{if(selected.has(row.dataset.id))drafts.set(row.dataset.id,{...(drafts.get(row.dataset.id)||{}),mode})});
   render();
 };
 E('ceRows82270').addEventListener('change',e=>{
   const row=e.target.closest('tr[data-id]');if(!row)return;const id=row.dataset.id;
   if(e.target.classList.contains('ceMark82270')){e.target.checked?selected.add(id):selected.delete(id)}
   else {selected.add(id);drafts.set(id,{mode:row.querySelector('.ceMode82270').value,days:Math.max(0,Math.floor(N(row.querySelector('.ceDays82270').value)))})}
   E('ceCount82270').textContent=selected.size+' selecionados';
 });
 E('ceSave82270').onclick=save;
 return p;
}
const drafts=new Map();
function visible(){
 const q=norm(E('ceSearch82270')?.value),mode=S(E('ceFilter82270')?.value);
 return products().filter(p=>(!q||norm([p.nome,p.codigo,p.ecommerce?.nomeComercial,p.ecommerce?.categoria,p.categoria].join(' ')).includes(q))&&(!mode||S(drafts.get(S(p.id))?.mode||p.ecommerce?.disponibilidade||'AMBOS')===mode)).sort((a,b)=>S(a.nome).localeCompare(S(b.nome),'pt-BR'));
}
function render(){
 if(!E('ceRows82270'))return;
 E('ceRows82270').innerHTML=visible().map(p=>{
   const d=drafts.get(S(p.id))||{},mode=d.mode||p.ecommerce?.disponibilidade||'AMBOS',days=d.days??p.ecommerce?.antecedenciaDias??0;
   return '<tr data-id="'+esc(p.id)+'"><td><input type="checkbox" class="ceMark82270" '+(selected.has(S(p.id))?'checked':'')+'></td><td><b>'+esc(p.nome)+'</b><br><small>'+esc(p.codigo||'')+'</small></td><td><select class="ceMode82270">'+[['PRONTA_ENTREGA','Pronta entrega'],['SOB_ENCOMENDA','Sob encomenda'],['AMBOS','Ambos']].map(x=>'<option value="'+x[0]+'" '+(x[0]===mode?'selected':'')+'>'+x[1]+'</option>').join('')+'</select></td><td><input class="ceDays82270" type="number" min="0" max="365" step="1" value="'+esc(days)+'"></td></tr>';
 }).join('')||'<tr><td colspan="4">Nenhum produto acabado encontrado.</td></tr>';
 E('ceCount82270').textContent=selected.size+' selecionados';
}
function openAvailability(){
 if(!canEdit())return notice('Seu usuário não tem permissão para editar produtos.');
 style();let p=ensurePage();document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));p.classList.remove('hidden');render();
 window.scrollTo({top:0,behavior:'smooth'});
}
async function save(){
 if(saving||!canEdit()||!selected.size)return notice('Selecione os produtos a atualizar.');
 const d=database(),changes=[];
 for(const id of selected){const p=products().find(x=>S(x.id)===id);if(!p)continue;const draft=drafts.get(id)||{};
   const row=[...E('ceRows82270').querySelectorAll('tr[data-id]')].find(x=>x.dataset.id===id);
   const mode=draft.mode||row?.querySelector('.ceMode82270')?.value||p.ecommerce?.disponibilidade||'AMBOS';
   const days=Math.min(365,Math.max(0,Math.floor(Number(draft.days??row?.querySelector('.ceDays82270')?.value??p.ecommerce?.antecedenciaDias??0)||0)));
   if(!['PRONTA_ENTREGA','SOB_ENCOMENDA','AMBOS'].includes(mode))return notice('Modalidade inválida.');
   changes.push({p,mode,days});
 }
 if(!changes.length)return;
 if(!confirm('Atualizar e publicar a disponibilidade de '+changes.length+' produto(s) acabado(s)?'))return;
 const backup=changes.map(({p})=>({p,ecommerce:p.ecommerce,atualizadoEm:p.atualizadoEm}));
 saving=true;E('ceSave82270').disabled=true;
 try{
   changes.forEach(({p,mode,days})=>{
     p.ecommerce={...(p.ecommerce||{}),disponibilidade:mode,antecedenciaDias:days};
     p.atualizadoEm=new Date().toISOString();
   });
   if(typeof window.save==='function')window.save();
   else if(typeof DB_KEY!=='undefined')localStorage.setItem(DB_KEY,JSON.stringify(d));
   else throw Error('Persistência do ERP indisponível.');
   notice('Dados salvos. Sincronizando e publicando catálogo...');
   const fn=window.JohnCaseirinhoCatalogSync821?.publishDirect||window.JohnCaseirinhoCatalogSync821?.publish;
   if(typeof fn!=='function')throw Error('Publicador central do catálogo indisponível.');
   await fn(true);
   if(typeof window.johnCloudCapturarAlteracoes==='function')window.johnCloudCapturarAlteracoes();
   if(typeof window.johnCloudFlushIncremental==='function')await window.johnCloudFlushIncremental(true);
   changes.forEach(x=>{selected.delete(S(x.p.id));drafts.delete(S(x.p.id))});
   render();notice('✅ Disponibilidade publicada: '+changes.length+' produto(s).');
 }catch(err){
   if(!changes.some(x=>x.p.ecommerce?.disponibilidade===x.mode))backup.forEach(x=>{x.p.ecommerce=x.ecommerce;x.p.atualizadoEm=x.atualizadoEm});
   notice('Alterações gravadas no ERP, mas falta confirmar publicação/sincronização: '+S(err?.message||err));
   console.error('[Encomendas 82270]',err);
 }finally{saving=false;E('ceSave82270').disabled=false}
}
async function api(path,opt={}){
 if(typeof window.adminFetch==='function')return window.adminFetch(path,opt);
 let cfg={};try{cfg=JSON.parse(localStorage.getItem('john_cloud_config_v1')||'{}')||{}}catch(_){}
 const token=S(cfg.apiKey||cfg.token),base=S(cfg.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,'');
 if(!token)throw new Error('Conexão autenticada à API indisponível. Entre no ERP e configure a nuvem.');
 const response=await fetch(base+path,{...opt,cache:'no-store',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token,...(opt.headers||{})}});
 let data={};try{data=await response.json()}catch(_){}
 if(!response.ok)throw new Error(data.error||('Erro HTTP '+response.status));
 return data;
}
function pendingItems(order){
 const rows=A(order?.itens).filter(i=>!i.adicional&&!i.adicionalPromocional);
 return rows;
}
function ensureOrdersPage(){
 let el=E('ceOrdersPage82270');if(el)return el;
 el=document.createElement('section');el.className='page hidden';el.id='ceOrdersPage82270';
 el.innerHTML='<div class="ce82270"><div class="bar" style="justify-content:space-between"><h2>📦 Encomendas e Disponibilidade</h2><button class="secondary" id="ceOrdersBack82270">Voltar aos pedidos</button></div><p>Controle a análise dos itens, a disponibilidade e o prazo de produção. A confirmação libera a próxima etapa do pagamento no APP quando o frete estiver definido.</p><div class="bar" id="ceOrdersSummary82270" aria-live="polite"></div><div class="fields order-filters"><label>Buscar pedido, cliente ou WhatsApp<input id="ceOrdersSearch82270" type="search" placeholder="Número do pedido, nome ou telefone"></label><label>Situação<select id="ceOrdersFilter82270"><option value="PENDENTE">Aguardando análise · hoje em diante</option><option value="CONFIRMADO">Aprovadas</option><option value="REJEITADO">Não aprovadas</option><option value="AGUARDANDO_CONTATO">Indisponíveis / contato</option><option value="TODOS">Todas</option></select></label></div><div class="bar"><button id="ceOrdersRefresh82270">Atualizar pedidos</button><button class="secondary" id="ceOrdersProducts82270">Modalidades dos produtos</button><span id="ceOrdersStatus82270" role="status"></span></div><div id="ceOrdersRows82270"></div></div>';
 (document.querySelector('main.main')||document.querySelector('main')||document.body).appendChild(el);
 E('ceOrdersBack82270').onclick=()=>{el.classList.add('hidden');const target=document.querySelector('.nav [data-page="ecommercePedidosRecebidos"]');if(target)target.click();else E('ecommercePedidosRecebidos')?.classList.remove('hidden')};
 E('ceOrdersRefresh82270').onclick=loadOrders;
 E('ceOrdersProducts82270').onclick=openAvailability;
 E('ceOrdersSearch82270').oninput=()=>orderRows(cachedOrders);
 E('ceOrdersFilter82270').onchange=()=>orderRows(cachedOrders);
 E('ceOrdersRows82270').addEventListener('click',e=>{const b=e.target.closest('[data-save-order]');if(b)saveOrder(b.dataset.saveOrder,b.dataset.reviewDecision||'PENDENTE')});
 return el;
}
const ordersById=new Map();
let cachedOrders=[];
function managedOrders(list){return A(list).filter(o=>pendingItems(o).length&&!['CANCELADO','ENTREGUE','RETIRADO','CONCLUIDO','FINALIZADO'].includes(norm(o.status)))}
function availabilityStatus(o){const review=norm(o.analisePedido?.status);return norm(o.status)==='REJEITADO'||review==='REJEITADO'?'REJEITADO':review==='APROVADO'?'CONFIRMADO':review==='PENDENTE'||!review&&orderCreatedDate(o)>='2026-10-28'?'PENDENTE':norm(o.encomendaConfirmacao?.status||'PENDENTE')}
function orderStatusLabel(o){return({PENDENTE:'Aguardando análise',CONFIRMADO:'Análise aprovada',AGUARDANDO_CONTATO:'Indisponível / contato',REJEITADO:'Pedido não aprovado'})[availabilityStatus(o)]||'Aguardando análise'}
function saoPauloDate(value=new Date()){
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return'';
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function orderCreatedDate(o){const value=S(o.createdAt||o.criadoEm||o.created_at);if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;return value?saoPauloDate(value.replace(' ','T')):''}
function createdLabel(o){const value=o.createdAt||o.criadoEm||o.created_at;const date=new Date(S(value).replace(' ','T'));return Number.isFinite(date.getTime())?date.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Data não informada'}
function cashbackReview(o){
 const policy=o.cashbackPolicy||{},enabled=policy.enabled===true||o.cashbackAprovacao?.policyEnabled===true,percentage=N(policy.percentage);
 const base=Math.max(0,N(o.subtotal)-N(o.cashback?.used||o.cashbackDiscount)+(policy.excludeShipping===false?N(o.valorFrete):0));
 return{enabled,estimate:Math.round(base*percentage)/100,status:S(o.cashbackAprovacao?.status||'PENDENTE')};
}
function filteredOrders(list,status='PENDENTE',query=''){
 const q=norm(query),digits=S(query).replace(/\D/g,'');
 return managedOrders(list).filter(o=>(status==='TODOS'||availabilityStatus(o)===status)&&(status!=='PENDENTE'||orderCreatedDate(o)>=saoPauloDate())&&(!q||norm([o.codigo,o.id,o.cliente?.nome,o.cliente?.telefone].join(' ')).includes(q)||(/^\+?[\d\s().-]+$/.test(query)&&digits&&S(o.cliente?.telefone).replace(/\D/g,'').includes(digits))));
}
function updateOrderSummary(){
 const el=E('ceOrdersSummary82270');if(!el)return;const all=managedOrders(cachedOrders);
 el.innerHTML=[['PENDENTE','Aguardando análise · hoje em diante'],['CONFIRMADO','Aprovadas'],['REJEITADO','Não aprovadas']].map(([status,label])=>'<span style="padding:9px 13px;border:1px solid #dbe5e9;border-radius:10px;background:#f8fafc"><b>'+filteredOrders(all,status).length+'</b> '+label+'</span>').join('');
}
function orderRows(list){
 const root=E('ceOrdersRows82270');if(!root)return;
 cachedOrders=A(list);updateOrderSummary();
 const orders=filteredOrders(cachedOrders,E('ceOrdersFilter82270')?.value||'PENDENTE',E('ceOrdersSearch82270')?.value||'');
 ordersById.clear();orders.forEach(o=>ordersById.set(S(o.id),o));
 root.innerHTML=orders.map(o=>{
   const previous=A(o.encomendaConfirmacao?.itens),items=pendingItems(o),cash=cashbackReview(o),closed=norm(o.status)==='REJEITADO',disabled=closed?' disabled':'';
   return '<div class="order" data-order="'+esc(o.id)+'"><div class="bar"><b>Pedido '+esc(o.codigo||o.id)+'</b><span>'+esc(o.cliente?.nome||'Cliente')+'</span><small class="ceOrderState">'+esc(orderStatusLabel(o))+'</small></div><p class="hint"><b>Data do pedido:</b> '+esc(createdLabel(o))+(o.dataAtendimento?' · Atendimento solicitado: '+esc(o.dataAtendimento.split('-').reverse().join('/')):'')+'</p>'+
   items.map(i=>{const prior=previous.find(x=>S(x.produtoId)===S(i.produtoId))||{};
     return '<div class="order-item" data-prod="'+esc(i.produtoId)+'"><div><b>'+esc(i.nome||i.produtoId)+'</b><div class="hint">Quantidade: '+esc(i.quantidade)+'</div></div><label>Situação do item<select class="ceDecision"'+disabled+'>'+decisionOptions.map(([v,t])=>'<option value="'+v+'" '+((prior.decisao||'PENDENTE')===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label><label>Previsão, se produzir<input type="date" class="ceDue"'+disabled+' value="'+esc(prior.previsao||'')+'"></label><label style="grid-column:1/-1">Observação para o cliente<input class="ceReason"'+disabled+' maxlength="300" value="'+esc(prior.observacao||'')+'"></label></div>';
   }).join('')+'<div class="fields order-filters"><label>Cashback previsto: '+(cash.enabled?cash.estimate.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Não se aplica')+'<select class="ceCashbackDecision"'+(closed||!cash.enabled?' disabled':'')+'>'+[['PENDENTE','Aguardando aprovação'],['APROVADO','Aprovar cashback'],['REJEITADO','Não aprovar cashback']].map(([v,t])=>'<option value="'+v+'" '+(cash.status===v?'selected':'')+'>'+t+'</option>').join('')+'</select></label><label>Motivo da não aprovação / observação do pedido<input class="ceReviewReason" maxlength="1000"'+disabled+' value="'+esc(o.analisePedido?.motivo||'')+'"></label></div><p class="hint">O cashback aprovado só fica disponível após a conclusão da compra. Alterações são enviadas ao APP.</p><div class="bar">'+[['PENDENTE','Salvar análise'],['APROVADO','Aprovar pedido'],['REJEITADO','Não aprovar pedido']].map(([v,t])=>'<button type="button" data-save-order="'+esc(o.id)+'" data-review-decision="'+v+'"'+disabled+'>'+t+'</button>').join('')+'<span class="ceOrderFeedback" role="status"></span></div></div>';
 }).join('')||'<p>Não há encomendas para os filtros selecionados.</p>';
}
async function loadOrders(){
 if(loading)return;loading=true;const t=E('ceOrdersStatus82270');t.textContent='Consultando a API...';
 try{const result=await api('/api/v1/admin/store/orders?status=TODOS&limit=1000');
   orderRows(A(result.orders));t.textContent='Pedidos atualizados · '+new Date().toLocaleTimeString('pt-BR');
 }catch(e){t.textContent='Não foi possível consultar pedidos: '+S(e.message||e)}
 finally{loading=false}
}
async function saveOrder(id,decision='PENDENTE'){
 const o=ordersById.get(S(id)),panel=[...document.querySelectorAll('#ceOrdersRows82270 [data-order]')].find(e=>e.dataset.order===S(id));
 if(!o||!panel)return;
 const feedback=panel.querySelector('.ceOrderFeedback'),buttons=[...panel.querySelectorAll('[data-save-order]')];
 const itens=[...panel.querySelectorAll('.order-item[data-prod]')].map(row=>({
   produtoId:row.dataset.prod,decisao:row.querySelector('.ceDecision').value,
   previsao:row.querySelector('.ceDue').value,observacao:row.querySelector('.ceReason').value
 }));
 if(itens.some(i=>i.decisao==='PRODUZIR'&&!i.previsao))return feedback.textContent='Informe a data prevista para os itens que serão produzidos.';
 if(!itens.length)return;
 const cashbackDecision=panel.querySelector('.ceCashbackDecision')?.value||'PENDENTE',reason=panel.querySelector('.ceReviewReason')?.value.trim()||'';
 if(decision==='REJEITADO'&&!reason)return feedback.textContent='Informe o motivo para não aprovar o pedido.';
 if(decision==='APROVADO'&&itens.some(i=>['PENDENTE','INDISPONIVEL'].includes(i.decisao)))return feedback.textContent='Resolva a situação de todos os itens antes de aprovar.';
 if(decision==='APROVADO'&&cashbackReview(o).enabled&&cashbackDecision==='PENDENTE')return feedback.textContent='Aprove ou recuse o cashback antes de concluir a análise.';
 if(!confirm((decision==='REJEITADO'?'Não aprovar':decision==='APROVADO'?'Aprovar':'Salvar análise do')+' pedido '+S(o.codigo||id)+'?'))return;
 buttons.forEach(b=>b.disabled=true);feedback.textContent='Salvando no servidor...';
 try{
   const res=await api('/api/v1/admin/store/orders/'+encodeURIComponent(id)+'/review',{method:'POST',body:JSON.stringify({decision,cashbackDecision,reason,itens})});
   Object.assign(o,res.order||{});
   const state=panel.querySelector('.ceOrderState');if(state)state.textContent=orderStatusLabel(o);updateOrderSummary();
   feedback.textContent='✅ Análise salva e enviada ao APP. '+(decision==='REJEITADO'?'Pedido não aprovado.':decision==='APROVADO'?'Pedido aprovado para a próxima etapa de atendimento/pagamento.':'Os itens continuam em análise.');
   try{await window.johnEcommerceOrdersController?.refresh?.(true)}catch(_){}
   const phone=S(o.cliente?.telefone).replace(/\D/g,'').replace(/^0+/,'');
   if(phone){
     const normalized=phone.length<=11?'55'+phone:phone;
     const message=S(res.order?.mensagemCliente||'Olá! O Caseirinho tem uma atualização sobre o seu pedido.');
     let link=panel.querySelector('.ceWhatsapp');
     if(!link){link=document.createElement('a');link.className='ceWhatsapp';link.target='_blank';link.rel='noopener noreferrer';link.style.cssText='display:inline-block;margin:9px;color:#176c45;font-weight:700';panel.appendChild(link)}
     link.href='https://wa.me/'+normalized+'?text='+encodeURIComponent(message);
     link.textContent='🟢 Abrir WhatsApp com mensagem pronta';
   }
 }catch(e){feedback.textContent='Falha ao salvar: '+S(e.message||e)}
 finally{buttons.forEach(b=>b.disabled=norm(o.status)==='REJEITADO')}
}
async function openOrders(orderId=''){
 style();ensureOrdersNavigation();const p=ensureOrdersPage();document.querySelectorAll('.page').forEach(e=>e.classList.add('hidden'));p.classList.remove('hidden');
 document.querySelectorAll('.nav button[data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page==='ceOrdersPage82270'));
 document.querySelector('.nav .john-module-group[data-module="ecommerce"]')?.classList.add('open');
 if(orderId){E('ceOrdersFilter82270').value='TODOS';E('ceOrdersSearch82270').value=''}
 await loadOrders();
 if(orderId){const panel=[...document.querySelectorAll('#ceOrdersRows82270 [data-order]')].find(e=>e.dataset.order===S(orderId));if(panel){panel.style.outline='3px solid #7b1438';panel.scrollIntoView({behavior:'smooth',block:'center'});return}}
 window.scrollTo({top:0,behavior:'smooth'});
}
function ensureOrdersNavigation(){
 const nav=document.querySelector('.nav .john-module-group[data-module="ecommerce"] .john-module-items');if(!nav)return;
 let b=E('ceOrdersNav82270'),changed=false;
 if(!b){b=document.createElement('button');b.id='ceOrdersNav82270';b.type='button';b.className='john-special-nav';b.dataset.page='ceOrdersPage82270';b.dataset.permissionPage='pedidos';changed=true}
 if(b.textContent!=='📦 Encomendas e Disponibilidade'){b.textContent='📦 Encomendas e Disponibilidade';changed=true}
 const received=nav.querySelector('[data-page="ecommercePedidosRecebidos"]');
 if(b.parentElement!==nav||(received&&received.nextElementSibling!==b)){if(received)received.insertAdjacentElement('afterend',b);else nav.appendChild(b);changed=true}
 b.onclick=e=>{e.preventDefault();openOrders()};
 if(changed)try{window.johnNext?.renderHub?.()}catch(_){}
}
let navigationObserver=null;
function watchNavigation(){
 const nav=document.querySelector('.nav');if(!nav||navigationObserver)return;
 navigationObserver=new MutationObserver(ensureOrdersNavigation);navigationObserver.observe(nav,{childList:true});
}
function install(){
 style();
 const menu=E('manutencao')?.querySelector('.report-choice-grid');
 if(menu&&!E('ceAvailOpen82270')){
   const b=document.createElement('button');b.id='ceAvailOpen82270';b.type='button';b.className='report-choice';
   b.innerHTML='<span class="icon">📦</span><b>Disponibilidade e Encomendas</b><small>Produtos acabados · pronta entrega / sob encomenda / ambos</small>';
   menu.appendChild(b);b.onclick=openAvailability;
 }
 ensureOrdersNavigation();watchNavigation();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
[300,1200,3200].forEach(n=>setTimeout(install,n));
window.addEventListener('john:session-ready',()=>setTimeout(install,120));
window.addEventListener('john:cloud-applied',()=>setTimeout(install,150));
window.CaseirinhoEncomendas82270={openAvailability,openOrders,loadOrders};
})();
