const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync('app.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('entrega fica sempre a combinar',()=>{assert.match(app,/E\('time'\)\.value='A combinar'/);assert.match(app,/horario:mode==='ENTREGA'\?'A combinar'/)});
test('todo pedido de entrega exige confirmação do frete',()=>{assert.match(app,/confirmDeliveryExperience/);assert.match(app,/Este pedido terá valor de entrega/)});
test('cotação do ERP aceita sim ou não no app',()=>{assert.match(app,/shipping-decision/);assert.match(app,/data-shipping-yes/);assert.match(app,/data-shipping-no/)});
test('aceite mostra popup e pix',()=>{assert.match(app,/Seu pedido foi aceito!/);assert.match(app,/PIX disponível/);assert.match(app,/data-copy-pix/)});
test('horário posterior gera aviso',()=>{assert.match(app,/Horário de entrega confirmado/);assert.match(app,/orderTimeText/)});
test('polling de pedidos é leve e separado do catálogo',()=>{assert.match(app,/pollCustomerOrders/);assert.match(app,/20000/)});
test('cache PWA foi versionado',()=>{assert.match(sw,/caseirinho-loja-v9\.1\.0-customer-experience/)});


test('recusa do frete apresenta cancelamento e convite para novo pedido',()=>{
  assert.match(app,/title:'Pedido cancelado'/);
  assert.match(app,/Fazer novo pedido/);
  assert.match(app,/st==='CANCELADO'/);
  assert.match(app,/data-new-order/);
});
