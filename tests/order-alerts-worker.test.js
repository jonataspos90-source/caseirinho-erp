const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('push é mostrado sem janela aberta e clique fica restrito ao ERP',async()=>{
  const handlers={},shown=[],opened=[];
  const self={registration:{scope:'https://example.test/caseirinho-erp/',showNotification:async(t,o)=>shown.push({t,o})},
    addEventListener:(n,fn)=>handlers[n]=fn,clients:{matchAll:async()=>[],openWindow:async u=>opened.push(u)}};
  vm.runInNewContext(fs.readFileSync('order-alerts-worker.js','utf8'),{self,URL});
  let task;
  handlers.push({data:{json:()=>({title:'Novo pedido',body:'Confira no ERP',url:'https://evil.test/',orderId:'123',tag:'pedido-123'})},waitUntil:p=>task=p});
  await task;assert.equal(shown.length,1);assert.equal(shown[0].o.data.url,'https://example.test/caseirinho-erp/');
  handlers.notificationclick({notification:{data:shown[0].o.data,close:()=>{}},waitUntil:p=>task=p});
  await task;assert.deepEqual(opened,['https://example.test/caseirinho-erp/']);
});
