(function(){
'use strict';
if(window.__JOHN_ECOMMERCE_BATCH_MEDIA_82216__)return;
window.__JOHN_ECOMMERCE_BATCH_MEDIA_82216__=true;

const VERSION='8.22.16';
const DB_FALLBACK='pcp_app_v1';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stableUrl=v=>/^https?:\/\//i.test(S(v).trim());
let draftUpload=null;
let bootTimer=null;

function storage(){try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}catch(_){return localStorage}}
function dbRef(){try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){}return window.db||null}
function dbKey(){try{return typeof DB_KEY!=='undefined'?DB_KEY:DB_FALLBACK}catch(_){return DB_FALLBACK}}
function persistDb(){const d=dbRef();if(!d)return false;try{storage().setItem(dbKey(),JSON.stringify(d));return true}catch(e){console.warn('[John '+VERSION+'] persistência:',e);return false}}
function toastMsg(msg){try{if(typeof toast==='function')return toast(msg)}catch(_){}console.info('[John '+VERSION+']',msg)}
function value(id){return S(document.getElementById(id)?.value).trim()}
function draftIdentity(){return {id:value('produtoId'),codigo:value('produtoCodigo'),nome:value('produtoNome')}}
function sameText(a,b){return norm(a)&&norm(a)===norm(b)}
function resolveProduct(identity=draftIdentity()){
  const d=dbRef();if(!d||!Array.isArray(d.produtos))return null;
  let p=null;
  if(identity.id)p=d.produtos.find(x=>S(x?.id)===identity.id)||null;
  if(!p&&identity.codigo)p=d.produtos.find(x=>S(x?.codigo)===identity.codigo)||null;
  if(!p&&identity.nome)p=[...d.produtos].reverse().find(x=>sameText(x?.nome,identity.nome))||null;
  return p;
}
function galleryUrls(){
  const out=[];
  document.querySelectorAll('#produtoEcomGaleria [data-strict-media-url], #produtoEcomGaleria img').forEach(node=>{
    const card=node.closest?.('[data-strict-media-url]');
    const u=S(card?.dataset?.strictMediaUrl||node.getAttribute?.('src')||node.src).trim();
    if(stableUrl(u)&&!out.includes(u))out.push(u);
  });
  const direct=value('produtoEcomImagem');if(stableUrl(direct)&&!out.includes(direct))out.push(direct);
  return out.slice(0,5);
}
function attachUrls(p,urls){
  if(!p||!urls.length)return false;
  const e=p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'&&!Array.isArray(p.ecommerce)?p.ecommerce:{};
  const existing=[e.imagem,...A(e.imagens)].map(S).filter(Boolean);
  const merged=[...new Set([...urls,...existing])].slice(0,5);
  e.imagem=merged[0]||'';e.imagens=merged;
  p.atualizadoEm=new Date().toISOString();p.operadorAtualizacao='John ERP '+VERSION;
  persistDb();
  try{if(typeof renderImages==='function')renderImages()}catch(_){}
  try{window.renderEcomProducts?.()}catch(_){}
  try{window.renderOnline?.()}catch(_){}
  return true;
}
function setMediaStatus(msg,error=false){
  const el=document.getElementById('produtoEcomUploadStatus');if(!el)return;
  el.textContent=msg;el.style.color=error?'#b42318':'#15803d';
}
async function publishSilent(){
  const fn=window.publicarCatalogoEcommerce||window.JohnCaseirinhoCatalogSync821?.publish;
  if(typeof fn!=='function')return false;
  await fn(true);return true;
}
function rememberUploadedDraft(){
  const urls=galleryUrls();if(!urls.length)return;
  const identity=draftIdentity();if(!identity.id&&!identity.codigo&&!identity.nome)return;
  draftUpload={identity,urls,at:Date.now()};
}
function rescueDraftUpload(){
  if(!draftUpload||Date.now()-draftUpload.at>120000)return false;
  const p=resolveProduct(draftUpload.identity);if(!p)return false;
  if(!attachUrls(p,draftUpload.urls))return false;
  setMediaStatus(`${draftUpload.urls.length} foto(s) vinculada(s) ao produto e salva(s) no servidor.`);
  const urls=[...draftUpload.urls];draftUpload=null;
  setTimeout(()=>publishSilent().then(()=>setMediaStatus(`${urls.length} foto(s) vinculada(s) e publicadas no E-commerce.`)).catch(err=>setMediaStatus('Foto vinculada, mas a publicação falhou: '+(err?.message||err),true)),120);
  return true;
}
function installMediaRescue(){
  if(document.documentElement.dataset.batchMediaRescue82216==='1')return;
  document.documentElement.dataset.batchMediaRescue82216='1';
  document.addEventListener('change',ev=>{if(ev.target?.id==='produtoEcomArquivos')setTimeout(rememberUploadedDraft,120)},true);
  document.addEventListener('click',ev=>{
    const t=ev.target?.closest?.('button');if(!t)return;
    if(/adicionar fotos/i.test(S(t.textContent)))setTimeout(rememberUploadedDraft,250);
  },true);
  document.addEventListener('submit',ev=>{
    if(ev.target?.id!=='produtoForm')return;
    const urls=galleryUrls();
    if(urls.length)draftUpload={identity:draftIdentity(),urls,at:Date.now()};
    [80,220,450,900,1600].forEach(ms=>setTimeout(rescueDraftUpload,ms));
  },true);
  const obs=new MutationObserver(()=>{
    const st=document.getElementById('produtoEcomUploadStatus');
    if(st&&/não conseguiu localizar o produto|produto não foi localizado/i.test(S(st.textContent))){
      rememberUploadedDraft();
      [0,220,650,1300].forEach(ms=>setTimeout(rescueDraftUpload,ms));
    }
  });
  obs.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
}

function allProducts(){return A(dbRef()?.produtos)}
function productTypes(p){
  const vals=[...A(p?.tipos),p?.tipo,p?.tipoProduto,p?.grupo,p?.categoria].map(S).map(x=>x.trim()).filter(Boolean);
  return [...new Set(vals)];
}
function typeOptions(){return [...new Set(allProducts().flatMap(productTypes))].sort((a,b)=>a.localeCompare(b,'pt-BR'))}
function commercialName(p){return S(p?.ecommerce?.nomeComercial||p?.nome).trim()}
function ensureEcom(p){return p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'&&!Array.isArray(p.ecommerce)?p.ecommerce:{}}

function css(){
  if(document.getElementById('johnBatchCss82216'))return;
  const s=document.createElement('style');s.id='johnBatchCss82216';s.textContent=`
#johnBatchModal82216{position:fixed;inset:0;z-index:2147483200;background:rgba(15,23,42,.5);display:none;align-items:center;justify-content:center;padding:24px}
#johnBatchModal82216.open{display:flex}.jb-box{width:min(1180px,96vw);max-height:92vh;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(15,23,42,.26);overflow:hidden;display:flex;flex-direction:column}.jb-head{padding:18px 22px;border-bottom:1px solid #e5e7eb;display:flex;gap:14px;align-items:center;justify-content:space-between}.jb-head h2{margin:0;font-size:20px}.jb-body{padding:18px 22px;overflow:auto}.jb-filters{display:grid;grid-template-columns:1.1fr 1fr 1fr auto;gap:10px;align-items:end;margin-bottom:14px}.jb-filters label,.jb-tools label{font-size:12px;font-weight:700;color:#475569;display:block;margin-bottom:5px}.jb-filters select,.jb-filters input,.jb-tools input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px 11px;background:#fff}.jb-tools{display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:10px;align-items:end;margin:0 0 14px}.jb-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer}.jb-primary{background:#4f46e5;color:#fff}.jb-secondary{background:#eef2ff;color:#3730a3}.jb-danger{background:#fee2e2;color:#991b1b}.jb-table-wrap{border:1px solid #e2e8f0;border-radius:12px;overflow:auto;max-height:52vh}.jb-table{width:100%;border-collapse:collapse;min-width:860px}.jb-table th{position:sticky;top:0;background:#f8fafc;z-index:1;text-align:left;font-size:12px;color:#475569;padding:9px;border-bottom:1px solid #e2e8f0}.jb-table td{padding:8px 9px;border-bottom:1px solid #f1f5f9;vertical-align:middle}.jb-table input[type=text]{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:8px;padding:8px}.jb-muted{color:#64748b;font-size:12px}.jb-foot{padding:14px 22px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;gap:12px;align-items:center}.jb-count{font-size:13px;color:#475569}.jb-inline-check{display:flex;align-items:center;gap:7px;font-weight:700;font-size:13px}.jb-ecom-btn{margin-left:10px}.jb-preview{font-size:12px;color:#64748b;white-space:nowrap;max-width:210px;overflow:hidden;text-overflow:ellipsis}
@media(max-width:850px){.jb-filters,.jb-tools{grid-template-columns:1fr 1fr}.jb-box{width:98vw}.jb-foot{align-items:flex-start;flex-direction:column}}
`;
  document.head.appendChild(s);
}
function modal(){
  css();let m=document.getElementById('johnBatchModal82216');if(m)return m;
  m=document.createElement('div');m.id='johnBatchModal82216';
  m.innerHTML=`<div class="jb-box"><div class="jb-head"><div><h2>Manutenção em lote do E-commerce</h2><div class="jb-muted">Altere o Nome Comercial por tipo de produto sem modificar o nome interno do ERP.</div></div><button type="button" class="jb-btn jb-secondary" data-jb-close>Fechar</button></div><div class="jb-body">
    <div class="jb-filters"><div><label>Tipo de produto</label><select id="jbType82216"><option value="">Todos os tipos</option></select></div><div><label>Pesquisar produto</label><input id="jbSearch82216" type="search" placeholder="Nome, código ou nome comercial"></div><div><label>Status E-commerce</label><select id="jbStatus82216"><option value="TODOS">Todos</option><option value="PUBLICADOS">Somente publicados</option><option value="NAO_PUBLICADOS">Não publicados</option></select></div><button type="button" class="jb-btn jb-secondary" id="jbReload82216">Atualizar lista</button></div>
    <div class="jb-tools"><div><label>Localizar</label><input id="jbFind82216" placeholder="Texto atual"></div><div><label>Substituir por</label><input id="jbReplace82216" placeholder="Novo texto"></div><div><label>Prefixo</label><input id="jbPrefix82216" placeholder="Ex.: Artesanal "></div><div><label>Sufixo</label><input id="jbSuffix82216" placeholder="Ex.: 500 g"></div><button type="button" class="jb-btn jb-secondary" id="jbApplyTools82216">Aplicar aos selecionados</button></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"><button type="button" class="jb-btn jb-secondary" id="jbCopyErp82216">Copiar Nome ERP → Comercial</button><button type="button" class="jb-btn jb-secondary" id="jbSelectAll82216">Selecionar visíveis</button><button type="button" class="jb-btn jb-secondary" id="jbClearSel82216">Limpar seleção</button></div>
    <div class="jb-table-wrap"><table class="jb-table"><thead><tr><th style="width:42px"></th><th style="width:110px">Código</th><th>Nome ERP</th><th style="width:180px">Tipo</th><th style="width:390px">Nome Comercial</th><th style="width:120px">Publicação</th></tr></thead><tbody id="jbRows82216"></tbody></table></div>
  </div><div class="jb-foot"><div><div class="jb-count" id="jbCount82216"></div><label class="jb-inline-check"><input type="checkbox" id="jbPublish82216" checked> Publicar catálogo após salvar</label></div><div style="display:flex;gap:8px"><button type="button" class="jb-btn jb-secondary" data-jb-close>Cancelar</button><button type="button" class="jb-btn jb-primary" id="jbSave82216">Salvar alterações selecionadas</button></div></div></div>`;
  document.body.appendChild(m);
  m.querySelectorAll('[data-jb-close]').forEach(b=>b.onclick=()=>m.classList.remove('open'));
  m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});
  document.getElementById('jbType82216').onchange=renderRows;
  document.getElementById('jbSearch82216').oninput=renderRows;
  document.getElementById('jbStatus82216').onchange=renderRows;
  document.getElementById('jbReload82216').onclick=()=>{fillTypes();renderRows()};
  document.getElementById('jbSelectAll82216').onclick=()=>{document.querySelectorAll('#jbRows82216 .jb-select').forEach(x=>x.checked=true);updateCount()};
  document.getElementById('jbClearSel82216').onclick=()=>{document.querySelectorAll('#jbRows82216 .jb-select').forEach(x=>x.checked=false);updateCount()};
  document.getElementById('jbCopyErp82216').onclick=()=>applyToSelected((p)=>S(p.nome));
  document.getElementById('jbApplyTools82216').onclick=applyTextTools;
  document.getElementById('jbSave82216').onclick=saveBatch;
  return m;
}
function fillTypes(){
  const sel=document.getElementById('jbType82216');if(!sel)return;const current=sel.value;
  sel.innerHTML='<option value="">Todos os tipos</option>'+typeOptions().map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  if([...sel.options].some(o=>o.value===current))sel.value=current;
}
function filteredProducts(){
  const type=S(document.getElementById('jbType82216')?.value),q=norm(document.getElementById('jbSearch82216')?.value),status=S(document.getElementById('jbStatus82216')?.value||'TODOS');
  return allProducts().filter(p=>{
    if(type&&!productTypes(p).some(x=>x===type))return false;
    const pub=p?.ecommerce?.publicar===true;
    if(status==='PUBLICADOS'&&!pub)return false;if(status==='NAO_PUBLICADOS'&&pub)return false;
    if(q&&!norm([p?.codigo,p?.nome,commercialName(p),productTypes(p).join(' ')].join(' ')).includes(q))return false;
    return true;
  }).sort((a,b)=>S(a?.nome).localeCompare(S(b?.nome),'pt-BR'));
}
function productKey(p,i){return S(p?.id||p?.codigo||('idx-'+i))}
function renderRows(){
  const body=document.getElementById('jbRows82216');if(!body)return;
  const list=filteredProducts();
  body.innerHTML=list.map((p,i)=>{const key=productKey(p,i),types=productTypes(p).join(', ')||'-',pub=p?.ecommerce?.publicar===true;
    return `<tr data-key="${esc(key)}"><td><input class="jb-select" type="checkbox" checked></td><td>${esc(p?.codigo||'-')}</td><td><b>${esc(p?.nome||'-')}</b></td><td><span class="jb-preview" title="${esc(types)}">${esc(types)}</span></td><td><input class="jb-name" type="text" value="${esc(commercialName(p))}"></td><td>${pub?'Publicado':'Não publicado'}</td></tr>`}).join('')||'<tr><td colspan="6" class="jb-muted" style="padding:20px">Nenhum produto encontrado para os filtros selecionados.</td></tr>';
  body.querySelectorAll('.jb-select').forEach(x=>x.onchange=updateCount);updateCount();
}
function rowProduct(row){const key=S(row?.dataset?.key);return allProducts().find((p,i)=>productKey(p,i)===key)||null}
function selectedRows(){return [...document.querySelectorAll('#jbRows82216 tr[data-key]')].filter(r=>r.querySelector('.jb-select')?.checked)}
function updateCount(){
  const el=document.getElementById('jbCount82216');if(!el)return;
  const visible=document.querySelectorAll('#jbRows82216 tr[data-key]').length,selected=selectedRows().length;
  el.textContent=`${visible} produto(s) visível(is) · ${selected} selecionado(s)`;
}
function applyToSelected(fn){for(const row of selectedRows()){const p=rowProduct(row),input=row.querySelector('.jb-name');if(p&&input)input.value=S(fn(p,input.value)).trim()}updateCount()}
function applyTextTools(){
  const find=S(document.getElementById('jbFind82216')?.value),replace=S(document.getElementById('jbReplace82216')?.value),prefix=S(document.getElementById('jbPrefix82216')?.value),suffix=S(document.getElementById('jbSuffix82216')?.value);
  applyToSelected((p,current)=>{let x=S(current);if(find)x=x.split(find).join(replace);if(prefix&&!x.startsWith(prefix))x=prefix+x;if(suffix&&!x.endsWith(suffix))x=x+suffix;return x});
}
async function saveBatch(){
  const rows=selectedRows();if(!rows.length)return toastMsg('Selecione pelo menos um produto.');
  let changed=0;
  for(const row of rows){const p=rowProduct(row),input=row.querySelector('.jb-name');if(!p||!input)continue;const next=S(input.value).trim();if(!next)continue;const e=ensureEcom(p);if(S(e.nomeComercial)!==next){e.nomeComercial=next;p.atualizadoEm=new Date().toISOString();p.operadorAtualizacao='John ERP '+VERSION;changed++}}
  if(!changed)return toastMsg('Nenhuma alteração de Nome Comercial foi encontrada.');
  if(!persistDb())return toastMsg('Não foi possível salvar as alterações na base local.');
  try{if(typeof save==='function')save()}catch(_){}
  try{window.renderEcomProducts?.();window.renderOnline?.();window.johnV8RenderProducts?.()}catch(_){}
  const btn=document.getElementById('jbSave82216');if(btn){btn.disabled=true;btn.textContent='Salvando...'}
  try{
    if(document.getElementById('jbPublish82216')?.checked){await publishSilent();toastMsg(`${changed} produto(s) atualizado(s) e catálogo publicado.`)}else toastMsg(`${changed} produto(s) atualizado(s).`);
    modal().classList.remove('open');
  }catch(err){console.error('[John '+VERSION+'] publicação em lote:',err);toastMsg(`${changed} produto(s) foram salvos, mas a publicação falhou: ${err?.message||err}`)}
  finally{if(btn){btn.disabled=false;btn.textContent='Salvar alterações selecionadas'}}
}
function openBatch(){const m=modal();fillTypes();renderRows();m.classList.add('open')}
function findEcommerceSection(){
  const g=document.getElementById('produtoEcomGaleria');if(g){let p=g.parentElement;for(let i=0;i<4&&p;i++,p=p.parentElement){if(/E-commerce/i.test(S(p.textContent)))return p}return g.parentElement}
  return [...document.querySelectorAll('section,div,fieldset')].find(x=>/^\s*E-commerce/i.test(S(x.textContent).trim())&&x.querySelector('#produtoEcomUploadStatus'))||null;
}
function injectBatchButton(){
  if(document.getElementById('johnOpenBatch82216'))return true;
  const sec=findEcommerceSection();if(!sec)return false;
  const b=document.createElement('button');b.id='johnOpenBatch82216';b.type='button';b.className='btn secondary jb-ecom-btn';b.textContent='✏️ Alterar Nome Comercial em lote';b.onclick=openBatch;
  const title=[...sec.querySelectorAll('h2,h3,h4,legend,strong')].find(x=>/E-commerce/i.test(S(x.textContent)));
  if(title)title.insertAdjacentElement('afterend',b);else sec.prepend(b);
  return true;
}
function installGlobalEntry(){
  window.JohnEcommerceBatch82216={version:VERSION,open:openBatch,rescueMedia:rescueDraftUpload};
  if(!window.abrirManutencaoEcommerceLote)window.abrirManutencaoEcommerceLote=openBatch;
}
function boot(){
  installGlobalEntry();installMediaRescue();injectBatchButton();
  clearInterval(bootTimer);let n=0;bootTimer=setInterval(()=>{injectBatchButton();n++;if(n>120)clearInterval(bootTimer)},500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,80),{once:true});else setTimeout(boot,80);
})();
