const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const js=fs.readFileSync('delivery-moto-config-v8-22-39.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('módulo Entrega Moto possui sintaxe válida',()=>{
  assert.doesNotThrow(()=>new Function(js));
});

test('ERP expõe todos os campos administrativos solicitados',()=>{
  for(const id of ['dmStreet','dmNumber','dmCep','dmBase','dmIncluded','dmExtra','dmMax'])assert.match(js,new RegExp(id));
  assert.match(js,/Envios Moto - Uber\/99/);
  assert.match(js,/Rua José Bonifácio/);
  assert.match(js,/08502-330/);
});

test('simulação mantém tabela comercial 1, 2, 3 e 5 km',()=>{
  assert.match(js,/\[1,2,3,5\]/);
  assert.match(js,/psychological99:true/);
  assert.match(js,/Math\.ceil/);
});

test('ERP salva configuração na API e testa endereço pela rota pública',()=>{
  assert.match(js,/\/api\/v1\/admin\/store\/delivery-config/);
  assert.match(js,/\/delivery-quote/);
  assert.match(js,/providerConfigured/);
});

test('PWA injeta e atualiza cache para módulo V8.22.39',()=>{
  assert.match(sw,/john-erp-pwa-v8\.22\.39-delivery-moto/);
  assert.match(sw,/delivery-moto-config-v8-22-39\.js/);
  assert.match(sw,/DELIVERY_MOTO_TAG/);
});
