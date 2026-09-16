const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const cx=fs.readFileSync('ecommerce-customer-experience-v8-13-0.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('fila não expõe editar excluir ou cancelar pedido',()=>{const actions=cx.slice(cx.indexOf('function actionHtml'),cx.indexOf('function freightHtml'));assert.doesNotMatch(actions,/Editar|Excluir|Cancelar pedido/);assert.doesNotMatch(actions,/data-cx-delete|data-cx-cancel/)});
test('cliente que aceitou novo frete recebe status próprio',()=>{assert.match(cx,/Cliente aceitou novo frete/);assert.match(cx,/AGUARDANDO_ACEITE_ERP/);assert.match(cx,/background:#cffafe/)});
test('frete aprovado mostra somente aceitar PDF e rejeitar',()=>{const actions=cx.slice(cx.indexOf('function actionHtml'),cx.indexOf('function freightHtml'));assert.match(actions,/if\(s==='AGUARDANDO_ACEITE_ERP'\).*data-cx-accept.*\$\{pdf\}.*data-cx-reject/s);assert.match(actions,/const pdf=.*data-cx-pdf/s)});
test('aceito rejeitado e cancelado ficam sem ações',()=>{const actions=cx.slice(cx.indexOf('function actionHtml'),cx.indexOf('function freightHtml'));assert.match(actions,/\['ACEITO','REJEITADO','CANCELADO'\]\.includes\(s\).*john-cx-no-action/s)});
test('enquanto cliente não respondeu ERP pode alterar cotação',()=>{const actions=cx.slice(cx.indexOf('function actionHtml'),cx.indexOf('function freightHtml'));assert.match(actions,/Alterar cotação/);assert.match(actions,/AGUARDANDO_CLIENTE_FRETE/)});
test('PDF continua disponível antes da decisão final',()=>{const actions=cx.slice(cx.indexOf('function actionHtml'),cx.indexOf('function freightHtml'));assert.match(actions,/data-cx-pdf/);assert.match(cx,/function printOrderPdf/)});
test('filtros completos existem',()=>{for(const s of ['johnCxFrom','johnCxTo','johnCxCustomer','johnCxModality','johnCxStatus','johnCxAction'])assert.match(cx,new RegExp(s))});
test('filtro de ações diferencia etapas',()=>{assert.match(cx,/function actionType/);for(const s of ['COTAR','AGUARDANDO_CLIENTE','DECIDIR','SEM_ACAO'])assert.match(cx,new RegExp(s))});
test('fila consulta lista autoritativa no servidor',()=>{assert.match(cx,/function pullServerOrders/);assert.match(cx,/\/api\/v1\/admin\/store\/orders\?status=TODOS&limit=1000/);assert.match(cx,/write\(INBOX_KEY/)});
test('horário de entrega continua fora da coluna ações',()=>{assert.match(cx,/customer-delivery-time/);assert.match(cx,/data-cx-time/)});
test('service worker injeta módulos consolidados no clean rebuild atual',()=>{assert.match(sw,/platform-admin-v8-12-0\.js/);assert.match(sw,/ecommerce-customer-experience-v8-13-0\.js/);assert.match(sw,/john-erp-pwa-v8\.22\.3-ui-catalog-sync/);assert.match(sw,/server-catalog-hydration-v8-19\.js/)});
test('V8.14 não usa observer/timers para corrigir a fila antiga',()=>{assert.doesNotMatch(cx,/function guardLegacyOrderActions/);assert.doesNotMatch(cx,/MutationObserver/);assert.match(cx,/johnEcommerceOrdersController/)});
test('status é decidido pela API e não por pedido local vinculado',()=>{const block=cx.slice(cx.indexOf('function state(o)'),cx.indexOf('function stateLabel'));assert.doesNotMatch(block,/linked\(o\.id\)/);assert.match(block,/AGUARDANDO_ACEITE_ERP/);assert.match(block,/AGUARDANDO_CLIENTE_FRETE/)});
test('rejeição é responsabilidade do controlador consolidado',()=>{assert.match(cx,/async function doReject/);assert.match(cx,/\/reject/);assert.doesNotMatch(cx,/function rejectFn/);assert.doesNotMatch(cx,/johnV83RejectOrder/)});
