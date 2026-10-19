'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const app=fs.readFileSync('caseirinho-mercadopago-v8-22-71.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
test('painel financeiro carrega status sem capturar cartões nem segredos',()=>{
 assert.match(app,/\/api\/v1\/admin\/store\/mercadopago\/status/);
 assert.match(app,/\/api\/v1\/admin\/store\/orders\?status=TODOS/);
 assert.match(app,/mercadoPago\?\.status/);
 assert.doesNotMatch(app,/ACCESS_TOKEN|WEBHOOK_SECRET/);
});
test('painel Mercado Pago entra no PWA versionado',()=>{
 assert.match(sw,/caseirinho-mercadopago-v8-22-71\.js/);
 assert.match(sw,/john-erp-pwa-v8\.22\.71-mercadopago/);
});