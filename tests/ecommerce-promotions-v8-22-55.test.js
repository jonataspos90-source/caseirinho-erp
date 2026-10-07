'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');

test('cadastro E-commerce salva preço, promoção e os dois tipos de Pack Virtual',()=>{
  for(const field of ['produtoEcomPreco','produtoPromoAtiva','produtoPromoPreco','produtoPackTipo','LEVE_X_PAGUE_Y','COMPRA_X_LEVE_Y_POR_VALOR','produtoPackBeneficio','precoEcommerce,promocao:','packVirtual'])assert.ok(html.includes(field),`Campo/regra ausente: ${field}`);
});

test('catálogo preserva campos de promoção e pack ao publicar',()=>{
  assert.match(html,/cp\.promocao=e\.promocao/);
  assert.match(html,/cp\.packVirtual=e\.packVirtual/);
});

test('PWA troca o cache do ERP para V8.22.55',()=>{
  assert.match(sw,/john-erp-pwa-v8\.22\.55-ecommerce-promotions/);
});
