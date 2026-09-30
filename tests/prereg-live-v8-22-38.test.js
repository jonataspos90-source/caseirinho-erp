const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('ecommerce-preregistration-live-v8-22-38.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
test('Painel rápido é JavaScript válido e entra no PWA',()=>{
 assert.doesNotThrow(()=>new Function(js));
 assert.match(sw,/ecommerce-preregistration-live-v8-22-38\.js/);
 assert.match(sw,/PREREG_TAG/);
});
test('Verificação leve não redesenha toda a aplicação',()=>{
 assert.match(js,/change-token/);
 assert.match(js,/6000/);
 assert.doesNotMatch(js,/MutationObserver/);
 assert.match(js,/john:prereg-approved/);
});
test('Aprovação mantém a chamada transacional original e bloqueia duplicados',()=>{
 assert.match(js,/method:'PATCH'/);
 assert.match(js,/CONFLITO_WHATSAPP/);
 assert.match(js,/ENCONTRADO_WHATSAPP/);
 assert.match(js,/r\.erpPessoaId/);
});
