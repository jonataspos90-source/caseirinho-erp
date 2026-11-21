'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const errors=[];
 try{
  const context=await browser.newContext({viewport:{width:390,height:840},isMobile:true,deviceScaleFactor:1});
  const page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  const external=[];
  page.on('request',req=>{const u=req.url();if(/\/api\/v1\/|\/orders|\/checkout|mercadopago/i.test(u))external.push(u)});
  await page.goto('http://127.0.0.1:8080/lojas/cosmeticos/',{waitUntil:'domcontentloaded'});
  await page.locator('#beautyIdentity').waitFor({state:'visible'});
  assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('beauty-locked')),true);
  assert.equal(await page.locator('#beautyPixDemo').count(),1);
  await page.locator('#beautyName').fill('Cliente Teste');
  await page.locator('#beautyPhone').fill('11987654321');
  await page.locator('#beautyForm button[type=submit]').click();
  assert.match(await page.locator('#beautyIdentityStatus').textContent(),/Política de Privacidade/);
  await page.locator('#beautyConsent').check();
  await page.locator('#beautyForm button[type=submit]').click();
  await page.locator('#beautyIdentity').waitFor({state:'hidden'});
  assert.equal(await page.locator('body').evaluate(e=>e.classList.contains('beauty-locked')),false);
  await page.locator('#tabs [data-page=catalogo]').click();
  await page.locator('#products .product').first().waitFor({state:'visible'});
  assert.ok(await page.locator('#products .product-image svg').count()>=5,'Produtos devem usar fotos/arte de catálogo no lugar de emojis');
  await page.locator('#products .product').first().click();
  await page.locator('#detail').waitFor({state:'visible'});
  await page.locator('#detailClose').click();
  await page.locator('[data-beauty-pix]').click();
  await page.locator('#beautyPixDemo').waitFor({state:'visible'});
  assert.equal(await page.locator('#beautyPixDemo .pix-demo-disabled').isDisabled(),true);
  assert.match(await page.locator('#beautyPixDemo').textContent(),/Nenhum PIX é gerado ou cobrado/);
  await page.locator('#beautyPixDemo [data-close-pix]').click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#beautyIdentity').waitFor({state:'hidden'});
  await page.locator('#tabs [data-page="inicio"]').click();
  for(const width of [320,360,390,430,700,768,1024,1280]){
    await page.setViewportSize({width,height:844});
    const size=await page.evaluate(()=>{
      const bounds=selector=>{
        const e=document.querySelector(selector);
        if(!e)return null;
        const r=e.getBoundingClientRect();
        return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height,visible:r.width>0&&r.height>0};
      };
      const css=e=>getComputedStyle(document.querySelector(e));
      return{
        viewWidth:window.innerWidth,
        scrollWidth:document.documentElement.scrollWidth,
        header:bounds('.header'),
        brand:bounds('.brand'),
        cart:bounds('.headright .cart'),
        toolbar:bounds('.beauty-header-tools'),
        hero:bounds('.hero'),
        headingFont:parseFloat(css('.hero h1').fontSize),
        categoryColumns:css('.categories').gridTemplateColumns.split(' ').length,
        pix:bounds('[data-beauty-pix]'),
        data:bounds('#beautyUser')
      };
    });
    assert.ok(size.scrollWidth<=width+2,'Horizontal overflow at '+width+'px: '+JSON.stringify(size));
    if(width<=700){
      assert.ok(size.header.height<=175,'Header too tall at '+width+'px: '+size.header.height);
      assert.ok(size.hero.height<=355,'Hero too tall at '+width+'px: '+size.hero.height);
      assert.ok(size.headingFont<=39,'Hero headline too large at '+width+'px: '+size.headingFont);
      assert.equal(size.categoryColumns,3,'Categories must have 3 columns at '+width+'px');
      assert.ok(size.toolbar.top>=size.brand.bottom-2,'Actions must be on second row at '+width+'px');
      assert.ok(size.cart.top<size.toolbar.top,'Cart must stay by logo at '+width+'px');
      assert.ok(size.hero.right<=width+2&&size.hero.left>=-2,'Hero exits viewport at '+width+'px');
      for(const label of ['pix','data']){
        const b=size[label];
        assert.ok(b&&b.visible&&b.left>=-1&&b.right<=width+1,label+' action clipped at '+width+'px');
      }
    }
    console.log('PASS: responsive layout '+width+'px');
  }
  const manifest=await page.request.get('http://127.0.0.1:8080/lojas/cosmeticos/manifest.webmanifest');
  const data=await manifest.json();
  assert.equal(data.scope,'./');
  assert.ok(data.icons.some(x=>x.sizes==='192x192'));
  assert.ok(data.icons.some(x=>x.sizes==='512x512'));
  assert.deepEqual(external,[],'Prévia nunca envia pedido ou pagamento');
  assert.deepEqual(errors,[],'Nenhum erro de runtime JS');
  console.log('PASS: gate, identificação, produtos, modal, PIX sem cobrança, recarga, PWA independente');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
