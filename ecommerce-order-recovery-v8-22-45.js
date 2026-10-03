(function(){'use strict';
if(window.__JOHN_ORDER_RECOVERY_82245__)return;window.__JOHN_ORDER_RECOVERY_82245__=true;
const INBOX_KEY='john_ecommerce_cloud_inbox_v1';
const S=v=>String(v??''),A=v=>Array.isArray(v)?v:[],digits=v=>S(v).replace(/\D/g,''),norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/[\s-]+/g,'_');
function read(k,f){try{return JSON.parse(localStorage.getItem(k)||'null')??f}catch(_){return f}}
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
function persist(d){try{if(typeof __johnLocalStorage!=='undefined'&&typeof DB_KEY!=='undefined'){__johnLocalStorage.setItem(DB_KEY,JSON.stringify(d));return true}}catch(_){}try{localStorage.setItem('pcp_app_v1',JSON.stringify(d));return true}catch(e){console.warn('[John 8.22.45] persist',e);return false}}
function repair(){const d=database();d.pessoas=A(d.pessoas);const clients=d.pessoas.filter(isClient);let changed=0;
 for(const o of A(read(INBOX_KEY,[]))){const id=S(o?.id),ext=extOrder(o);if(!id||!ext||!accepted(o)||linked(d,id)||clients.some(p=>extPerson(p)===ext))continue;const c=o?.cliente||o?.payload?.cliente||{},dc=doc(c),pc=phone(c),ec=email(c),nc=name(c);
  let p=(dc&&one(clients,x=>doc(x)===dc))||(ec&&one(clients,x=>email(x)===ec))||(pc&&nc&&one(clients,x=>phone(x)===pc&&name(x)===nc))||(pc&&one(clients,x=>phone(x)===pc));
  if(p){const h=new Set(A(p.ecommercePreCadastroIds).map(S).filter(Boolean)),old=extPerson(p);if(old)h.add(old);h.add(ext);p.ecommercePreCadastroIds=[...h];p.preCadastroId=ext;p.ecommercePreCadastroId=ext;p.atualizadoEm=new Date().toISOString();changed++;continue}
  const nm=S(c?.nome||c?.name).trim();if(!nm||(!dc&&!pc&&!ec))continue;p={id:'ecom-client-'+ext,nome:nm,tipo:'CLIENTE',tipos:['CLIENTE'],ehCliente:true,telefone:S(c?.telefone||c?.phone),celular:S(c?.telefone||c?.phone),email:S(c?.email),cpf:S(c?.cpf||c?.documento),preCadastroId:ext,ecommercePreCadastroId:ext,ecommercePreCadastroIds:[ext],origem:'ECOMMERCE',criadoEm:new Date().toISOString(),atualizadoEm:new Date().toISOString()};d.pessoas.push(p);clients.push(p);changed++}
 if(changed){persist(d);try{window.renderPessoas?.()}catch(_){}setTimeout(()=>window.johnOrderActions82233?.recoverAcceptedOrders?.().catch?.(()=>{}),80);setTimeout(()=>window.renderPedidosNovo?.(),220)}return changed}
function init(){repair();setTimeout(repair,500);setTimeout(repair,1800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();setInterval(repair,2500);window.addEventListener('focus',repair);window.addEventListener('john:cloud-applied',()=>setTimeout(repair,80));window.JohnOrderRecovery82245={repair};
})();