/* Catálogo padrão de encomendas Caseirinho: importação sem duplicar e publicação em lote. */
(()=>{
'use strict';
const products=[{"name":"Talharim 2 kg — Molho Branco","price":59.99},{"name":"Talharim 2 kg — Molho Bolonhesa","price":64.99},{"name":"Talharim 2 kg — Molho 3 Queijos","price":64.99},{"name":"Talharim 2 kg — Molho Sugo","price":60.99},{"name":"Nhoque 2 kg — Molho Branco","price":59.99},{"name":"Nhoque 2 kg — Molho Bolonhesa","price":64.99},{"name":"Nhoque 2 kg — Molho 3 Queijos","price":64.99},{"name":"Nhoque 2 kg — Molho Sugo","price":60.99},{"name":"Talharim 1 kg — Molho Branco","price":34.99},{"name":"Talharim 1 kg — Molho Bolonhesa","price":34.99},{"name":"Talharim 1 kg — Molho 3 Queijos","price":34.99},{"name":"Talharim 1 kg — Molho Sugo","price":30.99},{"name":"Nhoque 1 kg — Molho Branco","price":31.99},{"name":"Nhoque 1 kg — Molho Bolonhesa","price":34.99},{"name":"Nhoque 1 kg — Molho 3 Queijos","price":34.99},{"name":"Nhoque 1 kg — Molho Sugo","price":32.99},{"name":"Torta Massa Leve de Sardinha 2 kg","price":94.99},{"name":"Torta Massa Leve de Frango 2 kg","price":94.99},{"name":"Catupiry Explodido com Alho Dourado, Azeite e Orégano","price":69.99},{"name":"Empadão de Frango Cremoso 2 kg","price":99.99},{"name":"Empadão de Palmito 2 kg","price":99.99},{"name":"Panqueca de Palmito (6 unidades) ao Molho Sugo","price":79.99},{"name":"Panqueca de Frango (12 unidades) ao Molho Sugo","price":139.99},{"name":"Panqueca de Carne (12 unidades) ao Molho Sugo","price":139.99},{"name":"Panqueca Mista de Carne e Frango (12 unidades) ao Molho Sugo","price":139.99},{"name":"Salpicão 2 kg","price":99.99},{"name":"Salpicão 1 kg","price":59.99},{"name":"Maionese 2 kg","price":79.99},{"name":"Maionese 1 kg","price":59.99},{"name":"Batata em Conserva 2 kg","price":49.99},{"name":"Batata em Conserva 1 kg","price":29.99},{"name":"Rabanada 1 kg","price":29.99},{"name":"Rabanada 2 kg","price":49.99}];
const $=id=>document.getElementById(id);
const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const money=x=>Number(x).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const campaign=()=> $('seasonExclusiveCampaign')?.value||$('seasonCampaignSelect')?.value||'';
function status(message,error=false){
 const el=$('seasonBulkStatus');if(!el)return;
 el.hidden=false;el.className='notice '+(error?'error':'success');el.textContent=message;
}
function productsForCampaign(){
 return (st.seasonData?.exclusiveProducts||[]).filter(p=>String(p.campaignId)===campaign());
}
function missing(p){return [!p.image?'foto':null,!p.categoryId?'categoria':null].filter(Boolean)}
function render(){
 if(!$('seasonBulkList'))return;
 const saved=productsForCampaign();
 const matched=new Map(saved.map(p=>[normalize(p.name),p]));
 const ready=saved.filter(p=>p.active!==false&&!p.published&&!missing(p).length);
 const published=saved.filter(p=>p.published);
 const pending=saved.filter(p=>!p.published&&missing(p).length);
 $('seasonBulkCount').textContent=saved.length+' exclusivos · '+published.length+' publicados · '+ready.length+' prontos · '+pending.length+' com pendências';
 $('seasonBulkPublish').textContent='🚀 Publicar '+ready.length+' pronto(s)';
 $('seasonBulkPublish').disabled=!ready.length;
 $('seasonBulkList').innerHTML=products.map((p,i)=>{
  const item=matched.get(normalize(p.name));
  if(!item)return '<tr><td>'+(i+1)+'</td><td>'+escape(p.name)+'</td><td>'+money(p.price)+'</td><td>Não cadastrado</td></tr>';
  const lack=missing(item);
  const label=item.published?'✅ Publicado':lack.length?'⚠️ Falta '+lack.join(' e '):'🟢 Pronto';
  return '<tr><td>'+(i+1)+'</td><td>'+escape(item.name)+'</td><td style="white-space:nowrap">'+money(item.price)+'</td><td>'+label+
   '<div class="toolbar" style="margin-top:4px"><button type="button" class="btn small" data-exclusive-edit="'+escape(item.id)+'">✏️ Editar</button> '+
   (!item.published&&!lack.length?'<button type="button" class="btn small primary" data-exclusive-publish="'+escape(item.id)+'">🚀 Publicar</button>':'')+'</div></td></tr>';
 }).join('');
 const other=saved.filter(p=>!matched.has(normalize(p.name))||!products.some(q=>normalize(q.name)===normalize(p.name)));
 $('seasonOtherExclusive').innerHTML=other.map(p=>'<div class="season-admin-product"><span><b>'+escape(p.name)+'</b> · '+money(p.price)+'</span><span>'+ (p.published?'✅ Publicado':missing(p).length?'⚠️ Falta '+missing(p).join(' e '):'🟢 Pronto')+'</span><button type="button" class="btn small" data-exclusive-edit="'+escape(p.id)+'">✏️ Editar</button>'+(!p.published&&!missing(p).length?'<button type="button" class="btn small primary" data-exclusive-publish="'+escape(p.id)+'">🚀 Publicar</button>':'')+'</div>').join('')||'<p class="subtitle">Nenhum produto adicional.</p>';
}
function updateProduct(product){
 if(!st.seasonData||!product)return;
 st.seasonData.exclusiveProducts=(st.seasonData.exclusiveProducts||[]).map(p=>p.id===product.id?product:p);
}
async function execute(button,endpoint,body,mode){
 const campaignId=campaign();
 if(!campaignId)return status('Selecione uma campanha cadastrada.',true);
 button.disabled=true;const before=button.textContent;button.textContent='Salvando...';
 try{
  const result=await api(endpoint,{method:'POST',body:{campaignId,...body}});
  if(mode==='import'){
   await loadSeasonAdmin();
   status('✅ '+result.created+' novos, '+result.changed+' preços atualizados e '+result.unchanged+' já existentes.');
  }else if(mode==='one'){
   updateProduct(result.product);
   status('✅ '+result.product.name+' publicado na vitrine de encomendas.');
  }else{
   const ids=new Set((body.ids||[]).map(String));
   (st.seasonData?.exclusiveProducts||[]).forEach(p=>{if(ids.has(String(p.id))&&!missing(p).length)p.published=true});
   status('✅ '+result.published+' produtos publicados.'+(result.pending?.length?' '+result.pending.length+' incompletos ficaram como rascunho.':''));
  }
  render();
 }catch(e){status('Erro ao publicar: '+e.message,true)}
 finally{button.disabled=false;button.textContent=before;if(mode!=='import')render()}
}
document.addEventListener('DOMContentLoaded',()=>{
 if(!$('seasonBulkImport'))return;
 $('seasonBulkImport').addEventListener('click',e=>execute(e.currentTarget,'seasonal-exclusive-products/bulk-import',{products},'import'));
 $('seasonBulkPublish').addEventListener('click',e=>{
  const selected=productsForCampaign().filter(p=>p.active!==false&&!p.published&&!missing(p).length);
  if(!selected.length)return status('Não há produtos prontos para publicar.',true);
  execute(e.currentTarget,'seasonal-exclusive-products/bulk-publish',{ids:selected.map(p=>p.id)},'many');
 });
 function handleClick(e){
  const edit=e.target.closest('[data-exclusive-edit]');
  if(edit){document.querySelector('[data-season-exclusive-edit="'+CSS.escape(edit.dataset.exclusiveEdit)+'"]')?.click();return;}
  const pub=e.target.closest('[data-exclusive-publish]');if(!pub)return;
  const item=productsForCampaign().find(p=>p.id===pub.dataset.exclusivePublish);
  if(!item||missing(item).length)return status('Complete foto e categoria para publicar.',true);
  execute(pub,'seasonal-exclusive-products/'+encodeURIComponent(item.id)+'/publish',{},'one');
 }
 $('seasonBulkList').addEventListener('click',handleClick);
 $('seasonOtherExclusive').addEventListener('click',handleClick);
 $('seasonExclusiveCampaign').addEventListener('change',render);
 window.addEventListener('caseirinho:season-products-updated',render);
 $('seasonRefresh')?.addEventListener('click',()=>setTimeout(render,500));
 render();
});
})();