(()=>{'use strict';

const CFG=window.CASEIRINHO_CONFIG||{};
const API=String(CFG.apiUrl||'').replace(/\/+$/,'');
const STORE=String(CFG.storeSlug||'caseirinho');
const CATALOG_KEY='john_ecommerce_public_v1';
const CART_KEY='caseirinho_cart_persistente_v1';
const ORDERS_KEY='caseirinho_my_orders_v83';
const PENDING_ORDER_KEY='caseirinho_pending_order_v901';
const CUSTOMER_NOTICE_KEY='caseirinho_customer_notice_v910';
const E=id=>document.getElementById(id);
const S=v=>String(v??'');
const N=v=>Number(v)||0;
const A=v=>Array.isArray(v)?v:[];
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase().replace(/[\s-]+/g,'_');
const money=v=>N(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

let catalog={loja:{},produtos:[]};
let cart=readJson(CART_KEY,[]);
let activeCategory='';
let selectedProduct=null;
let selectedGradeId='';
let currentImages=[];
let cepResolved=false;
let catalogBusy=false;

function readJson(k,fallback){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x??fallback}catch(_){return fallback}}
function writeJson(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}
function removeLocal(k){try{localStorage.removeItem(k)}catch(_){}}
function newRequestId(){
  try{if(crypto?.randomUUID)return crypto.randomUUID()}catch(_){}
  return 'req-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);
}
function orderFingerprint(body){
  return JSON.stringify({
    telefone:normalizePhone(body?.cliente?.telefone),
    modalidade:body?.modalidade,
    dataAtendimento:body?.dataAtendimento,
    horario:body?.horario,
    formaPagamento:body?.formaPagamento,
    entrega:body?.modalidade==='ENTREGA'?body?.entrega:{},
    itens:A(body?.itens).map(x=>({produtoId:S(x.produtoId),quantidade:N(x.quantidade)})),
    observacao:S(body?.observacao)
  });
}
function clientRequestIdFor(body){
  const signature=orderFingerprint(body),pending=readJson(PENDING_ORDER_KEY,{});
  if(pending?.id&&pending?.signature===signature)return pending.id;
  const id=newRequestId();
  writeJson(PENDING_ORDER_KEY,{id,signature,createdAt:new Date().toISOString()});
  return id;
}
function toast(msg){
  const el=E('toast');el.textContent=msg;el.classList.add('show');
  clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),2300);
}
async function api(path,opt={}){
  const r=await fetch(API+path+(path.includes('?')?'&':'?')+'_t='+Date.now(),{
    cache:'no-store',
    ...opt,
    headers:{'Content-Type':'application/json','Cache-Control':'no-cache',...(opt.headers||{})}
  });
  let data={};try{data=await r.json()}catch(_){}
  if(!r.ok)throw new Error(data.error||('Erro HTTP '+r.status));
  return data;
}
function canonicalAvailability(p){
  if(p?.disponibilidadeEfetiva)return norm(p.disponibilidadeEfetiva);
  return norm(p?.disponibilidade||'AMBOS');
}
function canBuy(p){
  if(typeof p?.podeComprar==='boolean')return p.podeComprar;
  const d=canonicalAvailability(p);
  return d==='SOB_ENCOMENDA'||d==='AMBOS'||N(p?.saldoDisponivel)>0;
}
function availabilityText(p){
  const d=canonicalAvailability(p),stock=N(p?.saldoDisponivel),days=Math.max(0,N(p?.antecedenciaDias));
  if(!canBuy(p))return 'Indisponível no momento';
  if(d==='PRONTA_ENTREGA'&&stock>0)return '✓ Pronta entrega disponível';
  if(d==='AMBOS'&&stock>0)return '✓ Pronta entrega · também aceitamos encomenda';
  const suffix=days>0?' · '+days+' dia(s) de antecedência':'';
  return (p?.encomendaAutomatica?'◷ Produção sob encomenda':'◷ Sob encomenda')+suffix;
}
function images(p){
  const arr=A(p?.imagens).filter(Boolean);
  return arr.length?arr:(p?.imagem?[p.imagem]:[]);
}
function minQty(p){return Math.max(.0001,N(p?.quantidadeMinima)||1)}
function stepQty(p){const m=minQty(p);return Number.isInteger(m)&&m>=1?1:Math.min(m,1)}
function categories(){
  const cs=A(catalog.loja?.categorias).filter(c=>c&&c.ativo!==false&&S(c.id)!=='GERAL');
  if(cs.length)return cs.sort((a,b)=>N(a.ordem)-N(b.ordem)||S(a.nome).localeCompare(S(b.nome),'pt-BR'));
  const names=[...new Set(A(catalog.produtos).map(p=>S(p.categoria).trim()).filter(Boolean))];
  return names.map((nome,i)=>({id:'LEG_'+i,nome,emoji:'✨'}));
}
function productCategory(p){
  return categories().find(c=>S(c.id)===S(p.categoriaId))||
         categories().find(c=>norm(c.nome)===norm(p.categoria))||
         {id:'',nome:p.categoria||'Produtos',emoji:'✨'};
}
function gradeMeta(p){
  const g=A(catalog.loja?.grades).find(x=>S(x.id)===S(p?.gradeId))||{};
  const type=norm(p?.gradeTipoOpcao||g.tipoOpcao||'TAMANHO');
  const map={
    TAMANHO:['Tamanho','Tamanhos','📏'],SABOR:['Sabor','Sabores','😋'],
    RECHEIO:['Recheio','Recheios','🥟'],PESO:['Peso','Pesos','⚖️'],
    APRESENTACAO:['Apresentação','Apresentações','📦']
  };
  const m=map[type]||['Opção','Opções','✨'];
  return {
    title:S(p?.gradeTituloOpcao||g.tituloOpcao||m[0]),
    plural:S(p?.gradePluralOpcao||g.pluralOpcao||m[1]),
    icon:m[2]
  };
}
function gradeVariants(p){
  if(!p?.gradeId)return[p];
  return A(catalog.produtos)
    .filter(x=>S(x.gradeId)===S(p.gradeId))
    .sort((a,b)=>N(a.variacaoOrdem)-N(b.variacaoOrdem)||S(a.variacaoLabel).localeCompare(S(b.variacaoLabel),'pt-BR'));
}
function visualEntries(list){
  const out=[],seen=new Set();
  for(const p of list){
    if(!p.gradeId){out.push({rep:p,variants:[p],grouped:false});continue}
    if(seen.has(S(p.gradeId)))continue;
    seen.add(S(p.gradeId));
    const vars=gradeVariants(p);
    const cover=vars.find(v=>S(v.id)===S(p.gradeProdutoCapaId))||vars.find(canBuy)||vars[0];
    out.push({rep:cover,variants:vars,grouped:vars.length>1});
  }
  return out;
}
function cardHtml(entry){
  const p=entry.rep,vars=entry.variants,grouped=entry.grouped,c=productCategory(p);
  const im=images(p)[0],ok=vars.some(canBuy),gm=gradeMeta(p);
  const prices=vars.map(v=>N(v.preco)).filter(v=>v>=0);
  const min=prices.length?Math.min(...prices):N(p.preco),max=prices.length?Math.max(...prices):N(p.preco);
  const title=grouped?(p.gradeNome||p.nome):p.nome;
  const desc=grouped?(p.gradeDescricao||p.descricao||''):p.descricao;
  const availability=grouped
    ?(ok?`${gm.icon} Escolha ${gm.title.toLowerCase()} para ver disponibilidade`:'Indisponível no momento')
    :availabilityText(p);
  return `<article class="product-card">
    <div class="product-pic" data-view="${esc(p.id)}">
      ${im?`<img src="${esc(im)}" alt="${esc(title)}" loading="lazy"><span class="image-note">Imagem meramente ilustrativa</span>`:'<div class="no-image">🍽️</div>'}
      <div class="tags">${vars.some(v=>v.novidade)?'<span class="tag hot">NOVIDADE</span>':''}${vars.some(v=>v.destaque)?'<span class="tag">DESTAQUE</span>':''}</div>
    </div>
    <div class="product-body">
      <div class="category-label">${esc(c.nome)}</div>
      <h3>${esc(title)}</h3>
      <div class="description">${esc(desc||'Produto artesanal do Caseirinho.')}</div>
      <div class="price">${grouped&&max>min+.001?'A partir de ':''}${money(min)}</div>
      ${grouped?`<div class="variant-summary">${gm.icon} ${esc(gm.plural)}: ${vars.map(v=>esc(v.variacaoLabel||v.nome)).join(' · ')}</div>`:''}
      <div class="availability ${ok?'':'no'}">${esc(availability)}</div>
      <div class="actions">
        <button class="view-btn" data-view="${esc(p.id)}" type="button">${grouped?'Escolher '+esc(gm.title.toLowerCase()):'Ver produto'}</button>
        ${grouped?'':`<button class="add-btn" data-add="${esc(p.id)}" type="button" ${canBuy(p)&&catalog.loja?.ativo!==false?'':'disabled'}>+ Carrinho</button>`}
      </div>
    </div>
  </article>`;
}
function wireProductCards(root){
  root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showProduct(b.dataset.view));
  root.querySelectorAll('[data-add]').forEach(b=>b.onclick=e=>{e.stopPropagation();quickAdd(b.dataset.add)});
}
function renderCategories(){
  const cs=categories();
  E('categories').innerHTML=
    `<button class="cat-chip ${!activeCategory?'active':''}" data-cat="">✨ Todos</button>`+
    cs.map(c=>`<button class="cat-chip ${S(activeCategory)===S(c.id)?'active':''}" data-cat="${esc(c.id)}">${esc(c.emoji||'✨')} ${esc(c.nome)}</button>`).join('');
  E('categories').querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{
    activeCategory=b.dataset.cat||'';
    renderCategories();renderProducts();
  });
}
function filteredProducts(){
  const q=norm(E('search')?.value);
  return A(catalog.produtos).filter(p=>{
    if(activeCategory&&S(productCategory(p).id)!==S(activeCategory))return false;
    if(q&&!norm(`${p.codigo} ${p.nome} ${p.descricao} ${p.categoria} ${p.gradeNome||''} ${p.variacaoLabel||''}`).includes(q))return false;
    return true;
  });
}
function renderProducts(){
  const entries=visualEntries(filteredProducts());
  const cat=categories().find(c=>S(c.id)===S(activeCategory));
  E('catalogTitle').textContent=cat?.nome||'Todos os produtos';
  E('catalogCount').textContent=entries.length+' produto(s)';
  E('products').innerHTML=entries.map(cardHtml).join('')||'<div class="empty">Nenhum produto encontrado.</div>';
  wireProductCards(E('products'));
}
function renderFeatured(){
  let entries=visualEntries(A(catalog.produtos)).filter(e=>e.variants.some(v=>v.destaque||v.novidade));
  if(!entries.length)entries=visualEntries(A(catalog.produtos)).slice(0,4);
  E('featured').innerHTML=entries.map(cardHtml).join('')||'<div class="empty">O cardápio está sendo atualizado.</div>';
  wireProductCards(E('featured'));
}
function mount(){
  E('storeName').textContent=catalog.loja?.nome||'Caseirinho';
  E('footerName').textContent=catalog.loja?.nome||'Caseirinho massas artesanais';
  E('storeSub').textContent=catalog.loja?.subtitulo||'Feito com carinho para você.';
  renderCategories();renderFeatured();renderProducts();renderCart();renderCheckoutConfig();
}
async function loadCatalog(silent=false){
  if(catalogBusy)return;
  catalogBusy=true;
  try{
    const cloud=await api('/api/v1/public/store/'+encodeURIComponent(STORE)+'/catalog');
    const cached=readJson(CATALOG_KEY,{produtos:[]});
    const oldMap=new Map(A(cached.produtos).map(p=>[S(p.id),p]));
    cloud.produtos=A(cloud.produtos).map(p=>{
      if(images(p).length)return p;
      const old=oldMap.get(S(p.id));
      return old&&images(old).length?{...p,imagem:images(old)[0],imagens:images(old)}:p;
    });
    catalog=cloud;writeJson(CATALOG_KEY,catalog);
    E('syncStatus').textContent=`Loja conectada · ${A(catalog.produtos).length} produto(s) · atualizado ${catalog.publicadoEm?new Date(catalog.publicadoEm).toLocaleString('pt-BR'):'agora'}`;
    mount();
  }catch(err){
    const cached=readJson(CATALOG_KEY,null);
    if(cached&&A(cached.produtos).length){
      catalog=cached;mount();
      E('syncStatus').textContent='Sem conexão momentânea · exibindo último cardápio sincronizado.';
      if(!silent)toast('Conexão temporariamente indisponível.');
    }else{
      E('syncStatus').textContent='Não foi possível carregar o cardápio: '+err.message;
      E('products').innerHTML='<div class="empty">Não conseguimos carregar o cardápio agora.</div>';
    }
  }finally{catalogBusy=false}
}

function showProduct(id){
  const p=A(catalog.produtos).find(x=>S(x.id)===S(id));if(!p)return;
  selectedProduct=p;selectedGradeId=S(p.gradeId||'');
  const vars=gradeVariants(p),grouped=vars.length>1,gm=gradeMeta(p);
  const cat=productCategory(p);

  E('modalCategory').textContent=cat.nome;
  E('modalName').textContent=grouped?(p.gradeNome||p.nome):p.nome;
  E('modalDescription').textContent=(grouped?(p.gradeDescricao||p.descricao):p.descricao)||'Produto artesanal do Caseirinho.';

  if(grouped){
    E('variantBox').className='variant-box';
    E('variantBox').innerHTML=`<div class="variant-title">${gm.icon} Escolha ${esc(gm.title.toLowerCase())}</div><div class="variant-buttons">${
      vars.map(v=>`<button data-variant="${esc(v.id)}" class="${S(v.id)===S(p.id)?'active':''}" ${canBuy(v)?'':'disabled'} type="button"><span>${esc(v.variacaoLabel||v.nome)}</span><strong>${money(v.preco)}</strong></button>`).join('')
    }</div>`;
    E('variantBox').querySelectorAll('[data-variant]').forEach(b=>b.onclick=()=>showProduct(b.dataset.variant));
  }else{
    E('variantBox').className='';E('variantBox').innerHTML='';
  }

  E('modalPrice').textContent=money(p.preco);
  E('modalAvailability').textContent=availabilityText(p);
  E('modalAvailability').className='availability '+(canBuy(p)?'':'no');
  E('modalQty').min=minQty(p);E('modalQty').step=stepQty(p);E('modalQty').value=minQty(p);
  E('modalQty').disabled=!canBuy(p);
  E('modalAdd').disabled=!canBuy(p)||catalog.loja?.ativo===false;
  E('modalAdd').textContent=canBuy(p)?'Adicionar ao carrinho':'Indisponível no momento';
  renderGallery(images(p),0);
  openOverlay(E('productOverlay'));
}
function renderGallery(imgs,index){
  currentImages=imgs;
  const src=imgs[index];
  E('galleryMain').innerHTML=src?`<img src="${esc(src)}" alt="Produto"><span class="image-note">Imagem meramente ilustrativa</span>`:'<div class="no-image">🍽️</div>';
  E('thumbs').innerHTML=imgs.length>1?imgs.map((x,i)=>`<button class="thumb ${i===index?'active':''}" data-thumb="${i}" type="button"><img src="${esc(x)}" alt=""></button>`).join(''):'';
  E('thumbs').querySelectorAll('[data-thumb]').forEach(b=>b.onclick=()=>renderGallery(imgs,N(b.dataset.thumb)));
}
function quickAdd(id,qty){
  const p=A(catalog.produtos).find(x=>S(x.id)===S(id));if(!p)return;
  if(!canBuy(p))return toast('Este produto está indisponível no momento.');
  const min=minQty(p),step=stepQty(p),wanted=Math.max(min,N(qty)||min),limit=N(p.limitePedido);
  const row=cart.find(x=>S(x.produtoId)===S(id));
  const add=row?(N(qty)>0?wanted:step):wanted;
  if(limit&&N(row?.quantidade)+add>limit+1e-9)return toast('Limite por pedido: '+limit);
  if(row)row.quantidade+=add;
  else cart.push({
    produtoId:p.id,
    codigo:p.codigo,
    nome:p.gradeId?`${p.gradeNome||p.nome} · ${p.variacaoLabel||p.nome}`:p.nome,
    quantidade:add,
    precoUnitario:N(p.preco),
    imagem:images(p)[0]||''
  });
  renderCart();toast('Produto adicionado ao carrinho.');
}
function renderCart(){
  cart=cart.filter(x=>x&&x.produtoId);
  writeJson(CART_KEY,cart);
  const count=cart.reduce((s,x)=>s+N(x.quantidade),0);
  E('cartCount').textContent=count;E('navCartCount').textContent=count;

  E('cartItems').innerHTML=cart.map((x,i)=>{
    const p=A(catalog.produtos).find(y=>S(y.id)===S(x.produtoId));
    const min=p?minQty(p):1,step=p?stepQty(p):1;
    return `<div class="cart-item">
      ${x.imagem?`<img src="${esc(x.imagem)}" alt="">`:'<div class="no-image" style="font-size:25px">🍽️</div>'}
      <div><h4>${esc(x.nome)}</h4><small>${money(x.precoUnitario)} cada</small>
        <div class="qty"><button data-minus="${i}" type="button">−</button><b>${x.quantidade}</b><button data-plus="${i}" type="button">+</button></div>
      </div>
      <div style="text-align:right"><b>${money(N(x.quantidade)*N(x.precoUnitario))}</b><br><button class="remove" data-remove="${i}" type="button">Remover</button></div>
    </div>`;
  }).join('')||'<div class="empty">Seu carrinho está vazio.</div>';

  E('cartItems').querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>{
    const i=N(b.dataset.minus),x=cart[i],p=A(catalog.produtos).find(y=>S(y.id)===S(x.produtoId)),min=p?minQty(p):1,step=p?stepQty(p):1;
    if(N(x.quantidade)-step<min-1e-9)return toast('Use Remover para retirar o produto do carrinho.');
    x.quantidade=Math.max(min,N(x.quantidade)-step);renderCart();
  });
  E('cartItems').querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>{
    const i=N(b.dataset.plus),x=cart[i],p=A(catalog.produtos).find(y=>S(y.id)===S(x.produtoId)),step=p?stepQty(p):1,limit=N(p?.limitePedido);
    if(limit&&N(x.quantidade)+step>limit+1e-9)return toast('Limite por pedido: '+limit);
    x.quantidade+=step;renderCart();
  });
  E('cartItems').querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{cart.splice(N(b.dataset.remove),1);renderCart()});

  const sub=cart.reduce((s,x)=>s+N(x.quantidade)*N(x.precoUnitario),0);
  const freight=freightInfo();
  E('subtotal').textContent=money(sub);
  E('shipping').textContent=E('mode')?.value==='ENTREGA'?(freight.pending?'A cotar':money(freight.value)):money(0);
  E('grandTotal').textContent=freight.pending?money(sub)+' + frete':money(sub+freight.value);
  updateDateMin();
}
function normalizePhone(v){
  let d=S(v).replace(/\D/g,'');
  if(d.startsWith('55')&&d.length===13)d=d.slice(2);
  return d.slice(0,11);
}
function formatPhone(v){
  const d=normalizePhone(v);
  if(d.length<=2)return d;
  if(d.length<=7)return `(${d.slice(0,2)}) ${d.slice(2)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}
function validPhone(v){return /^[1-9][0-9]9[0-9]{8}$/.test(normalizePhone(v))}
function serviceDays(mode){
  const key=mode==='ENTREGA'?'diasEntregaSemana':'diasRetiradaSemana';
  const a=A(catalog.loja?.[key]).map(Number).filter(x=>x>=0&&x<=6);
  return a.length?a:[0,1,2,3,4,5,6];
}
function dayOf(iso){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(S(iso)))return -1;
  const [y,m,d]=iso.split('-').map(Number);return new Date(Date.UTC(y,m-1,d)).getUTCDay();
}
function allowedDate(iso,mode){return serviceDays(mode).includes(dayOf(iso))}
function nextAllowed(min,mode){
  let d=new Date(min+'T12:00:00');
  for(let i=0;i<30;i++){const x=d.toISOString().slice(0,10);if(allowedDate(x,mode))return x;d.setDate(d.getDate()+1)}
  return min;
}
function updateDateMin(){
  if(!E('date'))return;
  let days=Math.max(0,N(catalog.loja?.antecedenciaPadraoDias));
  for(const x of cart){const p=A(catalog.produtos).find(y=>S(y.id)===S(x.produtoId));days=Math.max(days,N(p?.antecedenciaDias))}
  const d=new Date();d.setDate(d.getDate()+days);
  const min=d.toISOString().slice(0,10),mode=E('mode')?.value||'RETIRADA';
  E('date').min=min;
  if(!E('date').value||E('date').value<min||!allowedDate(E('date').value,mode))E('date').value=nextAllowed(min,mode);
  const labels=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
  E('deliveryDays').innerHTML=`<b>Dias disponíveis para ${mode==='ENTREGA'?'entrega':'retirada'}:</b> ${serviceDays(mode).map(x=>labels[x]).join(', ')}.`;
}
function renderCheckoutConfig(){
  const currentMode=E('mode')?.value||'';
  const currentPayment=E('payment')?.value||'';
  const modes=[];
  if(catalog.loja?.permitirRetirada!==false)modes.push(['RETIRADA','Retirada']);
  if(catalog.loja?.permitirEntrega)modes.push(['ENTREGA','Entrega']);
  E('mode').innerHTML=modes.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')||'<option value="">Indisponível</option>';
  if(currentMode&&modes.some(([v])=>v===currentMode))E('mode').value=currentMode;

  const payments=A(catalog.loja?.formasPagamento);
  const paymentOptions=payments.length?payments:['A definir'];
  E('payment').innerHTML=paymentOptions.map(x=>`<option>${esc(x)}</option>`).join('');
  if(currentPayment&&paymentOptions.includes(currentPayment))E('payment').value=currentPayment;
  modeChanged();
}
function modeChanged(){
  const delivery=E('mode').value==='ENTREGA';
  E('deliveryBox').classList.toggle('hidden',!delivery);
  E('cep').required=delivery;E('number').required=delivery;
  if(E('time')){
    if(delivery){
      E('time').type='text';
      E('time').value='A combinar';
      E('time').readOnly=true;
      E('time').setAttribute('aria-label','Horário de entrega a combinar');
    }else{
      E('time').readOnly=false;
      E('time').type='time';
      if(E('time').value==='A combinar')E('time').value='';
    }
  }
  updateDateMin();renderCart();
}
function address(){
  return {
    cep:S(E('cep').value).replace(/\D/g,''),
    logradouro:S(E('street').value).trim(),
    numero:S(E('number').value).trim(),
    complemento:S(E('comp').value).trim(),
    bairro:S(E('district').value).trim(),
    cidade:S(E('city').value).trim(),
    uf:S(E('uf').value).trim()
  };
}
function freightInfo(){
  if(E('mode')?.value!=='ENTREGA')return{pending:false,value:0};
  const a=address(),rules=A(catalog.loja?.regrasFreteEcommerce);
  const normT=v=>norm(v);
  const matches=r=>{
    const type=normT(r.vinculoTipo||'CIDADE'),loc=normT(r.localidade),cep=S(a.cep).replace(/\D/g,'');
    if(r.uf&&normT(r.uf)!==normT(a.uf))return false;
    if(r.cidadeBase&&normT(r.cidadeBase)!==normT(a.cidade))return false;
    if(type==='CIDADE')return normT(a.cidade)===loc;
    if(type==='BAIRRO')return normT(a.bairro)===loc;
    if(type==='CEP')return cep===S(r.localidade).replace(/\D/g,'');
    if(type==='CEP_PREFIXO')return cep.startsWith(S(r.localidade).replace(/\D/g,''));
    if(type==='CEP_FAIXA'){
      let x=S(r.cepInicial).replace(/\D/g,''),y=S(r.cepFinal).replace(/\D/g,'');
      if(x>y)[x,y]=[y,x];return cep.length===8&&x.length===8&&y.length===8&&cep>=x&&cep<=y;
    }
    return false;
  };
  const rule=rules.find(r=>r&&r.ativo!==false&&matches(r));
  if(rule&&norm(rule.tipo||'FIXO')==='FIXO')return{pending:false,value:Math.max(0,N(rule.valorFixo)),rule};
  if(!rules.length){
    const cities=A(catalog.loja?.localidadesFretePadrao).length?A(catalog.loja.localidadesFretePadrao):['Ferraz de Vasconcelos','Poá','Suzano'];
    const local=cities.some(x=>norm(typeof x==='string'?x:x?.cidade)===norm(a.cidade));
    if(local)return{pending:false,value:Math.max(0,N(catalog.loja?.freteFixo))};
  }
  return{pending:true,value:0};
}
async function lookupCep(){
  const raw=S(E('cep').value).replace(/\D/g,'');
  if(raw.length!==8)return;
  cepResolved=false;E('cepStatus').className='info-box';E('cepStatus').textContent='Consultando CEP...';
  try{
    let data=null;
    try{data=await api('/api/v1/public/store/'+encodeURIComponent(STORE)+'/address/cep/'+raw)}catch(_){}
    if(!data||!(data.logradouro||data.localidade||data.cidade)){
      const r=await fetch('https://viacep.com.br/ws/'+raw+'/json/',{cache:'no-store'});
      data=await r.json();if(data.erro)throw new Error('CEP não encontrado.');
    }
    E('cep').value=raw.replace(/^(\d{5})(\d{3})$/,'$1-$2');
    E('street').value=data.logradouro||'';
    E('district').value=data.bairro||'';
    E('city').value=data.cidade||data.localidade||'';
    E('uf').value=data.uf||'';
    if(data.complemento&&!E('comp').value)E('comp').value=data.complemento;
    cepResolved=true;
    E('cepStatus').className='info-box ok';
    E('cepStatus').innerHTML=`✅ Endereço localizado: <b>${esc(E('street').value)}</b> · ${esc(E('district').value)} · ${esc(E('city').value)}/${esc(E('uf').value)}. Agora informe somente o número.`;
    E('number').focus();renderCart();
  }catch(err){
    E('cepStatus').className='info-box err';E('cepStatus').textContent='❌ '+err.message;
  }
}


function customerModal(){
  let ov=E('customerExperienceOverlay');
  if(ov)return ov;
  ov=document.createElement('div');
  ov.id='customerExperienceOverlay';
  ov.className='customer-experience-overlay';
  ov.setAttribute('aria-hidden','true');
  ov.innerHTML=`<div class="customer-experience-card" role="dialog" aria-modal="true" aria-labelledby="customerExperienceTitle">
    <div class="customer-experience-icon" id="customerExperienceIcon">✨</div>
    <h3 id="customerExperienceTitle">Atualização do pedido</h3>
    <div id="customerExperienceBody" class="customer-experience-body"></div>
    <div id="customerExperienceActions" class="customer-experience-actions"></div>
  </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click',async e=>{
    if(e.target===ov&&ov.dataset.locked!=='1')return closeCustomerModal();
    const copy=e.target.closest?.('[data-copy-pix]');
    if(copy){
      const value=copy.getAttribute('data-copy-pix')||'';
      try{await navigator.clipboard.writeText(value);toast('Chave PIX copiada.')}catch(_){toast('Não foi possível copiar. Selecione a chave manualmente.')}
    }
  });
  return ov;
}
function closeCustomerModal(){
  const ov=E('customerExperienceOverlay');if(!ov)return;
  ov.classList.remove('open');ov.setAttribute('aria-hidden','true');ov.dataset.locked='0';
}
function customerDialog({title,html,icon='✨',actions=[{label:'OK',value:true,primary:true}],locked=false}={}){
  return new Promise(resolve=>{
    const ov=customerModal();
    E('customerExperienceTitle').textContent=title||'Atualização do pedido';
    E('customerExperienceIcon').textContent=icon;
    E('customerExperienceBody').innerHTML=html||'';
    const box=E('customerExperienceActions');box.innerHTML='';
    ov.dataset.locked=locked?'1':'0';
    for(const a of actions){
      const b=document.createElement('button');
      b.type='button';b.className=a.primary?'primary':'soft';b.textContent=a.label;
      b.onclick=()=>{closeCustomerModal();resolve(a.value)};box.appendChild(b);
    }
    ov.classList.add('open');ov.setAttribute('aria-hidden','false');
  });
}
function freightWarningHtml(info){
  if(info.pending){
    return `<div class="cx-highlight warn">🛵 <b>Este pedido terá valor de entrega.</b></div>
      <p>Seu endereço precisa de cotação. A loja calculará o frete no ERP e o valor aparecerá aqui no app.</p>
      <p>Você poderá responder <b>Sim</b> ou <b>Não</b> ao valor antes de o pedido ser aceito.</p>
      <div class="cx-note">Horário de entrega: <b>A combinar</b>. A loja informará o horário depois do aceite.</div>`;
  }
  return `<div class="cx-highlight">🛵 <b>Valor de entrega: ${money(info.value)}</b></div>
    <p>Este valor será somado ao pedido.</p>
    <div class="cx-note">Horário de entrega: <b>A combinar</b>. A loja informará o horário depois do aceite.</div>`;
}
async function confirmDeliveryExperience(){
  const info=freightInfo();
  return customerDialog({
    title:'Confirme sua entrega',icon:'🛵',html:freightWarningHtml(info),locked:true,
    actions:[{label:'Voltar',value:false},{label:'Continuar pedido',value:true,primary:true}]
  });
}
function pixCard(pix){
  if(!pix?.chave)return'';
  return `<div class="pix-card"><div class="pix-title">💠 PIX disponível</div>
    <div><small>Chave PIX</small><b class="pix-key">${esc(pix.chave)}</b></div>
    ${pix.nome?`<div><small>Recebedor</small><b>${esc(pix.nome)}</b></div>`:''}
    ${pix.valor!==undefined?`<div><small>Valor</small><b>${money(pix.valor)}</b></div>`:''}
    <button class="soft" type="button" data-copy-pix="${esc(pix.chave)}">Copiar chave PIX</button></div>`;
}
function orderTimeText(o){
  if(norm(o.modalidade)!=='ENTREGA')return S(o.horario||'');
  const h=S(o.horario||o.horarioEntrega||'').trim();
  return /^([01]\\d|2[0-3]):[0-5]\\d$/.test(h)?h:'A combinar';
}
function customerStatusLabel(st){
  const labels={
    NOVO:'Recebido',PENDENTE:'Recebido',COTACAO_PENDENTE:'Frete a calcular',
    AGUARDANDO_CLIENTE_FRETE:'Aguardando sua resposta',AGUARDANDO_ACEITE_ERP:'Frete aprovado · aguardando loja',
    FRETE_RECUSADO_CLIENTE:'Pedido cancelado',CANCELADO:'Pedido cancelado',ACEITO:'Aceito',REJEITADO:'Rejeitado',
    IMPORTADO:'Aceito',EM_PRODUCAO:'Em produção',PRONTO:'Pronto',ENTREGUE:'Entregue',RETIRADO:'Retirado'
  };
  return labels[norm(st)]||S(st||'Recebido').replaceAll('_',' ');
}
function saveOrderUpdate(updated){
  const orders=readJson(ORDERS_KEY,[]);
  const i=orders.findIndex(x=>S(x.id)===S(updated.id));
  if(i>=0)orders[i]={...orders[i],...updated};else orders.push(updated);
  writeJson(ORDERS_KEY,orders.slice(-100));
  return orders[i>=0?i:orders.length-1];
}
async function shippingDecision(o,accept){
  if(!o?.id||!o?.publicToken)return;
  try{
    const d=await api('/api/v1/public/store/'+encodeURIComponent(STORE)+'/orders/'+encodeURIComponent(o.id)+'/shipping-decision',{
      method:'POST',body:JSON.stringify({token:o.publicToken,decision:accept?'ACCEPT':'REJECT'})
    });
    const saved=saveOrderUpdate({...o,...d});
    if(accept){
      await customerDialog({
        title:'Frete aprovado',icon:'✅',
        html:'<p>Obrigado! O pedido voltou para a loja e agora aguarda o aceite final.</p>'
      });
    }else{
      const action=await customerDialog({
        title:'Pedido cancelado',icon:'🛑',
        html:'<div class="cx-highlight warn"><b>Pedido cancelado.</b></div><p>Você não aceitou o valor da entrega.</p><p>Se quiser continuar comprando, faça um <b>novo pedido</b>.</p>',
        actions:[
          {label:'Fechar',value:'CLOSE'},
          {label:'Fazer novo pedido',value:'NEW_ORDER',primary:true}
        ]
      });
      if(action==='NEW_ORDER'){
        closeOverlay(E('simpleOverlay'));
        E('catalogSection')?.scrollIntoView({behavior:'smooth'});
      }
    }
    await showOrders();
  }catch(err){toast(err.message)}
}
function bindCustomerExperienceActions(root=document){
  root.querySelectorAll('[data-copy-pix]').forEach(b=>b.onclick=async()=>{
    const value=b.getAttribute('data-copy-pix')||'';
    try{await navigator.clipboard.writeText(value);toast('Chave PIX copiada.')}catch(_){toast('Não foi possível copiar. Selecione a chave manualmente.')}
  });
  root.querySelectorAll('[data-shipping-yes]').forEach(b=>b.onclick=()=>{
    const orders=readJson(ORDERS_KEY,[]),o=orders.find(x=>S(x.id)===S(b.dataset.shippingYes));
    if(o)shippingDecision(o,true);
  });
  root.querySelectorAll('[data-shipping-no]').forEach(b=>b.onclick=()=>{
    const orders=readJson(ORDERS_KEY,[]),o=orders.find(x=>S(x.id)===S(b.dataset.shippingNo));
    if(o)shippingDecision(o,false);
  });
}
function seenNotices(){return readJson(CUSTOMER_NOTICE_KEY,{})}
function markNotice(key){const x=seenNotices();x[key]=new Date().toISOString();writeJson(CUSTOMER_NOTICE_KEY,x)}
async function notifyOrderChange(before,after){
  if(!after?.id)return;
  const seen=seenNotices(),st=norm(after.status),old=norm(before?.status);
  const quoteKey=`${after.id}:quote:${after.freteCotadoEm||after.updatedAt||after.valorFrete}`;
  if(st==='AGUARDANDO_CLIENTE_FRETE'&&norm(after.freteDecisaoCliente||'PENDENTE')==='PENDENTE'&&!seen[quoteKey]){
    markNotice(quoteKey);
    const yes=await customerDialog({title:'Valor da entrega disponível',icon:'🛵',locked:true,
      html:`<div class="cx-highlight">Frete: <b>${money(after.valorFrete)}</b></div><p>Total do pedido: <b>${money(after.total)}</b></p><p>Você aceita esse valor de entrega?</p>`,
      actions:[{label:'Não',value:false},{label:'Sim, aceito',value:true,primary:true}]});
    await shippingDecision(after,yes);return;
  }
  const acceptKey=`${after.id}:accepted:${after.aceitoEm||after.updatedAt}`;
  if(st==='ACEITO'&&old!=='ACEITO'&&!seen[acceptKey]){
    markNotice(acceptKey);
    await customerDialog({title:'Seu pedido foi aceito!',icon:'🎉',
      html:`<p>Pedido <b>${esc(after.codigo||after.id)}</b> confirmado pela loja.</p>${pixCard(after.pix)}${norm(after.modalidade)==='ENTREGA'?`<div class="cx-note">Horário de entrega: <b>${esc(orderTimeText(after))}</b></div>`:''}`});
    bindCustomerExperienceActions(customerModal());return;
  }
  const h=orderTimeText(after),oldH=orderTimeText(before||{});
  const timeKey=`${after.id}:time:${h}`;
  if(norm(after.modalidade)==='ENTREGA'&&/^([01]\\d|2[0-3]):[0-5]\\d$/.test(h)&&h!==oldH&&!seen[timeKey]){
    markNotice(timeKey);
    await customerDialog({title:'Horário de entrega confirmado',icon:'🕐',html:`<p>Sua entrega foi programada para <b>${esc(h)}</b>.</p>`});return;
  }
  const cancelKey=`${after.id}:cancelled:${after.canceladoEm||after.updatedAt}`;
  if(st==='CANCELADO'&&old!=='CANCELADO'&&!seen[cancelKey]){
    markNotice(cancelKey);
    const action=await customerDialog({
      title:'Pedido cancelado',icon:'🛑',
      html:`<div class="cx-highlight warn"><b>Pedido cancelado.</b></div><p>${esc(after.mensagemCliente||'O pedido foi cancelado. Caso queira prosseguir, faça um novo pedido.')}</p>`,
      actions:[
        {label:'Fechar',value:'CLOSE'},
        {label:'Fazer novo pedido',value:'NEW_ORDER',primary:true}
      ]
    });
    if(action==='NEW_ORDER'){
      closeOverlay(E('simpleOverlay'));
      E('catalogSection')?.scrollIntoView({behavior:'smooth'});
    }
    return;
  }
  const rejectKey=`${after.id}:rejected:${after.rejeitadoEm||after.updatedAt}`;
  if(st==='REJEITADO'&&old!=='REJEITADO'&&!seen[rejectKey]){
    markNotice(rejectKey);
    await customerDialog({title:'Atualização do pedido',icon:'❌',html:`<p>O pedido foi rejeitado pela loja.</p>${after.mensagemCliente?`<div class="cx-note">${esc(after.mensagemCliente)}</div>`:''}`});
  }
}
async function pollCustomerOrders(){
  if(document.hidden)return;
  const orders=readJson(ORDERS_KEY,[]);
  for(const before of orders.slice(-12)){
    const after=await refreshOrder(before);
    if(JSON.stringify(after)!==JSON.stringify(before))saveOrderUpdate(after);
    await notifyOrderChange(before,after);
  }
}

async function submitOrder(ev){
  ev.preventDefault();
  E('checkoutResult').innerHTML='';

  if(!cart.length)return toast('Seu carrinho está vazio.');
  if(!validPhone(E('cPhone').value)){
    E('cPhone').focus();
    return toast('Informe um WhatsApp válido com DDD.');
  }
  if(!E('consent').checked){
    E('consent').focus();
    return toast('Aceite a Política de Privacidade / LGPD para continuar.');
  }

  const mode=E('mode').value;
  if(!mode)return toast('Selecione Retirada ou Entrega.');
  if(!allowedDate(E('date').value,mode))return toast('A data escolhida não está disponível.');

  if(mode==='ENTREGA'){
    const a=address();
    if(a.cep.length!==8||!cepResolved||!a.logradouro||!a.numero||!a.cidade){
      return toast('Consulte o CEP e informe o número do endereço.');
    }
    const confirmed=await confirmDeliveryExperience();
    if(!confirmed)return;
  }

  const now=new Date().toISOString();
  const body={
    cliente:{
      nome:S(E('cName').value).trim(),
      telefone:S(E('cPhone').value).trim(),
      email:S(E('cEmail').value).trim(),
      cpf:S(E('cCpf').value).trim()
    },
    modalidade:mode,
    dataAtendimento:E('date').value,
    horario:mode==='ENTREGA'?'A combinar':E('time').value,
    formaPagamento:E('payment').value,
    entrega:mode==='ENTREGA'?address():{},
    itens:cart.map(x=>({produtoId:S(x.produtoId),quantidade:N(x.quantidade)})),
    observacao:S(E('obs').value).trim(),
    lgpd:{
      consent:true,
      consentAt:now,
      policyVersion:S(catalog.loja?.lgpd?.versao||catalog.loja?.lgpd?.policyVersion||'1.0'),
      purpose:'CADASTRO_PEDIDO_ENTREGA_CONTATO'
    }
  };

  // O mesmo pedido/retry mantém o mesmo ID até receber confirmação do servidor.
  body.clientRequestId=clientRequestIdFor(body);

  const btn=ev.submitter||E('checkout').querySelector('[type=submit]');
  const old=btn.textContent;
  btn.disabled=true;
  btn.textContent='Enviando...';

  try{
    const result=await api(
      '/api/v1/public/store/'+encodeURIComponent(STORE)+'/orders',
      {method:'POST',body:JSON.stringify(body)}
    );

    const saved={
      ...body,
      ...result,
      publicToken:result.publicToken,
      savedAt:new Date().toISOString(),
      itens:cart.map(x=>({...x,total:N(x.quantidade)*N(x.precoUnitario)}))
    };

    const orders=readJson(ORDERS_KEY,[]);
    const idx=orders.findIndex(x=>S(x.id)===S(saved.id));
    if(idx>=0)orders[idx]={...orders[idx],...saved};
    else orders.push(saved);
    writeJson(ORDERS_KEY,orders.slice(-100));

    // Somente depois de uma resposta válida podemos liberar o requestId.
    removeLocal(PENDING_ORDER_KEY);

    let freightText='';
    if(mode==='RETIRADA'){
      freightText='Retirada selecionada · sem cobrança de frete.';
    }else if(result.freteStatus==='COTACAO_PENDENTE'){
      freightText=result.freteMensagem||'Frete pendente de cálculo. A equipe informará o valor antes da confirmação.';
    }else{
      freightText=`Frete: ${money(result.valorFrete||0)}`;
      if(result.freteRegraNome)freightText+=` · ${result.freteRegraNome}`;
    }

    E('checkoutResult').innerHTML=
      `<div class="result">
        <b>Pedido ${esc(result.codigo)} recebido! 🎉</b><br>
        ${esc(freightText)}<br>
        Total atual: <b>${money(result.total)}</b><br>
        <button class="soft" type="button" id="openSavedOrders" style="margin-top:9px">Acompanhar pedido</button>
      </div>`;

    E('openSavedOrders').onclick=showOrders;
    cart=[];
    renderCart();
  }catch(err){
    E('checkoutResult').innerHTML=
      `<div class="result err">
        <b>Pedido não enviado.</b><br>
        ${esc(err.message)}<br>
        Seu carrinho foi preservado. Você pode corrigir e tentar novamente.
      </div>`;
  }finally{
    btn.disabled=false;
    btn.textContent=old;
  }
}

function openOverlay(el){el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.style.overflow='hidden'}
function closeOverlay(el){el.classList.remove('open');el.setAttribute('aria-hidden','true');document.body.style.overflow=''}
function openSimple(title,html){
  E('simpleTitle').textContent=title;E('simpleBody').innerHTML=html;openOverlay(E('simpleOverlay'));
}
async function refreshOrder(o){
  if(!o?.id||!o?.publicToken)return o;
  const token=encodeURIComponent(o.publicToken);
  try{
    const d=await api('/api/v1/public/store/'+encodeURIComponent(STORE)+'/orders/'+encodeURIComponent(o.id)+'/experience?token='+token);
    return{...o,...d,publicToken:o.publicToken};
  }catch(_){
    try{
      const d=await api('/api/v1/public/store/'+encodeURIComponent(STORE)+'/orders/'+encodeURIComponent(o.id)+'?token='+token);
      return{...o,...d,publicToken:o.publicToken};
    }catch(__){return o}
  }
}
async function showOrders(){
  let orders=readJson(ORDERS_KEY,[]);
  if(orders.length){
    const recent=orders.slice(-12);
    for(let i=0;i<recent.length;i++){
      const updated=await refreshOrder(recent[i]);
      const originalIndex=orders.findIndex(x=>S(x.id)===S(updated.id));
      if(originalIndex>=0)orders[originalIndex]=updated;
    }
    writeJson(ORDERS_KEY,orders);
  }
  const html=orders.slice().reverse().map(o=>{
    const st=norm(o.status||'NOVO'),msg=o.mensagemCliente||'',delivery=norm(o.modalidade)==='ENTREGA';
    const awaiting=st==='AGUARDANDO_CLIENTE_FRETE'&&norm(o.freteDecisaoCliente||'PENDENTE')==='PENDENTE';
    return `<div class="order-card"><div class="order-top"><div><b>${esc(o.codigo||o.id)}</b><br><small>${new Date(o.criadoEm||o.savedAt||Date.now()).toLocaleString('pt-BR')}</small></div><span class="status-badge ${esc(st)}">${esc(customerStatusLabel(st))}</span></div>
      <div class="order-customer-grid"><div><small>Total</small><b>${money(o.total||o.subtotal)}</b></div>${delivery?`<div><small>Entrega</small><b>${esc(orderTimeText(o))}</b></div>`:''}${delivery?`<div><small>Frete</small><b>${o.freteStatus==='COTACAO_PENDENTE'?'A calcular':money(o.valorFrete||0)}</b></div>`:''}</div>
      ${o.freteStatus==='COTACAO_PENDENTE'?'<div class="cx-note">🛵 A loja calculará a entrega e enviará o valor aqui para sua aprovação.</div>':''}
      ${awaiting?`<div class="freight-decision"><b>🛵 A loja enviou o valor da entrega.</b><div>Frete: <strong>${money(o.valorFrete)}</strong> · Total: <strong>${money(o.total)}</strong></div><div class="order-actions"><button class="soft" data-shipping-no="${esc(o.id)}" type="button">Não</button><button class="primary" data-shipping-yes="${esc(o.id)}" type="button">Sim, aceito</button></div></div>`:''}
      ${st==='AGUARDANDO_ACEITE_ERP'?'<div class="cx-note ok">✅ Frete aprovado por você. Aguardando o aceite final da loja.</div>':''}
      ${st==='FRETE_RECUSADO_CLIENTE'||st==='CANCELADO'?`<div class="result err">🛑 <b>Pedido cancelado</b><br>${esc(msg||'Você não aceitou o valor da entrega. Caso queira prosseguir, faça um novo pedido.')}</div>`:''}
      ${st==='ACEITO'?`<div class="result"><b>🎉 Seu pedido foi aceito!</b>${delivery?`<br>Horário de entrega: <b>${esc(orderTimeText(o))}</b>`:''}</div>${pixCard(o.pix)}`:''}
      ${st==='REJEITADO'?`<div class="result err">❌ <b>Pedido rejeitado</b><br>${esc(msg||'Seu pedido não pôde ser aceito. Entre em contato conosco se precisar de ajuda.')}</div>`:''}
      ${msg&&!['REJEITADO','CANCELADO','FRETE_RECUSADO_CLIENTE'].includes(st)?`<div class="cx-note">${esc(msg)}</div>`:''}
      <div class="order-actions">${['CANCELADO','FRETE_RECUSADO_CLIENTE'].includes(st)?`<button class="primary" data-new-order="${esc(o.id)}" type="button">Fazer novo pedido</button>`:''}<button class="soft" data-refresh-order="${esc(o.id)}" type="button">Atualizar status</button></div></div>`;
  }).join('')||'<div class="empty">Você ainda não possui pedidos salvos neste aparelho.</div>';
  openSimple('Meus pedidos',html);
  E('simpleBody').querySelectorAll('[data-refresh-order]').forEach(b=>b.onclick=showOrders);
  E('simpleBody').querySelectorAll('[data-new-order]').forEach(b=>b.onclick=()=>{
    closeOverlay(E('simpleOverlay'));
    E('catalogSection')?.scrollIntoView({behavior:'smooth'});
  });
  bindCustomerExperienceActions(E('simpleBody'));
}
function showStore(){
  const l=catalog.loja||{},addr=[l.logradouro||l.endereco,l.numero,l.complemento,l.bairro,l.cidade,l.uf].filter(Boolean).join(', ');
  openSimple('Sobre a loja',`<h3>${esc(l.nome||'Caseirinho')}</h3><p>${esc(l.apresentacao||l.subtitulo||'Massas artesanais preparadas com carinho.')}</p>${addr?`<p><b>📍 Endereço</b><br>${esc(addr)}</p>`:''}${l.horarioFuncionamento?`<p><b>🕐 Funcionamento</b><br>${esc(l.horarioFuncionamento)}</p>`:''}${l.whatsapp?`<p><b>📱 WhatsApp</b><br>${esc(l.whatsapp)}</p>`:''}`);
}
function showPrivacy(){
  const l=catalog.loja?.lgpd||{};
  openSimple('Política de Privacidade / LGPD',`<p><b>Controlador:</b> ${esc(l.controlador||catalog.loja?.nome||'Caseirinho')}</p><p>${esc(l.politica||'Os dados informados são utilizados para atendimento, cadastro, processamento do pedido, entrega e contato relacionados à compra.')}</p><p><b>Retenção:</b> ${esc(l.retencao||'Os dados são mantidos pelo período necessário às finalidades informadas e às obrigações legais aplicáveis.')}</p>`);
}
function whatsapp(){
  const n=S(catalog.loja?.whatsapp).replace(/\D/g,'');
  if(!n)return toast('WhatsApp da loja não informado.');
  window.open('https://wa.me/'+(n.startsWith('55')?n:'55'+n),'_blank','noopener');
}

function wire(){
  E('search').oninput=renderProducts;
  E('clearFilter').onclick=()=>{activeCategory='';E('search').value='';renderCategories();renderProducts()};
  E('homeBtn').onclick=E('navMenu').onclick=E('shopBtn').onclick=()=>E('catalogSection').scrollIntoView({behavior:'smooth'});
  E('cartTop').onclick=E('navCart').onclick=()=>openOverlay(E('cartDrawer'));
  E('cartClose').onclick=()=>closeOverlay(E('cartDrawer'));
  E('productClose').onclick=()=>closeOverlay(E('productOverlay'));
  E('simpleClose').onclick=()=>closeOverlay(E('simpleOverlay'));
  E('productOverlay').onclick=e=>{if(e.target===E('productOverlay'))closeOverlay(E('productOverlay'))};
  E('simpleOverlay').onclick=e=>{if(e.target===E('simpleOverlay'))closeOverlay(E('simpleOverlay'))};
  E('cartDrawer').onclick=e=>{if(e.target===E('cartDrawer'))closeOverlay(E('cartDrawer'))};
  E('modalAdd').onclick=()=>selectedProduct&&quickAdd(selectedProduct.id,E('modalQty').value);
  E('mode').onchange=modeChanged;
  E('cPhone').oninput=()=>E('cPhone').value=formatPhone(E('cPhone').value);
  let cepTimer;
  E('cep').oninput=()=>{
    const d=S(E('cep').value).replace(/\D/g,'').slice(0,8);
    E('cep').value=d.replace(/^(\d{5})(\d{0,3})$/,'$1-$2').replace(/-$/,'');
    cepResolved=false;clearTimeout(cepTimer);if(d.length===8)cepTimer=setTimeout(lookupCep,250);
  };
  E('number').oninput=renderCart;
  E('date').onchange=()=>{if(!allowedDate(E('date').value,E('mode').value))toast('Escolha um dos dias disponíveis.')};
  E('checkout').onsubmit=submitOrder;
  E('navOrders').onclick=showOrders;E('navStore').onclick=showStore;
  E('navWhats').onclick=E('whatsHero').onclick=whatsapp;
  E('privacyBtn').onclick=showPrivacy;
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeOverlay(E('productOverlay'));closeOverlay(E('simpleOverlay'));closeOverlay(E('cartDrawer'))}});
}

function installPwa(){
  if('serviceWorker'in navigator&&location.protocol==='https:'){
    window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).catch(console.warn));
  }
}
let lastCatalogMarker='';
async function checkCatalogVersion(){
  try{
    const v=await api('/api/v1/public/store/'+encodeURIComponent(STORE)+'/catalog/version');
    const marker=S(v.version)+'|'+S(v.publishedAt);
    if(!lastCatalogMarker){
      lastCatalogMarker=marker;
      return;
    }
    if(marker!==lastCatalogMarker){
      lastCatalogMarker=marker;
      await loadCatalog(true);
    }
  }catch(_){}
}
function start(){
  wire();
  renderCart();
  loadCatalog().then(()=>{
    lastCatalogMarker=S(catalog?.publicadoEm||'');
    checkCatalogVersion();
  });
  installPwa();

  // Heartbeats leves: catálogo por versão e pedidos do próprio aparelho por token público.
  setInterval(()=>{if(!document.hidden)checkCatalogVersion()},30000);
  setInterval(()=>{if(!document.hidden)pollCustomerOrders()},20000);
  setTimeout(()=>pollCustomerOrders(),2500);
  window.addEventListener('focus',()=>{checkCatalogVersion();pollCustomerOrders()});
  window.addEventListener('online',()=>{checkCatalogVersion();pollCustomerOrders()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){checkCatalogVersion();pollCustomerOrders()}});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

})();