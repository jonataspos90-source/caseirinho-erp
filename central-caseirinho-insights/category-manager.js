(function(){
'use strict';
if(window.CaseirinhoCategoryManager)return;
const E=id=>document.getElementById(id),S=x=>String(x??''),clean=x=>S(x).trim().replace(/\s+/g,' ');
const esc=x=>S(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bridge=()=>window.CaseirinhoCategoryBridge;
let busy=false;
function info(message,kind='success'){
 const x=E('categoryManagerMessage');if(!x)return;x.hidden=false;x.className='notice '+kind;x.textContent=message;
}
function render(){
 const target=E('categoryManagerList'),b=bridge();if(!target||!b)return;
 const cats=b.categories();
 if(!cats.length){target.innerHTML='<p class="notice">Nenhuma categoria retornada. Toque em Atualizar para consultar o ERP.</p>';return}
 target.innerHTML='<div class="category-grid">'+cats.map(c=>{
  const used=Number(c.productCount)||0,legacy=c.legacy===true;
  const ordered='('+Number(c.order||0)+')',tooltip=used>0?'Reclassifique os produtos antes de excluir.':'Pode excluir: não há produtos vinculados.';
  return '<article class="category-card"><div class="category-header"><span class="category-symbol">'+esc(c.emoji||'🏷️')+'</span>'+
    '<div><strong>'+esc(c.name)+'</strong><small>'+esc(ordered)+' · '+used+' produto(s) vinculado(s) · '+Number(c.publishedCount||0)+' publicado(s)</small></div></div>'+
    (legacy?'<p class="notice warn">Categoria antiga encontrada em produtos. Edite para regularizá-la na configuração oficial.</p>':'')+
    (c.description&&!legacy?'<p class="muted">'+esc(c.description)+'</p>':'')+
    '<div class="category-actions"><button type="button" class="btn small" data-cat-edit="'+esc(c.id)+'">✏️ Editar</button>'+
    '<button type="button" class="btn small" data-cat-products="'+esc(c.id)+'">📦 Ver produtos</button>'+
    '<button type="button" class="btn small '+(used>0?'':'danger')+'" title="'+esc(tooltip)+'" data-cat-delete="'+esc(c.id)+'"'+(used>0?' disabled':'')+'>🗑️ Excluir</button></div></article>';
 }).join('')+'</div>';
 E('categoryManagerCount').textContent=cats.length+' categoria(s), incluindo categorias antigas';
}
function modalForm(category){
 const b=bridge();if(!b)return;
 const edit=!!category;
 const title=edit?'✏️ Editar categoria · '+category.name:'➕ Nova categoria do e-commerce';
 b.modal(title,
  '<p>As mudanças serão salvas no ERP e refletidas no catálogo do Caseirinho. Renomear uma categoria também atualiza os produtos vinculados.</p>'+
  '<form id="categoryManageForm" data-cat-id="'+esc(category?.id||'')+'">'+
  '<label class="form-label" for="catName">Nome da categoria *</label><input id="catName" maxlength="65" required placeholder="Ex.: Lasanhas" value="'+esc(category?.name||'')+'">'+
  '<div class="form-grid"><div><label class="form-label" for="catEmoji">Emoji</label><input id="catEmoji" maxlength="12" placeholder="🍝" value="'+esc(category?.emoji||'🍝')+'"></div>'+
  '<div><label class="form-label" for="catOrder">Ordem no catálogo</label><input id="catOrder" type="number" min="0" max="9999" step="1" value="'+(edit?Number(category.order||0):Math.min(9999,Math.max(1,...b.categories().filter(x=>x.legacy!==true).map(x=>Number(x.order||0)+1))))+'"></div></div>'+
  '<label class="form-label" for="catDescription">Descrição (opcional)</label><textarea id="catDescription" maxlength="240" rows="3" placeholder="Descrição breve para organização">'+esc(category?.description&&category.legacy!==true?category.description:'')+'</textarea>'+
  '<div id="catModalAlert" class="notice" hidden role="status"></div>'+
  '<button type="submit" class="btn primary" id="catSaveBtn">💾 '+(edit?'Salvar alterações':'Criar categoria')+'</button></form>');
 E('catName')?.focus?.();
}
async function reload(){
 const b=bridge();if(!b)return;
 try{await b.reload();render();}catch(e){info('Falha na atualização das categorias: '+e.message,'error');}
}
function modalError(message){const x=E('catModalAlert');if(x){x.className='notice error';x.textContent=message;x.hidden=false;}else info(message,'error');}
async function save(e){
 e.preventDefault();if(busy)return;
 const form=e.target,id=form.dataset.catId;
 const name=clean(E('catName')?.value),emoji=clean(E('catEmoji')?.value)||'✨',
  description=clean(E('catDescription')?.value),order=Number(E('catOrder')?.value);
 if(name.length<2||name.length>65)return modalError('Informe um nome com 2 a 65 caracteres.');
 if(!Number.isSafeInteger(order)||order<0||order>9999)return modalError('Informe uma ordem válida.');
 const b=bridge();if(!b)return modalError('Conexão com ERP indisponível.');
 if(id&&!window.confirm('Renomear ou editar a categoria '+name+' e atualizar os produtos vinculados no e-commerce?'))return;
 const button=E('catSaveBtn');busy=true;if(button){button.disabled=true;button.textContent='Salvando no ERP...'}
 let response=null;
 try{
  response=await b.api('product-categories'+(id?'/'+encodeURIComponent(id):''),{
   method:id?'PATCH':'POST',body:{name,emoji,description,order}});
  await b.reload();
  const expectedId=id||response.id,updated=b.categories().find(x=>x.id===expectedId&&x.name===name);
  if(!updated)throw Error('A gravação foi recebida, mas a categoria ainda não foi confirmada na lista atual. Atualize antes de repetir.');
  b.hideModal();render();info('✅ Categoria '+name+(id?' atualizada':' criada')+' e confirmada no cadastro do ERP e e-commerce.');
 }catch(error){modalError((response?'Gravação enviada, mas verificação pendente: ':'Não foi possível confirmar: ')+error.message+' Não repita a ação antes de atualizar a lista.');}
 finally{busy=false;if(button){button.disabled=false;button.textContent='💾 Salvar categoria'}}
}
async function remove(id){
 if(busy)return;const b=bridge(),c=b?.categories().find(x=>x.id===id);if(!c)return info('Categoria não encontrada. Atualize.','error');
 if(c.productCount>0)return info('A categoria '+c.name+' possui '+c.productCount+' produtos. Mude a categoria desses produtos antes de excluir.','warn');
 if(!window.confirm('EXCLUIR a categoria '+c.name+' do e-commerce? Essa exclusão não apaga produtos, mas não poderá ser desfeita automaticamente.'))return;
 busy=true;try{
  await b.api('product-categories/'+encodeURIComponent(id),{method:'DELETE'});
  await b.reload();render();
  if(b.categories().some(x=>x.id===id))throw Error('Categoria ainda consta no servidor. Verifique antes de repetir.');
  info('✅ Categoria '+c.name+' excluída e confirmada no ERP.');
 }catch(e){info('Não foi possível confirmar a exclusão: '+e.message+'. Confira o cadastro antes de tentar novamente.','error');}
 finally{busy=false;}
}
function bind(){
 E('categoryCreate')?.addEventListener('click',()=>modalForm(null));
 E('categoryRefresh')?.addEventListener('click',reload);
 document.addEventListener('submit',e=>{if(e.target.id==='categoryManageForm')save(e);});
 document.addEventListener('click',e=>{
  const edit=e.target.closest('[data-cat-edit]');if(edit)return modalForm(bridge()?.categories().find(x=>x.id===edit.dataset.catEdit));
  const del=e.target.closest('[data-cat-delete]');if(del)return remove(del.dataset.catDelete);
  const products=e.target.closest('[data-cat-products]');if(products){
   const c=bridge()?.categories().find(x=>x.id===products.dataset.catProducts);
   if(c)bridge()?.filterProducts(c.name);
  }
 });
 window.addEventListener('caseirinho:categories-updated',render);
 render();
}
window.CaseirinhoCategoryManager={render,reload,version:'20261110.1'};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();