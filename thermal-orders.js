(function () {
'use strict';
if (window.CaseirinhoThermal) return;
const station=document.body?.dataset?.printStation==='caseirinho';
const KEY='caseirinho_thermal_v1', INBOX='john_ecommerce_cloud_inbox_v1';
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch(_){return f}};
const id=o=>String(o.id||o.codigo||o.code||'');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const orders=()=>{const a=station&&remote!==null?remote:read(INBOX,[]);return Array.isArray(a)?a:[]};
const logged=()=>{try{return station||!!(typeof sessao!=='undefined'&&sessao)}catch(_){return false}};
const cancelled=o=>/CANCEL|REJEIT|ENTREGUE|RETIRADO/.test(String(o.status||o.payload?.status||'').toUpperCase());
const created=o=>Date.parse(o.createdAt||o.criadoEm||o.created_at||o.savedAt||'')||0;
const initial=()=>({enabled:false,since:0,seen:{},last:''});
let busy=false, pulling=false, remote=null, lastPoll=0;
async function pullStation(){
 if(!station||pulling||Date.now()-lastPoll<6000)return;
 pulling=true;lastPoll=Date.now();
 const e=document.getElementById('stationConnection');
 try{
 const cfg=read('john_cloud_config_v1',{}),token=cfg.apiKey||cfg.token;
 if(!token)throw Error('Abra e conecte o ERP neste mesmo perfil do Chrome uma vez.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 let response;
 try{response=await fetch(String(cfg.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,'')+'/api/v1/admin/store/orders?status=TODOS&limit=500',{cache:'no-store',headers:{Authorization:'Bearer '+token},signal:controller.signal})}finally{clearTimeout(timeout)}
 if(!response.ok)throw Error(response.status===401||response.status===403?'A conexão expirou. Reconecte a nuvem no ERP.':'Servidor indisponível: '+response.status);
 const data=await response.json();if(!Array.isArray(data.orders))throw Error('Resposta de pedidos inválida.');
 remote=data.orders;
 if(e)e.textContent='Conectado · última consulta '+new Date().toLocaleTimeString('pt-BR')+' · mantenha esta janela aberta ou minimizada.';
 }catch(err){if(e)e.textContent='Sem conexão: '+err.message+' Os pedidos serão consultados novamente quando a conexão voltar.'}finally{pulling=false}
}
function save(s){localStorage.setItem(KEY,JSON.stringify(s))}
function paymentLabel(o){
 const pay=o.mercadoPago||o.payload?.mercadoPago;
 const st=String(pay?.status||o.statusPagamento||o.pagamentoStatus||o.pagamento?.status||'').toUpperCase();
 if(['APROVADO','APPROVED','PAGO','PAID'].includes(st))return 'PAGO';
 if(['ESTORNADO','REFUNDED','CHARGED_BACK'].includes(st))return 'PENDENTE — PAGAMENTO ESTORNADO';
 return 'PENDENTE — NÃO PAGO';
}
function receipt(o){
 o={...(o.payload||{}),...o};
 const c=o.cliente||o.payload?.cliente||{}, e=o.entrega||o.payload?.entrega||{}, its=Array.isArray(o.itens)?o.itens:[];
 const test=o.test||String(c.telefone||'').replace(/\D/g,'').endsWith('989310929');
 return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Separação ${esc(o.codigo||o.code||o.id)}</title><style>@page{size:80mm auto;margin:3mm}*{box-sizing:border-box}body{width:72mm;margin:0;color:#000;background:#fff;font:13px Arial,sans-serif;overflow-wrap:anywhere}h1{font-size:20px;margin:8px 0}h2{font-size:16px;margin:6px 0}.center{text-align:center}.line{border-top:1px dashed #000;margin:9px 0;padding-top:8px}.item{margin:10px 0;font-size:16px}.note{white-space:pre-wrap;font-size:14px}small{font-size:11px}</style><body><div class="center"><b>CASEIRINHO MASSAS ARTESANAIS</b><h1>PEDIDO DO CASEIRINHO</h1><h2>COMANDA DE SEPARAÇÃO</h2>${test?'<h2>*** TESTE ***</h2>':''}</div><h1>Pedido ${esc(o.codigo||o.code||o.id)}</h1><small>${esc(new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}))}</small><h2 class="line">PAGAMENTO: ${esc(paymentLabel(o))}</h2><div class="line"><b>Cliente:</b> ${esc(c.nome||'Não informado')}<br><b>Telefone:</b> ${esc(c.telefone||'-')}<br><b>${esc(o.modalidade||'Modalidade não informada')}</b><br>Data: ${esc(o.dataAtendimento||'-')}<br>Horário: ${esc(o.horarioEntrega||o.horario||'A combinar')}</div><div class="line">${its.map(i=>`<div class="item"><b>${esc(i.quantidade??1)} × ${esc(i.nome||i.produtoNome||i.descricao||i.produto?.nome||'Produto')}</b>${i.observacao||i.obs?`<div class="note">${esc(i.observacao||i.obs)}</div>`:''}</div>`).join('')||'Itens não informados'}</div>${o.observacao||o.obs?`<div class="line note"><b>OBSERVAÇÕES:</b><br>${esc(o.observacao||o.obs)}</div>`:''}${String(o.modalidade).toUpperCase()==='ENTREGA'?`<div class="line"><b>Entrega:</b><br>${esc([e.logradouro||e.rua||e.endereco,e.numero,e.complemento,e.bairro,e.cidade,e.uf,e.cep].filter(Boolean).join(', ')||'Endereço não informado')}${e.referencia||e.pontoReferencia?'<br>Referência: '+esc(e.referencia||e.pontoReferencia):''}</div>`:''}<div class="line">Pagamento: ${esc(typeof o.formaPagamento==='string'?o.formaPagamento:'Consultar pedido')}<br>Status do pedido: ${esc(o.status||'-')}</div><div class="line center">Conferir itens antes de embalar</div></body></html>`;
}
function send(o){return new Promise((resolve,reject)=>{
 const f=document.createElement('iframe');f.title='Comanda térmica';f.style.cssText='position:fixed;left:-10000px;top:0;width:80mm;height:200mm;border:0';
 let timer;const clean=()=>{clearTimeout(timer);f.remove()};
 f.onload=()=>{try{f.contentWindow.addEventListener('afterprint',()=>{clean();resolve()},{once:true});f.contentWindow.focus();f.contentWindow.print();timer=setTimeout(()=>{clean();resolve()},60000)}catch(e){clean();reject(e)}};
 f.srcdoc=receipt(o);document.body.appendChild(f);
})}
function status(m){const e=document.getElementById('ctStatus');if(e)e.textContent=m}
async function exclusive(fn){
 if(!navigator.locks){status('Impressão automática requer Chrome atualizado.');return}
 return navigator.locks.request('caseirinho-thermal-dispatch',{ifAvailable:true},lock=>lock?fn():undefined);
}
async function tick(){
 if(busy||!logged()||(station&&remote===null))return;busy=true;
 try{await exclusive(async()=>{
 const s=read(KEY,initial());if(!s.enabled)return;
 const next=orders().filter(o=>id(o)&&!s.seen[id(o)]&&!cancelled(o)&&created(o)>=s.since).sort((a,b)=>created(a)-created(b))[0];
 if(!next)return;
 // Browser printing cannot confirm physical output. Record before dispatch to
 // prevent reloads / other tabs from automatically duplicating a receipt.
 s.seen[id(next)]='encaminhado';s.last=id(next);save(s);
 status('Comanda encaminhada ao navegador. Confira a saída na POS-80.');
 try{await send(next)}catch(e){s.seen[id(next)]='falha';save(s);status('Falha: '+e.message+'. Use Reimprimir pedido.');s.enabled=false;save(s)}
 })}catch(e){status('Impressão pausada: '+e.message)}finally{busy=false}
}
function dialog(){
 document.getElementById('ctDialog')?.remove();const d=document.createElement('dialog');d.id='ctDialog';
 d.style.cssText='width:min(560px,94vw);border:0;border-radius:16px;padding:24px;font:15px system-ui;color:#172033';
 d.innerHTML=`<h2 style="margin-top:0">Impressão de comandas · POS-80</h2><p>Comanda de separação em papel de 80 mm. Use a impressora <b>POS-80 11.2.0.0 (Copiar 1)</b> como destino no Chrome.</p><ol><li>Primeiro clique em <b>Imprimir teste</b>, selecione a POS-80, papel 80 mm e desative cabeçalhos e rodapés.</li><li>Para sair sem confirmação, feche todas as janelas do Chrome e abra o Monitor pelo atalho de impressão abaixo. O atalho usa o modo de impressão automática do Chrome.</li><li>Volte aqui e ative os novos pedidos neste computador.</li></ol><p>Mantenha o computador ligado e conectado à internet. Com o ERP fechado, mantenha o Monitor de Impressão aberto ou minimizado. A opção vale apenas neste navegador. Use somente um computador para imprimir.</p><p><a href="./terminal-impressao.html" target="_blank" rel="noopener">Abrir Monitor de Impressão (funciona com o ERP fechado)</a></p><p><a href="./Caseirinho-Impressao.cmd" download>Baixar atalho de impressão para Windows</a></p><label><input id="ctEnabled" type="checkbox"> Imprimir automaticamente os novos pedidos do app</label><p id="ctStatus" role="status"></p><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="ctTest">Imprimir teste</button><select id="ctOrder" aria-label="Pedido para reimprimir"></select><button id="ctReprint">Reimprimir pedido</button><button id="ctClose">Fechar</button></div><p style="font-size:12px">Ao ativar, os pedidos já existentes não serão impressos. Cada novo pedido é encaminhado uma vez, inclusive pedidos de teste identificados. O navegador não confirma se saiu papel: se faltar papel ou você cancelar a janela, use Reimprimir. A comanda de separação não confirma pagamento nem aceita o pedido.</p>`;
 document.body.appendChild(d);
 const s=read(KEY,initial());d.querySelector('#ctEnabled').checked=s.enabled;
 status(s.enabled?'Ativado neste navegador. Aguardando novos pedidos.':'Desativado. Faça o teste antes de ativar.');
 const select=d.querySelector('#ctOrder');orders().slice().sort((a,b)=>created(b)-created(a)).slice(0,100).forEach(o=>{const op=document.createElement('option');op.value=id(o);op.textContent=String(o.codigo||o.code||o.id)+' · '+String(o.cliente?.nome||'Cliente');select.appendChild(op)});
 d.querySelector('#ctEnabled').onchange=async ev=>{const checked=ev.target.checked;try{await exclusive(async()=>{const s=read(KEY,initial());s.enabled=checked;if(checked){s.since=Date.now();s.seen={};for(const o of orders())if(id(o))s.seen[id(o)]='anterior'}save(s);status(checked?'Ativado para novos pedidos.':'Desativado.')})}catch(e){ev.target.checked=false;status(e.message)}};
 const manual=async(o,b)=>{if(busy)return status('Aguarde a impressão em andamento.');busy=true;b.disabled=true;try{await exclusive(()=>send(o));status('Teste/comanda encaminhado. Confirme a saída na impressora.')}catch(e){status(e.message)}finally{busy=false;b.disabled=false}};
 d.querySelector('#ctTest').onclick=e=>manual({id:'TESTE',codigo:'TESTE DE IMPRESSÃO',test:true,cliente:{nome:'Teste Caseirinho'},modalidade:'RETIRADA',status:'TESTE — SEM VENDA',itens:[{nome:'Item de teste — não preparar',quantidade:1}],observacao:'Se esta comanda saiu legível, a impressão térmica está funcionando.'},e.target);
 d.querySelector('#ctReprint').onclick=e=>{const o=orders().find(x=>id(x)===select.value);if(o)manual(o,e.target)};
 d.querySelector('#ctClose').onclick=()=>d.close();d.addEventListener('close',()=>d.remove());d.showModal();
}
function mount(){
 const old=document.getElementById('ctLauncher');if(!logged()){old?.remove();document.getElementById('ctDialog')?.remove();return}if(old)return;
 const b=document.createElement('button');b.id='ctLauncher';b.type='button';b.textContent='🖨 Comandas';b.style.cssText='position:fixed;bottom:70px;left:18px;z-index:2147482501;padding:12px 16px;background:#23523c;color:white;border:0;border-radius:16px;font:700 14px system-ui;box-shadow:0 4px 16px #0003';b.onclick=dialog;document.body.appendChild(b);
}
window.CaseirinhoThermal={receipt,paymentLabel,dialog,pullStation};
setInterval(()=>{mount();pullStation();tick()},2000);
if(station){pullStation();document.getElementById('stationSettings').onclick=dialog;}
})();
