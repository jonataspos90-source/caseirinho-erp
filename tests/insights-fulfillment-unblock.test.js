'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const p=x=>fs.readFileSync('central-caseirinho-insights/'+x,'utf8');
test('pedido pode ser concluído com importação pendente, sem botão disabled',()=>{
 const s=p('app.js');
 assert.match(s,/data-action="completeOrder"/);
 assert.doesNotMatch(s,/!imported\?'disabled'/);
 assert.doesNotMatch(s,/Aguarde o pedido ser importado e vinculado ao ERP para liberar a conclusão/);
 assert.match(s,/a venda poderá ser concluída e entrará no DRE/);
});
test('confirmações de entrega e pagamento continuam necessárias',()=>{
 const s=p('app.js');
 assert.match(s,/fulfillmentDelivered/);
 assert.match(s,/fulfillmentPayment/);
 assert.match(s,/confirmDelivered:true,paymentChecked:true/);
});
test('status e receita do DRE são apresentados após conclusão',()=>{
 const s=p('app.js');
 assert.match(s,/out\.receitaProdutos/);
 assert.match(s,/Integração ERP pendente/);
 assert.match(s,/out\.erpSynced/);
});
test('PWA força novo JS e invalida cache antigo',()=>{
 assert.match(p('index.html'),/app\.js\?v=24/);
 assert.match(p('sw.js'),/caseirinho-insights-app-shell-v24/);
 assert.match(p('sw.js'),/app\.js\?v=24/);
});
