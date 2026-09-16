const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const multi=fs.readFileSync('multiempresa-v8-12-0.js','utf8');
const panel=fs.readFileSync('platform-admin-v8-12-0.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const stability=fs.readFileSync('production-stability-v8-10-5.js','utf8');

test('V8.14 mantém namespace por tenant',()=>{assert.match(multi,/john:\$\{slug\}:\$\{key\}/);assert.match(multi,/Storage\.prototype\.getItem/)});
test('Modo Suporte usa fragmento e sessão assinada',()=>{assert.match(multi,/john-support/);assert.match(multi,/supportPayload\?\.support===true/);assert.match(panel,/u\.hash='john-support='/);assert.match(panel,/support-session/)});
test('painel usa sessão ERP e não contém PLATFORM_ADMIN_KEY',()=>{assert.match(panel,/cloudToken/);assert.match(panel,/Authorization':'Bearer '/);assert.doesNotMatch(panel,/PLATFORM_ADMIN_KEY/);assert.doesNotMatch(panel,/X-John-Platform-Key/)});
test('painel administra criar editar suspender ativar e suporte',()=>{assert.match(panel,/Nova empresa/);assert.match(panel,/Editar empresa/);assert.match(panel,/suspend/);assert.match(panel,/activate/);assert.match(panel,/supportEnter/)});
test('módulos da policy são aplicados à navegação',()=>{assert.match(multi,/MODULE_MATCHERS/);assert.match(multi,/applyTenantPolicy/);assert.match(multi,/johnModuleAllowed/)});
test('service worker atual preserva multiempresa e painel consolidado',()=>{assert.match(sw,/multiempresa-v8-12-0\.js\?v=8222/);assert.match(sw,/platform-admin-v8-12-0\.js\?v=8222/);assert.match(sw,/john-erp-pwa-v8\.22\.2-central-only/)});
test('estabilidade existente permanece e possui fallback dos módulos',()=>{assert.match(stability,/stabilizeOrdersTable/);assert.match(stability,/ensureMultiempresa/);assert.match(stability,/ensurePlatformOwner/)});
test('cliente não recebe tela pública de token de ativação',()=>{assert.doesNotMatch(multi,/Primeiro acesso da empresa/);assert.doesNotMatch(multi,/johnBootToken/);assert.doesNotMatch(multi,/Ativar empresa e criar MASTER/);assert.match(multi,/Empresa ainda não liberada/)});
test('URL sem empresa não reutiliza a última empresa visitada',()=>{assert.match(multi,/const tenantSlug=fromUrl\|\|'caseirinho'/);assert.doesNotMatch(multi,/fromUrl\|\|remembered\|\|legacySlug/)});
test('manifesto ERP preserva tenant no start_url',()=>{assert.match(multi,/function applyTenantManifest/);assert.match(multi,/start_url:`\.\/\?empresa=/)});
test('painel exibe links exclusivos de ERP e Loja',()=>{assert.match(panel,/ERP_PUBLIC_BASE/);assert.match(panel,/STORE_PUBLIC_BASE/);assert.match(panel,/Copiar ERP/);assert.match(panel,/Copiar Loja/);assert.match(panel,/john-'\+base/)});
test('painel reexecuta descoberta após login da sessão',()=>{assert.match(panel,/john:session-ready/);assert.match(multi,/john:session-ready/)});
test('login não permite trocar empresa manualmente ou ativar tenant por token',()=>{assert.match(multi,/link exclusivo/);assert.doesNotMatch(multi,/johnChangeTenant/);assert.doesNotMatch(multi,/createMaster/);assert.doesNotMatch(multi,/bootstrap\/master/)});
