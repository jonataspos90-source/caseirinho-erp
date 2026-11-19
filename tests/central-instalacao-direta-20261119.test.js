'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..','central-caseirinho-insights');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
test('tela de login tem botão interno de instalação acessível sem autenticação',()=>{
 const html=read('index.html');
 const login=html.indexOf('id="loginScreen"');
 const button=html.indexOf('id="installAppLogin"');
 const layout=html.indexOf('class="layout"');
 assert.ok(login>=0 && button>login && button<layout);
 assert.match(html,/id="installAppLogin"[^>]*>📲 Instalar Central Caseirinho/);
 assert.match(html,/id="installAppMain"[^>]*>📲 Instalar Central Caseirinho/);
});
test('instalação usa prompt nativo quando oferecido e tem alternativa informativa',()=>{
 const app=read('app.js');
 assert.doesNotThrow(()=>new Function(app));
 assert.match(app,/beforeinstallprompt/);
 assert.match(app,/await event\.prompt\(\)/);
 assert.match(app,/await event\.userChoice/);
 assert.match(app,/for\(const id of \['installAppMain','installAppLogin'\]\)/);
 assert.match(app,/appinstalled/);
 assert.match(app,/showInstallSteps/);
 assert.match(app,/refreshInstallControls/);
});
test('manifest instala o app certo no escopo da Central',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.short_name,'Central Caseirinho');
 assert.equal(manifest.start_url,'./');
 assert.equal(manifest.scope,'./');
 assert.equal(manifest.display,'standalone');
 assert.ok(manifest.icons.some(icon=>icon.type==='image/png'&&icon.sizes==='192x192'));
 assert.ok(manifest.icons.some(icon=>icon.type==='image/png'&&icon.sizes==='512x512'));
});
test('versões de app, estilo e manifesto estão sincronizadas com o SW',()=>{
 const html=read('index.html'),sw=read('sw.js'),css=read('styles.css');
 assert.doesNotThrow(()=>new Function(sw));
 for(const name of ['app.js','styles.css','manifest.webmanifest']){
  const found=html.match(new RegExp('\\./'+name.replace(/\./g,'\\.')+'\\?v=[\\w-]+'));
  assert.ok(found,'HTML deve referenciar '+name+' com versão');
  assert.ok(sw.includes(found[0]),'Service worker '+found[0]);
 }
 assert.match(css,/\.install-login-panel/);
 assert.match(css,/\.install-login-button/);
});
