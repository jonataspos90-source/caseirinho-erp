/* Gestão independente do cardápio sazonal: categorias, grades e packs. */
'use strict';
const {E,st,api,loadSeasonAdmin,s,esc,brl}=window.CaseirinhoSeasonMerchBridge;
let seasonMerchTab='category';
const seasonMerchEditing={CATEGORY:'',GRADE:'',PACK:''};
let seasonPackSelected=new Set();
let seasonGradeDraft=new Map(),seasonGradeCoverId='',seasonGradeSource='all';
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
// Produtos comuns participantes e exclusivos da campanha, com vínculo real de grade.
function seasonGradeProductPool(){
 const campaign=(st.seasonData?.campaigns||[]).find(c=>c.id===seasonMerchCurrent());
 if(!campaign)return[];
 const rules=new Map((campaign.products||[]).map(rule=>[String(rule.id),rule]));
 const common=(st.seasonData?.products||[]).map(p=>{
  const rule=rules.get(String(p.id))||{};
  return{id:String(p.id),name:p.name||p.id,price:Number(p.price)||0,
   gradeId:String(rule.gradeId||''),variantLabel:String(rule.variantLabel||''),
   categoryId:String(rule.categoryId||''),image:String(p.image||''),active:true,exclusive:false,
   participant:rules.has(String(p.id))};
 });
 const exclusive=(st.seasonData?.exclusiveProducts||[])
  .filter(p=>String(p.campaignId)===String(campaign.id)).map(p=>({
   id:String(p.id),name:p.name||p.id,price:Number(p.price)||0,
   gradeId:String(p.gradeId||''),variantLabel:String(p.variantLabel||''),
   categoryId:String(p.categoryId||''),image:String(p.image||''),active:p.active!==false,exclusive:true
  }));
 const result=new Map();
 for(const p of [...common,...exclusive])result.set(p.id,p);
 return [...result.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
function seasonGradeStartDraft(gradeId,coverId=''){
 seasonGradeDraft=new Map();
 seasonGradeCoverId=coverId;
 for(const p of seasonGradeProductPool()){
  if(p.gradeId&&p.gradeId===gradeId)
   seasonGradeDraft.set(p.id,p.variantLabel||p.name);
 }
 seasonGradeRenderChoices();
}
function seasonGradeRenderChoices(){
 const available=E('seasonGradeAvailable'),linked=E('seasonGradeLinked');
 if(!available||!linked)return;
 const pool=seasonGradeProductPool(),byId=new Map(pool.map(p=>[p.id,p]));
 const current=seasonMerchEditing.GRADE;
 const search=(E('seasonGradeAvailableSearch')?.value||'').trim().toLocaleLowerCase('pt-BR');
 const free=pool.filter(p=>p.active&&!seasonGradeDraft.has(p.id)&&(!p.gradeId||p.gradeId===current));
 const matching=free.filter(p=>(seasonGradeSource==='all'||(seasonGradeSource==='exclusive'&&p.exclusive)||(seasonGradeSource==='regular'&&!p.exclusive))&&(p.name+' '+p.id+' '+p.variantLabel).toLocaleLowerCase('pt-BR').includes(search));
 const shown=matching.slice(0,80);
 E('seasonGradeSourceFilters')?.querySelectorAll('[data-season-grade-source]').forEach(b=>{
  const isCurrent=b.dataset.seasonGradeSource===seasonGradeSource;
  b.classList.toggle('primary',isCurrent);b.setAttribute('aria-pressed',String(isCurrent));
 });
 const selected=[...seasonGradeDraft].map(([id,label])=>({p:byId.get(id),id,label})).filter(x=>!!x.p);
 if(!seasonGradeCoverId||!seasonGradeDraft.has(seasonGradeCoverId))seasonGradeCoverId=selected[0]?.id||'';
 E('seasonGradeUnassignedCount').textContent=String(free.length);
 E('seasonGradeLinkedCount').textContent=String(selected.length);
 const btnStyle='border:1px solid #bfd9c6;border-radius:10px;padding:7px 10px;background:#effaf1;color:#0b6042;font-weight:800;cursor:pointer';
 available.innerHTML=shown.length?shown.map(p=>
  '<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px 2px;border-bottom:1px solid #edf0ed">'+
  '<div style="min-width:0;flex:1"><b>'+esc(p.name)+'</b><small style="display:block;color:#66786e">'+brl(p.price)+(p.exclusive?' · 🎄 Exclusivo de encomendas':p.participant?' · 📦 Cadastro normal · Na campanha':' · 📦 Cadastro normal · Será incluído na campanha')+'</small></div>'+
  '<button type="button" data-season-grade-add="'+esc(p.id)+'" style="'+btnStyle+'">+ Vincular</button></div>'
 ).join(''):
 '<p class="subtitle">'+(search?'Nenhum produto sem grade corresponde à busca.':free.length?'Nenhum produto encontrado.':'Todos os produtos disponíveis já foram vinculados a grades. Se precisar, retire um item de outra grade.')+'</p>';
 linked.innerHTML=selected.length?selected.map(({p,id,label})=>
  '<div style="background:#fff;border:1px solid #d5e6d8;padding:10px;border-radius:11px;margin-bottom:7px">'+
  '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><b>'+esc(p.name)+'</b>'+
  '<button type="button" data-season-grade-remove="'+esc(id)+'" style="border:1px solid #edcbcb;background:#fff5f5;color:#963d3d;padding:6px 8px;border-radius:8px;cursor:pointer">Remover</button></div>'+
  '<small style="color:#66786e;display:block;margin:3px 0">'+brl(p.price)+(p.active?'':' · Inativo')+'</small>'+
  '<label style="display:block;font-size:12px;color:#305c47">Sabor / tamanho na grade'+
  '<input type="text" maxlength="80" data-season-grade-label="'+esc(id)+'" value="'+esc(label)+'" placeholder="Ex.: Frango com requeijão" style="width:100%;margin-top:4px"></label>'+
  '<label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-top:6px"><input type="radio" name="seasonGradeCover" data-season-grade-cover="'+esc(id)+'" '+(id===seasonGradeCoverId?'checked':'')+'> Foto deste produto como capa</label></div>'
 ).join(''):'<p class="subtitle">Vincule um produto ao lado. Ele aparecerá aqui com seu sabor ou tamanho.</p>';
 if(matching.length>80)available.insertAdjacentHTML('beforeend','<small style="display:block;padding:8px;color:#718177">Exibindo 80 de '+matching.length+' produtos. Digite o nome para localizar os demais.</small>');
 E('seasonGradeHint').textContent=selected.length?
  selected.length+' produto(s) na grade. Ao salvar, os vínculos e rótulos serão publicados juntos.':
  'Escolha pelo menos um produto para salvar a grade. Não será criada uma grade vazia.';
 E('seasonGradeSave').disabled=!selected.length;
}
function seasonMerchPackPool(){
 const campaign=(st.seasonData?.campaigns||[]).find(c=>c.id===seasonMerchCurrent());
 if(!campaign)return[];
 const rules=new Map((campaign.products||[]).map(p=>[String(p.id),p]));
 const normal=(st.seasonData?.products||[]).filter(p=>Number(p.price)>0).map(p=>({
  ...p,...(rules.get(String(p.id))||{}),id:String(p.id),price:Number(p.price),
  inCampaign:rules.has(String(p.id)),exclusive:false
 }));
 const exclusive=(st.seasonData?.exclusiveProducts||[])
  .filter(p=>String(p.campaignId)===String(campaign.id)&&p.active===true&&p.published!==false&&Number(p.price)>0)
  .map(p=>({...p,id:String(p.id),inCampaign:true,exclusive:true}));
 const products=new Map();
 for(const p of [...normal,...exclusive])products.set(String(p.id),{...p,name:p.name||p.nome||p.id});
 return [...products.values()].sort((a,b)=>Number(!!b.inCampaign)-Number(!!a.inCampaign)||(a.name||'').localeCompare(b.name||'','pt-BR'));
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
 select.innerHTML=optionList(entries,'➕ '+(kind==='PACK'?'Novo ':'Nova ')+merchKindLabels[kind]);
 if(entries.some(x=>x.id===prev))select.value=prev;
 const el=E('season'+kind[0]+kind.slice(1).toLowerCase()+'List');
 el.innerHTML=entries.length?entries.map(x=>{
  const extra=kind==='PACK'?x.quantity+' unidades · '+brl(x.price)+' · '+x.productIds.length+' sabores':kind==='GRADE'?seasonGradeProductPool().filter(p=>p.gradeId===x.id).length+' produto(s) vinculados':x.emoji||'🏷️';
  return '<div class="season-admin-product"><div style="flex:1"><b>'+esc(x.name)+'</b><small>'+esc(extra)+
    ' · Ordem '+esc(x.sortOrder||0)+'</small></div><span class="badge '+(x.active?'good':'warn')+'">'+(x.active?'Ativo':'Inativo')+'</span>'+
    '<button type="button" class="btn small" data-season-merch-edit="'+esc(kind)+'" data-id="'+esc(x.id)+'">✏️ Editar</button></div>';
 }).join(''): '<div class="notice">Nenhum '+merchKindLabels[kind]+' cadastrado nesta campanha.</div>';
}
function seasonMerchPackOptions(){
 const pool=seasonMerchPackPool(),search=(E('seasonPackProductSearch')?.value||'').trim().toLocaleLowerCase('pt-BR');
 const selected=pool.filter(p=>seasonPackSelected.has(String(p.id)));
 const query=pool.filter(p=>(p.name+' '+(p.variantLabel||'')+' '+p.id+' '+(p.category||'')).toLocaleLowerCase('pt-BR').includes(search));
 // Sempre mostre os já selecionados, mesmo que o usuário esteja filtrando por outro sabor.
 const shown=[...selected,...query.filter(p=>!seasonPackSelected.has(String(p.id))).slice(0,70)];
 const uniq=[...new Map(shown.map(p=>[p.id,p])).values()];
 const counter=E('seasonPackSelectedCount');
 if(counter)counter.textContent=selected.length+' produto(s) selecionado(s) · '+selected.filter(p=>!p.inCampaign).length+' será(ão) incluído(s) nesta campanha ao publicar';
 E('seasonPackProductList').innerHTML=uniq.map(p=>
  '<label class="season-admin-choice season-pack-virtual-option'+(seasonPackSelected.has(p.id)?' is-selected':'')+'">'+
  '<input type="checkbox" data-season-pack-product="'+esc(p.id)+'" '+(seasonPackSelected.has(p.id)?'checked':'')+'>'+
  '<span><b>'+esc(p.variantLabel||p.name)+'</b><small>'+brl(p.price||0)+' avulso · '+(p.exclusive?'🎄 Exclusivo':p.inCampaign?'✅ Já na encomenda':'➕ Entrará na encomenda ao publicar')+'</small></span></label>'
 ).join('')||'<div class="notice">Nenhum produto encontrado. Verifique a campanha e o catálogo.</div>';
 if(query.length>70)E('seasonPackProductList').insertAdjacentHTML('beforeend','<small class="subtitle">Mostrando 70 de '+query.length+' resultados. Use a busca para localizar os demais.</small>');
 window.CaseirinhoVirtualPackAdmin?.preview?.();
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
 seasonGradeRenderChoices();
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
 if(kind==='GRADE'){
  seasonGradeDraft=new Map();seasonGradeCoverId='';seasonGradeSource='all';
  E('seasonGradeType').value='SABOR';E('seasonGradeChoiceTitle').value='Escolha o sabor';
  if(E('seasonGradeAvailableSearch'))E('seasonGradeAvailableSearch').value='';
  seasonGradeRenderChoices();
 }
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
 if(kind==='GRADE'){
  E('seasonGradeType').value=item.type||'SABOR';
  E('seasonGradeChoiceTitle').value=item.choiceTitle||'Escolha o sabor';
  seasonGradeStartDraft(item.id,item.coverId||'');
 }
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
 if(kind==='GRADE')Object.assign(body,{description:E('seasonGradeDescription').value.trim(),categoryId:E('seasonGradeCategory').value,image:E('seasonGradeImage').value.trim(),type:E('seasonGradeType').value,choiceTitle:E('seasonGradeChoiceTitle').value.trim(),coverId:seasonGradeCoverId});
 if(kind==='GRADE'){
  body.productVariants=[...seasonGradeDraft].map(([id,variantLabel])=>({id,variantLabel:variantLabel.trim()}));
  if(!body.productVariants.length)return seasonMerchStatus('Vincule pelo menos um produto à grade. Não é preciso cadastrar uma grade vazia.',true);
  if(body.productVariants.some(p=>!p.variantLabel||p.variantLabel.length>80))
   return seasonMerchStatus('Informe o sabor ou tamanho de cada produto vinculado (máximo de 80 caracteres).',true);
 }
 if(kind==='PACK')Object.assign(body,{description:E('seasonPackDescription').value.trim(),image:E('seasonPackImage').value.trim(),
  quantity:Number(E('seasonPackQuantity').value),price:Number(E('seasonPackPrice').value),productIds:[...seasonPackSelected]});
 if(body.name.length<2)return seasonMerchStatus('Informe o nome da '+merchKindLabels[kind]+'.',true);
 if(kind==='PACK'){
  const pool=new Map(seasonMerchPackPool().map(p=>[p.id,p]));
  if(body.productIds.length<2||!Number.isInteger(body.quantity)||body.quantity<2||body.quantity>100||!(body.price>0))
   return seasonMerchStatus('Selecione dois ou mais produtos, informe uma quantidade entre 2 e 100 e o preço total.',true);
  const rows=body.productIds.map(id=>pool.get(id));
  if(rows.some(p=>!p||!(p.price>0)))return seasonMerchStatus('Algum produto selecionado não possui preço avulso válido.',true);
  const min=Math.min(...rows.map(p=>Math.round(Number(p.price)*100)));
  if(Math.round(body.price*100)>=min*body.quantity&&body.active)
   return seasonMerchStatus('Para garantir preço único em qualquer combinação, defina valor inferior a '+brl(min*body.quantity/100)+' (preço dos '+body.quantity+' itens mais baratos).',true);
 }
 const btn=E(prefix+'Save');btn.disabled=true;const old=btn.textContent;btn.textContent='Salvando...';
 try{
  await api('seasonal-merch',{method:'POST',body});
  await loadSeasonAdmin();
  if(kind==='GRADE'&&E('seasonCampaignSelect')?.value===campaignId){
   const campaign=(st.seasonData?.campaigns||[]).find(c=>c.id===campaignId);
   if(campaign){
    st.seasonProductRules=new Map((campaign.products||[]).map(p=>[p.id,{...p}]));
    window.CaseirinhoSeasonMerchBridge.renderSeasonProducts?.();
   }
  }
  E('seasonMerchCampaign').value=campaignId;
  seasonMerchReset(kind);seasonMerchRender();
  seasonMerchStatus('✅ '+(kind==='PACK'?'Pack Virtual publicado com preço fixo e produtos participantes vinculados':'Cadastro salvo')+' com sucesso na campanha. '+(kind==='GRADE'?'Produtos e variações atualizados juntos.':'A loja mostrará a nova organização.'));
  window.CaseirinhoVirtualPackAdmin?.preview?.();
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
 E('seasonGradeAvailableSearch').addEventListener('input',seasonGradeRenderChoices);
 E('seasonGradeSourceFilters').addEventListener('click',e=>{
  const button=e.target.closest('[data-season-grade-source]');if(!button)return;
  seasonGradeSource=button.dataset.seasonGradeSource;
  seasonGradeRenderChoices();
 });
 E('seasonGradeAvailable').addEventListener('click',e=>{
  const button=e.target.closest('[data-season-grade-add]');if(!button)return;
  const p=seasonGradeProductPool().find(x=>x.id===button.dataset.seasonGradeAdd);
  if(!p||p.gradeId&&p.gradeId!==seasonMerchEditing.GRADE){
   return seasonMerchStatus('Este produto já está vinculado a outra grade.',true);
  }
  seasonGradeDraft.set(p.id,p.variantLabel||p.name);
  seasonGradeRenderChoices();
 });
 E('seasonGradeLinked').addEventListener('click',e=>{
  const button=e.target.closest('[data-season-grade-remove]');if(!button)return;
  seasonGradeDraft.delete(button.dataset.seasonGradeRemove);
  if(seasonGradeCoverId===button.dataset.seasonGradeRemove)seasonGradeCoverId='';
  seasonGradeRenderChoices();
 });
 E('seasonGradeLinked').addEventListener('change',e=>{
  const id=e.target?.dataset?.seasonGradeCover;if(id)seasonGradeCoverId=id;
 });
 E('seasonGradeLinked').addEventListener('input',e=>{
  const id=e.target?.dataset?.seasonGradeLabel;
  if(id&&seasonGradeDraft.has(id))seasonGradeDraft.set(id,e.target.value);
 });
 E('seasonPackProductSearch').addEventListener('input',seasonMerchPackOptions);
 E('seasonPackProductList').addEventListener('change',e=>{
  const id=e.target?.dataset?.seasonPackProduct;if(!id)return;
  if(e.target.checked)seasonPackSelected.add(id);else seasonPackSelected.delete(id);
  seasonMerchPackOptions();
 });
 for(const kind of Object.keys(merchKinds)){
  const prefix='season'+kind[0]+kind.slice(1).toLowerCase();
  E(prefix+'List').addEventListener('click',e=>{
   const b=e.target.closest('[data-season-merch-edit]');if(b)seasonMerchEdit(kind,b.dataset.id);
  });
 }
 E('seasonExclusiveCampaign').addEventListener('change',e=>{
  seasonMerchSelectCampaign(e.target.value);
 });
 E('seasonPackProductSearch').addEventListener('change',()=>window.CaseirinhoVirtualPackAdmin?.preview?.());
 E('seasonExclusiveGrade').addEventListener('change',()=>{
  const grade=merchItems('GRADE',true).find(x=>x.id===E('seasonExclusiveGrade').value);
  if(grade?.categoryId)E('seasonExclusiveCategory').value=grade.categoryId;
 });
}
