(function(){
'use strict';
if(window.__JOHN_DEEP_RECOVERY_8181__)return;window.__JOHN_DEEP_RECOVERY_8181__=true;
const V='8.18.1',S=v=>String(v??''),A=v=>Array.isArray(v)?v:[],N=v=>Number(v)||0,E=id=>document.getElementById(id);
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
function dbx(){return window.db||{};}function st(){try{return localStorage}catch(_){return null}}
function cfg(){let c={};try{c=JSON.parse(st()?.getItem('john_cloud_config_v1')||'{}')||{}}catch(_){}return{api:S(c.apiUrl||'https://john-cloud-api-production.up.railway.app').replace(/\/+$/,''),token:S(c.apiKey||c.token||''),slug:S(c.storeSlug||'caseirinho')||'caseirinho'} }
function snap(){try{return JSON.parse(st()?.getItem('john_ecommerce_public_v1')||'null')}catch(_){return null}}
function ecfg(){const d=dbx();d.config=d.config&&typeof d.config==='object'?d.config:{};d.config.ecommerce=d.config.ecommerce&&typeof d.config.ecommerce==='object'?d.config.ecommerce:{};d.config.ecommerce.categorias=A(d.config.ecommerce.categorias);return d.config.ecommerce}
function cats(){return ecfg().categorias}
function productMatch(cp){const ps=A(dbx().produtos);return ps.find(p=>S(p.id)===S(cp?.id))||ps.find(p=>S(p.codigo)&&S(p.codigo)===S(cp?.codigo))||ps.find(p=>norm(p.nome)===norm(cp?.nome));}
function imageAttachments(p){return A(p?.anexos).filter(a=>/^image\//i.test(S(a?.tipo))||/^data:image\//i.test(S(a?.conteudo))||/^https?:/i.test(S(a?.url||a?.href))).map(a=>a?.conteudo||a?.url||a?.href).filter(Boolean)}
function imageCandidates(p,cp){const e=p?.ecommerce&&typeof p.ecommerce==='object'?p.ecommerce:{};return [...new Set([cp?.imagem,...A(cp?.imagens),e.imagem,...A(e.imagens),p?.imagem,...A(p?.imagens),...imageAttachments(p)].filter(Boolean))].slice(0,5)}
function slug(s){return 'cat_'+norm(s).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,40)}
function ensureCat(source){if(!source||!S(source.nome).trim()||S(source.id).toUpperCase()==='GERAL')return null;let c=cats().find(x=>S(x.id)===S(source.id))||cats().find(x=>norm(x.nome)===norm(source.nome));if(!c){let id=S(source.id)||slug(source.nome);while(cats().some(x=>S(x.id)===id))id+='x';c={id,nome:S(source.nome).trim(),descricao:S(source.descricao||''),emoji:S(source.emoji||'📁'),ordem:N(source.ordem)||Math.max(1,cats().length),ativo:source.ativo!==false};cats().push(c)}return c}
function inferCategoryName(name){const n=norm(name);if(/nhoque|massa|lasanha|macarrao|talharim|ravioli|capeletti/.test(n))return 'Massas';if(/coxinha|risoles|bolinha|salgad|kibe|quibe|esfiha/.test(n))return 'Salgados';if(/panqueca/.test(n))return 'Panquecas';if(/torta|empada/.test(n))return 'Tortas';if(/pao|rosquinha|padaria/.test(n))return 'Pães e Padaria';if(/molho|sugo|bolonhesa|queijo/.test(n))return 'Molhos';if(/agua|refrigerante|suco|bebida|energetico/.test(n))return 'Bebidas';if(/bolo|doce|sobremesa|pudim/.test(n))return 'Doces e Sobremesas';return 'Outros';}
function ensureSuggestedCategory(name){const nm=inferCategoryName(name),existing=cats().find(c=>norm(c.nome)===norm(nm));return existing||ensureCat({id:slug(nm),nome:nm,emoji:'📁',ordem:cats().length+1,ativo:true,descricao:'Categoria recuperada automaticamente pelo John ERP.'})}
async function publicCatalog(){const c=cfg();try{const r=await fetch(c.api+'/api/v1/public/store/'+encodeURIComponent(c.slug)+'/catalog?_repair='+Date.now(),{cache:'no-store',headers:{'Cache-Control':'no-store'}});if(!r.ok)return null;return await r.json()}catch(_){return null}}
async function admin(path,opt={}){const c=cfg();if(!c.token)throw new Error('Token da API não configurado neste dispositivo.');const r=await fetch(c.api+path,{...opt,cache:'no-store',headers:{'Content-Type':'application/json','Authorization':'Bearer '+c.token,'X-ERP-User':'ERP-Deep-Recovery','Cache-Control':'no-store',...(opt.headers||{})}});let j={};try{j=await r.json()}catch(_){}if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j}
async function saveDb(){try{if(typeof window.save==='function')window.save();else st()?.setItem(typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1',JSON.stringify(dbx()))}catch(_){}try{await window.johnCloudCapturarAlteracoes?.()}catch(_){} }
function sourceMaps(...catalogs){const byId=new Map(),byCode=new Map(),byName=new Map(),categories=[];for(const cat of catalogs.filter(Boolean)){for(const c of A(cat?.loja?.categorias)){if(!categories.some(x=>S(x.id)===S(c.id)||norm(x.nome)===norm(c.nome)))categories.push(c)}for(const p of A(cat?.produtos)){if(S(p.id))byId.set(S(p.id),p);if(S(p.codigo))byCode.set(S(p.codigo),p);if(S(p.nome))byName.set(norm(p.nome),p)}}return{byId,byCode,byName,categories}}
async function deepRepair(opts={}){const status=E('deep8181Status');if(status)status.textContent='Consultando catálogo, banco local e mídias...';const local=snap(),online1=await publicCatalog();let mediaRepair=null;try{mediaRepair=await admin('/api/v1/admin/store/media/repair-from-erp',{method:'POST',body:'{}'})}catch(e){console.warn('[DeepRecovery] mídia:',e)}const online2=await publicCatalog();const maps=sourceMaps(local,online1,online2);let catRest=0,linkRest=0,imgRest=0,publishRest=0,inferred=0;
 for(const c of maps.categories){const before=cats().length;ensureCat(c);if(cats().length>before)catRest++}
 for(const p of A(dbx().produtos)){
   p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'?p.ecommerce:{};const e=p.ecommerce;
   const cp=maps.byId.get(S(p.id))||maps.byCode.get(S(p.codigo))||maps.byName.get(norm(e.nomeComercial||p.nome));
   if(cp){
     let srcCat=null;if(cp.categoriaId)srcCat=maps.categories.find(c=>S(c.id)===S(cp.categoriaId));if(!srcCat&&cp.categoria)srcCat=maps.categories.find(c=>norm(c.nome)===norm(cp.categoria));if(srcCat){const c=ensureCat(srcCat);if(c&&(!e.categoriaId||!cats().some(x=>S(x.id)===S(e.categoriaId)))){e.categoriaId=c.id;e.categoria=c.nome;linkRest++}}
     const imgs=imageCandidates(p,cp);if(imgs.length&&(!A(e.imagens).length||!e.imagem)){e.imagens=imgs;e.imagem=imgs[0];imgRest++}
     if(e.publicar!==true&&cp){e.publicar=true;publishRest++}
     if(!(N(e.precoEcommerce)>0)&&N(cp.preco)>0)e.precoEcommerce=N(cp.preco);
   }
   if(e.publicar===true&&(!e.categoriaId||!cats().some(c=>S(c.id)===S(e.categoriaId)))){const c=ensureSuggestedCategory(e.nomeComercial||p.nome);if(c){e.categoriaId=c.id;e.categoria=c.nome;inferred++;}}
   if(e.publicar===true&&(!A(e.imagens).length||!e.imagem)){const imgs=imageCandidates(p,null);if(imgs.length){e.imagens=imgs;e.imagem=imgs[0];imgRest++;}}
 }
 await saveDb();try{window.johnEcommerceCategoriasV4?.render?.()}catch(_){}try{window.johnV890RenderEcomMaintenance?.()}catch(_){}
 const report={catRest,linkRest,imgRest,publishRest,inferred,mediaRepair,onlineProducts:A(online2?.produtos).length,localProducts:A(local?.produtos).length};
 if(status)status.innerHTML=`✅ Reparo concluído. Categorias recuperadas: <b>${catRest}</b> · vínculos: <b>${linkRest}</b> · imagens: <b>${imgRest}</b> · produtos reativados: <b>${publishRest}</b> · categorias sugeridas: <b>${inferred}</b>.`;
 if(opts.publish){try{await window.JohnV880?.canonicalPublish?.(false)}catch(e){throw new Error('Dados recuperados, mas a publicação falhou: '+e.message)}}
 return report;
}
function installUI(){const page=E('ecommerceRecuperarV8161');if(page&&!E('deep8181Run')){const body=page.querySelector('.panel-body')||page;const wrap=document.createElement('div');wrap.style.marginTop='18px';wrap.innerHTML=`<hr style="border:0;border-top:1px solid #dbe3ef;margin:18px 0"><h3>🧠 Reparo profundo V8.18.1</h3><div class="subtitle">Cruza catálogo público, snapshot local, cadastro, anexos e mídia no servidor. Se nenhuma fonte possuir categoria, o John sugere uma categoria pelo nome do produto.</div><div id="deep8181Status" class="subtitle" style="margin-top:10px"></div><div class="actions" style="margin-top:12px"><button class="btn primary" id="deep8181Run" type="button">Reparar categorias e imagens</button><button class="btn secondary" id="deep8181Publish" type="button">Reparar e publicar</button></div>`;body.appendChild(wrap);E('deep8181Run').onclick=()=>deepRepair().catch(e=>{E('deep8181Status').textContent='❌ '+e.message});E('deep8181Publish').onclick=()=>deepRepair({publish:true}).catch(e=>{E('deep8181Status').textContent='❌ '+e.message})}
}
function init(){installUI();window.JohnDeepRecoveryV8181={deepRepair,version:V};}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1200),{once:true});else setTimeout(init,500);
[2500,5000,9000].forEach(ms=>setTimeout(installUI,ms));document.addEventListener('click',()=>setTimeout(installUI,100),true);
})();
