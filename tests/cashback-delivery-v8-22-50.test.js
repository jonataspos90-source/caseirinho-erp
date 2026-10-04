'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('cashback-visibility-hotfix-v8-22-43.js','utf8');

test('cashback começa em 03/10/2026 no horário de São Paulo',()=>{
  const code=src.slice(src.indexOf('function cashbackDateEligible('),src.indexOf('function ensureTab(){'));
  const eligible=new Function('S',code+'return cashbackDateEligible;')(v=>String(v??''));
  assert.equal(eligible({createdAt:'2026-10-03T02:59:59Z'}),false);
  assert.equal(eligible({createdAt:'2026-10-03T03:00:00Z'}),true);
  assert.equal(eligible({createdAt:'2026-10-02'}),false);
  assert.equal(eligible({createdAt:'2026-10-03'}),true);
  assert.equal(eligible({}),false);
  assert.equal(eligible({createdAt:'2026-10-04',cashbackEligible:false}),false);
});

test('Pedidos / Entregas abre sua própria página e esconde registro de vendas',()=>{
  const code=src.slice(src.indexOf('function openDeliveryPage(){'),src.indexOf('function cashbackDateEligible('));
  const pages=[{},{}];
  pages.forEach(p=>{p.classList={add:()=>p.hidden=true,remove:()=>p.hidden=false};p.scrollIntoView=()=>{};});
  const document={querySelectorAll:()=>pages,getElementById:id=>id==='pedidosEntregas'?pages[1]:{},body:{dataset:{}}};
  let loads=0;
  new Function('document','ensureSalesDeliveryPanel','loadDeliveryOrders',code+'openDeliveryPage();')(document,()=>{},()=>loads++);
  assert.equal(pages[0].hidden,true);
  assert.equal(pages[1].hidden,false);
  assert.equal(loads,1);
});
