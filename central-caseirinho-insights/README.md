# Central Caseirinho Insights — aplicativo separado

**Endereço:** https://jonataspos90-source.github.io/caseirinho-erp/central-caseirinho-insights/

Interface autônoma para celular e computador, instalável como PWA quando o navegador permitir. Os dados dos clientes não ficam gravados no GitHub Pages: o navegador consulta a API autenticada John ERP Cloud que lê os registros do Neon, tenant `john-default`.

## Como acessar

1. Abra o link acima no navegador em que você utiliza o ERP Caseirinho.
2. Use a opção **Usar sessão já aberta do ERP**. Caso não exista uma sessão/token disponível neste navegador, informe um token administrativo válido do seu ERP.
3. O app mostra dados em tempo real para perfis MASTER, ADMINISTRADOR, GERENTE e administrativos autorizados.
4. Use **Atualizar** para buscar o banco imediatamente. As solicitações são consultadas automaticamente a cada 30 segundos com o app aberto.

## Telas

- **Visão geral:** dispositivos store-*, pings ativos separados de visitas reais, cadastros, pedidos, ranking, andamento das integrações, eventos PWA e alertas.
- **CRM/Contatos:** nomes e WhatsApps declarados em cadastros, compras ou eventos IDENTIFIED, sem duplicar; botões de mensagem e de envio de cardápio, status de consentimento, CSV.
- **Ranking:** somente visitas reais ligadas ao mesmo client_id e visitId via eventos de identificação; últimos sete dias desde instrumentação.
- **Pedidos:** status e integração dos pedidos vindos da loja.
- **Cardápio escrito:** produtos e preços publicados em storefront_catalog, mensagens por categoria, revisão de divergências e WhatsApp.
- **Solicitações:** fila de pedidos de cardápio enviados pelo botão da loja, alerta com app aberto, resposta manual, marcar atendido.
- **Configurações:** fonte e status da conexão.

## Segurança e limites

Dados pessoais só são retornados por rota adminAuth com papel autorizado; nunca são embarcados no HTML estático. O token é usado em sessão (ou recuperado do armazenamento local já usado pelo ERP). O sistema não envia mensagens automaticamente nem grava dados de clientes em URLs públicas. O modo standalone não prova instalação: apenas appinstalled reportado gera PWA_INSTALLED. Pings não contam visitas. Abertura de conversa no WhatsApp não comprova envio da mensagem; confirme manualmente. Solicitações recebidas diretamente pelo WhatsApp requerem API oficial do WhatsApp Business.

Verifique divergências de preços publicadas antes de compartilhar o catálogo; a Central não corrige valores no ERP automaticamente.

## Instalar na tela inicial do celular (Android)

1. No celular, abra https://jonataspos90-source.github.io/caseirinho-erp/central-caseirinho-insights/ pelo **Google Chrome**.
2. Toque em **📲 Instalar app no meu celular** e confirme a solicitação. Caso o navegador não ofereça o prompt, use o menu **⋮ → Instalar aplicativo** (ou **Adicionar à tela inicial**).
3. No Samsung Internet, use **☰ → Adicionar página a → Tela inicial**.
4. Entre com sessão autorizada do ERP. Se o aparelho for exclusivamente seu e tiver bloqueio de tela, marque **Este é meu celular. Manter meu acesso neste aparelho** antes de entrar.
5. Depois, basta tocar no ícone **Caseirinho Insights** da tela inicial. O ícone é o oficial do Caseirinho, e a Central abre em modo independente, sem barras comuns do navegador.
6. Para remover o acesso persistente, toque em **Sair** dentro da Central. Se precisar revogar um token, faça isso na administração do ERP.

A versão PWA inclui manifest e service worker. O cache local armazena **somente arquivos estáticos** do aplicativo; nenhuma consulta privada ao CRM, pedidos ou token de acesso passa pelo cache do service worker. Quando offline, a interface pode abrir, mas os dados do Neon não são consultáveis.

## Gestão prática — versão 3 (02/11/2026)

- No celular, uma barra de acesso rápido inferior tem **Início / Clientes / Pedidos / Preços / PDF**. As telas de CRM e pedidos usam cartões para não exigir rolagem horizontal da tabela.
- **🏷️ Produtos e preços** permite localizar um produto e editar preço em reais, quantidade mínima e quantidade máxima (0 = sem limite). A gravação exige MASTER/ADMINISTRADOR, confirmação do operador, controle de edição simultânea, transação que atualiza `erp_records.produtos.ecommerce` e `storefront_catalog`, e evento de auditoria `INSIGHTS_PRODUCT_TERMS_UPDATED`. Promoções ativas são sinalizadas para revisão.
- **👥 CRM → Ver compras** consulta todos os pedidos localizados pelo WhatsApp no banco, sem atribuir a esse cliente pedidos de terceiros.
- **🛒 Pedidos → Ver itens / PDF** mostra produto, quantidade, preço unitário, total, frete, descontos informados, pagamento e situação. O PDF é obtido via Imprimir → Salvar como PDF no celular.
- **📄 Relatórios / PDF** disponibiliza clientes, pedidos com itens e produtos com condições comerciais. Não usa serviços externos para gerar o documento.
- A vitrine da loja já usa `quantidadeMinima` e `limitePedido` no carrinho. A Central **não** modifica preços automaticamente; só altera produtos por uma ação confirmada de edição.

Para atualizar um app já instalado, abra-o com conexão à internet e use o botão **Atualizar** ou feche e abra novamente; a PWA usa cache de interface V3.

## Cadastro completo de produtos — V4 (02/11/2026)

Abra **🏷️ Produtos e preços → ➕ Novo produto** para cadastrar um produto no ERP e na loja com nome, nome comercial, categoria oficial, descrição, preço de venda, custo estimado opcional, unidade, quantidade mínima/máxima, disponibilidade (pronta entrega/encomenda), antecedência, destaque/novidade e até 5 fotos do celular (galeria/câmera).

A primeira imagem é a principal. A Central compacta fotos para JPEG com até 2,5 MB cada. O back-end valida assinatura de imagem e, após confirmação, grava fotos na tabela `storefront_media`, produto em `erp_records` e catálogo em `storefront_catalog` na **mesma transação**, usando código sequencial e auditoria. Se não for publicado, o produto fica como **rascunho** e pode receber fotos e ser publicado posteriormente.

Em um produto publicado, toque **📷 Alterar fotos** para substituir a galeria. Não altere uma foto usando link aleatório da internet: o arquivo deve ser selecionado do dispositivo. A Central não publica produtos sem foto nem cadastra duplicatas com nome igual. Usuários autorizados MASTER/ADMINISTRADOR; nenhuma criação automática na execução de testes.

**Atenção:** promoções e packs do produto continuam sendo administrados separadamente; alterar preço comum não muda automaticamente preço promocional. Preço de venda no e-commerce usa `ecommerce.precoEcommerce`. O número do código é gerado automaticamente e pode ser consultado no ERP.

**Melhorias futuras sugeridas:** gestão de grade P/M/G e sabores com preços independentes, ficha técnica e margem, estoque x encomenda, lotes/validade, combos/cupons, histórico de mudanças, aprovação de publicação e importação em lote.

## 📈 Relatório de vendas dos produtos — Curva ABC V5

Menu do aplicativo: **📈 Vendas / Curva ABC** (atalho inferior **📈 Vendas** no celular).

- Filtro **De / Até** (até 730 dias) e atalhos de 7, 30, 42, 90 dias ou mês atual; datas em **America/Sao_Paulo**.
- Apenas **storefront_orders** da loja Caseirinho com status ACEITO, ENTREGUE, RETIRADO, CONCLUIDO. Pendentes, abertos, cancelados, rejeitados e pedidos identificados como testes são excluídos. **Não** soma novamente pedidos importados no ERP.
- Indicadores: quantidade de pedidos considerados, produtos com saída, unidades vendidas, receita dos itens e pedidos excluídos.
- **Top 10 por quantidade** e **Top 10 por receita dos itens**, separados.
- **Curva ABC por produto e categoria**, por receita dos itens no período: A até 80% da receita acumulada, B até 95%, C restante. O item que cruza o limite pertence à faixa que ele iniciou, evitando dividir uma linha.
- **Média móvel de 42 dias:** janela independente entre a data Até menos 41 dias e a data Até. Dias sem venda entram no denominador: média de unidades/dia = total de unidades na janela / 42; média semanal = unidades / 6. Também traz valor vendido no período de 42 dias.
- Tabela de produtos com curva, categoria, quantidade, receita, participação, acumulado ABC, média 42 dias, filtro por texto/categoria/curva.
- Exportação **CSV** compatível com Excel e **PDF** (imprimir/salvar pelo celular), incluindo análise de categorias.

**Importante:** valores dos itens não incluem frete e não rateiam descontos/cashback aplicados somente no total do pedido. São registros operacionais de pedidos aceitos/atendidos — não prova de recebimento de pagamento nem declaração de faturamento fiscal. Para fechamento contábil reconciliar pagamentos, devoluções e notas.

API: `GET /api/v1/admin/store/insights/product-sales-abc?from=YYYY-MM-DD&to=YYYY-MM-DD`, exigindo autenticação administrativa. V5 atualiza o cache PWA automaticamente.

## 🔐 Login simplificado com usuário e senha do ERP — V6

A tela de entrada não mostra endereço da API, token, configuração técnica ou botão de sessão legada.

1. Informe **o mesmo usuário (login) e a mesma senha cadastrados no ERP Caseirinho**.
2. A Central envia as credenciais por HTTPS ao endpoint existente `POST /api/v1/public/store/caseirinho/erp-login`.
3. O ERP autentica e devolve uma **sessão assinada com validade de 8 horas**, sujeita aos perfis MASTER/ADMINISTRADOR/GERENTE/PLATFORM_OWNER e à checagem `adminAuth` em cada consulta.
4. O aplicativo **não armazena a senha**. Guarda temporariamente apenas a sessão assinada em `sessionStorage`; ao expirar, solicita novo login.
5. O campo usuário pode ser lembrado para conveniência. O botão **Sair** descarta a sessão local.
6. Tokens antigos salvos para a Central não são mais importados. A API permanece fixa e não aparece na tela de login.

Atualização PWA: arquivo `app.js?v=6`, `styles.css?v=6`, service worker `caseirinho-insights-app-shell-v6`. Se o aplicativo instalado ainda mostrar a tela anterior, abra no navegador externo, recarregue e depois feche/abra a PWA.

A API já suportava autenticação por login/senha; esta atualização afeta principalmente a interface do aplicativo, sem alterar senhas ou registros de usuários existentes.

## 🎁 Grades e Packs Virtuais — V8 (02/11/2026)

Abra **🎁 Grades e Packs** no menu da Central ou toque em **Packs** na barra inferior do celular. Esta área consulta os cadastros existentes do ERP e não cria duplicatas ao editar.

### Grades

- Clique **➕ Criar grade** ou **Editar grade**.
- Defina nome (ex.: Lasanha Molho Branco), tipo (Tamanho, Peso, Sabor, Recheio, Apresentação), título e descrição.
- Marque de **2 a 24 produtos já publicados no e-commerce**, cada qual com seu próprio código. Preencha o rótulo comercial (ex.: M / 500 g) e o preço de cada variante.
- Defina o **produto de capa**; a imagem de capa será a imagem deste produto.
- Confirme **Salvar e publicar grade**. Atualiza transacionalmente: `erp_records.ecommerceGrades`, `erp_records.produtos.ecommerce`, `erp_root_objects.config.ecommerce.grades`, `storefront_config.grades` e `storefront_catalog`.
- Uma variação não pode ficar vinculada a duas grades ativas. A opção Desativar desvincula a grade, preserva os produtos individuais e audita a ação.

### Packs virtuais

- Clique **➕ Criar pack** ou **Editar pack**.
- Escolha **Leve X, pague Y** (ex.: 5 e 4) ou **Compre X e leve item beneficiado por valor especial**.
- Selecione produtos participantes (um pack pode reunir sabores distintos). X deve ser maior que Y. Packs incompatíveis no mesmo produto são bloqueados.
- Confirme para registrar a mesma regra `ecommerce.packVirtual` no ERP e `packVirtual` no catálogo do e-commerce, auditada em `sync_events`.
- Desativar pack restaura a venda individual, sem excluir o histórico dos produtos.

**Importante:** o cadastro da Central vincula SKUs existentes; para criar novos SKUs/tamanhos antes, utilize o módulo **Produtos e preços → Novo produto**. O desconto do pack é calculado pelo motor promocional já existente no e-commerce, e não pela Central. A Central não cria vendas de teste nem altera ofertas sem confirmação.

A leitura foi validada no Neon, que apresentou 29 grades e dois packs ativos. Gravações foram testadas somente com mocks, sem mudar os produtos reais. Atualização da PWA: arquivos de versão 8.

## 📦 Entrega/Retirada e 💚 Cashback por pedido — V9

No menu **🛒 Pedidos**, procure um pedido e toque em **✅ Entrega / Cashback**. Também funciona pela tela de itens do pedido.

- O painel consulta, por código de pedido, o status no e-commerce, situação de integração ERP, aprovação individual de cashback, percentual, saldo já creditado, valor elegível e número de compras anteriores concluídas.
- O operador pode clicar **Aprovar cashback agora**. A aprovação NÃO credita o saldo imediatamente: o gatilho bancário `cashback_order_status_ledger()` gera crédito ao fazer a transição para ENTREGUE ou RETIRADO.
- Em **Confirmar entrega e finalizar pedido**, o operador escolhe **APROVADO** ou **REJEITADO**, confirma a entrega/retirada efetiva e assinala que **conferiu o pagamento**. A rotina bloqueia conclusão de pedidos cancelados, novos sem aceite ou que não estejam integrados ao ERP.
- **Entrega** grava `ENTREGUE`; **retirada presencial** grava `RETIRADO`, tanto em `storefront_orders.status/payload` quanto em `erp_records(pedidos).payload.status/statusEcommerce`, sob uma única transação, com bloqueio e vínculo comprovado por `ecommercePedidoId`.
- **Crédito aprovado:** 3% (ou percentual gravado na política do pedido) sobre subtotal elegível, excluindo frete conforme política e descontando cashback já usado. O banco garante `idempotency_key='CASHBACK:CREDIT:ORDER:<id>'` para impedir duplicidade.
- **Segunda compra:** a Central exige pelo menos uma compra anterior concluída e identificada pelo mesmo WhatsApp. Pedidos anteriores a 03/10/2026, explicitamente marcados como teste e de primeira compra não são elegíveis. Não tenta contornar esta regra.
- **Pedido já entregue com crédito pendente:** o botão **Liberar cashback** está disponível apenas após verificação de elegibilidade e inexistência do crédito. A liberação cria transação CREDIT/AVAILABLE com chave de idempotência idêntica à do gatilho, sem creditar novamente se já existir.
- **Auditoria:** operações `INSIGHTS_CASHBACK_DECISION`, `INSIGHTS_ORDER_COMPLETED` e `INSIGHTS_CASHBACK_RELEASED` em `sync_events`, com ator, pedido e resultado.
- **Financeiro:** confirmar pagamento é uma declaração manual do operador. O botão **não** cria automaticamente lançamento de recebimento/baixa nem altera PIX/cartão como comprovados pelo provedor. Confirme a liquidação real antes de marcar.
- **Permissões:** somente MASTER/ADMINISTRADOR/PLATFORM_OWNER ou escopo administrativo total; sessão assinada do ERP.

Filtros novos: Aguardando entrega/retirada, Cashback a decidir, Cashback liberado e Pedidos concluídos. Cards resumem quantidade aguardando, créditos, valor total liberado e pedidos concluídos.

**Validação:** leitura real do banco no tenant `john-default` e simulação de finalização utilizando banco fictício em memória (nenhum pedido real foi modificado por testes). Confirme uma transação real no aplicativo e a correspondência do lançamento antes de considerar homologação integral. Atualização PWA V9.
