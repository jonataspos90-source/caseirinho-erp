(function(){
'use strict';
if(window.__JOHN_CASEIRINHO_SYNC_821__)return;
window.__JOHN_CASEIRINHO_SYNC_821__=true;
const S=v=>String(v??'');
const N=v=>Number(v)||0;
const A=v=>Array.isArray(v)?v:[];
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const now=()=>new Date().toISOString();
function currentDb(){try{return window.db||db}catch(_){return null}}
function persist(){
  try{
    const d=currentDb();
    if(!d)return;
    const key=typeof DB_KEY!=='undefined'?DB_KEY:'pcp_app_v1';
    (typeof __johnLocalStorage!=='undefined'?__johnLocalStorage:localStorage).setItem(key,JSON.stringify(d));
  }catch(e){console.warn('[John V8.21] persistência:',e)}
}
function svgData(title,subtitle,base,accent){
  const esc=x=>S(x).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${esc(base)}"/><stop offset="1" stop-color="${esc(accent)}"/></linearGradient>
  </defs>
  <rect width="1200" height="900" fill="#f8f4ea"/>
  <rect x="34" y="34" width="1132" height="832" rx="34" fill="url(#g)" opacity="0.18"/>
  <rect x="78" y="86" width="1044" height="728" rx="26" fill="#fffdf8" stroke="#d8c9a8" stroke-width="4"/>
  <ellipse cx="600" cy="560" rx="300" ry="170" fill="${esc(base)}" opacity="0.18"/>
  <path d="M420 565c30-87 126-148 245-148 129 0 230 69 261 164-71 40-176 64-292 64-93 0-173-17-214-40z" fill="${esc(base)}" opacity="0.75"/>
  <path d="M455 495c26-54 84-89 152-89 70 0 134 37 162 96-53 22-115 34-183 34-49 0-94-6-131-16z" fill="#fff6d6" opacity="0.95"/>
  <circle cx="447" cy="525" r="26" fill="#fff1bf"/><circle cx="502" cy="485" r="22" fill="#fff1bf"/><circle cx="566" cy="468" r="20" fill="#fff1bf"/><circle cx="632" cy="471" r="19" fill="#fff1bf"/><circle cx="697" cy="492" r="21" fill="#fff1bf"/><circle cx="758" cy="526" r="24" fill="#fff1bf"/>
  <text x="110" y="180" font-family="Inter,Arial,sans-serif" font-size="78" font-weight="800" fill="#5b3b10">${esc(title)}</text>
  <text x="112" y="245" font-family="Inter,Arial,sans-serif" font-size="34" font-weight="600" fill="#8a6b3d">${esc(subtitle)}</text>
  <text x="110" y="770" font-family="Inter,Arial,sans-serif" font-size="26" font-weight="700" fill="#7b1438">Caseirinho · imagem padrão do catálogo</text>
  </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}
const REQUIRED=[
  {id:'caseirinho-pao-caseiro',codigo:'900035',nome:'Pão Caseiro',unidade:'UN',preco:11.99,categoria:'Pães',descricao:'Pão caseiro artesanal, pronto para venda no E-commerce.',imagem:svgData('Pão Caseiro','Categoria Pães · Caseirinho','#c08457','#f59e0b')},
  {id:'caseirinho-rosquinha-trancada',codigo:'900036',nome:'Rosquinha Trançada com Açúcar',unidade:'UN',preco:1.49,categoria:'Pães',descricao:'Rosquinha trançada com açúcar, pronta para venda no E-commerce.',imagem:svgData('Rosquinha Trançada','Categoria Pães · Caseirinho','#d97706','#fcd34d')}
];
function nextCode(d){
  let max=0;for(const p of A(d?.produtos)){const n=parseInt(S(p?.codigo).replace(/\D/g,''),10);if(Number.isFinite(n))max=Math.max(max,n)}
  return String(max+1).padStart(6,'0');
}
function findCategory(d,name){
  const cats=A(d?.config?.ecommerce?.categorias).filter(c=>S(c?.id).toUpperCase()!=='GERAL');
  return cats.find(c=>norm(c?.nome)===norm(name))||cats.find(c=>norm(c?.nome).includes(norm(name))||norm(name).includes(norm(c?.nome)))||null;
}
function findProduct(d,spec){
  return A(d?.produtos).find(p=>norm(p?.nome)===norm(spec.nome))
    || A(d?.produtos).find(p=>norm(p?.nome).includes(norm(spec.nome))||norm(spec.nome).includes(norm(p?.nome)))
    || A(d?.produtos).find(p=>S(p?.codigo)===S(spec.codigo))
    || null;
}
async function syncPublished(reason){
  try{window.publicarCatalogoEcommerce?.(true)}catch(_){}
  try{window.johnCloudCapturarAlteracoes?.()}catch(_){}
  try{await window.johnCloudFlushIncremental?.(true)}catch(_){}
  try{await window.JohnV880?.canonicalPublish?.(true)}catch(_){}
  try{window.dispatchEvent(new CustomEvent('john:ecommerce-sync',{detail:{source:'caseirinho-sync',reason}}))}catch(_){}
}
async function ensure(requiredSync=false){
  const d=currentDb(); if(!d||!Array.isArray(d.produtos))return {changed:0};
  let changed=0;
  for(const spec of REQUIRED){
    let p=findProduct(d,spec);
    if(!p){
      p={id:spec.id,codigo:A(d.produtos).some(x=>S(x.codigo)===spec.codigo)?nextCode(d):spec.codigo,nome:spec.nome,status:'ATIVO',unidade:spec.unidade,gtin:'',plu:'',temCaixa:false,embalagem:'',fator:1,custoInicial:0,precoVenda:spec.preco,margem:65,tipos:['Produto acabado'],associados:[],anexos:[],obs:spec.descricao,criadoEm:now(),atualizadoEm:now(),operadorAtualizacao:'John ERP V8.21'};
      d.produtos.push(p);changed++;
    }
    p.status='ATIVO';
    p.unidade=p.unidade||spec.unidade;
    p.precoVenda=N(p.precoVenda)>0?N(p.precoVenda):spec.preco;
    p.tipos=A(p.tipos).length?A(p.tipos):['Produto acabado'];
    if(!A(p.tipos).includes('Produto acabado'))p.tipos=[...new Set([...A(p.tipos),'Produto acabado'])];
    const e=p.ecommerce=p.ecommerce&&typeof p.ecommerce==='object'&&!Array.isArray(p.ecommerce)?p.ecommerce:{};
    const cat=findCategory(d,spec.categoria);
    const before=JSON.stringify({publicar:e.publicar,categoriaId:e.categoriaId,categoria:e.categoria,preco:e.precoEcommerce,img:e.imagem,nome:e.nomeComercial,desc:e.descricao});
    e.publicar=true;
    e.nomeComercial=e.nomeComercial||spec.nome;
    e.descricao=e.descricao||spec.descricao;
    e.precoEcommerce=N(e.precoEcommerce)>0?N(e.precoEcommerce):spec.preco;
    e.precoModo=e.precoModo||'ECOMMERCE';
    e.precoOrigem=e.precoOrigem||'CADASTRO_PRODUTO';
    e.disponibilidade=e.disponibilidade||'AMBOS';
    e.quantidadeMinima=N(e.quantidadeMinima)>0?N(e.quantidadeMinima):1;
    e.limitePedido=N(e.limitePedido)>=0?N(e.limitePedido):0;
    e.antecedenciaDias=Math.max(0,Math.round(N(e.antecedenciaDias)));
    if(cat){e.categoriaId=S(cat.id);e.categoria=S(cat.nome)}
    else{e.categoria=S(e.categoria||spec.categoria)}
    const imgs=[...new Set([e.imagem,spec.imagem,...A(e.imagens)].filter(Boolean))].slice(0,5);
    e.imagem=imgs[0]||spec.imagem;
    e.imagens=imgs;
    const after=JSON.stringify({publicar:e.publicar,categoriaId:e.categoriaId,categoria:e.categoria,preco:e.precoEcommerce,img:e.imagem,nome:e.nomeComercial,desc:e.descricao});
    if(before!==after){p.atualizadoEm=now();changed++;}
  }
  if(changed){persist();try{window.renderEcomProducts?.()}catch(_){}try{window.renderOnline?.()}catch(_){}try{window.johnV8RenderProducts?.()}catch(_){} if(requiredSync)await syncPublished('required-products');}
  return {changed,activeProducts:A(d.produtos).filter(p=>p?.ecommerce?.publicar===true && S(p?.status||'ATIVO').toUpperCase()!=='INATIVO').length};
}
window.JohnCaseirinhoCatalogSync821={ensure,syncPublished,required:REQUIRED};
window.addEventListener('john:storefront-hydrated',()=>setTimeout(()=>ensure(true).catch(console.warn),120));
window.addEventListener('john:cloud-applied',()=>setTimeout(()=>ensure(false).catch(console.warn),160));
document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>ensure(false).catch(console.warn),1200),{once:true});
})();
