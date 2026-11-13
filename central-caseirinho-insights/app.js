(function(){
'use strict';
const STORE='https://jonataspos90-source.github.io/caseirinho-loja/';
const DEFAULT_API='https://john-cloud-api-production.up.railway.app';
const st={api:DEFAULT_API,token:'',summary:null,contacts:[],orders:[],catalog:[],categories:[],drafts:[],requests:[],opsData:null,sales:null,salesLoaded:false,merch:{grades:[],packs:[]},merchTab:'grades',gradeSelected:new Map(),packSelected:new Set(),merchLoaded:false,fulfillment:new Map(),fichasData:null,cashbacksData:null,couponsData:null,couponReport:null,couponTab:'config',bfData:null,bfSelected:new Map(),seasonData:null,seasonOrders:null,seasonProductRules:new Map(),seasonAdminTab:'campaigns',orderAlertSeen:null,orderAlertEnabled:false,view:'dashboard',syncing:false,sound:false,known:new Set(),knownReady:false,lastUpdated:null};
const E=id=>document.getElementById(id);
const s=x=>String(x==null?'':x), n=x=>Number(x)||0;
const esc=x=>s(x).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const dt=x=>{if(!x)return'—';const a=new Date(x);return isNaN(a.getTime())?'—':a.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});};
const brl=x=>n(x).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const digits=x=>{let p=s(x).replace(/\D/g,'');return p.startsWith('55')&&p.length===13?p.slice(2):p;};
const tel=x=>{let p=digits(x);return p.length===11?'('+p.slice(0,2)+') '+p.slice(2,7)+'-'+p.slice(7):p;};
const first=x=>{const a=s(x).trim().split(/\s+/)[0];return a&&a.toLowerCase()!=='cliente'?a:'você';};
let toastTimer;
function toast(msg,error){const e=E('toast');e.hidden=false;e.textContent=msg;e.style.background=error?'#932d32':'#183c2e';clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.hidden=true,4200);}
function modal(title,html){E('modalTitle').textContent=title;E('modalContent').innerHTML=html;E('modal').hidden=false;}
function hideModal(){E('modal').hidden=true;E('modalContent').innerHTML='';}

const ERP_SESSION_KEY='caseirinho_insights_erp_session_v6';
const ERP_LAST_USERNAME_KEY='caseirinho_insights_last_username_v6';
function tokenSetup(){
 st.api=DEFAULT_API;
 try{
  localStorage.removeItem('caseirinho_insights_device_session_v2');
  sessionStorage.removeItem('caseirinho_hub_session');
  const saved=JSON.parse(sessionStorage.getItem(ERP_SESSION_KEY)||'{}');
  if(saved.token&&Number(saved.expiresAt)>Date.now()+10000){st.token=saved.token;st.sessionExpiry=Number(saved.expiresAt);}
  else sessionStorage.removeItem(ERP_SESSION_KEY);
 }catch(_){}
 try{E('erpUsername').value=localStorage.getItem(ERP_LAST_USERNAME_KEY)||'';}catch(_){}
 E('apiLabel').textContent=DEFAULT_API;
}
function saveSession(){
 if(st.token&&st.sessionExpiry){
  try{sessionStorage.setItem(ERP_SESSION_KEY,JSON.stringify({token:st.token,expiresAt:st.sessionExpiry}));}catch(_){}
 }
}
function logout(){
 st.token='';st.sessionExpiry=0;st.summary=null;st.contacts=[];st.requests=[];st.knownReady=false;
 try{sessionStorage.removeItem(ERP_SESSION_KEY);}catch(_){}
 E('erpPassword').value='';E('loginScreen').hidden=false;
 E('loginNotice').className='notice';
 E('loginNotice').textContent='Entre com seu usuário e senha do ERP Caseirinho.';
}
async function loginWithERP(e){
 e.preventDefault();
 const user=E('erpUsername').value.trim().toLowerCase(),pass=E('erpPassword').value,btn=E('erpLoginBtn');
 if(!user||!pass)return;
 btn.disabled=true;btn.textContent='Conferindo...';
 E('loginNotice').className='notice';E('loginNotice').textContent='Verificando seu acesso no ERP…';
 try{
  const resp=await fetch(DEFAULT_API+'/api/v1/public/store/caseirinho/erp-login',{
   method:'POST',cache:'no-store',credentials:'omit',
   headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
   body:JSON.stringify({login:user,senha:pass})
  });
  let data={};try{data=await resp.json();}catch(_){}
  if(!resp.ok||!data.ok||!data.token)throw Error(data.error||'Login ou senha inválidos.');
  const profile=String(data.usuario?.perfil||'').toUpperCase();
  if(!['MASTER','ADMINISTRADOR','GERENTE','PLATFORM_OWNER'].includes(profile))
   throw Error('Seu usuário do ERP não tem permissão para acessar esta Central.');
  let expiry=0;
  try{expiry=Number(JSON.parse(atob(data.token.split('.')[0].replace(/-/g,'+').replace(/_/g,'/'))).exp)||0;}catch(_){}
  if(expiry<=Date.now())throw Error('Sessão recebida do ERP está inválida ou expirada.');
  st.token=data.token;st.sessionExpiry=expiry;E('erpPassword').value='';
  await api('summary');
  saveSession();
  try{localStorage.setItem(ERP_LAST_USERNAME_KEY,user);}catch(_){}
  E('loginScreen').hidden=true;
  await loadAll();
  {const params=new URLSearchParams(location.search),requested=params.get('view');if(['orders','blackfriday','sazonais','products','operations','financeiro','sales','receivables'].includes(requested))nav(requested);if(requested==='products'&&params.get('product')){const id=params.get('product');if(st.catalog.some(x=>s(x.id)===s(id)))editProduct(id);}}
 }catch(error){
  st.token='';st.sessionExpiry=0;
  try{sessionStorage.removeItem(ERP_SESSION_KEY);}catch(_){}
  E('erpPassword').value='';E('loginScreen').hidden=false;
  E('loginNotice').className='notice error';
  E('loginNotice').textContent=error.message||'Não foi possível entrar.';
 }finally{btn.disabled=false;btn.textContent='🔐 Entrar';}
}
let installEvent=null;
function isInstalled(){return !!(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true);}
function showInstallSteps(){
 const samsung=/SamsungBrowser/i.test(navigator.userAgent),android=/Android/i.test(navigator.userAgent);
 const steps=samsung?'No Samsung Internet: menu ☰ → Adicionar página a → Tela inicial.':
 android?'No Google Chrome: menu ⋮ → Instalar aplicativo (ou Adicionar à tela inicial) → Instalar.':
 'No iPhone (Safari): Compartilhar → Adicionar à Tela de Início.';
 modal('📲 Instalar Caseirinho Insights','<p>'+steps+'</p><p class="notice success">Depois, basta tocar no ícone da tela inicial para abrir diretamente a Central.</p><p>O login usa a senha do ERP, sem salvar sua senha.</p>');
}
async function installApp(){
 if(isInstalled()){toast('O aplicativo já está instalado! Abra pelo ícone da tela inicial.');return;}
 if(!installEvent){showInstallSteps();return;}
 const ev=installEvent;installEvent=null;
 try{await ev.prompt();const choice=await ev.userChoice;if(choice?.outcome==='accepted')toast('Instalação aceita! Veja o ícone na tela inicial.');}
 catch(_){showInstallSteps();}
}
function setupInstall(){
 for(const id of ['installAppMain'])E(id)?.addEventListener('click',installApp);
 window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installEvent=event;});
 window.addEventListener('appinstalled',()=>{installEvent=null;E('installAppMain').hidden=true;toast('Central Caseirinho instalada!');});
 if(isInstalled())E('installAppMain').hidden=true;
 if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
}
async function api(path,options){
 if(!st.token)throw Error('É necessário entrar com seu usuário administrativo.');
 const method=s(options&&options.method||'GET').toUpperCase(),isRead=method==='GET';
 let response;
 // Apenas consultas podem ser repetidas; gravações e pagamentos nunca são reenviados.
 for(let attempt=0;attempt<(isRead?2:1);attempt++){
  let timer=null;
  const controller=isRead&&typeof AbortController!=='undefined'?new AbortController():null;
  try{
   // Leituras não devem deixar o módulo preso indefinidamente em "Consultando".
   if(controller)timer=setTimeout(()=>controller.abort(),12000);
   response=await fetch(st.api+'/api/v1/admin/store/insights/'+path,{
    method,cache:'no-store',credentials:'omit',
    headers:{Authorization:'Bearer '+st.token,'Cache-Control':'no-store','Content-Type':'application/json'},
    body:options&&options.body?JSON.stringify(options.body):undefined,
    ...(controller?{signal:controller.signal}:{})
   });
  }catch(cause){
   if(isRead&&attempt===0&&navigator.onLine!==false){
    await new Promise(resolve=>setTimeout(resolve,650));continue;
   }
   const err=new Error(navigator.onLine===false
    ?'O dispositivo está sem internet. Reconecte e toque em Atualizar.'
    :isRead?'Conexão temporariamente indisponível. Toque em Atualizar para consultar novamente.'
    :'A conexão caiu durante a gravação. Confira os dados antes de tentar novamente.');
   err.networkError=true;err.cause=cause;throw err;
  }finally{
   if(timer!==null)clearTimeout(timer);
  }
  if(isRead&&attempt===0&&[502,503,504].includes(response.status)){
   await new Promise(resolve=>setTimeout(resolve,650));continue;
  }
  break;
 }
 let data={};try{data=await response.json();}catch(_){}
 if(!response.ok){const err=new Error(s(data.error||('HTTP '+response.status)));err.httpStatus=response.status;throw err;}
 return data;
}
// Três consultas em paralelo, em vez de nove competindo na rede móvel.
async function fetchDashboardGroups(paths){
 const responses=new Array(paths.length);
 for(let i=0;i<paths.length;i+=3){
  const group=await Promise.allSettled(paths.slice(i,i+3).map(path=>api(path)));
  group.forEach((result,index)=>{responses[i+index]=result;});
 }
 return responses;
}
function nav(tab){
 st.view=tab;
 document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===tab));
 document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===tab));
 const labels={dashboard:'Visão geral',contacts:'CRM e contatos',ranking:'Ranking de acessos',orders:'Pedidos',operations:'Central Operacional',financeiro:'Financeiro e DRE',receivables:'Conta Cliente e Recebimentos',menu:'Cardápio escrito',products:'Produtos e preços',blackfriday:'Black Friday',sazonais:'Encomendas Sazonais',reports:'Relatórios e PDF',sales:'Vendas & Estoque',merch:'Grades e Packs',fichas:'Fichas Técnicas',cashbacks:'Cashback Clientes',coupons:'Cupons e Utilizações',requests:'Solicitações de cardápio',settings:'Configurações'};
 E('pageTitle').textContent=labels[tab]||'Central de Insights';
 window.scrollTo({top:0,behavior:'smooth'});
 render();
 if(tab==='sales'){window.CaseirinhoSalesStockLevels?.render?.();if(!st.salesLoaded)loadSales()}
 if(tab==='merch'&&!st.merchLoaded)loadMerch();
 if(tab==='fichas'&&!st.fichasData)loadFichas();
 if(tab==='cashbacks'&&!st.cashbacksData)loadCashbacks();
 if(tab==='coupons'&&!st.couponsData)loadCoupons();
 if(tab==='blackfriday'&&!st.bfData)loadBlackFriday();
 if(tab==='sazonais'&&!st.seasonData)loadSeasonAdmin();
 if(tab==='financeiro')window.CaseirinhoFinance?.load();
 if(tab==='receivables')window.CaseirinhoReceivables?.load?.(true);
 if(tab==='operations')loadOpsAudit();
}
function badge(x){const v=s(x).toUpperCase();return '<span class="badge '+(v.includes('PENDENTE')?'warn':v.includes('IMPORTANDO')?'light':v.includes('NOVO')?'light':v.includes('IMPORTADO')||v.includes('CONCLU')||v.includes('APROV')?'good':'')+'">'+esc(x||'—')+'</span>';}
function cellEmpty(title){return '<div class="empty">'+esc(title)+'</div>';}
function table(headers,rows){if(!rows.length)return cellEmpty('Nenhum registro encontrado para este filtro.');return '<div class="table-wrap"><table class="table"><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>';}
function statsCard(icon,label,num,note){return '<div class="stat"><span class="icon">'+icon+'</span><strong>'+esc(label)+'</strong><div class="n">'+esc(num)+'</div><small>'+esc(note||'')+'</small></div>';}
function renderOverview(){
 const a=st.summary||{},u=a.usage||{},p=a.registrations||{},o=a.orders||{},e=a.events||{},req=a.requests||{};
 E('statGrid').innerHTML=[
 statsCard('👥','Contatos identificáveis',st.contacts.length||n(p.unique_contacts),'Pessoas com WhatsApp conhecido'),
 statsCard('📱','Dispositivos ativos',n(u.active_now),'Ping da loja nos últimos 5 minutos'),
 statsCard('🛒','Pedidos hoje',n(o.today),'Últimos 60 minutos: '+n(o.hour)),
 statsCard('🔔','Cardápios solicitados',st.requests.filter(x=>!x.handled).length,'Aguardando atendimento'),
 statsCard('📲','Dispositivos registrados',n(u.devices),'Exclusivamente loja, sem ERP'),
 statsCard('🍝','Itens do cardápio',st.catalog.length,'Valores do catálogo publicado'),
 statsCard('🏆','Visitas confirmadas — 24h',n(e.STORE_OPEN?.day),'Abertura real; não são pings'),
 statsCard('💚','Clientes com pedidos',st.contacts.filter(x=>n(x.orders)>0).length,'Identificados pelo WhatsApp')
 ].join('');
 const parts=[
 ['Ativos na última hora',n(u.active_hour),Math.max(1,n(u.devices))],
 ['Ativos em 24 horas',n(u.active_24h),Math.max(1,n(u.devices))],
 ['Android no histórico',n(u.android),Math.max(1,n(u.devices))],
 ['iOS no histórico',n(u.ios),Math.max(1,n(u.devices))]
 ];
 E('trafficPanel').innerHTML=parts.map(x=>'<div><b style="font-size:13px">'+esc(x[0])+'</b><span class="muted" style="float:right;font-size:13px">'+x[1]+'</span><div class="progress"><div style="width:'+Math.min(100,Math.round(x[1]/x[2]*100))+'%"></div></div></div>').join('');
 const evs=['STORE_OPEN','IDENTIFIED','PWA_INSTALLED','PWA_STANDALONE_LAUNCH'];
 E('analyticsPanel').innerHTML='<p class="muted"><b>Eventos da nova instrumentação (últimas 24 horas)</b></p>'+evs.map(v=>'<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #e9eade"><span>'+v+'</span><b>'+n(e[v]?.day)+'</b></div>').join('')+
 '<p style="font-size:12px">Standalone histórico: '+n(u.standalone)+' dispositivos. Instalação PWA só pode ser comprovada por evento appinstalled.</p>';
 let notes=[];
 if(n(o.pending)>0)notes.push('🟠 '+n(o.pending)+' pedidos com integração PENDENTE.');
 if(n(o.importing)>0)notes.push('🔵 '+n(o.importing)+' pedidos marcados IMPORTANDO.');
 if(n(a.carts?.abandoned)>0)notes.push('🛒 '+n(a.carts.abandoned)+' eventos explícitos de abandono nas últimas 24 horas.');
 if(!n(e.STORE_OPEN?.day)&&!n(e.IDENTIFIED?.day))notes.push('⚠️ Ainda não há eventos novos de visitas/identificação; ranking sem dados suficientes.');
 if(st.requests.some(x=>!x.handled))notes.push('💬 Existem pedidos de cardápio que precisam de resposta.');
 E('priorityPanel').innerHTML=notes.length?'<div class="notice">'+notes.map(esc).join('<br>')+'</div>':cellEmpty('Nenhuma prioridade crítica apontada pelos indicadores.');
 const pend=st.requests.filter(x=>!x.handled).slice(0,5);
 E('recentRequests').innerHTML=pend.length?pend.map(x=>'<div class="menu-item"><span><b>'+esc(x.name||'Contato')+'</b><br><small class="muted">'+dt(x.created_at)+'</small></span><button type="button" class="btn small whatsapp" data-action="respond" data-phone="'+esc(x.phone)+'">Responder</button></div>').join(''):cellEmpty('Sem novas solicitações de cardápio.');
 const recent=st.contacts.filter(x=>x.first_registration&&Date.now()-new Date(x.first_registration).getTime()<86400000).sort((a,b)=>new Date(b.first_registration)-new Date(a.first_registration)).slice(0,7);
 E('recentContacts').innerHTML=recent.length?table(['Cliente','WhatsApp','Primeiro cadastro','Pedidos'],recent.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(tel(x.phone))+'</td><td>'+dt(x.first_registration)+'</td><td>'+n(x.orders)+'</td></tr>')):cellEmpty('Nenhum primeiro cadastro comprovado nas últimas 24 horas.');
}
function contactButtons(c){return '<button type="button" class="btn small whatsapp" data-action="hello" data-phone="'+esc(c.phone)+'">💬 Mensagem</button> <button type="button" class="btn small gold" data-action="catalog" data-phone="'+esc(c.phone)+'">🍝 Cardápio</button> <button type="button" class="btn small" data-action="customerOrders" data-phone="'+esc(c.phone)+'">📦 Ver compras</button>';}
function renderContacts(){
 const q=s(E('contactSearch').value).toLowerCase().trim(),filter=E('contactFilter').value;
 const list=st.contacts.filter(x=>(s(x.name)+' '+s(x.phone)).toLowerCase().includes(q)&&(
 filter==='all'||filter==='orders'&&n(x.orders)>0||filter==='leads'&&n(x.orders)===0||filter==='visits'&&n(x.visits)>0||filter==='erp'&&n(x.erp_records)>0||filter==='store'&&(n(x.registrations)>0||n(x.orders)>0||!!x.last_identified)||filter==='marketing'&&!!x.marketing_optin));
 E('contactTotal').textContent=list.length+' contatos';
 if(window.matchMedia('(max-width:790px)').matches){
  E('contactTable').innerHTML=list.length?'<div class="mobile-list">'+list.map(x=>{
   const latest=[x.last_registration,x.last_order,x.last_identified,x.last_erp].filter(Boolean).sort().at(-1);
   return '<article class="mobile-record"><div class="mobile-record-head"><strong>'+esc(x.name)+'</strong><span class="badge '+(n(x.orders)>0?'good':'light')+'">'+(n(x.orders)>0?'Cliente':'Contato')+'</span></div>'+
   '<p>📱 '+esc(tel(x.phone))+'<br>📦 Pedidos: <b>'+n(x.orders)+'</b> · Visitas confirmadas: <b>'+n(x.visits)+'</b><br>🕒 '+dt(latest)+'</p>'+
   (x.optout?'<span class="badge bad">Não contatar</span>':'<div class="record-actions">'+contactButtons(x)+'</div>')+'</article>';
  }).join('')+'</div>':cellEmpty('Nenhum contato encontrado.');
  return;
 }

 E('contactTable').innerHTML=table(['Cliente / vínculo','WhatsApp','Visitas confirmadas','Pedidos','Última interação','WhatsApp'],list.map(x=>{
 const latest=[x.last_registration,x.last_order,x.last_identified].filter(Boolean).sort().at(-1);
 return '<tr><td><b>'+esc(x.name)+'</b><br><span class="badge '+(n(x.orders)>0?'good':'light')+'">'+(n(x.orders)>0?'Cliente com pedido':n(x.registrations)>0?'Pré-cadastro da loja':n(x.erp_records)>0?'Cliente do ERP':'Identificado no app')+'</span> '+(n(x.erp_records)>0?'<span class="badge light">CRM ERP</span> ':'')+(n(x.registrations)>0?'<span class="badge light">Loja</span> ':'')+(x.optout?'<span class="badge bad">Não contatar</span>':x.marketing_optin?'<span class="badge good">Marketing autorizado</span>':'')+'</td><td>'+esc(tel(x.phone))+'</td><td>'+n(x.visits)+'</td><td>'+n(x.orders)+'</td><td>'+dt(latest)+'</td><td class="actions-cell">'+(x.optout?'<small class="muted">Contato bloqueado</small>':contactButtons(x))+'</td></tr>';
 }));
}
function renderRanking(){
 const ranked=st.contacts.filter(x=>n(x.visits)>0&&x.last_visit).sort((a,b)=>n(b.visits)-n(a.visits)||new Date(b.last_visit)-new Date(a.last_visit)).slice(0,10);
 E('rankingTable').innerHTML=ranked.length?
 '<div class="notice success">Ranking elaborado apenas com visitas comprovadas e vinculadas por identificação. A contagem começa com a publicação dos eventos da nova instrumentação.</div>'+
 table(['Posição','Cliente','WhatsApp','Visitas registradas','Última entrada','Pedidos'],ranked.map((x,i)=>'<tr><td><strong>'+(i+1)+'</strong></td><td>'+esc(x.name)+'</td><td>'+esc(tel(x.phone))+'</td><td>'+n(x.visits)+'</td><td>'+dt(x.last_visit)+'</td><td>'+n(x.orders)+'</td></tr>')):
 '<div class="empty"><b>Sem dados suficientes para ranking</b><p>Não existem visitas comprovadas com STORE_ANALYTICS_STORE_OPEN e IDENTIFIED vinculados ao mesmo dispositivo e visitId. Não usamos pings ou pré-cadastros como visitas.</p></div>';
}
function renderOrderFulfillmentKpis(){
 const items=[...st.fulfillment.values()];
 const ready=items.filter(x=>!x.completed&&['ACEITO','ABERTO','PRONTO'].includes(x.status));
 const granted=items.filter(x=>Number(x.credit)>0);
 const complete=items.filter(x=>x.completed);
 E('orderFulfillmentKpis').innerHTML=[
  statsCard('📦','Aguardando conclusão',ready.length,'Aceitos, inclusive os que aguardam integração ERP'),
  statsCard('💚','Cashback a decidir',ready.filter(x=>x.approval==='PENDENTE'&&(x.eligible||x.canOverrideFirstPurchase)).length,'Elegíveis e exceções disponíveis ao administrador'),
  statsCard('✅','Créditos liberados',granted.length,brl(granted.reduce((sum,x)=>sum+Number(x.credit||0),0))+' em cashback'),
  statsCard('🎉','Entregues / retirados',complete.length,'Pedidos com situação finalizada')
 ].join('');
}
function renderOrders(){
 renderOrderFulfillmentKpis();
 const q=s(E('orderSearch').value).toLowerCase().trim(),f=E('orderFilter').value;
 const rows=st.orders.filter(x=>{const v=st.fulfillment.get(s(x.code));const match=(s(x.code)+' '+s(x.name)+' '+s(x.phone)+' '+(x.items||[]).map(i=>i.name).join(' ')).toLowerCase().includes(q);const status=s(v?.status||x.status).toUpperCase();const integrated=v?.integration==='IMPORTADO'&&v?.erpLinked;const filter=f==='all'||x.integration_status===f||f==='NEW'&&['NOVO','PENDENTE','AGUARDANDO_ANALISE','AGUARDANDO_COTACAO_FRETE'].includes(status)||f==='READY'&&!v?.completed&&['ACEITO','ABERTO','PRONTO'].includes(status)||f==='CASHBACK_PENDING'&&!v?.completed&&v?.approval==='PENDENTE'||f==='CASHBACK_GRANTED'&&n(v?.credit)>0||f==='COMPLETED'&&v?.completed;return match&&filter;});
 if(window.matchMedia('(max-width:790px)').matches){
  E('ordersTable').innerHTML=rows.length?'<div class="mobile-list">'+rows.map(x=>'<article class="mobile-record"><div class="mobile-record-head"><strong>Pedido #'+esc(x.code)+'</strong>'+badge(x.status)+'</div><p><b>'+esc(x.name||'Cliente')+'</b> · '+dt(x.created_at)+'</p><p><b>'+brl(x.total)+'</b> · '+(x.items||[]).length+' item(ns)</p><p>'+badge(x.integration_status)+'</p><p>'+paymentBadge(x)+'</p><div class="record-actions">'+orderButton(x)+'</div></article>').join('')+'</div>':cellEmpty('Nenhum pedido encontrado.');
 }else{
  E('ordersTable').innerHTML=table(['Data','Pedido','Cliente','Itens pedidos','Total','Status / ERP','Pagamento','Ações'],rows.map(x=>'<tr><td>'+dt(x.created_at)+'</td><td><b>'+esc(x.code)+'</b></td><td>'+esc(x.name||'—')+'<br><small>'+esc(tel(x.phone))+'</small></td><td>'+esc((x.items||[]).map(i=>n(i.quantity)+'× '+i.name).join(', '))+'</td><td><b>'+brl(x.total)+'</b></td><td>'+badge(x.status)+'<br>'+badge(x.integration_status)+'</td><td>'+paymentBadge(x)+'</td><td class="actions-cell">'+orderButton(x)+'</td></tr>'));
 }
}
const expected=new Map([['Panqueca Palmito',13.99],['Molho 250 gr - Sugo',12.99],['Molho 500 gr - Sugo',15.99],['Molho 1 Kg - Sugo',24.99],['Macarrão Talharim com Massa Caseira G (900 gr) - Molho Branco',31.99]]);
function warnings(){
 const w=[];const grouped=new Map();
 st.catalog.forEach(x=>{const exp=expected.get(x.name);if(exp!=null&&Math.abs(n(x.price)-exp)>0.001)w.push(x.name+': publicado '+brl(x.price)+', ajuste pedido '+brl(exp));
 const key=s(x.category)+'|'+s(x.name),prices=grouped.get(key)||new Set();prices.add(n(x.price));grouped.set(key,prices);
 });
 for(const [key,values] of grouped)if(values.size>1)w.push(key.split('|')[1]+': registros com preços diferentes');
 return w;
}
function menuSelection(){const cat=E('menuCategory').value;return st.catalog.filter(x=>x.active!==false&&x.published!==false).filter(x=>cat==='all'||x.category===cat).filter(x=>!/alco[oó]lic/i.test(x.category)||/n[aã]o\s+alco[oó]lic/i.test(x.category));}
function menuMessage(items,client){
 const group=new Map();items.forEach(p=>{if(!group.has(p.category))group.set(p.category,[]);group.get(p.category).push(p);});
 const lines=['🍝 *CARDÁPIO CASEIRINHO MASSAS ARTESANAIS*','💚 Sabor caseiro em cada momento!'];
 if(client)lines.unshift('Oi, '+first(client.name)+'! 💚 Aqui no Caseirinho, preparamos nosso cardápio com carinho para você.');
 for(const [category,values] of group){
 lines.push('');lines.push('*'+category+'*');
 const used=new Set();
 values.forEach(p=>{const name=s(p.name),key=name+'|'+p.price;if(used.has(key))return;used.add(key);
 lines.push('• '+name+' — '+brl(p.price)+(p.availability==='SOB_ENCOMENDA'?' (sob encomenda)':''));});
 }
 lines.push('');lines.push('📲 Faça seu pedido pelo app: '+STORE);
 lines.push('💚 Disponibilidade e preços devem ser confirmados no momento do pedido.');
 return lines.join('\n');
}
function menuParts(client){
 const content=menuMessage(menuSelection(),client);
 if(content.length<=2900)return [content];
 // Criar partes com cabeçalho e rodapé, mantendo cada linha de produto intacta.
 const lines=content.split('\n'),parts=[];let piece='';
 for(const line of lines){if(piece.length+line.length+2>2500&&piece){parts.push(piece);piece='';}piece+=(piece?'\n':'')+line;}
 if(piece)parts.push(piece);
 return parts.map((text,i)=>'*Caseirinho • Cardápio ('+(i+1)+'/'+parts.length+')*\n'+text+(i===parts.length-1?'':'\nContinua na próxima parte 💚'));
}
function renderMenu(){
 const sel=E('menuCategory'),prev=sel.value;
 const categories=[...new Set(st.catalog.filter(x=>x.active!==false&&x.published!==false).map(x=>x.category))].filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'));
 sel.innerHTML='<option value="all">Todas as categorias</option>'+categories.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 if(categories.includes(prev))sel.value=prev;else sel.value='all';
 const items=menuSelection(),warningList=warnings();
 E('priceWarnings').innerHTML=warningList.length?'<div class="notice"><b>⚠️ Divergências de preço a revisar:</b><br>'+warningList.map(esc).join('<br>')+'<br><small>O texto usa o preço publicado no Neon, sem corrigir valores automaticamente.</small></div>':'<div class="notice success">Valores carregados do catálogo publicado. Confira antes de enviar.</div>';
 const categoriesToShow=[...new Set(items.map(x=>x.category))];
 E('menuItems').innerHTML=categoriesToShow.map(cat=>'<h3 class="menu-cat">'+esc(cat)+'</h3>'+items.filter(x=>x.category===cat).map(x=>'<div class="menu-item"><span>'+esc(x.name)+(x.availability==='SOB_ENCOMENDA'?' <span class="badge warn">Encomenda</span>':'')+'</span><strong>'+brl(x.price)+'</strong></div>').join('')).join('')||cellEmpty('Nenhum produto publicado.');
 E('menuText').textContent=menuMessage(items,null);
}
function renderRequests(){
 E('requestsTable').innerHTML=table(['Solicitação','Cliente','WhatsApp','Situação','Atendimento'],st.requests.map(x=>'<tr><td>'+dt(x.created_at)+'</td><td>'+esc(x.name||'Contato')+'</td><td>'+esc(tel(x.phone))+'</td><td>'+ (x.handled?'<span class="badge good">Atendido</span>':'<span class="badge warn">Aguardando</span>')+'</td><td class="actions-cell"><button type="button" class="btn small whatsapp" data-action="respond" data-phone="'+esc(x.phone)+'">💬 Enviar cardápio</button> '+(x.handled?'':'<button type="button" class="btn small" data-action="mark" data-id="'+esc(x.id)+'">✓ Marcar atendido</button>')+'</td></tr>'));
 const count=st.requests.filter(x=>!x.handled).length;
 E('requestCount').hidden=!count;E('requestCount').textContent=count;
}

async function loadOpsAudit(){
 if(!st.token)return;
 const info=E('opsFeedback'),button=E('opsRefresh');button.disabled=true;info.textContent='Consultando API…';
 try{
  st.opsData=await api('operations-audit');renderOpsAudit();
  info.className='notice success';info.textContent='Atualizado em '+dt(st.opsData.generatedAt)+'. Pedidos marcados como teste são desconsiderados.';
 }catch(err){info.className='notice error';info.textContent='Falha ao carregar auditoria: '+s(err.message);}
 finally{button.disabled=false;}
}
function renderOpsAudit(){
 const d=st.opsData;if(!d)return;
 const o=d.orders||{},c=d.catalog||{},a=d.alerts||{};
 E('opsStats').innerHTML=[
  statsCard('🛒','Pedidos reais',n(o.total),'Sem pedidos de teste'),
  statsCard('⏳','Integração pendente',n(o.pending),'Aguardando conferência'),
  statsCard('🕒','Pendentes +10 min',n(o.pending_older),'Não indica venda perdida'),
  statsCard('🔁','Importando',n(o.importing),'Antigos: '+n(o.importing_older)),
  statsCard('🍝','Itens do catálogo',n(c.total),'Não publicados: '+n(c.unpublished)),
  statsCard('🚫','Indisponíveis',n(c.unavailable),'Inativos: '+n(c.inactive)),
  statsCard('🔔','Avisos pendentes',n(a.pending),'Múltiplas tentativas: '+n(a.retried)),
  statsCard('📱','Inscritos em push',n(a.pushDevices),'Dependente da configuração de envio')
 ].join('');
 const rows=(d.pendingOrders||[]).filter(x=>x.risk!=='IGNORE').map(x=>
  '<tr><td>'+esc(x.code)+'</td><td>'+badge(x.status)+'</td><td>'+badge(x.integrationStatus)+'</td><td>'+esc(dt(x.createdAt))+'</td><td>'+esc(x.ageMinutes)+' min</td><td>'+esc(x.risk==='CONFERIR_IMPORTACAO'?'Conferir importação':x.risk==='CONFERIR_PEDIDO'?'Conferir pedido':'Recente')+'</td></tr>');
 E('opsOrderList').innerHTML=table(['Pedido','Situação','Integração','Data','Idade','Diagnóstico'],rows);
 E('opsCatalogAlerts').innerHTML='<div class="grid stats">'+[
  statsCard('🔗','Itens sem ERP',n(c.withoutErpRecord),'Conferir cadastro'),
  statsCard('🕒','Última alteração',dt(c.lastChangedAt),'Catálogo publicado'),
  statsCard('📨','Fila de notificações',n(a.pending),'Não aciona mensagens manualmente')
 ].join('')+'</div>';
}
function render(){
 if(!st.token)return;
 if(st.view==='dashboard')renderOverview();
 if(st.view==='contacts')renderContacts();
 if(st.view==='ranking')renderRanking();
 if(st.view==='orders')renderOrders();
 if(st.view==='operations')renderOpsAudit();
 if(st.view==='menu')renderMenu();
 if(st.view==='products')renderProducts();
 if(st.view==='sales')renderSales();
 if(st.view==='merch')renderMerch();
 if(st.view==='fichas')renderFichas();
 if(st.view==='cashbacks')renderCashbacks();
 if(st.view==='coupons')renderCoupons();
 if(st.view==='blackfriday')renderBlackFriday();
 if(st.view==='sazonais')renderSeasonAdmin();
 if(st.view==='requests')renderRequests();
 E('apiLabel').textContent=st.api;
 E('apiState').innerHTML='<p class="notice '+(st.dataStatus==='offline'?'warn':st.dataStatus==='partial'?'warn':'success')+'">'+(st.dataStatus==='offline'?'Sem atualização nesta tentativa; dados anteriores preservados.':st.dataStatus==='partial'?'Consulta parcial — confira os módulos sinalizados.':'Última consulta: '+dt(st.lastUpdated)+'. Dados recebidos da API autenticada.')+'</p>';
}
async function loadAll(){
 if(st.syncing||!st.token)return;
 st.syncing=true;E('refreshBtn').disabled=true;E('lastSync').textContent='Sincronizando dados do Neon…';
 const paths=['summary','contacts','orders','catalog','requests','product-categories','product-drafts','merchandising','order-fulfillment'];
 const responses=await fetchDashboardGroups(paths);
 if(responses.slice(0,5).every(x=>x.status==='rejected'&&x.reason?.httpStatus===401)){
  logout();E('loginNotice').textContent='Sua sessão expirou. Entre novamente com o usuário e senha do ERP.';
  st.syncing=false;E('refreshBtn').disabled=false;return;
 }
 const errors=[],failedCore=[];
 for(let i=0;i<paths.length;i++){
 const x=responses[i],key=paths[i];
 if(x.status==='rejected'){
  if(!['product-categories','product-drafts','merchandising','order-fulfillment'].includes(key)){errors.push(key+': '+x.reason.message);failedCore.push(key);}
  continue;
 }
 const val=x.value;
 if(key==='summary')st.summary=val;
 if(key==='contacts')st.contacts=val.contacts||[];
 if(key==='orders')st.orders=val.orders||[];
 if(key==='catalog')st.catalog=val.items||[];
 if(key==='product-categories')st.categories=val.categories||[];
 if(key==='product-drafts')st.drafts=val.drafts||[];
 if(key==='merchandising'){st.merch={grades:val.grades||[],packs:val.packs||[]};st.merchLoaded=true;}
 if(key==='order-fulfillment')st.fulfillment=new Map((val.orders||[]).map(x=>[s(x.code),x]));
 if(key==='requests')updateRequestData(val);
 }
 const loadedCore=responses.slice(0,5).filter(x=>x.status==='fulfilled').length;
 const loaded=responses.filter(x=>x.status==='fulfilled').length;
 if(loadedCore)st.lastUpdated=new Date();
 st.dataStatus=!loadedCore?'offline':failedCore.length?'partial':'ok';
 const missing=failedCore.map(x=>({summary:'Visão geral',contacts:'Clientes',orders:'Pedidos',catalog:'Produtos',requests:'Solicitações'}[x]||x));
 E('lastSync').textContent=!loadedCore
  ?'Dados principais indisponíveis • '+(st.lastUpdated?'Última consulta válida: '+dt(st.lastUpdated):'Sem consulta válida')
  :'Última atualização: '+dt(st.lastUpdated)+' • '+(failedCore.length?'Dados parciais':'Dados principais atualizados');
 E('sideSync').textContent=!loadedCore?'⚠ Sem atualização':failedCore.length?'Atualização parcial':'✓ Sincronizado';
 const notice=E('globalNotice');
 notice.className='notice'+(!loadedCore||failedCore.length?' error':'');
 notice.textContent=!loadedCore
  ?'⚠️ A conexão com as consultas principais falhou nesta tentativa. Sua sessão e os dados anteriores foram preservados. Verifique a conexão e toque em Atualizar.'
  :failedCore.length?'⚠️ Falha temporária em '+missing.join(', ')+'. Os outros módulos foram atualizados. Toque em Atualizar para tentar novamente.'
  :'Dados consultados pela API autenticada. Os pings não representam visitas nem instalações confirmadas.';
 E('loginScreen').hidden=true;
 st.syncing=false;E('refreshBtn').disabled=false;render();
}
async function refreshOrdersAfterRejection(event){
 // A API já confirmou a recusa: não reenviar o POST nem recarregar a página.
 const code=s(event?.detail?.code).trim();
 if(!code||!st.token)return;
 try{
  const results=await Promise.allSettled([api('orders'),api('order-fulfillment')]);
  if(results[0].status!=='fulfilled')throw results[0].reason;
  st.orders=results[0].value.orders||[];
  if(results[1].status==='fulfilled')st.fulfillment=new Map((results[1].value.orders||[]).map(x=>[s(x.code),x]));
  else st.fulfillment.delete(code);
  st.lastUpdated=new Date();
  if(st.view==='orders')renderOrders();else nav('orders');
  toast('✅ Pedido #'+code+' recusado. A Central continua conectada.');
 }catch(error){
  toast('Pedido #'+code+' recusado no servidor, mas a lista não atualizou. Toque em Atualizar.',true);
 }
}
function updateRequestData(d){
 const rows=d.requests||[];
 const pending=rows.filter(x=>!x.handled);
 if(st.knownReady){const fresh=pending.filter(x=>!st.known.has(s(x.id)));if(fresh.length)notifyRequests(fresh);}
 st.known=new Set(pending.map(x=>s(x.id)));st.knownReady=true;st.requests=rows;
}
function beep(){
 if(!st.sound)return;
 try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;const ctx=new AC(),os=ctx.createOscillator(),gain=ctx.createGain();os.type='sine';os.frequency.value=660;gain.gain.value=.06;os.connect(gain);gain.connect(ctx.destination);os.start();os.stop(ctx.currentTime+.25);setTimeout(()=>ctx.close(),600);}catch(_){}
}
function notifyRequests(list){
 toast('🔔 '+list.length+' novo(s) pedido(s) de cardápio!',false);beep();
 if('Notification'in window&&Notification.permission==='granted')try{new Notification('Caseirinho • Novo pedido de cardápio',{body:list.length+' solicitação(ões) aguardando atendimento.'})}catch(_){}
}
async function loadRequests(){
 if(!st.token||st.syncing||document.visibilityState==='hidden')return;
 try{const d=await api('requests');updateRequestData(d);if(st.view==='dashboard'||st.view==='requests')render();}
 catch(e){E('sideSync').textContent='Falha na consulta de alertas';}
}
function openWhats(phone,text){
 const p=digits(phone);
 if(!/^[1-9][0-9]{9,10}$/.test(p)){toast('WhatsApp inválido neste contato.',true);return;}
 const url='https://wa.me/55'+p+'?text='+encodeURIComponent(text);
 const tab=window.open(url,'_blank','noopener,noreferrer');
 if(!tab)location.href=url;
}
function clientFor(phone){return st.contacts.find(x=>digits(x.phone)===digits(phone))||{phone,name:st.requests.find(x=>digits(x.phone)===digits(phone))?.name||'Cliente'};}
function hello(c){
 return 'Oi, '+first(c.name)+'! 💚 Tudo bem?\n\nAqui é a família do *Caseirinho Massas Artesanais*! 🍝🥰\n\nQue alegria ter você por aqui! Preparamos nossas delícias com aquele gostinho de comida caseira, sempre com muito carinho. 🏡❤️\n\nSe quiser conferir os sabores ou fazer um pedido, nosso aplicativo está aqui:\n'+STORE+'\n\nSe precisar de ajuda, pode contar com a gente!\n\n*Podemos te enviar novidades e ofertas de vez em quando?* Se quiser, responda QUERO. 💚\n\nCaseirinho — nossa família para a sua!';
}
function prepareMenu(phone){
 const c=clientFor(phone);if(c.optout){toast('Contato marcado como não contatar.',true);return;}
 const parts=menuParts(c);
 const controls=parts.map((text,i)=>'<button class="btn whatsapp" data-action="part" data-phone="'+esc(c.phone)+'" data-index="'+i+'">💬 Enviar parte '+(i+1)+' de '+parts.length+'</button>').join(' ');
 modal('🍝 Enviar cardápio para '+c.name,'<p>O WhatsApp será aberto com o cardápio escrito e o link da loja. Revise os preços antes de confirmar cada parte.</p><p class="notice">'+(warnings().length?'⚠️ Existem divergências entre preços publicados e valores solicitados. Verifique antes do envio.':'Confira o texto e confirme o envio manualmente.')+'</p>'+controls);
 window.__menuParts=parts;
}
async function markHandled(id){
 try{await api('requests/'+encodeURIComponent(id)+'/handled',{method:'POST'});toast('Solicitação marcada como atendida.');await loadRequests();}
 catch(e){toast('Não foi possível marcar como atendida: '+e.message,true);}
}
function csv(){
 const heads=['Nome','WhatsApp','Registros','Pedidos','Visitas comprovadas','Último cadastro','Último pedido','Opt-in marketing','Não contatar'];
 const lines=[heads,...st.contacts.map(x=>[x.name,x.phone,x.registrations,x.orders,x.visits,dt(x.last_registration),dt(x.last_order),x.marketing_optin?'sim':'não',x.optout?'sim':'não'])];
 const data='\ufeff'+lines.map(row=>row.map(z=>'"'+s(z).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([data],{type:'text/csv;charset=utf-8'}));
 const link=document.createElement('a');link.href=url;link.download='caseirinho-contatos-'+new Date().toISOString().slice(0,10)+'.csv';link.click();URL.revokeObjectURL(url);
}

function renderProducts(){
 window.CaseirinhoCategoryManager?.render?.();
 const q=s(E('productSearch')?.value).toLowerCase().trim(),select=E('productCategory'),prev=select.value,filter=E('productStatus')?.value||'all';
 const cats=[...new Set(st.catalog.map(x=>x.category))].sort((a,b)=>s(a).localeCompare(s(b),'pt-BR'));
 select.innerHTML='<option value="all">Todas as categorias</option>'+cats.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 if(cats.includes(prev))select.value=prev;else select.value='all';
 const selected=st.catalog.filter(x=>(select.value==='all'||x.category===select.value)&&
  (filter==='all'||filter==='inactive'&&x.active===false||filter==='unavailable'&&x.active!==false&&x.availableForSale===false||filter==='active'&&x.active!==false&&x.availableForSale!==false)&&
  (s(x.name)+' '+s(x.category)+' '+s(x.variation)).toLowerCase().includes(q));
 E('productsCount').textContent=selected.length+' produto(s) · '+st.catalog.filter(x=>x.active===false).length+' inativos · '+st.catalog.filter(x=>x.active!==false&&x.availableForSale===false).length+' indisponíveis';
 renderDrafts();
 if(!selected.length){E('productsList').innerHTML=cellEmpty('Não há produtos com esses critérios.');return;}
 E('productsList').innerHTML='<div class="product-card-grid">'+selected.map(x=>
 '<article class="product-card"><div><div class="product-photo">'+(x.image?'<img src="'+esc(x.image)+'" alt="Foto de '+esc(x.name)+'" loading="lazy">':'<span>📷 Sem foto</span>')+'</div><span class="badge light">'+esc(x.category)+'</span> '+(x.active===false?'<span class="badge warn">⛔ INATIVO — oculto na loja</span>':x.availableForSale===false?'<span class="badge warn">🚫 INDISPONÍVEL — visível, sem compra</span>':'<span class="badge good">✅ À venda</span>')+' '+(x.promotionActive?'<span class="badge warn">Promoção ativa</span>':'')+
 '<h3>'+esc(x.name)+'</h3><small class="muted">'+esc(x.variation||x.availability||'')+'</small>'+(x.erpName&&x.erpName!==x.name?'<p class="muted" style="margin:4px 0">ERP: '+esc(x.erpName)+'</p>':'')+'</div>'+
 '<div class="price-row"><b>'+brl(x.price)+'</b><span>Pedido mín: '+n(x.minimum)+' · máx: '+(n(x.maximum)||'Sem limite')+'</span></div>'+
  '<p class="muted" style="margin:5px 0 7px">📦 Estoque ERP — mínimo: <b>'+qtyBR(x.stockMinimum)+'</b> · máximo: <b>'+qtyBR(x.stockMaximum)+'</b></p>'+
  '<p class="product-description-preview" title="Descrição comercial da loja">'+(x.description?esc(x.description):'<em>Sem descrição comercial</em>')+'</p>'+
 '<button class="btn primary" type="button" data-action="editProduct" data-product="'+esc(x.id)+'">✏️ Preço / Situação</button>'+
  '<button class="btn" type="button" data-action="descriptionProduct" data-product="'+esc(x.id)+'">📝 Nome / Descrição</button>'+
  '<button class="btn gold" type="button" data-action="photosProduct" data-product="'+esc(x.id)+'">📷 Alterar fotos</button></article>'
 ).join('')+'</div>';
}

function renderDrafts(){
 const e=E('draftProducts');if(!e)return;
 const drafts=st.drafts||[];
 e.innerHTML=drafts.length?'<div class="card" style="margin-bottom:16px"><h3>🗂️ Rascunhos de produtos ('+drafts.length+')</h3><p>Não aparecem para o cliente até a publicação.</p><div class="mobile-list">'+drafts.map(p=>
 '<div class="mobile-record"><div class="mobile-record-head"><b>'+esc(p.name)+'</b><span class="badge warn">Rascunho</span></div>'+
 '<p>'+esc(p.category)+' · '+brl(p.price)+' · '+(p.images||[]).length+' foto(s)</p>'+
 '<div class="record-actions"><button class="btn small" data-action="photosProduct" data-product="'+esc(p.id)+'">📷 Fotos</button>'+
 '<button class="btn small primary" data-action="publishDraft" data-product="'+esc(p.id)+'">🚀 Publicar na loja</button></div></div>').join('')+'</div></div>':'';
}
let previewURLs=[];
function clearPhotoPreviews(){previewURLs.forEach(url=>URL.revokeObjectURL(url));previewURLs=[];}
function previewFiles(files,target){
 clearPhotoPreviews();
 const el=E(target);if(!el)return;
 const a=Array.from(files||[]).slice(0,5);
 el.innerHTML=a.length?'<div class="photo-preview">'+a.map(x=>{
  const u=URL.createObjectURL(x);previewURLs.push(u);
  return '<div><img src="'+esc(u)+'" alt="Foto selecionada"><small>'+esc(x.name)+'</small></div>';
 }).join('')+'</div>':'<span class="muted">Nenhuma foto escolhida.</span>';
}
function categoryOptions(){
 return (st.categories||[]).filter(x=>x.legacy!==true&&x.active!==false).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');
}
function openCreateProduct(){
 if(!st.categories.length){toast('As categorias não foram carregadas. Atualize a Central e confira seu acesso administrativo.',true);return;}
 const html='<div class="notice success"><b>Cadastro integrado:</b> o novo produto terá código próprio no ERP e poderá ser publicado imediatamente no aplicativo Caseirinho. As fotos ficarão no banco da loja.</div>'+
 '<form id="productCreateForm" class="product-form">'+
 '<label for="newProductName" class="form-label">Nome do produto *</label><input id="newProductName" name="name" required maxlength="160" placeholder="Ex.: Empadão de Frango 500 g">'+
 '<label for="newProductShort" class="form-label">Nome comercial (opcional)</label><input id="newProductShort" name="shortName" maxlength="160" placeholder="Como aparecerá na vitrine">'+
 '<div class="form-grid"><div><label for="newProductCategory" class="form-label">Categoria *</label><select id="newProductCategory" name="categoryId" required><option value="">Selecione…</option>'+categoryOptions()+'</select></div>'+
 '<div><label for="newProductUnit" class="form-label">Unidade *</label><select id="newProductUnit" name="unit"><option value="UN">Unidade (UN)</option><option value="KG">Quilograma (KG)</option><option value="G">Grama (G)</option><option value="PCT">Pacote (PCT)</option><option value="CX">Caixa (CX)</option><option value="L">Litro (L)</option><option value="ML">Mililitro (ML)</option></select></div></div>'+
 '<label for="newProductDescription" class="form-label">Descrição para o cliente</label><textarea id="newProductDescription" name="description" rows="3" maxlength="1200" placeholder="Ingredientes, recheio, peso aproximado, modo de preparo…"></textarea>'+
 '<div class="form-grid"><div><label class="form-label" for="newProductPrice">Preço de venda (R$) *</label><input id="newProductPrice" name="price" inputmode="decimal" type="number" min=".01" step=".01" required placeholder="29,99"></div><div><label class="form-label" for="newProductCost">Custo estimado (R$) — opcional</label><input id="newProductCost" name="cost" inputmode="decimal" type="number" min="0" step=".01" value="0"></div></div>'+
 '<div class="form-grid"><div><label class="form-label" for="newProductMinimum">Quantidade mínima</label><input id="newProductMinimum" name="minimum" type="number" min=".01" step=".01" value="1" required></div><div><label class="form-label" for="newProductMaximum">Quantidade máxima (0 = sem limite)</label><input id="newProductMaximum" name="maximum" type="number" min="0" step=".01" value="0" required></div></div>'+
 '<div class="form-grid"><div><label class="form-label" for="newProductAvailability">Disponibilidade</label><select id="newProductAvailability" name="availability"><option value="AMBOS">Pronta entrega ou encomenda</option><option value="PRONTA_ENTREGA">Pronta entrega</option><option value="SOB_ENCOMENDA">Sob encomenda</option></select></div><div><label class="form-label" for="newProductLead">Antecedência (dias)</label><input id="newProductLead" name="leadDays" type="number" min="0" max="120" step="1" value="0"></div></div>'+
 '<label class="form-label" for="newProductPhotos">📸 Fotos do produto (1 a 5)</label><input id="newProductPhotos" type="file" accept="image/png,image/jpeg,image/webp,image/*" multiple>'+
 '<small class="muted">A primeira foto será a principal. Escolha da galeria ou tire com a câmera. As imagens serão otimizadas antes do envio.</small>'+
 '<div id="newProductPhotoPreview" class="photo-preview-wrap"></div>'+
 '<div class="form-toggles"><label><input type="checkbox" name="featured"> ⭐ Destacar na vitrine</label>'+
 '<label><input type="checkbox" name="newItem"> ✨ Marcar como novidade</label>'+
 '<label><input type="checkbox" id="newProductPublish" name="publish" checked> 🚀 Publicar agora na loja</label></div>'+
 '<div class="notice"><b>Publicação:</b> para aparecer no e-commerce, selecione ao menos uma foto. Se ainda não estiver pronto, desmarque Publicar agora para salvar como rascunho.</div>'+
 '<button type="submit" class="btn primary" style="width:100%">💾 Cadastrar e salvar</button></form>';
 modal('➕ Cadastrar produto',html);
}
async function compressImage(file){
 if(!file||!file.type.startsWith('image/'))throw Error('Selecione um arquivo de imagem.');
 if(file.size>16000000)throw Error('Esta foto é muito grande. Selecione imagem com menos de 16 MB.');
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.decoding='async';img.src=url;
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Não foi possível ler a imagem.'));});
  let scale=Math.min(1,1400/Math.max(img.naturalWidth,img.naturalHeight));
  let data='';
  for(let turn=0;turn<4;turn++){
   const canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Seu navegador não conseguiu preparar a foto.');
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
   data=canvas.toDataURL('image/jpeg',Math.max(.5,.85-turn*.12));
   if((data.length*.75)<2350000)break;
   scale*=.75;
  }
  if(data.length*.75>2500000)throw Error('Não foi possível reduzir esta foto para o limite de 2,5 MB.');
  return {filename:s(file.name||'foto')+'.jpg',dataUrl:data};
 }finally{URL.revokeObjectURL(url);}
}
async function photosPayload(input){
 const files=Array.from(input?.files||[]);
 if(files.length>5)throw Error('É permitido escolher até cinco fotos.');
 const output=[];for(const file of files)output.push(await compressImage(file));
 return output;
}
async function saveNewProduct(event){
 event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]');
 button.disabled=true;button.textContent='Preparando fotos e salvando…';
 try{
  const fd=new FormData(form),publish=E('newProductPublish').checked;
  const images=await photosPayload(E('newProductPhotos'));
  if(publish&&!images.length)throw Error('Selecione ao menos uma foto para publicar na loja.');
  const payload={name:s(fd.get('name')),shortName:s(fd.get('shortName')),description:s(fd.get('description')),
   categoryId:s(fd.get('categoryId')),unit:s(fd.get('unit')),price:Number(fd.get('price')),cost:Number(fd.get('cost')||0),
   minimum:Number(fd.get('minimum')),maximum:Number(fd.get('maximum')),availability:s(fd.get('availability')),
   leadDays:Number(fd.get('leadDays')||0),featured:fd.get('featured')==='on',newItem:fd.get('newItem')==='on',publish,images};
  if(!window.confirm('Confirmar cadastro de '+payload.name+' por '+brl(payload.price)+'? '+(publish?'O produto será publicado no e-commerce.':'Será salvo apenas como rascunho.')))return;
  const out=await api('products',{method:'POST',body:payload});
  clearPhotoPreviews();hideModal();toast(out.published?'✅ Produto publicado na loja! Código '+out.code:'✅ Rascunho salvo. Código '+out.code);
  await loadAll();nav('products');
 }catch(err){toast('Falha ao cadastrar: '+err.message,true);}
 finally{button.disabled=false;button.textContent='💾 Cadastrar e salvar';}
}
function editProductPhotos(id){
 const product=st.catalog.find(x=>x.id===id)||st.drafts.find(x=>x.id===id);
 if(!product)return toast('Produto não encontrado. Atualize a Central.',true);
 modal('📷 Fotos de '+s(product.name),
 '<p>Troque as fotos de <b>'+esc(product.name)+'</b>. A primeira imagem será a principal. As novas imagens substituirão a galeria anterior.</p>'+
 (product.image?'<div class="product-photo"><img src="'+esc(product.image)+'" alt="Foto atual do produto"></div>':'')+
 '<form id="productPhotoForm" data-product="'+esc(id)+'" class="product-form"><label class="form-label" for="replacePhotos">Selecionar de 1 a 5 fotos</label>'+
 '<input id="replacePhotos" type="file" accept="image/png,image/jpeg,image/webp,image/*" multiple required>'+
 '<div id="replacePhotoPreview" class="photo-preview-wrap"></div><p class="muted">As fotos são otimizadas e armazenadas no Caseirinho. Nenhuma alteração será feita antes da sua confirmação.</p>'+
 '<button class="btn primary" type="submit">✅ Salvar fotos no ERP e na loja</button></form>');
}
async function saveProductPhotos(event){
 event.preventDefault();const form=event.target,id=form.dataset.product,btn=form.querySelector('[type=submit]');
 btn.disabled=true;btn.textContent='Otimizando fotos…';
 try{
  const images=await photosPayload(E('replacePhotos'));
  if(!images.length)throw Error('Selecione pelo menos uma foto.');
  if(!window.confirm('Substituir a galeria atual do produto pelas '+images.length+' foto(s) escolhida(s)?'))return;
  const result=await api('products/'+encodeURIComponent(id)+'/photos',{method:'PATCH',body:{images}});
  hideModal();clearPhotoPreviews();toast(result.published?'✅ Fotos publicadas na loja!':'✅ Fotos adicionadas ao rascunho.');
  await loadAll();nav('products');
 }catch(err){toast('Falha ao salvar fotos: '+err.message,true);}
 finally{btn.disabled=false;btn.textContent='✅ Salvar fotos no ERP e na loja';}
}
async function publishDraft(id){
 const draft=st.drafts.find(x=>x.id===id);if(!draft)return toast('Rascunho indisponível. Atualize.',true);
 if(!draft.images?.length){toast('Inclua pelo menos uma foto antes de publicar.',true);editProductPhotos(id);return;}
 if(!window.confirm('Publicar '+draft.name+' por '+brl(draft.price)+' no aplicativo Caseirinho?'))return;
 try{await api('products/'+encodeURIComponent(id)+'/publish',{method:'PATCH',body:{}});toast('✅ Produto publicado no e-commerce!');await loadAll();nav('products');}
 catch(err){toast('Não foi possível publicar: '+err.message,true);}
}
function editProduct(id){
 const x=st.catalog.find(p=>p.id===id);if(!x)return toast('Produto não localizado; atualize o cadastro.',true);
 const html='<div class="notice">Você está alterando o cadastro principal do ERP e o catálogo publicado da loja. Confirme os valores antes de salvar.</div>'+
 '<form id="productEditForm" data-product="'+esc(x.id)+'"><p><b>'+esc(x.name)+'</b><br><small>'+esc(x.category)+' · '+esc(x.variation||'')+'</small></p>'+
 '<label class="form-label" for="editCategory">🏷️ Categoria do e-commerce</label>'+
  '<select id="editCategory" required>'+
  (st.categories||[]).concat((st.categories||[]).some(c=>s(c.id)===s(x.categoryId))||!x.categoryId?[]:[{id:x.categoryId,name:x.category||'Categoria atual'}]).map(c=>'<option value="'+esc(c.id)+'" '+(s(c.id)===s(x.categoryId)?'selected':'')+'>'+esc(c.name)+(c.legacy?' (antiga)':'')+'</option>').join('')+
  '</select><p class="muted">Mude a categoria aqui para poder excluir categorias antigas sem perder produtos.</p>'+
  '<label class="form-label" for="editPrice">💰 Preço de venda (R$)</label>'+
 '<input id="editPrice" type="number" min="0.01" max="1000000" step="0.01" inputmode="decimal" required value="'+n(x.price)+'">'+
 '<label class="form-label" for="editMinimum">📦 Quantidade mínima por pedido</label>'+
 '<input id="editMinimum" type="number" min="0.01" max="99999" step="0.01" inputmode="decimal" required value="'+n(x.minimum||1)+'">'+
 '<label class="form-label" for="editMaximum">📦 Quantidade máxima (0 = sem limite)</label>'+
 '<input id="editMaximum" type="number" min="0" max="99999" step="0.01" inputmode="decimal" required value="'+n(x.maximum)+'">'+
  '<div class="notice"><b>📦 Estoque do produto no ERP:</b> mínimo <b>'+qtyBR(x.stockMinimum)+'</b> · máximo <b>'+qtyBR(x.stockMaximum)+'</b>.'+
  '<br><small>Esses valores são diferentes da quantidade mínima/máxima de compra acima. Para alterar a reposição, utilize Vendas & Estoque.</small>'+
  '<br><button type="button" class="btn small" data-action="goStockSales">📈 Abrir Vendas & Estoque</button></div>'+
 '<div class="product-lifecycle-controls"><label class="form-label" for="editActive">🏷️ Situação do produto no ERP</label>'+
 '<select id="editActive"><option value="true" '+(x.active!==false?'selected':'')+'>✅ ATIVO — aparece na loja</option><option value="false" '+(x.active===false?'selected':'')+'>⛔ INATIVO — não aparece na loja</option></select>'+
 '<label class="form-label" for="editAvailable">🛍️ Disponibilidade de venda</label>'+
 '<select id="editAvailable"><option value="true" '+(x.availableForSale!==false?'selected':'')+'>✅ DISPONÍVEL — permite compra</option><option value="false" '+(x.availableForSale===false?'selected':'')+'>🚫 INDISPONÍVEL — tarja na loja, bloqueia compra</option></select>'+
 '<p class="notice">As opções são independentes: inativar oculta o produto; indisponível mantém visível, mas impede adicionar ao carrinho. O ERP é a fonte oficial.</p></div>'+
 (x.promotionActive?'<div class="notice">⚠️ Há promoção ativa neste produto. O preço promocional deve ser conferido separadamente no ERP.</div>':'')+
 '<p class="muted">Alteração registrada com data e usuário. Se outro operador modificar o produto, a gravação será recusada para evitar conflito.</p>'+
 '<div id="productSaveStatus" class="notice" role="status" hidden></div>'+
 '<div class="toolbar"><button class="btn primary" type="submit">✅ Salvar no ERP e na loja</button><button class="btn" type="button" id="verifyProductTerms">🔎 Conferir preço publicado</button></div></form>';
 modal('✏️ Editar produto',html);
}
function editProductDescription(id){
  const p=st.catalog.find(x=>s(x.id)===s(id));
  if(!p)return toast('Produto não encontrado. Atualize Produtos e preços.',true);
  modal('📝 Nome e descrição do produto — '+p.name,
   '<div class="notice">Altere o nome cadastrado no ERP, o nome comercial que aparece na loja e o texto apresentado ao cliente. Preço, fotos, categoria e estoque permanecem inalterados.</div>'+
   '<form id="productDescriptionEditForm" data-product="'+esc(p.id)+'">'+
   '<p><b>'+esc(p.name)+'</b><br><small>'+esc(p.category)+'</small></p>'+
   '<label class="form-label" for="productERPName">Nome do produto no ERP</label>'+
   '<input id="productERPName" type="text" required maxlength="220" value="'+esc(p.erpName||p.name)+'" placeholder="Nome principal do produto no ERP">'+
   '<label class="form-label" for="productStoreName">Nome comercial exibido na loja</label>'+
   '<input id="productStoreName" type="text" required maxlength="160" value="'+esc(p.name)+'" placeholder="Título do produto que o cliente visualiza">'+
   '<label class="form-label" for="productDescriptionText">Descrição apresentada ao cliente</label>'+
   '<textarea id="productDescriptionText" maxlength="1200" rows="7" placeholder="Ex.: Massa artesanal, recheio cremoso, ingredientes, peso aproximado e orientações de preparo.">'+esc(p.description||'')+'</textarea>'+
   '<p class="muted"><span id="productDescriptionLength">'+s((p.description||'').length)+'</span>/1200 caracteres · Descreva ingredientes, recheio, tamanho e diferenciais.</p>'+
   '<div id="productDescriptionSaveStatus" class="notice" hidden role="status"></div>'+
   '<div class="toolbar"><button class="btn primary" type="submit">💾 Salvar nome e descrição no ERP e na loja</button>'+
   '<button class="btn" type="button" data-action="closeModal">Cancelar</button></div></form>');
  E('productERPName')?.focus?.();
}
async function saveProductDescription(event){
  event.preventDefault();
  const form=event.target,pid=s(form?.dataset.product);
  const current=st.catalog.find(x=>s(x.id)===pid);
  if(!current)return toast('Produto desatualizado. Atualize a lista antes de editar.',true);
  const value=E('productDescriptionText')?.value;
  if(typeof value!=='string')return;
  const normalizeName=value=>s(value).replace(/\s+/g,' ').trim();
  const description=value.trim().replace(/\r\n/g,'\n');
  const erpName=normalizeName(E('productERPName')?.value);
  const storeName=normalizeName(E('productStoreName')?.value);
  const status=E('productDescriptionSaveStatus'),button=form.querySelector('[type="submit"]');
  if(!erpName||erpName.length>220)return toast('Nome ERP obrigatório (até 220 caracteres).',true);
  if(!storeName||storeName.length>160)return toast('Nome da loja obrigatório (até 160 caracteres).',true);
  if(description.length>1200)return toast('A descrição deve ter até 1200 caracteres.',true);
  const nameChanged=erpName!==s(current.erpName||current.name).trim()||storeName!==s(current.name).trim();
  const descriptionChanged=description!==s(current.description).trim();
  if(!nameChanged&&!descriptionChanged)return toast('Nome e descrição já estão atualizados.');
  if(!description&&descriptionChanged&&!window.confirm('Remover a descrição comercial deste produto?'))return;
  if(button.disabled)return;
  button.disabled=true;button.textContent='Salvando e conferindo...';
  const feedback=(message,type='warn')=>{if(status){status.hidden=false;status.className='notice '+type;status.textContent=message;}};
  let wrote=false;
  try{
   await api('catalog/'+encodeURIComponent(pid)+'/description',
    {method:'PATCH',body:{description,erpName,storeName,expectedUpdatedAt:current.updatedAt}});
   wrote=true;
  }catch(err){
   if(!err.networkError){feedback('Nome/descrição não salvos: '+err.message,'error');button.disabled=false;button.textContent='💾 Salvar nome e descrição';return;}
   feedback('A conexão caiu durante a gravação. Verificando o catálogo antes de permitir outra tentativa.');
  }
  let fresh=null;
  try{fresh=await getVerifiedProduct(pid)}catch(err){
   feedback('A alteração pode ter sido recebida, mas não foi possível conferir a publicação: '+err.message+
     '. Atualize o cadastro antes de tentar novamente.');
   button.disabled=false;button.textContent='🔎 Conferir e salvar';return;
  }
  if(fresh&&s(fresh.description).trim()===description&&s(fresh.erpName).trim()===erpName&&s(fresh.name).trim()===storeName){
   st.catalog=st.catalog.map(x=>s(x.id)===pid?{...x,...fresh}:x);
   hideModal();
   toast(nameChanged?'✅ Nomes atualizados e conferidos no ERP e na loja!'+(descriptionChanged?' Descrição também atualizada.':''):
    '✅ Descrição atualizada e conferida no ERP e na loja!');
   try{await loadAll()}catch(_){}
   nav('products');return;
  }
  feedback(wrote?
   'O servidor recebeu a gravação, mas a consulta ainda não confirmou nome e descrição. Atualize os produtos antes de repetir.':
   'O nome ou a descrição publicados ainda estão diferentes. Atualize e confira antes de tentar novamente.','warn');
  button.disabled=false;button.textContent='💾 Salvar nome e descrição';
}
function productTermsMatch(product,price,minimum,maximum,active,availableForSale){
 if(!product)return false;
 return [n(product.price),n(product.minimum),n(product.maximum)].every((v,i)=>
  Math.abs(v-[price,minimum,maximum][i])<0.0001)&&product.active===active&&product.availableForSale===availableForSale;
}
async function getVerifiedProduct(id){
 // Always consult the server, never trust a local product card or cached GET for save verification.
 const fresh=await api('catalog');
 return (fresh.items||[]).find(x=>s(x.id)===s(id))||null;
}
async function verifyProductTerms(){
 const form=E('productEditForm');if(!form)return;
 const id=form.dataset.product,button=E('verifyProductTerms'),status=E('productSaveStatus');
 const expected={price:Number(E('editPrice').value),minimum:Number(E('editMinimum').value),maximum:Number(E('editMaximum').value),active:E('editActive').value==='true',availableForSale:E('editAvailable').value==='true',categoryId:E('editCategory')?.value||''};
 const original=button.textContent;button.disabled=true;button.textContent='Conferindo...';
 try{
  const published=await getVerifiedProduct(id);
  if(!published)throw Error('Produto não localizado na loja. Atualize o cadastro.');
  status.hidden=false;
  if(productTermsMatch(published,expected.price,expected.minimum,expected.maximum,expected.active,expected.availableForSale)&&(!expected.categoryId||published.categoryId===expected.categoryId)){
   status.className='notice success';
   status.textContent='✅ CONFIRMADO no ERP/e-commerce: '+brl(published.price)+' · '+(published.active?'ATIVO':'INATIVO')+' · '+(published.availableForSale?'DISPONÍVEL':'INDISPONÍVEL')+'.';
   st.catalog=st.catalog.map(x=>x.id===id?{...x,...published}:x);
  }else{
   status.className='notice warn';
   status.textContent='⚠️ Ainda NÃO corresponde ao que está preenchido. Valor publicado: '+brl(published.price)+' · mínimo '+published.minimum+' · máximo '+published.maximum+'. O formulário foi mantido sem reenviar nada.';
  }
 }catch(error){
  status.hidden=false;status.className='notice error';
  status.textContent='Não foi possível consultar o valor publicado: '+error.message+'. Aguarde a conexão voltar; nenhum dado foi reenviado.';
 }finally{button.disabled=false;button.textContent=original;}
}
async function saveProduct(e){
 e.preventDefault();
 const form=e.target,productId=form?.dataset.product;
 const x=st.catalog.find(v=>v.id===productId);
 if(!x)return toast('Produto desatualizado. Atualize antes de salvar.',true);
 const price=Number(E('editPrice').value),minimum=Number(E('editMinimum').value),maximum=Number(E('editMaximum').value),active=E('editActive').value==='true',availableForSale=E('editAvailable').value==='true',categoryId=E('editCategory')?.value||x.categoryId,categoryChanged=categoryId&&categoryId!==x.categoryId;
 if(!Number.isFinite(price)||price<=0||!Number.isFinite(minimum)||minimum<=0||!Number.isFinite(maximum)||maximum<0||(maximum>0&&maximum<minimum)){
  toast('Preencha valores válidos. Máximo deve ser zero ou maior que o mínimo.',true);return;
 }
 if(categoryChanged&&!st.categories.some(c=>c.id===categoryId))return toast('Categoria não encontrada. Atualize.',true);
 if(!window.confirm('Confirmar alteração de '+x.name+'? Categoria '+s(st.categories.find(c=>c.id===categoryId)?.name||x.category)+' · Preço '+brl(price)+' · '+(active?'ATIVO':'INATIVO (oculto)')+' · '+(availableForSale?'DISPONÍVEL':'INDISPONÍVEL (bloqueia compra)')+'. Isso será gravado no ERP e replicado para a loja.'))return;
 const button=form.querySelector('[type=submit]'),message=E('productSaveStatus');
 const feedback=(text,cls='warn')=>{if(message){message.hidden=false;message.className='notice '+cls;message.textContent=text;}};
 const original=button.textContent;
 button.disabled=true;button.textContent='Verificando gravação…';
 feedback('Enviando alteração para o ERP e o e-commerce…');
 let reply=null,networkError=null;
 try{reply=await api('catalog/'+encodeURIComponent(productId)+'/terms',{method:'PATCH',body:{price,minimum,maximum,active,availableForSale,...(categoryChanged?{categoryId}:{}),expectedUpdatedAt:x.updatedAt}});}
 catch(err){if(!err.networkError){feedback('Alteração não salva: '+err.message,'error');toast('Não foi possível salvar: '+err.message,true);button.disabled=false;button.textContent=original;return;}networkError=err;}
 let verified=null,verificationError=null;
 try{verified=await getVerifiedProduct(productId);}catch(err){verificationError=err;}
 // A lost response may follow a committed write; verifying avoids accidental double saves.
 if(verified&&productTermsMatch(verified,price,minimum,maximum,active,availableForSale)&&(!categoryChanged||verified.categoryId===categoryId)){
  st.catalog=st.catalog.map(p=>p.id===productId?{...p,...verified}:p);
  hideModal();toast('✅ Preço, atividade e disponibilidade confirmados no ERP e na loja!');
  if(reply?.warning)toast(reply.warning,true);
  // Saving succeeded: a later refresh failure must not be presented as a failed save.
  try{await loadAll();}catch(_){}nav('products');return;
 }
 if(reply){
  // Server returned success but a read can be interrupted or delayed; never claim publication without proof.
  feedback(verificationError
   ?'O servidor recebeu a alteração, mas a conferência final falhou. Atualize quando a internet estabilizar antes de enviar novamente.'
   :'A API recebeu o cadastro, porém o catálogo retornou valores diferentes. Atualize os produtos antes de tentar novamente.','warn');
 }else if(verified){
  feedback('A tentativa não foi concluída. O catálogo ainda informa '+brl(verified.price)+' para este produto. Seus dados continuam preenchidos; confira e toque Salvar novamente.','error');
 }else{
  feedback((networkError?.message||'Falha de conexão')+' Não tente enviar repetidas vezes: primeiro recarregue quando a internet estiver disponível.','error');
 }
 button.disabled=false;button.textContent=original;
}
function itemListHtml(order){
 const lines=(Array.isArray(order.items)?order.items:[]).map(x=>'<tr><td>'+esc(x.name||x.code)+'</td><td>'+n(x.quantity)+'</td><td>'+brl(x.unitPrice)+'</td><td>'+brl(x.total)+'</td></tr>');
 return '<div class="table-wrap"><table class="table"><thead><tr><th>Produto</th><th>Qtde.</th><th>Unitário</th><th>Total</th></tr></thead><tbody>'+lines.join('')+'</tbody></table></div>';
}
function orderDetailsHtml(order){
 return '<p><b>Pedido #'+esc(order.code||'—')+'</b> • '+dt(order.created_at)+'</p>'+
 '<p><b>Cliente:</b> '+esc(order.name||'Não informado')+'<br><b>WhatsApp:</b> '+esc(tel(order.phone))+
 '<br><b>Status:</b> '+esc(order.status||'—')+' · <b>Integração:</b> '+esc(order.integration_status||'—')+
 '<br><b>Pagamento:</b> '+esc(order.payment||'Não informado')+'<br><b>Modalidade:</b> '+esc(order.modality||'—')+'</p>'+
 itemListHtml(order)+
 '<p><b>Subtotal:</b> '+brl(order.subtotal)+'<br><b>Frete:</b> '+brl(order.freight)+
 '<br><b>Desconto promocional informado:</b> '+brl(order.discount)+
 '<br><b>Total do pedido:</b> '+brl(order.total)+'</p>';
}
function isMercadoPagoOrder(order){
 return /MERCADO\s*PAGO|MERCADOPAGO/i.test(s(order?.payment))||!!order?.paymentStatus;
}
function paymentBadge(order){
 const balance=order?.receivables;
 if(balance&&Number.isFinite(Number(balance.receivedCents))&&Number.isFinite(Number(balance.balanceCents))){
  const received=Number(balance.receivedCents)/100,due=Number(balance.balanceCents)/100;
  return '<span class="badge '+(due<=0?'good':'warn')+'">'+(due<=0?'✅ Quitado':'💳 Conta Cliente')+'</span>'+
    '<br><small>Recebido '+brl(received)+' · A receber '+brl(due)+'</small>';
 }
 if(order?.manualPayment?.status==='CONFIRMADO')
  return '<span class="badge good">✅ RECEBIDO MANUAL '+brl(order.manualPayment.valor)+'</span><br><small>'+esc(order.manualPayment.nome||order.payment)+' • confirmado por '+esc(order.manualPayment.conferidoPor||'admin')+'</small>'+
   (order.paymentStatus?'<br><small>MP original: '+esc(order.paymentStatus)+' (não é confirmação MP)</small>':'');
 if(!isMercadoPagoOrder(order))return '<small>💵 '+esc(order?.payment||'Forma de pagamento não informada')+' • conferência manual</small>';
 const status=s(order.paymentStatus).toUpperCase(),label=order.verifiedPaymentMethod||'Mercado Pago (método a conferir)';
 if(status==='APROVADO')return '<span class="badge good">✅ PAGO MP '+brl(order.providerPaidAmount)+'</span><br><small>'+esc(label)+'</small>';
 if(status==='ESTORNADO')return '<span class="badge warn">⚠️ ESTORNADO</span>';
 if(status==='REJEITADO'||status==='RECUSADO'||status==='CANCELADO')return '<span class="badge warn">⛔ '+esc(status)+'</span>';
 return '<span class="badge warn">⏳ MP: '+esc(status||'SEM CONFIRMAÇÃO')+'</span><br><small>Não aceitar como pago sem conciliar</small>';
}
const paymentChecks=new Set();
async function verifyOrderPayment(code){
 if(paymentChecks.has(code))return;
 const o=orderLookup(code);
 if(!o)return toast('Atualize a lista para encontrar o pedido.',true);
 if(!isMercadoPagoOrder(o))return toast('Este pedido não possui pagamento online do Mercado Pago. Confira o recebimento manualmente.',true);
 paymentChecks.add(code);
 const buttons=[...document.querySelectorAll('[data-action="verifyOrderPayment"]')].filter(b=>b.dataset.order===code);
 buttons.forEach(b=>{b.disabled=true;b.textContent='⏳ Conferindo MP...';});
 try{
  const out=await api('orders/'+encodeURIComponent(code)+'/verify-payment',{method:'POST',body:{}});
  await loadAll();nav('orders');
  if(out.statusPagamento==='APROVADO')
   toast('✅ Mercado Pago confirmou '+brl(out.valorPago)+' do pedido #'+code+'. '+(out.metodoConfirmado!=='A CONFIRMAR'?out.metodoConfirmado+'. ':'')+(out.erpSynced?'ERP conciliado.':'Integração ERP ainda pendente.'));
  else toast('Pagamento '+s(out.statusPagamento)+' no Mercado Pago para pedido #'+code+'. Não foi registrado como recebido.',true);
 }catch(err){toast('Conferência Mercado Pago não concluída: '+s(err.message)+'. Não marque como pago sem confirmação.',true);}
 finally{paymentChecks.delete(code);buttons.forEach(b=>{b.disabled=false;b.textContent='🔄 Conferir MP';});}
}

const manualPaymentPending=new Set();
const manualPaymentMethods=[
 ['PIX_MANUAL','Pix recebido diretamente na conta'],
 ['DINHEIRO','Dinheiro entregue'],
 ['CREDITO_PRESENCIAL','Cartão de crédito na maquininha'],
 ['DEBITO_PRESENCIAL','Cartão de débito na maquininha'],
 ['TRANSFERENCIA','Transferência bancária confirmada']
];
function changePaymentMethod(code){
 const o=orderLookup(code),f=fulfillStatus(code);
 if(!o)return toast('Pedido não encontrado. Atualize os dados.',true);
 if(f?.completed||['ENTREGUE','RETIRADO','FINALIZADO','CONCLUIDO','CANCELADO','REJEITADO'].includes(s(o.status).toUpperCase()))
  return toast('Não é permitido mudar pagamentos de pedidos encerrados nesta tela.',true);
 if(o.manualPayment?.status==='CONFIRMADO')return toast('Este pedido já tem recebimento manual confirmado. Não registre em duplicidade.',true);
 if(s(o.paymentStatus).toUpperCase()==='APROVADO')return toast('O Mercado Pago já confirmou esse pagamento. Não registre outra quitação.',true);
 const methods=manualPaymentMethods.map(([key,label])=>'<option value="'+key+'">'+esc(label)+'</option>').join('');
 modal('💳 Alterar pagamento · pedido #'+code,
 '<p><b>'+esc(o.name||'Cliente')+'</b> • Total do pedido: <b>'+brl(o.total)+'</b></p>'+
 '<div class="notice warn"><b>Atenção:</b> a tentativa original do Mercado Pago permanecerá como <b>'+esc(o.paymentStatus||'sem confirmação')+'</b>. Confirme aqui somente se o valor foi realmente recebido por outro meio. Esta operação não marca o Mercado Pago como pago.</div>'+
 '<div class="form-grid"><label>Nova forma de pagamento<select id="manualPaymentMethod" required>'+methods+'</select></label>'+
 '<label>Valor recebido integralmente (R$)<input id="manualPaymentAmount" inputmode="decimal" type="number" step="0.01" min="0.01" value="'+Number(o.total).toFixed(2)+'" required></label>'+
 '<label>Identificação do comprovante (opcional)<input id="manualPaymentReference" maxlength="120" placeholder="ID Pix, comprovante ou recibo"></label>'+
 '<label class="wide">Motivo da alteração (obrigatório)<textarea id="manualPaymentReason" rows="3" maxlength="400" minlength="12" placeholder="Ex.: Cliente transferiu via Pix direto para a conta do Caseirinho"></textarea></label></div>'+
 '<label class="quick-check"><input type="checkbox" id="manualPaymentReceived"> ✅ Confirmei o recebimento real de '+brl(o.total)+' na conta, maquininha ou caixa</label>'+
 '<p class="notice">Salvar registra quem recebeu, quando, quanto e como. <b>Não conclui a entrega nem gera outra receita.</b> Depois, clique em <b>Aceitar pedido</b> para prosseguir.</p>'+
 '<div id="manualPaymentAlert" class="notice error" hidden role="alert"></div>'+
 '<button type="button" class="btn primary" id="manualPaymentSubmit" data-action="saveManualPayment" data-order="'+esc(code)+'">✅ Confirmar recebimento e alterar pagamento</button>');
}
async function saveManualPayment(code){
 if(manualPaymentPending.has(code))return;
 const o=orderLookup(code);
 if(!o)return toast('Atualize a lista para confirmar o pagamento.',true);
 const method=E('manualPaymentMethod')?.value, amount=n(E('manualPaymentAmount')?.value),
  justification=s(E('manualPaymentReason')?.value).trim(),reference=s(E('manualPaymentReference')?.value).trim(),
  confirmed=E('manualPaymentReceived')?.checked===true;
 const notice=msg=>{const x=E('manualPaymentAlert');if(x){x.textContent=msg;x.hidden=false;}toast(msg,true);};
 if(!confirmed)return notice('Confirme que o dinheiro entrou na conta, maquininha ou caixa.');
 if(Math.round(amount*100)!==Math.round(n(o.total)*100)||amount<=0)return notice('O valor recebido deve ser igual ao total do pedido. Pagamentos parciais precisam de conciliação específica.');
 if(justification.length<12||justification.length>400)return notice('Informe o motivo da alteração com 12 a 400 caracteres.');
 if(!window.confirm('CONFIRMAR RECEBIMENTO REAL de '+brl(amount)+' por '+s(E('manualPaymentMethod')?.selectedOptions?.[0]?.text||method)+' no pedido #'+code+'? Esta operação ficará auditada.'))return;
 manualPaymentPending.add(code);
 const button=E('manualPaymentSubmit');if(button){button.disabled=true;button.textContent='⏳ Registrando recebimento...';}
 try{
  const out=await api('orders/'+encodeURIComponent(code)+'/manual-payment',{method:'POST',body:{method,amount,justification,reference,confirmReceived:true}});
  hideModal();
  try{await loadAll();nav('orders');}catch(error){toast('✅ Recebimento registrado, mas a lista não atualizou. Clique em Atualizar.',true);return;}
  toast('✅ '+brl(out.amount)+' recebido por '+out.nome+'. '+(out.requiresAcceptance?'Agora clique em Aceitar pedido.':'Pagamento atualizado no pedido e ERP.'));
 }catch(error){
  if(error.networkError){try{await loadAll();const check=orderLookup(code);if(check?.manualPayment?.status==='CONFIRMADO'){
   hideModal();return toast('✅ Recebimento manual registrado; estado confirmado após reconexão.');
  }}catch(_){}}
  notice('Recebimento não confirmado: '+error.message+'. Confira antes de repetir.');
 }finally{manualPaymentPending.delete(code);if(button){button.disabled=false;button.textContent='✅ Confirmar recebimento e alterar pagamento';}}
}
function orderButton(order){
 const rule=fulfillStatus(order.code);
 const status=s(rule?.status||order.status).toUpperCase();
 const code=esc(order.code);
 const first='<button class="btn small" type="button" data-action="viewOrder" data-order="'+code+'">📦 Ver itens</button> '+
 '<button class="btn small gold" type="button" data-action="pdfOrder" data-order="'+code+'">📄 PDF</button> '+
 (isMercadoPagoOrder(order)?'<button class="btn small" type="button" data-action="verifyOrderPayment" data-order="'+code+'">🔄 Conferir MP</button> ':'')+
 (!order.manualPayment&&order.paymentStatus!=='APROVADO'?'<button class="btn small" type="button" data-action="changePaymentMethod" data-order="'+code+'">💳 Alterar pagamento</button> ':'');
 if(rule?.completed||['ENTREGUE','RETIRADO','CONCLUIDO','FINALIZADO'].includes(status))return first+'<span class="badge good">✅ Concluído</span> <button class="btn small" type="button" data-action="goReceivables">💳 Conta Cliente</button>';
 if(['NOVO','PENDENTE','AGUARDANDO_ANALISE','AGUARDANDO_COTACAO_FRETE'].includes(status))
  return first+'<button class="btn small primary" type="button" data-action="quickAcceptOrder" data-order="'+code+'">✅ Aceitar pedido</button>';
 if(['ACEITO','ABERTO','PRONTO'].includes(status)){
  const approved=rule?.approval==='APROVADO',rejected=rule?.approval==='REJEITADO';
  const label=approved?(rule?.manualFirstPurchaseApproved?'💚 Exceção aprovada':'💚 Cashback aprovado'):rejected?'🚫 Cashback não liberado':'💚 Decidir cashback';
  return first+'<button class="btn small primary" type="button" data-action="quickFinishOrder" data-order="'+code+'" title="Abrir conferência de entrega e pagamento">📦 Finalizar (confirmar)</button> '+
   '<button class="btn small" type="button" data-action="quickCashbackOrder" data-order="'+code+'">'+label+'</button>';
 }
 return first+'<span class="badge warn">'+esc(status||'Conferir')+'</span>';
}
function showOrder(code){
 const x=st.orders.find(v=>s(v.code)===s(code))||(window.__customerOrders||[]).find(v=>s(v.code)===s(code));
 if(!x)return toast('Pedido não localizado. Atualize os pedidos.',true);
 modal('🛒 Pedido '+x.code,orderDetailsHtml(x)+'<div class="toolbar"><button class="btn primary" data-action="pdfOrder" data-order="'+esc(x.code)+'">📄 Imprimir / salvar PDF</button><button class="btn gold" data-action="fulfillOrder" data-order="'+esc(x.code)+'">✅ Entrega / Cashback</button></div>');
}
async function showCustomerOrders(phone){
 const c=clientFor(phone);
 modal('📦 Pedidos de '+s(c.name),'<p>Buscando histórico completo deste WhatsApp...</p>');
 try{
 const result=await api('customer-orders?phone='+encodeURIComponent(digits(phone)));
 window.__customerOrders=result.orders||[];
 const rows=window.__customerOrders.map(x=>'<tr><td>'+dt(x.created_at)+'</td><td><b>'+esc(x.code)+'</b><br>'+badge(x.status)+'</td><td>'+brl(x.total)+'</td><td class="actions-cell">'+orderButton(x)+'</td></tr>');
 modal('📦 Compras de '+s(c.name),' <p><b>'+window.__customerOrders.length+' pedido(s)</b> associado(s) a este WhatsApp.</p>'+table(['Data','Pedido','Total','Detalhes / PDF'],rows));
 }catch(err){modal('📦 Compras de '+s(c.name),'<div class="notice error">'+esc(err.message)+'</div>');}
}
function printDocument(title,html){
 const w=window.open('','_blank');
 if(!w){toast('O navegador bloqueou a janela. Habilite pop-ups para gerar o PDF.',true);return;}
 const styles='body{font-family:Arial,sans-serif;color:#263b2d;margin:25px;font-size:12px}header{padding:18px 0;border-bottom:3px solid #244936;margin-bottom:25px}h1{font-family:Georgia,serif;font-size:24px}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:8px 6px;text-align:left;vertical-align:top}th{background:#f4f5f0}p{line-height:1.5}.badge{font-size:10px}footer{margin-top:35px;font-size:10px;color:#666}@media print{@page{size:A4;margin:13mm}button{display:none}}';
 const page='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>'+styles+'</style></head><body>'+
 '<header><h1>🍝 Caseirinho Massas Artesanais</h1><h2>'+esc(title)+'</h2><p>Gerado em '+dt(new Date())+' • Central Insights</p></header>'+html+
 '<footer>Uso interno e atendimento. Informações obtidas dos registros do Caseirinho no momento da consulta.</footer></body></html>';
 w.document.open();w.document.write(page);w.document.close();
 w.focus();setTimeout(()=>{try{w.print();}catch(_){toast('Abra o menu da nova aba e escolha Imprimir → Salvar como PDF.',true)}},450);
}
function pdfOrder(code){
 const x=st.orders.find(v=>s(v.code)===s(code))||(window.__customerOrders||[]).find(v=>s(v.code)===s(code));
 if(!x)return toast('Pedido não localizado.',true);
 printDocument('Comprovante do Pedido '+s(x.code),orderDetailsHtml(x));
}
function pdfReport(type){
 if(type==='contacts'){
 const rows=st.contacts.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(tel(x.phone))+'</td><td>'+n(x.orders)+'</td><td>'+n(x.visits)+'</td><td>'+dt(x.last_order||x.last_registration)+'</td></tr>');
 printDocument('Relatório CRM / Clientes',table(['Nome','WhatsApp','Pedidos','Visitas verificadas','Última interação'],rows));return;
 }
 if(type==='orders'){
 const rows=st.orders.map(x=>'<tr><td>'+esc(x.code)+'</td><td>'+dt(x.created_at)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.status)+'</td><td>'+brl(x.total)+'</td><td>'+esc((x.items||[]).map(v=>n(v.quantity)+'x '+v.name).join('; '))+'</td></tr>');
 printDocument('Relatório de Pedidos',table(['Pedido','Data','Cliente','Status','Total','Itens'],rows));return;
 }
 if(type==='products'){
 const rows=st.catalog.map(x=>'<tr><td>'+esc(x.category)+'</td><td>'+esc(x.name)+'</td><td>'+brl(x.price)+'</td><td>'+n(x.minimum)+'</td><td>'+(n(x.maximum)||'Sem limite')+'</td></tr>');
 printDocument('Relatório de Produtos e Preços',table(['Categoria','Produto','Preço','Mínimo','Máximo'],rows));
 }
}

function saoPauloToday(){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const date=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return date.year+'-'+date.month+'-'+date.day;
}
function shiftDateISO(iso,days){
 const d=new Date(iso+'T12:00:00.000Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);
}
function initSalesDates(){
 if(E('salesDateFrom')?.value&&E('salesDateTo')?.value)return;
 const today=saoPauloToday();E('salesDateTo').value=today;E('salesDateFrom').value=shiftDateISO(today,-41);
}
function selectSalesDays(days){
 initSalesDates();
 const today=saoPauloToday();
 E('salesDateTo').value=today;
 E('salesDateFrom').value=days==='month'?today.slice(0,8)+'01':shiftDateISO(today,-(Number(days)-1));
 loadSales();
}
async function loadSales(){
 if(!st.token)return;
 initSalesDates();
 const from=E('salesDateFrom').value,to=E('salesDateTo').value;
 if(!from||!to||from>to){E('salesError').hidden=false;E('salesError').textContent='Informe o período correto. A data De não pode ser maior que Até.';return;}
 E('salesError').hidden=true;E('salesRefresh').disabled=true;E('salesRefresh').textContent='Consultando...';
 try{
  const report=await api('product-sales-abc?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to));
  st.sales=report;st.salesLoaded=true;
  E('salesError').hidden=true;
  renderSales();
 }catch(err){
  E('salesError').hidden=false;E('salesError').textContent='Não foi possível consultar o relatório: '+err.message;
 }finally{E('salesRefresh').disabled=false;E('salesRefresh').textContent='🔎 Consultar';}
}
function qtyBR(v){return Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:3});}
function pctBR(v){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:2})+'%';}
function displayISODate(iso){
 if(!iso)return '—';
 const parts=iso.split('-');
 return parts.length===3?parts[2]+'/'+parts[1]+'/'+parts[0]:iso;
}
function salesBar(width,kind){
 const value=Math.max(0,Math.min(100,Number(width)||0));
 return '<div class="sales-track"><div class="sales-fill '+s(kind||'')+'" style="width:'+value+'%"></div></div>';
}
function salesTopList(list,type){
 const max=Math.max(...(list||[]).map(x=>type==='qty'?x.quantity:x.revenue),1);
 return list.length?list.map((p,i)=>'<div class="sales-top-row"><div class="sales-top-title"><span><b>'+(i+1)+'. '+esc(p.name)+'</b><small>'+esc(p.category)+' · '+esc(p.code||'sem código')+'</small></span><strong>'+(type==='qty'?qtyBR(p.quantity)+' un':brl(p.revenue))+'</strong></div>'+salesBar((type==='qty'?p.quantity:p.revenue)/max*100)+'</div>').join(''):cellEmpty('Sem vendas confirmadas no período.');
}
function abcBadge(abc){return '<span class="abc-badge abc-'+esc(abc)+'">'+esc(abc)+'</span>';}
function salesFilterProducts(){
 const report=st.sales||{},q=s(E('salesSearch')?.value).trim().toLocaleLowerCase('pt-BR'),a=E('salesABCFilter').value,cat=E('salesCategoryFilter').value;
 return (report.products||[]).filter(x=>(a==='all'||x.abc===a)&&(cat==='all'||x.category===cat)&&(s(x.name)+' '+s(x.code)+' '+s(x.category)).toLocaleLowerCase('pt-BR').includes(q));
}
function salesCostDisplay(x){
 if(x.costStatus==='SEM_FICHA_TECNICA')return '<span class="badge warn">⚠️ Não possui ficha técnica</span> <button class="btn small" type="button" data-sales-ficha="'+esc(x.productId)+'">➕ Cadastrar</button>';
 if(['CUSTO_INCOMPLETO','SEM_CUSTO_INSUMO','CICLO_NA_FICHA'].includes(x.costStatus))return '<span class="badge warn">⚠️ Custo incompleto</span>';
 if(x.costStatus==='PRODUTO_NAO_CADASTRADO')return '<span class="badge warn">Produto sem vínculo ERP</span>';
 return x.unitCost!=null?'<strong>'+brl(x.unitCost)+'</strong>':'<span class="badge light">Sem custo calculado</span>';
}
function renderSalesDetails(){
 if(!st.sales)return;
 const filtered=salesFilterProducts();
 const rows=filtered.map(x=>'<tr><td>'+abcBadge(x.abc)+'</td>'+
 '<td><b>'+esc(x.name)+'</b><br><small class="muted">'+esc(x.code||'')+' · '+esc(x.category)+'</small></td>'+
 '<td>'+qtyBR(x.quantity)+'</td><td><b>'+brl(x.revenue)+'</b></td>'+
 '<td>'+pctBR(x.sharePct)+'</td><td>'+pctBR(x.cumulativePct)+'</td>'+
 '<td><b>'+qtyBR(x.dailyAverageQty42d)+'</b>/dia<br><small>'+qtyBR(x.weeklyAverageQty42d)+'/semana</small></td>'+
 '<td>'+qtyBR(x.quantity42d)+'</td><td>'+salesCostDisplay(x)+'</td><td>'+(x.estimatedMargin!=null?brl(x.estimatedMargin):'—')+'</td></tr>');
 if(window.matchMedia('(max-width:790px)').matches){
  E('salesTable').innerHTML=filtered.length?'<div class="mobile-list">'+filtered.map((x,i)=>
   '<article class="mobile-record"><div class="mobile-record-head"><div><b>'+esc(x.name)+'</b><br><small class="muted">'+esc(x.category)+'</small></div>'+abcBadge(x.abc)+'</div>'+
   '<div class="sales-mobile-grid"><span>Quantidade vendida<b>'+qtyBR(x.quantity)+'</b></span><span>Faturamento<b>'+brl(x.revenue)+'</b></span>'+
   '<span>Participação<b>'+pctBR(x.sharePct)+'</b></span><span>Acumulado ABC<b>'+pctBR(x.cumulativePct)+'</b></span>'+
   '<span>Média em 42 dias<b>'+qtyBR(x.dailyAverageQty42d)+'/dia</b></span><span>Por semana (42d)<b>'+qtyBR(x.weeklyAverageQty42d)+'</b></span></div>'+
   '<div class="muted" style="font-size:11px;margin-top:8px">Vendido em 42 dias: '+qtyBR(x.quantity42d)+' · '+brl(x.revenue42d)+'</div><div class="sales-cost-warning">Custo/unidade: '+salesCostDisplay(x)+'<br>Margem estimada: '+(x.estimatedMargin!=null?brl(x.estimatedMargin):'—')+'</div></article>'
  ).join('')+'</div>':cellEmpty('Não há produtos para estes filtros.');
 }else{
  E('salesTable').innerHTML=table(['ABC','Produto / categoria','Qtd.','Receita itens','Participação','Acum. ABC','Média 42d','Qtd. 42d','Custo / ficha','Margem estimada'],rows);
 }
}
function renderSales(){
 const d=st.sales;
 if(!d)return;
 const total=d.totals||{},win=d.window42||{},p=d.period||{};
 E('salesNote').className='notice success';
 E('salesNote').innerHTML='<b>📅 Relatório: '+displayISODate(p.from)+' até '+displayISODate(p.to)+'</b> ('+p.days+' dias corridos).'+
 '<br><b>📊 Média móvel:</b> '+displayISODate(win.from)+' a '+displayISODate(win.to)+' (42 dias corridos).'+
 '<br><small>Fonte: pedidos confirmados do e-commerce. Não duplica ERP. Atualizado em '+dt(d.generatedAt)+'.</small>';
 E('salesKpis').innerHTML=[
  statsCard('💰','Receita de itens',brl(total.itemRevenue),'Sem frete ou rateio de cupons do pedido'),
  statsCard('📦','Unidades vendidas',qtyBR(total.quantity),'Período selecionado'),
  statsCard('🛒','Pedidos considerados',total.orders,'Total de pedidos: '+brl(total.ordersTotal)),
  statsCard('🍝','Produtos com saída',total.products,'SKUs / produtos diferentes'),
  statsCard('⏳','Pedidos pendentes excluídos',total.pendingExcluded,'Apenas pedidos confirmados entram'),
  statsCard('❌','Cancelados / rejeitados',total.canceledExcluded,'Não contados como venda'),
  statsCard('🧪','Testes identificados',total.testRecords,'Removidos quando reconhecíveis'),
  statsCard('📊','Período de média',42+' dias','Até '+displayISODate(win.to)),
  statsCard('⚠️','Sem ficha técnica',total.finishedWithoutFicha||0,'Produtos acabados vendidos sem ficha'),
  statsCard('🧮','Custo incompleto',total.incompleteCost||0,'Itens sem margem confiável')
 ].join('');
 E('salesTopRevenue').innerHTML=salesTopList(d.topRevenue||[],'revenue');
 E('salesTopQuantity').innerHTML=salesTopList(d.topQuantity||[],'qty');
 const maxABC=Math.max(1,...(d.abcSummary||[]).map(x=>x.revenue));
 E('salesAbcSummary').innerHTML=(d.abcSummary||[]).map(x=>'<div class="sales-abc-row">'+abcBadge(x.abc)+
 '<div style="flex:1"><div class="sales-top-title"><b>'+x.products+' produtos</b><strong>'+brl(x.revenue)+'</strong></div>'+
 salesBar(x.revenue/maxABC*100,'abc-'+x.abc)+'</div></div>').join('');
 const maxCat=Math.max(1,...(d.categories||[]).map(x=>x.revenue));
 E('salesCategories').innerHTML=(d.categories||[]).map(x=>'<div class="sales-top-row"><div class="sales-top-title"><b>'+abcBadge(x.abc||'—')+' '+esc(x.name)+' <small>('+x.products+' produtos)</small></b><strong>'+brl(x.revenue)+'</strong></div>'+salesBar(x.revenue/maxCat*100)+'<small class="muted">'+pctBR(x.sharePct)+' da receita · Acumulado: '+pctBR(x.cumulativePct)+'</small></div>').join('')||cellEmpty('Sem categorias vendidas.');
 const filter=E('salesCategoryFilter'),selected=filter.value;
 filter.innerHTML='<option value="all">Todas as categorias</option>'+(d.categories||[]).map(x=>'<option value="'+esc(x.name)+'">'+esc(x.name)+'</option>').join('');
 if((d.categories||[]).some(x=>x.name===selected))filter.value=selected;
 else filter.value='all';
 renderSalesDetails();
 document.dispatchEvent(new CustomEvent('caseirinho:sales-updated'));
 if(!window.CaseirinhoSalesStockLevels){
  const panel=E('stockLevelsPanel');
  if(panel)panel.innerHTML='<div class="notice error"><b>O módulo de estoque não foi carregado nesta versão do aplicativo.</b> <a href="./?view=sales&v=43-stock-visible">Abrir a Central atualizada</a>.</div>';
 }
}
function salesCSV(){
 if(!st.sales)return toast('Consulte o relatório antes de exportar.',true);
 const p=st.sales.period,header=['Classe ABC','Código','Produto','Categoria','Unidade','Quantidade período','Faturamento de itens (R$)','% participação','% acumulado','Pedidos','Última venda','Quantidade nos 42 dias','Receita nos 42 dias','Média diária 42 dias','Média semanal 42 dias','Ficha técnica','Situação do custo','Custo unitário estimado','Custo total estimado','Margem estimada'];
 const data=[header,...salesFilterProducts().map(x=>[x.abc,x.code,x.name,x.category,x.unit,x.quantity,x.revenue,x.sharePct,x.cumulativePct,x.orders,dt(x.lastSale),x.quantity42d,x.revenue42d,x.dailyAverageQty42d,x.weeklyAverageQty42d,x.hasFicha?'SIM':'NÃO',x.costStatus,x.unitCost??'',x.estimatedTotalCost??'',x.estimatedMargin??''])];
 const csv='\ufeff'+data.map(row=>row.map(v=>'"'+s(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='caseirinho-vendas-curva-abc-'+p.from+'-a-'+p.to+'.csv';a.click();URL.revokeObjectURL(url);
}
function salesPDF(){
 if(!st.sales)return toast('Consulte o relatório antes de gerar o PDF.',true);
 const d=st.sales,t=d.totals,p=d.period,w=d.window42;
 const head='<p><b>Período selecionado:</b> '+displayISODate(p.from)+' a '+displayISODate(p.to)+' ('+p.days+' dias)'+
 '<br><b>Média de 42 dias:</b> '+displayISODate(w.from)+' a '+displayISODate(w.to)+'</p>'+
 '<p><b>Pedidos:</b> '+t.orders+' · <b>Produtos:</b> '+t.products+' · <b>Unidades:</b> '+qtyBR(t.quantity)+
 ' · <b>Receita dos itens:</b> '+brl(t.itemRevenue)+'</p>';
 const abc=table(['ABC','Produtos','Unidades','Receita'],(d.abcSummary||[]).map(x=>'<tr><td>'+esc(x.abc)+'</td><td>'+x.products+'</td><td>'+qtyBR(x.quantity)+'</td><td>'+brl(x.revenue)+'</td></tr>'));
 const categoryRows=(d.categories||[]).map(x=>'<tr><td>'+esc(x.abc)+'</td><td>'+esc(x.name)+'</td><td>'+x.products+'</td><td>'+qtyBR(x.quantity)+'</td><td>'+brl(x.revenue)+'</td><td>'+pctBR(x.sharePct)+'</td></tr>');
 const rows=salesFilterProducts().map(x=>'<tr><td>'+esc(x.abc)+'</td><td>'+esc(x.code)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.category)+'</td><td>'+qtyBR(x.quantity)+'</td><td>'+brl(x.revenue)+'</td><td>'+pctBR(x.sharePct)+'</td><td>'+pctBR(x.cumulativePct)+'</td><td>'+qtyBR(x.dailyAverageQty42d)+'</td><td>'+esc(x.costStatus==='SEM_FICHA_TECNICA'?'Não possui ficha técnica':x.unitCost!=null?brl(x.unitCost):'Custo incompleto')+'</td></tr>');
 const body=head+'<h3>Resumo Curva ABC</h3>'+abc+'<h3>Curva ABC por categoria</h3>'+table(['ABC','Categoria','Produtos','Qtd.','Receita','Participação'],categoryRows)+'<h3>Vendas detalhadas por produto</h3>'+
 table(['ABC','Código','Produto','Categoria','Qtd.','Receita','%','Acumulado','Média/dia 42d','Custo / Ficha'],rows)+
 '<p><small>Fonte: e-commerce Caseirinho, pedidos ACEITO/ENTREGUE/RETIRADO/CONCLUIDO. Excluídos pendentes, cancelados, rejeitados e testes identificados. Frete/descontos de pedido não rateados. A média inclui dias sem vendas.</small></p>';
 printDocument('Vendas por Produto • Curva ABC',body);
}

/** Cadastro de Grades e Packs — os IDs referenciam produtos existentes, sem criar um SKU fictício. */
function merchProducts(){
 return (st.catalog||[]).filter(x=>s(x.id)&&Number(x.price)>0).sort((a,b)=>s(a.name).localeCompare(s(b.name),'pt-BR'));
}
async function loadMerch(){
 E('merchStatus').hidden=false;E('merchStatus').textContent='Buscando grades e packs no ERP...';
 try{
  const d=await api('merchandising');
  st.merch={grades:d.grades||[],packs:d.packs||[]};st.merchLoaded=true;
  E('merchStatus').hidden=true;renderMerch();
 }catch(e){E('merchStatus').hidden=false;E('merchStatus').className='notice error';E('merchStatus').textContent='Não foi possível consultar grades e packs: '+e.message;}
}
function merchSwitch(tab){
 st.merchTab=tab;
 E('merchGradeSection').hidden=tab!=='grades';
 E('merchPackSection').hidden=tab!=='packs';
 E('merchGradesTab').className='btn'+(tab==='grades'?' primary':'');
 E('merchPacksTab').className='btn'+(tab==='packs'?' primary':'');
 renderMerch();
}
function labelForProduct(id){const p=merchProducts().find(x=>s(x.id)===s(id));return p?p.name:'Produto não publicado ('+s(id)+')';}
function renderMerch(){
 if(!st.merchLoaded){E('merchGradesList').innerHTML=cellEmpty('Carregue as grades e packs para começar.');return;}
 E('merchGradeSection').hidden=st.merchTab!=='grades';
 E('merchPackSection').hidden=st.merchTab!=='packs';
 const gradeQuery=s(E('gradeSearch').value).toLocaleLowerCase('pt-BR'),status=E('gradeStatusFilter').value;
 const grades=(st.merch.grades||[]).filter(x=>s(x.name).toLocaleLowerCase('pt-BR').includes(gradeQuery)&&(status==='all'||status==='active'&&x.active||status==='inactive'&&!x.active));
 E('merchGradesList').innerHTML=grades.length?'<div class="merch-grid">'+grades.map(x=>
 '<article class="card merch-card"><div class="mobile-record-head"><h3>'+esc(x.name)+'</h3>'+(x.active?'<span class="badge good">Ativa</span>':'<span class="badge warn">Inativa</span>')+'</div>'+
 '<p><b>'+esc(x.title||x.type)+'</b> · '+(x.variants||[]).length+' variações</p>'+
 '<div class="merch-variants">'+(x.variants||[]).map(v=>'<div><b>'+esc(v.label)+'</b><span>'+esc(labelForProduct(v.productId))+'</span></div>').join('')+'</div>'+
 '<div class="record-actions"><button class="btn small primary" type="button" data-merch-action="editGrade" data-id="'+esc(x.id)+'">✏️ Editar grade</button> '+
 (x.active?'<button class="btn small danger" type="button" data-merch-action="disableGrade" data-id="'+esc(x.id)+'">Desativar</button>':'')+'</div></article>').join('')+'</div>':cellEmpty('Nenhuma grade encontrada neste filtro.');
 const packQuery=s(E('packSearch').value).toLocaleLowerCase('pt-BR');
 const packs=(st.merch.packs||[]).filter(x=>s(x.name).toLocaleLowerCase('pt-BR').includes(packQuery));
 E('merchPacksList').innerHTML=packs.length?'<div class="merch-grid">'+packs.map(x=>{
  const offer=x.type==='LEVE_X_PAGUE_Y'?'Leve '+x.quantityTake+', pague '+x.quantityPay:'Compre '+x.triggerQuantity+' e leve '+labelForProduct(x.benefitProductId)+' por '+brl(x.benefitPrice);
  return '<article class="card merch-card"><div class="mobile-record-head"><h3>'+esc(x.name)+'</h3><span class="badge good">Ativo</span></div>'+
  '<p class="badge warn">'+esc(offer)+'</p><p><b>Produtos participantes:</b></p><div class="merch-variants">'+(x.productIds||[]).map(pid=>'<div><span>'+esc(labelForProduct(pid))+'</span></div>').join('')+'</div>'+
  '<div class="record-actions"><button class="btn small primary" type="button" data-merch-action="editPack" data-id="'+esc(x.id)+'">✏️ Editar pack</button> '+
  '<button class="btn small danger" type="button" data-merch-action="disablePack" data-id="'+esc(x.id)+'">Desativar</button></div></article>';
 }).join('')+'</div>':cellEmpty('Nenhum pack virtual ativo encontrado.');
}
function gradeOptions(){
 return ['TAMANHO','PESO','SABOR','RECHEIO','APRESENTACAO'].map(x=>'<option value="'+x+'">'+esc({TAMANHO:'📏 Tamanho (P/M/G)',PESO:'⚖️ Peso (500 g / 1 kg)',SABOR:'😋 Sabor',RECHEIO:'🥟 Recheio',APRESENTACAO:'📦 Apresentação'}[x])+'</option>').join('');
}
function merchPickerItems(kind){
 const q=s(E(kind+'PickSearch')?.value).toLocaleLowerCase('pt-BR');
 const selected=kind==='grade'?st.gradeSelected:st.packSelected,products=merchProducts();
 const filtered=products.filter(x=>(s(x.name)+' '+s(x.category)+' '+s(x.id)).toLocaleLowerCase('pt-BR').includes(q)).slice(0,80);
 E(kind+'PickList').innerHTML=filtered.length?filtered.map(p=>
 '<label class="merch-pick-row"><input type="checkbox" data-merch-pick="'+kind+'" value="'+esc(p.id)+'" '+(selected.has(s(p.id))?'checked':'')+'>'+
 '<span><b>'+esc(p.name)+'</b><small>'+esc(p.category)+' · '+brl(p.price)+'</small></span></label>'
 ).join(''):cellEmpty('Nenhum produto publicado corresponde à busca.');
}
function rememberGradeFields(){
 for(const el of document.querySelectorAll('[data-grade-variant-row]')){
  const id=el.dataset.gradeVariantRow,value=st.gradeSelected.get(id);if(!value)continue;
  value.label=el.querySelector('[data-grade-label]').value.trim();
  value.price=el.querySelector('[data-grade-price]').value;
 }
 const cover=document.querySelector('input[name="gradeCover"]:checked');
 if(cover)st.gradeCoverId=cover.value;
}
function renderGradeSelected(){
 const wrap=E('gradeSelectedList');if(!wrap)return;
 const list=[...st.gradeSelected.entries()];
 if(!st.gradeCoverId||!st.gradeSelected.has(st.gradeCoverId))st.gradeCoverId=list[0]?.[0]||'';
 wrap.innerHTML=list.length?list.map(([id,v],index)=>
 '<div class="merch-edit-row" data-grade-variant-row="'+esc(id)+'">'+
 '<div class="merch-edit-name"><strong>'+(index+1)+'. '+esc(labelForProduct(id))+'</strong><small>SKU vinculado ao catálogo original</small></div>'+
 '<label>Rótulo<input data-grade-label maxlength="90" required value="'+esc(v.label||'')+'" placeholder="Ex.: M - 500 g"></label>'+
 '<label>Preço (R$)<input data-grade-price type="number" min="0.01" step="0.01" required value="'+esc(v.price)+'"></label>'+
 '<label class="merch-cover"><input type="radio" name="gradeCover" value="'+esc(id)+'" '+(id===st.gradeCoverId?'checked':'')+'> Foto de capa</label>'+
 '</div>').join(''):'<div class="notice">Selecione pelo menos dois produtos publicados.</div>';
 E('gradeCount').textContent=list.length+' produto(s) selecionado(s)';
}
function gradeModal(id){
 const g=(st.merch.grades||[]).find(x=>s(x.id)===s(id));const missing=(g?.variants||[]).filter(v=>!merchProducts().some(p=>s(p.id)===s(v.productId)));
 if(missing.length){toast('Algumas variações desta grade não estão publicadas. Corrija no ERP antes de editar.',true);return;}
 st.gradeSelected=new Map((g?.variants||[]).map(v=>{const p=merchProducts().find(x=>s(x.id)===s(v.productId));return[s(v.productId),{label:s(v.label),price:p?.price||''}]}));
 st.gradeCoverId=g?.coverId||'';
 modal((g?'✏️ Editar':'➕ Criar')+' grade',
 '<form id="gradeManageForm" data-id="'+esc(g?.id||'')+'" class="product-form">'+
 '<label class="form-label">Nome da grade *</label><input name="name" required maxlength="150" value="'+esc(g?.name||'')+'" placeholder="Ex.: Lasanha Molho Branco">'+
 '<div class="form-grid"><label>Tipo de escolha<select name="type">'+gradeOptions()+'</select></label><label>Título da escolha<input name="title" maxlength="40" value="'+esc(g?.title||'Tamanho')+'"></label></div>'+
 '<label class="form-label">Descrição (opcional)</label><textarea name="description" rows="2" maxlength="600">'+esc(g?.description||'')+'</textarea>'+
 '<h3>1. Escolha os produtos da grade</h3><input id="gradePickSearch" type="search" placeholder="Buscar produto ou tamanho...">'+
 '<div id="gradePickList" class="merch-pick-list"></div><h3>2. Rótulos, preços e foto de capa</h3><span id="gradeCount" class="badge">0 selecionados</span>'+
 '<div id="gradeSelectedList"></div>'+
 '<div class="notice">Cada variação mantém seu código. O preço que você informar será atualizado no ERP e na loja. A grade usa a foto do produto marcado como capa.</div>'+
 '<button type="submit" class="btn primary" style="width:100%">✅ Salvar e publicar grade</button></form>');
 E('gradeManageForm').querySelector('select[name="type"]').value=g?.type||'TAMANHO';
 merchPickerItems('grade');renderGradeSelected();
}
async function saveGrade(e){
 e.preventDefault();rememberGradeFields();
 const form=e.target,fd=new FormData(form);
 const variants=[...st.gradeSelected].map(([productId,v])=>({productId,label:s(v.label),price:Number(v.price)}));
 if(variants.length<2||variants.length>24){toast('A grade precisa de 2 a 24 produtos.',true);return;}
 if(variants.some(v=>!v.label||!Number.isFinite(v.price)||v.price<=0)){toast('Revise os rótulos e preços de todas as variações.',true);return;}
 const payload={id:form.dataset.id||undefined,name:s(fd.get('name')),type:s(fd.get('type')),title:s(fd.get('title')),description:s(fd.get('description')),coverId:st.gradeCoverId,variants};
 if(!window.confirm('Salvar grade '+payload.name+' com '+variants.length+' variações? Os preços e vínculos serão atualizados no ERP e na loja.'))return;
 const btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Publicando grade...';
 try{
  const response=await api('merchandising/grades',{method:'POST',body:payload});
  hideModal();toast('✅ Grade publicada com '+response.linked+' variações.');
  await loadAll();nav('merch');
 }catch(error){toast('Não foi possível publicar: '+error.message,true);}
 finally{btn.disabled=false;btn.textContent='✅ Salvar e publicar grade';}
}
function renderPackSelected(){
 const e=E('packSelectedNames');if(!e)return;
 const ids=[...st.packSelected];
 e.innerHTML=ids.length?'<b>'+ids.length+' produto(s):</b><br>'+ids.map(id=>'<span class="badge light">'+esc(labelForProduct(id))+'</span> ').join(''):'Selecione um ou mais produtos.';
 const selector=E('packBenefit');if(!selector)return;
 const old=selector.value;
 selector.innerHTML=ids.map(id=>'<option value="'+esc(id)+'">'+esc(labelForProduct(id))+'</option>').join('');
 if(ids.includes(old))selector.value=old;else if(ids.length)selector.value=ids[0];
}
function packTypeChanged(){
 const special=E('packType').value==='COMPRA_X_LEVE_Y_POR_VALOR';
 E('packTakePay').hidden=special;
 E('packSpecial').hidden=!special;
}
function packModal(id){
 const p=(st.merch.packs||[]).find(x=>s(x.id)===s(id));
 st.packSelected=new Set(p?.productIds||[]);
 modal((p?'✏️ Editar':'➕ Criar')+' pack virtual',
 '<form id="packManageForm" data-id="'+esc(p?.id||'')+'" class="product-form">'+
 '<label class="form-label">Nome da oferta *</label><input name="name" required maxlength="150" value="'+esc(p?.name||'')+'" placeholder="Ex.: Empadas — Leve 5, pague 4">'+
 '<label class="form-label">Modelo do pack</label><select id="packType" name="type">'+
 '<option value="LEVE_X_PAGUE_Y">Leve X, pague Y</option><option value="COMPRA_X_LEVE_Y_POR_VALOR">Compre X e leve um item por valor especial</option></select>'+
 '<div class="form-grid" id="packTakePay"><label>Quantidade que leva (X)<input name="quantityTake" type="number" min="2" max="200" step="1" value="'+(p?.quantityTake||5)+'"></label>'+
 '<label>Quantidade que paga (Y)<input name="quantityPay" type="number" min="1" max="199" step="1" value="'+(p?.quantityPay||4)+'"></label></div>'+
 '<div id="packSpecial" hidden><div class="form-grid"><label>Quantidade gatilho<input name="triggerQuantity" type="number" min="1" max="200" step="1" value="'+(p?.triggerQuantity||2)+'"></label>'+
 '<label>Preço especial (R$)<input name="benefitPrice" type="number" min="0.01" step="0.01" value="'+(p?.benefitPrice||1)+'"></label></div>'+
 '<label>Produto beneficiado<select id="packBenefit" name="benefitProductId"></select></label></div>'+
 '<h3>Produtos participantes do pack</h3><input type="search" id="packPickSearch" placeholder="Buscar itens e sabores...">'+
 '<div id="packPickList" class="merch-pick-list"></div><div class="notice" id="packSelectedNames"></div>'+
 '<div class="notice">Você pode misturar sabores do mesmo pack. No Leve X, pague Y, o desconto respeita a regra do e-commerce, considerando os preços dos produtos participantes. Ofertas que conflitem com um pack ativo são bloqueadas.</div>'+
 '<button type="submit" class="btn primary" style="width:100%">🎁 Salvar e publicar pack</button></form>');
 E('packType').value=p?.type||'LEVE_X_PAGUE_Y';
 merchPickerItems('pack');renderPackSelected();packTypeChanged();
 if(p?.benefitProductId&&st.packSelected.has(p.benefitProductId))E('packBenefit').value=p.benefitProductId;
}
async function savePack(e){
 e.preventDefault();const form=e.target,fd=new FormData(form);
 const type=s(fd.get('type')),ids=[...st.packSelected],payload={id:form.dataset.id||undefined,name:s(fd.get('name')),type,productIds:ids};
 if(!ids.length){toast('Selecione pelo menos um produto.',true);return;}
 if(type==='LEVE_X_PAGUE_Y'){
  payload.quantityTake=Number(fd.get('quantityTake'));payload.quantityPay=Number(fd.get('quantityPay'));
  if(!Number.isInteger(payload.quantityTake)||!Number.isInteger(payload.quantityPay)||payload.quantityPay>=payload.quantityTake||payload.quantityPay<1){toast('Exemplo válido: leve 5, pague 4.',true);return;}
 }else{
  payload.triggerQuantity=Number(fd.get('triggerQuantity'));payload.benefitPrice=Number(fd.get('benefitPrice'));payload.benefitProductId=s(fd.get('benefitProductId'));
 }
 if(!window.confirm('Publicar '+payload.name+' para '+ids.length+' produto(s)? A oferta ficará ativa na loja.'))return;
 const btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Publicando pack...';
 try{await api('merchandising/packs',{method:'POST',body:payload});hideModal();toast('✅ Pack publicado na loja.');await loadAll();nav('merch');merchSwitch('packs');}
 catch(error){toast('Falha ao publicar: '+error.message,true);}finally{btn.disabled=false;btn.textContent='🎁 Salvar e publicar pack';}
}
async function disableMerch(type,id){
 const records=type==='grades'?st.merch.grades:st.merch.packs,rec=(records||[]).find(x=>s(x.id)===s(id));
 if(!rec)return;
 const message='Desativar '+rec.name+'? A oferta/grade será desvinculada na loja. Os produtos individuais permanecerão disponíveis e com seus preços.';
 if(!window.confirm(message))return;
 try{await api('merchandising/'+type+'/'+encodeURIComponent(id)+'/deactivate',{method:'PATCH',body:{}});toast('✅ '+(type==='grades'?'Grade':'Pack')+' desativado.');await loadAll();nav('merch');}
 catch(e){toast('Não foi possível desativar: '+e.message,true);}
}
function bindMerch(){
 E('merchGradesTab').addEventListener('click',()=>merchSwitch('grades'));
 E('merchPacksTab').addEventListener('click',()=>merchSwitch('packs'));
 E('refreshMerch').addEventListener('click',loadMerch);
 E('newGradeButton').addEventListener('click',()=>gradeModal());
 E('newPackButton').addEventListener('click',()=>packModal());
 E('gradeSearch').addEventListener('input',renderMerch);
 E('packSearch').addEventListener('input',renderMerch);
 E('gradeStatusFilter').addEventListener('change',renderMerch);
 document.addEventListener('input',e=>{
  if(e.target?.id==='gradePickSearch')merchPickerItems('grade');
  if(e.target?.id==='packPickSearch')merchPickerItems('pack');
 });
 document.addEventListener('change',e=>{
  if(e.target?.id==='packType')packTypeChanged();
  if(e.target?.name==='gradeCover')st.gradeCoverId=e.target.value;
  const type=e.target?.dataset?.merchPick;if(!type)return;
  const id=e.target.value,product=merchProducts().find(x=>s(x.id)===id);
  if(!product)return;
  if(type==='grade'){
   rememberGradeFields();
   if(e.target.checked)st.gradeSelected.set(id,{label:product.variation||product.name,price:product.price});
   else st.gradeSelected.delete(id);
   renderGradeSelected();
  }else{
   if(e.target.checked)st.packSelected.add(id);else st.packSelected.delete(id);
   renderPackSelected();
  }
 });
 document.addEventListener('submit',e=>{
  if(e.target?.id==='gradeManageForm')return saveGrade(e);
  if(e.target?.id==='packManageForm')return savePack(e);
 });
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-merch-action]');if(!b)return;
  const id=b.dataset.id,type=b.dataset.merchAction;
  if(type==='editGrade')gradeModal(id);
  if(type==='editPack')packModal(id);
  if(type==='disableGrade')disableMerch('grades',id);
  if(type==='disablePack')disableMerch('packs',id);
 });
}

/* Entrega e cashback em uma ação confirmada, sem alterar lançamentos financeiros. */
async function refreshFulfillment(){
 const data=await api('order-fulfillment');
 st.fulfillment=new Map((data.orders||[]).map(x=>[s(x.code),x]));
 if(st.view==='orders')renderOrders();
 return st.fulfillment;
}
function fulfillStatus(code){
 return st.fulfillment?.get(s(code))||null;
}
function orderLookup(code){
 return st.orders.find(x=>s(x.code)===s(code))||(window.__customerOrders||[]).find(x=>s(x.code)===s(code));
}
// Aprovação pela própria lista: novo -> aceitar; aceito -> concluir com conferência curta.
const quickAcceptPending=new Set();
async function quickAcceptOrder(code){
 if(quickAcceptPending.has(code))return;
 const order=orderLookup(code);
 if(!order)return toast('Pedido não localizado. Atualize a lista.',true);
 const current=s(fulfillStatus(code)?.status||order.status).toUpperCase();
 if(!['NOVO','PENDENTE','AGUARDANDO_ANALISE','AGUARDANDO_COTACAO_FRETE'].includes(current))
  return toast('Este pedido não está aguardando aceite. Atualize a lista.',true);
 const detail=(order.items||[]).slice(0,7).map(x=>n(x.quantity)+'× '+s(x.name)).join(', ');
 if(!window.confirm('ACEITAR pedido #'+code+' de '+s(order.name||'Cliente')+' por '+brl(order.total)+'?\n\n'+detail+'\n\nO aceite não marca a entrega nem reconhece pagamento.'))return;
 quickAcceptPending.add(code);
 const buttons=[...document.querySelectorAll('[data-action="quickAcceptOrder"]')].filter(b=>b.dataset.order===code);
 buttons.forEach(b=>{b.disabled=true;b.textContent='⏳ Aceitando...';});
 try{
  const out=await api('orders/'+encodeURIComponent(code)+'/accept',{method:'POST',body:{}});
  toast('✅ Pedido #'+code+' aceito.'+(out.erpSyncPending?' Integração ERP em andamento.':' ERP vinculado.')+(out.freightPending?' Confira o frete.':''));
  await loadAll();nav('orders');
 }catch(error){
  if(error.networkError){
   try{await loadAll();const found=orderLookup(code);if(['ACEITO','ABERTO','PRONTO'].includes(s(found?.status).toUpperCase()))return toast('✅ Pedido aceito. Estado confirmado na atualização.');}catch(_){}
  }
  toast('Aceite não confirmado: '+error.message,true);
 }finally{quickAcceptPending.delete(code);buttons.forEach(b=>{b.disabled=false;b.textContent='✅ Aceitar pedido';});}
}
const quickCashbackPending=new Set();
async function quickCashbackOrder(code){
 let f=fulfillStatus(code);
 const x=orderLookup(code);
 if(!x)return toast('Pedido não encontrado. Atualize os dados.',true);
 if(!f){
  try{await refreshFulfillment();f=fulfillStatus(code);}catch(error){return toast('Não foi possível consultar cashback: '+error.message,true);}
 }
 if(!f)return toast('Não foi possível consultar o cashback deste pedido.',true);
 if(f.completed)return manageOrderFulfillment(code);
 if(!['ACEITO','ABERTO','PRONTO'].includes(s(f.status).toUpperCase()))
  return toast('Aceite primeiro o pedido antes de decidir o cashback.',true);
 const canApprove=f.canApprove===true||f.eligible===true;
 const canOverride=f.canOverrideFirstPurchase===true;
 const approval=f.approval||'PENDENTE';
 const sum=canApprove?'<div class="notice success">💚 Valor estimado: <b>'+brl(f.estimate)+'</b>. O saldo será liberado somente após a entrega ou retirada.</div>':
  canOverride?'<div class="notice warn"><b>Exceção administrativa disponível.</b> Este cliente ainda não tem compra anterior concluída. A regra automática dos 3% continua valendo a partir da segunda compra; você pode autorizar <b>somente este pedido</b>, mediante justificativa.</div>':
  '<div class="notice warn">Cashback não elegível neste pedido: '+esc((f.reasons||[]).filter(t=>!s(t).includes('recusado explicitamente')).join(' ')||'Consulte as regras do programa.')+'</div>';
 const option=canApprove?'<label><input type="radio" name="quickCashbackDecision" value="APROVADO" '+(approval==='APROVADO'?'checked':'')+'> 💚 Aprovar cashback de '+brl(f.estimate)+(f.manualFirstPurchaseApproved?' (exceção já autorizada)':'')+'</label>':
  canOverride?'<label><input type="radio" name="quickCashbackDecision" value="APROVADO"> 💚 Aprovar '+brl(f.estimate)+' como EXCEÇÃO de primeira compra</label>':'';
 const exceptionForm=canOverride?'<div class="quick-cashback-exception"><label for="quickOverrideReason"><b>Justificativa obrigatória da exceção</b></label>'+
  '<textarea id="quickOverrideReason" maxlength="400" minlength="12" rows="3" placeholder="Ex.: Bonificação de fidelização autorizada para este pedido"></textarea>'+
  '<small>Esta autorização vale apenas para o pedido #'+esc(code)+'. Não cria cashback para outras primeiras compras.</small></div>':'';
 const details=f.manualFirstPurchaseApproved?'<p class="notice success">✅ Cashback aprovado por exceção administrativa. '+(f.manualOverrideReason?'Justificativa: '+esc(f.manualOverrideReason):'')+'</p>':'';
 modal('💚 Decidir cashback · pedido #'+code,
 '<p><b>'+esc(x.name||'Cliente')+'</b> • Pedido '+brl(x.total)+'</p>'+
 '<p><b>Decisão atual:</b> '+badge(approval)+'</p>'+details+sum+
 '<div class="fulfillment-options">'+option+
 '<label><input type="radio" name="quickCashbackDecision" value="REJEITADO" '+(approval==='REJEITADO'?'checked':'')+'> 🚫 Não liberar cashback neste pedido</label></div>'+
 exceptionForm+
 '<p class="notice">Salvar esta decisão <b>não</b> marca o pedido como entregue ou pago. Se aprovado, o crédito ficará disponível somente após a conclusão.</p>'+
 '<button class="btn primary" type="button" data-action="quickSaveCashback" data-order="'+esc(code)+'">💾 Salvar decisão de cashback</button>'+
 '<div class="notice warn" id="quickCashbackRepair" hidden><b>⚠️ Vínculo ERP indisponível.</b> O pedido da loja permanece intacto. Use a conciliação antes de salvar o cashback novamente. A conciliação não registra pagamento, entrega nem libera crédito.<div class="toolbar"><button class="btn" type="button" data-action="repairCashbackERP" data-order="'+esc(code)+'">🔧 Reparar vínculo ERP</button></div></div>');
}
async function quickSaveCashback(code){
 if(quickCashbackPending.has(code))return;
 const decision=document.querySelector('input[name="quickCashbackDecision"]:checked')?.value;
 if(!['APROVADO','REJEITADO'].includes(decision))return toast('Escolha Aprovar cashback ou Não liberar.',true);
 const f=fulfillStatus(code),x=orderLookup(code);
 if(!f||!x)return toast('Atualize o pedido e tente novamente.',true);
 const requestedOverride=decision==='APROVADO'&&f.canOverrideFirstPurchase===true&&f.canApprove!==true&&f.eligible!==true;
 const overrideReason=requestedOverride?s(E('quickOverrideReason')?.value).trim():'';
 if(decision==='APROVADO'&&!requestedOverride&&f.canApprove!==true&&f.eligible!==true)
  return toast('Cashback não elegível. A exceção é permitida somente para a primeira compra.',true);
 if(requestedOverride&&(overrideReason.length<12||overrideReason.length>400))
  return toast('Informe uma justificativa entre 12 e 400 caracteres para aprovar a exceção.',true);
 const value=decision==='APROVADO'?(requestedOverride?'APROVAR COMO EXCEÇÃO ADMINISTRATIVA ':'APROVAR ')+brl(f.estimate)+' de cashback (disponível somente depois da entrega)':'NÃO LIBERAR cashback';
 if(!window.confirm(value+' no pedido #'+code+' de '+s(x.name||'Cliente')+'?'))return;
 quickCashbackPending.add(code);
 const buttons=[...document.querySelectorAll('[data-action="quickSaveCashback"]')].filter(b=>b.dataset.order===code);
 buttons.forEach(b=>{b.disabled=true;b.textContent='⏳ Salvando decisão...';});
 try{
  const result=await api('orders/'+encodeURIComponent(code)+'/cashback-decision',{method:'POST',body:{decision,overrideFirstPurchase:requestedOverride,overrideReason:requestedOverride?overrideReason:undefined}});
  hideModal();
  await loadAll();nav('orders');
  toast(result.decision==='APROVADO'?(result.manualFirstPurchaseApproved?'💚 Exceção de primeira compra aprovada para o pedido #'+code+'. Crédito somente após entrega.':'💚 Cashback aprovado para o pedido #'+code+'. Crédito somente após entrega.'):'🚫 Pedido #'+code+': cashback não liberado.');
 }catch(error){
  if(error.networkError){
   try{await refreshFulfillment();const refreshed=fulfillStatus(code);if(refreshed?.approval===decision){
    hideModal();return toast('✅ Decisão registrada e confirmada na consulta do pedido.');
   }}catch(_){}
  }
  if(error.httpStatus===409&&/Vínculo do pedido no ERP não confere|Repare a integração|Pedido sem integração concluída/i.test(error.message)){
   const repair=E('quickCashbackRepair');if(repair){repair.hidden=false;repair.scrollIntoView?.({block:'nearest'});}
  }
  toast('Não foi possível confirmar a decisão: '+error.message,true);
 }finally{
  quickCashbackPending.delete(code);
  buttons.forEach(b=>{b.disabled=false;b.textContent='💾 Salvar decisão de cashback';});
 }
}
const quickERPRepairPending=new Set();
async function repairCashbackERP(code){
 if(quickERPRepairPending.has(code))return;
 if(!window.confirm('Conferir e restaurar o vínculo ERP do pedido #'+code+'? Esta ação não altera pagamentos, entrega ou cashback.'))return;
 quickERPRepairPending.add(code);
 const btn=[...document.querySelectorAll('[data-action="repairCashbackERP"]')].find(b=>b.dataset.order===code);
 if(btn){btn.disabled=true;btn.textContent='⏳ Conferindo vínculo no ERP...';}
 try{
  const result=await api('orders/'+encodeURIComponent(code)+'/reconcile-erp',{method:'POST',body:{}});
  if(!result.erpImported)throw Error('Não foi possível confirmar a ligação do ERP.');
  await refreshFulfillment();
  const repair=E('quickCashbackRepair');
  if(repair){repair.className='notice success';repair.innerHTML='<b>✅ Vínculo ERP conferido.</b> Nenhum cashback foi aprovado e nenhum pagamento foi lançado. Agora toque novamente em Salvar decisão de cashback.';}
  toast('✅ Vínculo ERP do pedido #'+code+' conferido. Salve a decisão novamente.');
 }catch(error){
  const repair=E('quickCashbackRepair');
  if(repair){repair.className='notice error';repair.hidden=false;}
  toast('Conciliação não confirmada: '+error.message,true);
 }finally{
  quickERPRepairPending.delete(code);
  if(btn&&btn.isConnected){btn.disabled=false;btn.textContent='🔧 Reparar vínculo ERP';}
 }
}
function showFinishAlert(message,error=true){
 const box=E('quickFinishAlert');
 if(box){box.className='notice '+(error?'error':'success');box.textContent=message;box.hidden=false;
  box.scrollIntoView?.({behavior:'smooth',block:'nearest'});}
 toast(message,error);
}
function quickFinishOrder(code){
 const order=orderLookup(code),f=fulfillStatus(code);
 if(!order)return toast('Pedido não encontrado. Atualize os dados.',true);
 if(!f)return manageOrderFulfillment(code);
 if(f.completed)return toast('Este pedido já foi concluído.',true);
 if(!['ACEITO','ABERTO','PRONTO'].includes(s(f.status).toUpperCase()))
  return toast('O pedido ainda não foi aceito. Clique em Aceitar pedido primeiro.',true);
 const pickup=s(f.modalidade||order.modality).toUpperCase()==='RETIRADA';
 const canApprove=f.canApprove===true||f.eligible===true,approval=f.approval||'PENDENTE';
 const mpConfirmed=s(order.paymentStatus).toUpperCase()==='APROVADO'&&
  n(order.providerPaidAmount)+0.001>=n(order.total)&&isMercadoPagoOrder(order);
 const legacyConfirmed=order.manualPayment?.status==='CONFIRMADO';
 const previousCents=Math.max(0,Number(order.receivables?.receivedCents)||0);
 const alreadyDue=Math.max(0,Math.round(Number(order.total)*100)-previousCents);
 const ledgerSettled=order.receivables?.status==='QUITADO'&&previousCents>0;
 const confirmedAlready=mpConfirmed||legacyConfirmed||ledgerSettled;
 const cashEligible=f.canApprove===true||f.eligible===true;
 const decision='<div class="quick-finish-step"><h3>1️⃣ Escolha o cashback</h3>'+
  '<p>Para pagamento parcial ou Conta Cliente, o cashback fica pendente até o pedido ser quitado.</p>'+
  '<div class="fulfillment-options quick-finalize">'+
  (cashEligible?'<label><input type="radio" name="quickCashbackDecision" value="APROVADO"> 💚 Aprovar cashback de '+brl(f.estimate)+' (apenas quitado)</label>':'')+
  '<label><input type="radio" name="quickCashbackDecision" value="PENDENTE"> ⏳ Aguardar quitação para decidir o cashback</label>'+
  '<label><input type="radio" name="quickCashbackDecision" value="REJEITADO" checked> 🚫 Não liberar cashback</label></div>'+
  (!cashEligible?'<p class="notice warn">Cashback não elegível agora: '+esc((f.reasons||[]).join(' ')||'Critérios ainda não atendidos.')+'</p>':'')+'</div>';
 const details=(order.items||[]).map(x=>'<li>'+esc(n(x.quantity)+'× '+s(x.name))+'</li>').join('');
 const options=confirmedAlready
  ?'<option value="CONFIRMADO">'+(mpConfirmed?'Mercado Pago — pagamento aprovado':'Pagamento manual já confirmado')+'</option>'
  :'<option value="PIX">Pix</option><option value="CREDITO">Cartão de crédito</option><option value="DEBITO">Cartão de débito</option><option value="CONTA_CLIENTE">Conta Cliente (a prazo)</option><option value="DINHEIRO">Dinheiro</option><option value="TRANSFERENCIA">Transferência</option>';
 const payAmount=confirmedAlready?'0.00':(alreadyDue/100).toFixed(2);
 modal('📦 Finalização do pedido #'+code,
  '<div class="notice warn"><b>⏳ PEDIDO AINDA NÃO FINALIZADO.</b> Confirme a entrega e o pagamento real, ou indique Conta Cliente. A venda e os recebimentos ficarão separados no financeiro.</div>'+
  '<p><b>'+esc(order.name||'Cliente')+'</b> • '+brl(order.total)+' • '+(pickup?'Retirada':'Entrega')+'</p>'+
  '<details><summary>Ver itens do pedido</summary><ul>'+details+'</ul></details>'+
  decision+
  '<div class="quick-finish-step"><h3>2️⃣ Confirme entrega e pagamento</h3>'+
  '<label class="quick-check"><input type="checkbox" id="fulfillmentDelivered"> ✅ Confirmo que o cliente '+(pickup?'retirou':'recebeu')+' o pedido</label>'+
  '<div class="form-grid"><label>Como o cliente pagou?<select id="quickPaymentMethod"'+(confirmedAlready?' disabled':'')+'>'+options+'</select></label>'+
  '<label>Valor efetivamente recebido agora (R$)<input type="number" id="quickPaymentAmount" min="0" step="0.01" max="'+(alreadyDue/100).toFixed(2)+'" value="'+payAmount+'" '+(confirmedAlready?'disabled':'')+'></label></div>'+
  '<label class="form-label" for="quickPaymentReference">Comprovante / referência (se houver)</label>'+
  '<input id="quickPaymentReference" maxlength="140" placeholder="Pix, NSU do cartão, número do comprovante" '+(confirmedAlready?'disabled':'')+'>'+
  '<div class="fulfillment-options quick-finalize" id="quickPaymentConfirmation"><label class="quick-check"><input type="checkbox" id="fulfillmentPayment"'+(confirmedAlready?' checked disabled':'')+'> ✅ Confirmo que o valor informado entrou de verdade no caixa, na conta ou na maquininha</label></div>'+
  '<div id="quickPaymentSummary" class="notice"></div>'+
  (confirmedAlready?'<div class="notice success">Pagamento já confirmado no pedido. A finalização não criará outra cobrança.</div>':
   isMercadoPagoOrder(order)?'<div class="notice warn">⚠️ Este pedido possui tentativa Mercado Pago. Se ela ainda estiver pendente, o servidor bloqueará outra baixa até a conciliação.</div>':'')+
  '<p class="muted"><b>Conta Cliente:</b> informe R$ 0,00 para venda totalmente a prazo. Se o cliente pagar apenas uma parte, informe o valor real recebido; a diferença ficará a receber.</p></div>'+
  (!f.erpLinked||f.integration!=='IMPORTADO'?'<p class="notice warn">Integração ERP pendente; o recebimento será registrado na Central para conciliação.</p>':'')+
  '<div id="quickFinishAlert" class="notice error" hidden role="alert"></div>'+
  '<button id="quickFinishSubmit" class="btn primary" type="button" data-action="quickConfirmOrder" data-order="'+esc(code)+'">✅ CONFIRMAR '+(pickup?'RETIRADA':'ENTREGA')+' E FINALIZAR AGORA</button>'+
  '<p class="muted">A venda será registrada uma única vez no DRE. Cada pagamento gera seu cartão em Conta Cliente, sem nova receita na DRE.</p>');
 const methodInput=E('quickPaymentMethod'),amountInput=E('quickPaymentAmount');
 function updatePayment(){
  if(!methodInput)return;
  if(methodInput.value==='CONTA_CLIENTE'&&amountInput){amountInput.value='0.00';}
  const cents=confirmedAlready?0:Math.round((Number(amountInput?.value)||0)*100);
  const total=Math.round(Number(order.total)*100),effectivePrior=confirmedAlready?total:previousCents;
  const balance=Math.max(0,total-effectivePrior-cents);
  const paymentConfirm=E('quickPaymentConfirmation'),paymentCheck=E('fulfillmentPayment');
  if(paymentConfirm){
   paymentConfirm.hidden=!confirmedAlready&&cents===0;
   if(cents===0&&!confirmedAlready&&paymentCheck)paymentCheck.checked=false;
  }
  if(!confirmedAlready&&balance>0){
   const pending=document.querySelector('input[name="quickCashbackDecision"][value="PENDENTE"]');
   if(pending)pending.checked=true;
  }
  const msg=E('quickPaymentSummary');
  if(msg)msg.innerHTML='<b>Venda:</b> '+brl(order.total)+(effectivePrior? ' · <b>Já recebido:</b> '+brl(effectivePrior/100):'')+' · <b>Recebido agora:</b> '+brl(cents/100)+
   ' · <b>Conta Cliente (saldo):</b> '+brl(balance/100)+(balance>0?' <strong>— PENDENTE</strong>':' <strong>— QUITADO</strong>');
 }
 methodInput?.addEventListener?.('change',updatePayment);
 amountInput?.addEventListener?.('input',updatePayment);
 updatePayment();
 const el=E('modal');
 el?.setAttribute('aria-label','Confirmação final obrigatória para pedido '+code);
 E('modalContent')?.scrollTo?.({top:0});
 E('quickFinishSubmit')?.focus?.({preventScroll:true});
}
function quickConfirmOrder(code){
 const paid=E('fulfillmentPayment')?.checked===true,delivered=E('fulfillmentDelivered')?.checked===true;
 const method=E('quickPaymentMethod')?.value||'',amount=Math.round(Number(E('quickPaymentAmount')?.value||0)*100);
 if(!delivered)return showFinishAlert('Para concluir o pedido, confirme que o cliente recebeu ou retirou o pedido.');
 if(!Number.isSafeInteger(amount)||amount<0)return showFinishAlert('Informe corretamente o valor recebido.',true);
 if(amount>0&&!paid)return showFinishAlert('Confirme que o valor recebido realmente entrou no caixa ou na conta.',true);
 if(amount===0&&!['CONTA_CLIENTE','CONFIRMADO'].includes(method))
  return showFinishAlert('Sem valor recebido, selecione Conta Cliente. O sistema criará o saldo a receber.',true);
 const decision=document.querySelector('input[name="quickCashbackDecision"]:checked')?.value;
 if(!['APROVADO','REJEITADO','PENDENTE'].includes(decision))
  return showFinishAlert('Escolha a decisão de cashback, inclusive Aguardar quitação.',true);
 if(method!=='CONFIRMADO'&&amount+Math.max(0,Number(orderLookup(code)?.receivables?.receivedCents)||0)<Math.round(Number(orderLookup(code)?.total||0)*100)&&decision==='APROVADO')
  return showFinishAlert('Pagamento parcial: cashback precisa ficar pendente até a quitação.',true);
 if(method==='CONFIRMADO'&&decision==='PENDENTE')return showFinishAlert('Pedido quitado: escolha aprovar ou não liberar cashback.',true);
 const form=E('modalContent');if(!form)return toast('Janela de conclusão indisponível. Atualize a Central.',true);
 const old=form.querySelector('input[name="fulfillmentCashback"]');if(old)old.remove();
 const input=document.createElement('input');input.type='radio';input.name='fulfillmentCashback';input.value=decision;input.checked=true;input.hidden=true;form.appendChild(input);
 return confirmOrderComplete(code);
}
async function manageOrderFulfillment(code){
 let x=orderLookup(code);
 if(!x)return toast('Pedido não encontrado na Central. Atualize primeiro.',true);
 if(!fulfillStatus(code)){
  try{await refreshFulfillment();}catch(error){return toast('Não foi possível carregar cashback: '+error.message,true);}
 }
 const f=fulfillStatus(code);
 if(!f)return modal('Entrega e cashback · '+code,'<p class="notice error">Não foi possível obter o controle de cashback para este pedido.</p>');
 const paid=Number(f.credit)>0,complete=f.completed,eligible=f.eligible,imported=f.integration==='IMPORTADO'&&f.erpLinked;
 const notes=(f.reasons||[]).map(v=>'<li>'+esc(v)+'</li>').join('');
 const base='<p><b>Pedido:</b> '+esc(code)+'<br><b>Cliente:</b> '+esc(x.name||'Não informado')+
 '<br><b>Total do pedido:</b> '+brl(x.total)+'<br><b>Receita de produtos (DRE):</b> '+brl(f.receitaProdutos)+'<br><b>Modalidade:</b> '+esc(f.modalidade||x.modality||'—')+
 '<br><b>Status na loja:</b> '+badge(f.status)+'<br><b>Integração ERP:</b> '+badge(f.integration)+
 '<br><b>Cashback:</b> '+badge(f.approval)+'<br><b>Compras anteriores concluídas:</b> '+n(f.previousCompleted)+'</p>'+
 '<div class="cashback-summary"><div><small>Percentual</small><b>'+n(f.percent).toLocaleString('pt-BR')+'%</b></div>'+
 '<div><small>Crédito previsto</small><b>'+brl(f.estimate)+'</b></div><div><small>Crédito liberado</small><b>'+brl(f.credit)+'</b></div></div>'+
 (notes?'<div class="notice warn"><b>Atenção aos critérios:</b><ul>'+notes+'</ul></div>':'');
 if(complete){
  const balance=Number(x.receivables?.balanceCents);
  const awaitingPayment=Number.isFinite(balance)&&balance>0;
  const content=paid?'<div class="notice success">✅ Pedido concluído e cashback de '+brl(f.credit)+' já disponível ao cliente. Não será creditado novamente.</div>':
   awaitingPayment?'<div class="notice warn">✅ Entrega/retirada concluída. O cliente ainda deve '+brl(balance/100)+' em Conta Cliente. Cashback pendente até quitação integral; nenhum crédito foi liberado.</div>':
   '<div class="notice">✅ O pedido já consta como <b>'+esc(f.status)+'</b>. '+(eligible?'Há cashback elegível ainda não creditado.':'Nenhum crédito elegível está confirmado para liberação.')+'</div>';
  modal('✅ Situação do pedido '+code,base+content+
  (awaitingPayment?'<button class="btn primary" type="button" data-action="goReceivables">💳 Consultar saldo em Conta Cliente</button>':
   eligible&&!paid?'<button class="btn primary" type="button" data-action="releaseOrderCashback" data-order="'+esc(code)+'">💚 Liberar '+brl(f.estimate)+' de cashback</button>':''));
  return;
 }
 const isPickup=s(f.modalidade).toUpperCase()==='RETIRADA',delivery=isPickup?'RETIRADO':'ENTREGUE';
 const option=eligible?'<label><input type="radio" name="fulfillmentCashback" value="APROVADO" '+(f.approval==='APROVADO'?'checked':'')+'> 💚 Aprovar e liberar '+brl(f.estimate)+' após '+(isPickup?'retirada':'entrega')+'</label>':'';
 const checked=eligible?f.approval==='REJEITADO'?'checked':'':'checked';
 modal('📦 Concluir pedido '+code,base+
 '<h3>1. Decisão de cashback</h3><div class="fulfillment-options">'+option+
 '<label><input type="radio" name="fulfillmentCashback" value="REJEITADO" '+checked+'> Não liberar cashback neste pedido</label></div>'+
 (eligible?'<button class="btn" type="button" data-action="approveOrderCashback" data-order="'+esc(code)+'">💚 Aprovar cashback agora (saldo só após entrega)</button>':'')+
 '<h3>2. Confirmações obrigatórias</h3><div class="fulfillment-options">'+
 '<label><input type="checkbox" id="fulfillmentDelivered"> Confirmo que o cliente '+(isPickup?'retirou':'recebeu')+' o pedido.</label>'+
 '<label><input type="checkbox" id="fulfillmentPayment"> Conferi o recebimento do pagamento (não cria lançamento financeiro).</label></div>'+
 '<div class="notice">Ao confirmar, o pedido passa para <b>'+delivery+'</b> na loja e sua receita de produtos passa a entrar nas vendas concluídas e no DRE. '+(imported?'A situação será atualizada também no ERP.':'A integração ERP ficará sinalizada como pendente, sem bloquear a retirada ou entrega.')+' '+(eligible?'Se aprovar o cashback, o crédito será lançado uma única vez.':'O cashback não está elegível nesta confirmação.')+'</div>'+
 '<button class="btn primary" type="button" data-action="completeOrder" data-order="'+esc(code)+'">✅ Confirmar '+(isPickup?'retirada':'entrega')+' e finalizar pedido</button>'+
 (!imported?'<p class="notice warn">ℹ️ Ainda sem integração ERP: a venda poderá ser concluída e entrará no DRE. O vínculo com ERP será conciliado separadamente; não lance a receita manualmente.</p>':''));
}
async function approveOrderCashback(code){
 if(!window.confirm('Aprovar o cashback deste pedido? O crédito ficará disponível SOMENTE após a entrega/retirada.'))return;
 try{
  const out=await api('orders/'+encodeURIComponent(code)+'/cashback-decision',{method:'POST',body:{decision:'APROVADO'}});
  toast('✅ Cashback de '+brl(out.estimated)+' aprovado. Falta concluir a entrega.');
  await refreshFulfillment();manageOrderFulfillment(code);
 }catch(error){toast('Falha ao aprovar: '+error.message,true);}
}
const completionPending=new Set(),completionRequestIds=new Map();
async function confirmOrderComplete(code){
 if(completionPending.has(code))return;
 const delivered=E('fulfillmentDelivered')?.checked===true,payment=E('fulfillmentPayment')?.checked===true;
 const decision=document.querySelector('input[name="fulfillmentCashback"]:checked')?.value||'';
 const method=E('quickPaymentMethod')?.value||'';
 const raw=Number(E('quickPaymentAmount')?.value||0),amountCents=Math.round(raw*100);
 if(!decision)return showFinishAlert('Escolha a decisão de cashback.',true);
 if(!delivered||(!method&&!payment))return showFinishAlert('Confirme a entrega e, se houve pagamento, o recebimento real.',true);
 if(method){
  if(!Number.isFinite(raw)||!Number.isSafeInteger(amountCents)||amountCents<0)
   return showFinishAlert('Valor de pagamento inválido.',true);
  if(amountCents>0&&!payment)return showFinishAlert('Confirme o recebimento do valor informado.',true);
  if(method==='CONTA_CLIENTE'&&amountCents!==0)return showFinishAlert('Conta Cliente deve iniciar com R$ 0,00; para entrada parcial selecione Pix, Crédito ou Débito.',true);
 }
 const x=orderLookup(code),rule=fulfillStatus(code);
 const alreadyCents=Math.max(0,Number(x?.receivables?.receivedCents)||0);
 const remaining=method==='CONFIRMADO'?0:Math.max(0,Math.round(Number(x?.total||0)*100)-alreadyCents-amountCents);
 const message='CONFIRMAÇÃO DEFINITIVA: pedido '+code+' ('+brl(x?.total)+') será '+(s(rule?.modalidade).toUpperCase()==='RETIRADA'?'RETIRADO':'ENTREGUE')+
  (method?' · Recebimento agora: '+brl(amountCents/100)+' · Conta Cliente: '+brl(remaining/100):'')+
  ' · Cashback: '+(decision==='APROVADO'?brl(rule?.estimate):decision==='PENDENTE'?'aguardando quitação':'não liberar')+'. Confirmar?';
 if(!window.confirm(message))return;
 completionPending.add(code);
 const button=E('quickFinishSubmit');
 if(button){button.disabled=true;button.textContent='⏳ Registrando conclusão no sistema...';}
 let out;
 try{
  const received={confirmDelivered:true,paymentChecked:payment,cashbackDecision:decision};
   if(method){
    if(!completionRequestIds.has(code))completionRequestIds.set(code,crypto.randomUUID());
    Object.assign(received,{paymentMethod:method,paymentAmountCents:amountCents,paymentRequestId:completionRequestIds.get(code),
     paymentReference:s(E('quickPaymentReference')?.value||'').trim()});
   }
   out=await api('orders/'+encodeURIComponent(code)+'/complete',{method:'POST',body:received});
  if(!out?.ok||!['RETIRADO','ENTREGUE','CONCLUIDO','FINALIZADO'].includes(s(out.status).toUpperCase()))
   throw Error('O servidor não confirmou a conclusão do pedido. Atualize e confira o status antes de repetir.');
 }catch(error){
  const legacyGate=/CASHBACK_REVIEW_REQUIRED|Aprove ou recuse o cashback em Encomendas e Disponibilidade/i.test(error.message);
  showFinishAlert(legacyGate?
   'Pedido '+code+' NÃO foi finalizado. Uma regra antiga de cashback do banco bloqueia a venda a prazo com saldo em Conta Cliente. Não é um erro do pagamento nem da confirmação. Nenhum recebimento foi lançado; o ajuste exige autorização para atualizar a regra no Neon.':
   'Pedido '+code+' NÃO teve a conclusão confirmada: '+error.message+'. Confira o status antes de tentar novamente.',true);
  if(error.networkError){
   try{await refreshFulfillment();if(fulfillStatus(code)?.completed){
    hideModal();toast('✅ O pedido '+code+' já consta como concluído após reconciliação.',false);
    try{await loadAll();nav('orders');}catch(_){}return;
   }}catch(_){}
  }
  return;
 }finally{
  completionPending.delete(code);
  if(button){button.disabled=false;button.textContent='✅ CONFIRMAR E FINALIZAR AGORA';}
 }
 completionRequestIds.delete(code);
 // A operação já foi confirmada pelo servidor. Falhas ao recarregar a lista não a desfazem.
 const finalStatus=s(out.status).toUpperCase();
 hideModal();
 modal('✅ PEDIDO #'+code+' FINALIZADO',
  '<div class="notice success"><b>✅ Confirmação salva.</b> O pedido passou para <b>'+esc(finalStatus)+'</b> na loja. '+(out.erpSynced?'ERP atualizado.':'Aguardando conciliação com o ERP.')+'</div>'+
  '<p><b>Receita de produtos no DRE:</b> '+brl(out.receitaProdutos)+
  (out.receivedCents!=null?'<br><b>Recebido confirmado:</b> '+brl(out.receivedCents/100)+
   '<br><b>Saldo em Conta Cliente:</b> '+brl((out.balanceCents||0)/100):'')+
  '<br><b>Cashback liberado:</b> '+brl(out.credited)+'</p>'+
  '<div class="toolbar"><button class="btn primary" type="button" data-action="goReceivables">💳 Ver cartões da venda e pagamentos</button>'+
  '<button class="btn" type="button" id="quickFinishClose" data-action="closeModal">✅ Voltar para pedidos</button></div>');
 try{await loadAll();nav('orders');}
 catch(error){toast('✅ Pedido finalizado, mas a lista não atualizou. Clique em Atualizar para ver o novo status.',true);}
}
async function releaseOrderCashback(code){
 const rule=fulfillStatus(code);
 if(!rule?.completed||!rule?.eligible)return toast('Este pedido não está apto à liberação manual.',true);
 if(!window.confirm('LIBERAR '+brl(rule.estimate)+' de cashback para o pedido já '+rule.status+'? O crédito será disponibilizado ao cliente.'))return;
 try{
  const out=await api('orders/'+encodeURIComponent(code)+'/release-cashback',{method:'POST',body:{confirmRelease:true}});
  hideModal();toast('💚 Cashback de '+brl(out.credited)+' liberado para o pedido '+code+'.');
  await loadAll();nav('orders');
 }catch(error){toast('Falha ao liberar cashback: '+error.message,true);}
}

/* Fichas Técnicas — espelha erp_records(entity_type=fichas). */
async function loadFichas(){
 E('fichaStatus').className='notice';E('fichaStatus').textContent='Consultando fichas técnicas e custos no ERP…';
 try{
  const result=await api('fichas');st.fichasData=result;
  E('fichaStatus').textContent='Fichas sincronizadas com o ERP. Custo estimado pelos insumos atuais; não representa custo contábil histórico.';
  renderFichas();
 }catch(err){E('fichaStatus').className='notice error';E('fichaStatus').textContent='Falha ao consultar fichas: '+err.message;}
}
function fichaProducts(){return st.fichasData?.products||[]}
function fichaFor(id){return (st.fichasData?.fichas||[]).filter(f=>s(f.productId)===s(id)&&s(f.status).toUpperCase()!=='INATIVO').sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt))[0]}
function fichaWarning(p){
 if(!p||p.costStatus==='SEM_FICHA_TECNICA')return '<span class="badge warn">⚠️ Não possui ficha técnica</span>';
 if(p.costStatus==='CUSTO_CALCULADO')return '<span class="badge good">✅ Custo: '+brl(p.unitCost)+'</span>';
 if(p.costStatus==='CUSTO_ESTOQUE')return '<span class="badge light">Custo de estoque: '+brl(p.unitCost)+'</span>';
 return '<span class="badge warn">⚠️ Ficha/custo incompleto</span>';
}
function isFinishedProduct(p){return (p.types||[]).some(t=>s(t).toLowerCase().includes('produto acabado'))}
function renderFichas(){
 if(!st.fichasData)return;
 const products=fichaProducts(),fichas=st.fichasData.fichas||[],missing=products.filter(p=>isFinishedProduct(p)&&p.costStatus==='SEM_FICHA_TECNICA');
 const incomplete=products.filter(p=>p.hasFicha&&p.costStatus!=='CUSTO_CALCULADO');
 E('fichasKpis').innerHTML=[
  statsCard('📋','Fichas cadastradas',fichas.length,'Existentes no ERP'),
  statsCard('⚠️','Acabados sem ficha',missing.length,'Atenção ao custo dos produtos vendidos'),
  statsCard('🧮','Custo incompleto',incomplete.length,'Falta de rendimento, insumos ou custo'),
  statsCard('✅','Custo calculado',products.filter(p=>p.costStatus==='CUSTO_CALCULADO').length,'Custo atual por unidade')
 ].join('');
 const q=s(E('fichaSearch').value).trim().toLowerCase(),filter=E('fichaFilter').value;
 const list=products.filter(p=>(s(p.name)+' '+s(p.code)).toLowerCase().includes(q)&&(filter==='all'||filter==='sem_ficha'&&isFinishedProduct(p)&&p.costStatus==='SEM_FICHA_TECNICA'||filter==='incomplete'&&p.hasFicha&&p.costStatus!=='CUSTO_CALCULADO'||filter==='ok'&&p.costStatus==='CUSTO_CALCULADO'));
 E('fichasList').innerHTML=list.length?'<div class="mobile-list">'+list.map(p=>{
  const existing=fichaFor(p.id);
  return '<article class="mobile-record"><div class="mobile-record-head"><b>'+esc(p.name)+'</b>'+fichaWarning(p)+'</div><p>'+esc(p.code)+' · '+esc(p.unit)+' · '+esc((p.types||[]).join(', '))+'</p>'+
   (p.hasFicha&&p.warnings?.length?'<p class="muted">'+esc(p.warnings.join(' · '))+'</p>':'')+
   '<div class="record-actions"><button type="button" class="btn small primary" data-ficha-edit="'+esc(p.id)+'">'+(existing?'✏️ Editar ficha':'➕ Cadastrar ficha')+'</button></div></article>';
 }).join('')+'</div>':cellEmpty('Nenhum produto encontrado neste filtro.');
}
function fichaOptions(selected){
 return '<option value="">Selecione um produto…</option>'+fichaProducts().map(p=>'<option value="'+esc(p.id)+'" '+(s(p.id)===s(selected)?'selected':'')+'>'+esc(p.name)+' · '+esc(p.code||'sem código')+' ('+esc(p.unit)+')</option>').join('');
}
function fichaComponentRow(component={}){
 const row=document.createElement('div');row.className='ficha-component-row';
 row.innerHTML='<label>Insumo ou subproduto<select data-ficha-insumo required>'+fichaOptions(component.produtoId)+'</select></label>'+
 '<label>Quantidade<input type="number" min="0.000001" step="any" data-ficha-qty required value="'+esc(component.quantidade??1)+'"></label>'+
 '<label>Custo unitário manual (opcional)<input type="number" min="0.01" step=".01" data-ficha-manual placeholder="Automático" value="'+esc(component.custoUnitarioManual??'')+'"></label>'+
 '<button class="btn small" type="button" data-ficha-remove>✖ Remover</button>';
 return row;
}
function openFicha(productId='',fichaId=''){
 if(!st.fichasData)return toast('Carregue as fichas técnicas antes de cadastrar.',true);
 const existing=(st.fichasData.fichas||[]).find(f=>s(f.id)===s(fichaId))||fichaFor(productId)||null;
 const pId=productId||existing?.productId||'';
 const html='<form id="fichaForm" data-id="'+esc(existing?.id||'')+'" class="product-form">'+
 '<label>Produto acabado / subproduto<select id="fichaProduct" name="productId" required>'+fichaOptions(pId)+'</select></label>'+
 '<div class="form-grid"><label>Rendimento da receita<input name="yield" type="number" min="0.000001" step="any" required value="'+esc(existing?.yield||1)+'"></label>'+
 '<label>Unidade de rendimento<select name="unit">'+['UN','KG','G','L','ML','PCT','CX'].map(v=>'<option value="'+v+'" '+(s(existing?.unit||'UN')===v?'selected':'')+'>'+v+'</option>').join('')+'</select></label></div>'+
 '<div class="form-grid"><label>Custo adicional total (R$)<input name="extraCost" type="number" min="0" step=".01" value="'+esc(existing?.extraCost||0)+'"></label>'+
 '<label>Quantidade mínima de produção<input name="minimumProduction" type="number" min="1" step="1" value="'+esc(existing?.minimumProduction||1)+'"></label></div>'+
 '<div class="form-grid"><label>Antecedência (dias)<input name="leadDays" type="number" min="0" max="365" value="'+esc(existing?.leadDays||0)+'"></label>'+
 '<label>Dia de produção (0–7)<input name="productionDay" type="number" min="0" max="7" value="'+esc(existing?.productionDay||0)+'"></label></div>'+
 '<h3>Ingredientes / insumos da ficha</h3><p class="muted">A quantidade deve usar a unidade cadastrada no próprio insumo. Ex.: 0,5 KG para 500 g quando a unidade for KG.</p>'+
 '<div id="fichaComponentList"></div><button type="button" class="btn" id="addFichaComponent">➕ Adicionar insumo</button>'+
 '<label>Modo de preparo / observações<textarea name="notes" rows="5" maxlength="10000">'+esc(existing?.notes||'')+'</textarea></label>'+
 '<div class="notice">A ficha será salva no ERP. Um custo incompleto será sinalizado em vez de presumir um valor. A publicação não altera automaticamente preços de venda.</div>'+
 '<button type="submit" class="btn primary" style="width:100%">💾 Salvar ficha técnica</button></form>';
 modal(existing?'✏️ Editar ficha técnica':'➕ Cadastrar ficha técnica',html);
 E('addFichaComponent').addEventListener('click',()=>E('fichaComponentList').appendChild(fichaComponentRow()));
 const old=existing?.components?.length?existing.components:[{}];
 old.forEach(part=>E('fichaComponentList').appendChild(fichaComponentRow(part)));
 E('fichaComponentList').addEventListener('click',e=>{if(e.target.closest('[data-ficha-remove]')){const rows=E('fichaComponentList').querySelectorAll('.ficha-component-row');if(rows.length>1)e.target.closest('.ficha-component-row').remove();}});
 E('fichaProduct').addEventListener('change',()=>{const f=fichaFor(E('fichaProduct').value);if(f&&s(f.id)!==s(E('fichaForm').dataset.id))toast('Este produto já possui ficha. Escolha Editar ficha na lista.',true);});
}
async function saveFicha(e){
 e.preventDefault();const form=e.target,fd=new FormData(form),lines=[...form.querySelectorAll('.ficha-component-row')];
 const components=lines.map(line=>{
  const manual=line.querySelector('[data-ficha-manual]').value;
  return {productId:line.querySelector('[data-ficha-insumo]').value,quantity:Number(line.querySelector('[data-ficha-qty]').value),manualCost:manual===''?null:Number(manual)};
 });
 const payload={id:form.dataset.id||undefined,productId:s(fd.get('productId')),yield:Number(fd.get('yield')),unit:s(fd.get('unit')),extraCost:Number(fd.get('extraCost')),components,
  minimumProduction:Number(fd.get('minimumProduction')),leadDays:Number(fd.get('leadDays')),productionDay:Number(fd.get('productionDay')),notes:s(fd.get('notes'))};
 if(!payload.productId||components.some(x=>!x.productId||x.quantity<=0))return toast('Revise o produto, os componentes e as quantidades.',true);
 if(!window.confirm('Salvar a ficha técnica com '+components.length+' componente(s) diretamente no ERP Caseirinho?'))return;
 const btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Salvando ficha…';
 try{await api('fichas',{method:'POST',body:payload});hideModal();toast('✅ Ficha técnica salva no ERP.');await loadFichas();if(st.salesLoaded)await loadSales();nav('fichas');}
 catch(err){toast('Falha ao salvar ficha: '+err.message,true);}
 finally{btn.disabled=false;btn.textContent='💾 Salvar ficha técnica';}
}
/* Histórico real de cashback: inclui somente lançamentos do ledger contábil do programa. */
async function loadCashbacks(){
 E('cashbackError').hidden=true;
 try{st.cashbacksData=await api('cashback-customers');renderCashbacks();}
 catch(err){E('cashbackError').hidden=false;E('cashbackError').textContent='Erro ao consultar saldos: '+err.message;}
}
function filteredCashbacks(){
 const d=st.cashbacksData;if(!d)return[];
 const q=s(E('cashbackSearch').value).toLowerCase(),filter=E('cashbackFilter').value;
 return(d.customers||[]).filter(x=>(s(x.name)+' '+s(x.phone)).toLowerCase().includes(q)&&(filter==='all'||filter==='available'&&x.available>0||filter==='used'&&x.used>0||filter==='zero'&&x.available<=0));
}
function renderCashbacks(){
 const d=st.cashbacksData;if(!d)return;
 const t=d.totals||{};
 E('cashbackKpis').innerHTML=[
  statsCard('👤','Clientes com conta',t.customers||0,'Cadastro de cashback'),
  statsCard('💚','Disponível',brl(t.available),'Descontadas reservas ativas'),
  statsCard('🏦','Crédito acumulado',brl(t.credited),'Créditos confirmados'),
  statsCard('🛒','Cashback utilizado',brl(t.used),'Débitos realizados')
 ].join('');
 const list=filteredCashbacks();
 E('cashbackList').innerHTML=list.length?'<div class="mobile-list">'+list.map(x=>
  '<article class="mobile-record"><div class="mobile-record-head"><b>'+esc(x.name)+'</b><span class="badge good">'+brl(x.available)+' disponível</span></div>'+
  '<p>📱 '+esc(tel(x.phone))+' · '+x.ordersCredited+' pedido(s) com crédito</p>'+
  '<div class="cashback-summary"><div><small>Creditado</small><b>'+brl(x.credited)+'</b></div><div><small>Utilizado</small><b>'+brl(x.used)+'</b></div><div><small>Reservado</small><b>'+brl(x.reserved)+'</b></div></div>'+
  '<div class="record-actions"><button class="btn small primary" type="button" data-cashback-history="'+esc(x.id)+'">📑 Ver extrato</button> <button class="btn small" type="button" data-cashback-account="'+esc(x.id)+'">👤 Conta do cliente</button> <button class="btn small" type="button" data-cashback-whatsapp="'+esc(x.id)+'">💬 WhatsApp</button></div></article>').join('')+'</div>':cellEmpty('Nenhuma conta de cashback encontrada para estes filtros.');
}
function cashbackContact(id){
 const x=(st.cashbacksData?.customers||[]).find(v=>s(v.id)===s(id));
 if(!x)return toast('Cliente não encontrado.',true);
 const phone=digits(x.phone||'').replace(/^55(?=\d{10,11}$)/,'');
 if(!/^\d{10,11}$/.test(phone))return toast('WhatsApp inválido.',true);
 const first=s(x.name||'cliente').trim().split(/\s+/)[0];
 const msg='Olá, '+first+'! 💚 Aqui é da Caseirinho Massas Artesanais. Estamos com saudades! Você tem '+brl(x.available)+' de cashback disponível para utilizar na sua próxima compra. Será um prazer atender você novamente! 🍝';
 window.open('https://wa.me/55'+phone+'?text='+encodeURIComponent(msg),'_blank','noopener,noreferrer');
}
async function cashbackAccount(id){
 const x=(st.cashbacksData?.customers||[]).find(v=>s(v.id)===s(id));
 if(!x)return toast('Cliente não encontrado.',true);
 modal('👤 Conta do cliente · '+s(x.name),'<p>Consultando histórico de compras...</p>');
 try{
  const result=await api('orders');
  const orders=(result.orders||[]).filter(o=>digits(o.phone||o.customer_phone||o.customer?.phone||o.payload?.customer?.phone)===digits(x.phone)&&digits(x.phone).length>=10).slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));
  window.__customerOrders=orders;
  const last=orders.find(o=>!['CANCELADO','CANCELLED','RECUSADO','REJECTED'].includes(s(o.status).toUpperCase()));
  const days=last?Math.max(0,Math.floor((Date.now()-new Date(last.created_at).getTime())/86400000)):null;
  const status=days===null?'Nenhuma compra localizada no histórico.':days>=15?'⚠️ Sem compras há '+days+' dias.':'Última compra há '+days+' dias.';
  const rows=orders.map(o=>'<tr><td>'+dt(o.created_at)+'</td><td>'+esc(o.code||o.id)+'</td><td>'+brl(o.total)+'</td><td>'+orderButton(o)+'</td></tr>');
  modal('👤 Conta do cliente · '+s(x.name),'<p><b>WhatsApp:</b> '+esc(tel(x.phone))+'<br><b>Cashback disponível:</b> '+brl(x.available)+'<br><b>Compras:</b> '+orders.length+'<br><b>'+esc(status)+'</b></p><button class="btn small primary" type="button" data-cashback-whatsapp="'+esc(x.id)+'">💬 Enviar WhatsApp</button>'+table(['Data','Pedido','Valor','Itens / detalhes'],rows));
 }catch(err){modal('👤 Conta do cliente','<div class="notice error">'+esc(err.message)+'</div>');}
}
async function showCashbackHistory(id){
 modal('💚 Extrato do cliente','<p>Consultando movimentações confirmadas...</p>');
 try{
  const d=await api('cashback-customers/'+encodeURIComponent(id)+'/history');
  const rows=(d.history||[]).map(x=>'<tr><td>'+dt(x.created_at)+'</td><td>'+esc(x.order_code||'—')+'</td><td>'+esc(x.transaction_type)+'</td><td>'+brl(x.amount)+'</td><td>'+esc(x.status)+'</td></tr>');
  modal('💚 Cashback · '+s(d.customer?.name),'<p><b>Cliente:</b> '+esc(d.customer?.name||'')+'<br><b>WhatsApp:</b> '+esc(tel(d.customer?.phone||''))+'</p>'+
  table(['Data','Pedido','Movimento','Valor','Status'],rows));
 }catch(err){modal('💚 Cashback','<div class="notice error">'+esc(err.message)+'</div>');}
}
function cashbackCSV(){
 if(!st.cashbacksData)return toast('Atualize os saldos antes de exportar.',true);
 const lines=[['Nome','WhatsApp','Disponível','Reservado','Saldo líquido','Creditado','Utilizado','Pedidos creditados'],...filteredCashbacks().map(x=>[x.name,x.phone,x.available,x.reserved,x.balance,x.credited,x.used,x.ordersCredited])];
 const csv='\ufeff'+lines.map(row=>row.map(v=>'"'+s(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const u=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='caseirinho-cashback-clientes.csv';a.click();URL.revokeObjectURL(u);
}
/* Aviso de novos pedidos enquanto o aplicativo está ativo. Não é push em segundo plano. */
const ORDER_SEEN_KEY='caseirinho_insights_seen_orders_v10';
function alertSeen(){
 if(st.orderAlertSeen)return st.orderAlertSeen;
 try{const raw=JSON.parse(localStorage.getItem(ORDER_SEEN_KEY)||'[]');st.orderAlertSeen=new Set(Array.isArray(raw)?raw:[]);}
 catch(_){st.orderAlertSeen=new Set();}
 return st.orderAlertSeen;
}
function toggleOrderAlerts(){
 st.orderAlertEnabled=!st.orderAlertEnabled;
 st.sound=st.orderAlertEnabled;
 try{localStorage.setItem('caseirinho_insights_alert_enabled_v10',st.orderAlertEnabled?'true':'false');}catch(_){}
 E('orderAlertToggle').textContent=st.orderAlertEnabled?'🔔 Alertas ativados':'🔕 Ativar alerta sonoro';
 if(st.orderAlertEnabled){
  beep();
  if('Notification'in window&&Notification.permission==='default')Notification.requestPermission().catch(()=>{});
  toast('🔔 Alertas ativados. Mantenha a Central aberta para receber avisos de novos pedidos.');
 }
}
async function pollNewOrders(){
 if(!st.token||st.syncing||document.visibilityState==='hidden')return;
 try{
  const data=await api('new-orders-alert'),items=data.orders||[],seen=alertSeen();
  const fresh=items.filter(x=>!seen.has(s(x.id))&&new Date(x.createdAt).getTime()>Date.now()-8*3600000);
  const first=seen.size===0;
  items.forEach(x=>seen.add(s(x.id)));
  if(seen.size>350){const keep=items.map(x=>s(x.id));st.orderAlertSeen=new Set(keep);}
  try{localStorage.setItem(ORDER_SEEN_KEY,JSON.stringify([...st.orderAlertSeen].slice(-350)));}catch(_){}
  if(!first&&fresh.length){
   E('newOrderBannerText').textContent=fresh.length+' novo(s) pedido(s): '+fresh.slice(0,3).map(x=>'#'+x.code+' · '+x.name+' · '+brl(x.total)).join(' | ');
   E('newOrderBanner').hidden=false;
   if(st.orderAlertEnabled){beep();setTimeout(beep,350);
    if('Notification'in window&&Notification.permission==='granted'&&document.visibilityState!=='visible'){
     try{new Notification('🍝 Caseirinho · '+fresh.length+' novo(s) pedido(s)',{body:fresh.slice(0,2).map(x=>'#'+x.code+' · '+brl(x.total)).join(' | '),tag:'caseirinho-new-orders'});}catch(_){}
    }
   }
   toast('🔔 '+fresh.length+' novo(s) pedido(s) na loja!');
  }
 }catch(_){/* Evita falsos alarmes se estiver offline. */}
}
function bindMoreFeatures(){
 E('fichaSearch').addEventListener('input',renderFichas);
 E('fichaFilter').addEventListener('change',renderFichas);
 E('newFicha').addEventListener('click',()=>openFicha());
 E('refreshFichas').addEventListener('click',loadFichas);
 E('refreshCashbacks').addEventListener('click',loadCashbacks);
 E('cashbackSearch').addEventListener('input',renderCashbacks);
 E('cashbackFilter').addEventListener('change',renderCashbacks);
 E('csvCashbacks').addEventListener('click',cashbackCSV);
 E('orderAlertToggle').addEventListener('click',toggleOrderAlerts);
 E('openNewOrders').addEventListener('click',()=>{E('newOrderBanner').hidden=true;nav('orders');loadAll();});
 E('dismissNewOrders').addEventListener('click',()=>E('newOrderBanner').hidden=true);
 document.addEventListener('click',e=>{
  const ficha=e.target.closest('[data-ficha-edit]');if(ficha)return openFicha(ficha.dataset.fichaEdit);
  const cashback=e.target.closest('[data-cashback-history]');if(cashback)return showCashbackHistory(cashback.dataset.cashbackHistory);
  const account=e.target.closest('[data-cashback-account]');if(account)return cashbackAccount(account.dataset.cashbackAccount);
  const contact=e.target.closest('[data-cashback-whatsapp]');if(contact)return cashbackContact(contact.dataset.cashbackWhatsapp);
 });
 document.addEventListener('submit',e=>{if(e.target?.id==='fichaForm')saveFicha(e);});
 try{st.orderAlertEnabled=localStorage.getItem('caseirinho_insights_alert_enabled_v10')==='true';}catch(_){}
 st.sound=st.orderAlertEnabled;
 E('orderAlertToggle').textContent=st.orderAlertEnabled?'🔔 Alertas ativados':'🔕 Ativar alerta sonoro';
}

/* Cupons: campanhas com vigência e relatório de utilização, integradas ao motorComercial do e-commerce. */
function couponDate(iso){
 if(!iso)return null;
 const v=s(iso);
 if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v))return new Date(v+':00-03:00');
 return new Date(v);
}
function couponDateInput(value){
 if(!value)return'';
 const v=s(value);if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v))return v.slice(0,16);
 return '';
}
function couponStatus(c){
 if(!c.active)return {text:'Inativo',kind:'warn'};
 const now=Date.now(),start=couponDate(c.startAt),end=couponDate(c.endAt);
 if(start&&start.getTime()>now)return {text:'Agendado',kind:'light'};
 if(end&&end.getTime()<now)return {text:'Expirado',kind:'warn'};
 return {text:'Vigente',kind:'good'};
}
function couponTab(tab){
 st.couponTab=tab;
 E('couponConfigTab').hidden=tab!=='config';
 E('couponReportTab').hidden=tab!=='report';
 document.querySelectorAll('[data-coupon-tab]').forEach(b=>b.className='btn'+(b.dataset.couponTab===tab?' primary':''));
 if(tab==='report'&&!st.couponReport)loadCouponReport();
 renderCoupons();
}
async function loadCoupons(){
 E('couponError').hidden=true;
 try{st.couponsData=await api('coupons');renderCoupons();}
 catch(err){E('couponError').hidden=false;E('couponError').textContent='Falha ao consultar cupons: '+err.message;}
}
function renderCoupons(){
 if(!st.couponsData)return;
 const list=st.couponsData.coupons||[],current=list.filter(c=>couponStatus(c).text==='Vigente');
 E('couponKpis').innerHTML=[
  statsCard('🎟️','Cupons cadastrados',list.length,'Campanhas na loja'),
  statsCard('🟢','Cupons vigentes',current.length,'Ativos e dentro das datas'),
  statsCard('⏳','Agendados',list.filter(c=>couponStatus(c).text==='Agendado').length,'Início futuro'),
  statsCard('⌛','Expirados',list.filter(c=>couponStatus(c).text==='Expirado').length,'Não aplicáveis no momento')
 ].join('');
 E('couponCards').innerHTML=list.length?'<div class="merch-grid">'+list.map(c=>{
  const status=couponStatus(c),special=c.code==='CASEIRINHO10';
  const descr=(c.type==='PERCENT'?n(c.value).toLocaleString('pt-BR',{maximumFractionDigits:2})+'%':brl(c.value))+' de desconto';
  return '<article class="card merch-card"><div class="mobile-record-head"><h3>🎫 '+esc(c.code)+'</h3><span class="badge '+status.kind+'">'+status.text+'</span></div>'+
    '<p><b>'+esc(descr)+'</b>'+(special?' · Primeira compra, uso único':'')+'</p>'+
    '<p>Pedido mínimo: '+brl(c.minSubtotal)+' · Desconto máximo: '+(c.maxDiscount>0?brl(c.maxDiscount):'Sem teto adicional')+'</p>'+
    '<p>📅 Início: '+(c.startAt?dt(couponDate(c.startAt)):'Imediato')+'<br>📅 Término: '+(c.endAt?dt(couponDate(c.endAt)):'Sem data final')+'</p>'+
    '<div class="record-actions"><button class="btn small primary" type="button" data-coupon-action="edit" data-code="'+esc(c.code)+'">✏️ Editar vigência / valores</button>'+
    '<button class="btn small" type="button" data-coupon-action="toggle" data-code="'+esc(c.code)+'">'+(c.active?'⛔ Desativar':'✅ Ativar')+'</button></div></article>';
 }).join('')+'</div>':cellEmpty('Nenhum cupom cadastrado.');
 const old=E('couponReportCode').value;
 const codes=[...new Set([...(st.couponsData.coupons||[]).map(x=>x.code),...(st.couponReport?.coupons||[]).map(x=>x.code)])];
 E('couponReportCode').innerHTML='<option value="all">Todos os cupons</option>'+codes.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 E('couponReportCode').value=codes.includes(old)?old:'all';
 if(st.couponReport)renderCouponReport();
}
function couponEditModal(code=''){
 if(!st.couponsData)return toast('Atualize os cupons antes de editar.',true);
 const record=(st.couponsData.coupons||[]).find(x=>x.code===code),special=code==='CASEIRINHO10';
 modal(record?'✏️ Editar cupom '+code:'➕ Cadastrar cupom',
 '<form id="couponManageForm" data-original="'+esc(record?.code||'')+'" class="product-form">'+
 '<label class="form-label">Código do cupom *</label><input name="code" required maxlength="40" pattern="[A-Za-z0-9_]{3,40}" autocapitalize="characters" placeholder="Ex.: VOLTEI15" value="'+esc(record?.code||'')+'" '+(record?'readonly':'')+'>'+
 '<div class="form-grid"><label>Modalidade<select name="type" '+(special?'disabled':'')+'><option value="PERCENT">Percentual (%)</option><option value="FIXED">Valor fixo (R$)</option></select></label>'+
 '<label>Desconto aplicado<input type="number" name="value" min=".01" max="100000" step=".01" required value="'+esc(record?.value??10)+'" '+(special?'readonly':'')+'></label></div>'+
 '<div class="form-grid"><label>Pedido mínimo (R$)<input name="minSubtotal" type="number" min="0" step=".01" value="'+esc(record?.minSubtotal||0)+'" '+(special?'readonly':'')+'></label>'+
 '<label>Desconto máximo (R$)<input name="maxDiscount" type="number" min="0" step=".01" value="'+esc(record?.maxDiscount||0)+'" '+(special?'readonly':'')+'></label></div>'+
 '<div class="form-grid"><label>📅 Início da vigência (São Paulo)<input name="startAt" type="datetime-local" value="'+esc(couponDateInput(record?.startAt))+'"></label>'+
 '<label>📅 Fim da vigência (São Paulo)<input name="endAt" type="datetime-local" value="'+esc(couponDateInput(record?.endAt))+'"></label></div>'+
 '<label class="coupon-toggle"><input name="active" type="checkbox" '+(record?.active===false?'':'checked')+'> Cupom ativo</label>'+
 (special?'<div class="notice warn">O CASEIRINHO10 mantém 10% na primeira compra. Aqui só é possível controlar ativação e vigência; os demais campos permanecem bloqueados para preservar a regra existente.</div>':
 '<div class="notice">Se não definir o fim da vigência, o cupom continuará válido até ser desativado. Não confunda limitar a data com limitar a quantidade de clientes.</div>')+
 '<button type="submit" class="btn primary" style="width:100%">💾 Salvar e publicar cupom</button></form>');
 E('couponManageForm').querySelector('select[name="type"]').value=record?.type||'PERCENT';
}
async function saveCoupon(e){
 e.preventDefault();const form=e.target,fd=new FormData(form);
 const isSpecial=s(fd.get('code')).toUpperCase()==='CASEIRINHO10';
 const payload={existingCode:form.dataset.original||'',code:s(fd.get('code')).toUpperCase(),type:isSpecial?'PERCENT':s(fd.get('type')),value:isSpecial?10:Number(fd.get('value')),
  minSubtotal:Number(fd.get('minSubtotal')||0),maxDiscount:Number(fd.get('maxDiscount')||0),startAt:s(fd.get('startAt'))||null,endAt:s(fd.get('endAt'))||null,active:fd.get('active')==='on'};
 if(payload.startAt&&payload.endAt&&payload.endAt<=payload.startAt)return toast('Fim da vigência precisa ser posterior ao início.',true);
 if(!window.confirm('Publicar '+payload.code+' ('+(payload.type==='PERCENT'?payload.value+'%':brl(payload.value))+') no e-commerce? As novas validações usarão a vigência configurada.'))return;
 const btn=form.querySelector('[type=submit]');btn.disabled=true;btn.textContent='Salvando cupom...';
 try{await api('coupons',{method:'POST',body:payload});hideModal();toast('🎟️ Cupom '+payload.code+' salvo no e-commerce.');await loadCoupons();nav('coupons');}
 catch(err){toast('Erro ao publicar cupom: '+err.message,true);}
 finally{btn.disabled=false;btn.textContent='💾 Salvar e publicar cupom';}
}
async function toggleCoupon(code){
 const c=(st.couponsData?.coupons||[]).find(x=>x.code===code);if(!c)return;
 const active=!c.active;
 if(!window.confirm((active?'Ativar':'Desativar')+' o cupom '+code+' para novos pedidos?'))return;
 try{await api('coupons/'+encodeURIComponent(code)+'/status',{method:'PATCH',body:{active}});toast('✅ Cupom '+code+' '+(active?'ativado':'desativado')+'.');await loadCoupons();}
 catch(e){toast('Falha ao alterar cupom: '+e.message,true);}
}
function initCouponDates(){
 if(E('couponDateTo').value)return;
 const today=saoPauloToday();
 E('couponDateTo').value=today;E('couponDateFrom').value=shiftDateISO(today,-41);
}
async function loadCouponReport(){
 initCouponDates();
 const from=E('couponDateFrom').value,to=E('couponDateTo').value;
 if(!from||!to||from>to){E('couponError').hidden=false;E('couponError').textContent='Escolha datas válidas para o relatório.';return;}
 E('couponError').hidden=true;
 E('runCouponReport').disabled=true;E('runCouponReport').textContent='Consultando...';
 try{st.couponReport=await api('coupon-report?from='+encodeURIComponent(from)+'&to='+encodeURIComponent(to));renderCoupons();}
 catch(e){E('couponError').hidden=false;E('couponError').textContent='Não foi possível consultar utilização: '+e.message;}
 finally{E('runCouponReport').disabled=false;E('runCouponReport').textContent='🔎 Consultar';}
}
function couponReportRows(){
 const d=st.couponReport;if(!d)return[];
 const code=E('couponReportCode').value,status=E('couponReportStatus').value,search=s(E('couponReportSearch').value).toLowerCase();
 return (d.orders||[]).filter(x=>(code==='all'||x.coupon===code)&&
 (status==='all'||status==='accepted'&&x.counted||status==='pending'&&['NOVO','ABERTO','AGUARDANDO_COTACAO_FRETE'].includes(x.status)||status==='other'&&!x.counted&&!['NOVO','ABERTO','AGUARDANDO_COTACAO_FRETE'].includes(x.status))&&
 (s(x.name)+' '+s(x.phone)+' '+s(x.code)+' '+s(x.coupon)).toLowerCase().includes(search));
}
function renderCouponReport(){
 const d=st.couponReport;if(!d)return;
 const rows=couponReportRows(),approved=rows.filter(x=>x.counted),pending=rows.filter(x=>['NOVO','ABERTO','AGUARDANDO_COTACAO_FRETE'].includes(x.status));
 E('couponReportKpis').innerHTML=[
  statsCard('🎫','Cupons registrados',rows.length,'Pedidos com código aplicado'),
  statsCard('✅','Pedidos aceitos',approved.length,'Ainda não comprova pagamento'),
  statsCard('⏳','Pedidos pendentes',pending.length,'Não contam como venda confirmada'),
  statsCard('💰','Descontos aceitos',brl(approved.reduce((sum,x)=>sum+Number(x.discount||0),0)),'Desconto registrado, não baixa financeira')
 ].join('');
 const rank=[...new Set(rows.map(x=>x.coupon))].map(code=>{const ar=rows.filter(x=>x.coupon===code);return {code,orders:ar.length,accepted:ar.filter(x=>x.counted).length,discount:ar.filter(x=>x.counted).reduce((sum,x)=>sum+x.discount,0)};}).sort((a,b)=>b.accepted-a.accepted||b.orders-a.orders);
 E('couponRanking').innerHTML=rank.map((x,i)=>'<div class="sales-top-row"><div class="sales-top-title"><b>'+(i+1)+'. '+esc(x.code)+'</b><strong>'+x.accepted+' aceito(s)</strong></div><small>'+x.orders+' registro(s) · '+brl(x.discount)+' de desconto</small></div>').join('')||cellEmpty('Sem cupons no período.');
 const lines=rows.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(tel(x.phone))+'</td><td><b>'+esc(x.coupon)+'</b></td><td>'+esc(x.code)+'</td><td>'+dt(x.createdAt)+'</td><td>'+brl(x.discount)+'</td><td>'+badge(x.status)+'</td></tr>');
 if(window.matchMedia('(max-width:790px)').matches){
  E('couponReportTable').innerHTML=rows.length?'<div class="mobile-list">'+rows.map(x=>
  '<article class="mobile-record"><div class="mobile-record-head"><b>'+esc(x.name)+'</b><span class="badge '+(x.counted?'good':'warn')+'">'+esc(x.status)+'</span></div>'+
  '<p>📱 '+esc(tel(x.phone))+' · Pedido '+esc(x.code)+'</p><div class="sales-mobile-grid"><span>Cupom<b>'+esc(x.coupon)+'</b></span><span>Desconto<b>'+brl(x.discount)+'</b></span><span>Valor final<b>'+brl(x.total)+'</b></span><span>Data<b>'+dt(x.createdAt)+'</b></span></div></article>'
  ).join('')+'</div>':cellEmpty('Nenhum uso de cupom encontrado.');
 }else E('couponReportTable').innerHTML=table(['Cliente','WhatsApp','Cupom','Pedido','Data','Desconto','Situação'],lines);
}
function exportCouponCsv(){
 if(!st.couponReport)return toast('Consulte o relatório antes de exportar.',true);
 const headers=['Cliente','WhatsApp','Cupom','Pedido','Data','Situação','Desconto','Valor do pedido','Aceito'];
 const rows=[headers,...couponReportRows().map(x=>[x.name,x.phone,x.coupon,x.code,dt(x.createdAt),x.status,x.discount,x.total,x.counted?'Sim':'Não'])];
 const csv='\ufeff'+rows.map(row=>row.map(v=>'"'+s(v).replace(/"/g,'""')+'"').join(';')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='caseirinho-utilizacao-cupons-'+st.couponReport.period.from+'-a-'+st.couponReport.period.to+'.csv';a.click();URL.revokeObjectURL(url);
}
function exportCouponPdf(){
 if(!st.couponReport)return toast('Consulte o relatório antes de imprimir.',true);
 const d=st.couponReport,rows=couponReportRows(),accepted=rows.filter(x=>x.counted);
 const lines=rows.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(tel(x.phone))+'</td><td>'+esc(x.coupon)+'</td><td>'+esc(x.code)+'</td><td>'+dt(x.createdAt)+'</td><td>'+brl(x.discount)+'</td><td>'+esc(x.status)+'</td></tr>');
 const body='<p><b>Período:</b> '+displayISODate(d.period.from)+' a '+displayISODate(d.period.to)+
 '</p><p><b>Cupons registrados:</b> '+rows.length+' · <b>Pedidos aceitos:</b> '+accepted.length+
 ' · <b>Descontos aceitos:</b> '+brl(accepted.reduce((sum,x)=>sum+x.discount,0))+'</p>'+
 table(['Cliente','WhatsApp','Cupom','Pedido','Data','Desconto','Status'],lines)+
 '<p><small>Fonte: pedidos da loja. Registros pendentes não são vendas concluídas e descontos não comprovam pagamento.</small></p>';
 printDocument('Relatório de Cupons • Caseirinho',body);
}
function bindCouponModule(){
 E('refreshCoupons').addEventListener('click',async()=>{await loadCoupons();if(st.couponTab==='report')await loadCouponReport();});
 E('couponGoReady').addEventListener('click',async()=>{nav('orders');E('orderFilter').value='READY';renderOrders();await refreshFulfillment();renderOrders();});
 E('newCoupon').addEventListener('click',()=>couponEditModal());
 document.querySelectorAll('[data-coupon-tab]').forEach(b=>b.addEventListener('click',()=>couponTab(b.dataset.couponTab)));
 E('runCouponReport').addEventListener('click',loadCouponReport);
 E('couponReportCode').addEventListener('change',renderCouponReport);
 E('couponReportStatus').addEventListener('change',renderCouponReport);
 E('couponReportSearch').addEventListener('input',renderCouponReport);
 E('couponExportCsv').addEventListener('click',exportCouponCsv);
 E('couponExportPdf').addEventListener('click',exportCouponPdf);
 document.addEventListener('submit',e=>{if(e.target?.id==='couponManageForm')return saveCoupon(e);});
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-coupon-action]');if(!b)return;
  if(b.dataset.couponAction==='edit')couponEditModal(b.dataset.code);
  if(b.dataset.couponAction==='toggle')toggleCoupon(b.dataset.code);
 });
 initCouponDates();
}

/* Black Friday • preço/prazo únicos no ERP e loja, somente se promo habilitada e dentro da vigência. */
function bfStatus(text,err=false){
 const e=E('bfMessage');if(!e)return;
 e.hidden=false;e.className='notice '+(err?'error':'success');e.textContent=text;
}
function bfLocalDateTime(value){
 if(!value)return'';
 const d=new Date(value);if(Number.isNaN(d.getTime()))return'';
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
 const f=Object.fromEntries(parts.map(p=>[p.type,p.value]));
 return f.year+'-'+f.month+'-'+f.day+'T'+f.hour+':'+f.minute;
}
function bfPrice(v){return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
function bfState(p){
 const sale=p.promotion||{};
 if(!sale.enabled)return {label:'Inativa',css:'light'};
 return {label:({ACTIVE:'🖤 Em promoção',SCHEDULED:'📅 Agendada',EXPIRED:'⌛ Encerrada',INACTIVE:'Desativada',INVALID:'Data inválida'})[sale.status]||'Sem campanha',css:sale.status==='ACTIVE'?'good':sale.status==='SCHEDULED'?'light':'warn'};
}
async function loadBlackFriday(){
 try{
  const d=await api('black-friday');st.bfData=d;
  const saved=[...st.bfSelected.keys()];st.bfSelected=new Map(saved.filter(id=>(d.items||[]).some(p=>p.id===id)).map(id=>[id,st.bfSelected.get(id)]));
  const first=(d.items||[]).find(x=>x.promotion?.enabled);
  if(!E('bfStart').value&&first?.promotion?.startAt)E('bfStart').value=bfLocalDateTime(first.promotion.startAt);
  if(!E('bfEnd').value&&first?.promotion?.endAt)E('bfEnd').value=bfLocalDateTime(first.promotion.endAt);
  E('bfMessage').hidden=true;renderBlackFriday();
 }catch(err){bfStatus('Não foi possível carregar a campanha: '+err.message,true);}
}
function bfRemember(){
 document.querySelectorAll('[data-bf-row]').forEach(row=>{
  const id=row.dataset.bfRow;if(!st.bfSelected.has(id))return;
  st.bfSelected.set(id,row.querySelector('[data-bf-price]')?.value||'');
 });
}
function renderBlackFriday(){
 if(!st.bfData)return;
 const all=st.bfData.items||[],q=s(E('bfSearch').value).toLowerCase(),filter=E('bfFilter').value;
 const filtered=all.filter(p=>(s(p.name)+' '+s(p.code)).toLowerCase().includes(q)&&
  (filter==='all'||filter==='campaign'&&p.promotion||filter==='available'&&!p.hasOtherPromotion&&!p.hasPack||filter==='conflict'&&(p.hasOtherPromotion||p.hasPack)));
 E('bfSelectedCount').textContent=st.bfSelected.size+' selecionado(s)';
 E('bfProducts').innerHTML=filtered.length?'<div class="bf-product-list">'+filtered.map(p=>{
  const blocked=p.hasOtherPromotion||p.hasPack,status=bfState(p);
  const selected=st.bfSelected.has(p.id),v=selected?st.bfSelected.get(p.id):(p.promotion?.price||'');
  const reason=blocked?'⚠️ '+(p.hasOtherPromotion?'Outra promoção ativa':'Pack ativo'):'';
  return '<div class="bf-product-row" data-bf-row="'+esc(p.id)+'">'+
   '<label class="bf-product-choice"><input type="checkbox" data-bf-check value="'+esc(p.id)+'" '+(selected?'checked':'')+' '+(blocked?'disabled':'')+'><span><b>'+esc(p.name)+'</b><small>'+esc(p.code)+' · Preço normal '+bfPrice(p.price)+'</small></span></label>'+
   '<span class="badge '+status.css+'">'+esc(reason||status.label)+'</span>'+
   '<label class="bf-price-field">Preço Black Friday (R$)<input data-bf-price type="number" min=".01" max="'+esc(p.price)+'" step=".01" inputmode="decimal" '+(blocked?'disabled':'')+' value="'+esc(v)+'" placeholder="Ex.: '+esc((Number(p.price)*.85).toFixed(2))+'"></label>'+
   (p.promotion?'<div class="bf-published">Vigência cadastrada: <b>'+esc(dt(p.promotion.startAt))+' até '+esc(dt(p.promotion.endAt))+'</b>'+
     ' · <button type="button" class="btn small" data-bf-disable="'+esc(p.id)+'">⛔ Desativar</button></div>':'')+
   '</div>';
 }).join('')+'</div>':cellEmpty('Nenhum produto neste filtro.');
}
function bfOnChange(e){
 const checkbox=e.target.closest('[data-bf-check]');
 if(!checkbox)return;
 bfRemember();
 const id=checkbox.value,product=(st.bfData?.items||[]).find(x=>x.id===id);
 if(!product)return;
 if(checkbox.checked)st.bfSelected.set(id,s(checkbox.closest('[data-bf-row]').querySelector('[data-bf-price]').value)||s(product.promotion?.price||''));
 else st.bfSelected.delete(id);
 renderBlackFriday();
}
function bfMoment(v){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s(v)))throw Error('Informe início e término da vigência.');
 return s(v)+':00-03:00';
}
async function publishBlackFriday(){
 bfRemember();
 const products=st.bfData?.items||[],items=[...st.bfSelected.entries()].map(([id,val])=>({id,price:Number(val)}));
 if(!items.length)return bfStatus('Escolha pelo menos um produto para a campanha.',true);
 if(items.length>50)return bfStatus('É possível publicar no máximo 50 produtos por operação.',true);
 for(const item of items){
  const p=products.find(x=>x.id===item.id);
  if(!p||!Number.isFinite(item.price)||item.price<=0||item.price>=Number(p.price))return bfStatus('O preço de cada produto selecionado precisa ser maior que zero e menor que o valor normal. Corrija '+s(p?.name)+'.',true);
 }
 let startAt,endAt;
 try{startAt=bfMoment(E('bfStart').value);endAt=bfMoment(E('bfEnd').value);}catch(err){return bfStatus(err.message,true);}
 if(Date.parse(startAt)>=Date.parse(endAt)||Date.parse(endAt)<=Date.now())return bfStatus('A data final precisa ser posterior ao início e estar no futuro.',true);
 const msg='Publicar BLACK FRIDAY para '+items.length+' produto(s)? Vigência: '+dt(startAt)+' até '+dt(endAt)+'. O preço normal será preservado; o especial entrará em vigor somente nas datas configuradas.';
 if(!window.confirm(msg))return;
 const btn=E('bfPublish');btn.disabled=true;btn.textContent='Publicando campanha...';
 try{
  const out=await api('black-friday',{method:'POST',body:{startAt,endAt,items}});
  st.bfSelected.clear();
  await loadBlackFriday();
  bfStatus('✅ Black Friday publicada no ERP e loja para '+out.products.length+' produto(s). A tarja aparecerá somente durante a vigência.');
 }catch(err){bfStatus('❌ Não foi possível confirmar a publicação: '+err.message+'. Atualize para conferir antes de tentar novamente.',true);}
 finally{btn.disabled=false;btn.textContent='🖤 Salvar e publicar Black Friday';}
}
async function deactivateBlackFriday(id){
 const p=(st.bfData?.items||[]).find(x=>x.id===id);if(!p)return;
 if(!window.confirm('Desativar a Black Friday para '+p.name+'? O preço regular continuará publicado na loja.'))return;
 try{
  await api('black-friday/'+encodeURIComponent(id)+'/deactivate',{method:'PATCH',body:{}});
  await loadBlackFriday();bfStatus('✅ Black Friday desativada para '+p.name+'.');
 }catch(err){bfStatus('Não foi possível desativar: '+err.message,true);}
}
function bindBlackFriday(){
 E('bfRefresh').addEventListener('click',async()=>{bfRemember();await loadBlackFriday();});
 E('bfSearch').addEventListener('input',()=>{bfRemember();renderBlackFriday();});
 E('bfFilter').addEventListener('change',()=>{bfRemember();renderBlackFriday();});
 E('bfProducts').addEventListener('change',bfOnChange);
 E('bfProducts').addEventListener('input',e=>{
  const row=e.target.closest('[data-bf-row]');
  if(row&&e.target.matches('[data-bf-price]')&&st.bfSelected.has(row.dataset.bfRow))st.bfSelected.set(row.dataset.bfRow,e.target.value);
 });
 E('bfProducts').addEventListener('click',e=>{
  const button=e.target.closest('[data-bf-disable]');if(button)deactivateBlackFriday(button.dataset.bfDisable);
 });
 E('bfPublish').addEventListener('click',publishBlackFriday);
}

/* Módulo sazonal — campanhas ERP e fechamento de sinal/saldo discriminados. */
function seasonAlert(message,error=false){
 const node=E('seasonNotice');node.hidden=false;node.textContent=message;node.className='notice '+(error?'error':'success');
}
function seasonCurrent(){return(st.seasonData?.campaigns||[]).find(x=>x.id===E('seasonCampaignSelect').value)}
async function loadSeasonAdmin(){
 try{
  st.seasonData=await api('seasonal-campaigns');
  renderSeasonAdmin();
 }catch(err){seasonAlert('Falha ao carregar campanhas: '+err.message,true);}
}
function seasonTextDate(x){
 if(!x)return'—';const [y,m,d]=s(x).split('-');return d+'/'+m+'/'+y;
}
let seasonBannerImages=[];
function seasonRenderImages(){
 const holder=E('seasonImagesPreview');if(!holder)return;
 holder.innerHTML=seasonBannerImages.map((src,i)=>'<div class="season-image-tile"><img src="'+esc(src)+'" alt="Foto '+(i+1)+' da vinheta"><div class="toolbar"><button type="button" class="btn small" data-season-img-move="'+i+'" data-delta="-1" '+(i===0?'disabled':'')+'>←</button><button type="button" class="btn small" data-season-img-move="'+i+'" data-delta="1" '+(i===seasonBannerImages.length-1?'disabled':'')+'>→</button><button type="button" class="btn small" data-season-img-remove="'+i+'">Excluir</button></div></div>').join('');
}
function seasonImageFromFile(file){
 return new Promise((resolve,reject)=>{
  if(!/^image\/(jpeg|png|webp)$/.test(file.type))return reject(Error('Use imagens JPG, PNG ou WebP.'));
  if(file.size>12*1024*1024)return reject(Error('A foto deve ter no máximo 12 MB antes da redução.'));
  const url=URL.createObjectURL(file),img=new Image();
  img.onload=()=>{
   URL.revokeObjectURL(url);
   const scale=Math.min(1,1280/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
   canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
   let result='';
   for(const quality of [.78,.65,.52,.4,.3]){result=canvas.toDataURL('image/jpeg',quality);if(result.length<290000)break;}
   if(result.length>=290000)return reject(Error('Foto ainda grande. Escolha uma imagem mais leve.'));
   resolve(result);
  };
  img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Não foi possível abrir esta imagem.'));};img.src=url;
 });
}
let seasonExclusiveImage='',seasonExclusiveEditing='';
function seasonExclusiveFeedback(message,error=false){
 const node=E('seasonExclusiveStatus');node.hidden=false;node.textContent=message;node.className='notice '+(error?'error':'success');
}
function seasonExclusiveShowPhoto(){
 const node=E('seasonExclusiveImagePreview');node.innerHTML=seasonExclusiveImage?
  '<img alt="Foto do produto sazonal" src="'+esc(seasonExclusiveImage)+'" style="max-width:220px;width:100%;height:150px;object-fit:cover;border-radius:12px;border:1px solid #dae2dc">':
  '<span class="subtitle">Nenhuma foto selecionada</span>';
}
function seasonExclusiveReset(){
 seasonExclusiveEditing='';seasonExclusiveImage='';
 E('seasonExclusiveSelect').value='';E('seasonExclusiveName').value='';E('seasonExclusivePrice').value='';
 E('seasonExclusiveDescription').value='';E('seasonExclusiveMin').value=1;E('seasonExclusiveMax').value=0;
 E('seasonExclusiveActive').checked=true;E('seasonExclusiveImageUrl').value='';E('seasonExclusiveImageUpload').value='';
 E('seasonExclusiveCategory').value='';E('seasonExclusiveGrade').value='';E('seasonExclusiveVariant').value='';
 seasonExclusiveShowPhoto();
}
function seasonExclusiveEdit(id){
 const p=(st.seasonData?.exclusiveProducts||[]).find(x=>x.id===id);
 if(!p)return;
 seasonExclusiveEditing=id;seasonExclusiveImage=p.image||'';
 E('seasonExclusiveCampaign').value=p.campaignId;
 seasonMerchSelectCampaign(p.campaignId);
 E('seasonExclusiveSelect').value=id;
 E('seasonExclusiveName').value=p.name;E('seasonExclusivePrice').value=p.price;
 E('seasonExclusiveDescription').value=p.description;
 E('seasonExclusiveMin').value=p.minQuantity;E('seasonExclusiveMax').value=p.maxQuantity;
 E('seasonExclusiveActive').checked=p.active===true;
 E('seasonExclusiveCategory').value=p.categoryId||'';E('seasonExclusiveGrade').value=p.gradeId||'';E('seasonExclusiveVariant').value=p.variantLabel||'';
 E('seasonExclusiveImageUrl').value=/^https:\/\//i.test(p.image)?p.image:'';
 seasonExclusiveShowPhoto();
 E('seasonExclusivePanel').scrollIntoView({behavior:'smooth',block:'start'});
}
function seasonExclusiveRender(){
 const campaigns=st.seasonData?.campaigns||[],products=st.seasonData?.exclusiveProducts||[];
 const select=E('seasonExclusiveCampaign'),before=select.value;
 select.innerHTML='<option value="">Escolha a campanha</option>'+campaigns.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.title)+'</option>').join('');
 if(campaigns.some(c=>c.id===before))select.value=before;
 else if(E('seasonCampaignSelect').value)select.value=E('seasonCampaignSelect').value;
 seasonMerchRender();
 const productSelect=E('seasonExclusiveSelect'),old=productSelect.value;
 productSelect.innerHTML='<option value="">➕ Novo produto sazonal</option>'+products.map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' — '+esc(campaigns.find(c=>c.id===p.campaignId)?.title||'Campanha')+'</option>').join('');
 if(products.some(p=>p.id===old))productSelect.value=old;
 E('seasonExclusiveList').innerHTML=products.length?products.map(p=>
  '<div class="season-admin-product"><img src="'+esc(p.image)+'" alt="" style="width:80px;height:80px;object-fit:cover;border-radius:10px">'+
  '<div style="flex:1"><b>'+esc(p.name)+'</b><p>'+esc(campaigns.find(c=>c.id===p.campaignId)?.title||'Campanha não encontrada')+' · '+brl(p.price)+'</p>'+
  '<span class="badge '+(p.active?'good':'warn')+'">'+(p.active?'Disponível':'Inativo')+'</span></div>'+
  '<button type="button" class="btn small" data-season-exclusive-edit="'+esc(p.id)+'">✏️ Editar</button></div>').join(''):
  '<div class="notice">Nenhum produto exclusivo cadastrado. Escolha uma campanha e crie o primeiro item.</div>';
}
async function seasonExclusiveSave(){
 const campaignId=E('seasonExclusiveCampaign').value;
 const url=E('seasonExclusiveImageUrl').value.trim();
 const image=url||seasonExclusiveImage;
 const body={id:seasonExclusiveEditing||undefined,campaignId,name:E('seasonExclusiveName').value.trim(),
  description:E('seasonExclusiveDescription').value.trim(),price:Number(E('seasonExclusivePrice').value),
  image,categoryId:E('seasonExclusiveCategory').value,gradeId:E('seasonExclusiveGrade').value,variantLabel:E('seasonExclusiveVariant').value.trim(),
  minQuantity:Number(E('seasonExclusiveMin').value),maxQuantity:Number(E('seasonExclusiveMax').value),
  active:E('seasonExclusiveActive').checked};
 if(!campaignId)return seasonExclusiveFeedback('Selecione uma campanha sazonal já cadastrada.',true);
 if(body.name.length<3||!(body.price>0))return seasonExclusiveFeedback('Informe nome do produto e preço maior que zero.',true);
 if(!image)return seasonExclusiveFeedback('Adicione uma foto do produto.',true);
 if(body.gradeId&&!body.variantLabel)return seasonExclusiveFeedback('Informe o sabor ou tamanho deste item na grade.',true);
 const button=E('seasonExclusiveSave');button.disabled=true;button.textContent='Salvando...';
 try{
  await api('seasonal-exclusive-products',{method:'POST',body});
  await loadSeasonAdmin();
  seasonExclusiveReset();
  E('seasonExclusiveCampaign').value=campaignId;
  seasonMerchSelectCampaign(campaignId);
  seasonExclusiveFeedback('✅ Produto salvo! Ele já está disponível em Grades e Sabores, junto com os produtos do cadastro normal desta campanha.');
 }catch(e){seasonExclusiveFeedback('Não foi possível salvar: '+e.message,true)}
 finally{button.disabled=false;button.textContent='💾 Salvar produto exclusivo'}
}
function bindSeasonExclusive(){
 bindSeasonMerch();
 E('seasonExclusiveSave').addEventListener('click',seasonExclusiveSave);
 E('seasonExclusiveNew').addEventListener('click',seasonExclusiveReset);
 E('seasonExclusiveSelect').addEventListener('change',e=>e.target.value?seasonExclusiveEdit(e.target.value):seasonExclusiveReset());
 E('seasonExclusiveImageUrl').addEventListener('change',e=>{if(e.target.value.trim()){seasonExclusiveImage=e.target.value.trim();seasonExclusiveShowPhoto()}});
 E('seasonExclusiveImageUpload').addEventListener('change',async e=>{
  const f=e.target.files?.[0];if(!f)return;
  try{seasonExclusiveImage=await seasonImageFromFile(f);E('seasonExclusiveImageUrl').value='';seasonExclusiveShowPhoto()}
  catch(err){seasonExclusiveFeedback('Foto: '+err.message,true)}
 });
 E('seasonExclusiveList').addEventListener('click',e=>{
  const b=e.target.closest('[data-season-exclusive-edit]');if(b)seasonExclusiveEdit(b.dataset.seasonExclusiveEdit);
 });
}
function seasonSaveEdits(){
 document.querySelectorAll('[data-season-product]').forEach(el=>{
  const id=el.dataset.seasonProduct;
  if(!st.seasonProductRules.has(id))return;
  st.seasonProductRules.set(id,{id,minQuantity:Number(el.querySelector('[data-season-min]').value)||1,maxQuantity:Number(el.querySelector('[data-season-max]').value)||0,categoryId:el.querySelector('[data-season-cat]')?.value||'',gradeId:el.querySelector('[data-season-grade]')?.value||'',variantLabel:el.querySelector('[data-season-variant]')?.value.trim()||''});
 });
}
function seasonChooseCampaign(id){
 const campaign=(st.seasonData?.campaigns||[]).find(x=>x.id===id);
 st.seasonProductRules=new Map((campaign?.products||[]).map(x=>[x.id,{...x}]));
 seasonBannerImages=Array.isArray(campaign?.bannerImages)?[...campaign.bannerImages]:[];seasonRenderImages();
 const setters={seasonTitle:campaign?.title||'',seasonBanner:campaign?.bannerText||'',seasonDescription:campaign?.description||'',
 seasonFrom:campaign?.orderFrom||'',seasonUntil:campaign?.orderUntil||'',seasonDates:(campaign?.fulfillmentDates||[]).join('\n'),
 seasonMinValue:campaign?.minimumOrderValue||0,seasonMaxValue:campaign?.maximumOrderValue||0,seasonMinTotalQty:campaign?.minTotalQuantity||1};
 Object.entries(setters).forEach(([k,v])=>E(k).value=v);
 E('seasonPickup').checked=campaign?.allowPickup!==false;E('seasonDelivery').checked=campaign?.allowDelivery!==false;E('seasonActive').checked=campaign?.active!==false;
 renderSeasonProducts();
 if(E('seasonExclusiveCampaign')&&id)E('seasonExclusiveCampaign').value=id;
 if(E('seasonMerchCampaign')&&id){E('seasonMerchCampaign').value=id;seasonMerchRender();}
}
function seasonProductsFiltered(){
 const q=s(E('seasonProductSearch').value).toLowerCase();
 return(st.seasonData?.products||[]).filter(p=>(s(p.name)+' '+s(p.id)).toLowerCase().includes(q));
}
function renderSeasonProducts(){
 const campaignId=E('seasonCampaignSelect').value;
 const categories=(st.seasonData?.categories||[]).filter(p=>p.active&&p.campaignId===campaignId);
 const grades=(st.seasonData?.grades||[]).filter(p=>p.active&&p.campaignId===campaignId);
 const items=seasonProductsFiltered();
 E('seasonSelected').textContent=st.seasonProductRules.size+' selecionado(s)';
 E('seasonProductList').innerHTML=items.map(p=>{
  const rule=st.seasonProductRules.get(p.id),picked=!!rule;
  return '<div class="season-admin-product" data-season-product="'+esc(p.id)+'">'+
    '<label class="season-admin-choice"><input type="checkbox" data-season-check value="'+esc(p.id)+'" '+(picked?'checked':'')+'>'+
    '<span><b>'+esc(p.name)+'</b><small>Preço atual: '+brl(p.price)+' · '+esc(p.category||'')+'</small></span></label>'+
    '<label>Mínimo por produto<input data-season-min type="number" min="1" step="1" value="'+esc(rule?.minQuantity??1)+'"></label>'+
    '<label>Máximo (0 = livre)<input data-season-max type="number" min="0" step="1" value="'+esc(rule?.maxQuantity??0)+'"></label>'+
     '<label>Categoria sazonal<select data-season-cat><option value="">Sem categoria</option>'+
     categories.map(c=>'<option value="'+esc(c.id)+'" '+(rule?.categoryId===c.id?'selected':'')+'>'+esc(c.emoji||'🏷️')+' '+esc(c.name)+'</option>').join('')+'</select></label>'+
     '<label>Grade sazonal<select data-season-grade><option value="">Sem grade</option>'+
     grades.map(g=>'<option value="'+esc(g.id)+'" '+(rule?.gradeId===g.id?'selected':'')+'>'+esc(g.name)+'</option>').join('')+'</select></label>'+
     '<label>Sabor / tamanho na grade<input data-season-variant maxlength="80" placeholder="Ex.: Frango com requeijão" value="'+esc(rule?.variantLabel||'')+'"></label></div>';
 }).join('')||cellEmpty('Nenhum produto encontrado.');
}
function renderSeasonAdmin(){
 if(!st.seasonData)return;
 const campaigns=st.seasonData.campaigns||[],orders=st.seasonOrders?.orders||[];
 E('seasonStats').innerHTML=[
  statsCard('🎄','Campanhas',campaigns.length,'Datas sazonais cadastradas'),
  statsCard('📅','Em aberto',campaigns.filter(c=>c.status==='ABERTA').length,'Aceitando encomendas'),
  statsCard('💚','Sinal pendente',orders.filter(o=>o.seasonal?.campaignId&&o.seasonal?.depositStatus!=='PAID'&&!['CANCELADO','REJEITADO'].includes(s(o.status).toUpperCase())).length,'Pedidos sazonais, não carrinhos'),
  statsCard('💰','Saldo pendente',brl(orders.reduce((sum,o)=>sum+(o.seasonal?.balanceStatus==='PAID'?0:n(o.seasonal?.balanceDue)),0)),'Valor a receber na entrega')
 ].join('');
 const current=E('seasonCampaignSelect').value;
 E('seasonCampaignSelect').innerHTML='<option value="">➕ Nova campanha</option>'+
  campaigns.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.title)+' · '+esc(c.status)+'</option>').join('');
 E('seasonCampaignSelect').value=campaigns.some(c=>c.id===current)?current:'';
 E('seasonCampaignCards').innerHTML=campaigns.map(c=>'<article class="card season-campaign-card"><div class="mobile-record-head"><b>🎄 '+esc(c.title)+'</b><span class="badge '+(c.status==='ABERTA'?'good':'light')+'">'+esc(c.status)+'</span></div>'+
 '<p>Encomendar: '+esc(seasonTextDate(c.orderFrom))+' a '+esc(seasonTextDate(c.orderUntil))+'</p><p>Entrega/retirada: '+c.fulfillmentDates.map(seasonTextDate).map(esc).join(' · ')+'</p>'+
 '<p>Produtos: '+(c.products.length+(st.seasonData?.exclusiveProducts||[]).filter(p=>p.campaignId===c.id&&p.active).length)+' (inclui exclusivos ativos) · Mínimo total: '+c.minTotalQuantity+' · Sinal: 50%</p>'+
 '<button type="button" class="btn small primary" data-season-edit="'+esc(c.id)+'">✏️ Editar campanha</button></article>').join('');
 renderSeasonProducts();
 seasonExclusiveRender();
 renderSeasonOrders();
}
async function seasonLoadOrders(){
 try{st.seasonOrders=await api('seasonal-orders');renderSeasonAdmin();await seasonLoadLeads();}catch(err){seasonAlert('Falha ao consultar encomendas: '+err.message,true);}
}
async function seasonLoadLeads(){
 const holder=E('seasonLeadList'),count=E('seasonLeadCount');
 if(!holder)return;
 holder.textContent='Consultando carrinhos sazonais...';
 try{
  const data=await api('seasonal-leads');
  const leads=Array.isArray(data.leads)?data.leads:[];
  count.textContent=String(leads.length);
  holder.innerHTML=leads.length?'<div class="mobile-list">'+leads.map(l=>{
   const phone=s(l.phone).replace(/\\D/g,''),who=s(l.name).trim()||'Cliente';
   const list=Array.isArray(l.items)?l.items:[];
   const description=list.map(p=>s(p.quantity||1)+' × '+s(p.name)).join(', ');
   const msg='Olá, '+who+'! 💚 Aqui é do Caseirinho Massas Artesanais. Vimos que você estava escolhendo delícias para '+s(l.campaignTitle||'uma data especial')+' e queríamos saber se podemos ajudar. 🎄🍝 Sua encomenda ainda não foi finalizada e nenhuma cobrança foi feita. Posso ajudar com os produtos, quantidades, datas ou entrega? Vai ser um prazer fazer parte da sua comemoração! 💚';
   const url='https://wa.me/55'+phone+'?text='+encodeURIComponent(msg);
   return '<article class="mobile-record"><div class="mobile-record-head"><b>🛒 '+esc(who)+'</b><span class="badge warn">Não finalizou</span></div>'+
   '<p>📱 '+esc(phone)+' · '+esc(l.campaignTitle)+'<br>Produtos no carrinho: '+esc(description||'Itens não identificados')+'</p>'+
   '<p>💰 Valor estimado: '+brl(l.total)+' · Última atividade: há '+Math.round(n(l.inactiveMinutes))+' minutos</p>'+
   '<a class="btn primary" href="'+esc(url)+'" target="_blank" rel="noopener noreferrer">💬 Oferecer ajuda no WhatsApp</a></article>';
  }).join('')+'</div>':cellEmpty('Nenhuma encomenda abandonada identificada neste momento. Campanhas abertas não são pedidos de clientes.');
 }catch(err){holder.textContent='Não foi possível consultar oportunidades: '+err.message;}
}
function seasonClientMessage(o){
 const f=o.seasonal||{},delivery=o.mode==='ENTREGA',items=Array.isArray(o.items)?o.items:Array.isArray(o.itens)?o.itens:[];
 const details=items.length?'\nItens:\n'+items.map(p=>'• '+s(p.quantity||p.quantidade||1)+' × '+s(p.name||p.nome||p.descricao||'Produto')).join('\n'):'\nItens e quantidades: confira o comprovante do pedido.';
 return '🎄 CASEIRINHO — CONFIRMAÇÃO DE ENCOMENDA\nPedido: '+s(o.code)+'\nCliente: '+s(o.name)+'\nCampanha: '+s(f.campaignTitle)+details+
 '\nData: '+seasonTextDate(o.deliveryDate)+'\nModalidade: '+(delivery?'Entrega (horário a combinar)':'Retirada (confirmar horário)')+
 '\nTotal: '+brl(o.total)+'\nSinal (50%): '+brl(f.depositDue)+' — '+(f.depositStatus==='PAID'?'RECEBIDO':'PENDENTE DE CONFIRMAÇÃO')+
 '\nSaldo: '+brl(f.balanceDue)+' — '+(f.balanceStatus==='PAID'?'RECEBIDO':delivery?'pagar antes da saída para entrega':'pagar na retirada')+
 '\n\nCONDIÇÕES: A produção é reservada após a confirmação efetiva do sinal. Confira itens, quantidades, data e endereço. Mudanças dependem de disponibilidade. Pedimos aviso antecipado para cancelamentos. Custos comprovados de produção poderão ser considerados em eventual retenção, observada a legislação e o direito de arrependimento aplicável às compras a distância. Se houver falha do Caseirinho, garantimos as soluções previstas na lei. Para entregas, o horário será combinado e o saldo deverá ser quitado antes do envio. Se não houver alguém no endereço, entraremos em contato para combinar alternativa e eventual custo de nova entrega.\n\nResponda: LI E CONCORDO E CONFIRMO OS DADOS DO PEDIDO. 💚';
}
async function seasonCopyClientMessage(id){
 const o=(st.seasonOrders?.orders||[]).find(x=>s(x.id)===s(id));if(!o)return seasonAlert('Atualize os pedidos.',true);
 const message=seasonClientMessage(o);
 try{await navigator.clipboard.writeText(message);seasonAlert('📋 Mensagem copiada. Revise os dados antes de enviar pelo WhatsApp.');}
 catch(_){window.prompt('Copie a mensagem para o WhatsApp:',message);}
}
function seasonOrderFilter(){
 const q=s(E('seasonOrderSearch').value).toLowerCase(),filter=E('seasonOrderFilter').value;
 return(st.seasonOrders?.orders||[]).filter(o=>!!s(o.seasonal?.campaignId)).filter(o=>(s(o.code)+' '+s(o.name)+' '+s(o.phone)+' '+s(o.seasonal?.campaignTitle)).toLowerCase().includes(q)&&
 (filter==='all'||filter==='deposit'&&o.seasonal?.depositStatus!=='PAID'||filter==='paid'&&o.seasonal?.depositStatus==='PAID'||filter==='balance'&&o.seasonal?.depositStatus==='PAID'&&o.seasonal?.balanceStatus!=='PAID'||filter==='completed'&&o.seasonal?.balanceStatus==='PAID'));
}
function renderSeasonOrders(){
 const holder=E('seasonOrderList');if(!st.seasonOrders){holder.innerHTML=cellEmpty('Toque em Atualizar encomendas para consultar os pedidos.');return;}
 const items=seasonOrderFilter();
 holder.innerHTML=items.length?'<div class="mobile-list">'+items.map(o=>{
  const f=o.seasonal||{},depositOk=f.depositStatus==='PAID',balanceOk=f.balanceStatus==='PAID';
  return '<article class="mobile-record"><div class="mobile-record-head"><b>🎄 '+esc(o.code)+'</b><span class="badge '+(balanceOk?'good':'warn')+'">'+esc(balanceOk?'Quitado':depositOk?'Sinal pago':'Sinal pendente')+'</span></div>'+
  '<p><b>'+esc(o.name)+'</b> · '+esc(o.phone)+'<br>'+esc(f.campaignTitle)+' · '+esc(seasonTextDate(o.deliveryDate))+' · '+esc(o.mode==='ENTREGA'?'Entrega':'Retirada')+'</p>'+
  '<p>💰 Total: <b>'+brl(o.total)+'</b> · Sinal: <b>'+brl(f.depositDue)+'</b> · Saldo: <b>'+brl(f.balanceDue)+'</b></p>'+
  '<div class="record-actions">'+(!depositOk?'<button class="btn small primary" data-season-settle="'+esc(o.id)+'" data-stage="DEPOSIT">💚 Confirmar sinal recebido</button>':'<span class="badge good">✅ Sinal confirmado</span>')+
  (depositOk&&!balanceOk?'<button class="btn small gold" data-season-settle="'+esc(o.id)+'" data-stage="BALANCE">💰 Confirmar saldo na entrega</button>':'')+
  (balanceOk?'<span class="badge good">✅ Saldo quitado</span>':'')+'<button class="btn small" type="button" data-season-message="'+esc(o.id)+'">📋 Mensagem para cliente</button></div></article>';
 }).join('')+'</div>':cellEmpty('Nenhuma encomenda encontrada neste filtro.');
}
function seasonAdminTab(tab){
 st.seasonAdminTab=tab;E('seasonCampaignsPanel').hidden=tab!=='campaigns';E('seasonOrdersPanel').hidden=tab!=='orders';
 document.querySelectorAll('[data-season-admin-tab]').forEach(b=>b.className='btn'+(b.dataset.seasonAdminTab===tab?' primary':''));
 if(tab==='orders')seasonLoadOrders();
}
async function saveSeasonalCampaign(){
 seasonSaveEdits();
 const dates=s(E('seasonDates').value).split(/[\n,;]+/).map(x=>x.trim()).filter(Boolean).map(x=>/^\d{2}\/\d{2}\/\d{4}$/.test(x)?x.slice(6)+'-'+x.slice(3,5)+'-'+x.slice(0,2):x);
 const body={id:E('seasonCampaignSelect').value||undefined,title:s(E('seasonTitle').value).trim(),description:s(E('seasonDescription').value).trim(),
 bannerText:s(E('seasonBanner').value).trim(),bannerImages:[...seasonBannerImages],orderFrom:E('seasonFrom').value,orderUntil:E('seasonUntil').value,fulfillmentDates:[...new Set(dates)].sort(),
 minimumOrderValue:Number(E('seasonMinValue').value)||0,maximumOrderValue:Number(E('seasonMaxValue').value)||0,minTotalQuantity:Number(E('seasonMinTotalQty').value)||1,
 allowPickup:E('seasonPickup').checked,allowDelivery:E('seasonDelivery').checked,active:E('seasonActive').checked,
 products:[...st.seasonProductRules.values()]};
 if(!body.title)return seasonAlert('Informe o nome da campanha.',true);
 if(!body.orderFrom||!body.orderUntil)return seasonAlert('Informe as duas datas do período de encomendas.',true);
 if(body.orderFrom>body.orderUntil)return seasonAlert('A data inicial é posterior ao prazo final.',true);
 if(!body.fulfillmentDates.length)return seasonAlert('Digite as datas de entrega/retirada no campo próprio. O texto de exemplo não é um valor preenchido.',true);
 if(body.fulfillmentDates.some(d=>!/^\d{4}-\d{2}-\d{2}$/.test(d)))return seasonAlert('Datas de entrega inválidas. Utilize AAAA-MM-DD ou DD/MM/AAAA, uma por linha.',true);
 if(body.fulfillmentDates.some(d=>d<body.orderUntil))return seasonAlert('A entrega/retirada deve ser na data limite de encomendas ou depois dela.',true);
 if(!body.allowPickup&&!body.allowDelivery)return seasonAlert('Marque Entrega e/ou Retirada.',true);
 // Campanhas novas podem ser salvas sem itens, para receber produtos exclusivos depois.
 if(!window.confirm('Publicar '+body.title+' com '+body.products.length+' produtos? Os clientes poderão encomendar, pagando 50% de sinal e o restante na entrega.'))return;
 const btn=E('seasonSave');btn.disabled=true;btn.textContent='Publicando...';
 try{
  await api('seasonal-campaigns',{method:'POST',body});
  await loadSeasonAdmin();E('seasonCampaignSelect').value='';seasonChooseCampaign('');
  seasonAlert('✅ Campanha publicada. O banner aparecerá no e-commerce enquanto a campanha estiver disponível.');
 }catch(err){seasonAlert('Falha na publicação: '+err.message,true);}
 finally{btn.disabled=false;btn.textContent='💾 Salvar e publicar campanha';}
}
async function seasonConfirmPayment(id,stage){
 const o=(st.seasonOrders?.orders||[]).find(x=>x.id===id);if(!o)return;
 const isBalance=stage==='BALANCE',amount=isBalance?o.seasonal.balanceDue:o.seasonal.depositDue;
 const reference=window.prompt('Informe a referência do pagamento de '+brl(amount)+' do pedido '+o.code+' (ID do Pix ou identificação do recebimento):');
 if(!reference||reference.trim().length<3)return seasonAlert('Informe uma referência válida para registrar o recebimento.',true);
 const accepted=window.confirm((isBalance?'Confirmo que a encomenda foi entregue/retirada E recebi o saldo de ':'Confirmo que recebi efetivamente o sinal de ')+brl(amount)+' do pedido '+o.code+'? Não confirme somente pelo comprovante enviado pelo cliente.');
 if(!accepted)return;
 try{
  await api('seasonal-orders/'+encodeURIComponent(id)+'/confirm-payment',{method:'POST',body:{stage,paymentVerified:true,delivered:isBalance,reference:reference.trim().slice(0,120)}});
  seasonAlert('✅ Recebimento '+(isBalance?'do saldo':'do sinal')+' registrado para '+o.code+'.');
  await seasonLoadOrders();
 }catch(err){seasonAlert('Não foi possível confirmar: '+err.message,true);}
}
function bindSeasonAdmin(){
 bindSeasonExclusive();
 E('seasonRefresh').addEventListener('click',async()=>{await loadSeasonAdmin();if(st.seasonAdminTab==='orders')await seasonLoadOrders();});
 E('seasonCampaignSelect').addEventListener('change',()=>seasonChooseCampaign(E('seasonCampaignSelect').value));
 E('seasonProductSearch').addEventListener('input',()=>{seasonSaveEdits();renderSeasonProducts();});
 E('seasonProductList').addEventListener('change',e=>{
  const el=e.target.closest('[data-season-check]');if(!el)return;
  seasonSaveEdits();const id=el.value;
  if(el.checked)st.seasonProductRules.set(id,{id,minQuantity:1,maxQuantity:0});
  else st.seasonProductRules.delete(id);
  renderSeasonProducts();
 });
 E('seasonProductList').addEventListener('input',e=>{
  const row=e.target.closest('[data-season-product]');if(row&&st.seasonProductRules.has(row.dataset.seasonProduct))seasonSaveEdits();
 });
 E('seasonImagesUpload').addEventListener('change',async e=>{
  const input=e.currentTarget,files=[...input.files];input.value='';
  if(files.length+seasonBannerImages.length>8)return seasonAlert('A vinheta permite até 8 fotos.',true);
  for(const file of files){try{seasonBannerImages.push(await seasonImageFromFile(file));}catch(err){seasonAlert('Foto '+file.name+': '+err.message,true);}}
  seasonRenderImages();
 });
 E('seasonAddImageUrl').addEventListener('click',()=>{
  const value=E('seasonImageUrl').value.trim();
  if(!/^https:\/\/\S+$/i.test(value))return seasonAlert('Use um endereço de imagem HTTPS válido.',true);
  if(seasonBannerImages.length>=8)return seasonAlert('A vinheta permite até 8 fotos.',true);
  seasonBannerImages.push(value);E('seasonImageUrl').value='';seasonRenderImages();
 });
 E('seasonImagesPreview').addEventListener('click',e=>{
  const remove=e.target.closest('[data-season-img-remove]');
  if(remove){seasonBannerImages.splice(Number(remove.dataset.seasonImgRemove),1);return seasonRenderImages();}
  const move=e.target.closest('[data-season-img-move]');
  if(move){const i=Number(move.dataset.seasonImgMove),j=i+Number(move.dataset.delta);if(j>=0&&j<seasonBannerImages.length){[seasonBannerImages[i],seasonBannerImages[j]]=[seasonBannerImages[j],seasonBannerImages[i]];seasonRenderImages();}}
 });
 E('seasonSave').addEventListener('click',saveSeasonalCampaign);
 document.querySelectorAll('[data-season-admin-tab]').forEach(b=>b.addEventListener('click',()=>seasonAdminTab(b.dataset.seasonAdminTab)));
 E('seasonLoadOrders').addEventListener('click',seasonLoadOrders);
 E('seasonLoadLeads').addEventListener('click',seasonLoadLeads);
 E('seasonOrderSearch').addEventListener('input',renderSeasonOrders);
 E('seasonOrderFilter').addEventListener('change',renderSeasonOrders);
 document.addEventListener('click',e=>{
  const edit=e.target.closest('[data-season-edit]');if(edit){E('seasonCampaignSelect').value=edit.dataset.seasonEdit;seasonChooseCampaign(edit.dataset.seasonEdit);}
  const settle=e.target.closest('[data-season-settle]');if(settle)seasonConfirmPayment(settle.dataset.seasonSettle,settle.dataset.stage);
   const message=e.target.closest('[data-season-message]');if(message)seasonCopyClientMessage(message.dataset.seasonMessage);
 });
}
function bind(){
 setupInstall();
 window.addEventListener('caseirinho:order-rejected',refreshOrdersAfterRejection);
 bindSeasonAdmin();
 bindBlackFriday();
 bindCouponModule();
 bindMoreFeatures();
 bindMerch();
 E('opsRefresh')?.addEventListener('click',loadOpsAudit);
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.view)));
 E('refreshBtn').addEventListener('click',async()=>{await loadAll();if(st.view==='sales')await loadSales();if(st.view==='operations')await loadOpsAudit();});
 document.addEventListener('click',e=>{if(e.target?.id==='verifyProductTerms')verifyProductTerms();});
 E('logoutBtn').addEventListener('click',logout);
 E('clearSession').addEventListener('click',logout);
 E('contactSearch').addEventListener('input',renderContacts);
 E('contactFilter').addEventListener('change',renderContacts);
 E('orderSearch').addEventListener('input',renderOrders);
 E('orderFilter').addEventListener('change',renderOrders);
 E('orderQuickNewFilter').addEventListener('click',()=>{E('orderFilter').value='NEW';nav('orders');renderOrders();});
 E('refreshFulfillment').addEventListener('click',refreshFulfillment);
 E('menuCategory').addEventListener('change',renderMenu);
 E('csvContacts').addEventListener('click',csv);
 E('productSearch').addEventListener('input',renderProducts);
 E('productCategory').addEventListener('change',renderProducts);
 E('productStatus').addEventListener('change',renderProducts);
 initSalesDates();
 E('salesRefresh').addEventListener('click',loadSales);
 E('salesSearch').addEventListener('input',renderSalesDetails);
 E('salesABCFilter').addEventListener('change',renderSalesDetails);
 E('salesCategoryFilter').addEventListener('change',renderSalesDetails);
 E('salesCsv').addEventListener('click',salesCSV);
 E('salesPdf').addEventListener('click',salesPDF);
 document.addEventListener('click',e=>{const b=e.target.closest('[data-sales-ficha]');if(!b)return;nav('fichas');if(st.fichasData)openFicha(b.dataset.salesFicha);else loadFichas().then(()=>{if(st.fichasData)openFicha(b.dataset.salesFicha);});});
 document.querySelectorAll('[data-sales-range]').forEach(x=>x.addEventListener('click',()=>selectSalesDays(x.dataset.salesRange)));

 E('productsRefresh').addEventListener('click',loadAll);
 E('createProduct').addEventListener('click',openCreateProduct);
 document.addEventListener('input',event=>{if(event.target?.id==='productDescriptionText'&&E('productDescriptionLength'))E('productDescriptionLength').textContent=String(event.target.value.length);});
  document.addEventListener('change',event=>{if(event.target?.id==='newProductPhotos')previewFiles(event.target.files,'newProductPhotoPreview');if(event.target?.id==='replacePhotos')previewFiles(event.target.files,'replacePhotoPreview');});
 document.addEventListener('submit',e=>{if(e.target?.id==='productEditForm')return saveProduct(e);if(e.target?.id==='productDescriptionEditForm')return saveProductDescription(e);if(e.target?.id==='productCreateForm')return saveNewProduct(e);if(e.target?.id==='productPhotoForm')return saveProductPhotos(e);});
 document.querySelectorAll('[data-report]').forEach(b=>b.addEventListener('click',()=>pdfReport(b.dataset.report)));

 E('copyMenu').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(E('menuText').textContent);toast('Cardápio copiado!');}catch(_){toast('Copie o texto manualmente.',true);}});
 E('menuShare').addEventListener('click',()=>{
 const txt=menuParts(null);window.__menuParts=txt;
 modal('Compartilhar cardápio','<p>Escolha o trecho para compartilhar. O WhatsApp pedirá o destinatário.</p>'+txt.map((m,i)=>'<button class="btn whatsapp" data-action="sharepart" data-index="'+i+'">Compartilhar parte '+(i+1)+'/'+txt.length+'</button>').join(' ')+'<div class="notice">As mensagens não são enviadas automaticamente.</div>');
 });
 E('modalClose').addEventListener('click',hideModal);
 E('modal').addEventListener('click',e=>{if(e.target===E('modal'))hideModal();});
 E('enableSound').addEventListener('click',async()=>{
 st.sound=true;
 try{if('Notification'in window&&Notification.permission==='default')await Notification.requestPermission()}catch(_){}
 toast('Alertas sonoros ativados enquanto este aplicativo estiver aberto.');
 });
 E('loginForm').addEventListener('submit',loginWithERP);
 document.addEventListener('click',e=>{
 const b=e.target.closest('[data-action]');if(!b)return;
 const type=b.dataset.action,phone=b.dataset.phone,id=b.dataset.id;
 if(type==='customerOrders')return showCustomerOrders(phone);
 if(type==='viewOrder')return showOrder(b.dataset.order);
 if(type==='quickAcceptOrder')return quickAcceptOrder(b.dataset.order);
 if(type==='changePaymentMethod')return changePaymentMethod(b.dataset.order);
 if(type==='saveManualPayment')return saveManualPayment(b.dataset.order);
 if(type==='verifyOrderPayment')return verifyOrderPayment(b.dataset.order);
 if(type==='quickFinishOrder')return quickFinishOrder(b.dataset.order);
 if(type==='goReceivables'){hideModal();nav('receivables');return;}
 if(type==='quickCashbackOrder')return quickCashbackOrder(b.dataset.order);
 if(type==='quickSaveCashback')return quickSaveCashback(b.dataset.order);
 if(type==='repairCashbackERP')return repairCashbackERP(b.dataset.order);
 if(type==='quickConfirmOrder')return quickConfirmOrder(b.dataset.order);
 if(type==='closeModal')return hideModal();
 if(type==='fulfillOrder')return manageOrderFulfillment(b.dataset.order);
 if(type==='approveOrderCashback')return approveOrderCashback(b.dataset.order);
 if(type==='releaseOrderCashback')return releaseOrderCashback(b.dataset.order);
 if(type==='completeOrder')return confirmOrderComplete(b.dataset.order);
 if(type==='pdfOrder')return pdfOrder(b.dataset.order);
 if(type==='goStockSales'){hideModal();nav('sales');return;}
  if(type==='editProduct')return editProduct(b.dataset.product);
  if(type==='descriptionProduct')return editProductDescription(b.dataset.product);
 if(type==='photosProduct')return editProductPhotos(b.dataset.product);
 if(type==='publishDraft')return publishDraft(b.dataset.product);
 if(type==='mark')return markHandled(id);
 if(type==='hello'){const c=clientFor(phone);if(c.optout)return toast('Cliente marcou não contatar.',true);return openWhats(phone,hello(c));}
 if(type==='catalog'||type==='respond')return prepareMenu(phone);
 if(type==='part'){openWhats(phone,window.__menuParts[Number(b.dataset.index)]||'');return;}
 if(type==='sharepart'){const text=window.__menuParts[Number(b.dataset.index)]||'';
 // Compartilhar sem destinatário específico com a mensagem pré-preenchida.
 window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener,noreferrer');return;
 }
 });
}
async function init(){
 tokenSetup();bind();
 if(st.token){await loadAll();{const params=new URLSearchParams(location.search),requested=params.get('view');if(['blackfriday','sazonais','products','operations','financeiro','sales','receivables'].includes(requested))nav(requested);if(requested==='products'&&params.get('product')){const id=params.get('product');if(st.catalog.some(x=>s(x.id)===s(id)))editProduct(id);}}}else E('loginScreen').hidden=false;
 setInterval(loadRequests,90000);
 setInterval(()=>{if(document.visibilityState!=='hidden')loadAll();},180000);
 await pollNewOrders();
 setInterval(pollNewOrders,30000);
}
window.CaseirinhoSeasonMerchBridge={E,st,api,loadSeasonAdmin,renderSeasonProducts,s,esc,brl};
window.CaseirinhoCategoryBridge={
 api,modal,hideModal,categories:()=>st.categories,
 reload:async()=>{
  const [conf,catalog]=await Promise.all([api('product-categories'),api('catalog')]);
  st.categories=conf.categories||[];st.catalog=catalog.items||[];
  renderProducts();renderMenu();window.dispatchEvent(new Event('caseirinho:categories-updated'));
  return conf;
 },
 filterProducts:name=>{
  nav('products');E('productCategory').value=name;renderProducts();
  E('productSearch')?.scrollIntoView?.({behavior:'smooth',block:'center'});
 }
};
window.CaseirinhoInsightsReceivablesBridge={api,nav,modal,hideModal};
window.CaseirinhoInsightsStockBridge={api,report:()=>st.sales,refresh:loadSales,refreshCatalog:async()=>{const data=await api('catalog');st.catalog=data.items||st.catalog;if(st.view==='products')renderProducts()}};
if(document.readyState==='complete')init();else document.addEventListener('DOMContentLoaded',init,{once:true});
})();