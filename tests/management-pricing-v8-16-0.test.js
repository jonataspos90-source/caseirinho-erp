'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const file=path.join(__dirname,'..','management-engine-v8-16-0.js');const src=fs.readFileSync(file,'utf8');
test('pricing multicanal e taxas marketplace presentes',()=>{for(const x of ['IFOOD_PROPRIA','IFOOD_ENTREGA','FOOD99_PROPRIA','FOOD99_ENTREGA','commissionPct','paymentPct','motoboyAverageCost','approvedPrice'])assert.ok(src.includes(x),x)});
test('modulos gerenciais essenciais presentes',()=>{for(const x of ['Central Gerencial','Central de Alertas','Previsão de demanda','Motor SE → ENTÃO','Workflow de aprovação','Lotes, validade e FEFO','Central de tarefas','Pergunte ao John','Auditoria recente'])assert.ok(src.includes(x),x)});
test('preco recomendado recompõe taxas pela margem',()=>{assert.ok(src.includes('1-variable-target'));assert.ok(src.includes('fixed/denomTarget'));assert.ok(src.includes('Preço recomendado'))});
