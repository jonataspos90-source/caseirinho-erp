(function(){
'use strict';
if(window.__JOHN_CASEIRINHO_SYNC_8224__)return;
window.__JOHN_CASEIRINHO_SYNC_8224__=true;
const VERSION='8.22.4';
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
let publishPromise=null;

function dbRef(){try{return typeof db!=='undefined'?db:(window.db||null)}catch(_){return window.db||null}}
function isData(x){return /^data:image\/(?:jpeg|png|webp|gif);base64,/i.test(S(x))}
function isBlob(x){return /^blob:/i.test(S(x))}
function stableUrl(x){const v=S(x).trim();return !!v&&!isData(v)&&!isBlob(v)}
function apiAdmin(path,opt={}){
 if(typeof adminFetch==='function')return adminFetch(path,opt);
 throw new Error('A conexão autenticada com a API ainda não foi carregada. Abra Configurações → Nuvem / API e teste a conexão.');
}
function compressImage(file){
 if(typeof compress==='function')return compress(file);
 return new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=reject;fr.readAsDataURL(file)});
}
async function uploadOne(dataUrl,filename,productId=''){
 const r=await apiAdmin('/api/v1/admin/store/media',{method:'POST',body:JSON.stringify({dataUrl,filename,productId})});
 const url=S(r?.url).trim();
 if(!stableUrl(url))throw new Error('A API não devolveu uma URL permanente para a imagem.');
 return url;
}
async function robustUpload(ev){
 const input=ev.target,st=document.getElementById('produtoEcomUploadStatus');
 const files=[...(input?.files||[])];if(!files.length)return;
 let current=[];try{current=A(imageState)}catch(_){}
 const slots=Math.max(0,5-current.length);
 if(!slots){if(st)st.textContent='Limite de 5 imagens atingido.';input.value='';return}
 const use=files.slice(0,slots),added=[];
 try{
   for(let i=0;i<use.length;i++){
     const f=use[i];if(st)st.textContent=`Enviando ${i+1}/${use.length}: ${f.name}`;
     const dataUrl=await compressImage(f);
     const productId=document.getElementById('produtoId')?.value||'';
     const url=await uploadOne(dataUrl,f.name,productId);
     added.push(url);
   }
   try{for(const url of added)imageState.push(url);if(typeof renderImages==='function')renderImages()}catch(e){throw new Error('Imagem enviada, mas não foi possível atualizar a galeria: '+e.message)}
   if(st)st.textContent=`${added.length} imagem(ns) enviada(s) e salva(s) no servidor.`;
   try{window.toast?.('Foto salva no servidor. Salve o produto e publique o catálogo para disponibilizá-la na Loja.')}catch(_){}
 }catch(e){
   if(st)st.textContent='Falha no envio: '+e.message;
   try{window.toast?.('A foto não foi salva: '+e.message)}catch(_){}
   console.error('[John V8.22.4] upload de mídia',e);
 }finally{input.value=''}
}

/* Intercepta antes do onchange legado. Nunca permite fallback data:/blob: local. */
document.addEventListener('change',ev=>{
 if(ev.target?.id!=='produtoEcomArquivos')return;
 ev.preventDefault();ev.stopImmediatePropagation();
 robustUpload(ev);
},true);

async function ensureRemoteImages(cat){
 const d=dbRef();
 for(const cp of A(cat?.produtos)){
   const p=A(d?.produtos).find(x=>S(x?.id)===S(cp?.id))||A(d?.produtos).find(x=>S(x?.codigo)===S(cp?.codigo));
   const e=p?.ecommerce||{};
   const all=[...new Set([cp?.imagem,...A(cp?.imagens),e?.imagem,...A(e?.imagens)].map(S).filter(Boolean))].slice(0,5);
   const urls=[];
   for(let i=0;i<all.length;i++){
     const src=all[i];
     if(stableUrl(src)){urls.push(src);continue}
     if(isBlob(src))throw new Error(`A foto de ${cp?.nome||cp?.codigo||'um produto'} ainda é temporária. Selecione a foto novamente para enviá-la ao servidor.`);
     if(isData(src)){
       const ext=(src.match(/^data:image\/([^;]+)/i)?.[1]||'webp').replace('jpeg','jpg');
       const url=await uploadOne(src,`${S(cp?.codigo||cp?.id||'produto')}_${i+1}.${ext}`,S(cp?.id||''));
       urls.push(url);
     }
   }
   cp.imagem=urls[0]||'';cp.imagens=urls.slice(0,5);
   if(p){p.ecommerce=p.ecommerce||{};p.ecommerce.imagem=cp.imagem;p.ecommerce.imagens=[...cp.imagens]}
 }
 return cat;
}
async function authoritativePublish(silent=false){
 if(publishPromise)return publishPromise;
 publishPromise=(async()=>{
   const base=window.__johnPublicarEcomLocal;
   if(typeof base!=='function')throw new Error('O gerador do catálogo ainda não foi carregado.');
   let cat=base(true)||{loja:{},produtos:[]};
   cat={...cat,produtos:A(cat.produtos).map(p=>({...p,imagens:[...A(p?.imagens)]}))};
   await ensureRemoteImages(cat);
   const result=await apiAdmin('/api/v1/admin/store/catalog',{method:'PUT',body:JSON.stringify({...cat,replaceCatalog:true,removedProductIds:[]})});
   try{localStorage.setItem('john_ecommerce_public_v1',JSON.stringify(cat))}catch(_){}
   try{await window.johnHydrateStorefrontFromServerV8224?.(true)}catch(e){console.warn('[John V8.22.4] hidratação pós-publicação',e)}
   try{await window.johnV84Cloud?.loadOnline?.()}catch(_){}
   if(!silent)window.toast?.(`Catálogo publicado: ${result?.total??A(cat.produtos).length} produto(s). Todos os navegadores receberão esta mesma versão.`);
   window.dispatchEvent(new CustomEvent('john:ecommerce-sync',{detail:{source:'authoritative-publish',version:VERSION,total:A(cat.produtos).length}}));
   return cat;
 })().finally(()=>{publishPromise=null});
 return publishPromise;
}
function bindPublishButtons(){
 const fn=()=>authoritativePublish(false).catch(e=>{console.error(e);alert('Falha ao publicar: '+e.message)});
 for(const id of ['catPublicarV4','on88Publish','ac85Publish']){const b=document.getElementById(id);if(b&&!b.dataset.johnAuthoritative8224){b.dataset.johnAuthoritative8224='1';b.onclick=fn}}
 if(window.JohnV880&&window.JohnV880.canonicalPublish!==authoritativePublish)window.JohnV880.canonicalPublish=authoritativePublish;
 window.johnV880Publish=authoritativePublish;
 window.publicarCatalogoEcommerce=function(silent=false){return authoritativePublish(silent)};
}
function boot(){bindPublishButtons();[300,900,1800,3500,7000].forEach(ms=>setTimeout(bindPublishButtons,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
document.addEventListener('click',()=>setTimeout(bindPublishButtons,0),true);
window.JohnCaseirinhoCatalogSync821={version:VERSION,publish:authoritativePublish,upload:robustUpload,bindPublishButtons};
})();
