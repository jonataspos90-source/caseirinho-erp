(function(){'use strict';
if(window.__JOHN_COMMERCE_ENGAGEMENT_82244__)return;
window.__JOHN_COMMERCE_ENGAGEMENT_82244__=true;

const S=v=>String(v??'');
const N=v=>Number(v)||0;
const A=v=>Array.isArray(v)?v:[];
const E=id=>document.getElementById(id);
const esc=v=>S(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>N(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let cache=null,loading=false,lastLoad=0;

function cloudCfg(){let c={};try{c=JSON.parse(localStorage.getItem('john_cloud_config_v1')||'{}')||{}}catch(_){}return{api:S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),token:S(c.apiKey||c.token||'')}}
function actor(){try{return S(window.usuarioAtual?.()?.nome||window.usuarioAtual?.()?.login||'ERP')}catch(_){return'ERP'}}
async function api(path){const c=cloudCfg();if(!c.token)throw new Error('Token do ERP não configurado.');const r=await fetch(c.api+path,{cache:'no-store',headers:{'Authorization':'Bearer '+c.token,'X-ERP-User':actor()}});let j={};try{j=await r.json()}catch(_){}if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j}
function fmtDate(v){if(!v)return'—';try{return new Date(v).toLocaleString('pt-BR')}catch(_){return S(v)}}
function phoneDigits(v){let d=S(v).replace(/\D/g,'');if(d.startsWith('55')&&d.length>11)d=d.slice(2);return d}
function phoneFmt(v){const d=phoneDigits(v);if(d.length===11)return`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;if(d.length===10)return`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;return S(v)||'—'}
function activeTab(){return E('ce822Tabs')?.querySelector('[data-cetab].active')?.dataset?.cetab||''}
function removeBodyLiteral(){try{const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const rm=[];while(w.nextNode()){if(S(w.currentNode.nodeValue).trim()==='${body}')rm.push(w.currentNode)}rm.forEach(n=>n.parentNode?.removeChild(n))}catch(_){}}
function style(){if(E('eng82244Style'))return;const s=document.createElement('style');s.id='eng82244Style';s.textContent=`
.eng44-person b{display:block}.eng44-person small{display:block;color:#64748b;margin-top:2px}.eng44-stars{color:#d97706;font-size:16px;letter-spacing:1px;white-space:nowrap}.eng44-muted{color:#64748b}.eng44-badge{display:inline-block;border-radius:999px;padding:3px 7px;background:#fff7ed;color:#9a3412;font-weight:800;font-size:10px}.eng44-panel{margin-top:12px}.eng44-note{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px;color:#1e40af;margin-bottom:10px}.eng44-wa{white-space:nowrap}
`;document.head.appendChild(s)}
async function fetchSummary(force=false){if(loading)return cache;if(!force&&cache&&Date.now()-lastLoad<10000)return cache;loading=true;try{cache=await api('/api/v1/admin/commerce-engagement/summary');lastLoad=Date.now();return cache}finally{loading=false}}
function customerHtml(x={}){const name=S(x.name).trim()||'Cliente não identificado';const p=S(x.phone).trim(),email=S(x.email).trim();return `<div class="eng44-person"><b>${esc(name)}</b>${p?`<small>📱 ${esc(phoneFmt(p))}</small>`:''}${email?`<small>✉️ ${esc(email)}</small>`:''}${!p&&!email?'<small>Sessão sem identificação informada</small>':''}</div>`}
function bindWhatsapp(root){root?.querySelectorAll('[data-eng44-wa]').forEach(b=>b.onclick=()=>{const d=phoneDigits(b.dataset.eng44Wa);if(!d)return;const msg=S(E('ceAbMsg')?.value||'Olá! Notamos que você deixou alguns itens no carrinho. Posso ajudar a concluir seu pedido?');window.open('https://wa.me/55'+d+'?text='+encodeURIComponent(msg),'_blank')})}
async function renderAbandoned(force=false){
  const body=E('ce822Body');if(!body||activeTab()!=='abandoned')return;
  let data;try{data=await fetchSummary(force)}catch(e){console.warn('[Engagement ERP] abandonados',e);return}
  if(activeTab()!=='abandoned')return;
  const rows=A(data?.abandonedCart?.recent);
  const table=[...body.querySelectorAll('table.ce-table')].find(t=>/QUANDO/i.test(t.textContent)&&/CLIENTE/i.test(t.textContent)&&/ITENS/i.test(t.textContent));
  const tbody=table?.querySelector('tbody');
  if(tbody)tbody.innerHTML=rows.map(x=>`<tr><td>${esc(fmtDate(x.lastActivityAt||x.at))}<br><span class="eng44-badge">há ${Math.max(0,N(x.inactiveMinutes))} min</span></td><td>${customerHtml(x)}</td><td><b>${money(x.total)}</b></td><td>${esc(x.itemNames||((N(x.items)||0)+' item(ns)'))}</td><td>${x.phone?`<button type="button" class="ce-btn ce-soft eng44-wa" data-eng44-wa="${esc(x.phone)}">WhatsApp</button>`:'<span class="eng44-muted">Sem telefone</span>'}</td></tr>`).join('')||'<tr><td colspan="5">Nenhum carrinho atingiu o tempo configurado de abandono.</td></tr>';
  let info=E('eng44AbandonedInfo');if(!info){info=document.createElement('div');info.id='eng44AbandonedInfo';info.className='eng44-note';table?.parentElement?.insertAdjacentElement('beforebegin',info)}
  if(info)info.innerHTML=`<b>${rows.length} carrinho(s) abandonado(s)</b> · o servidor considera abandono após <b>${N(data?.abandonedCart?.thresholdMinutes)||30} min</b> sem atividade. O cliente aparece pelo nome/WhatsApp/e-mail quando esses dados foram informados na Loja.`;
  bindWhatsapp(body);
}
async function renderRatings(force=false){
  const body=E('ce822Body');if(!body||activeTab()!=='ratings')return;
  let data;try{data=await fetchSummary(force)}catch(e){console.warn('[Engagement ERP] avaliações',e);return}
  if(activeTab()!=='ratings')return;
  const r=data?.ratings||{},rows=A(r.recent),kpis=body.querySelectorAll('.ce-kpi b');
  if(kpis[0])kpis[0].textContent=String(N(r.count));
  if(kpis[1])kpis[1].textContent=N(r.average).toFixed(1)+'/5';
  E('eng44RatingsPanel')?.remove();
  const panel=document.createElement('div');panel.id='eng44RatingsPanel';panel.className='ce-panel ce-scroll eng44-panel';
  panel.innerHTML=`<div class="eng44-note"><b>Avaliações da Loja</b> · após a confirmação do pedido o cliente recebe a opção de avaliar a experiência. Aqui ficam nota, cliente, pedido e comentário.</div><table class="ce-table"><thead><tr><th>Data</th><th>Cliente</th><th>Pedido</th><th>Nota</th><th>Comentário</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(fmtDate(x.at))}</td><td>${customerHtml(x)}</td><td>${esc(x.orderId||'—')}</td><td><span class="eng44-stars">${'★'.repeat(Math.max(0,Math.min(5,Math.round(N(x.rating)))))}${'☆'.repeat(5-Math.max(0,Math.min(5,Math.round(N(x.rating)))))}</span><br><b>${N(x.rating).toFixed(1)}/5</b></td><td>${esc(x.comment||'Sem comentário')}</td></tr>`).join('')||'<tr><td colspan="5">Nenhuma avaliação recebida ainda.</td></tr>'}</tbody></table>`;
  body.appendChild(panel);
}
async function refreshActive(force=false){removeBodyLiteral();style();const t=activeTab();if(t==='abandoned')await renderAbandoned(force);else if(t==='ratings')await renderRatings(force)}
function schedule(force=false){setTimeout(()=>refreshActive(force),100);setTimeout(()=>refreshActive(force),500)}

document.addEventListener('click',e=>{const b=e.target?.closest?.('[data-cetab="abandoned"],[data-cetab="ratings"],#ce822Refresh');if(!b)return;schedule(true)},true);
const obs=new MutationObserver(()=>{removeBodyLiteral();const t=activeTab();if((t==='abandoned'||t==='ratings')&&!E('eng44MutationLock'))schedule(false)});obs.observe(document.documentElement,{childList:true,subtree:true});
setInterval(()=>{const t=activeTab();if(t==='abandoned'||t==='ratings')refreshActive(true);removeBodyLiteral()},30000);
[0,400,1200,2500].forEach(ms=>setTimeout(()=>{removeBodyLiteral();refreshActive(false)},ms));
window.JohnCommerceEngagement82244={refresh:()=>refreshActive(true),removeBodyLiteral};
})();
