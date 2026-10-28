const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function boot(options={}){
 const product={id:'p1',codigo:'10',nome:'Coxinha',tipos:['Produto acabado','Revenda'],ecommerce:{publicar:true,nomeComercial:'Coxinha antiga',precoEcommerce:12,imagens:['foto']}};
 const db={produtos:[product,{id:'p2',codigo:'20',nome:'Farinha',tipos:['MP']}]},note={textContent:''},storage=new Map(),calls=[];
 const window={johnCloudCapturarAlteracoes:()=>calls.push('capture'),johnCloudFlushIncremental:async()=>{calls.push('flush');return options.pending?{pending:1}:undefined},JohnV880:{canonicalPublish:async(silent,opts)=>{calls.push(opts);if(options.fail)throw new Error('Sem conexão');return {produtos:[{id:'p1',nome:options.stale?'Antigo':product.nome}]}}}};
 const context={window,db,document:{readyState:'loading',addEventListener(){},getElementById:()=>note},listaTiposProduto:p=>p.tipos,permissao:()=>options.allowed!==false,__johnLocalStorage:{setItem:(k,v)=>{if(options.diskFail)throw new Error('Sem espaço');storage.set(k,v)}},DB_KEY:'db',console};
 vm.runInNewContext(fs.readFileSync('product-list-edit-v8-22-80.js','utf8'),context);
 return {api:window.JohnProductListEdit,product,db,note,storage,calls};
}
test('busca e tipo combinam, incluindo produtos com múltiplos tipos',()=>{
 const h=boot();assert.equal(h.api.matching('cox','Revenda').length,1);assert.equal(h.api.matching('cox','MP').length,0);assert.equal(h.api.matching('20','MP')[0].id,'p2');assert.equal(h.api.matching('','').length,2);
});
test('renomeia no ERP e no app preservando preço, fotos e tipos',async()=>{
 const h=boot();await h.api.rename('p1',' Coxinha de frango ');assert.equal(h.product.nome,'Coxinha de frango');assert.equal(h.product.ecommerce.nomeComercial,'Coxinha de frango');assert.equal(h.product.ecommerce.precoEcommerce,12);assert.deepEqual(h.product.ecommerce.imagens,['foto']);assert.equal(JSON.parse(h.storage.get('db')).produtos[0].nome,'Coxinha de frango');assert.equal(h.calls[0],'capture');assert.equal(h.calls[1],'flush');assert.equal(h.calls[2].onlyProductIds[0],'p1');assert.match(h.note.textContent,/publicado no app/);
});
test('falha de publicação preserva edição local e informa pendência',async()=>{
 const h=boot({fail:true});await assert.rejects(h.api.rename('p1','Novo nome'),/Sem conexão/);assert.equal(h.product.nome,'Novo nome');assert.match(h.note.textContent,/pendente/);
});
test('não confirma sucesso quando catálogo ainda tem nome antigo',async()=>{
 const h=boot({stale:true});await assert.rejects(h.api.rename('p1','Novo nome'),/não confirmou/);assert.match(h.note.textContent,/pendente/);
});
test('nome vazio e usuário sem permissão não alteram produto',async()=>{
 const h=boot();await assert.rejects(h.api.rename('p1','  '),/Informe/);assert.equal(h.storage.size,0);const denied=boot({allowed:false});await assert.rejects(denied.api.rename('p1','Novo'),/permissão/);assert.equal(denied.product.nome,'Coxinha');
});
test('produto não publicado mantém essa condição',async()=>{
 const h=boot();h.product.ecommerce.publicar=false;await h.api.rename('p1','Novo nome');assert.equal(h.calls.length,2);assert.equal(h.product.ecommerce.publicar,false);assert.match(h.note.textContent,/não habilitado/);
});
test('falha de gravação restaura o produto anterior',async()=>{
 const h=boot({diskFail:true});await assert.rejects(h.api.rename('p1','Novo nome'),/Sem espaço/);assert.equal(h.product.nome,'Coxinha');assert.equal(h.product.ecommerce.nomeComercial,'Coxinha antiga');assert.equal(h.calls.length,0);
});

test('fila pendente impede publicação que poderia recuperar nome antigo',async()=>{
 const h=boot({pending:true});await assert.rejects(h.api.rename('p1','Nome novo'),/aguardando sincronização/);assert.equal(h.calls.length,2);assert.equal(h.product.nome,'Nome novo');assert.match(h.note.textContent,/pendente/);
});
