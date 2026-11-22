(function(){
'use strict';
const ROOT='https://john-cloud-api-production.up.railway.app/api/v1/admin/store/insights/finance';
const KEY='caseirinho_insights_erp_session_v6';
const E=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=c=>(Number(c||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=s=>s?String(s).split('-').reverse().join('/'):'—';
const monthNow=()=>{const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return parts.year+'-'+parts.month;};
let config=null,loading=false;
function status(txt,error=false){E('finRentStatus').textContent=txt;E('finRentStatus').className='notice'+(error?' error':' success');}
function getToken(){try{const s=JSON.parse(sessionStorage.getItem(KEY)||'{}');return Number(s.expiresAt)>Date.now()+10000?s.token:'';}catch(_){return''}}
async function api(path,options={}){
 const token=getToken();if(!token)throw Error('Faça login no ERP para consultar o aluguel.');
 const res=await fetch(ROOT+path,{method:options.method||'GET',cache:'no-store',credentials:'omit',
 headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Cache-Control':'no-store'},
 body:options.body?JSON.stringify(options.body):undefined});
 const body=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(body.error||'Erro HTTP '+res.status);
 return body;
}
function renderSchedule(rows){
 const body=(rows||[]).map(r=>{
  const tag=r.status==='PAGO'?'good':r.status==='PROGRAMADO'?'light':'warn';
  return '<tr><td>'+esc(r.competence)+'</td><td>'+esc(date(r.dueDate))+'</td><td>'+money(r.amountCents)+'</td><td><span class="badge '+tag+'">'+esc(r.status==='PROGRAMADO'?'Programado / futuro':r.status==='PAGO'?'Confirmado':'Em aberto')+'</span></td><td>'+
  (r.status==='PAGO'&&r.autoConfirmedBy?'Automático · '+esc(r.autoConfirmedBy):r.status==='PAGO'?'Manual':r.status==='PROGRAMADO'?'Aguardando competência':'Pendente de confirmação')+'</td></tr>';
 }).join('');
 E('finRentSchedule').innerHTML=rows?.length?'<div class="table-wrap"><table class="table"><thead><tr><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Origem</th></tr></thead><tbody>'+body+'</tbody></table></div>':'<div class="empty">Cadastre o aluguel para visualizar as competências.</div>';
}
async function load(){
 if(loading)return;
 loading=true;
 try{
  const month=E('finMonth')?.value||monthNow();
  const d=await api('/rent?month='+encodeURIComponent(month));config=d.config;
  if(config){
   E('finRentName').value=config.name||'Aluguel';
   E('finRentAmount').value=(Number(config.amountCents||0)/100).toFixed(2);
   E('finRentStart').value=config.startMonth;
   E('finRentDueDay').value=config.dueDay;
   E('finRentSupplier').value=config.supplier||'';
   E('finRentNotes').value=config.notes||'';
   E('finRentAuto').checked=config.autoConfirmMonthly!==false;
  }else if(!E('finRentStart').value){E('finRentStart').value=monthNow();}
  renderSchedule(d.schedule||[]);
  status(config?'✅ Aluguel recorrente configurado. A confirmação automática depende de uma sessão autenticada do usuário Jonatas.':'Informe o valor do aluguel, a primeira competência e o vencimento para configurar a recorrência.');
 }catch(e){status('Falha na consulta de aluguel: '+e.message,true)}
 finally{loading=false}
}
async function save(ev){
 ev.preventDefault();
 const btn=E('finRentSave');btn.disabled=true;
 try{
  const amount=Math.round(Number(E('finRentAmount').value)*100);
  if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Informe o valor do aluguel.');
  const body={name:E('finRentName').value,amountCents:amount,dueDay:Number(E('finRentDueDay').value),
   startMonth:E('finRentStart').value,supplier:E('finRentSupplier').value,
   notes:E('finRentNotes').value,autoConfirmMonthly:E('finRentAuto').checked,
   recordVersion:config?.recordVersion||null};
  if(!confirm('Salvar aluguel mensal de '+money(amount)+' com primeira competência '+body.startMonth+'? A confirmação automática é gerencial e não executa transferências.'))return;
  await api('/rent',{method:'PUT',body});
  const rollover=await api('/monthly/rollover',{method:'POST',body:{}}).catch(e=>({error:e.message}));
  await load();
  window.CaseirinhoFinance?.load?.();
  if(rollover.error)status('Aluguel salvo, mas a confirmação automática não foi executada: '+rollover.error,true);
  else if(rollover.skipped)status('Aluguel salvo. A confirmação automática será realizada quando o login Jonatas acessar a Central.');
  else status('✅ Aluguel salvo e competência atual processada. As competências futuras ficam em aberto.');
 }catch(e){status('Não foi possível salvar o aluguel: '+e.message,true)}
 finally{btn.disabled=false}
}
function bind(){
 if(!E('finRentForm'))return;
 E('finRentStart').value=monthNow();
 E('finRentForm').addEventListener('submit',save);
 E('finRentRefresh').addEventListener('click',load);
}
window.CaseirinhoRent={load};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();