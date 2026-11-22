(function(){
'use strict';
const ROOT='https://john-cloud-api-production.up.railway.app/api/v1/admin/store/insights/finance';
const KEY='caseirinho_insights_erp_session_v6';
const E=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=c=>(Number(c||0)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=s=>s?String(s).slice(0,10).split('-').reverse().join('/'):'—';
const today=()=>{const f=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),p=Object.fromEntries(f.map(x=>[x.type,x.value]));return p.year+'-'+p.month+'-'+p.day;};
let assets=[],summary=null,editing=null,loading=false;
function notice(message,error=false){const x=E('finAssetMessage');if(x){x.textContent=message;x.className='notice'+(error?' error':' success');}}
function auth(){try{const x=JSON.parse(sessionStorage.getItem(KEY)||'{}');return Number(x.expiresAt)>Date.now()+10000?x.token:'';}catch(_){return'';}}
async function request(path,method='GET',body){
 const token=auth();if(!token)throw Error('Faça login no ERP antes de gerenciar os ativos.');
 const res=await fetch(ROOT+path,{method,credentials:'omit',cache:'no-store',
 headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Cache-Control':'no-store'},
 body:body?JSON.stringify(body):undefined});
 const d=await res.json().catch(()=>({}));
 if(!res.ok)throw Error(d.error||'Erro HTTP '+res.status);
 return d;
}
const intMoney=id=>Math.round(Number(E(id)?.value||0)*100);
function assetFormReset(){
 editing=null;E('finAssetForm').reset();
 E('finAssetPurchase').value=today();E('finAssetUse').value=today();E('finAssetFirstDue').value=today();
 E('finAssetInstallments').value='1';E('finAssetLife').value='60';E('finAssetResidual').value='0';
 E('finAssetSave').textContent='💾 Cadastrar equipamento';E('finAssetCancel').hidden=true;
 E('finAssetAuto').checked=true;
}
function editAsset(id){
 const a=assets.find(x=>x.id===id);if(!a)return;
 editing=a;
 const values={finAssetName:a.name,finAssetCategory:a.category,finAssetPurchase:a.purchaseDate,
 finAssetUse:a.inServiceDate,finAssetFirstDue:a.firstDueDate,finAssetAmount:(a.amountCents/100).toFixed(2),
 finAssetResidual:(a.residualCents/100).toFixed(2),finAssetLife:a.usefulLifeMonths,
 finAssetInstallments:a.installmentsCount,finAssetSupplier:a.supplier||'',finAssetNotes:a.notes||''};
 for(const [id,val] of Object.entries(values))E(id).value=val;
 E('finAssetAuto').checked=a.autoConfirmMonthly!==false;
 E('finAssetSave').textContent='💾 Atualizar equipamento';E('finAssetCancel').hidden=false;
 E('finAssetForm').scrollIntoView({behavior:'smooth',block:'start'});E('finAssetName').focus();
}
function card(a){
 const settled=(a.installments||[]).filter(x=>x.status==='PAGO');
 const totalPaid=settled.reduce((n,x)=>n+Number(x.amountCents||0),0);
 const open=(a.installments||[]).length-settled.length;
 const lines=(a.installments||[]).map(p=>{
  const paid=p.status==='PAGO',late=!paid&&p.dueDate<today();
  const paymentSource=paid?(p.autoConfirmedBy?' · Auto: '+p.autoConfirmedBy:' · Manual'):(p.manualOverride?' · Revisão manual':'' );
  const btn=paid?'<button type="button" class="btn small" data-asset-unpay="'+esc(a.id)+'" data-n="'+p.number+'">↩ Estornar marcação</button>':
  '<button type="button" class="btn small primary" data-asset-pay="'+esc(a.id)+'" data-n="'+p.number+'">✅ Confirmar pagamento</button>';
  return '<tr><td>'+p.number+'/'+a.installmentsCount+'</td><td>'+date(p.dueDate)+'</td><td>'+brl(p.amountCents)+'</td><td><span class="badge '+(paid?'good':late?'warn':'light')+'">'+(paid?'Confirmado '+date(p.paidAt)+paymentSource:late?'Vencido'+paymentSource:'Pendente'+paymentSource)+'</span></td><td>'+
   (paid?'':'<input class="asset-pay-date" type="date" aria-label="Data do pagamento da parcela '+p.number+'" data-asset-date="'+esc(a.id)+'-'+p.number+'" value="'+today()+'">')+btn+'</td></tr>';
 }).join('');
 return '<article class="card asset-record"><div class="section-head"><div><h3>🧰 '+esc(a.name)+'</h3><p>'+esc(a.category)+' · Compra: '+date(a.purchaseDate)+' · Fornecedor: '+esc(a.supplier||'não informado')+'</p></div>'+
 '<div class="toolbar"><button type="button" class="btn small" data-asset-edit="'+esc(a.id)+'">✏️ Editar</button> '+
 '<button type="button" class="btn small danger" data-asset-remove="'+esc(a.id)+'">🗑️ Excluir</button></div></div>'+
 '<div class="asset-record-figures"><span><small>Valor do bem</small><strong>'+brl(a.amountCents)+'</strong></span>'+
 '<span><small>Parcelas pagas</small><strong>'+brl(totalPaid)+'</strong></span>'+
 '<span><small>Saldo a pagar</small><strong>'+brl(a.amountCents-totalPaid)+'</strong></span>'+
 '<span><small>Em aberto</small><strong>'+open+' de '+a.installmentsCount+'</strong></span></div>'+
 '<details><summary>Ver parcelas e vencimentos</summary><div class="table-wrap"><table class="table"><thead><tr><th>Parcela</th><th>Vencimento</th><th>Valor</th><th>Situação</th><th>Ação</th></tr></thead><tbody>'+lines+'</tbody></table></div></details>'+
 '<small class="asset-depreciation-note">Confirmação automática mensal: '+(a.autoConfirmMonthly===false?'desativada':'ativa pelo login Jonatas')+' · Depreciação estimada: somente informativa (não descontada das parcelas) · Vida útil: '+a.usefulLifeMonths+' meses</small></article>';
}
function render(){
 if(!E('finAssetsList'))return;
 const x=summary||{},month=E('finMonth')?.value||'';
 E('finAssetsSummary').innerHTML=[
  ['🧰','Ativos cadastrados',String(assets.length),'Bens permanentes'],
  ['💳','Parcelas da competência '+month,brl(x.installmentDueCents),'Dedução mensal do resultado gerencial, mesmo pendente'],
  ['✅','Confirmadas na competência',brl(x.confirmedCompetenceCents),'Confirmações gerenciais, automáticas ou manuais'],
  ['🕓','Abertas na competência',brl(x.pendingCompetenceCents),'Ainda não confirmadas'],
  ['💰','Pagamentos registrados no mês',brl(x.paidCents),'Não significa conciliação bancária'],
  ['⏳','Saldo de todas as parcelas',brl(x.outstandingCents),'Ainda não quitadas'],
  ['📉','Depreciação estimada',brl(x.depreciationCents),'Somente informação; não descontada de novo']
 ].map(([ico,label,value,detail])=>'<div class="stat"><span class="icon">'+ico+'</span><strong>'+esc(label)+'</strong><div class="n">'+esc(value)+'</div><small>'+esc(detail)+'</small></div>').join('');
 const term=E('finAssetSearch')?.value?.trim()?.toLowerCase()||'',cat=E('finAssetFilter')?.value||'ALL';
 const filtered=assets.filter(a=>(cat==='ALL'||a.category===cat)&&(!term||(a.name+' '+a.supplier).toLowerCase().includes(term)));
 E('finAssetsList').innerHTML=filtered.length?filtered.map(card).join(''):'<div class="empty">Nenhum equipamento encontrado.</div>';
}
async function load(){
 if(loading)return;
 loading=true;
 try{
  const month=E('finMonth')?.value||today().slice(0,7);
  const reconciliation=await window.CaseirinhoFinance?.reconcile?.();
  const d=await request('/assets?month='+encodeURIComponent(month));
  assets=d.assets||[];summary=d.monthSummary;render();
  notice('✅ Patrimônio e parcelas atualizados para '+month+'.'+(reconciliation?.error?' A confirmação automática não foi executada: '+reconciliation.error:''),!!reconciliation?.error);
 }catch(e){notice('Não foi possível consultar ativos: '+e.message,true);}
 finally{loading=false;}
}
async function save(ev){
 ev.preventDefault();const btn=E('finAssetSave');btn.disabled=true;
 try{
  const body={name:E('finAssetName').value,category:E('finAssetCategory').value,purchaseDate:E('finAssetPurchase').value,
   inServiceDate:E('finAssetUse').value||E('finAssetPurchase').value,firstDueDate:E('finAssetFirstDue').value,
   amountCents:intMoney('finAssetAmount'),residualCents:intMoney('finAssetResidual'),
   usefulLifeMonths:Number(E('finAssetLife').value),installmentsCount:Number(E('finAssetInstallments').value),
   supplier:E('finAssetSupplier').value,notes:E('finAssetNotes').value,autoConfirmMonthly:E('finAssetAuto').checked};
  if(!Number.isSafeInteger(body.amountCents)||body.amountCents<=0)throw Error('Informe o custo do equipamento.');
  if(!confirm((editing?'Alterar':'Cadastrar')+' '+body.name+' por '+brl(body.amountCents)+' em '+body.installmentsCount+' parcela(s)? Cada parcela será deduzida no resultado gerencial da respectiva competência, independentemente do pagamento. A depreciação não será descontada em duplicidade.'))return;
  if(editing)await request('/assets/'+encodeURIComponent(editing.id),'PATCH',{...body,recordVersion:editing.recordVersion});
  else await request('/assets','POST',body);
  assetFormReset();await load();window.CaseirinhoFinance?.load?.();
  notice('✅ Equipamento salvo. As parcelas passam a integrar o resultado gerencial das competências de vencimento.');
 }catch(e){notice('Não foi possível salvar o equipamento: '+e.message,true);}
 finally{btn.disabled=false;}
}
async function pay(id,number,undo){
 const a=assets.find(x=>x.id===id);if(!a)return;
 const p=(a.installments||[]).find(x=>x.number===number);if(!p)return;
 const d=undo?null:document.querySelector('[data-asset-date="'+CSS.escape(id+'-'+number)+'"]')?.value;
 if(!undo&&!d)return notice('Informe uma data de pagamento.',true);
 if(!confirm((undo?'Reabrir':'Confirmar o pagamento da')+' parcela '+number+' de '+a.name+' no valor de '+brl(p.amountCents)+'?'))return;
 try{await request('/assets/'+encodeURIComponent(id)+'/installments/'+number,'PATCH',{recordVersion:a.recordVersion,paidAt:d});await load();window.CaseirinhoFinance?.load?.();notice('✅ Parcela atualizada. O desembolso aparece no mês do pagamento.');}
 catch(e){notice('Não foi possível atualizar a parcela: '+e.message,true);}
}
async function remove(id){
 const a=assets.find(x=>x.id===id);if(!a)return;
 if(!confirm('Excluir o cadastro '+a.name+'? Somente equipamentos sem parcelas pagas podem ser apagados.'))return;
 try{await request('/assets/'+encodeURIComponent(id),'DELETE',{recordVersion:a.recordVersion});await load();window.CaseirinhoFinance?.load?.();notice('Cadastro excluído.');}
 catch(e){notice('Não foi possível excluir o equipamento: '+e.message,true);}
}
function bind(){
 if(!E('finAssetForm'))return;
 assetFormReset();E('finAssetForm').addEventListener('submit',save);
 E('finAssetCancel').addEventListener('click',assetFormReset);
 E('finAssetSearch').addEventListener('input',render);
 E('finAssetFilter').addEventListener('change',render);
 E('finAssetRefresh').addEventListener('click',load);
 document.addEventListener('click',e=>{
  const b=e.target.closest('[data-asset-edit],[data-asset-remove],[data-asset-pay],[data-asset-unpay]');
  if(!b)return;
  if(b.dataset.assetEdit)return editAsset(b.dataset.assetEdit);
  if(b.dataset.assetRemove)return remove(b.dataset.assetRemove);
  if(b.dataset.assetPay)return pay(b.dataset.assetPay,Number(b.dataset.n),false);
  if(b.dataset.assetUnpay)return pay(b.dataset.assetUnpay,Number(b.dataset.n),true);
 });
}
window.CaseirinhoAssetRegistry={load};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();