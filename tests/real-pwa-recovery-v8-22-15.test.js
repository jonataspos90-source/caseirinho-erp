const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path='Caseirinho_ERP_PWA_V7_GitHub_Pages (1)/production-recovery-v8-22-15.js';
const sw=fs.readFileSync('Caseirinho_ERP_PWA_V7_GitHub_Pages (1)/service-worker.js','utf8');
const code=fs.readFileSync(path,'utf8');

function env(){
 const mem=new Map();
 const localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k),key:i=>[...mem.keys()][i]||null,get length(){return mem.size}};
 const writes=[];
 const child={document:{write:s=>writes.push(String(s)),close(){}}};
 const listeners={};
 const window={localStorage,__johnLocalStorage:localStorage,open:()=>child,dispatchEvent(){},addEventListener(){},JohnQRCodeSvg:(v)=>'<svg data-value="'+v+'"></svg>'};
 const document={readyState:'complete',addEventListener(){}};
 const ctx={window,localStorage,document,console,setTimeout:(fn)=>{fn();return 1},setInterval:()=>1,clearInterval(){},CustomEvent:function(n,o){this.type=n;this.detail=o?.detail}};
 window.window=window;window.document=document;ctx.globalThis=ctx;
 return{ctx,mem,writes,child};
}

test('service worker real carrega patch V8.22.15 e troca cache antigo',()=>{
 assert.match(sw,/john-erp-pwa-v8\.22\.15-real-recovery/);
 assert.match(sw,/production-recovery-v8-22-15\.js/);
 assert.match(sw,/self\.skipWaiting\(\)/);
 assert.match(sw,/injectRecovery/);
});

test('recupera Pedido 102 do backup pré-ativação sem duplicar',()=>{
 const e=env();
 const ativo={pedidos:[{id:'p101',numero:101}],pessoas:[],lojas:[{id:'l1',padrao:'SIM',status:'ATIVA',pix:{chave:'38824690807',nome:'JONATAS'}}]};
 const backup={pedidos:[{id:'p102',numero:102,clienteId:'c1',cliente:'Vagner - Dono da Casa',formaPagamento:'PIX',valorTotal:85.96}],pessoas:[{id:'c1',nome:'Vagner - Dono da Casa'}]};
 e.mem.set('pcp_app_v1',JSON.stringify(ativo));e.mem.set('john_public_pre_activation_backup_v1',JSON.stringify(backup));
 e.ctx.db=ativo;e.ctx.window.db=ativo;
 vm.runInNewContext(code,e.ctx);
 const saved=JSON.parse(e.mem.get('pcp_app_v1'));
 assert.equal(saved.pedidos.filter(p=>p.numero===102).length,1);
 assert.equal(saved.pedidos.find(p=>p.numero===102).cliente,'Vagner - Dono da Casa');
 assert.equal(saved.pessoas.some(p=>p.id==='c1'),true);
 e.ctx.window.JohnRealPwaRecovery82215.mergeBackupOrders();
 const saved2=JSON.parse(e.mem.get('pcp_app_v1'));
 assert.equal(saved2.pedidos.filter(p=>p.numero===102).length,1);
});

test('HTML real de pedido PIX recebe chave do Cadastro da Loja na about:blank',()=>{
 const e=env();
 const ativo={pedidos:[{id:'p102',numero:102,formaPagamento:'PIX'}],pessoas:[],lojas:[{id:'l1',padrao:'SIM',status:'ATIVA',pix:{chave:'38824690807',nome:'JONATAS GARCIA',cidade:'SAO PAULO'}}]};
 e.mem.set('pcp_app_v1',JSON.stringify(ativo));e.ctx.db=ativo;e.ctx.window.db=ativo;
 vm.runInNewContext(code,e.ctx);
 const html='<!doctype html><html><body><div class="page"><h1>Pedido nº 000102</h1><b>Forma de pagamento:</b> PIX<div class="obs">Observações: -</div><div class="footer">Documento de pedido emitido em formato A4. QR Code criado localmente pelo ERP.</div></div></body></html>';
 const w=e.ctx.window.open('','_blank');w.document.write(html);
 const out=e.writes.join('');
 assert.match(out,/johnPixReal82215/);
 assert.match(out,/Chave PIX/);
 assert.match(out,/38824690807/);
 assert.match(out,/JONATAS GARCIA/);
 assert.match(out,/<svg/);
});
