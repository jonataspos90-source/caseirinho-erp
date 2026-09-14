const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const cx=fs.readFileSync('ecommerce-customer-experience-v8-13-0.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

test('fila não expõe editar excluir ou cancelar pedido',()=>{
  const actions=cx.slice(
    cx.indexOf('function actionHtml'),
    cx.indexOf('function freightHtml')
  );
  assert.doesNotMatch(actions,/Editar|Excluir|Cancelar pedido/);
  assert.doesNotMatch(actions,/data-cx-delete|data-cx-cancel/);
});

test('cliente que aceitou novo frete recebe status próprio',()=>{
  assert.match(cx,/Cliente aceitou novo frete/);
  assert.match(cx,/AGUARDANDO_ACEITE_ERP/);
  assert.match(cx,/background:#cffafe/);
});

test('frete aprovado pelo cliente mostra somente aceitar PDF e rejeitar',()=>{
  const actions=cx.slice(
    cx.indexOf('function actionHtml'),
    cx.indexOf('function freightHtml')
  );
  assert.match(actions,/if\(s==='AGUARDANDO_ACEITE_ERP'\).*data-cx-accept.*\$\{pdf\}.*data-cx-reject/s);
  assert.match(actions,/const pdf=.*data-cx-pdf/s);
});

test('aceito rejeitado e cancelado ficam sem ações',()=>{
  const actions=cx.slice(
    cx.indexOf('function actionHtml'),
    cx.indexOf('function freightHtml')
  );
  assert.match(actions,/\['ACEITO','REJEITADO','CANCELADO'\]\.includes\(s\).*john-cx-no-action/s);
});

test('enquanto cliente não respondeu ERP pode alterar cotação',()=>{
  const actions=cx.slice(
    cx.indexOf('function actionHtml'),
    cx.indexOf('function freightHtml')
  );
  assert.match(actions,/Alterar cotação/);
  assert.match(actions,/AGUARDANDO_CLIENTE_FRETE/);
});

test('PDF continua disponível nos pontos operacionais antes da decisão final',()=>{
  const actions=cx.slice(
    cx.indexOf('function actionHtml'),
    cx.indexOf('function freightHtml')
  );
  assert.match(actions,/data-cx-pdf/);
  assert.match(cx,/function printOrderPdf/);
});

test('filtros completos existem',()=>{
  assert.match(cx,/johnCxFrom/);
  assert.match(cx,/johnCxTo/);
  assert.match(cx,/johnCxCustomer/);
  assert.match(cx,/johnCxModality/);
  assert.match(cx,/johnCxStatus/);
  assert.match(cx,/johnCxAction/);
});

test('filtro de ações diferencia cotação decisão e sem ação',()=>{
  assert.match(cx,/function actionType/);
  assert.match(cx,/COTAR/);
  assert.match(cx,/AGUARDANDO_CLIENTE/);
  assert.match(cx,/DECIDIR/);
  assert.match(cx,/SEM_ACAO/);
});

test('fila consulta lista autoritativa no servidor',()=>{
  assert.match(cx,/function pullServerOrders/);
  assert.match(cx,/\/api\/v1\/admin\/store\/orders\?status=TODOS&limit=1000/);
  assert.match(cx,/write\(INBOX_KEY/);
});

test('horário de entrega continua fora da coluna ações',()=>{
  assert.match(cx,/customer-delivery-time/);
  assert.match(cx,/data-cx-time/);
});

test('service worker injeta plataforma e experiência V8.13.3',()=>{
  assert.match(sw,/platform-admin-v8-12-0\.js/);
  assert.match(sw,/ecommerce-customer-experience-v8-13-0\.js/);
  assert.match(sw,/john-erp-pwa-v8\.13\.3-direct-modules/);
});


test('ações legadas são escondidas e removidas se timers antigos tentarem voltar',()=>{
  assert.match(cx,/function guardLegacyOrderActions/);
  assert.match(cx,/john-v88-delete-terminal/);
  assert.match(cx,/button\[onclick\*="johnV8EditOrder"\]/);
  assert.match(cx,/button\[onclick\*="johnV83RejectOrder"\]/);
  assert.match(cx,/MutationObserver/);
});
