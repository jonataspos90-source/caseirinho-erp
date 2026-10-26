(function(){
'use strict';
if(window.__JOHN_MANUAL_PIX_CONFIRMATION_20261026__)return;
window.__JOHN_MANUAL_PIX_CONFIRMATION_20261026__=true;
const INBOX_KEY='john_ecommerce_cloud_inbox_v1';
const CONFIG_KEY='john_cloud_config_v1';
const S=v=>String(v??'');
const N=v=>Number(v)||0;
const A=v=>Array.isArray(v)?v:[];
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
const total=p=>Math.max(0,N(p?.valorTotal??p?.total??(N(p?.subtotal)+N(p?.valorFrete))));
function orders(){try{return A(JSON.parse(localStorage.getItem(INBOX_KEY)||'[]'))}catch(_){return[]}}
function saveOrders(rows){try{localStorage.setItem(INBOX_KEY,JSON.stringify(rows))}catch(_){}}
function cloudConfig(){try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||'{}')}catch(_){return{}}}
function appDb(){try{return typeof db!=='undefined'?db:window.db}catch(_){return window.db||{}}}
async function admin(path,options={}){
  const c=cloudConfig(),base=S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),token=S(c.apiKey||'');
  if(!token)throw new Error('Entre novamente no ERP para confirmar o Pix.');
  const response=await fetch(base+path+(path.includes('?')?'&':'?')+'_manualPix='+Date.now(),{
    cache:'no-store',...options,
    headers:{'Content-Type':'application/json','Cache-Control':'no-cache','Authorization':'Bearer '+token,...(options.headers||{})}
  });
  let body={};try{body=await response.json()}catch(_){}
  if(!response.ok)throw new Error(body.error||('Erro HTTP '+response.status));
  return body;
}
function localOrderFromRow(row){
  const button=row.querySelector('button[onclick*="editarPedido("]');
  const match=S(button?.getAttribute('onclick')).match(/editarPedido\(['"]([^'"]+)/);
  if(!match)return null;
  return A(appDb()?.pedidos).find(p=>S(p.id)===match[1])||null;
}
function cloudOrder(id){return orders().find(o=>S(o.id)===S(id))||null}
function updateBadge(cell,status){
  if(!cell)return;
  let badge=cell.querySelector('[data-manual-pix-state]');
  if(!badge){badge=document.createElement('small');badge.dataset.manualPixState='1';badge.style.cssText='display:block;margin-top:5px;font-weight:800';cell.appendChild(badge)}
  if(status==='CONFIRMADO_MANUALMENTE'){
    badge.textContent='✅ Pix confirmado após conferência';badge.style.color='#166534';
  }else{
    badge.textContent='⚠ Cliente informou Pix · conferir extrato';badge.style.color='#92400e';
  }
}
function decorate(){
  const body=document.getElementById('pedidosTabela');if(!body)return;
  for(const row of body.querySelectorAll('tr')){
    const p=localOrderFromRow(row);if(!p||!p.ecommercePedidoId||norm(p.origem||p.canalVenda)!=='ECOMMERCE')continue;
    const cloud=cloudOrder(p.ecommercePedidoId),payStatus=norm(cloud?.pagamentoPix?.status||p.pagamentoPix?.status);
    if(!['INFORMADO_PELO_CLIENTE','CONFIRMADO_MANUALMENTE'].includes(payStatus))continue;
    const final=['ENTREGUE','RETIRADO'].includes(norm(p.status));if(!final)continue;
    row.dataset.manualPixOrder=p.id;
    const finance=row.cells[10];updateBadge(finance,payStatus);
    const actions=row.querySelector('.pedido-row-actions');if(!actions)continue;
    if(payStatus==='CONFIRMADO_MANUALMENTE')continue;
    if(actions.querySelector('[data-confirm-manual-pix]'))continue;
    const button=document.createElement('button');button.type='button';button.className='btn primary';button.dataset.confirmManualPix=p.id;
    button.textContent='Confirmar Pix';button.title='Confirme somente depois de localizar o crédito no extrato bancário.';
    actions.insertBefore(button,actions.firstChild);
  }
}
async function confirm(button){
  const p=A(appDb()?.pedidos).find(x=>S(x.id)===S(button.dataset.confirmManualPix));
  if(!p||!p.ecommercePedidoId)return;
  const cloud=cloudOrder(p.ecommercePedidoId),status=norm(cloud?.pagamentoPix?.status||p.pagamentoPix?.status);
  if(!['ENTREGUE','RETIRADO'].includes(norm(p.status)))return window.toast?.('A confirmação manual fica disponível em pedidos entregues ou retirados.');
  if(status==='CONFIRMADO_MANUALMENTE')return window.toast?.('Este Pix já foi confirmado.');
  if(status!=='INFORMADO_PELO_CLIENTE')return window.toast?.('O cliente ainda não avisou pelo app que pagou. Atualize os pedidos e tente novamente.');
  const amount=total(p).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  if(!window.confirm(`Confirme somente após conferir o extrato bancário. O crédito de ${amount} do pedido ${p.ecommerceCodigo||cloud.codigo||p.ecommercePedidoId} foi recebido?`))return;
  button.disabled=true;button.textContent='Conferindo...';
  try{
    const target=norm(p.status);
    await admin('/api/v1/admin/store/orders/statuses',{method:'PUT',body:JSON.stringify({pedidos:{[p.ecommercePedidoId]:{status:target}}})});
    const result=await admin('/api/v1/admin/store/orders/'+encodeURIComponent(p.ecommercePedidoId)+'/pix/confirm',{method:'POST',body:JSON.stringify({})});
    const confirmed=result.pix||{...cloud.pagamentoPix,status:'CONFIRMADO_MANUALMENTE',confirmadoEm:result.confirmedAt};
    p.pagamentoPix=confirmed;p.statusPagamento='PAGO';p.pagamentoConfirmado=true;
    p.pagamentoConfirmadoEm=confirmed.confirmadoEm||result.confirmedAt||new Date().toISOString();
    p.pagamentoConfirmadoPor=confirmed.confirmadoPor||'';p.pagamentoIntegral=true;p.valorPagoDireto=total(p);p.restante=0;p.atualizadoEm=new Date().toISOString();
    const rows=orders().map(o=>S(o.id)===S(p.ecommercePedidoId)?{...o,pagamentoPix:confirmed,statusPagamento:'PAGO'}:o);saveOrders(rows);
    window.reconciliarTodos?.();window.save?.();window.renderPedidosNovo?.();
    window.toast?.(`✅ Pix do pedido ${p.ecommerceCodigo||cloud.codigo||p.ecommercePedidoId} confirmado manualmente no ERP.`);
    setTimeout(()=>window.johnEcommerceOrdersController?.refresh?.(true)?.catch?.(()=>{}),100);
  }catch(error){button.disabled=false;button.textContent='Confirmar Pix';window.toast?.('Não foi possível confirmar o Pix: '+(error.message||error))}
}
function install(){
  decorate();
  const base=window.renderPedidosNovo;
  if(typeof base==='function'&&!base.__manualPixConfirm){
    const wrapped=function(){const result=base.apply(this,arguments);setTimeout(decorate,0);return result};
    wrapped.__manualPixConfirm=true;window.renderPedidosNovo=wrapped;
  }
}
document.addEventListener('click',event=>{const b=event.target.closest?.('[data-confirm-manual-pix]');if(!b)return;event.preventDefault();event.stopImmediatePropagation();confirm(b)} ,true);
document.addEventListener('DOMContentLoaded',install,{once:true});
setInterval(install,2500);
window.JohnManualPixConfirmation={version:'2026-10-26',refresh:decorate};
})();
