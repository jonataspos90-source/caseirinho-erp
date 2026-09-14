const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const multi=fs.readFileSync('multiempresa-v8-12-0.js','utf8');
const index=fs.readFileSync('index.html','utf8');

test('token de dispositivo persiste no tenant até revogação',()=>{
  assert.match(multi,/authMode='DEVICE_TOKEN'/);
  assert.match(multi,/deviceTokenPersistent=true/);
  assert.match(multi,/persistedToken&&!looksSignedSession/);
});

test('403 funcional não apaga token do navegador',()=>{
  const marker="function forceActivation(msg)";
  const pos=index.indexOf(marker);
  assert.ok(pos>=0);
  const block=index.slice(pos,pos+2600);
  assert.match(block,/r\.status===401/);
  assert.doesNotMatch(block,/r\.status===401\|\|r\.status===403/);
  assert.match(block,/trulyRevoked/);
});

test('marcador de ativação é reconstruído se a credencial já existe',()=>{
  assert.match(index,/if\(c\.apiUrl&&c\.apiKey\)/);
  assert.match(index,/recovered:true/);
});
