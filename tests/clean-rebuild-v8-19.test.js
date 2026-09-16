const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const hydrate=fs.readFileSync(path.join(root,'server-catalog-hydration-v8-19.js'),'utf8');

const pages=[
  'dashboard','produtos','entradas','estoque','patrimonio','inventario','kardex','vendas','fluxoCaixa',
  'fichas','transformacoes','producao','gestaoProducao','separacao','pedidos','convenio','lojas',
  'contasConsumo','transferenciaInterna','perdas','dreReal','fretes','manutencaoMargem','pricing',
  'promocoes','pessoas','despesasManuais','freelancePagamentos','relatorioFreelance','config'
];

for(const id of pages){
  test(`módulo/página ${id} existe`,()=>assert.match(html,new RegExp(`id=["']${id}["']`)));
}

test('funções críticas do cadastro de produtos existem',()=>{
  for(const name of ['renderProducts','editarProduto','limparProdutoForm','produto'])assert.match(html,new RegExp(`function ${name}\\b`));
});

test('funções críticas de estoque existem',()=>{
  for(const name of ['renderEstoque','estoqueProduto','renderInventarios','renderKardex'])assert.match(html,new RegExp(`function ${name}\\b`));
});

test('funções críticas de PCP existem',()=>{
  for(const name of ['renderFichas','renderTrans','renderProducoes','renderGestaoProducao'])assert.match(html,new RegExp(`function ${name}\\b`));
});

test('funções críticas de vendas e pedidos existem',()=>{
  for(const name of ['renderVendas','renderPedidos'])assert.match(html,new RegExp(`function ${name}\\b`));
  assert.match(html,/ecommercePedidosRecebidos/);
});

test('funções críticas financeiras existem',()=>{
  for(const name of ['renderFluxoCaixa','renderConvenio','renderDreReal'])assert.match(html,new RegExp(`(?:function\\s+|window\\.)${name}\\b`));
});

test('pricing e promoções continuam disponíveis',()=>{
  assert.match(html,/id="pricing"/);
  assert.match(html,/id="promocoes"/);
  assert.match(html,/manutencaoMargem/);
});

test('categorias da loja usam estrutura original V8.14',()=>{
  assert.match(html,/function categorias\(\)/);
  assert.match(html,/function renderCategories\(\)/);
  assert.match(html,/function saveCategory\(/);
  assert.match(html,/ecommerceCategorias/);
});

test('produtos online e imagens usam catálogo canônico',()=>{
  assert.match(html,/ecommerceProdutosOnline/);
  assert.match(html,/function renderOnline\(\)/);
  assert.match(html,/function canonicalPublish\(/);
});

test('hidratação V8.19 é somente recuperação de leitura do catálogo público',()=>{
  assert.match(hydrate,/\/api\/v1\/public\/store\//);
  assert.doesNotMatch(hydrate,/method\s*:\s*['"]PUT['"]/);
  assert.doesNotMatch(hydrate,/method\s*:\s*['"]DELETE['"]/);
  assert.doesNotMatch(hydrate,/\/api\/v1\/admin\/store\/catalog/);
  assert.match(hydrate,/e\.categoriaId=catId/);
  assert.match(hydrate,/e\.imagem=imgs\[0\]/);
});

test('evoluções seguras são reincorporadas e scripts que competiam com catálogo/layout continuam fora',()=>{
  for(const f of ['commerce-engine-v8-22-0.js','management-engine-v8-22-0.js','erp-usage-v8-20.js']){
    assert.match(html,new RegExp(f.replaceAll('.','\\.')));
  }
  for(const f of ['ecommerce-recovery-v8-16-1.js','john-next-v8-17.js','catalog-deep-recovery-v8-18-1.js']){
    assert.doesNotMatch(html,new RegExp(f.replaceAll('.','\\.')));
  }
});

test('service worker força cache V8.20 e preserva hidratação + evoluções isoladas',()=>{
  assert.match(sw,/john-erp-pwa-v8\.22\.0-gestao-completa/);
  assert.match(sw,/server-catalog-hydration-v8-19\.js/);
  assert.match(sw,/commerce-engine-v8-22-0\.js/);
  assert.match(sw,/management-engine-v8-22-0\.js/);
  assert.match(sw,/erp-usage-v8-20\.js/);
});
