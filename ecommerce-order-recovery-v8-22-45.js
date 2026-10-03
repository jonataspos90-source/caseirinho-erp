(function(){'use strict';
if(window.__JOHN_ORDER_CLOUD_RECOVERY_82246__)return;
window.__JOHN_ORDER_CLOUD_RECOVERY_82246__=true;

const VERSION='8.22.46';
const INBOX_KEY='john_ecommerce_cloud_inbox_v1';
const CLOUD_KEY='john_cloud_config_v1';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const digits=v=>S(v).replace(/\D/g,'');
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/[\s-]+/g,'_');
let pulling=false;
let lastPull=0;

function read(k,f){try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_){return f}}
function write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){console.warn('[John '+VERSION+'] localStorage',e);return false}}
function database(){try{return(typeof db!=='undefined'&&db)||window.db||{}}catch(_){return window.db||{}}}
function isClient(p){return !!p&&(p.ehCliente===true||norm(p.tipo)==='CLIENTE'||A(p.tipos).some(x=>norm(x)==='CLIENTE'))}
function extOrder(o){return S(o?.preCadastroId||o?.pre_cadastro_id||o?.payload?.preCadastroId||o?.payload?.pre_cadastro_id||o?.cliente?.preCadastroId).trim()}
function extPerson(p){return S(p?.preCadastroId||p?.pre_cadastro_id||p?.ecommercePreCadastroId||p?.cloudPreCadastroId||p?.externalCustomerId).trim()}
function doc(v){return digits(v?.cpf||v?.cnpj||v?.documento||v?.document)}
function phone(v){const d=digits(v?.telefone||v?.celular||v?.phone);return d?d.slice(-11):''}
function email(v){return S(v?.email).trim().toLowerCase()}
function name(v){return norm(v?.nome||v?.name)}
function accepted(o){const st=norm(o?.status||o?.payload?.status),it=norm(o?.statusIntegracao||o?.integration_status);return !['CANCELADO','REJEITADO'].includes(st)&&(['ACEITO','ENTREGUE','RETIRADO','CONCLUIDO','FINALIZADO'].includes(st)||['IMPORTANDO','IMPORTADO'].includes(it)||!!o?.erpPedidoId||!!o?.erpNumero)}
function linked(d,id){return A(d?.pedidos).some(p=>S(p?.ecommercePedidoId)===S(id))}
function one(list,pred){const r=list.filter(pred);return r.length===1?r[0]:null}
function cloud(){const c=read(CLOUD_KEY,{})||{};return{api:S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),token:S(c.apiKey||c.token||'')}}
function actor(){try{return S(typeof usuarioAtual==='function'?(usuarioAtual()?.nome||usuarioAtual()?.login||'ERP'):'ERP')}catch(_){return'ERP'}}
function persist(d){try{if(typeof __johnLocalStorage!=='undefined'&&typeof DB_KEY!=='undefined'){__johnLocalStorage.setItem(DB_KEY,JSON.stringify(d));return true}}catch(_){}try{localStorage.setItem('pcp_app_v1',JSON.stringify(d));return true}catch(e){console.warn('[John '+VERSION+'] persist',e);return false}}

async function fetchCloudOrders(){
  const c=cloud();
  if(!c.token)return[];
  const url=c.api+'/api/v1/admin/store/orders?status=TODOS&limit=1000&_recovery='+Date.now();
  const r=await fetch(url,{cache:'no-store',headers:{'Authorization':'Bearer '+c.token,'X-ERP-User':actor(),'Cache-Control':'no-store'}});
  let j={};try{j=await r.json()}catch(_){}
  if(!r.ok)throw new Error(j?.error||('HTTP '+r.status));
  return A(j?.orders);
}

function mergeCloudInbox(cloudRows){
  const current=A(read(INBOX_KEY,[]));
  const byId=new Map(current.map(o=>[S(o?.id),o]).filter(([id])=>id));
  let added=0,updated=0;
  for(const o of A(cloudRows)){
    const id=S(o?.id);if(!id||!accepted(o))continue;
    const old=byId.get(id);
    if(!old){byId.set(id,o);added++;continue}
    const merged={...old,...o};
    if(JSON.stringify(merged)!==JSON.stringify(old))updated++;
    byId.set(id,merged);
  }
  if(added||updated)write(INBOX_KEY,[...byId.values()]);
  return{added,updated,total:byId.size};
}

function repairIdentity(){
  const d=database();d.pessoas=A(d.pessoas);const clients=d.pessoas.filter(isClient);let changed=0;
  for(const o of A(read(INBOX_KEY,[]))){
    const id=S(o?.id),ext=extOrder(o);if(!id||!accepted(o)||linked(d,id))continue;
    if(ext&&clients.some(p=>extPerson(p)===ext))continue;
    const c=o?.cliente||o?.payload?.cliente||{},dc=doc(c),pc=phone(c),ec=email(c),nc=name(c);
    let p=(dc&&one(clients,x=>doc(x)===dc))||(ec&&one(clients,x=>email(x)===ec))||(pc&&nc&&one(clients,x=>phone(x)===pc&&name(x)===nc))||(pc&&one(clients,x=>phone(x)===pc));
    if(p){
      if(ext){const h=new Set(A(p.ecommercePreCadastroIds).map(S).filter(Boolean)),old=extPerson(p);if(old)h.add(old);h.add(ext);p.ecommercePreCadastroIds=[...h];p.preCadastroId=ext;p.ecommercePreCadastroId=ext}
      p.atualizadoEm=new Date().toISOString();changed++;continue;
    }
    const nm=S(c?.nome||c?.name).trim();if(!nm||(!dc&&!pc&&!ec))continue;
    const key=ext||dc||pc||ec||Date.now().toString(36);
    p={id:'ecom-client-'+key,nome:nm,tipo:'CLIENTE',tipos:['CLIENTE'],ehCliente:true,telefone:S(c?.telefone||c?.phone||''),celular:S(c?.telefone||c?.phone||''),email:S(c?.email||''),cpf:S(c?.cpf||c?.documento||''),preCadastroId:ext,ecommercePreCadastroId:ext,ecommercePreCadastroIds:ext?[ext]:[],origem:'ECOMMERCE',criadoEm:new Date().toISOString(),atualizadoEm:new Date().toISOString()};
    d.pessoas.push(p);clients.push(p);changed++;
  }
  if(changed){persist(d);try{window.renderPessoas?.()}catch(_){}}
  return changed;
}

async function triggerLocalRecovery(){
  for(let i=0;i<20;i++){
    const fn=window.johnOrderActions82233?.recoverAcceptedOrders;
    if(typeof fn==='function'){
      const created=await fn.call(window.johnOrderActions82233);
      try{window.renderPedidosNovo?.()}catch(_){}
      try{window.johnEcommerceOrdersController?.render?.()}catch(_){}
      return Number(created)||0;
    }
    await new Promise(r=>setTimeout(r,150));
  }
  return 0;
}

async function syncAndRepair(force=false){
  if(pulling)return 0;
  if(!force&&Date.now()-lastPull<1800)return 0;
  pulling=true;lastPull=Date.now();
  try{
    const rows=await fetchCloudOrders();
    const merge=mergeCloudInbox(rows);
    const identities=repairIdentity();
    const created=await triggerLocalRecovery();
    if(merge.added||identities||created)console.info('[John '+VERSION+'] recuperação de pedidos:',{nuvem:rows.length,adicionadosFila:merge.added,identidades,criadosERP:created});
    return created;
  }catch(e){console.warn('[John '+VERSION+'] recuperação pela nuvem:',e?.message||e);repairIdentity();await triggerLocalRecovery();return 0}
  finally{pulling=false}
}

function init(){syncAndRepair(true);setTimeout(()=>syncAndRepair(true),800);setTimeout(()=>syncAndRepair(true),2500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
setInterval(()=>syncAndRepair(false),3500);
window.addEventListener('focus',()=>syncAndRepair(true));
window.addEventListener('john:cloud-applied',()=>setTimeout(()=>syncAndRepair(true),80));
window.addEventListener('john:session-ready',()=>setTimeout(()=>syncAndRepair(true),120));
window.JohnOrderRecovery82246={version:VERSION,syncAndRepair,fetchCloudOrders,mergeCloudInbox,repairIdentity};
})();