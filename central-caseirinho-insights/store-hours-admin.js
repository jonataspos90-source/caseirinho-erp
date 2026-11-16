/* Central Caseirinho | Dias, turnos e datas especiais de atendimento (São Paulo). */
(function(){
'use strict';
const B=()=>window.CaseirinhoHoursBridge;
const $=id=>document.getElementById(id);
const DAY=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const time=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
let loaded=false,working=false,exceptions=[],version=null;
const s=v=>String(v??'');
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function blankDay(dia){return{dia,ativo:false,periodos:[]}}
function exampleFromLegacy(raw){
 const txt=s(raw).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const hours=[...txt.matchAll(/([01]?\d|2[0-3]):([0-5]\d)/g)].map(m=>m[1].padStart(2,'0')+':'+m[2]);
 if(hours.length<2||hours[0]>=hours[1])return null;
 let included=[];
 if(/seg\s*(?:a|ate|-)\s*sex/.test(txt))included=[1,2,3,4,5];
 else if(/seg\s*(?:a|ate|-)\s*sab/.test(txt))included=[1,2,3,4,5,6];
 else if(/todos os dias|diariamente|seg\s*(?:a|ate|-)\s*dom/.test(txt))included=[0,1,2,3,4,5,6];
 else return null;
 return DAY.map((_,dia)=>({dia,ativo:included.includes(dia),periodos:included.includes(dia)?[{inicio:hours[0],fim:hours[1]}]:[]}));
}
function renderDays(days){
 const data=new Map(days.map(x=>[Number(x.dia),x]));
 $('storeHoursDays').innerHTML=DAY.map((day,dia)=>{
  const row=data.get(dia)||blankDay(dia),turns=row.periodos||[],p=turns[0]||{inicio:'09:00',fim:'18:00'},q=turns[1]||{inicio:'18:30',fim:'20:00'};
  return'<div class="store-hours-day" data-hours-day="'+dia+'">'+
    '<label class="store-hours-toggle"><input type="checkbox" data-hours-active '+(row.ativo?'checked':'')+'><strong>'+day+'</strong><span data-hours-status>'+(row.ativo?'Aberto':'Fechado')+'</span></label>'+
    '<div class="store-hours-periods">'+
     '<div class="store-hours-inputs"><label>Abre <input type="time" data-hours-start value="'+escape(p.inicio)+'"></label><label>Fecha <input type="time" data-hours-end value="'+escape(p.fim)+'"></label></div>'+
     '<label class="store-hours-second-toggle"><input type="checkbox" data-hours-second '+(turns.length>1?'checked':'')+'> Segundo período (ex.: após intervalo)</label>'+
     '<div class="store-hours-inputs store-hours-second" data-hours-second-fields '+(turns.length>1?'':'hidden')+'><label>Reabre <input type="time" data-hours-start2 value="'+escape(q.inicio)+'"></label><label>Fecha <input type="time" data-hours-end2 value="'+escape(q.fim)+'"></label></div>'+
    '</div></div>';
 }).join('');
 $('storeHoursDays').querySelectorAll('[data-hours-day]').forEach(row=>syncDay(row));
}
function syncDay(row){
 const active=row.querySelector('[data-hours-active]').checked,second=row.querySelector('[data-hours-second]').checked;
 row.classList.toggle('is-closed',!active);
 row.querySelector('[data-hours-status]').textContent=active?'Aberto':'Fechado';
 row.querySelector('[data-hours-second-fields]').hidden=!second;
 row.querySelectorAll('.store-hours-periods input').forEach(el=>el.disabled=!active);
}
function renderExceptions(){
 const host=$('storeHoursExceptions');
 host.innerHTML=exceptions.length?exceptions.map((ex,i)=>
  '<article class="store-hours-exception"><div><b>'+escape(ex.data.split('-').reverse().join('/'))+
  '</b><small>'+(ex.ativo?'📅 Expediente especial: '+ex.periodos.map(p=>p.inicio+'–'+p.fim).join(', '):'⛔ Loja fechada nesta data')+
  '</small></div><button type="button" class="btn small" data-hours-remove="'+i+'">Remover</button></article>'
 ).join(''):'<p class="store-hours-muted">Nenhuma data especial cadastrada. Você pode adicionar feriados, pausas ou horários excepcionais.</p>';
}
function readDays(){
 return[...$('storeHoursDays').querySelectorAll('[data-hours-day]')].map(row=>{
  const dia=Number(row.dataset.hoursDay),ativo=row.querySelector('[data-hours-active]').checked;
  const periods=[];
  if(ativo){
   periods.push({inicio:row.querySelector('[data-hours-start]').value,fim:row.querySelector('[data-hours-end]').value});
   if(row.querySelector('[data-hours-second]').checked)
    periods.push({inicio:row.querySelector('[data-hours-start2]').value,fim:row.querySelector('[data-hours-end2]').value});
  }
  return{dia,ativo,periodos:periods};
 });
}
function scheduleFromForm(){
 const dias=readDays();
 if(!dias.some(d=>d.ativo))throw Error('Marque pelo menos um dia com atendimento.');
 const valid=(p,label)=>{
  if(!time.test(p.inicio)||!time.test(p.fim)||p.inicio>=p.fim)throw Error(label+': os horários de abertura e fechamento precisam ser válidos.');
 };
 for(const day of dias){
  if(!day.ativo)continue;
  day.periodos.forEach(p=>valid(p,DAY[day.dia]));
  const p=day.periodos.slice().sort((a,b)=>a.inicio.localeCompare(b.inicio));
  if(p.length===2&&p[1].inicio<p[0].fim)throw Error(DAY[day.dia]+': os períodos de atendimento estão sobrepostos.');
 }
 for(const ex of exceptions){
  (ex.periodos||[]).forEach(p=>valid(p,ex.data));
 }
 return{versao:1,timezone:'America/Sao_Paulo',dias,excecoes:exceptions,mensagemFechado:$('storeHoursMessage').value.trim()};
}
function preview(){
 let days=[],last='';
 try{const schedule=scheduleFromForm();days=schedule.dias.filter(d=>d.ativo);last=days.map(d=>DAY[d.dia]+': '+d.periodos.map(p=>p.inicio+'–'+p.fim).join(' / ')).join(' · ');}
 catch(e){last=e.message}
 $('storeHoursPreview').textContent=last;
}
function statusMessage(data){
 const target=$('storeHoursPublication');
 const state=data.status;
 target.className='notice '+(data.configured?'success':'');
 target.textContent=data.configured?
   '✅ Horários publicados na loja. '+(state?.closed?'Neste momento: FECHADO. Próximo atendimento '+(state.nextOpening||'a confirmar')+'.':'Neste momento: ABERTO para atendimento.')+
   ' O cliente pode continuar enviando pedidos fora do expediente.':
   '⚠️ Horários detalhados ainda não cadastrados nesta Central. Revise a semana abaixo e salve para publicar no app.';
 const previous=$('storeHoursLegacy');
 previous.hidden=!data.legacyHours||data.configured;
 if(data.legacyHours&&!data.configured)previous.textContent='Horário anterior no cadastro do ERP: '+data.legacyHours+'. Use a programação semanal para substituí-lo na loja.';
}
async function load(force=false){
 if(working||!B()?.st?.token||loaded&&!force)return;
 working=true;
 $('storeHoursPublication').textContent='Carregando horário de funcionamento...';
 try{
  const response=await B().api('operating-hours');
  version=response.version;
  const saved=response.horariosSemana||{},days=saved.dias||exampleFromLegacy(response.legacyHours)||DAY.map((_,i)=>blankDay(i));
  renderDays(days);
  exceptions=Array.isArray(saved.excecoes)?saved.excecoes:[];
  renderExceptions();
  $('storeHoursMessage').value=s(saved.mensagemFechado);
  statusMessage(response);
  preview();loaded=true;
 }catch(e){
  $('storeHoursPublication').className='notice error';
  $('storeHoursPublication').textContent='Não foi possível consultar o horário: '+e.message;
 }finally{working=false}
}
async function save(e){
 e.preventDefault();
 if(working)return;
 let schedule;
 try{schedule=scheduleFromForm()}catch(err){B()?.toast?.(err.message,true);return}
 const btn=$('storeHoursSave');
 working=true;btn.disabled=true;btn.textContent='Salvando e publicando...';
 try{
  const result=await B().api('operating-hours',{method:'PUT',body:{horariosSemana:schedule}});
  loaded=true;version=result.version;exceptions=result.horariosSemana.excecoes;
  statusMessage({...result,configured:true,legacyHours:''});
  B().toast('✅ Horário publicado na loja Caseirinho.');
 }catch(err){
  B().toast('Não foi possível salvar: '+err.message,true);
  $('storeHoursPublication').className='notice error';
  $('storeHoursPublication').textContent='❌ A publicação não foi concluída: '+err.message;
 }finally{working=false;btn.disabled=false;btn.textContent='💾 Salvar e publicar na loja'}
}
function addException(){
 const date=$('storeHoursExceptionDate').value,type=$('storeHoursExceptionType').value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)){B().toast('Escolha uma data válida.',true);return}
 const ativo=type==='open';
 const periods=ativo?[{inicio:$('storeHoursExceptionStart').value,fim:$('storeHoursExceptionEnd').value}]:[];
 if(ativo&&(!time.test(periods[0].inicio)||!time.test(periods[0].fim)||periods[0].inicio>=periods[0].fim)){
  B().toast('Revise o horário especial.',true);return;
 }
 const row={data:date,ativo,periodos:periods};
 const idx=exceptions.findIndex(x=>x.data===date);
 if(idx>=0)exceptions[idx]=row;else exceptions.push(row);
 exceptions.sort((a,b)=>a.data.localeCompare(b.data));
 renderExceptions();preview();
 $('storeHoursExceptionDate').value='';
}
function init(){
 if(!$('storeHoursForm'))return;
 $('storeHoursForm').addEventListener('submit',save);
 $('storeHoursReload').addEventListener('click',()=>load(true));
 $('storeHoursDays').addEventListener('change',e=>{
  const row=e.target.closest('[data-hours-day]');
  if(row)syncDay(row);
  preview();
 });
 $('storeHoursDays').addEventListener('input',preview);
 $('storeHoursExceptionType').addEventListener('change',()=>{
  $('storeHoursExceptionTimes').hidden=$('storeHoursExceptionType').value!=='open';
 });
 $('storeHoursAddException').addEventListener('click',addException);
 $('storeHoursExceptions').addEventListener('click',e=>{
  const x=e.target.closest('[data-hours-remove]');
  if(!x)return;
  exceptions.splice(Number(x.dataset.hoursRemove),1);renderExceptions();preview();
 });
 $('storeHoursMessage').addEventListener('input',preview);
 if(B()?.st?.token&&B()?.st?.view==='settings')load();
}
window.CaseirinhoStoreHoursAdmin={load,preview};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
