const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const commerce=fs.readFileSync(path.join(root,'commerce-engine-v8-15-0.js'),'utf8');
const management=fs.readFileSync(path.join(root,'management-engine-v8-16-0.js'),'utf8');
const usage=fs.readFileSync(path.join(root,'erp-usage-v8-20.js'),'utf8');

test('Motor Comercial está isolado do cadastro de categorias/catálogo',()=>{
  assert.doesNotMatch(commerce,/config\.ecommerce\.categorias/);
  assert.doesNotMatch(commerce,/replaceCatalog/);
  assert.match(commerce,/Motor Comercial do E-commerce/);
  assert.match(commerce,/CROSS_SELL/);
});

test('Central Gerencial mantém Pricing Multicanal sem reescrever categorias',()=>{
  assert.doesNotMatch(management,/config\.ecommerce\.categorias/);
  assert.doesNotMatch(management,/replaceCatalog/);
  assert.match(management,/marketplaces/);
  assert.match(management,/Pergunte ao John/);
});

test('telemetria ERP envia heartbeat próprio e separa ERP de Loja/App',()=>{
  assert.match(usage,/usage\/ping/);
  assert.match(usage,/appVersion:'ERP:'/);
  assert.match(usage,/ERP ativos agora/);
  assert.match(usage,/Loja\/App ativos agora/);
  assert.match(usage,/setInterval\(heartbeat,120000\)/);
});

test('scripts de recuperação concorrente e layout quebrado não retornaram',()=>{
  for(const x of ['ecommerce-recovery-v8-16-1.js','catalog-deep-recovery-v8-18-1.js','john-next-v8-17.js'])assert.doesNotMatch(html,new RegExp(x.replaceAll('.','\\.')));
});
