const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('index.html','utf8');
const cx=fs.readFileSync('ecommerce-customer-experience-v8-13-0.js','utf8');
const multi=fs.readFileSync('multiempresa-v8-12-0.js','utf8');
const platform=fs.readFileSync('platform-admin-v8-12-0.js','utf8');

function script(id){
  const marker=`<script id="${id}">`;
  const a=html.indexOf(marker);
  assert.ok(a>=0,`script ${id} não encontrado`);
  const start=a+marker.length;
  const end=html.indexOf('</script>',start);
  assert.ok(end>start,`fim de ${id} não encontrado`);
  return html.slice(start,end);
}

test('sync guard V5.1 foi reduzido a compatibilidade sem polling e ACK',()=>{
  const s=script('john-ecommerce-order-sync-guard-v51');
  assert.match(s,/APOSENTADO V8\.14\.0/);
  assert.doesNotMatch(s,/\/api\/v1\/admin\/store\/orders\?status=/);
  assert.doesNotMatch(s,/\/imported/);
  assert.doesNotMatch(s,/setInterval/);
});

test('importador definitivo V5.2 não possui importação pendente nem chave rápida',()=>{
  const s=script('john-ecommerce-orders-definitive-v52');
  assert.match(s,/APOSENTADO V8\.14\.0/);
  assert.doesNotMatch(s,/function importPending/);
  assert.doesNotMatch(s,/Importar pendentes/);
  assert.doesNotMatch(s,/johnEcomQuickKeyV52/);
});

test('V6 não observa tabela e não cria ações antigas',()=>{
  const s=script('john-v6-performance-orders');
  assert.match(s,/APOSENTADO V8\.14\.0/);
  assert.doesNotMatch(s,/MutationObserver/);
  assert.doesNotMatch(s,/data-ecom-act/);
  assert.doesNotMatch(s,/function importSingle/);
  assert.doesNotMatch(s,/function removeOrder/);
});

test('ERP E-commerce V1 preserva catálogo mas não autoimporta pedido',()=>{
  const s=script('john-ecommerce-erp-v1');
  assert.match(s,/c\.importarAutomaticamente=false/);
  assert.doesNotMatch(s,/function importarPedido/);
  assert.doesNotMatch(s,/function pessoaCliente/);
  assert.match(s,/johnEcommerceOrdersController/);
});

test('bridge PostgreSQL não faz ACK/import/status automático de pedidos',()=>{
  const s=script('john-cloud-api-postgres-v1');
  assert.doesNotMatch(s,/\/store\/orders\/[^'"`]+\/imported/);
  assert.doesNotMatch(s,/\/store\/orders\/statuses/);
  assert.match(s,/async function pushStatuses\(\)\{return \{retired:true\}\}/);
  const sync=s.slice(s.indexOf('window.sincronizarNuvemJohn=async'),s.indexOf('function wrapEcommerce'));
  assert.doesNotMatch(sync,/renderAll/);
  assert.doesNotMatch(sync,/mirror\(false\)/);
});

test('aceite canônico não depende da V6 e usa reserva no servidor',()=>{
  const s=script('john-ecommerce-v8-integrado');
  assert.match(s,/IK='john_ecommerce_cloud_inbox_v1'/);
  const a=s.slice(s.indexOf('async function acceptOrderV8'),s.indexOf('function pdfOrderV8'));
  assert.match(a,/\/accept/);
  assert.match(a,/buildAcceptedLocalOrder/);
  assert.match(a,/\/imported/);
  assert.doesNotMatch(a,/johnAceitarPedidoEcommerceV6/);
});


test('coordenador V8.4.2 também não cacheia a fila de pedidos',()=>{
  const s=script('john-v842-network-media');
  assert.doesNotMatch(s,/if\(listOrders\(url,method\)\)return coalesced/);
  assert.match(s,/fila de pedidos não usa cache\/coalescência do transporte/);
});

test('coordenador V8.9 não aplica cache de cinco segundos à fila',()=>{
  const s=script('john-v890-integrated');
  assert.doesNotMatch(s,/admin\/store\/orders.*cachedFetch\(input,opt,5000\)/s);
  assert.match(s,/pedidos nunca usam cache HTTP local/);
});

test('controlador único mantém ações solicitadas e PDF próprio',()=>{
  assert.match(cx,/AGUARDANDO_ACEITE_ERP/);
  assert.match(cx,/data-cx-accept/);
  assert.match(cx,/data-cx-pdf/);
  assert.match(cx,/data-cx-reject/);
  assert.match(cx,/\['ACEITO','REJEITADO','CANCELADO'\]\.includes\(s\).*john-cx-no-action/s);
  assert.match(cx,/printPdf:printOrderPdf/);
});

test('primeiro acesso por token público não existe mais no cliente',()=>{
  assert.doesNotMatch(multi,/Ativar empresa e criar MASTER/);
  assert.doesNotMatch(multi,/johnBootCreate/);
  assert.match(multi,/Empresa ainda não liberada/);
  assert.match(multi,/Nenhum token de ativação é solicitado nesta tela/);
});

test('plataforma sugere slug john-empresa e fornece links ERP e Loja',()=>{
  assert.match(platform,/\('john-'\+base\)/);
  assert.match(platform,/Copiar ERP/);
  assert.match(platform,/Copiar Loja/);
  assert.match(platform,/searchParams\.set\('empresa'/);
});
