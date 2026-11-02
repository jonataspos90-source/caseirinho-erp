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
