/* Catálogo padrão de encomendas Caseirinho: importação sem duplicar e publicação em lote. */
(()=>{
'use strict';
const products=[{"name":"Talharim 2 kg — Molho Branco","price":59.99},{"name":"Talharim 2 kg — Molho Bolonhesa","price":64.99},{"name":"Talharim 2 kg — Molho 3 Queijos","price":64.99},{"name":"Talharim 2 kg — Molho Sugo","price":60.99},{"name":"Nhoque 2 kg — Molho Branco","price":59.99},{"name":"Nhoque 2 kg — Molho Bolonhesa","price":64.99},{"name":"Nhoque 2 kg — Molho 3 Queijos","price":64.99},{"name":"Nhoque 2 kg — Molho Sugo","price":60.99},{"name":"Talharim 1 kg — Molho Branco","price":34.99},{"name":"Talharim 1 kg — Molho Bolonhesa","price":34.99},{"name":"Talharim 1 kg — Molho 3 Queijos","price":34.99},{"name":"Talharim 1 kg — Molho Sugo","price":30.99},{"name":"Nhoque 1 kg — Molho Branco","price":31.99},{"name":"Nhoque 1 kg — Molho Bolonhesa","price":34.99},{"name":"Nhoque 1 kg — Molho 3 Queijos","price":34.99},{"name":"Nhoque 1 kg — Molho Sugo","price":32.99},{"name":"Torta Massa Leve de Sardinha 2 kg","price":94.99},{"name":"Torta Massa Leve de Frango 2 kg","price":94.99},{"name":"Catupiry Explodido com Alho Dourado, Azeite e Orégano","price":69.99},{"name":"Empadão de Frango Cremoso 2 kg","price":99.99},{"name":"Empadão de Palmito 2 kg","price":99.99},{"name":"Panqueca de Palmito (6 unidades) ao Molho Sugo","price":79.99},{"name":"Panqueca de Frango (12 unidades) ao Molho Sugo","price":139.99},{"name":"Panqueca de Carne (12 unidades) ao Molho Sugo","price":139.99},{"name":"Panqueca Mista de Carne e Frango (12 unidades) ao Molho Sugo","price":139.99},{"name":"Salpicão 2 kg","price":99.99},{"name":"Salpicão 1 kg","price":59.99},{"name":"Maionese 2 kg","price":79.99},{"name":"Maionese 1 kg","price":59.99},{"name":"Batata em Conserva 2 kg","price":49.99},{"name":"Batata em Conserva 1 kg","price":29.99},{"name":"Rabanada 1 kg","price":29.99},{"name":"Rabanada 2 kg","price":49.99}];
const $=id=>document.getElementById(id);
const normalize=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const money=x=>Number(x).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function campaign(){return $('seasonExclusiveCampaign')?.value||''}
function status(message,error=false){
 const el=$('seasonBulkStatus');if(!el)return;el.hidden=false;
 el.className='notice '+(error?'error':'success');el.textContent=message;
}
function render(){
 const campaignId=campaign(),saved=(st.seasonData?.exclusiveProducts||[]).filter(p=>String(p.campaignId)===campaignId);
 const matched=new Map(saved.map(p=>[normalize(p.name),p]));
 $('seasonBulkList').innerHTML=products.map((p,i)=>{
  const savedItem=matched.get(normalize(p.name));
  const state=!savedItem?'Não cadastrado':savedItem.published?'Publicado':(!savedItem.image||!savedItem.categoryId?'Pendente de foto/categoria':'Pronto para publicar');
  return '<tr><td>'+String(i+1)+'</td><td>'+escape(p.name)+'</td><td style="white-space:nowrap">'+money(p.price)+'</td><td>'+escape(state)+'</td></tr>';
 }).join('');
 const count=products.filter(p=>matched.has(normalize(p.name))).length;
 $('seasonBulkCount').textContent=count+' de '+products.length+' cadastrados nesta campanha';
}
async function run(id,endpoint,body,question){
 const button=$(id),campaignId=campaign();
 if(!campaignId)return status('Selecione uma campanha cadastrada no campo acima.',true);
 if(question&&!confirm(question))return;
 button.disabled=true;
 const original=button.textContent;button.textContent='Processando...';
 try{
  const out=await api(endpoint,{method:'POST',body:{campaignId,...body}});
  await loadSeasonAdmin();
  render();
  if(endpoint.endsWith('bulk-import'))status('✅ Catálogo atualizado: '+out.created+' novos, '+out.changed+' preços atualizados, '+out.unchanged+' já cadastrados. Vincule as fotos e categorias quando desejar.');
  else status('✅ '+out.published+' produtos publicados juntos na vitrine da campanha.');
 }catch(err){
  let extra='';
  try{const data=JSON.parse(err.message);if(data.pending)extra=' '+data.pending.map(p=>p.name+' ('+p.missing.join(', ')+')').join('; ')}catch(_){}
  status('Não foi possível concluir: '+err.message+extra,true);
 }finally{button.disabled=false;button.textContent=original}
}
document.addEventListener('DOMContentLoaded',()=>{
 if(!$('seasonBulkImport'))return;
 $('seasonBulkImport').addEventListener('click',()=>run('seasonBulkImport','seasonal-exclusive-products/bulk-import',{products},'Cadastrar/atualizar os '+products.length+' produtos na campanha selecionada? Produtos existentes serão preservados e seus preços conferidos.'));
 $('seasonBulkPublish').addEventListener('click',()=>{
  const saved=(st.seasonData?.exclusiveProducts||[]).filter(p=>String(p.campaignId)===campaign()&&p.active!==false);
  const pending=saved.filter(p=>!p.image||!p.categoryId);
  if(!saved.length)return status('Cadastre os produtos primeiro.',true);
  if(pending.length)return status('Faltam foto ou categoria em '+pending.length+' produto(s): '+pending.slice(0,6).map(p=>p.name).join('; ')+(pending.length>6?' e outros.':''),true);
  return run('seasonBulkPublish','seasonal-exclusive-products/bulk-publish',{},'Publicar todos os '+saved.length+' produtos ativos desta campanha de uma só vez?');
 });
 $('seasonExclusiveCampaign').addEventListener('change',render);
 $('seasonRefresh')?.addEventListener('click',()=>setTimeout(render,900));
 $('seasonExclusiveSave')?.addEventListener('click',()=>setTimeout(render,1100));
 render();
});
})();