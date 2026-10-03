(function(){
'use strict';
if(window.__JOHN_ECOM_ORDER_ACTIONS_82233__)return;
window.__JOHN_ECOM_ORDER_ACTIONS_82233__=true;

const VERSION='8.22.44';
const INBOX_KEY='john_ecommerce_cloud_inbox_v1';
const CLOUD_KEY='john_cloud_config_v1';
const acceptingIds=new Set();
const recoveringIds=new Set();
const syncingStatusIds=new Set();
const syncedStatuses=new Map();
const S=v=>String(v??'');
const N=v=>Number(v)||0;
const A=v=>Array.isArray(v)?v:[];
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/[\s-]+/g,'_');
const digits=v=>S(v).replace(/\D/g,'');

function toast(m){try{if(typeof window.toast==='function')return window.toast(m)}catch(_){}alert(m)}
function readLocal(k,f){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??f}catch(_){return f}}
function writeLocal(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){console.error(e);return false}}
function inbox(){return A(readLocal(INBOX_KEY,[]))}
function database(){try{return (typeof db!=='undefined'&&db)||window.db||{}}catch(_){return window.db||{}}}
function orderById(id){return inbox().find(o=>S(o?.id)===S(id)||S(o?.codigo)===S(id)||S(o?.code)===S(id))||null}
function linkedLocal(id){return A(database()?.pedidos).find(p=>S(p?.ecommercePedidoId)===S(id))||null}
function isAddon(i){return !!(i?.adicionalPromocional||norm(i?.tipo)==='ADICIONAL_PROMOCIONAL')}
function isClient(p){if(!p)return false;if(p.ehCliente===true)return true;if(norm(p.tipo)==='CLIENTE')return true;return A(p.tipos).some(x=>norm(x)==='CLIENTE')}
function externalId(o){return S(o?.preCadastroId||o?.pre_cadastro_id||o?.payload?.preCadastroId||o?.payload?.pre_cadastro_id||o?.cliente?.preCadastroId).trim()}
function personExternalId(p){return S(p?.preCadastroId||p?.pre_cadastro_id||p?.ecommercePreCadastroId||p?.cloudPreCadastroId||p?.externalCustomerId).trim()}
function docOf(v){return digits(v?.cpf||v?.cnpj||v?.documento||v?.document)}
function phoneOf(v){const d=digits(v?.telefone||v?.celular||v?.phone);return d?d.slice(-11):''}
function emailOf(v){return S(v?.email).trim().toLowerCase()}
function uniqueMatch(list,predicate){const rows=list.filter(predicate);return rows.length===1?rows[0]:null}
function clientFor(o){
  const clients=A(database()?.pessoas).filter(isClient),ext=externalId(o),oc=o?.cliente||{},doc=docOf(oc),phone=phoneOf(oc),email=emailOf(oc);
  if(ext){const x=uniqueMatch(clients,p=>personExternalId(p)===ext);if(x)return x}
  if(doc){const x=uniqueMatch(clients,p=>docOf(p)===doc);if(x)return x}
  if(phone){const same=clients.filter(p=>phoneOf(p)===phone);if(same.length===1)return same[0];if(same.length>1&&email){const x=uniqueMatch(same,p=>emailOf(p)===email);if(x)return x}}
  if(email){const x=uniqueMatch(clients,p=>emailOf(p)===email);if(x)return x}
  return null;
}
function ensureRecoveryClient(o){
  const found=clientFor(o);if(found)return found;
  const d=database(),oc=o?.cliente||{},name=S(oc?.nome).trim(),phone=phoneOf(oc),email=emailOf(oc),doc=docOf(oc),ext=externalId(o);
  if(!name||(!phone&&!email&&!doc))return null;
  const clients=A(d?.pessoas).filter(isClient);
  if(phone&&clients.some(p=>phoneOf(p)===phone))return null;
  if(doc&&clients.some(p=>docOf(p)===doc))return null;
  if(email&&clients.some(p=>emailOf(p)===email))return null;
  d.pessoas=A(d.pessoas);
  const id=ext?('ecom-client-'+ext):('ecom-client-'+(phone||doc||Date.now().toString(36)));
  const created={id,nome:name,tipo:'CLIENTE',tipos:['CLIENTE'],ehCliente:true,telefone:S(oc?.telefone||''),celular:S(oc?.telefone||''),email:S(oc?.email||''),cpf:S(oc?.cpf||''),preCadastroId:ext,origem:'ECOMMERCE',criadoEm:new Date().toISOString(),atualizadoEm:new Date().toISOString()};
  d.pessoas.push(created);return created;
}
function productFor(i){const d=database();return A(d?.produtos).find(p=>S(p?.id)===S(i?.produtoId)||S(p?.codigo)===S(i?.codigo))||null}
function cloud(){const c=readLocal(CLOUD_KEY,{})||{};return{apiUrl:S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),apiKey:S(c.apiKey||c.token||'')}}
function actor(){try{return typeof usuarioAtual==='function'?(usuarioAtual()?.nome||usuarioAtual()?.login||'ERP'):'ERP'}catch(_){return'ERP'}}
async function admin(path,opt={}){const c=cloud();if(!c.apiKey)throw new Error('Sessão do ERP sem credencial de nuvem. Entre novamente.');const r=await fetch(c.apiUrl+path+(path.includes('?')?'&':'?')+'_v82244='+Date.now(),{cache:'no-store',...opt,headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.apiKey,'X-ERP-User':S(actor()),'Cache-Control':'no-store',...(opt.headers||{})}});let j={};try{j=await r.json()}catch(_){}if(!r.ok)throw new Error(j?.error||('Erro HTTP '+r.status));return j}
function uid(){try{return crypto.randomUUID()}catch(_){return'ecom-'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}}
function persistDb(){try{const d=database();if(typeof __johnLocalStorage!=='undefined'&&typeof DB_KEY!=='undefined'){__johnLocalStorage.setItem(DB_KEY,JSON.stringify(d));return true}localStorage.setItem('pcp_app_v1',JSON.stringify(d));return true}catch(e){console.error('Falha ao persistir pedido aceito:',e);return false}}
function cloudState(o){return norm(o?.status||o?.payload?.status||'')}
function integrationState(o){return norm(o?.statusIntegracao||o?.integration_status||'')}
function localStatusForCloud(o){const st=cloudState(o);if(['ENTREGUE','RETIRADO','CANCELADO','REJEITADO'].includes(st))return st;return'ABERTO'}
function acceptedCloud(o){const st=cloudState(o),integ=integrationState(o);if(['CANCELADO','REJEITADO'].includes(st))return false;return ['ACEITO','ENTREGUE','RETIRADO','CONCLUIDO','FINALIZADO'].includes(st)||['IMPORTANDO','IMPORTADO'].includes(integ)||!!o?.erpPedidoId||!!o?.erpNumero}
function normalizeAcceptedInbox(){const rows=inbox();let changed=false;for(let i=0;i<rows.length;i++){const o=rows[i],st=cloudState(o),integ=integrationState(o);const accepted=st==='ACEITO'||['IMPORTANDO','IMPORTADO'].includes(integ)||!!o?.erpPedidoId||!!o?.erpNumero;if(!accepted||['ENTREGUE','RETIRADO','CONCLUIDO','FINALIZADO'].includes(st))continue;const payload=o?.payload&&typeof o.payload==='object'?{...o.payload,status:'ACEITO',freteDecisaoCliente:''}:o?.payload;rows[i]={...o,status:'ACEITO',freteDecisaoCliente:'',payload};changed=true}if(changed)writeLocal(INBOX_KEY,rows);return changed}
function patchInboxAccepted(id,local,imported=true){const rows=inbox(),idx=rows.findIndex(x=>S(x?.id)===S(id));if(idx<0)return false;const old=rows[idx],payload=old?.payload&&typeof old.payload==='object'?{...old.payload,status:'ACEITO',freteDecisaoCliente:''}:old?.payload;rows[idx]={...old,status:'ACEITO',statusIntegracao:imported?'IMPORTADO':(old.statusIntegracao||'IMPORTANDO'),integration_status:imported?'IMPORTADO':(old.integration_status||'IMPORTANDO'),freteDecisaoCliente:'',payload,erpPedidoId:local?.id||old.erpPedidoId,erpNumero:local?.numero||old.erpNumero,aceitoEm:old.aceitoEm||new Date().toISOString(),updatedAt:new Date().toISOString()};return writeLocal(INBOX_KEY,rows)}
function buildLocalOrder(o,reserved,client){const d=database();d.pedidos=A(d.pedidos);const existing=linkedLocal(o.id);if(existing)return existing;const addons=[],items=[];for(const i of A(o?.itens)){if(isAddon(i)){addons.push({nome:S(i?.nome||i?.produtoNome||i?.descricao||'Adicional'),quantidade:N(i?.quantidade)||1,precoUnitario:Math.max(0,N(i?.precoUnitario??i?.preco??i?.valorUnitario)),total:Math.max(0,N(i?.total))});continue}const p=productFor(i);if(!p)throw new Error(`Produto ${i?.codigo||i?.nome||i?.produtoId||''} não encontrado no ERP.`);const q=N(i?.quantidade);if(!(q>0))throw new Error(`Quantidade inválida em ${i?.nome||p.nome}.`);const price=Math.max(0,N(i?.precoUnitario??i?.preco??i?.valorUnitario));items.push({produtoId:p.id,codigo:p.codigo||i?.codigo||'',nome:p.nome||i?.nome||'',quantidade:q,precoUnitario:price,total:N(i?.total)||(q*price)})}if(!items.length)throw new Error('Pedido sem produto principal válido para importar no ERP.');const subtotal=N(o?.subtotal)||items.reduce((a,x)=>a+N(x.total),0)+addons.reduce((a,x)=>a+N(x.total||x.quantidade*x.precoUnitario),0),modal=norm(o?.modalidade)==='ENTREGA'?'ENTREGA':'RETIRADA',freight=modal==='ENTREGA'?Math.max(0,N(o?.valorFrete)):0,total=N(o?.total)||subtotal+freight,first=items[0],today=new Date().toISOString().slice(0,10),serviceDate=S(o?.dataAtendimento).slice(0,10),now=new Date().toISOString();const nextNumber=A(d.pedidos).reduce((m,x)=>Math.max(m,N(x?.numero)),0)+1;const addonText=addons.length?' · Adicionais: '+addons.map(x=>`${x.quantidade}x ${x.nome}`).join(', '):'';const order={id:S(reserved?.erpPedidoId||o?.erpPedidoId||uid()),numero:N(reserved?.erpNumero||o?.erpNumero)||nextNumber,clienteId:client.id,cliente:client.nome,telefone:client.telefone||client.celular||S(o?.cliente?.telefone||''),itens:items,produtoId:first.produtoId,quantidade:first.quantidade,precoUnitario:first.precoUnitario,dataPedido:S(o?.criadoEm||o?.createdAt).slice(0,10)||today,modalidade:modal,dataRetirada:modal==='RETIRADA'?serviceDate:'',dataEnvio:modal==='ENTREGA'?serviceDate:'',horarioEnvio:S(o?.horarioEntrega||o?.horario||'A combinar'),valorFrete:freight,subtotal,valorTotal:total,sinal:0,formaPagamento:S(o?.formaPagamento)||'A definir',restante:total,status:localStatusForCloud(o),statusEcommerce:cloudState(o)||'ACEITO',obs:`Pedido recebido pelo E-commerce · ${o?.codigo||o?.id}${o?.observacao?' · '+o.observacao:''}${addonText}`,adicionaisEcommerce:addons,origem:'ECOMMERCE',canalVenda:'ECOMMERCE',ecommercePedidoId:o.id,ecommerceCodigo:o.codigo||o.code||'',ecommerceRecebidoEm:o.criadoEm||o.createdAt||now,enderecoEntrega:o.entrega||{},entrega:o.entrega||{},freteStatus:o.freteStatus||'',preCadastroId:externalId(o),criadoEm:now,atualizadoEm:now};d.pedidos.push(order);return order}
function validateBeforeAccept(o){const client=clientFor(o);if(!client)throw new Error('Este cliente ainda não está aprovado/cadastrado no ERP ou há duplicidade nos dados. Revise o cliente antes de aceitar o pedido.');const normals=A(o?.itens).filter(i=>!isAddon(i));if(!normals.length)throw new Error('Pedido sem produto principal.');for(const i of normals){if(!productFor(i))throw new Error(`Produto ${i?.codigo||i?.nome||i?.produtoId||''} não encontrado no ERP.`);if(!(N(i?.quantidade)>0))throw new Error('Pedido possui item com quantidade inválida.')}return client}
function renderNow(){normalizeAcceptedInbox();try{window.johnEcommerceOrdersController?.render?.()}catch(e){console.warn(e)}try{window.renderPedidosNovo?.()}catch(_){} }
function backgroundSync(){setTimeout(()=>{try{window.johnCloudCapturarAlteracoes?.();const p=window.johnCloudFlushIncremental?.(true);if(p&&typeof p.catch==='function')p.catch(()=>{})}catch(_){}},500)}
async function finishImported(id,local){try{await admin('/api/v1/admin/store/orders/'+encodeURIComponent(id)+'/imported',{method:'POST',body:JSON.stringify({erpPedidoId:local.id,erpNumero:local.numero})});return true}catch(e){console.warn('Confirmação imported pendente:',e);setTimeout(()=>admin('/api/v1/admin/store/orders/'+encodeURIComponent(id)+'/imported',{method:'POST',body:JSON.stringify({erpPedidoId:local.id,erpNumero:local.numero})}).catch(()=>{}),5000);return false}}
async function accept(id){id=S(id);if(!id||acceptingIds.has(id))return;const o=orderById(id);if(!o)return toast('Pedido não localizado. Atualize a fila e tente novamente.');let serverAccepted=false,local=null;acceptingIds.add(id);enhanceButtons();try{const client=validateBeforeAccept(o);const reserved=await admin('/api/v1/admin/store/orders/'+encodeURIComponent(id)+'/accept',{method:'POST',body:JSON.stringify({})});serverAccepted=true;local=linkedLocal(id)||buildLocalOrder(o,reserved,client);if(!persistDb())throw new Error('O servidor aceitou o pedido, mas o ERP não conseguiu gravá-lo localmente.');patchInboxAccepted(id,local,false);renderNow();const imported=await finishImported(id,local);patchInboxAccepted(id,local,imported);renderNow();backgroundSync();toast(imported?'Pedido aceito e importado para o ERP.':'Pedido aceito e salvo no ERP. A confirmação na nuvem será tentada novamente automaticamente.');setTimeout(()=>{window.johnEcommerceOrdersController?.refresh?.(true)?.catch?.(()=>{})},700)}catch(e){if(serverAccepted){patchInboxAccepted(id,local,false);renderNow();toast('Pedido já aceito no servidor. Falhou apenas a conclusão no ERP: '+(e?.message||e))}else toast(e?.message||'Não foi possível aceitar o pedido.')}finally{acceptingIds.delete(id);enhanceButtons();renderNow()}}
async function recoverAcceptedOrders(){
  const d=database();d.pedidos=A(d.pedidos);let created=0,personCreated=false;
  for(const o of inbox()){
    const id=S(o?.id);if(!id||!acceptedCloud(o)||linkedLocal(id)||recoveringIds.has(id))continue;
    recoveringIds.add(id);
    try{
      const before=A(d.pessoas).length,client=ensureRecoveryClient(o);personCreated=personCreated||A(d.pessoas).length>before;
      if(!client){console.warn('[John 8.22.44] Pedido aceito sem cliente único para recuperação:',o?.codigo||id);continue}
      const local=buildLocalOrder(o,{erpPedidoId:o?.erpPedidoId,erpNumero:o?.erpNumero},client);created++;
      if(integrationState(o)!=='IMPORTADO')finishImported(id,local).then(ok=>{if(ok)patchInboxAccepted(id,local,true)}).catch(()=>{});
    }catch(e){console.warn('[John 8.22.44] Falha ao recuperar pedido aceito',o?.codigo||id,e)}finally{recoveringIds.delete(id)}
  }
  if(created||personCreated){persistDb();backgroundSync();try{window.renderPedidosNovo?.()}catch(_){};try{window.renderPessoas?.()}catch(_){} }
  return created;
}
async function syncFulfilledLocalOrders(){
  const d=database();
  for(const p of A(d?.pedidos)){
    const cloudId=S(p?.ecommercePedidoId),target=norm(p?.status);if(!cloudId||!['ENTREGUE','RETIRADO'].includes(target))continue;
    const key=cloudId+':'+target;if(syncedStatuses.get(cloudId)===target||syncingStatusIds.has(key))continue;
    syncingStatusIds.add(key);
    try{
      await admin('/api/v1/admin/store/orders/statuses',{method:'PUT',body:JSON.stringify({pedidos:{[cloudId]:{status:target}}})});
      syncedStatuses.set(cloudId,target);p.statusEcommerce=target;p.statusEcommerceSincronizadoEm=new Date().toISOString();persistDb();
      if(target==='ENTREGUE')console.info('[John 8.22.44] Entrega sincronizada; cashback será liberado pela regra central do pedido.',p.ecommerceCodigo||cloudId);
      setTimeout(()=>window.johnEcommerceOrdersController?.refresh?.(false)?.catch?.(()=>{}),250);
    }catch(e){console.warn('[John 8.22.44] Falha ao sincronizar status final',p.ecommerceCodigo||cloudId,e)}finally{syncingStatusIds.delete(key)}
  }
}
function installControllerPatch(){const c=window.johnEcommerceOrdersController;if(!c||c.__v82244)return false;const origRender=typeof c.render==='function'?c.render.bind(c):null,origRefresh=typeof c.refresh==='function'?c.refresh.bind(c):null;if(origRender)c.render=function(){normalizeAcceptedInbox();const r=origRender(...arguments);setTimeout(()=>recoverAcceptedOrders().catch(()=>{}),0);return r};if(origRefresh)c.refresh=async function(){const r=await origRefresh(...arguments);normalizeAcceptedInbox();await recoverAcceptedOrders();if(origRender)origRender();setTimeout(()=>syncFulfilledLocalOrders().catch(()=>{}),0);return r};c.__v82244=true;c.stateV82244=function(o){const st=cloudState(o),integ=integrationState(o),decision=norm(o?.freteDecisaoCliente||'');if(st==='REJEITADO'||integ==='REJEITADO'||o?.rejeitado)return'REJEITADO';if(st==='CANCELADO'||integ==='CANCELADO'||decision==='REJEITADO'||st==='FRETE_RECUSADO_CLIENTE')return'CANCELADO';if(['ENTREGUE','RETIRADO','CONCLUIDO','FINALIZADO'].includes(st))return st;if(st==='ACEITO'||['IMPORTANDO','IMPORTADO'].includes(integ)||o?.erpPedidoId||o?.erpNumero)return'ACEITO';if(st==='AGUARDANDO_ACEITE_ERP'||decision==='ACEITO')return'AGUARDANDO_ACEITE_ERP';return typeof c.state==='function'?c.state(o):'PENDENTE'};window.johnV8RenderOrders=c.render;return true}
function enhanceButtons(){installControllerPatch();document.querySelectorAll('#ecommercePedidosRecebidos [data-cx-accept]').forEach(b=>{const id=S(b.dataset.cxAccept);if(acceptingIds.has(id)){b.disabled=true;b.textContent='Aceitando...';b.dataset.v82233Busy='1'}else if(b.dataset.v82233Busy==='1'){b.disabled=false;b.textContent='Aceitar';delete b.dataset.v82233Busy}})}
function onClick(e){const b=e.target?.closest?.('[data-cx-accept],[data-cx-pdf],[data-print-order-82224]');if(!b)return;if(b.matches('[data-cx-accept]')){e.preventDefault();e.stopImmediatePropagation();accept(b.dataset.cxAccept);return}if(b.matches('[data-cx-pdf],[data-print-order-82224]')){const id=b.dataset.cxPdf||b.dataset.printOrder82224;if(typeof window.johnPedidoActions82232?.preview==='function'){e.preventDefault();e.stopImmediatePropagation();window.johnPedidoActions82232.preview(id)}}}
function init(){installControllerPatch();enhanceButtons();normalizeAcceptedInbox();recoverAcceptedOrders().catch(()=>{});syncFulfilledLocalOrders().catch(()=>{})}

document.addEventListener('click',onClick,true);
normalizeAcceptedInbox();
installControllerPatch();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,180),{once:true});else setTimeout(init,100);
const mo=new MutationObserver(()=>enhanceButtons());try{mo.observe(document.documentElement,{childList:true,subtree:true})}catch(_){}
[500,1500,3500,7000].forEach(ms=>setTimeout(init,ms));
setInterval(()=>{recoverAcceptedOrders().catch(()=>{});syncFulfilledLocalOrders().catch(()=>{})},2200);
window.addEventListener('focus',()=>{recoverAcceptedOrders().catch(()=>{});syncFulfilledLocalOrders().catch(()=>{})});
window.johnOrderActions82233={version:VERSION,accept,normalizeAcceptedInbox,recoverAcceptedOrders,syncFulfilledLocalOrders,clientFor,acceptingIds};
})();
