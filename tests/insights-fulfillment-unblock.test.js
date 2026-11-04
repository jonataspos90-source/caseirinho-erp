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
 const html=p('index.html'),sw=p('sw.js');
 const version=html.match(/app\.js\?v=(\d+)/)?.[1];
 assert.ok(Number(version)>=24);
 assert.ok(sw.includes('caseirinho-insights-app-shell-v31'));
 assert.ok(sw.includes('app.js?v='+version));
});
