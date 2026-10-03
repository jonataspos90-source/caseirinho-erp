(function(){'use strict';
if(window.__JOHN_CASHBACK_82242__)return;window.__JOHN_CASHBACK_82242__=true;

const S=v=>String(v??'');
const N=v=>Number(v)||0;
const A=v=>Array.isArray(v)?v:[];
const E=id=>document.getElementById(id);
const esc=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
const money=v=>N(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let currentCustomers=[];
let selectedAccount='';
let busy=false;

function cloudCfg(){let c={};try{c=JSON.parse(localStorage.getItem('john_cloud_config_v1')||'{}')||{}}catch(_){}return{api:S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),token:S(c.apiKey||c.token||'')}}
function actor(){try{return S(window.usuarioAtual?.()?.nome||window.usuarioAtual?.()?.login||'ERP')}catch(_){return'ERP'}}
function toast(message){try{if(typeof window.toast==='function')return window.toast(message)}catch(_){}alert(message)}
async function api(path,opt={}){const c=cloudCfg();if(!c.token)throw new Error('Token do ERP não configurado.');const r=await fetch(c.api+path,{...opt,cache:'no-store',headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.token,'X-ERP-User':actor(),...(opt.headers||{})}});let j={};try{j=await r.json()}catch(_){}if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j}
function dateTime(v){if(!v)return'—';try{return new Date(v).toLocaleString('pt-BR')}catch(_){return S(v)}}

function style(){if(E('johnCashback82242Style'))return;const s=document.createElement('style');s.id='johnCashback82242Style';s.textContent=`
#ce822Body .cb42-note{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:11px;color:#166534;line-height:1.45}
#ce822Body .cb42-warn{background:#fff7ed;border-color:#fed7aa;color:#9a3412}
#ce822Body .cb42-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
#ce822Body .cb42-filter{display:grid;grid-template-columns:2fr 1fr auto auto;gap:8px;align-items:end}
#ce822Body .cb42-filter label{font-size:11px;font-weight:800;display:grid;gap:4px}
#ce822Body .cb42-filter input,#ce822Body .cb42-filter select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:8px;background:#fff}
#ce822Body .cb42-config{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;align-items:end}
#ce822Body .cb42-config label{font-size:11px;font-weight:800;display:grid;gap:4px}
#ce822Body .cb42-config input[type=number]{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:8px}
#ce822Body .cb42-check{display:flex!important;gap:7px;align-items:center;min-height:36px}
#ce822Body .cb42-detail{margin-top:12px}
@media(max-width:980px){#ce822Body .cb42-grid{grid-template-columns:repeat(2,1fr)}#ce822Body .cb42-filter,#ce822Body .cb42-config{grid-template-columns:1fr}}
`;document.head.appendChild(s)}

function installTab(){
  style();const tabs=E('ce822Tabs');if(!tabs)return false;
  let btn=tabs.querySelector('[data-cetab="cashback"]');
  if(!btn){
    btn=document.createElement('button');btn.type='button';btn.dataset.cetab='cashback';btn.textContent='Cashback';
    const loyalty=tabs.querySelector('[data-cetab="loyalty"]');
    if(loyalty)loyalty.insertAdjacentElement('afterend',btn);else tabs.appendChild(btn);
  }
  return true;
}
function activateTab(){const tabs=E('ce822Tabs');if(!tabs)return;tabs.querySelectorAll('[data-cetab]').forEach(x=>x.classList.toggle('active',x.dataset.cetab==='cashback'))}

function configHtml(cfg={}){return `<div class="ce-panel"><h3>Configuração do Cashback</h3><div class="cb42-config">
<label class="cb42-check"><input id="cb42Enabled" type="checkbox" ${cfg.enabled?'checked':''}> Cashback ativo na Loja</label>
<label>Percentual gerado (%)<input id="cb42Percent" type="number" min="0" max="100" step="0.01" value="${N(cfg.percentage)}"></label>
<label>Pedido mínimo para gerar<input id="cb42Min" type="number" min="0" step="0.01" value="${N(cfg.minOrderValue)}"></label>
<label>Máximo utilizável da compra (%)<input id="cb42MaxUse" type="number" min="0" max="100" step="0.01" value="${N(cfg.maxRedemptionPercent)||100}"></label>
<label class="cb42-check"><input id="cb42NoFreight" type="checkbox" ${cfg.excludeShipping!==false?'checked':''}> Não gerar cashback sobre frete</label>
<label class="cb42-check"><input id="cb42Partial" type="checkbox" ${cfg.allowPartialRedemption!==false?'checked':''}> Permitir uso parcial</label>
<label>Reserva no checkout (min)<input id="cb42Ttl" type="number" min="1" max="120" step="1" value="${Number(cfg.reservationTtlMinutes)||15}"></label>
<div><button id="cb42Save" class="ce-btn ce-primary">Salvar configuração</button></div>
</div><div class="cb42-note" style="margin-top:12px"><b>Regra financeira:</b> o saldo é crédito exclusivo para compras. Não pode ser sacado, transferido via Pix nem convertido em espécie. O cashback de uma venda somente entra no saldo quando o pedido é concluído, portanto nunca pode pagar a própria compra que o gerou.</div></div>`}
}
function kpisHtml(s={}){return `<div class="cb42-grid">
<div class="ce-kpi"><small>Saldo em aberto</small><b>${money(s.openBalance)}</b></div>
<div class="ce-kpi"><small>Gerado no mês</small><b>${money(s.generatedMonth)}</b></div>
<div class="ce-kpi"><small>Utilizado no mês</small><b>${money(s.usedMonth)}</b></div>
<div class="ce-kpi"><small>Clientes com saldo</small><b>${Number(s.customersWithBalance)||0}</b></div>
<div class="ce-kpi"><small>Parado há +30 dias</small><b>${money(s.staleBalance30d)}</b></div>
</div>`}
function filtersHtml(){return `<div class="ce-panel"><h3>Clientes e saldos</h3><div class="cb42-filter">
<label>Buscar cliente<input id="cb42Search" placeholder="Nome, CPF, CNPJ, telefone ou ID"></label>
<label>Ordenação<select id="cb42Sort"><option value="balance_desc">Maior saldo</option><option value="balance_asc">Menor saldo</option></select></label>
<label class="cb42-check"><input id="cb42Inactive" type="checkbox"> Sem uso há mais de 30 dias</label>
<button id="cb42Filter" class="ce-btn ce-primary">Buscar</button>
</div></div>`}
function customersHtml(rows=[]){return `<div class="ce-panel ce-scroll"><table class="ce-table"><thead><tr><th>Cliente</th><th>CPF/CNPJ</th><th>WhatsApp</th><th>Saldo</th><th>Reservado</th><th>Disponível</th><th>Último uso</th><th>Ação</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${esc(x.name||'Cliente')}</b><br><small>${esc(x.customerId||x.id)}</small></td><td>${esc(x.document||'—')}</td><td>${esc(x.phone||'—')}</td><td>${money(x.balance)}</td><td>${money(x.reserved)}</td><td><b>${money(x.available)}</b></td><td>${dateTime(x.lastUseAt)}</td><td><button class="ce-btn ce-soft" data-cb42-extract="${esc(x.id)}">Extrato</button></td></tr>`).join('')||'<tr><td colspan="8">Nenhum cliente encontrado com os filtros informados.</td></tr>'}</tbody></table></div>`}
function shell(){const body=E('ce822Body');if(!body)return;body.innerHTML='<div class="ce-panel"><b>Carregando Cashback...</b><div class="ce-note" style="margin-top:8px">Consultando regras, saldos e movimentações diretamente no ERP Cloud.</div></div>'}

async function renderCashback(){
  if(busy)return;busy=true;installTab();activateTab();shell();
  try{
    const [cfgR,sumR,custR]=await Promise.all([api('/api/v1/admin/cashback/config'),api('/api/v1/admin/cashback/summary'),api('/api/v1/admin/cashback/customers?sort=balance_desc')]);
    currentCustomers=A(custR.customers);selectedAccount='';
    const body=E('ce822Body');if(!body)return;
    body.innerHTML=kpisHtml(sumR)+configHtml(cfgR.config)+filtersHtml()+customersHtml(currentCustomers)+'<div id="cb42Detail" class="cb42-detail"></div>';
    bind();
  }catch(e){console.error('[Cashback ERP]',e);const body=E('ce822Body');if(body)body.innerHTML=`<div class="ce-panel"><div class="cb42-note cb42-warn"><b>Não foi possível abrir o Cashback.</b><br>${esc(e.message)}</div></div>`}
  finally{busy=false}
}

function bind(){
  E('cb42Save')?.addEventListener('click',saveConfig);
  E('cb42Filter')?.addEventListener('click',loadCustomers);
  E('cb42Search')?.addEventListener('keydown',e=>{if(e.key==='Enter')loadCustomers()});
  E('ce822Body')?.querySelectorAll('[data-cb42-extract]').forEach(b=>b.onclick=()=>loadExtract(b.dataset.cb42Extract));
}
async function saveConfig(){
  const btn=E('cb42Save');if(btn){btn.disabled=true;btn.textContent='Salvando...'}
  try{
    const payload={
      enabled:!!E('cb42Enabled')?.checked,
      percentage:N(E('cb42Percent')?.value),
      minOrderValue:N(E('cb42Min')?.value),
      maxRedemptionPercent:N(E('cb42MaxUse')?.value),
      excludeShipping:!!E('cb42NoFreight')?.checked,
      allowPartialRedemption:!!E('cb42Partial')?.checked,
      reservationTtlMinutes:Math.max(1,Number(E('cb42Ttl')?.value)||15)
    };
    if(payload.percentage<0||payload.percentage>100)throw new Error('Percentual deve ficar entre 0% e 100%.');
    if(payload.maxRedemptionPercent<0||payload.maxRedemptionPercent>100)throw new Error('Limite de uso deve ficar entre 0% e 100%.');
    await api('/api/v1/admin/cashback/config',{method:'PUT',body:JSON.stringify(payload)});
    toast('Configuração de Cashback salva no ERP e disponibilizada para a Loja.');await renderCashback();
  }catch(e){console.error('[Cashback ERP] configuração',e);toast('Falha ao salvar Cashback: '+e.message)}
  finally{if(btn){btn.disabled=false;btn.textContent='Salvar configuração'}}
}
async function loadCustomers(){
  try{
    const q=encodeURIComponent(S(E('cb42Search')?.value).trim()),sort=encodeURIComponent(S(E('cb42Sort')?.value||'balance_desc')),inactive=E('cb42Inactive')?.checked?'&inactiveDays=30':'';
    const r=await api('/api/v1/admin/cashback/customers?sort='+sort+'&q='+q+inactive);currentCustomers=A(r.customers);
    const panels=E('ce822Body')?.querySelectorAll('.ce-panel.ce-scroll');const current=panels?.[0];if(current)current.outerHTML=customersHtml(currentCustomers);
    E('ce822Body')?.querySelectorAll('[data-cb42-extract]').forEach(b=>b.onclick=()=>loadExtract(b.dataset.cb42Extract));
  }catch(e){toast('Falha ao consultar clientes: '+e.message)}
}
async function loadExtract(accountId){
  selectedAccount=accountId;const detail=E('cb42Detail');if(!detail)return;detail.innerHTML='<div class="ce-panel">Carregando extrato...</div>';
  try{
    const [r,c]=await Promise.all([api('/api/v1/admin/cashback/customers/'+encodeURIComponent(accountId)+'/transactions'),Promise.resolve(currentCustomers.find(x=>S(x.id)===S(accountId))||{})]);
    detail.innerHTML=`<div class="ce-panel"><div class="ce-actions" style="justify-content:space-between"><div><h3>Extrato de Cashback</h3><div class="ce-note">${esc(c.name||'Cliente')} · saldo disponível <b>${money(c.available)}</b></div></div><button id="cb42CloseDetail" class="ce-btn ce-soft">Fechar</button></div><div class="ce-scroll"><table class="ce-table"><thead><tr><th>Data</th><th>Tipo</th><th>Pedido</th><th>Valor</th><th>Status</th><th>Descrição</th></tr></thead><tbody>${A(r.transactions).map(t=>`<tr><td>${dateTime(t.created_at)}</td><td>${esc(t.transaction_type)}</td><td>${esc(t.order_id||'—')}</td><td>${['DEBIT','CREDIT_REVERSAL','ADJUSTMENT_DEBIT'].includes(t.transaction_type)?'- ':'+ '}${money(t.amount)}</td><td>${esc(t.status)}</td><td>${esc(t.description||'')}</td></tr>`).join('')||'<tr><td colspan="6">Sem movimentações.</td></tr>'}</tbody></table></div></div>`;
    E('cb42CloseDetail').onclick=()=>{selectedAccount='';detail.innerHTML=''};
  }catch(e){detail.innerHTML=`<div class="ce-panel"><div class="cb42-note cb42-warn">Falha ao carregar extrato: ${esc(e.message)}</div></div>`}
}

function capture(){
  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('[data-cetab="cashback"]');if(!b)return;
    e.preventDefault();e.stopImmediatePropagation();renderCashback();
  },true);
}
function observe(){
  const root=document.body;const o=new MutationObserver(()=>{if(E('ce822Tabs'))installTab()});o.observe(root,{childList:true,subtree:true});
  let tries=0;const timer=setInterval(()=>{tries++;if(installTab()||tries>120)clearInterval(timer)},500);
}

capture();observe();installTab();
window.JohnCashback82242={open:renderCashback,refresh:renderCashback,loadCustomers};
})();