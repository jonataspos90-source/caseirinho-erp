(function(){
'use strict';
const STORE='https://jonataspos90-source.github.io/caseirinho-loja/';
const DEFAULT_API='https://john-cloud-api-production.up.railway.app';
const st={api:DEFAULT_API,token:'',summary:null,contacts:[],orders:[],catalog:[],categories:[],drafts:[],requests:[],sales:null,salesLoaded:false,view:'dashboard',syncing:false,sound:false,known:new Set(),knownReady:false,lastUpdated:null};
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
 const response=await fetch(st.api+'/api/v1/admin/store/insights/'+path,{
  method:options&&options.method||'GET',cache:'no-store',
  headers:{Authorization:'Bearer '+st.token,'Cache-Control':'no-store','Content-Type':'application/json'},
  body:options&&options.body?JSON.stringify(options.body):undefined
 });
 let data={};try{data=await response.json()}catch(_){}
 if(!response.ok)throw Error(s(data.error||('HTTP '+response.status)));
 return data;
}
function nav(tab){
 st.view=tab;
 document.querySelectorAll('.section').forEach(x=>x.classList.toggle('active',x.id===tab));
 document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.dataset.view===tab));
 const labels={dashboard:'Visão geral',contacts:'CRM e contatos',ranking:'Ranking de acessos',orders:'Pedidos',menu:'Cardápio escrito',products:'Produtos e preços',reports:'Relatórios e PDF',sales:'Vendas e Curva ABC',requests:'Solicitações de cardápio',settings:'Configurações'};
 E('pageTitle').textContent=labels[tab]||'Central de Insights';
 window.scrollTo({top:0,behavior:'smooth'});
 render();
 if(tab==='sales'&&!st.salesLoaded)loadSales();
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
function renderOrders(){
 const q=s(E('orderSearch').value).toLowerCase().trim(),f=E('orderFilter').value;
 const rows=st.orders.filter(x=>(s(x.code)+' '+s(x.name)+' '+s(x.phone)+' '+(x.items||[]).map(i=>i.name).join(' ')).toLowerCase().includes(q)&&(f==='all'||x.integration_status===f));
 if(window.matchMedia('(max-width:790px)').matches){
  E('ordersTable').innerHTML=rows.length?'<div class="mobile-list">'+rows.map(x=>'<article class="mobile-record"><div class="mobile-record-head"><strong>Pedido #'+esc(x.code)+'</strong>'+badge(x.status)+'</div><p><b>'+esc(x.name||'Cliente')+'</b> · '+dt(x.created_at)+'</p><p><b>'+brl(x.total)+'</b> · '+(x.items||[]).length+' item(ns)</p><p>'+badge(x.integration_status)+'</p><div class="record-actions">'+orderButton(x)+'</div></article>').join('')+'</div>':cellEmpty('Nenhum pedido encontrado.');
 }else{
  E('ordersTable').innerHTML=table(['Data','Pedido','Cliente','Itens pedidos','Total','Status / ERP','Ações'],rows.map(x=>'<tr><td>'+dt(x.created_at)+'</td><td><b>'+esc(x.code)+'</b></td><td>'+esc(x.name||'—')+'<br><small>'+esc(tel(x.phone))+'</small></td><td>'+esc((x.items||[]).map(i=>n(i.quantity)+'× '+i.name).join(', '))+'</td><td><b>'+brl(x.total)+'</b></td><td>'+badge(x.status)+'<br>'+badge(x.integration_status)+'</td><td class="actions-cell">'+orderButton(x)+'</td></tr>'));
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
function menuSelection(){const cat=E('menuCategory').value;return st.catalog.filter(x=>cat==='all'||x.category===cat).filter(x=>!/alco[oó]lic/i.test(x.category)||/n[aã]o\s+alco[oó]lic/i.test(x.category));}
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
 const categories=[...new Set(st.catalog.map(x=>x.category))].filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'));
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
function render(){
 if(!st.token)return;
 if(st.view==='dashboard')renderOverview();
 if(st.view==='contacts')renderContacts();
 if(st.view==='ranking')renderRanking();
 if(st.view==='orders')renderOrders();
 if(st.view==='menu')renderMenu();
 if(st.view==='products')renderProducts();
 if(st.view==='sales')renderSales();
 if(st.view==='requests')renderRequests();
 E('apiLabel').textContent=st.api;
 E('apiState').innerHTML='<p class="notice success">Última consulta: '+dt(st.lastUpdated)+'. Dados recebidos exclusivamente da API autenticada.</p>';
}
async function loadAll(){
 if(st.syncing||!st.token)return;
 st.syncing=true;E('refreshBtn').disabled=true;E('lastSync').textContent='Sincronizando dados do Neon…';
 const paths=['summary','contacts','orders','catalog','requests','product-categories','product-drafts'];
 const responses=await Promise.allSettled(paths.map(x=>api(x)));
 const errors=[];
 for(let i=0;i<paths.length;i++){
 const x=responses[i],key=paths[i];
 if(x.status==='rejected'){if(!['product-categories','product-drafts'].includes(key))errors.push(key+': '+x.reason.message);continue}
 const val=x.value;
 if(key==='summary')st.summary=val;
 if(key==='contacts')st.contacts=val.contacts||[];
 if(key==='orders')st.orders=val.orders||[];
 if(key==='catalog')st.catalog=val.items||[];
 if(key==='product-categories')st.categories=val.categories||[];
 if(key==='product-drafts')st.drafts=val.drafts||[];
 if(key==='requests')updateRequestData(val);
 }
 st.lastUpdated=new Date();
 E('lastSync').textContent='Última atualização: '+dt(st.lastUpdated)+' • '+(errors.length?'Dados parciais':'Conectado ao Neon e CRM');
 E('sideSync').textContent=errors.length?'Verificar integração':'✓ Sincronizado';
 E('globalNotice').className='notice'+(errors.length?' error':'');
 E('globalNotice').textContent=errors.length?'Alguns dados não puderam ser consultados: '+errors.join(' | '):'Dados consultados por API autenticada. Os pings não representam visitas; instalações só são confirmadas por appinstalled e só há ranking com eventos reais.';
 if(errors.length>=5){E('loginNotice').textContent='Não foi possível consultar os dados. Se sua sessão expirou, entre com usuário e senha do ERP. Detalhes: '+errors[0];E('loginScreen').hidden=false;}
 else E('loginScreen').hidden=true;
 st.syncing=false;E('refreshBtn').disabled=false;render();
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
 if(!st.token||st.syncing)return;
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
 const q=s(E('productSearch')?.value).toLowerCase().trim(),select=E('productCategory'),prev=select.value;
 const cats=[...new Set(st.catalog.map(x=>x.category))].sort((a,b)=>s(a).localeCompare(s(b),'pt-BR'));
 select.innerHTML='<option value="all">Todas as categorias</option>'+cats.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
 if(cats.includes(prev))select.value=prev;else select.value='all';
 const selected=st.catalog.filter(x=>(select.value==='all'||x.category===select.value)&&(s(x.name)+' '+s(x.category)+' '+s(x.variation)).toLowerCase().includes(q));
 E('productsCount').textContent=selected.length+' publicados';
 renderDrafts();
 if(!selected.length){E('productsList').innerHTML=cellEmpty('Não há produtos com esses critérios.');return;}
 E('productsList').innerHTML='<div class="product-card-grid">'+selected.map(x=>
 '<article class="product-card"><div><div class="product-photo">'+(x.image?'<img src="'+esc(x.image)+'" alt="Foto de '+esc(x.name)+'" loading="lazy">':'<span>📷 Sem foto</span>')+'</div><span class="badge light">'+esc(x.category)+'</span> '+(x.promotionActive?'<span class="badge warn">Promoção ativa</span>':'')+
 '<h3>'+esc(x.name)+'</h3><small class="muted">'+esc(x.variation||x.availability||'')+'</small></div>'+
 '<div class="price-row"><b>'+brl(x.price)+'</b><span>Mínimo: '+n(x.minimum)+' · Máximo: '+(n(x.maximum)||'Sem limite')+'</span></div>'+
 '<button class="btn primary" type="button" data-action="editProduct" data-product="'+esc(x.id)+'">✏️ Preço / mínimo</button><button class="btn gold" type="button" data-action="photosProduct" data-product="'+esc(x.id)+'">📷 Alterar fotos</button></article>'
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
 return (st.categories||[]).map(x=>'<option value="'+esc(x.id)+'">'+esc(x.name)+'</option>').join('');
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
 '<label class="form-label" for="editPrice">💰 Preço de venda (R$)</label>'+
 '<input id="editPrice" type="number" min="0.01" max="1000000" step="0.01" inputmode="decimal" required value="'+n(x.price)+'">'+
 '<label class="form-label" for="editMinimum">📦 Quantidade mínima por pedido</label>'+
 '<input id="editMinimum" type="number" min="0.01" max="99999" step="0.01" inputmode="decimal" required value="'+n(x.minimum||1)+'">'+
 '<label class="form-label" for="editMaximum">📦 Quantidade máxima (0 = sem limite)</label>'+
 '<input id="editMaximum" type="number" min="0" max="99999" step="0.01" inputmode="decimal" required value="'+n(x.maximum)+'">'+
 (x.promotionActive?'<div class="notice">⚠️ Há promoção ativa neste produto. O preço promocional deve ser conferido separadamente no ERP.</div>':'')+
 '<p class="muted">Alteração registrada com data e usuário. Se outro operador modificar o produto, a gravação será recusada para evitar conflito.</p>'+
 '<button class="btn primary" type="submit">✅ Salvar no ERP e na loja</button></form>';
 modal('✏️ Editar produto',html);
}
async function saveProduct(e){
 e.preventDefault();
 const form=e.target,productId=form?.dataset.product;
 const x=st.catalog.find(v=>v.id===productId);
 if(!x)return toast('Produto desatualizado. Atualize antes de salvar.',true);
 const price=Number(E('editPrice').value),minimum=Number(E('editMinimum').value),maximum=Number(E('editMaximum').value);
 if(!Number.isFinite(price)||price<=0||!Number.isFinite(minimum)||minimum<=0||!Number.isFinite(maximum)||maximum<0||(maximum>0&&maximum<minimum))return toast('Preencha valores válidos. Máximo deve ser zero ou maior que o mínimo.',true);
 if(!window.confirm('Confirmar alteração em '+x.name+'? Preço: '+brl(price)+' | Mínimo: '+minimum+' | Máximo: '+(maximum||'sem limite')+'. A alteração será publicada no catálogo.'))return;
 const button=form.querySelector('[type=submit]');button.disabled=true;button.textContent='Salvando…';
 try{
  const r=await api('catalog/'+encodeURIComponent(productId)+'/terms',{method:'PATCH',body:{price,minimum,maximum,expectedUpdatedAt:x.updatedAt}});
  hideModal();toast('✅ Produto atualizado no ERP e na loja.');
  if(r.warning)toast(r.warning,true);
  await loadAll();nav('products');
 }catch(err){toast('Não foi possível salvar: '+err.message,true);button.disabled=false;button.textContent='✅ Salvar no ERP e na loja';}
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
function orderButton(order){
 return '<button class="btn small" type="button" data-action="viewOrder" data-order="'+esc(order.code)+'">📦 Ver itens</button> '+
 '<button class="btn small gold" type="button" data-action="pdfOrder" data-order="'+esc(order.code)+'">📄 PDF</button>';
}
function showOrder(code){
 const x=st.orders.find(v=>s(v.code)===s(code))||(window.__customerOrders||[]).find(v=>s(v.code)===s(code));
 if(!x)return toast('Pedido não localizado. Atualize os pedidos.',true);
 modal('🛒 Pedido '+x.code,orderDetailsHtml(x)+'<div class="toolbar"><button class="btn primary" data-action="pdfOrder" data-order="'+esc(x.code)+'">📄 Imprimir / salvar PDF</button></div>');
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
function renderSalesDetails(){
 if(!st.sales)return;
 const filtered=salesFilterProducts();
 const rows=filtered.map(x=>'<tr><td>'+abcBadge(x.abc)+'</td>'+
 '<td><b>'+esc(x.name)+'</b><br><small class="muted">'+esc(x.code||'')+' · '+esc(x.category)+'</small></td>'+
 '<td>'+qtyBR(x.quantity)+'</td><td><b>'+brl(x.revenue)+'</b></td>'+
 '<td>'+pctBR(x.sharePct)+'</td><td>'+pctBR(x.cumulativePct)+'</td>'+
 '<td><b>'+qtyBR(x.dailyAverageQty42d)+'</b>/dia<br><small>'+qtyBR(x.weeklyAverageQty42d)+'/semana</small></td>'+
 '<td>'+qtyBR(x.quantity42d)+'</td></tr>');
 if(window.matchMedia('(max-width:790px)').matches){
  E('salesTable').innerHTML=filtered.length?'<div class="mobile-list">'+filtered.map((x,i)=>
   '<article class="mobile-record"><div class="mobile-record-head"><div><b>'+esc(x.name)+'</b><br><small class="muted">'+esc(x.category)+'</small></div>'+abcBadge(x.abc)+'</div>'+
   '<div class="sales-mobile-grid"><span>Quantidade vendida<b>'+qtyBR(x.quantity)+'</b></span><span>Faturamento<b>'+brl(x.revenue)+'</b></span>'+
   '<span>Participação<b>'+pctBR(x.sharePct)+'</b></span><span>Acumulado ABC<b>'+pctBR(x.cumulativePct)+'</b></span>'+
   '<span>Média em 42 dias<b>'+qtyBR(x.dailyAverageQty42d)+'/dia</b></span><span>Por semana (42d)<b>'+qtyBR(x.weeklyAverageQty42d)+'</b></span></div>'+
   '<div class="muted" style="font-size:11px;margin-top:8px">Vendido em 42 dias: '+qtyBR(x.quantity42d)+' · '+brl(x.revenue42d)+'</div></article>'
  ).join('')+'</div>':cellEmpty('Não há produtos para estes filtros.');
 }else{
  E('salesTable').innerHTML=table(['ABC','Produto / categoria','Qtd.','Receita itens','Participação','Acum. ABC','Média 42d','Qtd. 42d'],rows);
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
  statsCard('📊','Período de média',42+' dias','Até '+displayISODate(win.to))
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
}
function salesCSV(){
 if(!st.sales)return toast('Consulte o relatório antes de exportar.',true);
 const p=st.sales.period,header=['Classe ABC','Código','Produto','Categoria','Unidade','Quantidade período','Faturamento de itens (R$)','% participação','% acumulado','Pedidos','Última venda','Quantidade nos 42 dias','Receita nos 42 dias','Média diária 42 dias','Média semanal 42 dias'];
 const data=[header,...salesFilterProducts().map(x=>[x.abc,x.code,x.name,x.category,x.unit,x.quantity,x.revenue,x.sharePct,x.cumulativePct,x.orders,dt(x.lastSale),x.quantity42d,x.revenue42d,x.dailyAverageQty42d,x.weeklyAverageQty42d])];
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
 const rows=salesFilterProducts().map(x=>'<tr><td>'+esc(x.abc)+'</td><td>'+esc(x.code)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.category)+'</td><td>'+qtyBR(x.quantity)+'</td><td>'+brl(x.revenue)+'</td><td>'+pctBR(x.sharePct)+'</td><td>'+pctBR(x.cumulativePct)+'</td><td>'+qtyBR(x.dailyAverageQty42d)+'</td></tr>');
 const body=head+'<h3>Resumo Curva ABC</h3>'+abc+'<h3>Curva ABC por categoria</h3>'+table(['ABC','Categoria','Produtos','Qtd.','Receita','Participação'],categoryRows)+'<h3>Vendas detalhadas por produto</h3>'+
 table(['ABC','Código','Produto','Categoria','Qtd.','Receita','%','Acumulado','Média/dia 42d'],rows)+
 '<p><small>Fonte: e-commerce Caseirinho, pedidos ACEITO/ENTREGUE/RETIRADO/CONCLUIDO. Excluídos pendentes, cancelados, rejeitados e testes identificados. Frete/descontos de pedido não rateados. A média inclui dias sem vendas.</small></p>';
 printDocument('Vendas por Produto • Curva ABC',body);
}
function bind(){
 setupInstall();
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>nav(b.dataset.view)));
 E('refreshBtn').addEventListener('click',async()=>{await loadAll();if(st.view==='sales')await loadSales();});
 E('logoutBtn').addEventListener('click',logout);
 E('clearSession').addEventListener('click',logout);
 E('contactSearch').addEventListener('input',renderContacts);
 E('contactFilter').addEventListener('change',renderContacts);
 E('orderSearch').addEventListener('input',renderOrders);
 E('orderFilter').addEventListener('change',renderOrders);
 E('menuCategory').addEventListener('change',renderMenu);
 E('csvContacts').addEventListener('click',csv);
 E('productSearch').addEventListener('input',renderProducts);
 E('productCategory').addEventListener('change',renderProducts);
 initSalesDates();
 E('salesRefresh').addEventListener('click',loadSales);
 E('salesSearch').addEventListener('input',renderSalesDetails);
 E('salesABCFilter').addEventListener('change',renderSalesDetails);
 E('salesCategoryFilter').addEventListener('change',renderSalesDetails);
 E('salesCsv').addEventListener('click',salesCSV);
 E('salesPdf').addEventListener('click',salesPDF);
 document.querySelectorAll('[data-sales-range]').forEach(x=>x.addEventListener('click',()=>selectSalesDays(x.dataset.salesRange)));

 E('productsRefresh').addEventListener('click',loadAll);
 E('createProduct').addEventListener('click',openCreateProduct);
 document.addEventListener('change',event=>{if(event.target?.id==='newProductPhotos')previewFiles(event.target.files,'newProductPhotoPreview');if(event.target?.id==='replacePhotos')previewFiles(event.target.files,'replacePhotoPreview');});
 document.addEventListener('submit',e=>{if(e.target?.id==='productEditForm')return saveProduct(e);if(e.target?.id==='productCreateForm')return saveNewProduct(e);if(e.target?.id==='productPhotoForm')return saveProductPhotos(e);});
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
 if(type==='pdfOrder')return pdfOrder(b.dataset.order);
 if(type==='editProduct')return editProduct(b.dataset.product);
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
 if(st.token){await loadAll();}else E('loginScreen').hidden=false;
 setInterval(loadRequests,30000);
 setInterval(loadAll,120000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();