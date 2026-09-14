(function(){
'use strict';

if(window.__JOHN_MULTIEMPRESA_8120__)return;
window.__JOHN_MULTIEMPRESA_8120__=true;

const VERSION='8.14.0';
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
const legacy=legacyCloud();
const legacySlug=normSlug(legacy.storeSlug||'');
/*
  V8.14.0:
  - link sem ?empresa= SEMPRE abre a empresa proprietária "caseirinho";
  - clientes usam exclusivamente o link com ?empresa=<slug>;
  - nunca reaproveitamos a última empresa lembrada/legada para decidir o tenant.
*/
const tenantSlug=fromUrl||'caseirinho';

rawSet(localStorage,GLOBAL_TENANT_KEY,tenantSlug);

window.__JOHN_TENANT__={
  slug:tenantSlug,
  source:fromUrl?'url':'default',
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


function supportTokenFromHash(){
  const h=String(location.hash||'').replace(/^#/,'');
  if(!h)return '';
  const params=new URLSearchParams(h);
  return S(params.get('john-support')||'').trim();
}

const supportToken=supportTokenFromHash();
const supportPayload=tokenPayload(supportToken);

if(
  supportToken &&
  tokenAlive(supportToken) &&
  supportPayload?.support===true &&
  normSlug(supportPayload?.slug||'')===tenantSlug
){
  const supportSession={
    usuarioId:S(supportPayload.userId||''),
    inicio:new Date().toISOString(),
    cloud:true,
    cloudToken:supportToken,
    tenantId:S(supportPayload.tenantId||''),
    tenantSlug:tenantSlug,
    tenantName:'',
    support:true,
    supportByName:S(supportPayload.supportByName||'Suporte John Sistemas')
  };

  rawSet(sessionStorage,scopedKey('pcp_sessao'),JSON.stringify(supportSession));

  const cc=parse(rawGet(localStorage,scopedKey('john_cloud_config_v1'))||'{}',{});
  cc.apiUrl=S(cc.apiUrl||API_DEFAULT).replace(/\/+$/,'');
  cc.apiKey=supportToken;
  cc.storeSlug=tenantSlug;
  cc.authMode='SUPPORT_SESSION';
  rawSet(localStorage,scopedKey('john_cloud_config_v1'),JSON.stringify(cc));

  try{
    const cleanUrl=location.pathname+location.search;
    history.replaceState(null,'',cleanUrl);
  }catch(_){}
}

/*
  O token administrativo não deve sobreviver sem uma sessão válida da aba.
  Isso também elimina o uso automático da antiga ERP_API_KEY no navegador.
*/
(function restoreSessionToken(){
  const sess=parse(sessionStorage.getItem('pcp_sessao')||'null',null);
  const c=parse(localStorage.getItem('john_cloud_config_v1')||'{}',{});

  // 1) Sessão individual válida sempre tem prioridade.
  if(sess?.cloudToken&&tokenAlive(sess.cloudToken)){
    c.apiKey=sess.cloudToken;
    c.storeSlug=tenantSlug||c.storeSlug||'';
    c.apiUrl=S(c.apiUrl||API_DEFAULT).replace(/\/+$/,'');
    c.authMode=sess.support===true?'SUPPORT_SESSION':'SESSION_V2';
    localStorage.setItem('john_cloud_config_v1',JSON.stringify(c));
    return;
  }

  /*
    2) Compatibilidade SOMENTE para a empresa original deste navegador.

    A V8.11.0 copiava john_cloud_config_v1 para o namespace e logo depois
    apagava apiKey quando ainda não havia uma sessão V2. O ERP legado
    interpretava isso como "dispositivo sem token" e abria novamente o
    fluxo de solicitação/aprovação.

    A chave original continua preservada na entrada NÃO namespaced porque
    migrateLegacyStorage() copia e não apaga. Recuperamos essa chave somente
    quando o slug legado é exatamente o mesmo tenant ativo.

    Um tenant novo jamais passa por esta condição e nunca recebe a chave
    legada da empresa original.
  */
  const isOriginalLegacyTenant=!!(
    tenantSlug &&
    legacySlug &&
    tenantSlug===legacySlug
  );

  if(isOriginalLegacyTenant&&S(legacy?.apiKey).trim()){
    c.apiKey=S(legacy.apiKey).trim();
    c.storeSlug=tenantSlug;
    c.apiUrl=S(c.apiUrl||legacy.apiUrl||API_DEFAULT).replace(/\/+$/,'');
    c.authMode='LEGACY_TRANSITION';
    c.legacyTransition=true;
    localStorage.setItem('john_cloud_config_v1',JSON.stringify(c));
    return;
  }

  /*
    3) Token de DISPOSITIVO informado/gerado para este tenant permanece
    neste navegador até ser revogado explicitamente no servidor.

    Sessões assinadas do login continuam temporárias. A diferença evita que
    o ERP volte a pedir o token em todo acesso sem permitir que uma sessão
    expirada vire credencial permanente.
  */
  const persistedToken=S(c.apiKey).trim();
  const persistedPayload=tokenPayload(persistedToken);
  const looksSignedSession=!!(persistedPayload?.tenantId);

  if(persistedToken&&!looksSignedSession){
    c.apiKey=persistedToken;
    c.storeSlug=tenantSlug||c.storeSlug||'';
    c.apiUrl=S(c.apiUrl||API_DEFAULT).replace(/\/+$/,'');
    c.authMode='DEVICE_TOKEN';
    c.deviceTokenPersistent=true;
    localStorage.setItem('john_cloud_config_v1',JSON.stringify(c));
    return;
  }

  if(c.apiKey)c.apiKey='';
  c.storeSlug=tenantSlug||c.storeSlug||'';
  c.authMode='TENANT_LOGIN_REQUIRED';
  delete c.legacyTransition;
  delete c.deviceTokenPersistent;
  localStorage.setItem('john_cloud_config_v1',JSON.stringify(c));
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


function normalizeText(v){
  return S(v).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}

const MODULE_MATCHERS={
  dashboard:['dashboard','inicio','visao geral'],
  pessoas:['pessoas','clientes','fornecedores','usuarios'],
  produtos:['produtos','ficha tecnica'],
  lojas:['lojas'],
  arvoreMercadologica:['arvore mercadologica','mercadologica'],
  compras:['compras','pedido de compra','pedidos de compra'],
  notasFiscais:['nota fiscal','notas fiscais','nf-e','nfe'],
  estoque:['estoque','inventario','transformacao','operacoes'],
  pcp:['pcp','producao','planejamento de estoque','planejamento de producao'],
  comercial:['comercial','mix','performance'],
  pricing:['pricing','precificacao','margem'],
  vendas:['vendas','pedidos'],
  financeiro:['financeiro','caixa','fluxo de caixa','contas a pagar','contas a receber','dre'],
  convenio:['convenio'],
  contabil:['contabil','contabilidade'],
  crm:['crm'],
  ecommerce:['ecommerce','e-commerce','loja online'],
  relatorios:['relatorios','kardex','curva abc'],
  configuracao:['configuracao','configuracoes']
};

function storePolicy(policy){
  if(!policy||typeof policy!=='object')return;
  window.__JOHN_TENANT_POLICY__=policy;
  try{
    localStorage.setItem('john_tenant_policy_v1',JSON.stringify(policy));
  }catch(_){}
}

function loadStoredPolicy(){
  if(window.__JOHN_TENANT_POLICY__)return window.__JOHN_TENANT_POLICY__;
  try{
    const p=parse(localStorage.getItem('john_tenant_policy_v1')||'null',null);
    if(p)window.__JOHN_TENANT_POLICY__=p;
  }catch(_){}
  return window.__JOHN_TENANT_POLICY__||null;
}

function moduleForElement(el){
  const text=normalizeText(el?.textContent||el?.getAttribute?.('aria-label')||'');
  if(!text)return '';
  for(const [key,terms] of Object.entries(MODULE_MATCHERS)){
    if(terms.some(term=>text.includes(term)))return key;
  }
  return '';
}

function applyTenantPolicy(){
  const policy=loadStoredPolicy();
  const modules=policy?.modules;
  if(!modules||typeof modules!=='object')return;

  const candidates=[
    ...document.querySelectorAll('.nav button,.sidebar button,.nav a,.sidebar a')
  ];

  for(const el of candidates){
    if(el.id==='johnPlatformOwnerBtn')continue;
    const key=moduleForElement(el);
    if(!key)continue;

    const allowed=modules[key]!==false;
    el.dataset.johnModuleKey=key;
    el.dataset.johnModuleAllowed=allowed?'1':'0';
    if(!allowed){
      el.style.display='none';
      el.setAttribute('aria-hidden','true');
    }else if(el.dataset.johnPolicyHidden==='1'){
      el.style.display='';
      el.removeAttribute('aria-hidden');
      delete el.dataset.johnPolicyHidden;
    }

    if(!allowed)el.dataset.johnPolicyHidden='1';
  }
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
  setLoginError('Este acesso exige o link exclusivo da empresa.');
  p.innerHTML=`
    <b style="font-size:13px;color:#b45309">Link empresarial obrigatório</b>
    <div style="margin-top:6px;color:#64748b">
      Use o endereço exclusivo fornecido pela John Sistemas. Por segurança,
      esta tela não permite escolher ou trocar a empresa manualmente.
    </div>`;
}

function applyTenantManifest(){
  const link=document.querySelector('link[rel="manifest"]');
  if(!link||!window.__JOHN_TENANT__?.slug)return;
  try{
    if(window.__JOHN_TENANT_MANIFEST_URL__){
      URL.revokeObjectURL(window.__JOHN_TENANT_MANIFEST_URL__);
    }
    const name=S(window.__JOHN_TENANT__.name||window.__JOHN_TENANT__.slug||'Empresa');
    const manifest={
      name:`John Sistema ERP · ${name}`,
      short_name:(`John ERP · ${name}`).slice(0,30),
      start_url:`./?empresa=${encodeURIComponent(window.__JOHN_TENANT__.slug)}`,
      scope:'./',
      display:'standalone',
      background_color:'#ede9fe',
      theme_color:'#5b21b6',
      orientation:'any',
      icons:[
        {src:'./icons/icon-192.png',sizes:'192x192',type:'image/png'},
        {src:'./icons/icon-512.png',sizes:'512x512',type:'image/png'},
        {src:'./icons/icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable any'}
      ]
    };
    const blob=new Blob([JSON.stringify(manifest)],{type:'application/manifest+json'});
    const url=URL.createObjectURL(blob);
    window.__JOHN_TENANT_MANIFEST_URL__=url;
    link.href=url;
  }catch(e){
    console.warn('[John Multiempresa] manifest dinâmico:',e);
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
    storePolicy(x.policy||null);

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
        ${x.needsBootstrap?`
          <div style="margin-top:12px;padding:12px;border:1px solid #fed7aa;border-radius:10px;background:#fff7ed;color:#9a3412">
            <b>Empresa ainda não liberada.</b>
            <div style="margin-top:4px">
              O primeiro administrador deve ser criado pelo Proprietário da Plataforma.
              Nenhum token de ativação é solicitado nesta tela.
            </div>
          </div>`:''}`;
    }

    document.title='John Sistema ERP · '+window.__JOHN_TENANT__.name;
    applyTenantManifest();

    if(x.needsBootstrap){
      loginInputsEnabled(false);
      setLoginError('Empresa aguardando liberação pelo administrador da plataforma.');
    }else{
      loginInputsEnabled(true);
      setLoginError('');
    }

    renderTenantBadge();
    window.dispatchEvent(new CustomEvent('john:tenant-identity',{detail:window.__JOHN_TENANT__}));
    return x;
  }catch(e){
    window.__JOHN_TENANT__.ready=false;
    loginInputsEnabled(false);

    if(p){
      p.innerHTML=`
        <b style="color:#b91c1c">Empresa não localizada ou indisponível.</b>
        <div style="margin-top:7px">${esc(e.message)}</div>
        <div style="margin-top:9px;color:#64748b">
          Confira o link exclusivo recebido da John Sistemas ou contate o administrador.
        </div>`;
    }

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


async function enterSupportSession(){
  const current=parse(sessionStorage.getItem('pcp_sessao')||'null',null);
  const token=S(current?.cloudToken||'');
  const payload=tokenPayload(token);

  if(
    !tokenAlive(token) ||
    payload?.support!==true ||
    normSlug(payload?.slug||'')!==tenantSlug
  ){
    return false;
  }

  try{
    setLoginError('Abrindo Modo Suporte seguro...');

    const c=await api(tenantPath('/erp-session'),{
      headers:{'Authorization':'Bearer '+token}
    });

    if(c.support!==true){
      throw new Error('Sessão de suporte não reconhecida pelo servidor.');
    }

    storePolicy(c.policy||null);
    db=normalizeCloudDb(c.db);
    localStorage.setItem('pcp_app_v1',JSON.stringify(db));

    const proxy=(db.usuarios||[]).find(
      u=>['MASTER','ADMINISTRADOR'].includes(
        S(u.perfil||u.profile).toUpperCase()
      )&&S(u.status||'ATIVO').toUpperCase()==='ATIVO'
    );

    if(!proxy){
      throw new Error(
        'A empresa ainda não possui administrador ativo para abrir o Modo Suporte.'
      );
    }

    const cloud={
      ...parse(localStorage.getItem('john_cloud_config_v1')||'{}',{}),
      apiUrl:apiBase(),
      storeSlug:tenantSlug,
      apiKey:token,
      authMode:'SUPPORT_SESSION',
      autoSync:true,
      mirrorAuto:true
    };
    localStorage.setItem('john_cloud_config_v1',JSON.stringify(cloud));

    sessao={
      usuarioId:proxy.id,
      inicio:new Date().toISOString(),
      cloud:true,
      cloudToken:token,
      tenantId:S(c.tenant?.id||window.__JOHN_TENANT__.id),
      tenantSlug:S(c.tenant?.slug||tenantSlug),
      tenantName:S(c.tenant?.name||window.__JOHN_TENANT__.name),
      support:true,
      supportByName:S(c.supportByName||current?.supportByName||'Suporte John Sistemas')
    };
    sessionStorage.setItem('pcp_sessao',JSON.stringify(sessao));

    window.__JOHN_SUPPORT_MODE__={
      active:true,
      by:sessao.supportByName,
      tenant:sessao.tenantName
    };

    document.getElementById('loginScreen')?.classList.add('hidden');

    if(typeof aplicarAcessos==='function')aplicarAcessos();
    if(typeof resetSessionTimer==='function')resetSessionTimer();

    renderTenantBadge();
    renderSupportBadge();
    setTimeout(applyTenantPolicy,0);
    setTimeout(applyTenantPolicy,600);

    if(typeof inicializarAplicacaoAposLogin==='function'){
      setTimeout(inicializarAplicacaoAposLogin,0);
    }

    setLoginError('');
    window.dispatchEvent(new CustomEvent('john:session-ready',{detail:{tenant:tenantSlug,support:true}}));
    return true;
  }catch(e){
    console.warn('[John Multiempresa] suporte:',e);
    setLoginError(e.message);
    return false;
  }
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
      setLoginError('Empresa ainda não liberada. Contate o administrador da plataforma.');
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
      storePolicy(c.policy||null);

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
      setTimeout(applyTenantPolicy,0);
      setTimeout(applyTenantPolicy,600);

      if(typeof inicializarAplicacaoAposLogin==='function'){
        setTimeout(inicializarAplicacaoAposLogin,0);
      }
      window.dispatchEvent(new CustomEvent('john:session-ready',{detail:{tenant:tenantSlug,support:false}}));
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


function renderSupportBadge(){
  if(!window.__JOHN_SUPPORT_MODE__?.active)return;

  const host=
    document.querySelector('.topbar .actions') ||
    document.querySelector('.topbar');
  if(!host)return;

  let badge=document.getElementById('johnSupportBadge');
  if(!badge){
    badge=document.createElement('span');
    badge.id='johnSupportBadge';
    badge.style.cssText=
      'display:inline-flex;align-items:center;gap:6px;padding:7px 10px;'+
      'border-radius:999px;background:#fff7ed;color:#9a3412;border:1px solid #fed7aa;'+
      'font-size:11px;font-weight:950';
    host.prepend(badge);
  }

  badge.textContent='🛠 MODO SUPORTE · '+S(window.__JOHN_SUPPORT_MODE__.by||'John Sistemas');
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
      window.__JOHN_SUPPORT_MODE__=null;
      document.getElementById('johnSupportBadge')?.remove();
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

  const openedSupport=await enterSupportSession();

  installDynamicLogin();
  installLogoutSecurity();
  renderTenantBadge();
  renderSupportBadge();
  applyTenantPolicy();

  if(!openedSupport){
    setTimeout(applyTenantPolicy,800);
  }
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
  renderSupportBadge();
  applyTenantPolicy();
},1700);

const policyObserver=new MutationObserver(()=>{
  if(window.__JOHN_TENANT_POLICY__){
    clearTimeout(window.__johnPolicyTimer);
    window.__johnPolicyTimer=setTimeout(applyTenantPolicy,120);
  }
});
if(document.documentElement){
  policyObserver.observe(document.documentElement,{childList:true,subtree:true});
}

console.info(
  `[John ERP] Multiempresa V${VERSION} · tenant=${tenantSlug||'não informado'}`
);
})();