(function(){'use strict';
if(window.__JOHN_CASHBACK_VISIBILITY_82243__)return;
window.__JOHN_CASHBACK_VISIBILITY_82243__=true;

const VERSION='8.22.49';
const CASHBACK='./cashback-engine-v8-22-42.js?v=82247';
const ORDER_RECOVERY='./ecommerce-order-recovery-v8-22-45.js?v=82246-cloud';
const S=v=>String(v??'');
const N=v=>Number(v)||0;
const A=v=>Array.isArray(v)?v:[];
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/[\s-]+/g,'_');
const esc=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>N(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const COMPLETED=new Set(['ENTREGUE','RETIRADO','CONCLUIDO','FINALIZADO']);
let deliveryRows=[];
let cashbackCfg={};
let deliveryBusy=false;

function toast(message){try{if(typeof window.toast==='function')return window.toast(message)}catch(_){}console.warn('[Cashback]',message)}
function read(k,f){try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_){return f}}
function cloud(){const c=read('john_cloud_config_v1',{})||{};return{api:S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),token:S(c.apiKey||c.token||'')}}
function actor(){try{return S(typeof usuarioAtual==='function'?(usuarioAtual()?.nome||usuarioAtual()?.login||'ERP'):'ERP')}catch(_){return'ERP'}}
async function admin(path,opt={}){const c=cloud();if(!c.token)throw new Error('Sessão do ERP sem credencial de nuvem. Entre novamente.');const r=await fetch(c.api+path+(path.includes('?')?'&':'?')+'_v82247='+Date.now(),{cache:'no-store',...opt,headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.token,'X-ERP-User':actor(),'Cache-Control':'no-store',...(opt.headers||{})}});let j={};try{j=await r.json()}catch(_){}if(!r.ok)throw new Error(j?.error||('Erro HTTP '+r.status));return j}
function database(){try{return(typeof db!=='undefined'&&db)||window.db||{}}catch(_){return window.db||{}}}
function persistDb(d){try{if(typeof __johnLocalStorage!=='undefined'&&typeof DB_KEY!=='undefined'){__johnLocalStorage.setItem(DB_KEY,JSON.stringify(d));return true}}catch(_){}try{localStorage.setItem('pcp_app_v1',JSON.stringify(d));return true}catch(e){console.warn('[John '+VERSION+'] persistência',e);return false}}

function ensureOrderRecovery(){
  if(window.JohnOrderRecovery82246?.syncAndRepair){window.JohnOrderRecovery82246.syncAndRepair(true).catch?.(()=>{});return true}
  const old=[...document.querySelectorAll('script[src*="ecommerce-order-recovery-v8-22-45.js"]')];
  for(const s of old){if(!S(s.src).includes('82246-cloud')){try{s.remove()}catch(_){}}}
  if(document.querySelector('script[src*="ecommerce-order-recovery-v8-22-45.js"][src*="82246-cloud"]'))return true;
  const s=document.createElement('script');
  s.src=ORDER_RECOVERY;
  s.async=false;
  s.dataset.johnOrderRecovery82246='1';
  s.onload=()=>setTimeout(()=>window.JohnOrderRecovery82246?.syncAndRepair?.(true),80);
  s.onerror=()=>console.warn('[John 8.22.46] Não foi possível carregar a recuperação de pedidos pela nuvem.');
  (document.head||document.documentElement).appendChild(s);
  return true;
}

function motorGroup(){
  return [...document.querySelectorAll('.john-module-group')].find(g=>/motor\s+comercial/i.test(S(g.querySelector('.john-module-name')?.textContent)));
}

function ensureNavItem(){
  const group=motorGroup();
  const host=group?.querySelector('.john-module-items');
  if(!host)return false;
  let btn=host.querySelector('button[data-special="cashback"]');
  let created=false;
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='john-special-nav';
    btn.dataset.special='cashback';
    btn.innerHTML='💰 Cashback';
    host.appendChild(btn);
    created=true;
  }
  if(btn.dataset.cbVisibilityBound!=='1'){
    btn.dataset.cbVisibilityBound='1';
    btn.addEventListener('click',ev=>{ev.preventDefault();ev.stopImmediatePropagation();openCashback()},{capture:true});
  }
  if(created)setTimeout(()=>{try{window.johnNext?.renderHub?.();window.johnNext?.refresh?.()}catch(_){}},60);
  return true;
}

function ensureDeliveryNavItem(){
  const group=[...document.querySelectorAll('.nav .john-module-group')].find(g=>norm(g.querySelector('.john-module-name')?.textContent)==='VENDAS');
  const host=group?.querySelector('.john-module-items');
  if(!host)return false;
  let btn=host.querySelector('button[data-special="pedidosEntregas"]');
  const created=!btn;
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.className='john-special-nav';
    btn.dataset.special='pedidosEntregas';
    btn.innerHTML='📦 Pedidos / Entregas';
    host.appendChild(btn);
  }
  if(btn.dataset.deliveryNavBound!=='1'){
    btn.dataset.deliveryNavBound='1';
    btn.addEventListener('click',ev=>{
      ev.preventDefault();ev.stopImmediatePropagation();
      const sales=host.querySelector('button[data-page="vendas"]');
      if(sales)sales.click();
      else if(typeof window.showPage==='function')window.showPage('vendas');
      else{
        document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
        document.getElementById('vendas')?.classList.remove('hidden');
      }
      setTimeout(()=>{
        ensureSalesDeliveryPanel();
        loadDeliveryOrders(true);
        document.getElementById('johnSalesDelivery82247')?.scrollIntoView?.({behavior:'smooth',block:'start'});
      },100);
    },{capture:true});
  }
  if(created)setTimeout(()=>{window.johnNext?.renderHub?.()},60);
  return true;
}

function ensureTab(){
  const tabs=document.getElementById('ce822Tabs');
  if(!tabs)return false;
  let btn=tabs.querySelector('[data-cetab="cashback"]');
  if(!btn){
    btn=document.createElement('button');
    btn.type='button';
    btn.dataset.cetab='cashback';
    btn.textContent='Cashback';
    const loyalty=tabs.querySelector('[data-cetab="loyalty"]');
    if(loyalty)loyalty.insertAdjacentElement('afterend',btn);else tabs.appendChild(btn);
  }
  return true;
}

function ensureCashbackScript(){
  if(window.JohnCashback82242?.open)return Promise.resolve(true);
  return new Promise(resolve=>{
    let s=document.querySelector('script[data-john-cashback-82242],script[src*="cashback-engine-v8-22-42.js"]');
    if(!s){
      s=document.createElement('script');
      s.src=CASHBACK;
      s.async=false;
      s.dataset.johnCashback82242='1';
      document.head.appendChild(s);
    }
    let done=false;
    const finish=ok=>{if(done)return;done=true;resolve(ok)};
    s.addEventListener?.('load',()=>finish(true),{once:true});
    s.addEventListener?.('error',()=>finish(false),{once:true});
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(window.JohnCashback82242?.open){clearInterval(timer);finish(true)}
      else if(tries>=40){clearInterval(timer);finish(false)}
    },100);
  });
}

async function showMotor(){
  try{
    if(window.JohnCommerce822?.open){await window.JohnCommerce822.open('dash');return true}
  }catch(_){}
  const group=motorGroup();
  const fallback=[...group?.querySelectorAll('.john-module-items button')||[]].find(b=>b.dataset.special!=='cashback');
  if(fallback){fallback.click();await sleep(120);return true}
  return !!document.getElementById('motorComercial');
}

async function openCashback(){
  try{
    await showMotor();
    ensureTab();
    const ok=await ensureCashbackScript();
    ensureTab();
    if(ok&&window.JohnCashback82242?.open){await window.JohnCashback82242.open();return}
    toast('Não foi possível carregar o Cashback. Atualize o ERP e tente novamente.');
  }catch(e){console.error('[Cashback visibility]',e);toast('Falha ao abrir Cashback: '+(e?.message||e))}
}

function deliveryStyle(){
  if(document.getElementById('johnSalesDelivery82247Style'))return;
  const s=document.createElement('style');s.id='johnSalesDelivery82247Style';s.textContent=`
    #johnSalesDelivery82247{border:2px solid #ddd6fe;background:linear-gradient(135deg,#fff,#faf5ff);box-shadow:0 12px 30px #6d28d918}
    #johnSalesDelivery82247 .jcd-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 18px;border-bottom:1px solid #e9d5ff;background:linear-gradient(135deg,#f5f3ff,#fff)}
    #johnSalesDelivery82247 .jcd-head h2{margin:0;color:#4c1d95;font-size:19px}.jcd-sub{margin-top:4px;color:#64748b;font-size:12px}
    #johnSalesDelivery82247 .jcd-body{padding:14px 16px 16px}.jcd-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.jcd-tools select,.jcd-tools input{width:auto;min-width:170px;padding:9px 10px;border:1px solid #d8b4fe;border-radius:10px;background:#fff}
    #johnSalesDelivery82247 .jcd-note{padding:10px 12px;border-radius:11px;background:#ecfdf5;border:1px solid #bbf7d0;color:#166534;font-size:12px;line-height:1.45;margin-bottom:12px}
    #johnSalesDelivery82247 table{width:100%;border-collapse:collapse;font-size:12px}#johnSalesDelivery82247 th,#johnSalesDelivery82247 td{padding:10px 9px;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:middle}#johnSalesDelivery82247 th{background:#5b21b6;color:#fff;white-space:nowrap}
    .jcd-status{display:inline-block;padding:4px 8px;border-radius:999px;background:#ede9fe;color:#5b21b6;font-weight:900;font-size:10px}.jcd-status.done{background:#dcfce7;color:#166534}.jcd-cash{font-weight:900;color:#166534}.jcd-muted{color:#64748b}.jcd-empty{text-align:center;padding:22px!important;color:#64748b}.jcd-deliver{border:0;border-radius:10px;padding:9px 11px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;font-weight:900;cursor:pointer;white-space:nowrap}.jcd-deliver:disabled{opacity:.55;cursor:wait}
    @media(max-width:800px){#johnSalesDelivery82247 .jcd-table{overflow:auto}.jcd-tools{display:grid;grid-template-columns:1fr}.jcd-tools select,.jcd-tools input{width:100%;min-width:0}}
  `;document.head.appendChild(s);
}

function ensureSalesDeliveryPanel(){
  deliveryStyle();
  const page=document.getElementById('vendas');if(!page)return false;
  let panel=document.getElementById('johnSalesDelivery82247');
  if(!panel){
    panel=document.createElement('div');panel.id='johnSalesDelivery82247';panel.className='panel';
    panel.innerHTML=`<div class="jcd-head"><div><h2>📦 Pedidos / Entregas</h2><div class="jcd-sub">Submódulo de Vendas · concluir pedido e liberar cashback automaticamente</div></div><button type="button" class="btn secondary" id="jcdRefresh82247">Atualizar pedidos</button></div><div class="jcd-body"><div class="jcd-note"><b>Novo fluxo:</b> marque o pedido como <b>Entregue</b> (ou Retirado). O ERP Cloud registra a conclusão e o cashback elegível entra automaticamente na conta do cliente. Não é necessário abrir o módulo Cashback nem fazer consulta manual para gerar o crédito.</div><div class="jcd-tools"><select id="jcdFilter82247"><option value="PENDENTES">Aguardando conclusão</option><option value="TODOS">Todos os pedidos</option><option value="CONCLUIDOS">Entregues / Retirados</option></select><input id="jcdSearch82247" placeholder="Buscar pedido ou cliente"></div><div class="jcd-table"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Recebimento</th><th>Total</th><th>Status</th><th>Cashback</th><th>Ação</th></tr></thead><tbody id="jcdRows82247"><tr><td colspan="7" class="jcd-empty">Clique em Atualizar pedidos.</td></tr></tbody></table></div></div>`;
    const top=page.querySelector('.topbar');if(top)top.insertAdjacentElement('afterend',panel);else page.prepend(panel);
    panel.querySelector('#jcdRefresh82247')?.addEventListener('click',()=>loadDeliveryOrders(true));
    panel.querySelector('#jcdFilter82247')?.addEventListener('change',renderDeliveryOrders);
    panel.querySelector('#jcdSearch82247')?.addEventListener('input',renderDeliveryOrders);
    panel.addEventListener('click',e=>{const b=e.target?.closest?.('[data-jcd-deliver]');if(b)markDelivered(b.dataset.jcdDeliver,b)});
  }
  return true;
}

function orderStatus(o){return norm(o?.status||o?.payload?.status)}
function orderMode(o){return norm(o?.modalidade||o?.payload?.modalidade||o?.modoEntrega||o?.payload?.modoEntrega||o?.mode)}
function orderCode(o){return S(o?.codigo||o?.code||o?.numero||o?.erpNumero||o?.id).trim()}
function orderCustomer(o){const c=o?.cliente||o?.payload?.cliente||o?.customer||{};return S(c?.nome||c?.name||o?.clienteNome||'Cliente').trim()||'Cliente'}
function orderTotal(o){return N(o?.total??o?.valorTotal??o?.payload?.total??o?.payload?.valorTotal)}
function orderSubtotal(o){return N(o?.subtotal??o?.payload?.subtotal??o?.valorProdutos??o?.payload?.valorProdutos??orderTotal(o))}
function orderFreight(o){return N(o?.valorFrete??o?.frete??o?.payload?.valorFrete??o?.payload?.frete)}
function orderCashbackUsed(o){return N(o?.cashbackUtilizado??o?.cashbackUsado??o?.payload?.cashbackUtilizado??o?.payload?.cashbackUsado)}
function isAccepted(o){const st=orderStatus(o),it=norm(o?.statusIntegracao||o?.integration_status);return !['NOVO','PENDENTE','CANCELADO','REJEITADO'].includes(st)&&(['ACEITO','EM_PREPARO','PRONTO','SAIU_PARA_ENTREGA',...COMPLETED].includes(st)||['IMPORTANDO','IMPORTADO'].includes(it)||!!o?.erpPedidoId||!!o?.erpNumero)}
function predictedCashback(o){
  const p=o?.cashbackPolicy||o?.payload?.cashbackPolicy||cashbackCfg||{};
  const enabled=p.enabled!==undefined?p.enabled:cashbackCfg.enabled;if(enabled!==true)return 0;
  const pct=N(p.percentage??cashbackCfg.percentage),min=N(p.minOrderValue??cashbackCfg.minOrderValue),exclude=p.excludeShipping!==undefined?p.excludeShipping:(cashbackCfg.excludeShipping!==false);
  const base=Math.max(0,orderSubtotal(o)-orderCashbackUsed(o)+(exclude?0:orderFreight(o)));
  if(base<min||pct<=0)return 0;return Math.round(base*pct)/100;
}
function statusLabel(st){return S(st||'ACEITO').replaceAll('_',' ')}

function renderDeliveryOrders(){
  const body=document.getElementById('jcdRows82247');if(!body)return;
  const filter=S(document.getElementById('jcdFilter82247')?.value||'PENDENTES'),q=norm(document.getElementById('jcdSearch82247')?.value);
  let rows=deliveryRows.filter(isAccepted);
  if(filter==='PENDENTES')rows=rows.filter(o=>!COMPLETED.has(orderStatus(o)));
  if(filter==='CONCLUIDOS')rows=rows.filter(o=>COMPLETED.has(orderStatus(o)));
  if(q)rows=rows.filter(o=>norm(orderCode(o)+' '+orderCustomer(o)).includes(q));
  rows.sort((a,b)=>S(b?.criadoEm||b?.createdAt||b?.updatedAt).localeCompare(S(a?.criadoEm||a?.createdAt||a?.updatedAt)));
  body.innerHTML=rows.map(o=>{const st=orderStatus(o),done=COMPLETED.has(st),mode=orderMode(o),target=mode==='RETIRADA'?'RETIRADO':'ENTREGUE',cash=predictedCashback(o),id=esc(o?.id);return `<tr><td><b>${esc(orderCode(o))}</b><br><small class="jcd-muted">${esc(S(o?.erpNumero?'ERP #'+o.erpNumero:''))}</small></td><td>${esc(orderCustomer(o))}</td><td>${mode==='RETIRADA'?'🏪 Retirada':'🛵 Entrega'}</td><td><b>${money(orderTotal(o))}</b></td><td><span class="jcd-status ${done?'done':''}">${esc(statusLabel(st))}</span></td><td>${done?(cash>0?`<span class="jcd-cash">✓ ${money(cash)} processado</span>`:'<span class="jcd-muted">Regra processada</span>'):(cash>0?`<span class="jcd-cash">Previsto ${money(cash)}</span>`:'<span class="jcd-muted">Sem crédito previsto</span>')}</td><td>${done?'✓ Concluído':`<button type="button" class="jcd-deliver" data-jcd-deliver="${id}">✓ Marcar ${target==='RETIRADO'?'retirado':'entregue'}</button>`}</td></tr>`}).join('')||'<tr><td colspan="7" class="jcd-empty">Nenhum pedido encontrado neste filtro.</td></tr>';
}

async function loadDeliveryOrders(force=false){
  if(deliveryBusy)return;deliveryBusy=true;ensureSalesDeliveryPanel();
  const body=document.getElementById('jcdRows82247');if(body)body.innerHTML='<tr><td colspan="7" class="jcd-empty">Atualizando pedidos...</td></tr>';
  try{
    const [ordersR,cfgR]=await Promise.all([admin('/api/v1/admin/store/orders?status=TODOS&limit=1000'),admin('/api/v1/admin/cashback/config').catch(()=>({config:{}}))]);
    deliveryRows=A(ordersR?.orders);cashbackCfg=cfgR?.config||{};renderDeliveryOrders();
    if(force)window.JohnOrderRecovery82246?.syncAndRepair?.(true)?.catch?.(()=>{});
  }catch(e){console.error('[John '+VERSION+'] Pedidos / Entregas',e);if(body)body.innerHTML=`<tr><td colspan="7" class="jcd-empty">Falha ao carregar: ${esc(e?.message||e)}</td></tr>`}
  finally{deliveryBusy=false}
}

function updateLocalDelivered(id,target){
  const d=database(),p=A(d?.pedidos).find(x=>S(x?.ecommercePedidoId)===S(id));if(!p)return false;
  p.status=target;p.statusEcommerce=target;p.statusEcommerceSincronizadoEm=new Date().toISOString();p.atualizadoEm=new Date().toISOString();persistDb(d);
  try{window.renderPedidosNovo?.()}catch(_){};try{window.renderAll?.()}catch(_){};return true;
}

async function markDelivered(id,btn){
  const o=deliveryRows.find(x=>S(x?.id)===S(id));if(!o)return toast('Pedido não localizado. Atualize a lista.');
  const mode=orderMode(o),target=mode==='RETIRADA'?'RETIRADO':'ENTREGUE',code=orderCode(o),cash=predictedCashback(o);
  if(!confirm(`Confirmar pedido ${code} como ${target==='RETIRADO'?'RETIRADO':'ENTREGUE'}?\n\nAo confirmar, a regra de cashback será processada automaticamente para o cliente.`))return;
  if(btn){btn.disabled=true;btn.textContent='Processando...'}
  try{
    await admin('/api/v1/admin/store/orders/statuses',{method:'PUT',body:JSON.stringify({pedidos:{[id]:{status:target}}})});
    updateLocalDelivered(id,target);
    await loadDeliveryOrders(false);
    const msg=cash>0?`Pedido ${code} concluído. Cashback de aproximadamente ${money(cash)} processado automaticamente para o cliente.`:`Pedido ${code} concluído. A regra de cashback foi processada automaticamente.`;
    toast(msg);
    setTimeout(()=>{window.JohnCashback82242?.refresh?.().catch?.(()=>{});window.johnEcommerceOrdersController?.refresh?.(true)?.catch?.(()=>{})},250);
  }catch(e){console.error('[John '+VERSION+'] conclusão de pedido',e);toast('Não foi possível concluir o pedido: '+(e?.message||e));if(btn){btn.disabled=false;btn.textContent=target==='RETIRADO'?'✓ Marcar retirado':'✓ Marcar entregue'}}
}

document.addEventListener('click',ev=>{
  const cb=ev.target?.closest?.('[data-cetab="cashback"]');
  if(cb){ev.preventDefault();ev.stopImmediatePropagation();openCashback();return}
  const vendas=ev.target?.closest?.('[data-page="vendas"]');
  if(vendas)setTimeout(()=>{ensureSalesDeliveryPanel();loadDeliveryOrders(false)},100);
},true);

function install(){ensureOrderRecovery();ensureNavItem();ensureDeliveryNavItem();ensureTab();ensureCashbackScript();ensureSalesDeliveryPanel()}
const observer=new MutationObserver(()=>{ensureNavItem();ensureDeliveryNavItem();ensureTab();ensureSalesDeliveryPanel()});
if(document.documentElement)observer.observe(document.documentElement,{childList:true,subtree:true});
[0,300,900,1800,3500].forEach(ms=>setTimeout(install,ms));
window.addEventListener('john:session-ready',()=>setTimeout(()=>{install();loadDeliveryOrders(false)},80));
window.addEventListener('john:cloud-applied',()=>setTimeout(()=>{install();loadDeliveryOrders(false)},120));
window.addEventListener('focus',()=>{setTimeout(ensureOrderRecovery,50);const page=document.getElementById('vendas');if(page&&!page.classList.contains('hidden'))setTimeout(()=>loadDeliveryOrders(false),120)});
window.JohnCashbackVisibility82243={version:VERSION,install,open:openCashback,ensureOrderRecovery,openDelivery:()=>{ensureSalesDeliveryPanel();return loadDeliveryOrders(true)},markDelivered};
})();