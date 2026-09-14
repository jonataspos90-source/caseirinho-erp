(function(){
'use strict';
if(window.__JOHN_ECOMMERCE_CX_8130__)return;
window.__JOHN_ECOMMERCE_CX_8130__=true;

const VERSION='8.14.0';
const INBOX_KEY='john_ecommerce_cloud_inbox_v1';
const FILTER_KEY='john_ecommerce_cx_filters_v8130';
const S=v=>String(v??'');
const N=v=>Number(v)||0;
const A=v=>Array.isArray(v)?v:[];
const E=id=>document.getElementById(id);
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/[\s-]+/g,'_');
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>N(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

let renderBusy=false;
let renderAgain=false;

function read(k,f={}){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(_){return f}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}
function inbox(){const a=read(INBOX_KEY,[]);return A(a)}
function cloud(){return read('john_cloud_config_v1',{})}
function apiBase(){return S(cloud().apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,'')}
function apiKey(){return S(cloud().apiKey||'')}
async function admin(path,opt={}){
  const key=apiKey();if(!key)throw new Error('Sessão do ERP sem credencial de nuvem. Entre novamente.');
  const r=await fetch(apiBase()+path+(path.includes('?')?'&':'?')+'_v813='+Date.now(),{
    cache:'no-store',...opt,headers:{'Content-Type':'application/json','Cache-Control':'no-cache','Authorization':'Bearer '+key,...(opt.headers||{})}
  });
  let d={};try{d=await r.json()}catch(_){}
  if(!r.ok)throw new Error(d.error||('Erro HTTP '+r.status));
  return d;
}
function database(){try{return (typeof db!=='undefined'&&db)||window.db||{}}catch(_){return window.db||{}}}
function linked(id){return A(database()?.pedidos).find(p=>S(p.ecommercePedidoId)===S(id))||null}
function dateOf(o){return S(o.createdAt||o.criadoEm||o.created_at||o.savedAt||'').slice(0,10)}
function delivery(o){return norm(o.modalidade)==='ENTREGA'}
function exactTime(v){return /^([01]\d|2[0-3]):[0-5]\d$/.test(S(v).trim())}
function orderTime(o){const h=S(o.horarioEntrega||o.horario||'').trim();return exactTime(h)?h:'A combinar'}

function state(o){
  const st=norm(o.status||o.payload?.status||'');
  const integ=norm(o.statusIntegracao||o.integration_status||'');
  const freight=norm(o.freteStatus||'');
  const decision=norm(o.freteDecisaoCliente||'');

  if(st==='REJEITADO'||integ==='REJEITADO'||o.rejeitado)return'REJEITADO';
  if(st==='CANCELADO'||integ==='CANCELADO'||decision==='REJEITADO'||st==='FRETE_RECUSADO_CLIENTE')return'CANCELADO';
  if(st==='AGUARDANDO_ACEITE_ERP'||decision==='ACEITO')return'AGUARDANDO_ACEITE_ERP';
  if(st==='AGUARDANDO_CLIENTE_FRETE'||(freight==='COTADO'&&decision==='PENDENTE'))return'AGUARDANDO_CLIENTE_FRETE';
  if(freight==='COTACAO_PENDENTE'||st==='AGUARDANDO_COTACAO_FRETE')return'COTACAO_PENDENTE';
  if(st==='ACEITO'||['IMPORTANDO','IMPORTADO'].includes(integ)||o.erpPedidoId||o.erpNumero)return'ACEITO';
  return'PENDENTE';
}
function stateLabel(s){return({
  PENDENTE:'Aguardando decisão',COTACAO_PENDENTE:'Frete a cotar',AGUARDANDO_CLIENTE_FRETE:'Aguardando cliente',
  AGUARDANDO_ACEITE_ERP:'Cliente aceitou novo frete',FRETE_RECUSADO_CLIENTE:'Cancelado',ACEITO:'Aceito',REJEITADO:'Rejeitado',CANCELADO:'Cancelado'
})[s]||s}
function actionType(o,s=state(o)){
  if(s==='COTACAO_PENDENTE')return'COTAR';
  if(s==='AGUARDANDO_CLIENTE_FRETE')return'AGUARDANDO_CLIENTE';
  if(s==='PENDENTE'||s==='AGUARDANDO_ACEITE_ERP')return'DECIDIR';
  return'SEM_ACAO';
}
function filters(){return read(FILTER_KEY,{from:'',to:'',customer:'',modality:'TODOS',status:'TODOS',action:'TODOS'})}
function saveFilters(){
  const x={
    from:S(E('johnCxFrom')?.value),
    to:S(E('johnCxTo')?.value),
    customer:S(E('johnCxCustomer')?.value),
    modality:S(E('johnCxModality')?.value||'TODOS'),
    status:S(E('johnCxStatus')?.value||'TODOS'),
    action:S(E('johnCxAction')?.value||'TODOS')
  };
  write(FILTER_KEY,x);render();
}
function matches(o,f){
  const d=dateOf(o),s=state(o),name=norm(o.cliente?.nome||''),mode=norm(o.modalidade||''),act=actionType(o,s);
  if(f.from&&d&&d<f.from)return false;
  if(f.to&&d&&d>f.to)return false;
  if(f.customer&&name&&!name.includes(norm(f.customer)))return false;
  if(f.customer&&!name)return false;
  if(f.modality&&f.modality!=='TODOS'&&mode!==norm(f.modality))return false;
  if(f.status&&f.status!=='TODOS'&&s!==f.status)return false;
  if(f.action&&f.action!=='TODOS'&&act!==f.action)return false;
  return true;
}
function ensureToolbar(){
  const page=E('ecommercePedidosRecebidos');if(!page)return;
  let box=E('johnCxOrdersFilters');
  if(!box){
    const panel=page.querySelector('.panel');
    if(!panel)return;
    box=document.createElement('div');box.id='johnCxOrdersFilters';box.className='john-cx-filters';
    box.innerHTML=`
      <div><label>Data de</label><input id="johnCxFrom" type="date"></div>
      <div><label>Data até</label><input id="johnCxTo" type="date"></div>
      <div><label>Cliente</label><input id="johnCxCustomer" type="search" placeholder="Nome do cliente"></div>
      <div><label>Modalidade</label><select id="johnCxModality"><option value="TODOS">Todas</option><option value="ENTREGA">Entrega</option><option value="RETIRADA">Retirada</option></select></div>
      <div><label>Status</label><select id="johnCxStatus"><option value="TODOS">Todos</option><option value="PENDENTE">Aguardando decisão</option><option value="COTACAO_PENDENTE">Frete a cotar</option><option value="AGUARDANDO_CLIENTE_FRETE">Aguardando cliente</option><option value="AGUARDANDO_ACEITE_ERP">Cliente aceitou novo frete</option><option value="ACEITO">Aceito</option><option value="REJEITADO">Rejeitado</option><option value="CANCELADO">Cancelado</option></select></div>
      <div><label>Ações</label><select id="johnCxAction"><option value="TODOS">Todas</option><option value="COTAR">Cotação</option><option value="AGUARDANDO_CLIENTE">Aguardando cliente</option><option value="DECIDIR">Aceitar / Rejeitar</option><option value="SEM_ACAO">Sem ação</option></select></div>
      <button class="btn secondary" id="johnCxClearFilters" type="button">Limpar filtros</button>`;
    const head=panel.querySelector('.panel-head');head?head.insertAdjacentElement('afterend',box):panel.prepend(box);
    const f=filters();
    E('johnCxFrom').value=f.from||'';
    E('johnCxTo').value=f.to||'';
    E('johnCxCustomer').value=f.customer||'';
    E('johnCxModality').value=f.modality||'TODOS';
    E('johnCxStatus').value=f.status||'TODOS';
    E('johnCxAction').value=f.action||'TODOS';
    E('johnCxFrom').onchange=saveFilters;
    E('johnCxTo').onchange=saveFilters;
    E('johnCxCustomer').oninput=saveFilters;
    E('johnCxModality').onchange=saveFilters;
    E('johnCxStatus').onchange=saveFilters;
    E('johnCxAction').onchange=saveFilters;
    E('johnCxClearFilters').onclick=()=>{
      E('johnCxFrom').value='';E('johnCxTo').value='';E('johnCxCustomer').value='';
      E('johnCxModality').value='TODOS';E('johnCxStatus').value='TODOS';E('johnCxAction').value='TODOS';
      saveFilters();
    };
  }
  const thead=page.querySelector('table thead tr');
  if(thead&&thead.dataset.cx813!=='1'){
    thead.innerHTML='<th>Data</th><th>Pedido</th><th>Cliente</th><th>Modalidade</th><th>Frete</th><th>Total</th><th>Status</th><th>Horário entrega</th><th>Ações</th>';
    thead.dataset.cx813='1';
  }
}
function quoteFn(){return window.johnV870Quote||window.johnV8Quote}
function acceptFn(){return window.johnV8AcceptOrder}
async function doQuote(id){
  const fn=quoteFn();if(typeof fn!=='function')return window.toast?.('Cotação indisponível.');
  await fn(id);
  setTimeout(()=>{
    const m=E('johnV870Quote');
    if(m){const h=m.querySelector('h2');if(h)h.textContent='🛵 Enviar cotação de entrega';const b=E('fq87Approve');if(b)b.textContent='Enviar valor ao cliente';}
  },30);
}
async function doAccept(id){
  const fn=acceptFn();if(typeof fn!=='function')return window.toast?.('Aceite indisponível.');
  try{
    await fn(id);
  }catch(e){
    window.toast?.(e.message||'Não foi possível aceitar o pedido.');
  }finally{
    setTimeout(()=>refreshAndRender(true),250);
  }
}
async function doReject(id){
  const o=inbox().find(x=>S(x.id)===S(id));
  if(!o)return window.toast?.('Pedido não localizado.');
  const current=state(o);
  if(!['PENDENTE','AGUARDANDO_ACEITE_ERP'].includes(current)){
    return window.toast?.('Este pedido não está disponível para rejeição.');
  }

  const reason=prompt('Motivo interno da rejeição:','Pedido não aceito pelo estabelecimento.');
  if(reason===null)return;
  const mensagemCliente=prompt(
    'Mensagem que o cliente verá no App:',
    'Seu pedido não pôde ser aceito. Se desejar, faça um novo pedido.'
  );
  if(mensagemCliente===null)return;
  if(!confirm('Confirmar a rejeição deste pedido?'))return;

  try{
    await admin('/api/v1/admin/store/orders/'+encodeURIComponent(id)+'/reject',{
      method:'POST',
      body:JSON.stringify({
        reason:S(reason).trim()||'Pedido rejeitado pelo ERP',
        mensagemCliente:S(mensagemCliente).trim()||'Seu pedido não pôde ser aceito.'
      })
    });
    window.toast?.('Pedido rejeitado. O cliente receberá a atualização no App.');
  }catch(e){
    window.toast?.(e.message||'Não foi possível rejeitar o pedido.');
  }finally{
    setTimeout(()=>refreshAndRender(true),180);
  }
}
function itemName(i){
  return S(i?.nome||i?.produtoNome||i?.descricao||i?.produto?.nome||i?.produtoId||'Produto');
}
function printOrderPdf(id){
  const o=inbox().find(x=>S(x.id)===S(id));
  if(!o)return window.toast?.('Pedido não localizado para gerar o PDF.');

  const its=A(o.itens);
  const en=o.entrega||{};
  const addr=delivery(o)
    ?[en.logradouro,en.numero,en.complemento,en.bairro,en.cidade,en.uf,en.cep].filter(Boolean).map(esc).join(', ')
    :'Retirada na loja';

  const rows=its.map(i=>{
    const qtd=N(i.quantidade)||1;
    const unit=N(i.precoUnitario??i.preco??i.valorUnitario);
    const total=N(i.total)||(qtd*unit);
    return `<tr><td>${esc(itemName(i))}</td><td>${esc(qtd)}</td><td>${money(unit)}</td><td>${money(total)}</td></tr>`;
  }).join('')||'<tr><td colspan="4">Itens disponíveis no pedido após sincronização completa.</td></tr>';

  const status=state(o);
  const created=S(o.createdAt||o.criadoEm||o.savedAt||'').slice(0,19).replace('T',' ');
  const w=window.open('','_blank');
  if(!w)return window.toast?.('O navegador bloqueou a janela do PDF.');

  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedido ${esc(o.codigo||o.id)}</title>
  <style>body{font-family:Arial,sans-serif;padding:28px;color:#1f2937}h1{color:#5b21b6;margin-bottom:6px}.meta{color:#64748b;margin-bottom:18px}.box{border:1px solid #d1d5db;border-radius:10px;padding:12px;margin:12px 0}table{width:100%;border-collapse:collapse;margin:16px 0}th,td{border:1px solid #d1d5db;padding:8px;text-align:left}th{background:#ede9fe}.total{font-size:18px;font-weight:800}.status{display:inline-block;padding:5px 9px;border-radius:99px;background:#e2e8f0;font-weight:800}@media print{button{display:none}}</style></head><body>
  <h1>Pedido E-commerce ${esc(o.codigo||o.id)}</h1>
  <div class="meta">Emitido em ${esc(new Date().toLocaleString('pt-BR'))}</div>
  <div class="box"><b>Cliente:</b> ${esc(o.cliente?.nome||'-')}<br><b>Telefone:</b> ${esc(o.cliente?.telefone||'-')}<br><b>Modalidade:</b> ${esc(o.modalidade||'-')}<br><b>Endereço/retirada:</b> ${addr}<br><b>Data:</b> ${esc(o.dataAtendimento||created||'-')}<br><b>Horário:</b> ${esc(orderTime(o)||'-')}<br><b>Status:</b> <span class="status">${esc(stateLabel(status))}</span></div>
  <table><thead><tr><th>Produto</th><th>Qtd.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="total">Subtotal: ${money(o.subtotal)}<br>Frete: ${delivery(o)?money(o.valorFrete):money(0)}<br>Total: ${money(o.total)}</p>
  <p><b>Pagamento:</b> ${esc(o.formaPagamento||'-')}</p>
  <p><b>Observações:</b> ${esc(o.observacao||o.obs||'-')}</p>
  <button onclick="window.print()">Imprimir / Salvar em PDF</button>
  <script>setTimeout(()=>window.print(),350)<\/script></body></html>`);
  w.document.close();
}
function actionHtml(o,s){
  const id=esc(o.id);
  const pdf=`<button class="btn print" type="button" data-cx-pdf="${id}">PDF</button>`;
  if(s==='COTACAO_PENDENTE')return `<button class="btn primary" type="button" data-cx-quote="${id}">Cotação</button>${pdf}`;
  if(s==='AGUARDANDO_CLIENTE_FRETE')return `<button class="btn secondary" type="button" data-cx-quote="${id}">Alterar cotação</button><button class="btn secondary" type="button" disabled>Aguardando cliente</button>${pdf}`;
  if(s==='AGUARDANDO_ACEITE_ERP')return `<button class="btn primary" type="button" data-cx-accept="${id}">Aceitar</button>${pdf}<button class="btn danger" type="button" data-cx-reject="${id}">Rejeitar</button>`;
  if(s==='PENDENTE')return `<button class="btn primary" type="button" data-cx-accept="${id}">Aceitar</button>${pdf}<button class="btn danger" type="button" data-cx-reject="${id}">Rejeitar</button>`;
  if(['ACEITO','REJEITADO','CANCELADO'].includes(s))return '<span class="john-cx-no-action">—</span>';
  return '<span class="john-cx-no-action">—</span>';
}
function freightHtml(o,s){
  if(s==='COTACAO_PENDENTE')return '<span class="john-cx-warn">Pendente cotação</span>';
  if(s==='AGUARDANDO_CLIENTE_FRETE')return `${money(o.valorFrete)}<br><small>Aguardando cliente</small>`;
  if(s==='AGUARDANDO_ACEITE_ERP')return `${money(o.valorFrete)}<br><small class="john-cx-ok">Cliente aceitou novo frete</small>`;
  if(s==='FRETE_RECUSADO_CLIENTE'||s==='CANCELADO')return `${money(o.valorFrete)}<br><small class="john-cx-warn">Pedido cancelado</small>`;
  return delivery(o)?money(o.valorFrete):'-';
}
function timeHtml(o,s){
  if(!delivery(o))return '<span class="john-cx-muted">Retirada</span>';
  const h=orderTime(o);
  if(s!=='ACEITO')return `<span>${esc(h)}</span>`;
  return `<div class="john-cx-time"><input type="time" value="${exactTime(h)?esc(h):''}" data-cx-time="${esc(o.id)}" aria-label="Horário de entrega"><small>${exactTime(h)?'Confirmado':'A combinar'}</small></div>`;
}
function updateKpis(all){
  let a=0,f=0,ok=0,no=0;
  for(const o of all){const s=state(o);if(['COTACAO_PENDENTE','AGUARDANDO_CLIENTE_FRETE'].includes(s))f++;else if(s==='ACEITO')ok++;else if(['REJEITADO','CANCELADO'].includes(s))no++;else a++}
  if(E('v8OrdNew'))E('v8OrdNew').textContent=a;if(E('v8OrdFreight'))E('v8OrdFreight').textContent=f;if(E('v8OrdOk'))E('v8OrdOk').textContent=ok;if(E('v8OrdNo'))E('v8OrdNo').textContent=no;
}
function render(){
  if(renderBusy){renderAgain=true;return}renderBusy=true;
  try{
    const tb=E('v8OrdersBody');if(!tb)return;
    ensureToolbar();
    const all=[...inbox()].sort((a,b)=>S(b.createdAt||b.criadoEm).localeCompare(S(a.createdAt||a.criadoEm)));
    updateKpis(all);const f=filters(),arr=all.filter(o=>matches(o,f));
    tb.innerHTML=arr.map(o=>{const s=state(o),created=S(o.createdAt||o.criadoEm||'').slice(0,16).replace('T',' '),erpNumber=o.erpNumero||o.erp_order_number||'';return `<tr data-cx-state="${s}"><td>${esc(created)}</td><td><b>${esc(o.codigo||o.code||o.id)}</b>${erpNumber?`<br><small>ERP #${esc(erpNumber)}</small>`:''}</td><td>${esc(o.cliente?.nome||'-')}<br><small>${esc(o.cliente?.telefone||'')}</small></td><td>${esc(o.modalidade||'-')}<br><small>${esc(o.entrega?.cidade||'')}</small></td><td>${freightHtml(o,s)}</td><td>${money(o.total)}</td><td><span class="john-cx-status ${s}">${esc(stateLabel(s))}</span></td><td>${timeHtml(o,s)}</td><td><div class="john-ecom-v8-actions">${actionHtml(o,s)}</div></td></tr>`}).join('')||'<tr><td colspan="9" class="empty">Nenhum pedido encontrado para os filtros selecionados.</td></tr>';
    tb.querySelectorAll('[data-cx-quote]').forEach(b=>b.onclick=()=>doQuote(b.dataset.cxQuote));
    tb.querySelectorAll('[data-cx-accept]').forEach(b=>b.onclick=()=>doAccept(b.dataset.cxAccept));
    tb.querySelectorAll('[data-cx-reject]').forEach(b=>b.onclick=()=>doReject(b.dataset.cxReject));
    tb.querySelectorAll('[data-cx-pdf]').forEach(b=>b.onclick=()=>printOrderPdf(b.dataset.cxPdf));
    tb.querySelectorAll('[data-cx-time]').forEach(i=>i.onchange=()=>saveDeliveryTime(i.dataset.cxTime,i.value,i));
  }finally{renderBusy=false;if(renderAgain){renderAgain=false;setTimeout(render,0)}}
}
async function saveDeliveryTime(id,h,input){
  if(!exactTime(h))return;
  input.disabled=true;
  try{
    const r=await admin('/api/v1/admin/store/orders/'+encodeURIComponent(id)+'/customer-delivery-time',{method:'PATCH',body:JSON.stringify({horario:h})});
    const a=inbox(),idx=a.findIndex(x=>S(x.id)===S(id));if(idx>=0){a[idx]={...a[idx],horario:r.horario,horarioEntrega:r.horario,horarioStatus:'CONFIRMADO',horarioConfirmadoEm:r.horarioConfirmadoEm,mensagemCliente:r.mensagemCliente};write(INBOX_KEY,a)}
    const p=linked(id);if(p){p.horarioEnvio=h;p.horario=h;p.atualizadoEm=new Date().toISOString();try{if(typeof save==='function')save()}catch(_){}}
    window.toast?.('Horário enviado ao app do cliente.');render();
  }catch(e){window.toast?.('Não foi possível salvar o horário: '+e.message)}finally{input.disabled=false}
}
let pullBusy=null;
let lastPullAt=0;
async function pullServerOrders(force=false){
  if(pullBusy)return pullBusy;
  if(!force&&Date.now()-lastPullAt<1500)return inbox();

  pullBusy=(async()=>{
    try{
      const r=await admin('/api/v1/admin/store/orders?status=TODOS&limit=1000');
      if(Array.isArray(r?.orders)){
        const rows=r.orders.slice(-1000);
        write(INBOX_KEY,rows);
        lastPullAt=Date.now();
        return rows;
      }
    }catch(e){
      console.warn('[John CX] lista autoritativa:',e);
      window.toast?.('Não foi possível atualizar pedidos agora.');
    }finally{
      pullBusy=null;
    }
    return inbox();
  })();

  return pullBusy;
}
async function refreshAndRender(force=false){
  await pullServerOrders(force);
  render();
  return inbox();
}
function install(){
  window.johnEcommerceOrdersController={
    version:VERSION,
    render,
    refresh:refreshAndRender,
    state,
    filters,
    printPdf:printOrderPdf
  };
  window.johnV8RenderOrders=render;
  window.johnV850RenderCloudOrdersStable=render;
  window.johnV8RefreshOrders=refreshAndRender;
  window.johnV880RefreshOrders=refreshAndRender;
  window.johnV84RefreshOrders=refreshAndRender;
  window.johnCxRenderOrders813=render;
  window.johnCxRefreshOrders813=refreshAndRender;
  window.johnV8EditOrder=undefined;
  window.johnV8DeleteOrder=undefined;
  ensureToolbar();
  render();
}
function addCss(){if(E('johnCx813Css'))return;const st=document.createElement('style');st.id='johnCx813Css';st.textContent=`
#ecommercePedidosRecebidos .john-cx-filters{display:grid;grid-template-columns:140px 140px minmax(180px,1fr) 130px minmax(170px,1fr) minmax(160px,1fr) auto;gap:9px;align-items:end;padding:12px 16px;border-bottom:1px solid var(--border);background:linear-gradient(135deg,#fafafa,#f5f3ff)}
#ecommercePedidosRecebidos .john-cx-filters label{font-size:10px;font-weight:900;margin-bottom:4px}#ecommercePedidosRecebidos .john-cx-filters input,#ecommercePedidosRecebidos .john-cx-filters select{height:38px;padding:7px 9px}
#ecommercePedidosRecebidos table{min-width:1120px!important;table-layout:auto!important}#ecommercePedidosRecebidos th,#ecommercePedidosRecebidos td{font-size:10px!important;padding:7px!important;vertical-align:middle!important}#ecommercePedidosRecebidos .john-ecom-v8-actions{display:flex!important;gap:6px!important;flex-wrap:wrap!important;min-width:160px}
#ecommercePedidosRecebidos .john-cx-status{display:inline-flex;padding:5px 7px;border-radius:99px;font-weight:900;background:#e2e8f0;color:#334155}#ecommercePedidosRecebidos .john-cx-status.ACEITO{background:#dcfce7;color:#166534}#ecommercePedidosRecebidos .john-cx-status.REJEITADO,#ecommercePedidosRecebidos .john-cx-status.CANCELADO{background:#fee2e2;color:#991b1b}#ecommercePedidosRecebidos .john-cx-status.AGUARDANDO_CLIENTE_FRETE{background:#ffedd5;color:#9a3412}#ecommercePedidosRecebidos .john-cx-status.AGUARDANDO_ACEITE_ERP{background:#cffafe;color:#0e7490;box-shadow:inset 0 0 0 1px #67e8f9}#ecommercePedidosRecebidos .john-cx-status.FRETE_RECUSADO_CLIENTE{background:#fef3c7;color:#92400e}.john-cx-no-action{color:#94a3b8;font-weight:900}.john-cx-warn{color:#b45309;font-weight:900}.john-cx-ok{color:#15803d;font-weight:900}.john-cx-muted{color:#64748b}.john-cx-time{display:grid;gap:3px;min-width:105px}.john-cx-time input{height:34px;padding:5px 7px}.john-cx-time small{color:#64748b}
@media(max-width:800px){#ecommercePedidosRecebidos .john-cx-filters{grid-template-columns:1fr 1fr}#ecommercePedidosRecebidos .john-cx-filters>*{min-width:0}}
`;document.head.appendChild(st)}
addCss();
setTimeout(install,350);setTimeout(install,1600);setTimeout(()=>refreshAndRender(false),2600);
document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-page="ecommercePedidosRecebidos"]');
  if(b)setTimeout(()=>{ensureToolbar();refreshAndRender(false)},120);
});

// V8.14.0: a fila antiga foi aposentada no index.html.
// Não há observador de DOM nem temporizadores reescrevendo botões nesta tela.

console.info('[John ERP] Experiência do Cliente V'+VERSION+' ativa.');
})();