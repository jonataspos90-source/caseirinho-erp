/* Catálogo padrão de encomendas Caseirinho: importação sem duplicar e publicação em lote. */
(()=>{
'use strict';
const products=[{"name":"Talharim 2 kg — Molho Branco","price":59.99},{"name":"Talharim 2 kg — Molho Bolonhesa","price":64.99},{"name":"Talharim 2 kg — Molho 3 Queijos","price":64.99},{"name":"Talharim 2 kg — Molho Sugo","price":60.99},{"name":"Nhoque 2 kg — Molho Branco","price":59.99},{"name":"Nhoque 2 kg — Molho Bolonhesa","price":64.99},{"name":"Nhoque 2 kg — Molho 3 Queijos","price":64.99},{"name":"Nhoque 2 kg — Molho Sugo","price":60.99},{"name":"Talharim 1 kg — Molho Branco","price":34.99},{"name":"Talharim 1 kg — Molho Bolonhesa","price":34.99},{"name":"Talharim 1 kg — Molho 3 Queijos","price":34.99},{"name":"Talharim 1 kg — Molho Sugo","price":30.99},{"name":"Nhoque 1 kg — Molho Branco","price":31.99},{"name":"Nhoque 1 kg — Molho Bolonhesa","price":34.99},{"name":"Nhoque 1 kg — Molho 3 Queijos","price":34.99},{"name":"Nhoque 1 kg — Molho Sugo","price":32.99},{"name":"Torta Massa Leve de Sardinha 2 kg","price":94.99},{"name":"Torta Massa Leve de Frango 2 kg","price":94.99},{"name":"Catupiry Explodido com Alho Dourado, Azeite e Orégano","price":69.99},{"name":"Empadão de Frango Cremoso 2 kg","price":99.99},{"name":"Empadão de Palmito 2 kg","price":99.99},{"name":"Panqueca de Palmito (6 unidades) ao Molho Sugo","price":79.99},{"name":"Panqueca de Frango (12 unidades) ao Molho Sugo","price":139.99},{"name":"Panqueca de Carne (12 unidades) ao Molho Sugo","price":139.99},{"name":"Panqueca Mista de Carne e Frango (12 unidades) ao Molho Sugo","price":139.99},{"name":"Salpicão 2 kg","price":99.99},{"name":"Salpicão 1 kg","price":59.99},{"name":"Maionese 2 kg","price":79.99},{"name":"Maionese 1 kg","price":59.99},{"name":"Batata em Conserva 2 kg","price":49.99},{"name":"Batata em Conserva 1 kg","price":29.99},{"name":"Rabanada 1 kg","price":29.99},{"name":"Rabanada 2 kg","price":49.99}];
const $=id=>document.getElementById(id);
const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const money=x=>Number(x).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const catalogKeys=new Set(products.map(p=>normalize(p.name)));
const excluded=new Set();
const selected=new Set();
const campaign=()=> $('seasonExclusiveCampaign')?.value||$('seasonCampaignSelect')?.value||'';
const saved=()=> (st.seasonData?.exclusiveProducts||[]).filter(p=>String(p.campaignId)===campaign());
const missing=p=>[!p.image?'foto':null,!p.categoryId?'categoria':null].filter(Boolean);
const ready=p=>p.active!==false&&!p.published&&!missing(p).length;
function status(message,error=false){
 const el=$('seasonBulkStatus');if(!el)return;
 el.hidden=false;el.className='notice '+(error?'error':'success');el.textContent=message;
}
function edit(id){
 const btn=Array.from(document.querySelectorAll('[data-season-exclusive-edit]')).find(b=>b.dataset.seasonExclusiveEdit===id);
 if(btn){btn.click();return;}
 const selector=$('seasonExclusiveSelect');selector.value=id;selector.dispatchEvent(new Event('change'));
}
function render(){
 if(!$('seasonBulkList'))return;
 const current=saved();
 const existingByName=new Map(current.map(p=>[normalize(p.name),p]));
 const newItems=products.filter(p=>!existingByName.has(normalize(p.name))&&!excluded.has(normalize(p.name)));
 const duplicates=products.filter(p=>existingByName.has(normalize(p.name))&&!excluded.has(normalize(p.name)));
 const published=current.filter(p=>p.published).length;
 const waiting=current.filter(p=>!p.published);
 const publishable=waiting.filter(ready);
 const pending=waiting.filter(p=>!ready(p));
 for(const id of [...selected])if(!publishable.some(p=>p.id===id))selected.delete(id);
 $('seasonBulkCount').textContent=current.length+' cadastrados · '+newItems.length+' faltam cadastrar · '+duplicates.length+' já existentes';
 $('seasonBulkImport').textContent='📥 Cadastrar '+newItems.length+' restante(s)';
 $('seasonBulkImport').disabled=!newItems.length;
 $('seasonBulkList').innerHTML=newItems.map((p,i)=>'<tr><td>'+(i+1)+'</td><td>'+escape(p.name)+'</td><td>'+money(p.price)+'</td><td>🆕 Novo <button type="button" class="btn small" data-ignore-name="'+escape(p.name)+'">Excluir da fila</button></td></tr>').join('')||'<tr><td colspan="4">✅ Nenhum produto novo a cadastrar.</td></tr>';
 $('seasonExistingItems').innerHTML=duplicates.map(p=>{
  const x=existingByName.get(normalize(p.name));
  return '<div class="season-admin-product"><span style="flex:1"><b>'+escape(x.name)+'</b> · '+money(x.price)+'</span><button type="button" class="btn small" data-exclusive-edit="'+escape(x.id)+'">Editar cadastro</button><button type="button" class="btn small" data-ignore-name="'+escape(p.name)+'">Remover da lista</button></div>';
 }).join('')||'<p class="subtitle">Nenhum cadastro existente correspondente à lista.</p>';
 $('seasonExistingCount').textContent=duplicates.length+' já cadastrados (sem criar duplicatas)';
 $('seasonPublishCount').textContent=publishable.length+' prontos · '+pending.length+' incompletos · '+published+' publicados';
 $('seasonBulkPublish').textContent='🚀 Publicar selecionados ('+selected.size+')';
 $('seasonBulkPublish').disabled=!selected.size;
 $('seasonPublishQueue').innerHTML=publishable.map(p=>
  '<div class="season-admin-product" style="align-items:center;gap:12px">'+
   '<label style="display:flex;align-items:center;gap:10px;flex:1;cursor:pointer"><input type="checkbox" data-publish-check="'+escape(p.id)+'" '+(selected.has(p.id)?'checked':'')+'><span><b>'+escape(p.name)+'</b><small> · '+money(p.price)+'</small></span></label>'+
   '<button type="button" class="btn small" data-exclusive-edit="'+escape(p.id)+'">Editar</button>'+
   '<button type="button" class="btn small primary" data-exclusive-publish="'+escape(p.id)+'">Publicar</button></div>'
 ).join('')||'<p class="notice">✅ Nenhum produto pronto aguardando publicação.</p>';
 $('seasonPendingList').innerHTML=pending.map(p=>'<div class="season-admin-product"><span style="flex:1"><b>'+escape(p.name)+'</b> · '+money(p.price)+'<small> · '+(p.active===false?'Inativo': 'Falta '+missing(p).join(' e '))+'</small></span><button type="button" class="btn small" data-exclusive-edit="'+escape(p.id)+'">Completar</button></div>').join('')||'<p class="subtitle">Nenhum item incompleto.</p>';
 $('seasonOtherExclusive').innerHTML='<p class="subtitle">Produtos adicionais já estão contemplados nas filas acima.</p>';
}
function updateProduct(product){
 if(!st.seasonData||!product)return;
 st.seasonData.exclusiveProducts=(st.seasonData.exclusiveProducts||[]).map(p=>p.id===product.id?product:p);
}
async function request(button,endpoint,body,mode){
 const campaignId=campaign();
 if(!campaignId)return status('Selecione uma campanha cadastrada.',true);
 button.disabled=true;const prior=button.textContent;button.textContent='Processando...';
 try{
  const data=await api(endpoint,{method:'POST',body:{campaignId,...body}});
  if(mode==='import'){
   await loadSeasonAdmin();
   status('✅ '+data.created+' cadastrados; '+data.unchanged+' já existentes preservados. Nenhuma duplicata criada.');
  }else if(mode==='one'){
   updateProduct(data.product);selected.delete(data.product.id);
   status('✅ '+data.product.name+' publicado. Saiu da fila de pendentes.');
  }else{
   const ids=new Set(body.ids.map(String));
   (st.seasonData?.exclusiveProducts||[]).forEach(p=>{if(ids.has(String(p.id)))p.published=true});
   ids.forEach(id=>selected.delete(id));
   status('✅ '+data.published+' publicados. Itens publicados retirados da fila.');
  }
  render();
 }catch(err){status('Falha: '+err.message,true)}
 finally{button.disabled=false;button.textContent=prior;render()}
}
function handleClick(e){
 const editBtn=e.target.closest('[data-exclusive-edit]');
 if(editBtn){edit(editBtn.dataset.exclusiveEdit);return;}
 const ignore=e.target.closest('[data-ignore-name]');
 if(ignore){excluded.add(normalize(ignore.dataset.ignoreName));render();return;}
 const publish=e.target.closest('[data-exclusive-publish]');
 if(publish){
  const p=saved().find(x=>x.id===publish.dataset.exclusivePublish);
  if(p&&ready(p))request(publish,'seasonal-exclusive-products/'+encodeURIComponent(p.id)+'/publish',{},'one');
  return;
 }
}
document.addEventListener('DOMContentLoaded',()=>{
 if(!$('seasonBulkImport'))return;
 $('seasonBulkImport').addEventListener('click',e=>{
  const names=new Set(saved().map(p=>normalize(p.name)));
  const remaining=products.filter(p=>!names.has(normalize(p.name))&&!excluded.has(normalize(p.name)));
  if(remaining.length)request(e.currentTarget,'seasonal-exclusive-products/bulk-import',{products:remaining},'import');
 });
 $('seasonBulkPublish').addEventListener('click',e=>{
  const ids=[...selected].filter(id=>saved().some(p=>p.id===id&&ready(p)));
  if(ids.length)request(e.currentTarget,'seasonal-exclusive-products/bulk-publish',{ids},'many');
 });
 $('seasonPublishSelectAll').addEventListener('click',()=>{saved().filter(ready).forEach(p=>selected.add(p.id));render()});
 $('seasonPublishUnselectAll').addEventListener('click',()=>{selected.clear();render()});
 $('seasonBulkList').addEventListener('click',handleClick);
 $('seasonExistingItems').addEventListener('click',handleClick);
 $('seasonPublishQueue').addEventListener('click',handleClick);
 $('seasonPendingList').addEventListener('click',handleClick);
 $('seasonOtherExclusive').addEventListener('click',handleClick);
 $('seasonPublishQueue').addEventListener('change',e=>{
  const c=e.target.closest('[data-publish-check]');if(!c)return;
  if(c.checked)selected.add(c.dataset.publishCheck);else selected.delete(c.dataset.publishCheck);
  $('seasonBulkPublish').disabled=!selected.size;
  $('seasonBulkPublish').textContent='🚀 Publicar selecionados ('+selected.size+')';
 });
 $('seasonExclusiveCampaign').addEventListener('change',()=>{selected.clear();render()});
 window.addEventListener('caseirinho:season-products-updated',render);
 $('seasonRefresh')?.addEventListener('click',()=>setTimeout(render,500));
 render();
});
})();