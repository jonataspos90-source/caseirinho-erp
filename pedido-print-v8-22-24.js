(function(){
'use strict';
if(window.__JOHN_PEDIDO_PRINT_82224__)return;
window.__JOHN_PEDIDO_PRINT_82224__=true;

const VERSION='8.22.24';
const INBOX_KEY='john_ecommerce_cloud_inbox_v1';
const PREF_KEY='john_pedido_print_format_v82224';
const S=v=>String(v??'');
const N=v=>Number(v)||0;
const A=v=>Array.isArray(v)?v:[];
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>N(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/[\s-]+/g,'_');

function readJson(key,fallback){try{const x=JSON.parse(localStorage.getItem(key)||'null');return x??fallback}catch(_){return fallback}}
function inbox(){return A(readJson(INBOX_KEY,[]))}
function toast(m){try{if(typeof window.toast==='function')return window.toast(m)}catch(_){}alert(m)}
function itemName(i){return S(i?.nome||i?.produtoNome||i?.descricao||i?.produto?.nome||i?.produtoId||'Produto')}
function dateTime(v){if(!v)return'-';try{return new Date(v).toLocaleString('pt-BR')}catch(_){return S(v)}}
function stateLabel(o){const s=norm(o?.status||o?.payload?.status||'');const map={NOVO:'Novo',PENDENTE:'Pendente',COTACAO_PENDENTE:'Frete a cotar',AGUARDANDO_COTACAO_FRETE:'Frete a cotar',AGUARDANDO_CLIENTE_FRETE:'Aguardando cliente',AGUARDANDO_ACEITE_ERP:'Aguardando aceite',ACEITO:'Aceito',IMPORTADO:'Importado',EM_PRODUCAO:'Em produção',PRONTO:'Pronto',ENTREGUE:'Entregue',RETIRADO:'Retirado',REJEITADO:'Rejeitado',CANCELADO:'Cancelado'};return map[s]||S(o?.status||'-').replaceAll('_',' ')}
function addressText(o){if(norm(o?.modalidade)!=='ENTREGA')return'Retirada na loja';const e=o?.entrega||{};return [e.logradouro,e.numero,e.complemento,e.bairro,e.cidade,e.uf,e.cep].filter(Boolean).join(', ')||'Endereço não informado'}
function findOrder(id){return inbox().find(o=>S(o?.id)===S(id)||S(o?.codigo)===S(id)||S(o?.code)===S(id))||null}
function findOrderByCode(code){const c=S(code).trim();return inbox().find(o=>S(o?.codigo||o?.code||o?.id).trim()===c)||null}
function qtyText(v){const n=N(v);return Number.isInteger(n)?String(n):String(n).replace('.',',')}
function itemRows(o,thermal){
 const its=A(o?.itens);
 if(!its.length)return thermal?'<div class="empty">Itens não disponíveis após a sincronização.</div>':'<tr><td colspan="4">Itens não disponíveis após a sincronização.</td></tr>';
 if(thermal)return its.map(i=>{const q=N(i?.quantidade)||1,u=N(i?.precoUnitario??i?.preco??i?.valorUnitario),t=N(i?.total)||(q*u),additional=i?.adicionalPromocional||i?.tipo==='ADICIONAL_PROMOCIONAL';return `<div class="item ${additional?'addon':''}"><div class="item-name"><span class="qty">${esc(qtyText(q))}x</span> ${esc(itemName(i))}</div><div class="item-calc">${money(u)} cada <b>${money(t)}</b></div></div>`}).join('');
 return its.map(i=>{const q=N(i?.quantidade)||1,u=N(i?.precoUnitario??i?.preco??i?.valorUnitario),t=N(i?.total)||(q*u);return `<tr><td>${esc(itemName(i))}</td><td class="center">${esc(qtyText(q))}</td><td class="right">${money(u)}</td><td class="right"><b>${money(t)}</b></td></tr>`}).join('');
}
function totalsHtml(o,thermal){const subtotal=N(o?.subtotal),frete=N(o?.valorFrete),total=N(o?.total)||(subtotal+frete);if(thermal)return `<div class="sep"></div><div class="sum"><span>Subtotal</span><b>${money(subtotal)}</b></div>${frete>0?`<div class="sum"><span>Entrega</span><b>${money(frete)}</b></div>`:''}<div class="grand"><span>TOTAL</span><b>${money(total)}</b></div>`;return `<div class="totals"><div><span>Subtotal</span><b>${money(subtotal)}</b></div>${frete>0?`<div><span>Entrega</span><b>${money(frete)}</b></div>`:''}<div class="grand"><span>Total</span><b>${money(total)}</b></div></div>`}
function buildHtml(o,format){
 const thermal=format==='58';
 const code=S(o?.codigo||o?.code||o?.id||'-');
 const created=o?.criadoEm||o?.createdAt||o?.created_at||o?.savedAt;
 const customer=o?.cliente||{};
 const obs=S(o?.observacao||o?.obs).trim();
 const payment=S(o?.formaPagamento||o?.pagamento||'-');
 const attendance=S(o?.dataAtendimento||'-');
 const time=S(o?.horarioEntrega||o?.horario||'').trim()||'A combinar';
 const common=`<div class="brand">CASEIRINHO</div><h1>PEDIDO ${esc(code)}</h1><div class="issued">Impresso em ${esc(new Date().toLocaleString('pt-BR'))}</div>`;
 const customerHtml=`<section><h2>CLIENTE</h2><div><b>${esc(customer.nome||'-')}</b></div><div>WhatsApp: <b>${esc(customer.telefone||'-')}</b></div>${customer.email?`<div>E-mail: ${esc(customer.email)}</div>`:''}</section>`;
 const serviceHtml=`<section><h2>${norm(o?.modalidade)==='ENTREGA'?'ENTREGA':'RETIRADA'}</h2><div>${esc(addressText(o))}</div><div class="service"><span>Data: <b>${esc(attendance)}</b></span><span>Horário: <b>${esc(time)}</b></span></div></section>`;
 const metaHtml=`<section><h2>INFORMAÇÕES</h2><div>Recebido: ${esc(dateTime(created))}</div><div>Pagamento: <b>${esc(payment)}</b></div><div>Status: <b>${esc(stateLabel(o))}</b></div></section>`;
 const notes=obs?`<section class="notes"><h2>OBSERVAÇÃO</h2><div>${esc(obs).replace(/\n/g,'<br>')}</div></section>`:'';
 const style=thermal?`
 @page{size:58mm auto;margin:2mm}
 *{box-sizing:border-box}html,body{margin:0;padding:0;width:54mm;background:#fff;color:#000}body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;line-height:1.30;font-weight:500;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{width:54mm;max-width:54mm}.brand{text-align:center;font-size:11pt;font-weight:900;letter-spacing:.8px}h1{text-align:center;font-size:15pt;line-height:1.15;margin:2mm 0 1mm;border-bottom:1.5px solid #000;padding-bottom:2mm}.issued{text-align:center;font-size:9.5pt;margin-bottom:2mm}section{border-bottom:1px dashed #000;padding:2mm 0}h2{font-size:10.5pt;margin:0 0 1.2mm;letter-spacing:.3px}.service{display:block;margin-top:1mm}.service span{display:block}.items-title{font-size:11pt;font-weight:900;margin:2mm 0 1mm}.item{padding:1.8mm 0;border-bottom:1px dotted #777}.item.addon{padding-left:1.5mm}.item-name{font-size:12pt;font-weight:700;overflow-wrap:anywhere}.qty{font-size:13.5pt;font-weight:900}.item-calc{display:flex;justify-content:space-between;gap:2mm;font-size:10.5pt;margin-top:.8mm}.item-calc b{font-size:11.5pt}.sep{border-top:1.5px solid #000;margin-top:2mm}.sum,.grand{display:flex;justify-content:space-between;gap:2mm;padding-top:1.3mm}.sum{font-size:11pt}.grand{font-size:15pt;font-weight:900;border-top:1px solid #000;margin-top:1.5mm;padding-top:2mm}.notes div{font-size:11.5pt;font-weight:700}.footer{text-align:center;font-size:9.5pt;margin-top:3mm;padding-top:2mm;border-top:1px dashed #000}.empty{padding:2mm 0;font-size:10.5pt}@media print{body{font-size:12pt}.no-print{display:none!important}}
 `:`
 @page{size:A4;margin:11mm 12mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:11.5pt;line-height:1.4}.sheet{max-width:186mm;margin:0 auto}.brand{font-size:12pt;font-weight:900;color:#7b1438;letter-spacing:1px}h1{font-size:20pt;margin:2mm 0 1mm}.issued{color:#64748b;margin-bottom:5mm}section{border:1px solid #d1d5db;border-radius:8px;padding:4mm;margin:3mm 0}h2{font-size:10pt;margin:0 0 2mm;color:#475569;letter-spacing:.5px}.service{display:flex;gap:10mm;margin-top:2mm}table{width:100%;border-collapse:collapse;margin-top:4mm}th,td{border-bottom:1px solid #d1d5db;padding:2.5mm 2mm;text-align:left;vertical-align:top}th{font-size:10pt;background:#f8fafc}.center{text-align:center}.right{text-align:right}.totals{width:72mm;margin:5mm 0 0 auto}.totals>div{display:flex;justify-content:space-between;padding:1.5mm 0}.totals .grand{border-top:2px solid #111827;font-size:16pt;padding-top:2.5mm}.notes div{font-size:12pt;font-weight:600}.footer{text-align:center;color:#64748b;margin-top:8mm;font-size:9pt}@media print{.no-print{display:none!important}}
 `;
 const items=thermal?`<div class="items-title">ITENS DO PEDIDO</div>${itemRows(o,true)}`:`<table><thead><tr><th>Produto</th><th class="center">Qtd.</th><th class="right">Unitário</th><th class="right">Total</th></tr></thead><tbody>${itemRows(o,false)}</tbody></table>`;
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pedido ${esc(code)}</title><style>${style}</style></head><body><main class="sheet">${common}${customerHtml}${serviceHtml}${metaHtml}${items}${totalsHtml(o,thermal)}${notes}<div class="footer">Caseirinho Massas Artesanais<br>Pedido ${esc(code)}</div></main><script>window.addEventListener('load',function(){setTimeout(function(){window.print()},300)});<\/script></body></html>`;
}
function printOrder(order,format){if(!order)return toast('Pedido não localizado para impressão.');format=format==='58'?'58':'A4';try{localStorage.setItem(PREF_KEY,format)}catch(_){}const w=window.open('','_blank','noopener,noreferrer');if(!w)return toast('O navegador bloqueou a janela de impressão. Permita pop-ups e tente novamente.');w.document.open();w.document.write(buildHtml(order,format));w.document.close()}
function printById(id,format){return printOrder(findOrder(id),format)}
function closeChooser(){document.getElementById('johnPrintChooser82224')?.remove()}
function chooser(id){
 const o=findOrder(id);if(!o)return toast('Pedido não localizado para impressão.');
 closeChooser();
 let last='58';try{last=localStorage.getItem(PREF_KEY)||'58'}catch(_){}
 const ov=document.createElement('div');ov.id='johnPrintChooser82224';ov.innerHTML=`<div class="jp-dialog" role="dialog" aria-modal="true"><div class="jp-head"><div><b>🖨 Imprimir pedido</b><small>${esc(o.codigo||o.code||o.id)}</small></div><button type="button" data-close>✕</button></div><p>Escolha o formato da impressora:</p><button type="button" class="jp-option ${last==='58'?'recommended':''}" data-format="58"><strong>58 mm · Térmica / RawBT</strong><span>Letras maiores e legíveis, itens em linhas simples e total destacado.</span>${last==='58'?'<em>Último formato usado</em>':''}</button><button type="button" class="jp-option ${last==='A4'?'recommended':''}" data-format="A4"><strong>A4</strong><span>Pedido completo em folha, com tabela de produtos e dados organizados.</span>${last==='A4'?'<em>Último formato usado</em>':''}</button></div>`;
 document.body.appendChild(ov);
 ov.querySelector('[data-close]').onclick=closeChooser;ov.onclick=e=>{if(e.target===ov)closeChooser()};
 ov.querySelectorAll('[data-format]').forEach(b=>b.onclick=()=>{const f=b.dataset.format;closeChooser();printOrder(o,f)});
}
function ensureCss(){if(document.getElementById('johnPrintStyle82224'))return;const s=document.createElement('style');s.id='johnPrintStyle82224';s.textContent=`#johnPrintChooser82224{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.56);display:flex;align-items:center;justify-content:center;padding:18px}.jp-dialog{width:min(520px,100%);background:#fff;border-radius:18px;padding:18px;box-shadow:0 24px 80px rgba(0,0,0,.3);color:#0f172a}.jp-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.jp-head b{display:block;font-size:20px}.jp-head small{display:block;color:#64748b;margin-top:3px}.jp-head button{border:0;background:#f1f5f9;border-radius:9px;width:36px;height:36px;font-size:18px;cursor:pointer}.jp-dialog>p{color:#475569}.jp-option{display:block;width:100%;text-align:left;border:1px solid #cbd5e1;background:#fff;border-radius:13px;padding:14px;margin-top:10px;cursor:pointer}.jp-option:hover,.jp-option.recommended{border-color:#7b1438;background:#fff7fa}.jp-option strong{display:block;font-size:16px;color:#7b1438}.jp-option span{display:block;margin-top:5px;color:#475569;line-height:1.35}.jp-option em{display:inline-block;margin-top:8px;font-style:normal;font-size:11px;font-weight:800;background:#fce7f3;color:#831843;border-radius:999px;padding:3px 7px}`;document.head.appendChild(s)}
function enhanceButtons(){
 const page=document.getElementById('ecommercePedidosRecebidos');if(!page)return;
 page.querySelectorAll('[data-cx-pdf]').forEach(b=>{b.textContent='🖨 Imprimir';b.title='Imprimir em A4 ou 58 mm / RawBT'});
 const orders=inbox();
 page.querySelectorAll('tbody tr').forEach(tr=>{
   const action=tr.querySelector('.john-ecom-v8-actions');if(!action||action.querySelector('[data-cx-pdf],[data-print-order-82224]'))return;
   const code=S(tr.querySelector('td:nth-child(2) b')?.textContent).trim();if(!code)return;
   const o=orders.find(x=>S(x?.codigo||x?.code||x?.id).trim()===code);if(!o)return;
   const b=document.createElement('button');b.type='button';b.className='btn print';b.dataset.printOrder82224=S(o.id);b.textContent='🖨 Imprimir';b.title='Imprimir em A4 ou 58 mm / RawBT';action.appendChild(b);
 });
}
function installCapture(){document.addEventListener('click',e=>{const b=e.target.closest?.('[data-cx-pdf],[data-print-order-82224]');if(!b)return;const id=S(b.dataset.cxPdf||b.dataset.printOrder82224);if(!id)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();chooser(id)},true)}
function boot(){ensureCss();installCapture();enhanceButtons();const page=document.getElementById('ecommercePedidosRecebidos')||document.body;const ob=new MutationObserver(()=>enhanceButtons());ob.observe(page,{subtree:true,childList:true});window.JohnPedidoPrint82224={version:VERSION,choose:chooser,print:printById,printOrder,buildHtml}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250),{once:true});else setTimeout(boot,250);
})();