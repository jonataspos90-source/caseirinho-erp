const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const media=fs.readFileSync('strict-media-upload-v8-22-5.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('foto do produto só é aceita após persistência na API',()=>{
  assert.match(media,/\/api\/v1\/admin\/store\/media/);
  assert.match(media,/if\(!url\)throw new Error\('A API não retornou uma URL pública para a imagem\.'\)/);
  assert.match(media,/if\(!imageState\.includes\(url\)\)imageState\.push\(url\)/);
  assert.doesNotMatch(media,/url\s*=\s*response\?\.url\s*\|\|\s*dataUrl/);
  assert.doesNotMatch(media,/imageState\.push\(dataUrl\)/);
});

test('falha de upload não cria fallback local silencioso',()=>{
  assert.match(media,/Nenhuma imagem local foi usada/);
  assert.match(media,/A foto não foi salva/);
  assert.match(media,/stopImmediatePropagation\(\)/);
});

test('PWA continua injetando o upload estrito no ERP nas versões posteriores',()=>{
  assert.match(sw,/strict-media-upload-v8-22-5\.js/);
  assert.match(sw,/const CACHE='john-erp-pwa-v8\.22\.\d+[-\w]*'/);
  assert.match(sw,/injectBefore\(html,'strict-media-upload-v8-22-5\.js',STRICT_MEDIA_TAG\)/);
});
