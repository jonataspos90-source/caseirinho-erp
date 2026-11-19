/* Resumo operacional do dia no painel existente: somente leitura. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
let loadedAt=0,busy=false;
function setup(){
 const dash=$('dashboard');if(!dash||$('caseirinhoTodayOps'))return;
 const block=document.createElement('article');block.className='card';block.id='caseirinhoTodayOps';block.style.marginBottom='16px';
 block.innerHTML='<div class="section-head"><div><h2>💚 Caseirinho — Operação do Dia</h2><p>Produtos, encomendas e atividades que merecem atenção. Dados reais consultados na API.</p></div><button class="btn" type="button" id="caseirinhoOpsRefresh">↻ Conferir agora</button></div><div id="caseirinhoOpsStatus" class="notice" role="status">Consultando a situação atual...</div><div id="caseirinhoOpsCards" class="grid stats"></div><div class="toolbar"><button type="button" class="btn primary" id="caseirinhoGoProduction">👩‍🍳 Ver produção e encomendas</button></div>';
 dash.insertBefore(block,dash.children[1]||null);
 $('caseirinhoOpsRefresh').onclick=load;
 $('caseirinhoGoProduction').onclick=()=>{
  document.querySelector('[data-view="sazonais"]')?.click();
  document.querySelector('[data-workspace="production"]')?.click();
 };
}
function card(icon,title,value){return '<article class="stat"><span class="icon">'+icon+'</span><strong>'+title+'</strong><div class="n">'+Number(value||0).toLocaleString('pt-BR')+'</div></article>'}
async function load(){
 setup();if(busy)return;
 const bridge=window.CaseirinhoSeasonMerchBridge;
 if(!bridge?.st?.token){$('caseirinhoOpsStatus').textContent='Entre como administrador para consultar a operação.';return}
 busy=true;const btn=$('caseirinhoOpsRefresh');btn.disabled=true;
 try{
  const r=await bridge.api('seasonal-operation-health');
  if(!r?.ok||!r?.products||!r?.orders)throw Error('Resposta incompleta da operação');
  $('caseirinhoOpsCards').innerHTML=card('🎄','Campanhas abertas',r.campaigns.accepting)+card('🍝','Produtos publicados',r.products.published)+card('⚠️','Produtos pendentes',r.products.pending)+card('💰','Sinais pendentes',r.orders.awaitingDeposit)+card('👩‍🍳','Produção liberada',r.orders.productionReady);
  loadedAt=Date.now();
  const incomplete=Number(r.products.incomplete||0);
  $('caseirinhoOpsStatus').textContent='Atualizado em '+new Date(r.checkedAt).toLocaleString('pt-BR')+(incomplete?' · '+incomplete+' produto(s) ainda precisam de foto ou categoria para publicação.':' · Sem pendências de foto/categoria entre os rascunhos.');
 }catch(e){$('caseirinhoOpsStatus').textContent='Não foi possível atualizar. Nenhum dado foi alterado: '+e.message}
 finally{busy=false;btn.disabled=false}
}
function start(){
 setup();
 document.querySelectorAll('[data-view="dashboard"]').forEach(btn=>btn.addEventListener('click',()=>{if(Date.now()-loadedAt>120000)load()}));
 if(window.CaseirinhoSeasonMerchBridge?.st?.token)load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();