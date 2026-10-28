'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
test('manutencao de produto acabado salva modalidades, sem mexer em preco',()=>{
 const s=read('caseirinho-encomendas-v8-22-70.js');
 assert.match(s,/Produto[s]? acabado/i);
 assert.match(s,/PRONTA_ENTREGA/);
 assert.match(s,/SOB_ENCOMENDA/);
 assert.match(s,/AMBOS/);
 assert.match(s,/p\.ecommerce=\{\.\.\.\(p\.ecommerce\|\|\{\}\),disponibilidade:mode,antecedenciaDias:days\}/);
 assert.doesNotMatch(s,/p\.precoVenda\s*=/);
});
test('ERP oferece decisão por item e WhatsApp com envio manual',()=>{
 const s=read('caseirinho-encomendas-v8-22-70.js');
 assert.match(s,/cashbackDecision,reason,itens/);
 assert.match(s,/wa\.me/);
 assert.match(s,/Produzir sob encomenda/);
});
test('módulos aparecem no menu e PWA injeta nova tela',()=>{
 const central=read('central-modules-hotfix-v8-22-2.js');
 const sw=read('service-worker.js');
 assert.doesNotMatch(central,/centralgerencial"\]\{display:none!important/);
 assert.match(sw,/caseirinho-encomendas-v8-22-70\.js/);
});
