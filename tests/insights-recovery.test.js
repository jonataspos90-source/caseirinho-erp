'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=x=>fs.readFileSync('central-caseirinho-insights/'+x,'utf8');
test('recuperação manual só aparece para importação de pedido aceito',()=>{
 const s=read('operations-recovery.js');
 assert.match(s,/cells\[1\]\.textContent\.trim\(\)!=='ACEITO'/);
 assert.match(s,/cells\[2\]\.textContent\.trim\(\)!=='IMPORTANDO'/);
 assert.match(s,/age<10/);
 assert.match(s,/dryRun:true/);
 assert.match(s,/confirmationCode:code/);
 assert.match(s,/typed!==code/);
});
test('PWA carrega atualização sem expor credencial em URL',()=>{
 const html=read('index.html'),sw=read('sw.js');
 assert.match(html,/operations-recovery\.js\?v=1/);
 assert.match(sw,/operations-recovery\.js\?v=1/);
 assert.doesNotMatch(read('operations-recovery.js'),/localStorage\.setItem\(.*token/);
});
