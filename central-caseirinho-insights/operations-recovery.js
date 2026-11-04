(function(){
 'use strict';
 const API='https://john-cloud-api-production.up.railway.app';
 const SESSION='caseirinho_insights_erp_session_v6';
 const panel=()=>document.getElementById('opsOrderList');
 const feedback=()=>document.getElementById('opsFeedback');
 const getToken=()=>{try{const s=JSON.parse(sessionStorage.getItem(SESSION)||'{}');return Number(s.expiresAt)>Date.now()?s.token||'':'';}catch(_){return ''}};
 function show(message,error){
  const el=feedback();if(!el)return;
  el.className='notice'+(error?' error':' success');
  el.textContent=message;
 }
 async function recover(code,data){
  const token=getToken();if(!token)throw Error('Entre novamente com seu usuário do ERP.');
  const response=await fetch(API+'/api/v1/admin/store/insights/operations-audit/orders/'+encodeURIComponent(code)+'/recover',{
    method:'POST',cache:'no-store',credentials:'omit',
    headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json','Cache-Control':'no-store'},
    body:JSON.stringify(data)
  });
  const payload=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(payload.error||('HTTP '+response.status));
  return payload;
 }
 async function handle(button){
  if(button.disabled)return;
  const code=button.dataset.recoverCode;
  button.disabled=true;show('Verificando se o pedido '+code+' pode ser recuperado…');
  try{
   const preview=await recover(code,{dryRun:true});
   if(!preview.eligibility?.ok){
    show('Pedido '+code+' não elegível: '+(preview.eligibility?.reason||'verificar condições no ERP')+'.',true);
    return;
   }
   if(!confirm('Antes de recuperar '+code+', confira se o pedido já existe no ERP. A ação não cria cobrança e não pode gerar pedido duplicado. Continuar?')){
    show('Recuperação cancelada. Nenhum dado foi alterado.');return;
   }
   const typed=prompt('Digite o código completo do pedido para confirmar a recuperação:', '');
   if(typed!==code){show('Código não confirmado. Nenhum pedido foi alterado.',true);return;}
   const result=await recover(code,{dryRun:false,confirmationCode:code});
   if(result.recovered){show('✅ Pedido '+code+' integrado com o ERP. Confira os itens e o pagamento.');document.getElementById('opsRefresh')?.click();}
   else show('Pedido não foi alterado; confirme o estado no ERP.',true);
  }catch(error){show('Não foi possível recuperar '+code+': '+String(error.message||error),true);}
  finally{button.disabled=false;}
 }
 function decorate(){
  const root=panel();if(!root)return;
  for(const row of root.querySelectorAll('tbody tr')){
   if(row.dataset.recoveryDecorated)continue;
   const cells=row.querySelectorAll('td');if(cells.length<6)continue;
   row.dataset.recoveryDecorated='1';
   if(cells[1].textContent.trim()!=='ACEITO'||cells[2].textContent.trim()!=='IMPORTANDO')continue;
   const code=cells[0].textContent.trim();
   if(!/^[A-Za-z0-9_-]{4,90}$/.test(code))continue;
   const age=Number.parseInt(cells[4].textContent,10);if(!Number.isFinite(age)||age<10)continue;
   const button=document.createElement('button');
   button.type='button';button.className='btn small';button.dataset.recoverCode=code;
   button.textContent='🔎 Recuperar integração';button.style.marginLeft='8px';
   cells[5].append(' ',button);
  }
 }
 function init(){
  const root=panel();if(!root)return;
  new MutationObserver(decorate).observe(root,{childList:true,subtree:true});
  root.addEventListener('click',e=>{const button=e.target.closest('button[data-recover-code]');if(button)handle(button);});
  decorate();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();