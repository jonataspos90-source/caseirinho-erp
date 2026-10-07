(function(){
'use strict';
if(window.__JOHN_ECOMMERCE_SUBMODULE_MEDIA_82217__)return;
window.__JOHN_ECOMMERCE_SUBMODULE_MEDIA_82217__=true;
const VERSION='8.22.17';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let observer=null;
function storage(){try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}catch(_){return localStorage}}
function dbRef(){try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){}return window.db||null}
function dbKey(){try{return typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1'}catch(_){return 'pcp_app_v1'}}
function persist(){const d=dbRef();if(!d)return false;try{storage().setItem(dbKey(),JSON.stringify(d));return true}catch(e){console.warn('[John '+VERSION+'] persistência:',e);return false}}
function toastMsg(m){try{if(typeof toast==='function')return toast(m)}catch(_){}alert(m)}
function currentProduct(){
 const d=dbRef();if(!d||!Array.isArray(d.produtos))return null;
 const id=S(document.getElementById('produtoId')?.value).trim();
 const code=S(document.getElementById('produtoCodigo')?.value).trim();
 const name=S(document.getElementById('produtoNome')?.value).trim().toLowerCase();
 return (id&&d.produtos.find(p=>S(p?.id)===id))||(code&&d.produtos.find(p=>S(p?.codigo)===code))||(name&&[...d.produtos].reverse().find(p=>S(p?.nome).trim().toLowerCase()===name))||null;
}
async function publish(){
 const fn=window.publicarCatalogoEcommerce||window.JohnCaseirinhoCatalogSync821?.publish;
 if(typeof fn==='function')await fn(true);
}
const packOf=p=>p?.ecommerce?.packVirtual||p?.packVirtual||{};
function packKey(p,d=packOf(p)){
 const ids=A(d.produtoIds).map(String);if(!ids.includes(S(p?.id)))ids.push(S(p?.id));
 return S(d.packId||d.id||ids.slice().sort().join('|')+'|'+d.quantidadeLeve+'|'+d.quantidadePague);
}
function packGroups(){
 const groups=new Map();
 for(const p of A(dbRef()?.produtos)){
  const d=packOf(p);if(!d||!d.tipo||d.tipo!=='LEVE_X_PAGUE_Y')continue;
  const ids=A(d.produtoIds).map(String);if(!ids.includes(S(p.id)))ids.push(S(p.id));
  const key=packKey(p,d);
  if(!groups.has(key))groups.set(key,{...d,packId:key,produtoIds:ids});
 }
 return [...groups.values()];
}
function packPrice(p){return Number(p?.ecommerce?.precoEcommerce??p?.precoEcommerce??p?.precoVenda??p?.preco)||0}
function packUid(){try{return crypto.randomUUID()}catch(_){return 'pack_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8)}}
function packDialog(){
 let modal=document.getElementById('jesPackModal82217');if(modal)return modal;
 modal=document.createElement('div');modal.id='jesPackModal82217';modal.className='jes-modal';modal.hidden=true;
 modal.innerHTML=`<div class="jes-dialog" role="dialog" aria-modal="true" aria-labelledby="jesPackTitle82217"><div class="jes-head"><div><h2 id="jesPackTitle82217" style="margin:0">Pack Virtual · Leve X, pague Y</h2><div style="color:#64748b">Selecione produtos que podem ser misturados nesta promoção.</div></div><button type="button" class="jes-btn jes-soft" id="jesPackClose82217">Fechar</button></div><div class="jes-pack-fields"><div><label for="jesPackName82217">Nome da promoção</label><input id="jesPackName82217" placeholder="Ex.: Leve 3, pague 2"></div><div></div><div><label for="jesPackX82217">Leve (quantidade)</label><input id="jesPackX82217" type="number" min="2" step="1" value="3"></div><div><label for="jesPackY82217">Pague (quantidade)</label><input id="jesPackY82217" type="number" min="1" step="1" value="2"></div></div><label for="jesPackSearch82217" style="font-weight:800;font-size:12px">Buscar produtos participantes</label><input id="jesPackSearch82217" class="jes-pack-search" type="search" placeholder="Digite o nome ou código"><div id="jesPackCount82217" style="font-size:12px;color:#64748b;margin:7px 0"></div><div class="jes-products" id="jesPackProducts82217"></div><div class="jes-pack-note"><b>Como o valor será calculado:</b> você pode misturar os produtos selecionados. Em cada pack, o sistema cobra os itens de maior preço de venda e aplica o benefício sobre os de menor preço. O cliente verá esta explicação na loja.</div><div class="jes-actions" style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px"><button type="button" class="jes-btn jes-soft" id="jesPackCancel82217">Cancelar</button><button type="button" class="jes-btn" id="jesPackSave82217">Salvar e publicar promoção</button></div></div>`;
 document.body.appendChild(modal);
 const close=()=>{modal.hidden=true};
 modal.querySelectorAll('#jesPackClose82217,#jesPackCancel82217').forEach(b=>b.onclick=close);
 modal.addEventListener('click',e=>{if(e.target===modal)close()});
 document.getElementById('jesPackSearch82217').oninput=filterPackProducts;
 document.getElementById('jesPackProducts82217').onchange=updatePackCount;
 document.getElementById('jesPackSave82217').onclick=savePack;
 return modal;
}
function renderPackProducts(selected=[]){
 const root=document.getElementById('jesPackProducts82217'),items=A(dbRef()?.produtos).filter(p=>S(p.status||'ATIVO').toUpperCase()!=='INATIVO');
 root.innerHTML=items.map(p=>{const id=S(p.id),name=p.ecommerce?.nomeComercial||p.nome||p.descricao||'Produto',price=packPrice(p),checked=selected.includes(id);return `<label class="jes-product-choice" data-pack-search="${esc((name+' '+S(p.codigo)).toLowerCase())}"><input type="checkbox" value="${esc(id)}" ${checked?'checked':''}><span><b>${esc(name)}</b><small>${esc(p.codigo||'')} · ${price.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}</small></span></label>`}).join('')||'<div style="padding:14px;color:#64748b">Nenhum produto disponível.</div>';
 updatePackCount();
}
function filterPackProducts(){const q=S(document.getElementById('jesPackSearch82217')?.value).trim().toLowerCase();document.querySelectorAll('#jesPackProducts82217 [data-pack-search]').forEach(row=>row.hidden=!S(row.dataset.packSearch).includes(q))}
function updatePackCount(){const checked=[...document.querySelectorAll('#jesPackProducts82217 input:checked')].length,el=document.getElementById('jesPackCount82217');if(el)el.textContent=checked+' produto(s) selecionado(s).'}
function openPackEditor(packId=''){
 const groups=packGroups(),existing=groups.find(x=>S(x.packId)===S(packId)),modal=packDialog();
 document.getElementById('jesPackName82217').value=existing?.nome||'';
 document.getElementById('jesPackX82217').value=existing?.quantidadeLeve||3;
 document.getElementById('jesPackY82217').value=existing?.quantidadePague||2;
 modal.dataset.editingPackId=existing?S(existing.packId):'';
 renderPackProducts(existing?A(existing.produtoIds).map(String):[]);
 modal.hidden=false;
}
async function savePack(){
 const modal=packDialog(),name=S(document.getElementById('jesPackName82217').value).trim(),x=Math.floor(Number(document.getElementById('jesPackX82217').value)),y=Math.floor(Number(document.getElementById('jesPackY82217').value)),ids=[...document.querySelectorAll('#jesPackProducts82217 input:checked')].map(x=>S(x.value)),editing=S(modal.dataset.editingPackId),d=dbRef();
 if(!d||!Array.isArray(d.produtos))return toastMsg('Não foi possível acessar os produtos do ERP.');
 if(!name)return toastMsg('Informe o nome da promoção.');
 if(ids.length<1)return toastMsg('Selecione pelo menos um produto.');
 if(x<2||y<1||y>=x)return toastMsg('A quantidade “pague” precisa ser menor que “leve”.');
 for(const p of d.produtos){const old=packOf(p);if(!ids.includes(S(p.id))||!old.ativo||packKey(p,old)===editing)continue;return toastMsg((p.ecommerce?.nomeComercial||p.nome)+' já participa de outra promoção Pack Virtual. Edite ou remova a outra promoção antes de continuar.')}
 const packId=editing||packUid(),rule={ativo:true,tipo:'LEVE_X_PAGUE_Y',packId,id:packId,nome,quantidadeLeve:x,quantidadePague:y,produtoIds:ids,origem:'ECOMMERCE_PACK'};
 for(const p of d.produtos){const old=packOf(p);if(S(old.packId)===packId||(editing&&packKey(p,old)===editing)){if(p.ecommerce?.packVirtual)delete p.ecommerce.packVirtual;if(p.packVirtual)delete p.packVirtual}}
 for(const id of ids){const p=d.produtos.find(z=>S(z.id)===id);if(!p)continue;p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'&&!Array.isArray(p.ecommerce)?p.ecommerce:{};p.ecommerce.packVirtual={...rule};p.atualizadoEm=new Date().toISOString()}
 if(!persist())return toastMsg('Não foi possível salvar o Pack Virtual na base local.');
 try{if(typeof save==='function')save()}catch(_){}
 modal.hidden=true;renderPackList();
 try{await publish();toastMsg('Pack Virtual salvo e publicado na Loja.')}catch(err){toastMsg('Pack salvo no ERP, mas a publicação falhou: '+(err?.message||err))}
}
function removePack(packId){
 const d=dbRef();if(!d)return;
 const group=packGroups().find(x=>S(x.packId)===S(packId));if(!group)return;
 if(!confirm('Desativar a promoção “'+S(group.nome||'Pack Virtual')+'” e removê-la dos produtos selecionados?'))return;
 for(const p of A(d.produtos)){const old=packOf(p);if(packKey(p,old)!==S(packId))continue;if(p.ecommerce?.packVirtual)delete p.ecommerce.packVirtual;else if(p.packVirtual)delete p.packVirtual;p.atualizadoEm=new Date().toISOString()}
 persist();try{if(typeof save==='function')save()}catch(_){}
 renderPackList();publish().then(()=>toastMsg('Pack Virtual removido e catálogo publicado.')).catch(e=>toastMsg('Pack removido, mas a publicação falhou: '+(e?.message||e)));
}
function renderPackList(){
 const root=document.getElementById('jesPackList82217');if(!root)return;
 root.innerHTML=packGroups().map(g=>`<div class="jes-pack-row"><div><b>${esc(g.nome||'Pack Virtual')}</b><small style="display:block;color:#64748b">Leve ${Number(g.quantidadeLeve)||0}, pague ${Number(g.quantidadePague)||0} · ${A(g.produtoIds).map(id=>esc(packOf(dbRef()?.produtos?.find(p=>S(p.id)===S(id))).nome||dbRef()?.produtos?.find(p=>S(p.id)===S(id))?.ecommerce?.nomeComercial||dbRef()?.produtos?.find(p=>S(p.id)===S(id))?.nome||id)).join(', ')}</small></div><div style="display:flex;gap:6px"><button type="button" class="jes-btn jes-soft" data-edit-pack="${esc(g.packId)}">Editar</button><button type="button" class="jes-btn jes-soft" data-remove-pack="${esc(g.packId)}">Remover</button></div></div>`).join('')||'<div style="color:#64748b">Nenhum Pack Virtual configurado.</div>';
 root.querySelectorAll('[data-edit-pack]').forEach(b=>b.onclick=()=>openPackEditor(b.dataset.editPack));root.querySelectorAll('[data-remove-pack]').forEach(b=>b.onclick=()=>removePack(b.dataset.removePack));
}
function imageUrlFromCard(card){
 const img=card?.querySelector?.('img');
 return S(card?.dataset?.strictMediaUrl||img?.getAttribute?.('src')||img?.src).trim();
}
async function removePhoto(url,card){
 const p=currentProduct();
 if(!p)return toastMsg('Produto não localizado. Salve o cadastro e tente novamente.');
 const e=p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'&&!Array.isArray(p.ecommerce)?p.ecommerce:{};
 const all=[...new Set([e.imagem,...A(e.imagens)].map(S).filter(Boolean))];
 if(!all.includes(url)&&url)all.push(url);
 if(!confirm('Excluir esta foto do produto no E-commerce?'))return;
 const next=all.filter(x=>x!==url);
 e.imagens=next.slice(0,5);
 e.imagem=e.imagens[0]||'';
 p.atualizadoEm=new Date().toISOString();
 p.operadorAtualizacao='John ERP '+VERSION;
 try{if(typeof imageState!=='undefined'&&Array.isArray(imageState)){for(let i=imageState.length-1;i>=0;i--)if(S(imageState[i])===url)imageState.splice(i,1)}}catch(_){}
 const direct=document.getElementById('produtoEcomImagem');if(direct&&S(direct.value)===url)direct.value=e.imagem||'';
 if(!persist())return toastMsg('Não foi possível salvar a exclusão da foto.');
 try{if(typeof save==='function')save()}catch(_){}
 try{card?.remove()}catch(_){}
 try{if(typeof renderImages==='function')renderImages()}catch(_){}
 try{window.renderEcomProducts?.();window.renderOnline?.()}catch(_){}
 const st=document.getElementById('produtoEcomUploadStatus');if(st){st.textContent='Foto removida do produto. Atualizando o E-commerce...';st.style.color='#15803d'}
 try{await publish();if(st)st.textContent='Foto excluída do produto e removida do E-commerce.';toastMsg('Foto excluída do E-commerce.')}catch(err){console.error(err);if(st){st.textContent='Foto removida do cadastro local, mas a publicação falhou: '+(err?.message||err);st.style.color='#b42318'}toastMsg('Foto removida do produto, mas houve falha ao publicar o catálogo.')}
}
function enhanceGallery(){
 const g=document.getElementById('produtoEcomGaleria');if(!g)return false;
 [...g.querySelectorAll('.media-card, [data-strict-media-url], div')].forEach(card=>{
   const img=card.querySelector?.('img');if(!img||card.dataset.johnDeletePhoto82217==='1')return;
   const url=imageUrlFromCard(card);if(!url)return;
   card.dataset.johnDeletePhoto82217='1';
   let actions=card.querySelector('.media-actions');if(!actions){actions=document.createElement('div');actions.className='media-actions';card.appendChild(actions)}
   const b=document.createElement('button');b.type='button';b.className='btn danger john-delete-photo-82217';b.textContent='🗑 Excluir foto';b.style.cssText='margin-top:6px;border:1px solid #fecaca;background:#fff1f2;color:#991b1b;border-radius:8px;padding:6px 9px;font-weight:800;cursor:pointer';
   b.onclick=e=>{e.preventDefault();e.stopPropagation();removePhoto(url,card)};
   actions.appendChild(b);
 });
 return true;
}
function removeOldInlineButton(){const b=document.getElementById('johnOpenBatch82216');if(b)b.remove()}
function style(){if(document.getElementById('johnEcomSub82217Style'))return;const s=document.createElement('style');s.id='johnEcomSub82217Style';s.textContent=`#ecommerceManutencaoLote82217{padding:4px 0}.jes-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:16px}.jes-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;box-shadow:0 8px 28px rgba(15,23,42,.06)}.jes-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.jes-pack-list{display:grid;gap:8px;margin-top:10px}.jes-pack-row{display:flex;justify-content:space-between;gap:8px;align-items:center;padding:9px;border:1px solid #e2e8f0;border-radius:10px}.jes-modal{position:fixed;inset:0;z-index:100000;background:#0f172acc;display:grid;place-items:center;padding:12px}.jes-modal[hidden]{display:none}.jes-dialog{width:min(760px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:18px;box-shadow:0 18px 60px #0004}.jes-products{max-height:300px;overflow:auto;display:grid;gap:5px;border:1px solid #e2e8f0;border-radius:10px;padding:8px}.jes-product-choice{display:flex;gap:9px;align-items:center;padding:8px;border-bottom:1px solid #f1f5f9}.jes-product-choice small{display:block;color:#64748b}.jes-pack-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.jes-pack-fields label{font-weight:800;font-size:12px}.jes-pack-fields input,.jes-pack-search{box-sizing:border-box;width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:9px}.jes-pack-note{padding:10px;background:#f0fdf4;color:#166534;border-radius:10px;margin:10px 0}.jes-card h3{margin:0 0 6px}.jes-card p{margin:0 0 14px;color:#64748b}.jes-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:800;cursor:pointer;background:#4f46e5;color:#fff}.jes-soft{background:#eef2ff;color:#3730a3}.jes-nav{display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;border:0;background:transparent;text-align:left;cursor:pointer;font:inherit}.jes-nav:hover{background:rgba(99,102,241,.08)}.jes-sub{padding-left:30px!important;font-size:13px;opacity:.95}@media(max-width:800px){.jes-grid{grid-template-columns:1fr}}`;document.head.appendChild(s)}
function ensurePage(){
 style();let p=document.getElementById('ecommerceManutencaoLote82217');if(p)return p;
 p=document.createElement('section');p.id='ecommerceManutencaoLote82217';p.className='page hidden';
 p.innerHTML=`<div class="jes-head"><div><h1 style="margin:0">🛒 E-commerce · Manutenção</h1><div style="color:#64748b;margin-top:4px">Submódulo para manutenção em lote e gestão das imagens dos produtos.</div></div><button type="button" class="jes-btn jes-soft" id="jesBack82217">Voltar</button></div><div class="jes-grid"><div class="jes-card"><h3>✏️ Nome Comercial em lote</h3><p>Filtre por tipo de produto, altere nomes comerciais, aplique prefixos, sufixos e localizar/substituir.</p><button type="button" class="jes-btn" id="jesOpenBatch82217">Abrir manutenção em lote</button></div><div class="jes-card"><h3>🎁 Packs e promoções</h3><p>Crie Leve X, pague Y com vários produtos selecionáveis. O preço do pack considera primeiro os itens de maior valor.</p><button type="button" class="jes-btn" id="jesOpenPackPromo82217">Gerenciar Pack Virtual</button><div id="jesPackList82217" class="jes-pack-list"></div></div><div class="jes-card"><h3>🖼️ Fotos dos produtos</h3><p>A exclusão de fotos agora fica disponível diretamente na galeria do cadastro do produto. A foto é desvinculada e o catálogo é republicado.</p><button type="button" class="jes-btn jes-soft" id="jesGoProducts82217">Ir para Produtos</button></div></div>`;
 (document.querySelector('main.main')||document.querySelector('main')||document.body).appendChild(p);
 document.getElementById('jesOpenBatch82217').onclick=()=>{if(typeof window.abrirManutencaoEcommerceLote==='function')window.abrirManutencaoEcommerceLote();else toastMsg('A manutenção em lote ainda está carregando. Tente novamente em alguns segundos.')};
 document.getElementById('jesBack82217').onclick=()=>history.back();
 document.getElementById('jesOpenPackPromo82217').onclick=()=>openPackEditor();
 renderPackList();
 document.getElementById('jesGoProducts82217').onclick=()=>{const target=[...document.querySelectorAll('button,a,[role=button]')].find(x=>/^\s*Produtos\s*$/i.test(S(x.textContent)));if(target)target.click();else toastMsg('Abra Produtos e edite o item desejado para excluir a foto.')};
 return p;
}
function showSubmodule(){
 const p=ensurePage();document.querySelectorAll('.page').forEach(x=>x.classList.add('hidden'));p.classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'});
}
function injectNav(){
 if(document.getElementById('johnEcomSubNav82217'))return true;
 const roots=[...document.querySelectorAll('aside,nav,.sidebar,.side,.menu')];
 for(const root of roots){
   const ecom=[...root.querySelectorAll('button,a,[role=button],div,span')].find(x=>/^\s*(🛒\s*)?E-?commerce\s*$/i.test(S(x.textContent)));
   if(!ecom)continue;
   const host=ecom.closest('li,.nav-group,.menu-group,.nav-item')||ecom.parentElement||root;
   const b=document.createElement('button');b.id='johnEcomSubNav82217';b.type='button';b.className='jes-nav jes-sub';b.innerHTML='↳ Manutenção do E-commerce';b.onclick=showSubmodule;
   host.insertAdjacentElement('afterend',b);return true;
 }
 return false;
}
function installFallbackCard(){
 if(document.getElementById('johnEcomSubFallback82217'))return;
 const candidates=[...document.querySelectorAll('.page,section')].filter(x=>/E-commerce/i.test(S(x.textContent)));
 const host=candidates.find(x=>!x.querySelector('#produtoForm')&&x.offsetParent!==null)||null;if(!host)return;
 const card=document.createElement('div');card.id='johnEcomSubFallback82217';card.className='jes-card';card.style.marginBottom='14px';card.innerHTML='<h3>🧰 Manutenção do E-commerce</h3><p>Nome Comercial em lote e gestão de fotos dos produtos.</p><button type="button" class="jes-btn">Abrir submódulo</button>';card.querySelector('button').onclick=showSubmodule;host.prepend(card);
}
function boot(){
 removeOldInlineButton();ensurePage();enhanceGallery();injectNav();installFallbackCard();
 if(observer)observer.disconnect();observer=new MutationObserver(()=>{removeOldInlineButton();enhanceGallery();injectNav();installFallbackCard()});observer.observe(document.documentElement,{subtree:true,childList:true});
 window.JohnEcommerceMaintenance82217={version:VERSION,open:showSubmodule,enhanceGallery,removePhoto};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,250),{once:true});else setTimeout(boot,250);
})();
