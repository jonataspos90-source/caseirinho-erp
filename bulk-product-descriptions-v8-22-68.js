(function(){
'use strict';
if(window.__JOHN_BULK_DESCRIPTIONS_82268__)return;
window.__JOHN_BULK_DESCRIPTIONS_82268__=true;
const E=id=>document.getElementById(id);
const S=v=>String(v??'');
const A=v=>Array.isArray(v)?v:[];
const norm=v=>S(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const esc=v=>S(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
const selected=new Set(),drafts=new Map();
const productList=()=>typeof db!=='undefined'?A(db?.produtos):[];
const types=p=>A(p?.tipos).map(S);
function notify(message){if(typeof toast==='function')toast(message);else window.alert(message);}
function editable(){
  if(typeof permissao==='function'&&!permissao('produtos','editar')){
    notify('Seu perfil não tem permissão para alterar produtos.');return false;
  }
  return true;
}
function filters(){
  const q=norm(E('bulkDescSearch')?.value);
  const kind=E('bulkDescType')?.value||'ALL';
  return productList().filter(p=>(kind==='ALL'||types(p).some(t=>norm(t)===norm(kind)))&&(!q||norm([p.nome,p.codigo,p.ecommerce?.nomeComercial,p.ecommerce?.descricao].join(' ')).includes(q)))
    .sort((a,b)=>S(a.nome).localeCompare(S(b.nome),'pt-BR'));
}
function updateSelected(){
  const el=E('bulkDescSelected');
  if(el)el.textContent=selected.size+' selecionado(s)';
}
function render(){
  const table=E('bulkDescRows');if(!table)return;
  table.innerHTML=filters().map(p=>{
    const change=drafts.get(S(p.id))||{};
    const title=change.nome??p.nome??'';
    const description=change.descricao??p.ecommerce?.descricao??'';
    return '<tr data-product-id="'+esc(p.id)+'">'+
     '<td><input type="checkbox" class="bulk-desc-mark" '+(selected.has(S(p.id))?'checked':'')+' aria-label="Selecionar '+esc(p.nome)+'"></td>'+
     '<td>'+esc(p.codigo||'—')+'</td>'+
     '<td><input class="bulk-desc-name" maxlength="220" value="'+esc(title)+'" aria-label="Nome de '+esc(p.nome)+'"></td>'+
     '<td>'+esc(types(p).join(', ')||'—')+'</td>'+
     '<td><textarea class="bulk-desc-text" maxlength="1500" rows="2" aria-label="Descrição do app de '+esc(p.nome)+'">'+esc(description)+'</textarea></td>'+
     '</tr>';
  }).join('')||'<tr><td colspan="5">Nenhum produto encontrado.</td></tr>';
  updateSelected();
}
function collect(event){
  const t=event.target,tr=t.closest('tr[data-product-id]');if(!tr)return;
  const id=S(tr.dataset.productId);
  const item=productList().find(p=>S(p.id)===id);if(!item)return;
  if(t.classList.contains('bulk-desc-mark')){if(t.checked)selected.add(id);else selected.delete(id);updateSelected();return;}
  if(t.classList.contains('bulk-desc-name')||t.classList.contains('bulk-desc-text')){
    const old=drafts.get(id)||{};
    if(t.classList.contains('bulk-desc-name'))old.nome=t.value;
    else old.descricao=t.value;
    drafts.set(id,old);
    selected.add(id);
    const check=tr.querySelector('.bulk-desc-mark');if(check)check.checked=true;
    updateSelected();
  }
}
function markFiltered(state){for(const p of filters()){if(state)selected.add(S(p.id));else selected.delete(S(p.id));}render();}
function applyDescription(){
  const text=S(E('bulkDescCommon')?.value).trim();
  if(!text){notify('Informe a descrição que deseja aplicar.');return;}
  if(!selected.size){notify('Selecione os produtos primeiro.');return;}
  if(!window.confirm('Aplicar a mesma descrição do aplicativo a '+selected.size+' produto(s) selecionado(s)?'))return;
  for(const id of selected){const d=drafts.get(id)||{};d.descricao=text;drafts.set(id,d);}
  render();
}
function saveSelected(){
  if(!editable())return;
  if(!selected.size){notify('Selecione ao menos um produto.');return;}
  const planned=[];
  for(const id of selected){
    const p=productList().find(x=>S(x.id)===id);
    if(!p)continue;
    const d=drafts.get(id)||{};
    const nome=S(d.nome??p.nome).trim();
    const descricao=S(d.descricao??p.ecommerce?.descricao).trim();
    if(!nome){notify('Nome vazio para o produto '+S(p.codigo||p.id)+'.');return;}
    planned.push({p,nome,descricao});
  }
  if(!planned.length)return;
  if(!window.confirm('Confirmar alterações de descrição/nome em '+planned.length+' produto(s)?'))return;
  const backup=planned.map(({p})=>({p,nome:p.nome,ecommerce:p.ecommerce,atualizadoEm:p.atualizadoEm,operadorAtualizacao:p.operadorAtualizacao}));
  try{
    for(const {p,nome,descricao} of planned){
      p.nome=nome;
      p.ecommerce={...p.ecommerce,descricao};
      p.atualizadoEm=new Date().toISOString();
      p.operadorAtualizacao=typeof usuarioAtual==='function'?(usuarioAtual()?.nome||'Manutenção em lote'):'Manutenção em lote';
    }
    if(typeof registrarLog==='function')registrarLog('produtos','MANUTENÇÃO DE DESCRIÇÕES EM LOTE',planned.length+' produtos alterados');
    if(typeof save==='function')save();
    else if(typeof DB_KEY!=='undefined')localStorage.setItem(DB_KEY,JSON.stringify(db));
    else throw Error('Persistência indisponível. Não foi possível salvar.');
    for(const {p} of planned){selected.delete(S(p.id));drafts.delete(S(p.id));}
    render();
    notify(planned.length+' produto(s) salvo(s). Confira a publicação no e-commerce.');
  }catch(e){
    for(const v of backup){v.p.nome=v.nome;v.p.ecommerce=v.ecommerce;v.p.atualizadoEm=v.atualizadoEm;v.p.operadorAtualizacao=v.operadorAtualizacao;}
    console.error(e);
    notify('Falha ao salvar: '+S(e.message||e));
  }
}
function close(){
  E('bulkDescPanel')?.remove();
  const menu=E('manutencao')?.querySelector('.report-choice-grid');
  menu?.classList.remove('hidden');
}
function open(){
  if(!editable())return;
  const page=E('manutencao'),menu=page?.querySelector('.report-choice-grid');if(!page||!menu)return;
  E('bulkDescPanel')?.remove();
  selected.clear();drafts.clear();
  const panel=document.createElement('div');panel.id='bulkDescPanel';
  panel.innerHTML='<div class="panel"><div class="panel-head"><div><h2>📝 Manutenção de descrições em lote</h2><div class="subtitle">Encontre por nome/código ou tipo. Altere nomes individuais e descrições exibidas no aplicativo, sem afetar preços.</div></div><button type="button" id="bulkDescBack" class="btn secondary">Voltar</button></div>'+
  '<div class="panel-body"><div class="grid"><div class="field w6"><label for="bulkDescSearch">Pesquisar produto</label><input id="bulkDescSearch" placeholder="Digite o produto, código ou descrição"></div><div class="field"><label for="bulkDescType">Tipo de produto</label><select id="bulkDescType"><option value="ALL">Todos os tipos</option></select></div></div>'+
  '<div class="actions" style="display:flex;gap:8px;flex-wrap:wrap;margin:14px 0"><button type="button" id="bulkDescSelect" class="btn secondary">Selecionar filtrados</button><button type="button" id="bulkDescUnselect" class="btn secondary">Desmarcar filtrados</button><strong id="bulkDescSelected">0 selecionado(s)</strong></div>'+
  '<div class="grid"><div class="field w12"><label for="bulkDescCommon">Mesma descrição para os selecionados (opcional)</label><textarea id="bulkDescCommon" rows="3" placeholder="Descrição comercial exibida no aplicativo"></textarea><button type="button" id="bulkDescApply" class="btn secondary">Aplicar descrição aos selecionados</button></div></div>'+
  '<div class="table-wrap"><table style="min-width:850px"><thead><tr><th>Sel.</th><th>Código</th><th>Nome do produto</th><th>Tipo</th><th>Descrição para o aplicativo</th></tr></thead><tbody id="bulkDescRows"></tbody></table></div>'+
  '<div class="actions" style="margin-top:16px"><button type="button" id="bulkDescSave" class="btn primary">Salvar selecionados</button></div><p class="subtitle">Altera os registros do ERP; a exibição no aplicativo depende da publicação/sincronização do catálogo.</p></div></div>';
  menu.classList.add('hidden');
  page.appendChild(panel);
  E('bulkDescType').innerHTML+=[...new Set(productList().flatMap(types))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(t=>'<option value="'+esc(t)+'">'+esc(t)+'</option>').join('');
  E('bulkDescBack').onclick=close;
  E('bulkDescSearch').oninput=render;
  E('bulkDescType').onchange=render;
  E('bulkDescSelect').onclick=()=>markFiltered(true);
  E('bulkDescUnselect').onclick=()=>markFiltered(false);
  E('bulkDescApply').onclick=applyDescription;
  E('bulkDescSave').onclick=saveSelected;
  E('bulkDescRows').addEventListener('input',collect);
  E('bulkDescRows').addEventListener('change',collect);
  render();
}
function mount(){
  const menu=E('manutencao')?.querySelector('.report-choice-grid');if(!menu)return;
  if(E('bulkDescOpen'))return;
  const b=document.createElement('button');b.id='bulkDescOpen';b.className='report-choice';b.type='button';
  b.innerHTML='<span class="icon">📝</span><b>Descrições em lote</b><small>Pesquise por produto ou tipo e edite várias descrições.</small>';
  menu.appendChild(b);b.onclick=open;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
window.addEventListener('focus',mount);
document.addEventListener('click',ev=>{if(ev.target.closest?.('.nav [data-page="manutencao"]'))setTimeout(mount,150)});
setInterval(mount,2500);
})();