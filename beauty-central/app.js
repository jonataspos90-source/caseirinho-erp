/* Beauty Central — isolamento de rascunhos neste navegador.
   Não tem login/admin API nem aceita pedidos/pagamentos. */
(()=>{
'use strict';
const KEY='john_beauty_central_catalog_v1',V=1;
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const number=n=>Number.isFinite(Number(n))?Number(n):0;
const slug=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'').slice(0,50);
let db=null,visible='dashboard';
function inform(message){
 const x=$('toast');x.textContent=message;x.classList.add('visible');clearTimeout(inform.timeout);
 inform.timeout=setTimeout(()=>x.classList.remove('visible'),4100);
}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(db));return true}
 catch(e){inform('Armazenamento cheio ou bloqueado. Faça backup e reduza o tamanho das fotos.');return false}
}
function normalize(raw){
 if(!raw||raw.company!=='beauty'||!Array.isArray(raw.products)||!Array.isArray(raw.categories))
  throw Error('Arquivo de cadastro incompatível com a Beauty.');
 return{
  schemaVersion:1,company:'beauty',companyName:String(raw.companyName||'Sua Marca Beauty').slice(0,100),
  salesEnabled:false,checkoutEnabled:false,updatedAt:new Date().toISOString(),
  categories:raw.categories.slice(0,500).map(c=>({
   id:String(c.id||'').slice(0,60),name:String(c.name||'').slice(0,70),
   icon:String(c.icon||'🧴').slice(0,10),active:c.active!==false
  })).filter(c=>c.id&&c.name),
  products:raw.products.slice(0,5000).map(p=>({
   id:String(p.id||'').slice(0,70),name:String(p.name||'').slice(0,150),categoryId:String(p.categoryId||''),
   description:String(p.description||'').slice(0,500),icon:String(p.icon||'🧴').slice(0,10),
   brand:String(p.brand||'').slice(0,100),cost:Math.max(0,number(p.cost)),price:Math.max(0,number(p.price)),
   stock:Math.max(0,Math.floor(number(p.stock))),regularization:['VERIFICADO','BLOQUEADO','PENDENTE_VERIFICACAO'].includes(p.regularization)?p.regularization:'PENDENTE_VERIFICACAO',
   active:p.active===true,published:p.published===true,
   lot:String(p.lot||'').slice(0,80),expiry:String(p.expiry||'').slice(0,10),
   shade:String(p.shade||''),volume:String(p.volume||''),ean:String(p.ean||''),
   image:/^(https:\/\/|data:image\/jpeg;base64,|data:image\/png;base64,|data:image\/webp;base64,)/i.test(String(p.image||''))?String(p.image):''
  })).filter(p=>p.id&&p.name),
  campaigns:[],payment:{pixConfigured:false}
 };
}
const category=id=>db.categories.find(c=>c.id===id);
function ready(p){
 if(!p.active||!p.published||!(p.price>0)||!(p.stock>0)||p.regularization!=='VERIFICADO')return false;
 if(!category(p.categoryId)?.active)return false;
 return !!p.lot&&/^\d{4}-\d{2}-\d{2}$/.test(p.expiry)&&p.expiry>=new Date().toISOString().slice(0,10);
}
function stat(label,value,detail){
 return '<article class="stat"><b>'+esc(label)+'</b><strong>'+esc(value)+'</strong><span>'+esc(detail||'')+'</span></article>';
}
function renderStats(){
 const products=db.products,active=products.filter(ready);
 const stock=products.reduce((n,p)=>n+p.stock,0);
 const cost=products.reduce((n,p)=>n+p.stock*p.cost,0);
 const cards=stat('SKUs cadastrados',products.length,'Rascunhos e prontos')+
 stat('Prontos para prévia',active.length,'Não significa publicação real')+
 stat('Unidades informadas',stock,'Saldos locais, não auditados')+
 stat('Valor a custo',money(cost),'Estimativa dos cadastros');
 $('dashboardStats').innerHTML=cards;
 $('reportStats').innerHTML=cards;
}
function navigate(module){
 if(!$(module))return;
 visible=module;
 document.querySelectorAll('.module').forEach(s=>s.classList.toggle('active',s.id===module));
 document.querySelectorAll('#moduleNav [data-module]').forEach(b=>b.classList.toggle('active',b.dataset.module===module));
 $('sidebar').classList.remove('open');
 scrollTo({top:0,behavior:'instant'});
}
function renderCategories(){
 $('categoryRows').innerHTML=db.categories.map(c=>{
  const count=db.products.filter(p=>p.categoryId===c.id).length;
  const live=db.products.filter(p=>p.categoryId===c.id&&ready(p)).length;
  return '<article class="category-tile"><span class="symbol">'+esc(c.icon)+'</span><strong>'+esc(c.name)+'</strong>'+
   '<small>'+count+' SKU(s) vinculado(s) · '+live+' pronto(s) para prévia</small>'+
   '<span class="tag '+(c.active?'good':'bad')+'">'+(c.active?'Ativa':'Inativa')+'</span>'+
   '<button type="button" class="action" data-edit-cat="'+esc(c.id)+'">Editar categoria</button></article>';
 }).join('')||'<div class="coming">Cadastre sua primeira categoria.</div>';
 const opts='<option value="">Todas as categorias</option>'+db.categories.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
 const current=$('productCategoryFilter').value;
 $('productCategoryFilter').innerHTML=opts;
 if(db.categories.some(c=>c.id===current))$('productCategoryFilter').value=current;
 $('productCategory').innerHTML='<option value="">Escolher categoria...</option>'+db.categories.filter(c=>c.active).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('');
}
function icon(p){
 if(p.image&&/^https:\/\//.test(p.image))return '<img src="'+esc(p.image)+'" loading="lazy" alt="">';
 if(/^data:image\//.test(p.image))return '<img src="'+esc(p.image)+'" alt="">';
 return esc(p.icon||'🧴');
}
function renderProducts(){
 const text=$('productSearch').value.trim().toLocaleLowerCase('pt-BR'),cat=$('productCategoryFilter').value;
 const list=db.products.filter(p=>(!cat||p.categoryId===cat)&&(!text||(p.id+' '+p.name+' '+p.brand).toLocaleLowerCase('pt-BR').includes(text)));
 $('productRows').innerHTML=list.map(p=>{
  const status=ready(p)?'Pronto para prévia':p.published?'Cadastro incompleto':'Rascunho';
  return '<tr><td><div class="mini-product"><span class="product-icon">'+icon(p)+'</span><div><strong>'+esc(p.name)+'</strong><small>'+esc(p.id)+(p.brand?' · '+esc(p.brand):'')+'</small></div></div></td>'+
   '<td>'+esc(category(p.categoryId)?.name||'Sem categoria')+'</td><td>'+money(p.cost)+'</td><td>'+money(p.price)+'</td><td>'+p.stock+'</td>'+
   '<td><span class="tag '+(ready(p)?'good':'')+'">'+status+'</span></td><td><button type="button" class="action" data-edit-product="'+esc(p.id)+'">Editar</button></td></tr>';
 }).join('')||'<tr><td colspan="7">Nenhum produto encontrado. Cadastre ou ajuste o filtro.</td></tr>';
}
function renderStock(){
 $('stockRows').innerHTML=db.products.map(p=>{
  const expired=p.expiry&&p.expiry<new Date().toISOString().slice(0,10);
  const risk=expired?'Vencido':!p.lot||!p.expiry?'Sem lote/validade':p.stock<=0?'Sem saldo':'Conferir no recebimento';
  return '<tr><td>'+esc(p.name)+'</td><td>'+esc(p.lot||'Não informado')+'</td><td>'+esc(p.expiry||'—')+'</td><td>'+p.stock+'</td>'+
  '<td><span class="tag '+(expired?'bad':'')+'">'+esc(risk)+'</span></td><td><button type="button" class="action" data-edit-product="'+esc(p.id)+'">Atualizar cadastro</button></td></tr>';
 }).join('')||'<tr><td colspan="6">Nenhum item cadastrado.</td></tr>';
}
function render(){
 renderStats();renderCategories();renderProducts();renderStock();
 $('storeName').value=db.companyName;
}
function showDialog(id){$(id).querySelector('.form-error').textContent='';$(id).showModal()}
function editCategory(id=''){
 const form=$('categoryForm');form.reset();
 const c=db.categories.find(c=>c.id===id);
 form.elements.previousId.value=c?.id||'';
 form.elements.name.value=c?.name||'';
 form.elements.icon.value=c?.icon||'🧴';
 form.elements.active.checked=c?.active!==false;
 showDialog('categoryDialog');
}
function editProduct(id=''){
 const form=$('productForm');form.reset();
 form.dataset.photo='';
 const p=db.products.find(p=>p.id===id);
 form.elements.previousId.value=p?.id||'';
 for(const name of ['id','name','categoryId','brand','cost','price','stock','lot','expiry','regularization','shade','volume','image','description']){
  if(form.elements[name])form.elements[name].value=p?.[name]??'';
 }
 form.elements.active.checked=p?.active===true;
 form.elements.published.checked=p?.published===true;
 if(!p){form.elements.active.checked=true;form.elements.regularization.value='PENDENTE_VERIFICACAO'}
 $('productPhotoFile').value='';
 showDialog('productDialog');
}
function saveCategory(e){
 e.preventDefault();const form=e.currentTarget;
 const name=form.elements.name.value.trim();
 const id=form.elements.previousId.value||slug(name);
 if(name.length<2||!id){form.querySelector('.form-error').textContent='Informe uma categoria válida.';return}
 if(db.categories.some(c=>c.id===id&&c.id!==form.elements.previousId.value)){form.querySelector('.form-error').textContent='Esta categoria já existe.';return}
 const cat={id,name,icon:form.elements.icon.value.trim()||'🧴',active:form.elements.active.checked};
 const idx=db.categories.findIndex(c=>c.id===id);
 if(idx>=0)db.categories[idx]=cat;else db.categories.push(cat);
 if(!persist())return;
 $('categoryDialog').close();render();inform('Categoria salva nos rascunhos locais.');
}
function validDay(value){
 if(!value)return false;
 const day=new Date(value+'T12:00:00Z');
 return !Number.isNaN(day.getTime())&&day.toISOString().slice(0,10)===value;
}
function saveProduct(e){
 e.preventDefault();const f=e.currentTarget;
 const id=f.elements.id.value.trim(),name=f.elements.name.value.trim(),previous=f.elements.previousId.value;
 const price=Number(f.elements.price.value||0),cost=Number(f.elements.cost.value||0),stock=Number(f.elements.stock.value||0);
 const categoryId=f.elements.categoryId.value;
 const err=f.querySelector('.form-error');err.textContent='';
 if(name.length<2||id.length<2||!categoryId){err.textContent='Informe nome, SKU e categoria.';return}
 if(db.products.some(p=>p.id===id&&p.id!==previous)){err.textContent='Este SKU já existe.';return}
 if(!Number.isFinite(price)||price<0||!Number.isFinite(cost)||cost<0||!Number.isInteger(stock)||stock<0){err.textContent='Custo, preço e estoque devem ser valores não negativos e válidos.';return}
 const old=db.products.find(p=>p.id===previous);
 const expiry=f.elements.expiry.value;
 if(expiry&&!validDay(expiry)){err.textContent='Data de validade inválida.';return}
 const image=f.dataset.photo||f.elements.image.value.trim()||old?.image||'';
 if(image&&!/^https:\/\//.test(image)&&!/^data:image\/(jpeg|png|webp);base64,/.test(image)){err.textContent='Imagem deve ter URL HTTPS ou foto enviada.';return}
 const product={
  id,name,categoryId,brand:f.elements.brand.value.trim(),description:f.elements.description.value.trim(),
  cost,price,stock,lot:f.elements.lot.value.trim(),expiry,regularization:f.elements.regularization.value,
  shade:f.elements.shade.value.trim(),volume:f.elements.volume.value.trim(),ean:old?.ean||'',
  icon:old?.icon||'🧴',image,active:f.elements.active.checked,published:f.elements.published.checked
 };
 if(product.published&&!ready({...product,active:true})){
  err.textContent='Para marcar pronto: categoria ativa, preço e estoque positivos, situação verificada, lote e validade vigente.';
  return;
 }
 if(previous&&id!==previous){err.textContent='O código SKU não pode ser alterado após o cadastro. Crie outro SKU.';return}
 const idx=db.products.findIndex(p=>p.id===previous);
 if(idx>=0)db.products[idx]=product;else db.products.push(product);
 if(!persist())return;
 $('productDialog').close();render();inform('Produto salvo nos rascunhos locais.');
}
async function compressPhoto(file){
 if(!file)return'';
 if(file.size>10*1024*1024)throw Error('Escolha uma foto menor que 10 MB.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Formato de imagem não suportado.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Erro ao ler imagem'));image.src=url});
  const ratio=Math.min(1,700/Math.max(image.width,image.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.width*ratio));canvas.height=Math.max(1,Math.round(image.height*ratio));
  canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
  let data='';
  for(const quality of [.72,.56,.43,.31]){data=canvas.toDataURL('image/jpeg',quality);if(data.length<180000)break}
  if(data.length>220000)throw Error('Foto muito grande para armazenamento local.');
  return data;
 }finally{URL.revokeObjectURL(url)}
}
function download(name,text){
 const file=new Blob([text],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(file),a=document.createElement('a');
 a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function start(){
 try{
  const saved=localStorage.getItem(KEY);
  if(saved)db=normalize(JSON.parse(saved));
  else{
   const response=await fetch('./modelos-iniciais.json',{cache:'no-store'});
   if(!response.ok)throw Error('Não foi possível ler modelos iniciais');
   db=normalize(await response.json());persist();
  }
 }catch(e){
  console.error('Beauty: falha no carregamento do rascunho',e);
  db=normalize({company:'beauty',companyName:'Sua Marca Beauty',categories:[],products:[]});
  inform('Não foi possível ler os cadastros. Faça backup antes de continuar.');
 }
 render();
 $('moduleNav').addEventListener('click',e=>{const b=e.target.closest('[data-module]');if(b)navigate(b.dataset.module)});
 document.querySelectorAll('.content [data-module]').forEach(b=>b.addEventListener('click',()=>{navigate(b.dataset.module);if(b.id==='')editProduct()}));
 $('menuToggle').onclick=()=>$('sidebar').classList.toggle('open');
 $('newProduct').onclick=()=>editProduct();
 $('newCategory').onclick=()=>editCategory();
 $('productSearch').oninput=renderProducts;
 $('productCategoryFilter').onchange=renderProducts;
 document.addEventListener('click',e=>{
  const editProd=e.target.closest('[data-edit-product]'),editCat=e.target.closest('[data-edit-cat]'),close=e.target.closest('[data-close]');
  if(editProd)editProduct(editProd.dataset.editProduct);
  if(editCat)editCategory(editCat.dataset.editCat);
  if(close)$(close.dataset.close)?.close();
  if(e.target.closest('button[data-module]')&&!e.target.closest('#moduleNav')){
   const b=e.target.closest('button[data-module]');navigate(b.dataset.module);if(b.dataset.module==='products'&&b.textContent.includes('Cadastrar'))editProduct();
  }
 });
 $('categoryForm').onsubmit=saveCategory;
 $('productForm').onsubmit=saveProduct;
 $('productPhotoFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  const form=$('productForm');form.querySelector('.form-error').textContent='Preparando foto...';
  try{form.dataset.photo=await compressPhoto(file);form.querySelector('.form-error').textContent='Foto pronta. Salve o produto.'}
  catch(err){form.querySelector('.form-error').textContent=err.message}
 });
 $('saveSettings').onclick=()=>{const name=$('storeName').value.trim();if(name.length<2)return inform('Informe um nome com pelo menos 2 caracteres.');db.companyName=name.slice(0,100);if(persist())inform('Nome salvo neste dispositivo.')};
 $('exportData').onclick=()=>download('beauty-central-backup.json',JSON.stringify(db,null,2));
 $('exportPublic').onclick=()=>{
  const pub={...db,salesEnabled:false,checkoutEnabled:false,products:db.products.filter(ready),payment:{pixConfigured:false}};
  download('beauty-catalogo-publicavel.json',JSON.stringify(pub,null,2));
  inform('Arquivo gerado. Não foi publicado na loja; precisa da API e autorização do gestor.');
 };
 $('importData').onchange=async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>5*1024*1024)return inform('Arquivo excede o limite de 5 MB.');
  try{
   const imported=normalize(JSON.parse(await file.text()));
   if(!confirm('Substituir os rascunhos Beauty deste aparelho pelo arquivo? Exporte backup antes.'))return;
   db=imported;if(persist()){render();inform('Rascunhos importados com sucesso.')}
  }catch(err){inform('Não foi possível importar: '+err.message)}
  finally{e.target.value=''}
 };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
