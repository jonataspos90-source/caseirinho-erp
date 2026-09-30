(function(){
'use strict';
if(window.__JOHN_PRODUCT_CATEGORY_STORE_SYNC_82231__)return;
window.__JOHN_PRODUCT_CATEGORY_STORE_SYNC_82231__=true;

const VERSION='8.22.31';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
let syncTimer=null;
let wrapping=false;
const pending=new Map();

function storage(){try{return typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage}catch(_){return localStorage}}
function dbRef(){try{if(typeof db!=='undefined'&&db&&typeof db==='object')return db}catch(_){};try{return window.db||null}catch(_){return null}}
function dbKey(){try{return typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1'}catch(_){return'pcp_app_v1'}}
function persist(){const d=dbRef();if(!d)return false;try{storage().setItem(dbKey(),JSON.stringify(d));return true}catch(e){console.warn('[John '+VERSION+'] categoria loja:',e);return false}}
function categories(){const d=dbRef();return A(d?.config?.ecommerce?.categorias).filter(c=>c&&c.ativo!==false&&S(c.id)&&S(c.nome)&&S(c.id).toUpperCase()!=='GERAL')}
function grades(){const d=dbRef();return A(d?.config?.ecommerce?.grades||d?.ecommerceGrades||d?.gradesEcommerce)}
function productByIdentity(identity={}){
 const d=dbRef();if(!d||!Array.isArray(d.produtos))return null;
 return (identity.id&&d.produtos.find(p=>S(p?.id)===S(identity.id)))||
        (identity.code&&d.produtos.find(p=>S(p?.codigo)===S(identity.code)))||
        (identity.name&&[...d.produtos].reverse().find(p=>norm(p?.nome)===norm(identity.name)))||null;
}
function currentIdentity(){
 return {
   id:S(document.getElementById('produtoId')?.value).trim(),
   code:S(document.getElementById('produtoCodigo')?.value).trim(),
   name:S(document.getElementById('produtoNome')?.value).trim()
 };
}
function currentProduct(){return productByIdentity(currentIdentity())}
function categoryForControl(el){
 if(!el)return null;
 const value=S(el.value).trim();
 const text=S(el.selectedOptions?.[0]?.textContent||el.getAttribute?.('data-value')||'').trim();
 return categories().find(c=>S(c.id)===value)||categories().find(c=>norm(c.nome)===norm(value))||categories().find(c=>norm(c.nome)===norm(text))||null;
}
function labelText(el){
 let text=S(el?.id)+' '+S(el?.name)+' '+S(el?.getAttribute?.('aria-label'));
 if(el?.id){const l=document.querySelector(`label[for="${CSS.escape(el.id)}"]`);if(l)text+=' '+S(l.textContent)}
 const host=el?.closest?.('.field,.form-group,.row,.grid,label,fieldset,.card,.panel,section,form');
 if(host)text+=' '+S(host.textContent).slice(0,800);
 return norm(text);
}
function isCategoryControl(el){
 if(!el||!['SELECT','INPUT'].includes(el.tagName))return false;
 if(!categoryForControl(el))return false;
 const t=labelText(el);
 if(!t.includes('categor'))return false;
 // Evita árvore mercadológica e outros cadastros: exige contexto de Loja/E-commerce ou formulário de produto.
 const inProduct=!!el.closest?.('#produtoForm,[id*="produto" i],[class*="produto" i]');
 const online=/loja|e commerce|ecommerce|online/.test(t);
 return inProduct||online;
}
function snapshot(el){
 const cat=categoryForControl(el);if(!cat)return null;
 const p=currentProduct();
 const identity=p?{id:S(p.id),code:S(p.codigo),name:S(p.nome)}:currentIdentity();
 if(!identity.id&&!identity.code&&!identity.name)return null;
 return {identity,category:{id:S(cat.id),nome:S(cat.nome)},at:new Date().toISOString()};
}
function gradeForProduct(id){return grades().find(g=>g&&g.ativo!==false&&A(g.variantes).some(v=>S(v?.produtoId)===S(id)))||null}
function applySnapshot(snap){
 const d=dbRef();if(!d||!snap)return 0;
 const p=productByIdentity(snap.identity);if(!p)return 0;
 const cat=snap.category,now=new Date().toISOString();
 const ids=new Set([S(p.id)]);
 const g=gradeForProduct(p.id);if(g)for(const v of A(g.variantes))if(S(v?.produtoId))ids.add(S(v.produtoId));
 let changed=0;
 for(const id of ids){
   const x=d.produtos.find(q=>S(q?.id)===id);if(!x)continue;
   const e=x.ecommerce=x.ecommerce&&typeof x.ecommerce==='object'&&!Array.isArray(x.ecommerce)?x.ecommerce:{};
   if(S(e.categoriaId)!==S(cat.id)||S(e.categoria)!==S(cat.nome))changed++;
   e.categoriaId=S(cat.id);e.categoria=S(cat.nome);
   x.atualizadoEm=now;x.operadorAtualizacao='Categoria Loja '+VERSION;
 }
 if(changed||ids.size){
   persist();
   try{window.renderEcomProducts?.();window.renderOnline?.();window.johnV8RenderProducts?.()}catch(_){}
   try{window.dispatchEvent(new CustomEvent('john:product-category-saved',{detail:{version:VERSION,productId:S(p.id),categoryId:S(cat.id),category:S(cat.nome),gradeId:S(g?.id||''),affected:ids.size}}))}catch(_){}
 }
 return ids.size;
}
async function syncNow(){
 try{if(typeof window.johnCloudCapturarAlteracoes==='function')await Promise.resolve(window.johnCloudCapturarAlteracoes())}catch(e){console.warn('[John '+VERSION+'] captura categoria:',e)}
 try{if(typeof window.johnCloudFlushIncremental==='function')await Promise.resolve(window.johnCloudFlushIncremental(true))}catch(e){console.warn('[John '+VERSION+'] envio categoria:',e)}
 try{const fn=window.publicarCatalogoEcommerce||window.JohnCatalogCategoryGradeSync82231?.publish;if(typeof fn==='function')await fn(true)}catch(e){console.warn('[John '+VERSION+'] publicação categoria:',e)}
}
function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncNow(),450)}
function remember(el){const s=snapshot(el);if(!s)return null;const key=S(s.identity.id||s.identity.code||s.identity.name);pending.set(key,s);return s}
function visibleCategoryControl(){
 const controls=[...document.querySelectorAll('select,input')].filter(isCategoryControl).filter(el=>el.offsetParent!==null&&!el.disabled);
 return controls[0]||null;
}
function finalizePending(preferred=null){
 const snaps=[];if(preferred)snaps.push(preferred);for(const s of pending.values())if(!snaps.includes(s))snaps.push(s);
 if(!snaps.length){const el=visibleCategoryControl();const s=el&&snapshot(el);if(s)snaps.push(s)}
 let applied=0;for(const s of snaps)applied+=applySnapshot(s);if(applied){pending.clear();scheduleSync()}return applied;
}
function wrapSave(){
 if(wrapping)return false;const original=window.save;
 if(typeof original!=='function'||original.__johnCategorySave82231)return false;
 wrapping=true;
 const wrapped=function(){
   const el=visibleCategoryControl();const before=el?remember(el):null;
   let result;
   try{result=original.apply(this,arguments)}catch(e){wrapping=false;throw e}
   const done=()=>setTimeout(()=>finalizePending(before),0);
   if(result&&typeof result.then==='function')return result.then(v=>{done();return v},e=>{done();throw e});
   done();return result;
 };
 wrapped.__johnCategorySave82231=true;wrapped.__johnOriginal=original;window.save=wrapped;wrapping=false;return true;
}
function onChange(e){const el=e.target;if(!isCategoryControl(el))return;remember(el)}
function onAction(e){
 const b=e.target?.closest?.('button,input[type="submit"],input[type="button"],a');if(!b)return;
 const txt=norm(`${b.id||''} ${b.name||''} ${b.value||''} ${b.textContent||''}`);
 if(!/(salvar|gravar|aplicar|atualizar|confirmar)/.test(txt))return;
 const el=visibleCategoryControl();const s=el?remember(el):null;if(s)setTimeout(()=>finalizePending(s),80);
}
function onSubmit(e){const el=[...e.target.querySelectorAll?.('select,input')||[]].find(isCategoryControl)||visibleCategoryControl();const s=el?remember(el):null;if(s)setTimeout(()=>finalizePending(s),80)}
function install(){wrapSave()}

document.addEventListener('change',onChange,true);
document.addEventListener('click',onAction,true);
document.addEventListener('submit',onSubmit,true);
[100,300,700,1500,3000,6000,10000].forEach(ms=>setTimeout(install,ms));
window.addEventListener('john:session-ready',()=>setTimeout(install,100));
window.addEventListener('john:cloud-applied',()=>setTimeout(install,100));
window.JohnProductCategoryStoreSync82231={version:VERSION,install,applySnapshot,finalizePending,syncNow,isCategoryControl,currentProduct};
})();
