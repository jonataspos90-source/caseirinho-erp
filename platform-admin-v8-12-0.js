(function(){
'use strict';

if(window.__JOHN_PLATFORM_OWNER_8120__)return;
window.__JOHN_PLATFORM_OWNER_8120__=true;

const VERSION='8.12.0';
const API_DEFAULT='https://john-cloud-api-production.up.railway.app';
const MODULES=[
  ['dashboard','Dashboard'],
  ['pessoas','Pessoas'],
  ['produtos','Produtos'],
  ['lojas','Lojas'],
  ['arvoreMercadologica','Árvore Mercadológica'],
  ['compras','Compras'],
  ['notasFiscais','Notas Fiscais'],
  ['estoque','Estoque / Operações'],
  ['pcp','PCP'],
  ['comercial','Comercial'],
  ['pricing','Pricing'],
  ['vendas','Vendas / Pedidos'],
  ['financeiro','Financeiro'],
  ['convenio','Convênio'],
  ['contabil','Contábil'],
  ['crm','CRM'],
  ['ecommerce','E-commerce'],
  ['relatorios','Relatórios'],
  ['configuracao','Configuração']
];

const S=v=>String(v??'');

function parse(v,fallback={}){
  try{
    const x=JSON.parse(v);
    return x&&typeof x==='object'?x:fallback;
  }catch(_){return fallback}
}
function esc(v){
  return S(v).replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}
function slugify(v){
  return S(v).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-+|-+$/g,'')
    .slice(0,63);
}
function session(){
  return parse(sessionStorage.getItem('pcp_sessao')||'null',null);
}
function cloud(){
  return parse(localStorage.getItem('john_cloud_config_v1')||'{}',{});
}
function apiBase(){
  return S(cloud().apiUrl||API_DEFAULT).replace(/\/+$/,'');
}
function ownerToken(){
  const x=session();
  return S(x?.cloudToken||'');
}
async function api(path,opt={}){
  const token=ownerToken();
  if(!token)throw new Error('Faça login novamente para abrir a Administração da Plataforma.');

  const r=await fetch(apiBase()+path,{
    ...opt,
    cache:'no-store',
    headers:{
      'Content-Type':'application/json',
      'Cache-Control':'no-cache',
      'Authorization':'Bearer '+token,
      ...(opt.headers||{})
    }
  });

  let d={};
  try{d=await r.json()}catch(_){}
  if(!r.ok)throw new Error(d?.error||('HTTP '+r.status));
  return d;
}

function style(){
  if(document.getElementById('johnPlatformStyle'))return;
  const st=document.createElement('style');
  st.id='johnPlatformStyle';
  st.textContent=`
  #johnPlatformOverlay{
    position:fixed;inset:0;z-index:20050;background:rgba(15,23,42,.74);
    backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:22px;
  }
  #johnPlatformModal{
    width:min(1180px,97vw);height:min(860px,94vh);background:#f3fffc;color:#12342d;
    border-radius:24px;box-shadow:0 36px 110px rgba(2,44,34,.45);overflow:hidden;
    border:1px solid rgba(16,185,129,.28);display:flex;flex-direction:column;
  }
  .jpo-head{display:flex;justify-content:space-between;align-items:center;padding:18px 22px;
    background:linear-gradient(135deg,#ecfdf5,#f0fdfa);border-bottom:1px solid #a7f3d0}
  .jpo-brand{display:flex;align-items:center;gap:12px}.jpo-logo{width:42px;height:42px;border-radius:14px;
    background:linear-gradient(135deg,#10b981,#14b8a6);color:#fff;display:grid;place-items:center;font-weight:950}
  .jpo-title{font-size:18px;font-weight:950}.jpo-sub{font-size:11px;color:#6b8c84;margin-top:2px}
  .jpo-actions{display:flex;gap:8px}.jpo-btn{border:0;border-radius:11px;padding:10px 13px;
    font-weight:900;cursor:pointer;background:#ccfbf1;color:#0f766e}
  .jpo-btn:hover{filter:brightness(.97);transform:translateY(-1px)}
  .jpo-btn.primary{background:linear-gradient(135deg,#10b981,#14b8a6);color:#fff}
  .jpo-btn.danger{background:#ffe4e6;color:#be123c}.jpo-btn.warn{background:#fff7ed;color:#c2410c}
  .jpo-btn.dark{background:#134e4a;color:#fff}.jpo-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
  .jpo-scroll{overflow:auto;padding:18px 20px 24px;flex:1}
  .jpo-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
  .jpo-kpi{background:linear-gradient(135deg,#e7faf5,#f8fffd);border:1px solid #a7f3d0;border-radius:16px;padding:15px}
  .jpo-kpi small{font-size:10px;text-transform:uppercase;letter-spacing:.6px;color:#2dd4bf;font-weight:950}
  .jpo-kpi b{display:block;font-size:27px;margin-top:6px;color:#12342d}
  .jpo-grid{display:grid;grid-template-columns:370px 1fr;gap:16px}
  .jpo-card{background:#f8fffd;border:1px solid #b7efe2;border-radius:18px;padding:16px}
  .jpo-card h3{margin:0 0 13px;font-size:16px}
  .jpo-field{margin-bottom:10px}.jpo-field label{display:block;font-size:10px;text-transform:uppercase;
    letter-spacing:.5px;color:#55a99a;font-weight:950;margin-bottom:5px}
  .jpo-field input,.jpo-field select,.jpo-field textarea{
    width:100%;border:1px solid #b7e6dc;border-radius:10px;padding:10px;background:#fff;color:#12342d
  }
  .jpo-field textarea{min-height:72px;resize:vertical}
  .jpo-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .jpo-modules{display:grid;grid-template-columns:1fr 1fr;gap:5px 12px;max-height:220px;overflow:auto;
    padding:10px;border:1px solid #c8eee6;border-radius:11px;background:#fff}
  .jpo-check{display:flex!important;align-items:center;gap:7px!important;font-size:11px!important;color:#4a9e90!important;
    font-weight:800!important;margin:0!important}.jpo-check input{width:auto!important}
  .jpo-sep{border:0;border-top:1px solid #d4efe9;margin:14px 0}
  .jpo-list{display:grid;gap:10px}
  .jpo-tenant{display:grid;grid-template-columns:minmax(190px,1.4fr) 105px 95px 80px auto;gap:10px;align-items:center;
    padding:12px;border:1px solid #b8eee3;border-radius:14px;background:#fbfffe}
  .jpo-tenant.current{box-shadow:inset 0 0 0 2px rgba(20,184,166,.18)}
  .jpo-name{font-weight:950;font-size:15px}.jpo-slug{font-size:10px;color:#6f9d95;margin-top:3px}
  .jpo-badge{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:950}
  .jpo-badge.ok{background:#dcfce7;color:#15803d}.jpo-badge.off{background:#ffe4e6;color:#be123c}
  .jpo-badge.exp{background:#ffedd5;color:#c2410c}.jpo-meta{font-size:11px;color:#476f68;font-weight:800}
  .jpo-row-actions{display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap}
  .jpo-owner-pill{padding:6px 10px;border-radius:999px;background:#d1fae5;color:#047857;font-size:10px;font-weight:950}
  .jpo-empty{padding:24px;text-align:center;color:#6b8c84}
  .jpo-toast{position:fixed;right:26px;bottom:26px;z-index:20080;max-width:430px;background:#12342d;color:#fff;
    border-radius:14px;padding:14px 16px;box-shadow:0 18px 50px rgba(0,0,0,.28);font-size:13px}
  .jpo-token{word-break:break-all;background:#0f172a;color:#d1fae5;border-radius:12px;padding:12px;font-family:monospace;font-size:12px}
  #johnPlatformOwnerBtn{background:rgba(16,185,129,.24)!important;border:1px solid rgba(167,243,208,.42)!important}
  @media(max-width:900px){
    #johnPlatformOverlay{padding:8px}#johnPlatformModal{width:100%;height:97vh;border-radius:16px}
    .jpo-kpis{grid-template-columns:1fr 1fr}.jpo-grid{grid-template-columns:1fr}
    .jpo-tenant{grid-template-columns:1fr}.jpo-row-actions{justify-content:flex-start}
  }`;
  document.head.appendChild(st);
}

function toast(message){
  document.querySelector('.jpo-toast')?.remove();
  const t=document.createElement('div');
  t.className='jpo-toast';
  t.textContent=S(message);
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),4200);
}

let state={
  owner:null,
  overview:null,
  editing:null
};

function modulesHtml(selected={}){
  return MODULES.map(([key,label])=>`
    <label class="jpo-check">
      <input type="checkbox" data-jpo-module="${esc(key)}" ${selected[key]!==false?'checked':''}>
      <span>${esc(label)}</span>
    </label>
  `).join('');
}

function formHtml(){
  return `
    <div class="jpo-card">
      <h3 id="jpoFormTitle">Nova empresa</h3>

      <div class="jpo-field">
        <label>Nome da empresa</label>
        <input id="jpoName" placeholder="Ex.: Empresa Silva">
      </div>

      <div class="jpo-field">
        <label>Código para login</label>
        <input id="jpoSlug" placeholder="empresa-silva">
        <div style="font-size:9px;color:#6b9e95;margin-top:4px">A empresa usará este código na tela de login.</div>
      </div>

      <div class="jpo-two">
        <div class="jpo-field">
          <label>Plano</label>
          <select id="jpoPlan">
            <option value="STANDARD">Standard</option>
            <option value="PRO">Pro</option>
            <option value="PREMIUM">Premium</option>
            <option value="ENTERPRISE">Enterprise</option>
          </select>
        </div>
        <div class="jpo-field">
          <label>Status</label>
          <select id="jpoStatus">
            <option value="ACTIVE">Ativa</option>
            <option value="SUSPENDED">Suspensa</option>
          </select>
        </div>
      </div>

      <div class="jpo-two">
        <div class="jpo-field">
          <label>Máx. usuários ativos</label>
          <input id="jpoMaxUsers" type="number" min="1" value="10">
        </div>
        <div class="jpo-field">
          <label>Validade</label>
          <input id="jpoValidUntil" type="date">
        </div>
      </div>

      <div class="jpo-field">
        <label>Módulos liberados</label>
        <div class="jpo-modules" id="jpoModules">${modulesHtml({})}</div>
      </div>

      <div class="jpo-field">
        <label>Observações internas do Proprietário</label>
        <textarea id="jpoNotes" placeholder="Não aparece para a empresa"></textarea>
      </div>

      <div id="jpoInitialAdminBox">
        <hr class="jpo-sep">
        <h3 style="font-size:13px;margin-bottom:10px">Administrador inicial da nova empresa</h3>
        <div class="jpo-field"><label>Nome</label><input id="jpoAdminName"></div>
        <div class="jpo-two">
          <div class="jpo-field"><label>Login</label><input id="jpoAdminLogin" autocomplete="off"></div>
          <div class="jpo-field"><label>E-mail</label><input id="jpoAdminEmail" type="email"></div>
        </div>
        <div class="jpo-field"><label>Senha temporária</label><input id="jpoAdminPassword" type="password" autocomplete="new-password"></div>
      </div>

      <div style="display:flex;gap:8px;margin-top:13px">
        <button class="jpo-btn primary" id="jpoSaveTenant">Criar empresa</button>
        <button class="jpo-btn" id="jpoCancelEdit" style="display:none">Cancelar edição</button>
      </div>
    </div>`;
}

function statusBadge(t){
  const st=S(t.effectiveStatus||t.status).toUpperCase();
  if(st==='EXPIRED')return '<span class="jpo-badge exp">Expirada</span>';
  if(st==='SUSPENDED'||t.active===false)return '<span class="jpo-badge off">Suspensa</span>';
  return '<span class="jpo-badge ok">Ativa</span>';
}

function tenantRow(t){
  const current=S(t.slug)===S(window.__JOHN_TENANT__?.slug);
  return `
    <div class="jpo-tenant ${current?'current':''}" data-tenant-id="${esc(t.id)}">
      <div>
        <div class="jpo-name">${esc(t.name)}</div>
        <div class="jpo-slug">${esc(t.slug)}</div>
      </div>
      <div>${statusBadge(t)}<div class="jpo-slug">${esc(t.planCode)}</div></div>
      <div class="jpo-meta">${t.userCount}/${t.maxUsers||'—'}<div class="jpo-slug">usuários</div></div>
      <div class="jpo-meta">${t.moduleCount}/${t.moduleTotal}<div class="jpo-slug">módulos</div></div>
      <div class="jpo-row-actions">
        <button class="jpo-btn dark" data-act="enter" data-id="${esc(t.id)}" ${t.userCount<1?'disabled':''}>Entrar</button>
        <button class="jpo-btn" data-act="edit" data-id="${esc(t.id)}">Editar</button>
        ${t.userCount<1?`<button class="jpo-btn" data-act="master" data-id="${esc(t.id)}">Criar MASTER</button>`:''}
        ${
          t.isOwnerTenant
          ?`<span class="jpo-owner-pill">Sistema</span>`
          :(
            t.active!==false&&S(t.effectiveStatus)!=='SUSPENDED'
            ?`<button class="jpo-btn danger" data-act="suspend" data-id="${esc(t.id)}">Suspender</button>`
            :`<button class="jpo-btn primary" data-act="activate" data-id="${esc(t.id)}">Ativar</button>`
          )
        }
      </div>
    </div>`;
}

function overviewHtml(o){
  const tenants=Array.isArray(o?.tenants)?o.tenants:[];
  const owner=state.owner||o?.currentOwner||{};
  return `
    <div class="jpo-head">
      <div class="jpo-brand">
        <div class="jpo-logo">JF</div>
        <div>
          <div class="jpo-title">Administração da Plataforma</div>
          <div class="jpo-sub">Controle exclusivo do Proprietário · Multiempresa</div>
        </div>
      </div>
      <div class="jpo-actions">
        <span class="jpo-owner-pill">Proprietário: ${esc(owner.name||owner.login||'')}</span>
        <button class="jpo-btn" id="jpoRefresh">↻ Atualizar</button>
        <button class="jpo-btn" id="jpoClose">✕</button>
      </div>
    </div>
    <div class="jpo-scroll">
      <div class="jpo-kpis">
        <div class="jpo-kpi"><small>Empresas</small><b>${Number(o?.summary?.companies||0)}</b></div>
        <div class="jpo-kpi"><small>Ativas</small><b>${Number(o?.summary?.active||0)}</b></div>
        <div class="jpo-kpi"><small>Usuários</small><b>${Number(o?.summary?.users||0)}</b></div>
        <div class="jpo-kpi"><small>Bloqueadas / Expiradas</small><b>${Number(o?.summary?.blockedOrExpired||0)}</b></div>
      </div>

      <div class="jpo-grid">
        ${formHtml()}
        <div class="jpo-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:13px">
            <h3 style="margin:0">Empresas cadastradas</h3>
            <span class="jpo-owner-pill">Atual: ${esc(window.__JOHN_TENANT__?.name||'')}</span>
          </div>
          <div class="jpo-list" id="jpoTenantList">
            ${tenants.length?tenants.map(tenantRow).join(''):'<div class="jpo-empty">Nenhuma empresa cadastrada.</div>'}
          </div>
        </div>
      </div>
    </div>`;
}

function selectedModules(){
  const out={};
  for(const [key] of MODULES){
    out[key]=document.querySelector(`[data-jpo-module="${key}"]`)?.checked!==false;
  }
  return out;
}

function clearForm(){
  state.editing=null;
  const ids=['jpoName','jpoSlug','jpoNotes','jpoAdminName','jpoAdminLogin','jpoAdminEmail','jpoAdminPassword'];
  ids.forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});
  const max=document.getElementById('jpoMaxUsers');if(max)max.value='10';
  const val=document.getElementById('jpoValidUntil');if(val)val.value='';
  const plan=document.getElementById('jpoPlan');if(plan)plan.value='STANDARD';
  const status=document.getElementById('jpoStatus');if(status){status.value='ACTIVE';status.disabled=false}
  document.querySelectorAll('[data-jpo-module]').forEach(x=>x.checked=true);

  const slug=document.getElementById('jpoSlug');if(slug)slug.disabled=false;
  const admin=document.getElementById('jpoInitialAdminBox');if(admin)admin.style.display='';
  const save=document.getElementById('jpoSaveTenant');if(save)save.textContent='Criar empresa';
  const cancel=document.getElementById('jpoCancelEdit');if(cancel)cancel.style.display='none';
  const title=document.getElementById('jpoFormTitle');if(title)title.textContent='Nova empresa';
}

function fillEdit(t){
  state.editing=t;
  document.getElementById('jpoName').value=t.name||'';
  document.getElementById('jpoSlug').value=t.slug||'';
  document.getElementById('jpoSlug').disabled=true;
  document.getElementById('jpoPlan').value=t.planCode||'STANDARD';
  const statusEl=document.getElementById('jpoStatus');
  statusEl.value=
    (t.active===false||S(t.status).toUpperCase()==='SUSPENDED')?'SUSPENDED':'ACTIVE';
  statusEl.disabled=!!t.isOwnerTenant;
  document.getElementById('jpoMaxUsers').value=Number(t.maxUsers||10);
  document.getElementById('jpoValidUntil').value=t.validUntil||'';
  document.getElementById('jpoNotes').value=t.internalNotes||'';
  document.querySelectorAll('[data-jpo-module]').forEach(x=>{
    x.checked=t.modules?.[x.dataset.jpoModule]!==false;
  });
  document.getElementById('jpoInitialAdminBox').style.display='none';
  document.getElementById('jpoSaveTenant').textContent='Salvar alterações';
  document.getElementById('jpoCancelEdit').style.display='';
  document.getElementById('jpoFormTitle').textContent='Editar empresa';
  document.querySelector('.jpo-scroll')?.scrollTo({top:0,behavior:'smooth'});
}

function bodyPayload(){
  return {
    name:S(document.getElementById('jpoName')?.value).trim(),
    slug:slugify(document.getElementById('jpoSlug')?.value),
    planCode:S(document.getElementById('jpoPlan')?.value||'STANDARD'),
    status:S(document.getElementById('jpoStatus')?.value||'ACTIVE'),
    maxUsers:Number(document.getElementById('jpoMaxUsers')?.value||10),
    validUntil:S(document.getElementById('jpoValidUntil')?.value||''),
    modules:selectedModules(),
    internalNotes:S(document.getElementById('jpoNotes')?.value||'')
  };
}

async function saveTenant(){
  const btn=document.getElementById('jpoSaveTenant');
  const body=bodyPayload();

  if(body.name.length<2){
    toast('Informe o nome da empresa.');
    return;
  }
  if(!state.editing&&body.slug.length<3){
    toast('Informe um código válido para login.');
    return;
  }

  if(!state.editing){
    const adminName=S(document.getElementById('jpoAdminName')?.value).trim();
    const adminLogin=S(document.getElementById('jpoAdminLogin')?.value).trim().toLowerCase();
    const adminEmail=S(document.getElementById('jpoAdminEmail')?.value).trim();
    const adminPassword=S(document.getElementById('jpoAdminPassword')?.value);

    if(adminName.length<2||adminLogin.length<3||adminPassword.length<8){
      toast('Preencha o administrador inicial e use uma senha com pelo menos 8 caracteres.');
      return;
    }

    body.initialAdmin={
      name:adminName,
      login:adminLogin,
      email:adminEmail,
      password:adminPassword
    };
  }else{
    delete body.slug;
  }

  if(btn){btn.disabled=true;btn.textContent='Salvando...'}
  try{
    if(state.editing){
      await api('/api/v1/platform-owner/tenants/'+encodeURIComponent(state.editing.id),{
        method:'PATCH',body:JSON.stringify(body)
      });
      toast('Empresa atualizada.');
    }else{
      const x=await api('/api/v1/platform-owner/tenants',{
        method:'POST',body:JSON.stringify(body)
      });
      toast('Empresa criada com MASTER inicial.');

      if(x.bootstrap?.token){
        showTokenModal(x.bootstrap.token,x.bootstrap.expiresAt);
      }
    }

    clearForm();
    await refresh();
  }catch(e){
    toast(e.message);
  }finally{
    if(btn){btn.disabled=false;btn.textContent=state.editing?'Salvar alterações':'Criar empresa'}
  }
}

function showTokenModal(token,expiresAt){
  const box=document.createElement('div');
  box.id='jpoTokenModal';
  box.style.cssText='position:absolute;inset:0;z-index:4;background:rgba(15,23,42,.65);display:grid;place-items:center;padding:20px';
  box.innerHTML=`
    <div class="jpo-card" style="width:min(560px,96%);background:#fff">
      <h3>Código temporário</h3>
      <p style="font-size:12px;color:#64748b">Guarde este código. Ele não será exibido novamente.</p>
      <div class="jpo-token">${esc(token)}</div>
      <div style="font-size:10px;color:#64748b;margin-top:7px">Expira: ${esc(expiresAt||'')}</div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button class="jpo-btn primary" id="jpoCopyToken">Copiar</button>
        <button class="jpo-btn" id="jpoCloseToken">Fechar</button>
      </div>
    </div>`;
  document.getElementById('johnPlatformModal')?.appendChild(box);
  document.getElementById('jpoCloseToken').onclick=()=>box.remove();
  document.getElementById('jpoCopyToken').onclick=async()=>{
    try{await navigator.clipboard.writeText(token);toast('Código copiado.')}catch(_){toast('Não foi possível copiar automaticamente.')}
  };
}

async function createInitialMaster(t){
  const name=prompt('Nome do primeiro administrador:','');
  if(!name)return;
  const login=prompt('Login do primeiro administrador:','');
  if(!login)return;
  const password=prompt('Senha temporária (mínimo 8 caracteres):','');
  if(!password)return;
  const email=prompt('E-mail (opcional):','')||'';

  try{
    await api('/api/v1/platform-owner/tenants/'+encodeURIComponent(t.id)+'/initial-master',{
      method:'POST',
      body:JSON.stringify({name,login:login.toLowerCase(),password,email})
    });
    toast('MASTER criado. A empresa já pode entrar.');
    await refresh();
  }catch(e){toast(e.message)}
}

async function supportEnter(t){
  try{
    const x=await api('/api/v1/platform-owner/tenants/'+encodeURIComponent(t.id)+'/support-session',{
      method:'POST',
      body:'{}'
    });
    const u=new URL(location.href);
    u.search='';
    u.searchParams.set('empresa',t.slug);
    u.hash='john-support='+encodeURIComponent(x.token);
    window.open(u.toString(),'_blank','noopener');
    toast('Modo Suporte aberto em nova aba por 60 minutos.');
  }catch(e){toast(e.message)}
}

async function toggleTenant(t,action){
  try{
    await api('/api/v1/platform-owner/tenants/'+encodeURIComponent(t.id)+'/'+action,{
      method:'POST',body:'{}'
    });
    toast(action==='suspend'?'Empresa suspensa.':'Empresa ativada.');
    await refresh();
  }catch(e){toast(e.message)}
}

async function refresh(){
  const x=await api('/api/v1/platform-owner/overview');
  state.overview=x;
  const modal=document.getElementById('johnPlatformModal');
  if(modal){
    modal.innerHTML=overviewHtml(x);
    wire();
  }
}

function tenantById(id){
  return (state.overview?.tenants||[]).find(x=>S(x.id)===S(id));
}

function wire(){
  document.getElementById('jpoClose').onclick=closePanel;
  document.getElementById('jpoRefresh').onclick=()=>refresh().catch(e=>toast(e.message));
  document.getElementById('jpoSaveTenant').onclick=saveTenant;
  document.getElementById('jpoCancelEdit').onclick=clearForm;

  const name=document.getElementById('jpoName');
  const slug=document.getElementById('jpoSlug');
  if(name&&slug){
    name.addEventListener('input',()=>{
      if(!state.editing&&!slug.dataset.touched)slug.value=slugify(name.value);
    });
    slug.addEventListener('input',()=>slug.dataset.touched='1');
  }

  document.getElementById('jpoTenantList')?.addEventListener('click',async e=>{
    const b=e.target.closest('button[data-act]');
    if(!b)return;
    const t=tenantById(b.dataset.id);
    if(!t)return;

    const act=b.dataset.act;
    if(act==='edit')return fillEdit(t);
    if(act==='enter')return supportEnter(t);
    if(act==='master')return createInitialMaster(t);

    if(act==='suspend'){
      if(!confirm(`Suspender ${t.name}? O cliente deixará de entrar até você reativar.`))return;
      return toggleTenant(t,'suspend');
    }
    if(act==='activate')return toggleTenant(t,'activate');
  });
}

async function openPanel(){
  style();

  let overlay=document.getElementById('johnPlatformOverlay');
  if(overlay)return;

  overlay=document.createElement('div');
  overlay.id='johnPlatformOverlay';
  overlay.innerHTML=`
    <div id="johnPlatformModal">
      <div class="jpo-head">
        <div class="jpo-brand"><div class="jpo-logo">JF</div><div>
          <div class="jpo-title">Administração da Plataforma</div>
          <div class="jpo-sub">Carregando empresas...</div>
        </div></div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  try{
    await refresh();
  }catch(e){
    toast(e.message);
    overlay.remove();
  }
}

function closePanel(){
  document.getElementById('johnPlatformOverlay')?.remove();
}

function installButton(owner){
  style();
  state.owner=owner;

  const nav=document.querySelector('.nav')||document.querySelector('.sidebar');
  if(!nav||document.getElementById('johnPlatformOwnerBtn'))return;

  const b=document.createElement('button');
  b.id='johnPlatformOwnerBtn';
  b.type='button';
  b.innerHTML='🏢 Administração da Plataforma';
  b.onclick=openPanel;
  nav.appendChild(b);
}

async function discover(){
  const sess=session();
  if(!sess?.cloudToken||sess?.support===true)return false;

  try{
    const x=await api('/api/v1/platform-owner/me');
    if(x?.ok&&x?.owner){
      installButton(x.owner);
      return true;
    }
  }catch(_){}
  return false;
}

let attempts=0;
const timer=setInterval(async()=>{
  attempts++;
  const ok=await discover();
  if(ok||attempts>35)clearInterval(timer);
},700);

if(document.readyState!=='loading'){
  discover();
}else{
  document.addEventListener('DOMContentLoaded',()=>discover(),{once:true});
}

console.info('[John ERP] Administração da Plataforma V'+VERSION);
})();