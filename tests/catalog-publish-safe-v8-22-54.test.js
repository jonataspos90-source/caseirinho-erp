const test=require('node:test');
const assert=require('node:assert/strict');
const {sanitize}=require('../catalog-publish-safe-v8-22-54.js');

test('catalog sanitizer removes cycles and remains JSON serializable',()=>{
  const product={id:'900079',nome:'Talharim'};
  product.related=product;
  product.imagem='data:image/jpeg;base64,'+'x'.repeat(500000);
  const safe=sanitize({produtos:[product]});
  assert.equal(safe.produtos[0].id,'900079');
  assert.equal(safe.produtos[0].related,undefined);
  assert.equal(JSON.parse(JSON.stringify(safe)).produtos[0].imagem.length,500024);
});

test('catalog sanitizer bounds deeply nested optional values',()=>{
  const deep={leaf:true};
  let cursor=deep;
  for(let i=0;i<200;i++){cursor.child={};cursor=cursor.child}
  const safe=sanitize({catalog:deep});
  assert.doesNotThrow(()=>JSON.stringify(safe));
  let depth=0,node=safe.catalog;
  while(node?.child){depth++;node=node.child}
  assert.ok(depth<200);
});

test('shared objects are copied for each product instead of being dropped',()=>{
  const shared={url:'https://example.com/talharim.webp'};
  const safe=sanitize({imagem:shared,imagens:[shared]});
  assert.equal(safe.imagem.url,safe.imagens[0].url);
});
