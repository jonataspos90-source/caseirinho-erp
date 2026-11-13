/* Gestão independente do cardápio sazonal: categorias, grades e packs. */
'use strict';
let seasonMerchTab='category';
const seasonMerchEditing={CATEGORY:'',GRADE:'',PACK:''};
let seasonPackSelected=new Set();
const merchKinds={CATEGORY:'categories',GRADE:'grades',PACK:'packs'};
const merchKindLabels={CATEGORY:'categoria',GRADE:'grade',PACK:'pack'};
const seasonMerchCurrent=()=>String(E('seasonMerchCampaign')?.value||'');
const merchItems=(kind,all=false)=>{
 const entries=st.seasonData?.[merchKinds[kind]]||[];
 return all?entries:entries.filter(x=>x.campaignId===seasonMerchCurrent());
};
const optionList=(rows,placeholder)=>'<option value="">'+esc(placeholder)+'</option>'+rows.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.emoji?x.emoji+' ':'')+esc(x.name)+'</option>').join('');
function seasonMerchStatus(message,error=false){
 const el=E('seasonMerchStatus');if(!el)return;el.hidden=false;
 el.className='notice '+(error?'error':'success');el.textContent=message;
}
function seasonMerchSelectCampaign(id){
 E('seasonMerchCampaign').value=id||'';
 E('seasonExclusiveCampaign').value=id||'';
 seasonMerchReset('CATEGORY');seasonMerchReset('GRADE');seasonMerchReset('PACK');
 seasonMerchRender();
}
function seasonMerchTabSet(which){
 seasonMerchTab=which;
 for(const key of ['category','grade','pack']){
  const panel=E('seasonMerch'+key.charAt(0).toUpperCase()+key.slice(1)+'Panel');
  if(panel)panel.hidden=which!==key;
 }
 document.querySelectorAll('[data-season-merch-tab]').forEach(b=>b.classList.toggle('primary',b.dataset.seasonMerchTab===which));
}
function seasonMerchPackPool(){
 const campaign=(st.seasonData?.campaigns||[]).find(c=>c.id===seasonMerchCurrent());
 if(!campaign)return[];
 const catalog=new Map((st.seasonData?.products||[]).map(p=>[p.id,p]));
 const normal=(campaign.products||[]).map(p=>catalog.get(p.id)).filter(Boolean);
 const exclusive=(st.seasonData?.exclusiveProducts||[]).filter(p=>p.campaignId===campaign.id&&p.active);
 return [...normal,...exclusive].map(p=>({...p,name:p.name||p.nome||p.id}));
}
function seasonMerchRefreshSelectors(){
 const campaign=seasonMerchCurrent(),categories=merchItems('CATEGORY').filter(x=>x.active),grades=merchItems('GRADE').filter(x=>x.active);
 const choices=[
  ['seasonGradeCategory',categories,'Sem categoria'],
  ['seasonExclusiveCategory',categories.filter(x=>x.campaignId===E('seasonExclusiveCampaign').value),'Sem categoria'],
  ['seasonExclusiveGrade',grades.filter(x=>x.campaignId===E('seasonExclusiveCampaign').value),'Sem grade (produto avulso)']
 ];
 for(const [id,data,prompt] of choices){
  const el=E(id);if(!el)continue;
  const old=el.value;el.innerHTML=optionList(data,prompt);
  if(data.some(x=>x.id===old))el.value=old;
 }
}
function seasonMerchDrawList(kind){
 const kindName=kind.toLowerCase();
 const select=E('season'+kind[0]+kind.slice(1).toLowerCase()+'Select');
 const entries=merchItems(kind).slice().sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0)||a.name.localeCompare(b.name));
 const prev=select.value;
 select.innerHTML=optionList(entries,'➕ Novo '+merchKindLabels[kind]);
 if(entries.some(x=>x.id===prev))select.value=prev;
 const el=E('season'+kind[0]+kind.slice(1).toLowerCase()+'List');
 el.innerHTML=entries.length?entries.map(x=>{
  const extra=kind==='PACK'?x.quantity+' unidades · '+brl(x.price)+' · '+x.productIds.length+' sabores':kind==='GRADE'?'Grade de variações':x.emoji||'🏷️';
  return '<div class="season-admin-product"><div style="flex:1"><b>'+esc(x.name)+'</b><small>'+esc(extra)+
    ' · Ordem '+esc(x.sortOrder||0)+'</small></div><span class="badge '+(x.active?'good':'warn')+'">'+(x.active?'Ativo':'Inativo')+'</span>'+
    '<button type="button" class="btn small" data-season-merch-edit="'+esc(kind)+'" data-id="'+esc(x.id)+'">✏️ Editar</button></div>';
 }).join(''): '<div class="notice">Nenhum '+merchKindLabels[kind]+' cadastrado nesta campanha.</div>';
}
function seasonMerchPackOptions(){
 const pool=seasonMerchPackPool(),search=(E('seasonPackProductSearch')?.value||'').toLowerCase();
 E('seasonPackProductList').innerHTML=pool.filter(p=>(p.name+' '+p.id).toLowerCase().includes(search)).map(p=>
  '<label class="season-admin-choice" style="display:flex;gap:9px;margin:4px 0;padding:8px;border:1px solid #e5eae7;border-radius:8px">'+
  '<input type="checkbox" data-season-pack-product="'+esc(p.id)+'" '+(seasonPackSelected.has(p.id)?'checked':'')+'>'+
  '<span><b>'+esc(p.name)+'</b><small>Preço avulso: '+brl(p.price||0)+(p.exclusive?' · Exclusivo':' · Catálogo')+'</small></span></label>'
 ).join('')||'<div class="notice">Nenhum produto participante. Vincule produtos comuns à campanha ou cadastre produtos exclusivos.</div>';
}
function seasonMerchRender(){
 const select=E('seasonMerchCampaign');if(!select)return;
 const all=st.seasonData?.campaigns||[],prev=select.value;
 select.innerHTML='<option value="">Selecione a campanha</option>'+all.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.title)+'</option>').join('');
 if(all.some(c=>c.id===prev))select.value=prev;
 else if(all.some(c=>c.id===E('seasonExclusiveCampaign').value))select.value=E('seasonExclusiveCampaign').value;
 seasonMerchRefreshSelectors();
 for(const kind of Object.keys(merchKinds))seasonMerchDrawList(kind);
 seasonMerchPackOptions();
 seasonMerchTabSet(seasonMerchTab);
}
function seasonMerchReset(kind){
 seasonMerchEditing[kind]='';
 const prefix='season'+kind[0]+kind.slice(1).toLowerCase();
 const select=E(prefix+'Select');if(select)select.value='';
 for(const id of ['Name','Description','Image','Emoji'])if(E(prefix+id))E(prefix+id).value='';
 if(E(prefix+'Sort'))E(prefix+'Sort').value=0;
 if(E(prefix+'Active'))E(prefix+'Active').checked=true;
 if(E(prefix+'Category'))E(prefix+'Category').value='';
 if(kind==='PACK'){
  E('seasonPackQuantity').value=6;E('seasonPackPrice').value='';seasonPackSelected=new Set();
  seasonMerchPackOptions();
 }
}
function seasonMerchEdit(kind,id){
 const item=merchItems(kind).find(x=>x.id===id);if(!item)return;
 seasonMerchEditing[kind]=id;
 const prefix='season'+kind[0]+kind.slice(1).toLowerCase();
 E(prefix+'Select').value=id;E(prefix+'Name').value=item.name;
 E(prefix+'Sort').value=item.sortOrder||0;E(prefix+'Active').checked=item.active===true;
 if(E(prefix+'Description'))E(prefix+'Description').value=item.description||'';
 if(E(prefix+'Image'))E(prefix+'Image').value=item.image||'';
 if(E(prefix+'Category'))E(prefix+'Category').value=item.categoryId||'';
 if(kind==='CATEGORY')E('seasonCategoryEmoji').value=item.emoji||'';
 if(kind==='PACK'){
  E('seasonPackQuantity').value=item.quantity;E('seasonPackPrice').value=item.price;
  seasonPackSelected=new Set(item.productIds||[]);seasonMerchPackOptions();
 }
}
async function seasonMerchSave(kind){
 const prefix='season'+kind[0]+kind.slice(1).toLowerCase();
 const campaignId=seasonMerchCurrent();
 if(!campaignId)return seasonMerchStatus('Selecione uma campanha primeiro.',true);
 const body={kind,id:seasonMerchEditing[kind]||undefined,campaignId,name:E(prefix+'Name').value.trim(),
   sortOrder:Number(E(prefix+'Sort').value),active:E(prefix+'Active').checked};
 if(kind==='CATEGORY')body.emoji=E('seasonCategoryEmoji').value.trim();
 if(kind==='GRADE')Object.assign(body,{description:E('seasonGradeDescription').value.trim(),categoryId:E('seasonGradeCategory').value,image:E('seasonGradeImage').value.trim()});
 if(kind==='PACK')Object.assign(body,{description:E('seasonPackDescription').value.trim(),image:E('seasonPackImage').value.trim(),
  quantity:Number(E('seasonPackQuantity').value),price:Number(E('seasonPackPrice').value),productIds:[...seasonPackSelected]});
 if(body.name.length<2)return seasonMerchStatus('Informe o nome da '+merchKindLabels[kind]+'.',true);
 if(kind==='PACK'&&(!body.productIds.length||body.quantity<2||!(body.price>0)))return seasonMerchStatus('Defina sabores, quantidade e preço do pack.',true);
 const btn=E(prefix+'Save');btn.disabled=true;const old=btn.textContent;btn.textContent='Salvando...';
 try{
  await api('seasonal-merch',{method:'POST',body});
  await loadSeasonAdmin();
  E('seasonMerchCampaign').value=campaignId;
  seasonMerchReset(kind);seasonMerchRender();
  seasonMerchStatus('✅ '+merchKindLabels[kind]+' salvo(a) na campanha. A loja mostrará a nova organização.');
 }catch(e){seasonMerchStatus('Não foi possível salvar: '+e.message,true)}
 finally{btn.disabled=false;btn.textContent=old}
}
function bindSeasonMerch(){
 document.querySelectorAll('[data-season-merch-tab]').forEach(b=>b.addEventListener('click',()=>seasonMerchTabSet(b.dataset.seasonMerchTab)));
 E('seasonMerchCampaign').addEventListener('change',e=>seasonMerchSelectCampaign(e.target.value));
 for(const kind of Object.keys(merchKinds)){
  const prefix='season'+kind[0]+kind.slice(1).toLowerCase();
  E(prefix+'Save').addEventListener('click',()=>seasonMerchSave(kind));
  E(prefix+'New').addEventListener('click',()=>seasonMerchReset(kind));
  E(prefix+'Select').addEventListener('change',e=>e.target.value?seasonMerchEdit(kind,e.target.value):seasonMerchReset(kind));
 }
 E('seasonPackProductSearch').addEventListener('input',seasonMerchPackOptions);
 E('seasonPackProductList').addEventListener('change',e=>{
  const id=e.target?.dataset?.seasonPackProduct;if(!id)return;
  if(e.target.checked)seasonPackSelected.add(id);else seasonPackSelected.delete(id);
 });
 for(const kind of Object.keys(merchKinds)){
  const prefix='season'+kind[0]+kind.slice(1).toLowerCase();
  E(prefix+'List').addEventListener('click',e=>{
   const b=e.target.closest('[data-season-merch-edit]');if(b)seasonMerchEdit(kind,b.dataset.id);
  });
 }
 E('seasonExclusiveCampaign').addEventListener('change',e=>{
  E('seasonMerchCampaign').value=e.target.value;seasonMerchRender();
 });
 E('seasonExclusiveGrade').addEventListener('change',()=>{
  const grade=merchItems('GRADE',true).find(x=>x.id===E('seasonExclusiveGrade').value);
  if(grade?.categoryId)E('seasonExclusiveCategory').value=grade.categoryId;
 });
}
