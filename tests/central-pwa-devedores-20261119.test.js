'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root=path.resolve(__dirname,'..','central-caseirinho-insights');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
test('PWA da Central tem escopo relativo e ícones PNG instaláveis',()=>{
 const m=JSON.parse(read('manifest.webmanifest'));
 assert.equal(m.start_url,'./');
 assert.equal(m.scope,'./');
 for(const px of [192,512]){
  assert.ok(m.icons.some(i=>i.sizes===px+'x'+px && i.type==='image/png'));
 }
 for(const icon of m.icons){if(icon.src.startsWith('./'))assert.ok(fs.existsSync(path.join(root,icon.src)),'Ícone ausente: '+icon.src);}
});
test('Scripts referenciados pela Central existem no repositório',()=>{
 const html=read('index.html');
 for(const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)){
  const local=m[1].split('?')[0];
  if(local.startsWith('./'))assert.ok(fs.existsSync(path.join(root,local)),'Script ausente: '+local);
 }
 assert.match(html,/id="debtRefresh"/);
 assert.match(html,/devedores\.js/);
});
test('Service worker preserva privacidade e não quebra instalação por arquivo opcional',()=>{
 const sw=read('sw.js');
 assert.match(sw,/Promise\.allSettled/);
 assert.match(sw,/request\.mode === 'navigate'/);
 assert.match(sw,/url\.origin !== self\.location\.origin/);
 assert.match(sw,/api\|auth\|admin/);
 assert.match(sw,/devedores\.js/);
});
test('Encomendas podem ser abertas sem modificar pagamento',()=>{
 const app=read('app.js');
 assert.match(app,/function seasonOrderDetails\(/);
 assert.match(app,/data-season-details/);
 assert.match(app,/data-season-order-card/);
 assert.match(app,/data-season-edit/);
 assert.match(app,/Pedidos disponíveis/);
});
test('Relatório filtra saldos conciliados e não envia WhatsApp automaticamente',()=>{
 const code=read('devedores.js');
 assert.match(code,/filter:'OPEN'/);
 assert.match(code,/order\.reconciled !== true/);
 assert.match(code,/order\.completed/);
 assert.match(code,/onlinePending/);
 assert.match(code,/wa\.me/);
 assert.doesNotMatch(code,/fetch\('https:\/\/wa\.me/);
});
