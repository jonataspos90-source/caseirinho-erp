(function(){
'use strict';

if(window.__JOHN_MULTIEMPRESA_8110__)return;
window.__JOHN_MULTIEMPRESA_8110__=true;

const VERSION='8.11.0';
const API_DEFAULT='https://john-cloud-api-production.up.railway.app';
const GLOBAL_TENANT_KEY='john_active_tenant_v1';
const GLOBAL_KEYS=new Set([
  GLOBAL_TENANT_KEY,
  'john_tenant_directory_v1'
]);
const APP_KEY=/^(?:pcp_|john_)/i;
const raw={
  get:Storage.prototype.getItem,
  set:Storage.prototype.setItem,
  remove:Storage.prototype.removeItem,
  clear:Storage.prototype.clear,
  key:Storage.prototype.key
};

const S=v=>String(v??'');
const normSlug=v=>S(v).trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9-]/g,'-')
  .replace(/-+/g,'-')
  .replace(/^-|-$/g,'');

function rawGet(storage,key){
  try{return raw.get.call(storage,key)}catch(_){return null}
}
function rawSet(storage,key,value){
  try{raw.set.call(storage,key,String(value));return true}catch(_){return false}
}
function rawRemove(storage,key){
  try{raw.remove.call(storage,key)}catch(_){}
}
function parse(value,fallback={}){
  try{
    const x=JSON.parse(value);
    return x&&typeof x==='object'?x:fallback;
  }catch(_){return fallback}
}
function urlTenant(){
  const q=new URLSearchParams(location.search);
  return normSlug(q.get('empresa')||q.get('tenant')||'');
}
function legacyCloud(){
  return parse(rawGet(localStorage,'john_cloud_config_v1')||'{}',{});
}

const fromUrl=urlTenant();
const remembered=normSlug(rawGet(localStorage,GLOBAL_TENANT_KEY)||'');
const legacy=legacyCloud();
const legacySlug=normSlug(legacy.storeSlug||'');
const tenantSlug=fromUrl||remembered||legacySlug||'';

if(tenantSlug){
  rawSet(localStorage,GLOBAL_TENANT_KEY,tenantSlug);
}

window.__JOHN_TENANT__={
  slug:tenantSlug,
  source:fromUrl?'url':remembered?'remembered':legacySlug?'legacy':'none',
  name:'',
  id:'',
  ready:false
};

function scopedKey(key){
  key=S(key);
  if(!key||GLOBAL_KEYS.has(key)||key.startsWith('john:'))return key;
  if(!APP_KEY.test(key))return key;
  const slug=tenantSlug||'__unassigned__';
  return `john:${slug}:${key}`;
}

function migrateLegacyStorage(storage){
  if(!tenantSlug||legacySlug!==tenantSlug)return;

  // Copia, mas não apaga, para preservar rollback da versão anterior.
  const snapshot=[];
  try{
    for(let i=0;i<storage.length;i++){
      const k=raw.key.call(storage,i);
      if(k)snapshot.push(k);
    }
  }catch(_){}

  for(const key of snapshot){
    if(!APP_KEY.test(key)||GLOBAL_KEYS.has(key)||key.startsWith('john:'))continue;
    const dest=scopedKey(key);
    if(rawGet(storage,dest)!==null)continue;
    const value=rawGet(storage,key);
    if(value!==null)rawSet(storage,dest,value);
  }
}

migrateLegacyStorage(localStorage);
migrateLegacyStorage(sessionStorage);

/*
  Namespacing no próprio Storage:
  qualquer módulo antigo que use localStorage/sessionStorage continua funcionando,
  mas lê e grava somente dentro da empresa ativa.
*/
Storage.prototype.getItem=function(key){
  return raw.get.call(this,scopedKey(key));
};
Storage.prototype.setItem=function(key,value){
  return raw.set.call(this,scopedKey(key),String(value));
};
Storage.prototype.removeItem=function(key){
  return raw.remove.call(this,scopedKey(key));
};
Storage.prototype.clear=function(){
  const prefix=`john:${tenantSlug||'__unassigned__'}:`;
  const keys=[];
  try{
    for(let i=0;i<this.length;i++){
      const k=raw.key.call(this,i);
      if(k&&(k.startsWith(prefix)||(!tenantSlug&&APP_KEY.test(k))))keys.push(k);
    }
  }catch(_){}
  for(const k of keys){
    try{raw.remove.call(this,k)}catch(_){}
  }
};

function tokenPayload(token){
  try{
    const body=S(token).split('.')[0];
    if(!body)return null;
    const normalized=body.replace(/-/g,'+').replace(/_/g,'/');
    const pad='='.repeat((4-normalized.length%4)%4);
    return JSON.parse(decodeURIComponent(
      Array.prototype.map.call(
        atob(normalized+pad),
        c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)
      ).join('')
    ));
  }catch(_){return null}
}
function tokenAlive(token){
  const p=tokenPayload(token);
  return !!(p?.exp&&Date.now()<Number(p.exp));
}

/*
  O token administrativo não deve sobreviver sem uma sessão válida da aba.
  Isso também elimina o uso automático da antiga ERP_API_KEY no navegador.
*/
(function restoreSessionToken(){
  const sess=parse(sessionStorage.getItem('pcp_sessao')||'null',null);
  const c=parse(localStorage.getItem('john_cloud_config_v1')||'{}',{});

  if(sess?.cloudToken&&tokenAlive(sess.cloudToken)){
    c.apiKey=sess.cloudToken;
    c.storeSlug=tenantSlug||c.storeSlug||'';
    c.apiUrl=S(c.apiUrl||API_DEFAULT).replace(/\/+$/,'');
    localStorage.setItem('john_cloud_config_v1',JSON.stringify(c));
    return;
  }

  if(c.apiKey){
    c.apiKey='';
    localStorage.setItem('john_cloud_config_v1',JSON.stringify(c));
  }
})();

function esc(v){
  return S(v).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function apiBase(){
  const c=parse(localStorage.getItem('john_cloud_config_v1')||'{}',{});
  return S(c.apiUrl||API_DEFAULT).replace(/\/+$/,'');
}
async function api(path,opt={}){
  const r=await fetch(apiBase()+path,{
    ...opt,
    cache:'no-store',
    headers:{
      'Content-Type':'application/json',
      'Cache-Control':'no-cache',
      ...(opt.headers||{})
    }
  });

  let d={};
  try{d=await r.json()}catch(_){}
  if(!r.ok)throw new Error(d?.error||('HTTP '+r.status));
  return d;
}

function tenantPath(path=''){
  if(!tenantSlug)throw new Error('Código da empresa não informado.');
  return '/api/v1/public/store/'+encodeURIComponent(tenantSlug)+path;
}
function setLoginError(message){
  const e=document.getElementById('loginErro');
  if(e)e.textContent=S(message);
}
function loginInputsEnabled(enabled){
  for(const id of ['loginUsuario','loginSenha','loginEntrar','loginMostrarSenha']){
    const el=document.getElementById(id);
    if(el)el.disabled=!enabled;
  }
}
function normalizeCloudDb(x){
  x=x&&typeof x==='object'&&!Array.isArray(x)?x:{};

  const cols=[
    'produtos','entradas','fichas','transformacoes','vendas','producoes',
    'pedidos','inventarios','promocoes','separacoes','lojas','fretes',
    'contasConsumo','baixasInternas','pessoas','usuarios','logs',
    'programacoesProducao','fluxoCaixa'
  ];

  cols.forEach(k=>{
    if(!Array.isArray(x[k]))x[k]=[];
  });

  if(!x.config||typeof x.config!=='object'||Array.isArray(x.config)){
    x.config={};
  }
  return x;
}

function tenantPanel(){
  const card=document.querySelector('#loginScreen .login-card');
  if(!card)return null;

  let panel=document.getElementById('johnTenantPanel');
  if(panel)return panel;

  panel=document.createElement('div');
  panel.id='johnTenantPanel';
  panel.style.cssText=
    'margin:16px 0;padding:13px;border:1px solid #d8dee9;border-radius:12px;'+
    'background:#f8fafc;font-size:12px;line-height:1.45';

  const subtitle=card.querySelector('.subtitle');
  (subtitle||card.firstElementChild)?.insertAdjacentElement('afterend',panel);
  return panel;
}

function showTenantChooser(){
  const p=tenantPanel();
  if(!p)return;

  loginInputsEnabled(false);
  setLoginError('');

  p.innerHTML=`
    <b style="font-size:13px">Identifique sua empresa</b>
    <div style="margin-top:5px;color:#64748b">
      Informe o código fornecido pela John Sistemas.
    </div>
    <div style="display:flex;gap:7px;margin-top:10px">
      <input id="johnTenantInput" autocomplete="organization"
        placeholder="codigo-da-empresa"
        style="flex:1;padding:9px;border:1px solid #cbd5e1;border-radius:9px">
      <button id="johnTenantContinue" type="button"
        style="border:0;border-radius:9px;padding:9px 12px;background:#6d28d9;color:#fff;font-weight:800">
        Continuar
      </button>
    </div>`;

  const go=()=>{
    const slug=normSlug(document.getElementById('johnTenantInput')?.value||'');
    if(!slug){
      setLoginError('Informe o código da empresa.');
      return;
    }

    rawSet(localStorage,GLOBAL_TENANT_KEY,slug);
    const u=new URL(location.href);
    u.searchParams.set('empresa',slug);
    location.replace(u.toString());
  };

  document.getElementById('johnTenantContinue').onclick=go;
  document.getElementById('johnTenantInput').onkeydown=e=>{
    if(e.key==='Enter'){
      e.preventDefault();
      go();
    }
  };
}

function activationHtml(identity){
  return `
    <div id="johnBootstrapPanel"
      style="margin-top:12px;padding:14px;border:1px solid #c4b5fd;border-radius:12px;background:#f5f3ff">
      <b style="color:#4c1d95">Primeiro acesso da empresa</b>
      <div style="margin:5px 0 10px;color:#64748b">
        Crie o primeiro usuário MASTER. O código de ativação expira e só pode ser usado uma vez.
      </div>
      <label>Nome do responsável</label>
      <input id="johnBootName" style="margin-bottom:8px">
      <label>Login MASTER</label>
      <input id="johnBootLogin" autocomplete="username" style="margin-bottom:8px">
      <label>E-mail</label>
      <input id="johnBootEmail" type="email" style="margin-bottom:8px">
      <label>Senha</label>
      <input id="johnBootPassword" type="password" autocomplete="new-password" style="margin-bottom:8px">
      <label>Confirmar senha</label>
      <input id="johnBootPassword2" type="password" autocomplete="new-password" style="margin-bottom:8px">
      <label>Código de ativação</label>
      <input id="johnBootToken" type="password" autocomplete="off" style="margin-bottom:10px">
      <button id="johnBootCreate" class="btn primary" type="button" style="width:100%">
        Ativar empresa e criar MASTER
      </button>
      <div id="johnBootStatus" style="margin-top:8px"></div>
    </div>`;
}

async function createMaster(){
  const status=document.getElementById('johnBootStatus');
  const btn=document.getElementById('johnBootCreate');

  const nome=S(document.getElementById('johnBootName')?.value).trim();
  const login=S(document.getElementById('johnBootLogin')?.value).trim().toLowerCase();
  const email=S(document.getElementById('johnBootEmail')?.value).trim();
  const senha=S(document.getElementById('johnBootPassword')?.value);
  const senha2=S(document.getElementById('johnBootPassword2')?.value);
  const bootstrapToken=S(document.getElementById('johnBootToken')?.value).trim();

  if(nome.length<2||login.length<3||senha.length<8||!bootstrapToken){
    if(status)status.textContent='Preencha nome, login, senha com pelo menos 8 caracteres e código de ativação.';
    return;
  }
  if(senha!==senha2){
    if(status)status.textContent='As senhas não coincidem.';
    return;
  }

  if(btn){
    btn.disabled=true;
    btn.textContent='Ativando...';
  }

  try{
    await api(tenantPath('/bootstrap/master'),{
      method:'POST',
      body:JSON.stringify({
        bootstrapToken,
        nome,
        login,
        senha,
        email
      })
    });

    if(status){
      status.style.color='#166534';
      status.textContent='Empresa ativada. Agora entre com o login MASTER criado.';
    }

    document.getElementById('johnBootstrapPanel')?.remove();
    loginInputsEnabled(true);
    const lu=document.getElementById('loginUsuario');
    if(lu)lu.value=login;
    const lp=document.getElementById('loginSenha');
    if(lp){
      lp.value='';
      lp.focus();
    }

    await loadIdentity();
  }catch(e){
    if(status){
      status.style.color='#b91c1c';
      status.textContent=e.message;
    }
  }finally{
    if(btn){
      btn.disabled=false;
      btn.textContent='Ativar empresa e criar MASTER';
    }
  }
}

async function loadIdentity(){
  if(!tenantSlug){
    showTenantChooser();
    return null;
  }

  const p=tenantPanel();
  if(p){
    p.innerHTML='<b>Empresa:</b> verificando acesso...';
  }

  try{
    const x=await api(tenantPath('/erp-identity'));
    window.__JOHN_TENANT__={
      ...window.__JOHN_TENANT__,
      id:S(x.tenant?.id),
      slug:S(x.tenant?.slug||tenantSlug),
      name:S(x.tenant?.name||tenantSlug),
      ready:true,
      needsBootstrap:x.needsBootstrap===true
    };

    rawSet(localStorage,GLOBAL_TENANT_KEY,window.__JOHN_TENANT__.slug);

    if(p){
      p.innerHTML=`
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <div>
            <b style="font-size:13px">${esc(window.__JOHN_TENANT__.name)}</b>
            <div style="color:#64748b">Ambiente empresarial protegido</div>
          </div>
          <span style="padding:5px 8px;border-radius:999px;background:#ede9fe;color:#5b21b6;font-weight:800">
            ${esc(window.__JOHN_TENANT__.slug)}
          </span>
        </div>
        ${x.needsBootstrap?activationHtml(x):''}`;
    }

    document.title='John Sistema ERP · '+window.__JOHN_TENANT__.name;

    if(x.needsBootstrap){
      loginInputsEnabled(false);
      const b=document.getElementById('johnBootCreate');
      if(b)b.onclick=createMaster;
    }else{
      loginInputsEnabled(true);
    }

    renderTenantBadge();
    return x;
  }catch(e){
    window.__JOHN_TENANT__.ready=false;
    loginInputsEnabled(false);

    if(p){
      p.innerHTML=`
        <b style="color:#b91c1c">Empresa não localizada ou indisponível.</b>
        <div style="margin-top:7px">${esc(e.message)}</div>
        <button id="johnChangeTenant" type="button"
          style="margin-top:9px;border:0;border-radius:9px;padding:8px 10px;background:#e2e8f0;font-weight:800">
          Informar outra empresa
        </button>`;
    }

    const c=document.getElementById('johnChangeTenant');
    if(c)c.onclick=()=>{
      rawRemove(localStorage,GLOBAL_TENANT_KEY);
      const u=new URL(location.href);
      u.searchParams.delete('empresa');
      u.searchParams.delete('tenant');
      location.replace(u.toString());
    };

    return null;
  }
}

async function cloudLogin(loginValue,password){
  const auth=await api(tenantPath('/erp-login'),{
    method:'POST',
    body:JSON.stringify({
      login:loginValue,
      senha:password
    })
  });

  const session=await api(tenantPath('/erp-session'),{
    headers:{
      'Authorization':'Bearer '+auth.token
    }
  });

  return {...auth,...session};
}

function saveSessionCloudConfig(c){
  const current=parse(localStorage.getItem('john_cloud_config_v1')||'{}',{});
  const next={
    ...current,
    apiUrl:apiBase(),
    storeSlug:tenantSlug,
    apiKey:c.token,
    autoSync:current.autoSync!==false,
    mirrorAuto:current.mirrorAuto!==false,
    intervaloSeg:Math.max(15,Number(current.intervaloSeg)||30)
  };
  localStorage.setItem('john_cloud_config_v1',JSON.stringify(next));
}

function installDynamicLogin(){
  const btn=document.getElementById('loginEntrar');
  const user=document.getElementById('loginUsuario');
  const pass=document.getElementById('loginSenha');
  if(!btn||!user||!pass)return;

  const originalLogin=window.login;

  window.login=async function(){
    const l=S(user.value).trim().toLowerCase();
    const p=S(pass.value);

    if(!tenantSlug){
      showTenantChooser();
      return;
    }
    if(!window.__JOHN_TENANT__?.ready){
      setLoginError('Aguarde a identificação da empresa.');
      return;
    }
    if(window.__JOHN_TENANT__.needsBootstrap){
      setLoginError('Ative a empresa antes do primeiro login.');
      return;
    }
    if(!l||!p){
      setLoginError('Informe login e senha.');
      return;
    }

    setLoginError('Validando acesso seguro...');
    btn.disabled=true;
    const oldText=btn.textContent;
    btn.textContent='Entrando...';

    try{
      const c=await cloudLogin(l,p);

      // O servidor retornou exclusivamente a base do tenant autenticado.
      db=normalizeCloudDb(c.db);
      localStorage.setItem('pcp_app_v1',JSON.stringify(db));

      const u=(db.usuarios||[]).find(
        x=>S(x.id)===S(c.userId)
      )||(db.usuarios||[]).find(
        x=>S(x.login).toLowerCase()===l
      );

      if(!u){
        throw new Error(
          'Usuário autenticado, mas não localizado na base desta empresa.'
        );
      }

      saveSessionCloudConfig(c);

      sessao={
        usuarioId:u.id,
        inicio:new Date().toISOString(),
        cloud:true,
        cloudToken:c.token,
        tenantId:S(c.tenant?.id||window.__JOHN_TENANT__.id),
        tenantSlug:S(c.tenant?.slug||tenantSlug),
        tenantName:S(c.tenant?.name||window.__JOHN_TENANT__.name)
      };

      sessionStorage.setItem('pcp_sessao',JSON.stringify(sessao));

      setLoginError('');
      document.getElementById('loginScreen')?.classList.add('hidden');

      if(typeof aplicarAcessos==='function')aplicarAcessos();
      if(typeof resetSessionTimer==='function')resetSessionTimer();
      if(typeof registrarLog==='function'){
        registrarLog(
          'seguranca',
          'LOGIN',
          'Acesso multiempresa · '+S(sessao.tenantSlug)
        );
      }

      renderTenantBadge();

      if(typeof inicializarAplicacaoAposLogin==='function'){
        setTimeout(inicializarAplicacaoAposLogin,0);
      }
    }catch(e){
      console.warn('[John Multiempresa] login:',e);

      /*
        Fallback local somente para a base já isolada do MESMO tenant.
        Em um tenant novo não há usuário local válido antes do bootstrap/cloud.
      */
      let localUser=null;
      try{
        localUser=(db?.usuarios||[]).find(
          x=>S(x.login).toLowerCase()===l
        );
      }catch(_){}

      if(localUser&&typeof originalLogin==='function'){
        originalLogin();
        const msg=document.getElementById('loginErro')?.textContent||'';
        if(msg==='Login ou senha inválidos.'){
          setLoginError(e.message);
        }
      }else{
        setLoginError(e.message);
      }
    }finally{
      btn.disabled=false;
      btn.textContent=oldText;
    }
  };

  const invoke=e=>{
    if(e){
      e.preventDefault();
      e.stopPropagation();
    }
    window.login();
  };

  btn.onclick=invoke;
  user.onkeydown=e=>{
    if(e.key==='Enter')invoke(e);
  };
  pass.onkeydown=e=>{
    if(e.key==='Enter')invoke(e);
  };

  // O bootstrap antigo faz rebind tardio; garantimos que o handler multiempresa
  // seja o último e autoritativo.
  setTimeout(()=>{btn.onclick=invoke},1400);
  setTimeout(()=>{btn.onclick=invoke},2600);
}

function renderTenantBadge(){
  if(!window.__JOHN_TENANT__?.name)return;

  const host=
    document.querySelector('.topbar .actions') ||
    document.querySelector('.topbar');
  if(!host)return;

  let badge=document.getElementById('johnTenantBadge');
  if(!badge){
    badge=document.createElement('span');
    badge.id='johnTenantBadge';
    badge.style.cssText=
      'display:inline-flex;align-items:center;gap:6px;padding:7px 10px;'+
      'border-radius:999px;background:#ede9fe;color:#4c1d95;font-size:11px;font-weight:900';
    host.prepend(badge);
  }

  badge.textContent='🏢 '+window.__JOHN_TENANT__.name;
}

function installLogoutSecurity(){
  const old=window.logout;
  if(typeof old!=='function'||old.__johnTenantWrapped)return;

  const wrapped=function(){
    try{
      if(typeof old==='function')old();
    }finally{
      const c=parse(localStorage.getItem('john_cloud_config_v1')||'{}',{});
      c.apiKey='';
      localStorage.setItem('john_cloud_config_v1',JSON.stringify(c));
      sessionStorage.removeItem('pcp_sessao');
    }
  };
  wrapped.__johnTenantWrapped=true;
  window.logout=wrapped;
}

async function initUi(){
  if(!tenantSlug){
    showTenantChooser();
    return;
  }

  installDynamicLogin();
  installLogoutSecurity();
  await loadIdentity();
  installDynamicLogin();
  installLogoutSecurity();
  renderTenantBadge();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',initUi,{once:true});
}else{
  initUi();
}

setTimeout(()=>{
  installDynamicLogin();
  installLogoutSecurity();
  renderTenantBadge();
},1700);

console.info(
  `[John ERP] Multiempresa V${VERSION} · tenant=${tenantSlug||'não informado'}`
);
})();