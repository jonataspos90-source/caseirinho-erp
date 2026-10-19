(function(){
'use strict';
if(window.__CASEIRINHO_MP_82271__)return;
window.__CASEIRINHO_MP_82271__=true;
const E=id=>document.getElementById(id),S=x=>String(x??'');
const esc=x=>S(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const formatMoney=x=>(Number(x)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const statusName=s=>({APROVADO:'✅ Pago',PENDENTE:'🕘 Pendente',RECUSADO:'❌ Recusado',ESTORNADO:'↩️ Estornado',CANCELADO:'Cancelado',NAO_GERADO:'Não gerado'}[S(s)]||S(s);
function api(path){if(typeof window.adminFetch==='function')return window.adminFetch(path);throw Error('Não foi possível autenticar o ERP na API.');}
function page(){
 let el=E('ceMpPage82271');if(el)return el;
 el=document.createElement('section');el.id='ceMpPage82271';el.className='page hidden';
 el.innerHTML='<div class="panel"><div class="panel-head"><h2>💳 Pagamentos Mercado Pago</h2><button type="button" id="ceMpBack82271" class="btn secondary">Voltar</button></div><div class="panel-body"><p>Conciliação do pedido no Caseirinho. Os valores e pagamentos aprovados são verificados exclusivamente no servidor Mercado Pago. A conta pode ser de pessoa física, com credenciais comerciais habilitadas pelo Mercado Pago.</p><div class="actions"><button type="button" id="ceMpReload82271" class="btn primary">Atualizar pagamentos</button></div><p id="ceMpState82271" role="status">Carregando...</p><div class="table-wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Valor</th><th>Situação do pagamento</th></tr></thead><tbody id="ceMpRows82271"></tbody></table></div><p class="subtitle">Pedidos sob encomenda só devem ser cobrados depois da confirmação da loja. Nunca registre pagamento aprovado apenas pelo retorno do navegador.</p></div></div>';
 (document.querySelector('main.main')||document.querySelector('main')||document.body).appendChild(el);
 E('ceMpBack82271').onclick=()=>{el.classList.add('hidden');E('dashboard')?.classList.remove('hidden')};
 E('ceMpReload82271').onclick=load;
 return el;
}
async function load(){
 const label=E('ceMpState82271');if(!label)return;
 label.textContent='Consultando pedidos do servidor...';
 try{
  const [cfg,data]=await Promise.all([
    api('/api/v1/admin/store/mercadopago/status'),
    api('/api/v1/admin/store/orders?status=TODOS&limit=200')
  ]);
  const rows=(Array.isArray(data.orders)?data.orders:[])
    .filter(o=>/MERCADO_PAGO|MERCADO PAGO/i.test(S(o.formaPagamento))||o.mercadoPago);
  E('ceMpRows82271').innerHTML=rows.map(o=>{
   const status=o.mercadoPago?.status||'NAO_GERADO';
   return '<tr><td>'+esc(o.codigo||o.id)+'</td><td>'+esc(o.cliente?.nome||'—')+
    '</td><td>'+formatMoney(o.total)+'</td><td>'+esc(statusName(status))+'</td></tr>';
  }).join('')||'<tr><td colspan="4">Nenhum pedido de cartão online Mercado Pago encontrado.</td></tr>';
  label.textContent=cfg.available?'Integração Mercado Pago ativa · '+rows.length+' pedido(s).':
   'Integração Mercado Pago ainda não habilitada na conta. Adicione as credenciais pelo ambiente seguro do Railway; não as insira nesta tela.';
 }catch(e){label.textContent='Não foi possível consultar o servidor: '+S(e.message||e)}
}
function open(){
 const p=page();document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));
 p.classList.remove('hidden');load();
 window.scrollTo({top:0,behavior:'smooth'});
}
function install(){
 const nav=document.querySelector('.nav .john-module-group[data-module="vendas"] .john-module-items')||
   document.querySelector('.nav .john-module-group[data-module="ecommerce"] .john-module-items');
 if(!nav||E('ceMpOpen82271'))return;
 const b=document.createElement('button');b.id='ceMpOpen82271';b.type='button';b.className='john-special-nav';
 b.dataset.permissionPage='pedidos';b.textContent='💳 Pagamentos Mercado Pago';nav.appendChild(b);
 b.onclick=e=>{e.preventDefault();open()};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
[300,1100,2500].forEach(t=>setTimeout(install,t));
window.addEventListener('john:session-ready',()=>setTimeout(install,120));
window.CaseirinhoMercadoPago82271={open,load};
})();