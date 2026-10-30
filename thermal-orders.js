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
let audioContext=null;
function isTest(o){return !!(o.test||o.isTest||o.pedidoTeste)||String(o.cliente?.telefone||o.payload?.cliente?.telefone||'').replace(/\D/g,'').endsWith('989310929')}
function dayOf(o){const t=created(o);if(!t)return '';return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t))}
function recoverTodayRows(rows,s,day){
 s.seen=s.seen||{};s.pending=Array.isArray(s.pending)?s.pending:[];
 let count=0;
 for(const o of rows){const k=id(o);if(!k||isTest(o)||dayOf(o)!==day||/CANCEL|REJEIT/.test(String(o.status||o.payload?.status||'').toUpperCase())||['encaminhado','falha'].includes(s.seen[k])||s.pending.includes(k))continue;s.pending.push(k);count++}
 s.enabled=true;if(!s.since)s.since=Date.now();return count;
}
function recoverAuthorizedToday(){
 // Recuperação solicitada pelo proprietário em 23/10/2026. Executa apenas
 // no Monitor, uma vez por navegador, preservando comprovantes já enviados.
 const k='caseirinho_recovery_20261023';
 if(!station||read(k,false))return;
 const s=read(KEY,initial());const count=recoverTodayRows(orders(),s,'2026-10-23');save(s);localStorage.setItem(k,'true');
 const e=document.getElementById('stationRecovery');if(e)e.textContent=count+' pedido(s) real(is) de 23/10 incluído(s) na fila. Pedidos de teste e já encaminhados foram ignorados.';
}
function announce(){
 const s=read(KEY,initial());if(s.sound===false)return;
 try{
 if(audioContext?.state==='running'){const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.connect(gain);gain.connect(audioContext.destination);osc.frequency.value=880;gain.gain.value=0.15;osc.start();osc.stop(audioContext.currentTime+0.2)}
 if(window.speechSynthesis&&window.SpeechSynthesisUtterance){const u=new window.SpeechSynthesisUtterance('Chegou um novo pedido, Caseirinho!');u.lang='pt-BR';u.rate=1.08;u.pitch=1.35;u.volume=1;const voices=window.speechSynthesis.getVoices().filter(v=>/^pt[-_]BR$/i.test(v.lang));const voice=voices.find(v=>/maria|francisca|luciana|female|feminina/i.test(v.name))||voices[0];if(voice)u.voice=voice;window.speechSynthesis.speak(u)}
 }catch(err){status('Aviso sonoro indisponível. Clique em Ativar e testar som.')}
}
async function enableSound(){
 const s=read(KEY,initial());s.sound=true;save(s);
 try{const Audio=window.AudioContext||window.webkitAudioContext;if(Audio){audioContext=audioContext||new Audio();await audioContext.resume()}announce();status('Teste de som solicitado: Chegou um novo pedido, Caseirinho!. Confira o volume do PC.');const e=document.getElementById('stationSoundStatus');if(e)e.textContent='Som ativado nesta sessão. Confira se ouviu a frase.'}catch(err){status('Não foi possível ativar o som: '+err.message)}
}
async function enqueueToday(){
 await exclusive(async()=>{const s=read(KEY,initial());const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const count=recoverTodayRows(orders(),s,day);save(s);status(count+' pedido(s) real(is) de hoje incluído(s) na fila.');});
}
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
 remote=data.orders;recoverAuthorizedToday();
 if(e)e.textContent='Conectado · última consulta '+new Date().toLocaleTimeString('pt-BR')+' · mantenha esta janela aberta ou minimizada.';
 }catch(err){if(e)e.textContent='Sem conexão: '+err.message+' Os pedidos serão consultados novamente quando a conexão voltar.'}finally{pulling=false}
}
function save(s){localStorage.setItem(KEY,JSON.stringify(s))}
function paymentLabel(o){
 const report=String(o.pagamentoPix?.status||o.payload?.pagamentoPix?.status||'').toUpperCase();
 if(report==='INFORMADO_PELO_CLIENTE')return 'PENDENTE — CLIENTE INFORMOU PIX; CONFERIR EXTRATO';
 const pay=o.mercadoPago||o.payload?.mercadoPago;
 const st=String(pay?.status||o.statusPagamento||o.pagamentoStatus||o.pagamento?.status||'').toUpperCase();
 if(['APROVADO','APPROVED','PAGO','PAID'].includes(st))return 'PAGO';
 if(['ESTORNADO','REFUNDED','CHARGED_BACK'].includes(st))return 'PENDENTE — PAGAMENTO ESTORNADO';
 return 'PENDENTE — NÃO PAGO';
}
function thermalAmount(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function thermalRound(v){return Math.round((v+Number.EPSILON)*100)/100}
function thermalMoney(v){return Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function thermalQty(v){const n=thermalAmount(v);return n===null?'1':String(n).replace('.',',')}
function thermalLine(i){
 const q=thermalAmount(i.quantidade??i.qtd)??1;
 const unit=thermalAmount(i.precoUnitario??i.preco_unitario??i.preco??i.valorUnitario);
 const paid=thermalAmount(i.total)??(unit===null?null:thermalRound(q*unit));
 const original=thermalAmount(i.totalOriginal)??(thermalAmount(i.precoUnitarioOriginal)!==null?thermalRound(q*thermalAmount(i.precoUnitarioOriginal)):null);
 const economy=thermalAmount(i.economia);
 const gross=original??(paid!==null&&economy!==null?thermalRound(paid+Math.max(0,economy)):paid);
 return{q,unit:unit??(paid!==null&&q>0?thermalRound(paid/q):null),paid,gross,savings:paid===null?null:Math.max(0,thermalRound((gross??paid)-paid))};
}
function thermalNotes(value){
 return String(value||'')
   .replace(/\[\s*DISPONIBILIDADE A CONFIRMAR[^\]]*\]/gi,'')
   .replace(/\[\s*PRODUTO SOB ENCOMENDA[^\]]*\]/gi,'')
   .split('\n').map(s=>s.trim()).filter(Boolean).join('\n').trim();
}
function receipt(o){
 o={...(o.payload||{}),...o};
 const c=o.cliente||{}, e=o.entrega||{}, its=Array.isArray(o.itens)?o.itens:[],lines=its.map(thermalLine);
 const test=isTest(o), paid=paymentLabel(o)==='PAGO',pix=/PIX/i.test(String(o.formaPagamento||'')),pendingFreight=String(o.freteStatus||'').toUpperCase()==='COTACAO_PENDENTE';
 const forbiddenPayment=/AGUARDANDO_CLIENTE_REVISAO|REVISAO_RECUSADA|SUBSTITUIDO|CANCELADO|REJEITADO/.test(String(o.status||'').toUpperCase());
 const totalOfficial=thermalAmount(o.total??o.valorTotal??o.valores?.total);
 const freight=Math.max(0,thermalAmount(o.valorFrete??o.frete)??0);
 const originals=lines.map(x=>x.gross),priced=originals.length>0&&originals.every(x=>x!==null);
 const originalSum=priced?thermalRound(originals.reduce((a,b)=>a+b,0)):null;
 const gross=thermalAmount(o.subtotalOriginal)??originalSum??thermalAmount(o.subtotal);
 const originalProducts=gross===null?null:Math.max(0,thermalRound(gross));
 const discount=originalProducts===null||totalOfficial===null?null:Math.max(0,thermalRound(originalProducts+freight-totalOfficial));
 const observations=thermalNotes(o.observacao||o.obs);
 const showPrice=v=>v===null?'Conferir valor no ERP':thermalMoney(v);
 const items=its.map((i,n)=>{
   const l=lines[n],name=i.nome||i.produtoNome||i.descricao||i.produto?.nome||'Produto';
   return `<div class="item"><b>${esc(thermalQty(l.q))} × ${esc(name)}</b><div class="detail">Unit.: <b>${esc(showPrice(l.unit))}</b> · Item: <b>${esc(showPrice(l.paid))}</b></div>${l.savings>0?`<div class="detail">Desconto no item: -${esc(thermalMoney(l.savings))}</div>`:''}${i.observacao||i.obs?`<div class="note">${esc(i.observacao||i.obs)}</div>`:''}</div>`;
 }).join('');
 const financial=`<div class="line total"><b>VALORES DO PEDIDO</b>${originalProducts!==null?`<div>Produtos (valor original): <b>${esc(thermalMoney(originalProducts))}</b></div>`:''}${discount>0?`<div>Descontos totais (promoções, cupons e outros): <b>-${esc(thermalMoney(discount))}</b></div>`:''}<div>Frete: <b>${pendingFreight?'A calcular':esc(thermalMoney(freight))}</b></div><div class="charge"><b>${pendingFreight?'TOTAL ATUAL (FRETE PENDENTE)':forbiddenPayment?'VALOR EM REVISÃO — NÃO COBRAR':pix&&!paid?'PIX A COBRAR':pix?'VALOR DO PIX':'TOTAL DO PEDIDO'}: ${esc(showPrice(totalOfficial))}</b></div>${pix?`<div>Chave Pix (CNPJ): <b>69.195.483/0001-23</b></div>`:''}${paid?'<div><b>Pagamento confirmado — não cobrar novamente.</b></div>':pendingFreight||forbiddenPayment?'<div><b>ATENÇÃO: NÃO COBRAR antes da confirmação do valor e da aprovação do pedido.</b></div>':pix?'<div>Pagamento Pix pendente de conferência.</div>':''}</div>`;
 return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Separação ${esc(o.codigo||o.code||o.id)}</title><style>@page{size:80mm auto;margin:3mm}*{box-sizing:border-box}body{width:72mm;margin:0;color:#000;background:#fff;font:13px Arial,sans-serif;overflow-wrap:anywhere}h1{font-size:20px;margin:8px 0}h2{font-size:16px;margin:6px 0}.center{text-align:center}.line{border-top:1px dashed #000;margin:9px 0;padding-top:8px}.item{margin:9px 0;font-size:15px}.detail{font-size:12px;margin-top:3px}.note{white-space:pre-wrap;font-size:13px}.total{font-size:13px}.total div{padding:3px 0}.charge{font-size:17px;border:2px solid #000;padding:7px!important;margin-top:7px}small{font-size:11px}</style><body><div class="center"><b>CASEIRINHO MASSAS ARTESANAIS</b><h1>PEDIDO DO CASEIRINHO</h1><h2>COMANDA DE SEPARAÇÃO</h2>${test?'<h2>*** TESTE ***</h2>':''}</div><h1>Pedido ${esc(o.codigo||o.code||o.id)}</h1><small>${esc(new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}))}</small><h2 class="line">PAGAMENTO: ${esc(paymentLabel(o))}</h2>${String(o.pagamentoPix?.status||'').toUpperCase()==='INFORMADO_PELO_CLIENTE'?'<div class="line"><b>CLIENTE AVISOU QUE PAGOU PIX. CONFERIR NO EXTRATO ANTES DE MARCAR COMO PAGO.</b></div>':''}<div class="line"><b>Cliente:</b> ${esc(c.nome||'Não informado')}<br><b>Telefone:</b> ${esc(c.telefone||'-')}<br><b>${esc(o.modalidade||'Modalidade não informada')}</b><br>Data: ${esc(o.dataAtendimento||'-')}<br>Horário: ${esc(o.horarioEntrega||o.horario||'A combinar')}</div><div class="line">${items||'Itens não informados'}</div>${financial}${observations?`<div class="line note"><b>OBSERVAÇÕES:</b><br>${esc(observations)}</div>`:''}${String(o.modalidade).toUpperCase()==='ENTREGA'?`<div class="line"><b>Entrega:</b><br>${esc([e.logradouro||e.rua||e.endereco,e.numero,e.complemento,e.bairro,e.cidade,e.uf,e.cep].filter(Boolean).join(', ')||'Endereço não informado')}${e.referencia||e.pontoReferencia?'<br>Referência: '+esc(e.referencia||e.pontoReferencia):''}</div>`:''}<div class="line">Pagamento: ${esc(typeof o.formaPagamento==='string'?o.formaPagamento:'Consultar pedido')}<br>Status do pedido: ${esc(o.status||'-')}</div><div class="line center">Conferir itens e valores antes de embalar</div></body></html>`;
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
 const pending=Array.isArray(s.pending)?s.pending:[];
 const next=orders().filter(o=>id(o)&&((pending.includes(id(o))&&!['encaminhado','falha'].includes(s.seen[id(o)]))||(!s.seen[id(o)]&&!cancelled(o)&&created(o)>=s.since))).sort((a,b)=>created(a)-created(b))[0];
 if(!next)return;
 // Browser printing cannot confirm physical output. Record before dispatch to
 // prevent reloads / other tabs from automatically duplicating a receipt.
 s.seen[id(next)]='encaminhado';s.last=id(next);s.pending=pending.filter(k=>k!==id(next));save(s);announce();
 status('Comanda encaminhada ao navegador. Confira a saída na POS-80.');
 try{await send(next)}catch(e){s.seen[id(next)]='falha';save(s);status('Falha: '+e.message+'. Use Reimprimir pedido.');s.enabled=false;save(s)}
 })}catch(e){status('Impressão pausada: '+e.message)}finally{busy=false}
}
function dialog(){
 document.getElementById('ctDialog')?.remove();const d=document.createElement('dialog');d.id='ctDialog';
 d.style.cssText='width:min(560px,94vw);border:0;border-radius:16px;padding:24px;font:15px system-ui;color:#172033';
 d.innerHTML=`<h2 style="margin-top:0">Impressão de comandas · POS-80</h2><p>Comanda de separação em papel de 80 mm. Use a impressora <b>POS-80 11.2.0.0 (Copiar 1)</b> como destino no Chrome.</p><ol><li>Primeiro clique em <b>Imprimir teste</b>, selecione a POS-80, papel 80 mm e desative cabeçalhos e rodapés.</li><li>Para sair sem confirmação, feche todas as janelas do Chrome e abra o Monitor pelo atalho de impressão abaixo. O atalho usa o modo de impressão automática do Chrome.</li><li>Volte aqui e ative os novos pedidos neste computador.</li></ol><p>Mantenha o computador ligado e conectado à internet. Com o ERP fechado, mantenha o Monitor de Impressão aberto ou minimizado. A opção vale apenas neste navegador. Use somente um computador para imprimir.</p><p><a href="./terminal-impressao.html" target="_blank" rel="noopener">Abrir Monitor de Impressão (funciona com o ERP fechado)</a></p><p><a href="./Caseirinho-Impressao.cmd" download>Baixar atalho de impressão para Windows</a></p><label><input id="ctEnabled" type="checkbox"> Imprimir automaticamente os novos pedidos do app</label><p id="ctStatus" role="status"></p><div style="display:flex;gap:8px;flex-wrap:wrap"><button id="ctSound">Ativar e testar som</button><button id="ctToday">Imprimir pedidos de hoje pendentes de envio</button><button id="ctTest">Imprimir teste</button><select id="ctOrder" aria-label="Pedido para reimprimir"></select><button id="ctReprint">Reimprimir pedido</button><button id="ctClose">Fechar</button></div><p style="font-size:12px">Ao ativar, os pedidos já existentes não serão impressos. Cada novo pedido é encaminhado uma vez, inclusive pedidos de teste identificados. O navegador não confirma se saiu papel: se faltar papel ou você cancelar a janela, use Reimprimir. A comanda de separação não confirma pagamento nem aceita o pedido.</p>`;
 document.body.appendChild(d);
 const s=read(KEY,initial());d.querySelector('#ctEnabled').checked=s.enabled;
 status(s.enabled?'Ativado neste navegador. Aguardando novos pedidos.':'Desativado. Faça o teste antes de ativar.');
 const select=d.querySelector('#ctOrder');orders().slice().sort((a,b)=>created(b)-created(a)).slice(0,100).forEach(o=>{const op=document.createElement('option');op.value=id(o);op.textContent=String(o.codigo||o.code||o.id)+' · '+String(o.cliente?.nome||'Cliente');select.appendChild(op)});
 d.querySelector('#ctEnabled').onchange=async ev=>{const checked=ev.target.checked;try{await exclusive(async()=>{const s=read(KEY,initial());s.enabled=checked;if(checked){s.since=Date.now();s.seen={};for(const o of orders())if(id(o))s.seen[id(o)]='anterior'}save(s);status(checked?'Ativado para novos pedidos.':'Desativado.')})}catch(e){ev.target.checked=false;status(e.message)}};
 const manual=async(o,b)=>{if(busy)return status('Aguarde a impressão em andamento.');busy=true;b.disabled=true;try{await exclusive(()=>send(o));status('Teste/comanda encaminhado. Confirme a saída na impressora.')}catch(e){status(e.message)}finally{busy=false;b.disabled=false}};
 d.querySelector('#ctSound').onclick=enableSound;
 d.querySelector('#ctToday').onclick=enqueueToday;
 d.querySelector('#ctTest').onclick=e=>manual({id:'TESTE',codigo:'TESTE DE IMPRESSÃO',test:true,cliente:{nome:'Teste Caseirinho'},modalidade:'RETIRADA',status:'TESTE — SEM VENDA',itens:[{nome:'Item de teste — não preparar',quantidade:1}],observacao:'Se esta comanda saiu legível, a impressão térmica está funcionando.'},e.target);
 d.querySelector('#ctReprint').onclick=e=>{const o=orders().find(x=>id(x)===select.value);if(o)manual(o,e.target)};
 d.querySelector('#ctClose').onclick=()=>d.close();d.addEventListener('close',()=>d.remove());d.showModal();
}
function mount(){
 const old=document.getElementById('ctLauncher');if(!logged()){old?.remove();document.getElementById('ctDialog')?.remove();return}if(old)return;
 const b=document.createElement('button');b.id='ctLauncher';b.type='button';b.textContent='🖨 Comandas';b.style.cssText='position:fixed;bottom:70px;left:18px;z-index:2147482501;padding:12px 16px;background:#23523c;color:white;border:0;border-radius:16px;font:700 14px system-ui;box-shadow:0 4px 16px #0003';b.onclick=dialog;document.body.appendChild(b);
}
window.CaseirinhoThermal={receipt,paymentLabel,dialog,pullStation,isTest,dayOf,recoverTodayRows,enableSound};
setInterval(()=>{mount();pullStation();tick()},2000);
if(station){pullStation();document.getElementById('stationSettings').onclick=dialog;document.getElementById('stationSound')?.addEventListener('click',enableSound);}
})();
