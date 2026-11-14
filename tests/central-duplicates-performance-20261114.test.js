'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const main=fs.readFileSync(path.join(__dirname,'../central-caseirinho-insights/app.js'),'utf8');
const index=fs.readFileSync(path.join(__dirname,'../central-caseirinho-insights/index.html'),'utf8');
const sw=fs.readFileSync(path.join(__dirname,'../central-caseirinho-insights/sw.js'),'utf8');
const cut=main.slice(main.indexOf('let duplicateOrdersSource='),main.indexOf('function renderOrders(){'));
const detector=new Function('s','n',cut+'\nreturn suspectedDuplicateOrders')(
 v=>String(v??''),v=>Number(v)||0
);
test('central identifica compras antigas repetidas em um minuto sem apagar pedidos',()=>{
 const item=[{name:'Nhoque Recheado',quantity:2}];
 const rows=[
 {code:'100033',phone:'(11) 99999-9999',items:item,total:59.98,status:'ACEITO',created_at:'2026-11-13T17:38:00.000Z'},
 {code:'100034',phone:'11999999999',items:item,total:59.98,status:'ACEITO',created_at:'2026-11-13T17:39:00.000Z'}
 ];
 const duplicates=detector(rows);
 assert.equal(duplicates.get('100034'),'100033');
 assert.equal(duplicates.has('100033'),false);
 assert.equal(rows.length,2);
});
test('central não confunde clientes, itens e compras de outro dia',()=>{
 const rows=[
 {code:'1',phone:'11999999999',total:9,items:[{name:'Empada',quantity:1}],created_at:'2026-11-13T17:38:00.000Z'},
 {code:'2',phone:'11888888888',total:9,items:[{name:'Empada',quantity:1}],created_at:'2026-11-13T17:39:00.000Z'},
 {code:'3',phone:'11999999999',total:9,items:[{name:'Panqueca',quantity:1}],created_at:'2026-11-13T17:40:00.000Z'},
 {code:'4',phone:'11999999999',total:9,items:[{name:'Empada',quantity:1}],created_at:'2026-11-14T17:38:00.000Z'}
 ];
 assert.equal(detector(rows).size,0);
});
test('limita cartões montados na tela mobile, não a busca no histórico',()=>{
 assert.match(main,/const visibleRows=rows\.slice\(0,80\)/);
 assert.match(main,/st\.orders\.filter/);
 assert.match(main,/suspectedDuplicateOrders\(st\.orders\)/);
 assert.match(main,/setInterval\(\(\)=>\{if\(document\.visibilityState!=='hidden'\)loadAll\(\);\},300000\)/);
 assert.match(index,/app\.js\?v=20261114-duplicates-fast-1/);
 assert.match(sw,/caseirinho-insights-app-shell-v58-duplicate-fast/);
});
