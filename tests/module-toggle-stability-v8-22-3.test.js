const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const central=fs.readFileSync('central-modules-hotfix-v8-22-2.js','utf8');
const next=fs.readFileSync('john-next-v8-17.js','utf8');

test('Central não re-renderiza a grade a cada clique em módulo ou função',()=>{
  assert.match(central,/function hubNeedsRefresh\(\)/);
  assert.match(central,/if\(hubNeedsRefresh\(\)\)window\.johnNext\?\.renderHub\?\.\(\)/);
  assert.doesNotMatch(central,/#johnNextHub,\.nav/);
  assert.match(central,/\.jn-side-home,#jnHomeBtn/);
});

test('estado aberto e fechado dos módulos sobrevive a re-renderizações',()=>{
  assert.match(next,/const hadCards=!!hub\.querySelector\('\.jn-module-card'\)/);
  assert.match(next,/const openGroups=new Set/);
  assert.match(next,/const shouldOpen=\(g,i\)=>hadCards\?openGroups\.has\(g\.id\):i<2/);
  assert.match(next,/syncExpandLabel/);
});
