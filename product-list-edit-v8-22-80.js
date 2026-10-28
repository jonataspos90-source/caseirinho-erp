(function(){
'use strict';
const E=id=>document.getElementById(id), S=v=>String(v??'');
const drafts=new Map();let busy=false;
const products=()=>db.produtos||[];
const types=p=>listaTiposProduto(p);
function matching(query,type){const q=S(query).trim().toLowerCase();return products().filter(p=>(!type||types(p).includes(type))&&(!q||[p.codigo,p.nome,p.gtin,p.plu,types(p).join(' ')].some(v=>S(v).toLowerCase().includes(q)))).sort((a,b)=>S(a.nome).localeCompare(S(b.nome),'pt-BR'))}
function message(text){const el=E('produtoListaMensagem');if(el)el.textContent=text}
async function rename(id,name){
 if(busy)throw new Error('Aguarde a publicação em andamento.');
 if(!permissao('produtos','editar'))throw new Error('Seu usuário não tem permissão para editar produtos.');
 name=S(name).trim();if(!name)throw new Error('Informe o nome do produto.');
 const p=products().find(p=>S(p.id)===S(id));if(!p)throw new Error('Produto não encontrado.');
 busy=true;let saved=false;const before={nome:p.nome,ecommerce:p.ecommerce,atualizadoEm:p.atualizadoEm};
 try{
  p.nome=name;p.ecommerce={...(p.ecommerce||{}),nomeComercial:name};p.atualizadoEm=new Date().toISOString();
  try{__johnLocalStorage.setItem(DB_KEY,JSON.stringify(db));saved=true}catch(err){Object.assign(p,before);throw err}
  message('Nome salvo no ERP. Sincronizando…');
  window.johnCloudCapturarAlteracoes?.();
  if(typeof window.johnCloudFlushIncremental!=='function')throw new Error('Sincronização da nuvem indisponível.');
  const sync=await window.johnCloudFlushIncremental(true);
  if(sync?.error||sync?.pending>0)throw new Error(sync.error||'Há alterações aguardando sincronização. Tente publicar novamente.');
  if(p.ecommerce.publicar===true){
   if(typeof window.JohnV880?.canonicalPublish!=='function')throw new Error('Publicação do catálogo indisponível.');
   message('Nome salvo no ERP. Publicando no app…');
   const catalog=await window.JohnV880.canonicalPublish(true,{onlyProductIds:[p.id]});
   const online=(catalog?.produtos||[]).find(x=>S(x.id)===S(id));
   if(!online||S(online.nomeComercial||online.nome)!==name)throw new Error('O catálogo retornado não confirmou o novo nome.');
   message('Nome salvo e publicado no app.');
  }else message('Nome salvo no ERP. Produto não habilitado para o E-commerce; habilite a publicação no cadastro para exibi-lo no app.');
  drafts.delete(S(id));return true;
 }catch(err){message(saved?'Nome salvo no ERP; sincronização/publicação pendente: '+err.message:'Não foi possível salvar: '+err.message);err.reported=true;throw err}
 finally{busy=false;window.renderProdutos?.()}
}
function enhance(){
 const tb=E('produtosTabela'),search=E('buscaProduto');if(!tb||!search)return;
 if(!E('produtoFiltroTipo')){
  const wrap=document.createElement('label');wrap.textContent='Tipo de produto ';wrap.style='display:flex;align-items:center;gap:8px;flex-wrap:wrap';
  const select=document.createElement('select');select.id='produtoFiltroTipo';select.style='min-width:180px;max-width:260px';select.setAttribute('aria-label','Filtrar por tipo de produto');wrap.appendChild(select);search.parentElement.insertBefore(wrap,search);
  select.addEventListener('change',()=>window.renderProdutos());
  const note=document.createElement('div');note.id='produtoListaMensagem';note.setAttribute('role','status');note.style='padding:12px 16px;color:#475569';note.textContent='Edite o nome na lista e use Salvar e publicar. Produtos desabilitados para o E-commerce continuam fora do app.';tb.closest('.panel').appendChild(note);
 }
 const filter=E('produtoFiltroTipo'),selected=filter.value||'',available=[...new Set(products().flatMap(types))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 filter.replaceChildren();for(const value of ['',...available]){const option=document.createElement('option');option.value=value;option.textContent=value||'Todos os tipos';filter.appendChild(option)}filter.value=available.includes(selected)?selected:'';
 const all=matching(search.value,''),visible=new Set(matching(search.value,filter.value).map(p=>S(p.id)));
 const rows=Array.from(tb.rows);let count=0;
 rows.forEach((row,i)=>{const p=all[i];if(!p||row.cells.length<2)return;row.hidden=!visible.has(S(p.id));if(row.hidden)return;count++;
  if(!permissao('produtos','editar'))return;
  const cell=row.cells[1];cell.replaceChildren();const input=document.createElement('input');input.type='text';input.value=drafts.get(S(p.id))??S(p.nome);input.setAttribute('aria-label','Nome do produto '+S(p.codigo||p.id));input.style='min-width:240px;width:100%';input.disabled=busy;input.addEventListener('input',()=>drafts.set(S(p.id),input.value));
  const button=document.createElement('button');button.type='button';button.className='btn primary';button.textContent='Salvar e publicar';button.style='margin-top:6px';button.disabled=busy;
  button.addEventListener('click',async()=>{button.disabled=true;input.disabled=true;try{await rename(p.id,input.value)}catch(err){if(!err.reported)message(err.message)}finally{button.disabled=false;input.disabled=false}});
  cell.appendChild(input);cell.appendChild(button);
 });
 if(!count&&all.length){const row=tb.insertRow(),cell=row.insertCell();cell.colSpan=14;cell.className='empty';cell.textContent='Nenhum produto encontrado para os filtros selecionados.'}
}
function install(){if(typeof window.renderProdutos!=='function'||window.renderProdutos.productListEdit)return;const original=window.renderProdutos;const wrapped=function(...args){const result=original.apply(this,args);enhance();return result};wrapped.productListEdit=true;window.renderProdutos=wrapped;wrapped()}
window.JohnProductListEdit={matching,rename,install};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
