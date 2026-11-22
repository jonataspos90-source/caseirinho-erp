'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','central-caseirinho-insights');
test('Central libera seleção Black Friday mesmo quando o Pack já está ativo',()=>{
 const js=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(js,/const blocked=p\.hasOtherPromotion,status=bfState\(p\)/);
 assert.match(js,/p\.hasPack\?'?<span/);
 assert.match(html,/Black Friday prevalece durante a vigência/);
 assert.match(html,/Pack volta automaticamente/);
});
test('PWA da Central publica nova versão sem usar app.js antigo do cache',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
 assert.match(html,/app\.js\?v=20261122-bf-pack-priority1/);
 assert.match(sw,/app\.js\?v=20261122-bf-pack-priority1/);
});