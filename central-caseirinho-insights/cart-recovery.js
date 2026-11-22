(function(){
'use strict';
if(window.__CASEIRINHO_CART_RECOVERY_126__)return;
window.__CASEIRINHO_CART_RECOVERY_126__=true;
const API='https://john-cloud-api-production.up.railway.app/api/v1/admin/store/insights';
const STORE='https://jonataspos90-source.github.io/caseirinho-loja/';
const SESSION_KEY='caseirinho_insights_erp_session_v6';
const E=id=>document.getElementById(id);
const S=v=>String(v??'');
const N=v=>Number(v)||0;
const A=v=>Array.isArray(v)?v:[];
const esc=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const brl=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(N(v));
const datetime=v=>{if(!v)return '—';const d=new Date(v);return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(d)};
let data={carts:[],pendingCount:0,contactableCount:0,contactedCount:0,thresholdMinutes:30},loading=false,loaded=false,filter='PENDING',term='';
let previousContactable=new Set();
function token(){try{const x=JSON.parse(sessionStorage.getItem(SESSION_KEY)||'{}');return N(x.expiresAt)>Date.now()+5000?S(x.token):''}catch(_){return''}}
async function call(path,options={}){
 const t=token();
 if(!t)throw new Error('Entre na Central Caseirinho para consultar as sacolas.');
 const r=await fetch(API+path,{method:options.method||'GET',cache:'no-store',credentials:'omit',
  headers:{Authorization:'Bearer '+t,'Content-Type':'application/json','Cache-Control':'no-cache'},
  ...(options.body?{body:JSON.stringify(options.body)}:{})});
 let j={};try{j=await r.json()}catch(_){}
 if(!r.ok)throw new Error(j.error||'Não foi possível consultar o servidor ('+r.status+').');
 return j;
}
function itemNames(x){const items=A(x.itemDetails).filter(v=>S(v.name));return items.length?items.map(i=>S(i.quantity||1)+' × '+S(i.name)).join(', '):S(x.itemNames||'Produtos na sacola');}
function message(x){
 const first=S(x.name).trim().split(/\s+/)[0]||'';
 const greet=first?'Olá, '+first+'!':'Olá!';
 const names=itemNames(x);
 return greet+' 💚\n\nAqui é da equipe do *Caseirinho Massas Artesanais*! 🍝\n\n'+
  'Vimos que você começou a montar sua sacola com '+names+
  ', mas ainda não concluiu o pedido. Ficou alguma dúvida ou podemos ajudar com a entrega ou retirada?\n\n'+
  'Sua sacola pode ser retomada por aqui:\n'+STORE+
  '\n\nSerá um prazer atender você! 💚\n\nSe não quiser receber mensagens como esta, responda PARAR.';
}
function note(text,error){const x=E('crNotice');if(!x)return;x.textContent=text;x.hidden=!text;x.style.color=error?'#a21d39':'';}
function setCount(){
 const n=N(data.pendingCount),badge=E('cartRecoveryBadge'),header=E('crCountText');
 if(badge){badge.textContent=n>99?'99+':String(n);badge.hidden=!n;}
 if(header)header.textContent=n?'🛒 '+n+' sacola'+(n!==1?'s':'')+' sem conclusão':'Nenhuma sacola pendente';
 if(E('crPending'))E('crPending').textContent=n;
 if(E('crContactable'))E('crContactable').textContent=N(data.contactableCount);
 if(E('crContacted'))E('crContacted').textContent=N(data.contactedCount);
 if(E('crThreshold'))E('crThreshold').textContent=N(data.thresholdMinutes);
}
function browserNotify(carts){
 if(!('Notification' in window)||Notification.permission!=='granted'||!carts.length)return;
 const x=carts[0];
 try{new Notification('🛒 Sacola para recuperar • Caseirinho',{body:(x.name?x.name+' • ':'')+itemNames(x).slice(0,150),tag:'caseirinho-carrinho-'+x.sessionId})}catch(_){}
}
function updateNotifications(){
 const current=new Set(A(data.carts).filter(c=>c.status==='PENDING'&&c.contactEligible).map(c=>c.sessionId));
 if(loaded){
  const newOnes=A(data.carts).filter(c=>c.status==='PENDING'&&c.contactEligible&&!previousContactable.has(c.sessionId));
  if(newOnes.length)browserNotify(newOnes);
 }
 previousContactable=current;
 loaded=true;
}
function card(c){
 const eligible=c.contactEligible===true&&/^[1-9][0-9]{9,10}$/.test(S(c.phone));
 const status=c.status==='CONTACTED'?'💚 Contatado':c.status==='DISMISSED'?'Arquivado':'🛒 Não finalizou';
 const who=eligible?(c.name||'Cliente identificado'):'Cliente não identificado para contato';
 const phone=eligible?c.phone:'WhatsApp não autorizado / não identificado';
 const items=A(c.itemDetails);
 const lines=items.length?items.map(x=>'<li>'+esc(x.quantity||1)+' × '+esc(x.name)+'</li>').join(''):'<li>'+esc(c.itemNames||'Produtos na sacola')+'</li>';
 const url=eligible?'https://wa.me/55'+c.phone+'?text='+encodeURIComponent(message(c)):'';
 const disabled=!eligible?' title="O WhatsApp só é liberado para clientes identificados com consentimento de contato."':'';
 return '<article class="cr-card">'+
  '<div class="cr-card-head"><strong>👤 '+esc(who)+'</strong><span class="cr-tag '+esc(c.status.toLowerCase())+'">'+status+'</span></div>'+
  '<div class="cr-meta"><span>📱 '+esc(phone)+'</span><span>🕐 Adicionado: '+esc(datetime(c.firstAddedAt))+'</span><span>✏️ Última atividade: '+esc(datetime(c.lastActivityAt))+'</span><span>⏳ Há '+esc(c.inactiveMinutes)+' minutos</span></div>'+
  '<div class="cr-products"><b>Produtos na sacola</b><ul>'+lines+'</ul><b>Valor estimado: '+esc(brl(c.total))+'</b></div>'+
  '<div class="cr-actions">'+
  (eligible?'<a class="btn primary" target="_blank" rel="noopener noreferrer" href="'+esc(url)+'">💬 Abrir WhatsApp</a>'+
  '<button type="button" class="btn" data-cr="copy" data-id="'+esc(c.sessionId)+'">📋 Copiar mensagem</button>'
  :'<span class="cr-muted"'+disabled+'>🔒 Sem autorização para contato direto</span>')+
  (c.status==='PENDING'?'<button type="button" class="btn" data-cr="contacted" data-id="'+esc(c.sessionId)+'" '+(eligible?'':'disabled')+'>✅ Marcar como contatado</button>'+
  '<button type="button" class="btn" data-cr="dismiss" data-id="'+esc(c.sessionId)+'">Arquivar</button>':'')+
  '</div></article>';
}
function render(){
 setCount();
 const list=E('crList');if(!list)return;
 if(!token()){list.innerHTML='<div class="notice">Entre com seu usuário do ERP para consultar as sacolas.</div>';return}
 const filtered=A(data.carts).filter(c=>(filter==='ALL'||c.status===filter)&&
 (!term||[c.name,c.phone,c.itemNames,itemNames(c)].join(' ').toLowerCase().includes(term)));
 list.innerHTML=filtered.length?filtered.map(card).join(''):
 '<div class="notice">Nenhuma sacola encontrada para este filtro. O cliente precisa adicionar produtos e ficar sem concluir por pelo menos '+esc(data.thresholdMinutes)+' minutos.</div>';
}
async function load(silent=false){
 if(loading||!token())return;
 loading=true;
 try{
  const j=await call('/cart-recovery');
  data=j;note('');
  updateNotifications();
  render();
  const t=E('crUpdatedAt');if(t)t.textContent='Consulta atualizada em '+datetime(new Date().toISOString());
 }catch(e){if(!silent)note(e.message,true)}
 finally{loading=false}
}
async function setStatus(c,action){
 if(!c||!token())return;
 if(action==='CONTACTED'&&(!c.contactEligible||!window.confirm('Marcar esta sacola como contatada? Faça isso somente depois de enviar a mensagem no WhatsApp.')))return;
 if(action==='DISMISSED'&&!window.confirm('Arquivar esta sacola sem enviar mensagem?'))return;
 try{await call('/cart-recovery/'+encodeURIComponent(c.sessionId)+'/status',{method:'POST',body:{action}});await load();}catch(e){note(e.message,true)}
}
function wire(){
 const btn=E('crRefresh');btn?.addEventListener('click',()=>load());
 E('crFilter')?.addEventListener('change',e=>{filter=S(e.target.value)||'PENDING';render()});
 E('crSearch')?.addEventListener('input',e=>{term=S(e.target.value).toLowerCase().trim();render()});
 E('crNotify')?.addEventListener('click',async()=>{
  if(!('Notification' in window)){note('Este navegador não permite notificações na Central.',true);return}
  const p=await Notification.requestPermission();
  note(p==='granted'?'Avisos habilitados enquanto esta página estiver aberta.':'As notificações não foram autorizadas.',p!=='granted');
 });
 E('crList')?.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-cr]');if(!btn)return;
  const c=A(data.carts).find(c=>c.sessionId===btn.dataset.id);if(!c)return;
  if(btn.dataset.cr==='contacted')await setStatus(c,'CONTACTED');
  if(btn.dataset.cr==='dismiss')await setStatus(c,'DISMISSED');
  if(btn.dataset.cr==='copy'&&c.contactEligible){
   try{await navigator.clipboard.writeText(message(c));note('Mensagem copiada. Confira o WhatsApp antes de enviar.')}catch(_){note('Não foi possível copiar automaticamente.',true)}
  }
 });
 document.querySelectorAll('[data-view="carts"]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>load(true),130)));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)load(true)});
 setInterval(()=>{if(!document.hidden&&token())load(true)},60000);
 setTimeout(()=>load(true),1800);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
window.CaseirinhoCartRecovery={load};
})();