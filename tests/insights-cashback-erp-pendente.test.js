'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('central-caseirinho-insights/cashback-pending-erp.js','utf8');
const html=fs.readFileSync('central-caseirinho-insights/index.html','utf8');
const sw=fs.readFileSync('central-caseirinho-insights/sw.js','utf8');
test('PWA mantém app.js v30 e carrega patch seguro com cache v31',()=>{
 assert.match(html,/app\.js\?v=30/);
 assert.match(html,/cashback-pending-erp\.js\?v=1/);
 assert.match(sw,/caseirinho-insights-app-shell-v31/);
 assert.match(sw,/cashback-pending-erp\.js\?v=1/);
 assert.doesNotThrow(()=>new vm.Script(source));
});
test('modal de cashback permite decisão quando API confirma reserva ERP',async()=>{
 const rule={canPreApprove:true,canApprove:false,approvalPendingERP:true,erpPending:true,erpLinked:true,integration:'IMPORTANDO',approval:'PENDENTE'};
 const content={messages:[],prepend(x){this.messages.push(x.textContent)},appendChild(x){this.messages.push(x.textContent)},querySelector(){return null}};
 let oldDecisionSeen=false,oldSaveSeen=false,modals=0;
 const context={
  quickCashbackOrder:async()=>{assert.equal(rule.canApprove,true);oldDecisionSeen=true;},
  quickSaveCashback:async()=>{assert.equal(rule.canApprove,true);oldSaveSeen=true;},
  quickFinishOrder:()=>{},
  fulfillStatus:()=>rule,
  document:{getElementById:()=>content,createElement:()=>({dataset:{},setAttribute(){}}),addEventListener(){}},
  modal:()=>{modals++},toast(){},window:{confirm:()=>false}
 };
 vm.runInNewContext(source,context);
 await context.quickCashbackOrder('WEB-TESTE');
 assert.equal(oldDecisionSeen,true);
 assert.equal(rule.canApprove,false);
 assert.match(content.messages.join(' '),/pode APROVAR o cashback agora/);
 assert.match(content.messages.join(' '),/Reconciliar integração ERP/);
 await context.quickSaveCashback('WEB-TESTE');
 assert.equal(oldSaveSeen,true);
 assert.equal(rule.canApprove,false);
 rule.approval='APROVADO';
 context.quickFinishOrder('WEB-TESTE');
 assert.equal(modals,1);
});
test('não altera elegibilidade de pedidos sem reserva ERP',async()=>{
 const rule={canPreApprove:false,canApprove:false,approvalPendingERP:false,erpPending:true,erpLinked:false,integration:'PENDENTE',approval:'PENDENTE'};
 let decisions=0;
 const context={quickCashbackOrder:async()=>{decisions++},quickSaveCashback:async()=>{},quickFinishOrder:()=>{},
  fulfillStatus:()=>rule,document:{getElementById:()=>null,createElement:()=>({dataset:{}}),addEventListener(){}},
  modal(){},toast(){},window:{confirm:()=>false}};
 vm.runInNewContext(source,context);
 await context.quickCashbackOrder('WEB-SEM-RESERVA');
 assert.equal(decisions,1);assert.equal(rule.canApprove,false);
});
