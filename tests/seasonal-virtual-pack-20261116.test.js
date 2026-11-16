'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(__dirname,'../central-caseirinho-insights');
const admin=fs.readFileSync(path.join(dir,'seasonal-merch-admin.js'),'utf8');
const ui=fs.readFileSync(path.join(dir,'seasonal-best-deal-admin.js'),'utf8');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(dir,'sw.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'season-virtual-packs.css'),'utf8');
const start=admin.indexOf('function seasonMerchPackPool(){');
const end=admin.indexOf('function seasonMerchRefreshSelectors(){',start);
const poolCode=admin.slice(start,end);
function pool(data){
 return new Function('st','seasonMerchCurrent',poolCode+'\nreturn seasonMerchPackPool();')({seasonData:data},()=>data.campaigns[0].id);
}
test('Pack Virtual lista produtos ativos do catálogo mesmo antes de entrar na campanha',()=>{
 const selected=pool({
  campaigns:[{id:'natal',products:[{id:'frango'}]}],
  products:[{id:'frango',name:'Empada de Frango',price:9.99},{id:'palmito',name:'Empada de Palmito',price:11.99}],
  exclusiveProducts:[{id:'camarao',campaignId:'natal',name:'Camarão',active:true,published:true,price:11.99}]
 });
 assert.equal(selected.length,3);
 assert.equal(selected.find(x=>x.id==='frango').inCampaign,true);
 assert.equal(selected.find(x=>x.id==='palmito').inCampaign,false);
 assert.equal(selected.find(x=>x.id==='camarao').exclusive,true);
});
test('Editor valida pelo menos dois SKUs e total abaixo do preço da combinação mais barata',()=>{
 assert.match(admin,/body\.productIds\.length<2/);
 assert.match(admin,/Math\.round\(body\.price\*100\)>=min\*body\.quantity/);
 assert.match(admin,/entrar na campanha|Entrará na encomenda/);
 assert.match(ui,/const guarantee=valid&&lowest>0&&offer<minRetail/);
 assert.match(ui,/seasonPackSelected=new Set\(chosen\.map/);
 assert.match(ui,/47\.99/);
});
test('Central inclui botão direto Pack Virtual na área de encomendas',()=>{
 assert.match(ui,/seasonVirtualPackLaunch/);
 assert.match(ui,/seasonVirtualPackOpen/);
 assert.match(ui,/merch\.insertAdjacentElement\('beforebegin',feature\)/);
 assert.match(html,/data-season-merch-tab="pack">🎁 Pack Virtual/);
 assert.match(html,/preço total/i);
 assert.match(html,/season-virtual-packs\.css/);
 assert.match(sw,/caseirinho-insights-app-shell-v63-virtual-packs/);
 assert.match(css,/season-virtual-launch/);
 assert.doesNotThrow(()=>new Function(ui));
 assert.doesNotThrow(()=>new Function(admin));
});
