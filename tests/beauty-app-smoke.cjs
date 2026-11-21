'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const origin='http://127.0.0.1:8080';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const context=await browser.newContext({viewport:{width:390,height:840},isMobile:true,deviceScaleFactor:1});
  const page=await context.newPage(),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',req=>{
   const url=req.url();
   if(/\/api\/v1\/|\/orders|\/checkout|mercadopago/i.test(url))external.push(url);
  });
  await page.goto(origin+'/lojas/cosmeticos/',{waitUntil:'domcontentloaded'});
  await page.locator('#beautyIdentity').waitFor({state:'visible'});
  assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('beauty-locked')),true);
  await page.locator('#beautyName').fill('Cliente Teste');
  await page.locator('#beautyPhone').fill('11987654321');
  await page.locator('#beautyForm button[type=submit]').click();
  assert.match(await page.locator('#beautyIdentityStatus').textContent(),/Política de Privacidade/);
  await page.locator('#beautyConsent').check();
  await page.locator('#beautyForm button[type=submit]').click();
  await page.locator('#beautyIdentity').waitFor({state:'hidden'});
  assert.equal(await page.locator('.demo').count(),0,'Não deve existir tarja de loja demonstrativa');
  assert.equal(await page.locator('[data-beauty-pix]').count(),0,'PIX não deve aparecer no topo');
  assert.equal(await page.locator('.headright #beautyUser').count(),0,'Dados devem ficar fora do topo');
  await page.locator('#tabs [data-page=catalogo]').click();
  await page.waitForFunction(()=>document.querySelector('#empty')?.textContent.includes('preparando nosso catálogo'));
  assert.equal(await page.locator('#products .product').count(),0,'Produtos ilustrativos não devem ser vendidos');
  await page.locator('#tabs [data-page=inicio]').click();
  assert.equal(await page.locator('#categories .category').count(),0,'Sem produtos vinculados, não deve mostrar categorias');
  await page.locator('#tabs [data-page=sobre]').click();
  assert.equal(await page.locator('#beautyUser').isVisible(),true,'Alterar cadastro deve ficar na seção Sobre');
  await page.locator('#tabs [data-page=inicio]').click();
  for(const width of [320,360,390,430,700,768,1024,1280]){
   await page.setViewportSize({width,height:844});
   const size=await page.evaluate(()=>{
    const bounds=selector=>{
     const e=document.querySelector(selector);if(!e)return null;
     const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,width:r.width,height:r.height,visible:r.width>0&&r.height>0};
    };
    return{scrollWidth:document.documentElement.scrollWidth,hero:bounds('.hero'),header:bounds('.header'),brand:bounds('.brand'),cart:bounds('.cart'),headingFont:parseFloat(getComputedStyle(document.querySelector('.hero h1')).fontSize)};
   });
   assert.ok(size.scrollWidth<=width+2,'Rolagem horizontal em '+width+'px: '+JSON.stringify(size));
   if(width<=700){
    assert.ok(size.header.height<=155,'Cabeçalho alto em '+width+'px: '+size.header.height);
    assert.ok(size.hero.height<=355,'Banner alto em '+width+'px: '+size.hero.height);
    assert.ok(size.headingFont<=39,'Título excessivo em '+width+'px');
    assert.ok(size.cart.right<=width+2,'Carrinho sai da tela');
   }
  }
  await page.setViewportSize({width:390,height:840});
  await page.evaluate(()=>{
   localStorage.setItem('john_beauty_central_catalog_v1',JSON.stringify({
    company:'beauty',companyName:'Sua Marca Beauty',categories:[
     {id:'maquiagem',name:'Maquiagem',icon:'💄',active:true},
     {id:'sem-produtos',name:'Sem produtos',icon:'🌷',active:true}
    ],
    products:[{id:'teste-1',name:'Batom Rosa',categoryId:'maquiagem',brand:'Beauty',description:'Batom de teste',
     icon:'💄',price:29.9,cost:15,stock:2,regularization:'VERIFICADO',active:true,published:true,lot:'A1',expiry:'2028-11-01'}]
   }));
  });
  await page.goto(origin+'/lojas/cosmeticos/?preview=central',{waitUntil:'domcontentloaded'});
  await page.locator('#beautyIdentity').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.querySelectorAll('#categories .category').length===1);
  assert.equal(await page.locator('#categories .category').count(),1,'Somente categorias com produto disponível');
  assert.equal(await page.locator('#categories .category').first().textContent(),'💄Maquiagem');
  await page.locator('#tabs [data-page=catalogo]').click();
  assert.equal(await page.locator('#products .product').count(),1);
  await page.locator('#products .product').click();
  await page.locator('#detail').waitFor({state:'visible'});
  await page.locator('#detailClose').click();
  const manifest=await page.request.get(origin+'/lojas/cosmeticos/manifest.webmanifest');
  const data=await manifest.json();
  assert.equal(data.scope,'./');
  assert.ok(data.icons.some(x=>x.sizes==='192x192'));
  assert.ok(data.icons.some(x=>x.sizes==='512x512'));
  assert.deepEqual(external,[],'Não deve criar pagamentos ou pedidos');
  assert.deepEqual(errors,[],'Sem erro JS no navegador');
  console.log('PASS: cadastro, cabeçalho limpo, catálogo vazio, categorias vinculadas, prévia local e 320–1280px');
  await context.close();
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
