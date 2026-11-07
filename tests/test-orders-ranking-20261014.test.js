'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','fechamento-periodico-v8-22-21.js'),'utf8');
const i=src.indexOf('function phoneIsTest('),j=src.indexOf('function renderHistory(){',i);
assert.ok(i>=0&&j>i,'Funções do relatório devem existir');
const utilities=src.slice(i,j);
function context(db){
  const state={inicio:'2026-10-01',fim:'2026-10-31',busca:'',ordem:'receita'};
  const ctx={
    S:v=>String(v??''),N:v=>Number(v)||0,A:v=>Array.isArray(v)?v:[],
    norm:v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase(),
    isCancelled:v=>/CANCEL|REJEIT|EXCLUID/i.test(String(v?.status||'')),
    ensureDb:()=>db,rankingState:state
  };
  vm.createContext(ctx);
  vm.runInContext(utilities,ctx);
  return ctx;
}
test('novo módulo permanece sintaticamente válido',()=>assert.doesNotThrow(()=>new vm.Script(src)));
test('telefone de Jonatas e prefixo internacional são teste',()=>{
  const c=context({pedidos:[],vendas:[],produtos:[]});
  assert.equal(c.phoneIsTest('(11) 98931-0929'),true);
  assert.equal(c.phoneIsTest('+55 11 98931-0929'),true);
  assert.equal(c.phoneIsTest('989310929'),true);
  assert.equal(c.phoneIsTest('(11) 98931-0920'),false);
});
test('venda vinculada por ID ou número a pedido teste fica excluída',()=>{
  const c=context({pedidos:[{id:'test-a',numero:122,telefone:'11989310929'}]});
  const index=c.makeTestIndex({pedidos:[{id:'test-a',numero:122,telefone:'11989310929'}]});
  assert.equal(c.isTestSale({origemPedidoId:'test-a'},index),true);
  assert.equal(c.isTestSale({pedidoNumero:122},index),true);
  assert.equal(c.isTestSale({pedidoNumero:123},index),false);
});
test('ranking soma somente vendas reais e calcula lucro bruto',()=>{
  const db={
    pedidos:[{id:'p-test',numero:7,telefone:'(11) 98931-0929'},{id:'p-ok',numero:8,telefone:'(11) 90000-0000'}],
    produtos:[{id:'prod1',nome:'Nhoque',custoInicial:0}],
    vendas:[
      {id:'v1',produtoId:'prod1',data:'2026-10-10',pedidoNumero:7,quantidade:1,total:19.99,cmv:2},
      {id:'v2',produtoId:'prod1',data:'2026-10-11',pedidoNumero:8,quantidade:2,total:30,cmv:10}
    ]
  };
  const c=context(db),r=c.rankingData();
  assert.equal(r.testes,1);
  assert.equal(r.rows.length,1);
  assert.equal(r.rows[0].quantidade,2);
  assert.equal(r.rows[0].receita,30);
  assert.equal(r.rows[0].custo,10);
  assert.equal(r.rows[0].lucro,20);
});
test('custo não cadastrado impede margem fictícia de 100%',()=>{
  const c=context({
    pedidos:[],produtos:[{id:'p',nome:'Pão'}],
    vendas:[{id:'v',produtoId:'p',data:'2026-10-11',quantidade:1,total:12.99,cmv:0,custoUnitario:0}]
  });
  const r=c.rankingData();
  assert.equal(r.total.semCusto,1);
  assert.equal(r.total.lucro,null);
  assert.equal(r.total.margem,null);
});
test('fechamento do período utiliza filtro anti-testes',()=>{
  assert.match(src,/function sumSales\(period\)\{const d=ensureDb\(\),testIndex=makeTestIndex\(d\)/);
  assert.match(src,/isTestSale\(x,testIndex\)/);
  assert.match(src,/data-fec-tab="ranking"/);
});
