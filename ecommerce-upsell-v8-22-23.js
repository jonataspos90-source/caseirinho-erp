(function(){
'use strict';
if(window.__JOHN_ECOMMERCE_UPSELL_82223__)return;
window.__JOHN_ECOMMERCE_UPSELL_82223__=true;
const VERSION='8.22.23';
const S=v=>String(v??'');
const N=v=>Number(v)||0;
const A=v=>Array.isArray(v)?v:[];
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let baseCatalogFn=null;
function storage(){try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}catch(_){return localStorage}}
function dbRef(){try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){}return window.db||null}
function dbKey(){try{return typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1'}catch(_){return 'pcp_app_v1'}}
function persist(){const d=dbRef();if(!d)return false;try{storage().setItem(dbKey(),JSON.stringify(d));return true}catch(e){console.warn('[John '+VERSION+'] persistência:',e);return false}}
function toastMsg(m){try{if(typeof toast==='function')return toast(m)}catch(_){}alert(m)}
function products(){return A(dbRef()?.produtos).filter(p=>S(p?.status||'ATIVO').toUpperCase()!=='INATIVO')}
function productById(id){return products().find(p=>S(p?.id||p?.codigo)===S(id))||null}
function productKey(p){return S(p?.id||p?.codigo||p?.nome)}
function productLabel(p){return `${S(p?.codigo)?S(p.codigo)+' · ':''}${S(p?.ecommerce?.nomeComercial||p?.nome||'Produto')}`}
function rules(){
 const out=[];
 for(const p of products())for(const r of A(p?.ecommerce?.adicionais))if(r&&r.ativo!==false)out.push({parent:p,rule:r});
 return out;
}
function normalizeRule(parent,raw){
 const ap=productById(raw?.produtoId);
 return {
   id:S(raw?.id||('ADD-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7))),
   produtoId:S(raw?.produtoId),
   nome:S(raw?.nome||ap?.ecommerce?.nomeComercial||ap?.nome||'Adicional'),
   titulo:S(raw?.titulo||`Leve ${ap?.ecommerce?.nomeComercial||ap?.nome||'este adicional'} por apenas`),
   preco:Math.max(0,N(raw?.preco)),
   limitePorItem:Math.max(1,Math.round(N(raw?.limitePorItem)||1)),
   ativo:raw?.ativo!==false
 };
}
function enrichCatalog(cat){
 const d=dbRef();if(!cat||!Array.isArray(cat.produtos)||!d)return cat;
 cat.produtos=cat.produtos.map(cp=>{
   const p=A(d.produtos).find(x=>S(x?.id)===S(cp?.id))||A(d.produtos).find(x=>S(x?.codigo)===S(cp?.codigo));
   if(!p)return cp;
   const adicionais=A(p?.ecommerce?.adicionais).filter(x=>x&&x.ativo!==false).map(raw=>{
     const r=normalizeRule(p,raw),ap=A(d.produtos).find(x=>S(x?.id||x?.codigo)===S(r.produtoId));
     if(!ap||S(ap?.status||'ATIVO').toUpperCase()==='INATIVO'||r.preco<0)return null;
     return {
       id:r.id,
       produtoId:productKey(ap),
       codigo:S(ap?.codigo||''),
       nome:S(r.nome||ap?.ecommerce?.nomeComercial||ap?.nome||'Adicional'),
       titulo:S(r.titulo),
       preco:r.preco,
       limitePorItem:r.limitePorItem,
       ativo:true,
       imagem:S(ap?.ecommerce?.imagem||A(ap?.ecommerce?.imagens)[0]||'')
     };
   }).filter(Boolean);
   return {...cp,adicionais};
 });
 return cat;
}
function installCatalogHook(){
 const current=window.__johnPublicarEcomLocal;
 if(typeof current!=='function')return false;
 if(current.__johnUpsell82223)return true;
 baseCatalogFn=current;
 const wrapped=function(){return enrichCatalog(baseCatalogFn.apply(this,arguments))};
 wrapped.__johnUpsell82223=true;
 wrapped.__johnBase=baseCatalogFn;
 window.__johnPublicarEcomLocal=wrapped;
 return true;
}
async function publish(){
 installCatalogHook();
 const fn=window.publicarCatalogoEcommerce||window.JohnCaseirinhoCatalogSync821?.publish;
 if(typeof fn==='function')await fn(true);
}
function ensureStyle(){if(document.getElementById('johnUpsell82223Style'))return;const s=document.createElement('style');s.id='johnUpsell82223Style';s.textContent=`.ju23-overlay{position:fixed;inset:0;background:rgba(15,23,42,.62);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px}.ju23-modal{background:#fff;border-radius:18px;max-width:1040px;width:min(1040px,98vw);max-height:92vh;overflow:auto;box-shadow:0 24px 80px rgba(0,0,0,.28)}.ju23-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:20px 22px;border-bottom:1px solid #e2e8f0}.ju23-body{padding:20px 22px}.ju23-grid{display:grid;grid-template-columns:1.3fr 1.3fr .7fr .7fr;gap:12px;align-items:end}.ju23-field label{display:block;font-size:12px;font-weight:800;color:#475569;margin:0 0 5px}.ju23-field input,.ju23-field select{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:10px;padding:10px;background:#fff}.ju23-title{grid-column:1/-1}.ju23-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.ju23-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;background:#4f46e5;color:#fff}.ju23-btn.soft{background:#eef2ff;color:#3730a3}.ju23-btn.danger{background:#fff1f2;color:#991b1b;border:1px solid #fecaca}.ju23-table{width:100%;border-collapse:collapse;margin-top:18px;font-size:13px}.ju23-table th,.ju23-table td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left;vertical-align:middle}.ju23-table th{color:#475569;background:#f8fafc}.ju23-note{margin-top:12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;color:#475569}.ju23-badge{display:inline-block;background:#ecfdf5;color:#166534;border-radius:999px;padding:4px 8px;font-weight:800;font-size:11px}@media(max-width:800px){.ju23-grid{grid-template-columns:1fr}.ju23-title{grid-column:auto}.ju23-table{display:block;overflow:auto;white-space:nowrap}}`;document.head.appendChild(s)}
function optionHtml(selected=''){return products().sort((a,b)=>productLabel(a).localeCompare(productLabel(b),'pt-BR')).map(p=>`<option value="${esc(productKey(p))}" ${S(productKey(p))===S(selected)?'selected':''}>${esc(productLabel(p))}</option>`).join('')}
function modal(){let ov=document.getElementById('johnUpsell82223Modal');if(ov)return ov;ensureStyle();ov=document.createElement('div');ov.id='johnUpsell82223Modal';ov.className='ju23-overlay';ov.style.display='none';ov.innerHTML=`<div class="ju23-modal" role="dialog" aria-modal="true"><div class="ju23-head"><div><h2 style="margin:0">💰 Venda adicional · Aumentar ticket médio</h2><div style="color:#64748b;margin-top:5px">Configure ofertas como “Leve Queijo Ralado por apenas R$ 3,00” somente nos produtos desejados.</div></div><button type="button" class="ju23-btn soft" data-close>Fechar</button></div><div class="ju23-body"><div class="ju23-grid"><div class="ju23-field"><label>Produto principal</label><select id="ju23Parent"></select></div><div class="ju23-field"><label>Produto adicional</label><select id="ju23Addon"></select></div><div class="ju23-field"><label>Preço adicional (R$)</label><input id="ju23Price" type="number" min="0" step="0.01" value="3.00"></div><div class="ju23-field"><label>Máx. por item</label><input id="ju23Limit" type="number" min="1" step="1" value="1"></div><div class="ju23-field ju23-title"><label>Texto da oferta</label><input id="ju23Title" maxlength="140" placeholder="Ex.: Leve Queijo Ralado por apenas R$ 3,00"></div></div><div class="ju23-actions"><button type="button" class="ju23-btn" id="ju23Save">Salvar oferta</button><button type="button" class="ju23-btn soft" id="ju23Publish">Publicar agora</button></div><div class="ju23-note"><b>Como funciona:</b> a oferta aparece apenas quando o cliente compra o produto principal. O adicional entra no total do pedido pelo preço promocional configurado e o servidor valida a regra antes de aceitar o pedido.</div><div id="ju23Rules"></div></div></div>`;document.body.appendChild(ov);ov.querySelector('[data-close]').onclick=()=>ov.style.display='none';ov.addEventListener('click',e=>{if(e.target===ov)ov.style.display='none'});document.getElementById('ju23Save').onclick=saveRule;document.getElementById('ju23Publish').onclick=async()=>{try{await publish();toastMsg('Catálogo publicado com as ofertas adicionais.')}catch(e){toastMsg('Falha ao publicar: '+(e?.message||e))}};return ov}
function renderRules(){const host=document.getElementById('ju23Rules');if(!host)return;const rows=rules();host.innerHTML=`<table class="ju23-table"><thead><tr><th>Produto principal</th><th>Oferta adicional</th><th>Preço</th><th>Limite</th><th></th></tr></thead><tbody>${rows.map(({parent,rule})=>{const ap=productById(rule.produtoId);return `<tr><td>${esc(productLabel(parent))}</td><td><b>${esc(rule.titulo||rule.nome||ap?.nome||'Adicional')}</b><br><small>${esc(ap?productLabel(ap):rule.produtoId)}</small></td><td><span class="ju23-badge">R$ ${N(rule.preco).toFixed(2).replace('.',',')}</span></td><td>${Math.max(1,N(rule.limitePorItem)||1)} por item</td><td><button class="ju23-btn danger" type="button" data-del-parent="${esc(productKey(parent))}" data-del-rule="${esc(rule.id)}">Excluir</button></td></tr>`}).join('')||'<tr><td colspan="5">Nenhuma oferta adicional configurada.</td></tr>'}</tbody></table>`;host.querySelectorAll('[data-del-rule]').forEach(b=>b.onclick=async()=>{const p=productById(b.dataset.delParent);if(!p)return;p.ecommerce=p.ecommerce||{};p.ecommerce.adicionais=A(p.ecommerce.adicionais).filter(r=>S(r.id)!==S(b.dataset.delRule));p.atualizadoEm=new Date().toISOString();persist();renderRules();try{await publish();toastMsg('Oferta excluída e catálogo atualizado.')}catch(e){toastMsg('Oferta excluída localmente; falha ao publicar: '+(e?.message||e))}})}
function open(){const ov=modal(),ps=document.getElementById('ju23Parent'),as=document.getElementById('ju23Addon');ps.innerHTML='<option value="">Selecione...</option>'+optionHtml();as.innerHTML='<option value="">Selecione...</option>'+optionHtml();document.getElementById('ju23Price').value='3.00';document.getElementById('ju23Limit').value='1';document.getElementById('ju23Title').value='';renderRules();ov.style.display='flex'}
async function saveRule(){const parentId=S(document.getElementById('ju23Parent')?.value),addonId=S(document.getElementById('ju23Addon')?.value),price=Math.max(0,N(document.getElementById('ju23Price')?.value)),limit=Math.max(1,Math.round(N(document.getElementById('ju23Limit')?.value)||1));const parent=productById(parentId),addon=productById(addonId);if(!parent||!addon)return toastMsg('Selecione o produto principal e o produto adicional.');if(parentId===addonId)return toastMsg('O produto adicional precisa ser diferente do produto principal.');const title=S(document.getElementById('ju23Title')?.value).trim()||`Leve ${addon.ecommerce?.nomeComercial||addon.nome} por apenas R$ ${price.toFixed(2).replace('.',',')}`;parent.ecommerce=parent.ecommerce||{};const list=A(parent.ecommerce.adicionais).filter(r=>S(r.produtoId)!==addonId);list.push(normalizeRule(parent,{produtoId:addonId,nome:addon.ecommerce?.nomeComercial||addon.nome,titulo:title,preco:price,limitePorItem:limit,ativo:true}));parent.ecommerce.adicionais=list;parent.atualizadoEm=new Date().toISOString();parent.operadorAtualizacao='John ERP '+VERSION;if(!persist())return toastMsg('Não foi possível gravar a oferta.');renderRules();try{await publish();toastMsg('Oferta adicional salva e publicada.')}catch(e){toastMsg('Oferta salva no ERP, mas a publicação falhou: '+(e?.message||e))}}
function injectCard(){const grid=document.querySelector('#ecommerceManutencaoLote82217 .jes-grid');if(!grid||document.getElementById('johnUpsellCard82223'))return false;const c=document.createElement('div');c.id='johnUpsellCard82223';c.className='jes-card';c.innerHTML='<h3>💰 Venda adicional</h3><p>Configure complementos promocionais por produto para aumentar o ticket médio, como Queijo Ralado por + R$ 3,00.</p><button type="button" class="jes-btn" id="johnOpenUpsell82223">Configurar ofertas</button>';grid.appendChild(c);c.querySelector('button').onclick=open;return true}
function boot(){ensureStyle();modal();installCatalogHook();injectCard();const ob=new MutationObserver(()=>{installCatalogHook();injectCard()});ob.observe(document.documentElement,{subtree:true,childList:true});[300,800,1500,3000,6000].forEach(ms=>setTimeout(()=>{installCatalogHook();injectCard()},ms));window.JohnEcommerceUpsell82223={version:VERSION,open,enrichCatalog,rules,publish}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250),{once:true});else setTimeout(boot,250);
})();