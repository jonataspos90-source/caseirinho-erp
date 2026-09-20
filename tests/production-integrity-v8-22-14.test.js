const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=fs.readFileSync('production-integrity-v8-22-14.js','utf8');

function runtime(){
  const mem=new Map();
  const storage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
  const popup={html:'',document:{write(s){popup.html+=String(s)}}};
  let captures=0,flushes=0;
  const db={
    lojas:[{id:'L1',padrao:'SIM',status:'ATIVA',nome:'Loja Teste',cidade:'Ferraz de Vasconcelos',pix:{chave:'pix-teste@loja.com',nome:'Loja Teste',cidade:'FERRAZ DE VASCONCELOS'}}],
    pedidos:[{id:'P102',numero:102,status:'ABERTO',total:85.96,criadoEm:'2026-09-20T10:00:00-03:00'}],config:{}
  };
  const win={db,open(){return popup},addEventListener(){},dispatchEvent(){},johnCloudCapturarAlteracoes(){captures++},async johnCloudFlushIncremental(){flushes++},JohnTransactionPersistence82213:{refreshBackup(){},async reconcileCloud(){return false}}};
  const context={window:win,db,localStorage:storage,document:{readyState:'complete',addEventListener(){}},CustomEvent:function(type,init){this.type=type;this.detail=init?.detail},console,setTimeout(fn){fn();return 1},setInterval(){return 1},clearInterval(){}};
  vm.createContext(context);vm.runInContext(source,context);
  return{context,win,db,popup,mem,get captures(){return captures},get flushes(){return flushes}};
}

test('PDF de pedido PIX recebe a chave do Cadastro da Loja no HTML final',()=>{
  const r=runtime();
  const html='<!doctype html><body><h1>Pedido nº 000102</h1><div>Forma de pagamento: PIX</div><div>Observações: -</div></body>';
  const out=r.win.JohnProductionIntegrity82214.injectPix(html);
  assert.match(out,/johnPixAuthority82214/);
  assert.match(out,/Chave PIX:/);
  assert.match(out,/pix-teste@loja\.com/);
  assert.match(out,/Dados carregados do Cadastro da Loja/);
});

test('ponte de impressão intercepta about:blank e injeta PIX mesmo sem depender do gerador legado',()=>{
  const r=runtime();
  const w=r.win.open('','_blank');
  w.document.write('<!doctype html><body><h1>Pedido nº 000102</h1><p>Forma de pagamento: PIX</p><p>Observações: -</p></body>');
  assert.match(r.popup.html,/johnPixAuthority82214/);
  assert.match(r.popup.html,/pix-teste@loja\.com/);
});

test('novo último pedido é gravado imediatamente e enviado à sincronização de nuvem',async()=>{
  const r=runtime();
  r.db.pedidos.push({id:'P103',numero:103,status:'ABERTO',total:42.5,criadoEm:'2026-09-20T14:22:00-03:00'});
  await r.win.JohnProductionIntegrity82214.scanOrders(true);
  const persisted=JSON.parse(r.mem.get('pcp_app_v1'));
  assert.equal(persisted.pedidos.at(-1).numero,103);
  assert.ok(r.captures>=1,'captura incremental da nuvem deve ser acionada');
  assert.ok(r.flushes>=1,'flush incremental da nuvem deve ser acionado');
});

test('reload da base local preserva o pedido mais recente',async()=>{
  const r=runtime();
  r.db.pedidos.push({id:'P103',numero:103,status:'ABERTO',total:42.5,criadoEm:'2026-09-20T14:22:00-03:00'});
  await r.win.JohnProductionIntegrity82214.persistOrdersNow('test-reload');
  const reloaded=JSON.parse(r.mem.get('pcp_app_v1'));
  assert.deepEqual(reloaded.pedidos.map(x=>x.numero),[102,103]);
});
