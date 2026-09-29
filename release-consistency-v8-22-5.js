(function(){
'use strict';
if(window.__JOHN_RELEASE_CONSISTENCY_8225__)return;
window.__JOHN_RELEASE_CONSISTENCY_8225__=true;
const VERSION='8.22.5';
const USER_SYNC_MARKER='john_user_auth_direct_sync_v82225';
function S(v){return String(v??'')}
function A(v){return Array.isArray(v)?v:[]}
function exposeDb(){
 try{
  if(typeof db!=='undefined'&&db&&typeof db==='object'){
   window.db=db;
   return true;
  }
 }catch(_){}
 return false;
}
function currentDb(){
 exposeDb();
 try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){}
 return window.db&&typeof window.db==='object'?window.db:null;
}
function storage(){
 try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}catch(_){return localStorage}
}
function adminUser(){
 try{
  const u=typeof usuarioAtual==='function'?usuarioAtual():null;
  return u&&['MASTER','ADMINISTRADOR'].includes(S(u.perfil).toUpperCase())?u:null;
 }catch(_){return null}
}
function cloudCfg(){
 let c={};
 try{c=JSON.parse(storage().getItem('john_cloud_config_v1')||'{}')||{}}catch(_){}
 return {apiUrl:S(c.apiUrl).replace(/\/+$/,''),apiKey:S(c.apiKey)};
}
function userPayload(u){
 return {
  id:S(u.id),pessoaId:S(u.pessoaId),nome:S(u.nome),login:S(u.login).trim(),senhaHash:S(u.senhaHash),
  perfil:S(u.perfil||'CONSULTA'),status:S(u.status||'ATIVO'),validade:S(u.validade||''),
  permissoes:u.permissoes&&typeof u.permissoes==='object'?u.permissoes:{},apiTokenMeta:u.apiTokenMeta||null
 };
}
async function directSyncUser(u){
 const admin=adminUser(),c=cloudCfg();
 if(!admin||!u||!S(u.id)||!S(u.login).trim()||!S(u.senhaHash)||!c.apiUrl||!c.apiKey)return false;
 const r=await fetch(c.apiUrl+'/api/v1/admin/erp-users/'+encodeURIComponent(S(u.id)),{
  method:'PUT',
  headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.apiKey,'X-ERP-User':S(admin.nome||admin.login||'ERP')},
  body:JSON.stringify(userPayload(u))
 });
 let out={};try{out=await r.json()}catch(_){}
 if(!r.ok)throw new Error(out?.error||('HTTP '+r.status));
 return out?.ok===true;
}
function findUser(personId,login){
 const d=currentDb();if(!d)return null;
 const users=A(d.usuarios);
 return users.find(u=>personId&&S(u.pessoaId)===S(personId))||users.find(u=>login&&S(u.login).trim().toLowerCase()===S(login).trim().toLowerCase())||null;
}
function scheduleFormUserSync(){
 const form=document.getElementById('pessoaForm');if(!form)return;
 const personId=S(document.getElementById('pessoaId')?.value),login=S(document.getElementById('pessoaLogin')?.value).trim();
 const attempt=async()=>{const u=findUser(personId,login);if(!u)return false;try{return await directSyncUser(u)}catch(e){console.warn('[John] Sincronização direta de credencial pendente:',e?.message||e);return false}};
 [180,1400,4500].forEach(ms=>setTimeout(attempt,ms));
}
async function backfillUsersOnce(){
 if(!adminUser())return false;
 let done=false;try{done=storage().getItem(USER_SYNC_MARKER)==='1'}catch(_){}
 if(done)return true;
 const d=currentDb();if(!d)return false;
 const users=A(d.usuarios).filter(u=>S(u.id)!=='master'&&S(u.login).trim()&&S(u.senhaHash));
 if(!users.length)return false;
 try{
  for(const u of users)await directSyncUser(u);
  storage().setItem(USER_SYNC_MARKER,'1');
  return true;
 }catch(e){console.warn('[John] Backfill de credenciais aguardando API:',e?.message||e);return false}
}
function installUserSync(){
 if(window.__JOHN_USER_AUTH_DIRECT_SYNC_82225__)return;
 window.__JOHN_USER_AUTH_DIRECT_SYNC_82225__=true;
 document.addEventListener('click',ev=>{
  const b=ev.target?.closest?.('#pessoaForm button[type="submit"],#pessoaForm input[type="submit"]');
  if(b)scheduleFormUserSync();
 },true);
 document.addEventListener('keydown',ev=>{
  if(ev.key==='Enter'&&ev.target?.closest?.('#pessoaForm'))scheduleFormUserSync();
 },true);
 [1800,5000,12000].forEach(ms=>setTimeout(()=>backfillUsersOnce(),ms));
}
function apply(){
 exposeDb();
 installUserSync();
 try{window.JOHN_ERP_VERSION=VERSION}catch(_){}
 try{document.documentElement.dataset.johnRelease='8225'}catch(_){}
 try{document.title='John Sistema ERP · V'+VERSION}catch(_){}
 try{
  const el=document.getElementById('jnActiveArea');
  if(el)el.textContent=S(el.textContent).replace(/\b8\.(?:18\.0|19\.\d+|20\.\d+|21\.\d+|22\.[0-4])\b/g,VERSION);
 }catch(_){}
}
apply();
[120,500,1200,3000].forEach(ms=>setTimeout(apply,ms));
window.addEventListener('john:session-ready',()=>{apply();setTimeout(()=>backfillUsersOnce(),350)});
window.addEventListener('john:cloud-applied',()=>{apply();setTimeout(()=>backfillUsersOnce(),350)});
})();
