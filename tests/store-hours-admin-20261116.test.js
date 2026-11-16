'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'../central-caseirinho-insights');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const index=read('index.html'),admin=read('store-hours-admin.js'),app=read('app.js'),sw=read('sw.js'),css=read('store-hours-admin.css');
test('Central disponibiliza dias, turnos, feriados e salvar na loja',()=>{
 assert.match(index,/id="storeHoursSettings"/);
 assert.match(index,/id="storeHoursDays"/);
 assert.match(index,/id="storeHoursExceptions"/);
 assert.match(index,/id="storeHoursExceptionDate"/);
 assert.match(index,/id="storeHoursMessage"/);
 assert.match(index,/id="storeHoursSave"/);
 assert.match(index,/data-view="settings"/);
});
test('Formulário é validado antes de publicar e utiliza API com login ERP',()=>{
 assert.doesNotThrow(()=>new Function(admin));
 assert.match(admin,/B\(\)\.api\('operating-hours',\{method:'PUT',body:\{horariosSemana:schedule\}\}\)/);
 assert.match(admin,/async function load\(force=false\)/);
 assert.match(admin,/const dias=readDays\(\)/);
 assert.match(admin,/os períodos de atendimento estão sobrepostos/);
 assert.match(app,/window\.CaseirinhoHoursBridge=\{api,E,toast,st\}/);
 assert.match(app,/CaseirinhoStoreHoursAdmin\?\.load/);
});
test('PWA publica nova tela de horários sem misturar credenciais no HTML',()=>{
 assert.match(index,/store-hours-admin\.js\?v=20261116-2/);
 assert.match(index,/store-hours-admin\.css/);
 assert.match(sw,/caseirinho-insights-app-shell-v62-virtual-packs/);
 assert.match(sw,/store-hours-admin\.js\?v=20261116-2/);
 assert.match(css,/store-hours-days/);
 assert.ok(!index.includes('Bearer '));
});
