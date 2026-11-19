# Auditoria integrada Caseirinho — 19/11/2026

## Escopo
Fontes verificadas: `caseirinho-erp/central-caseirinho-insights`, `caseirinho-loja`, `john-cloud-api`, ambiente Railway Central Caseirinho / John ERP Cloud e esquema do tenant `john-default` no Neon. Consulta de produção somente de leitura. Nenhum pedido, pagamento ou cadastro de cliente foi modificado.

## Evidências atuais
- Central (Railway) aponta para `caseirinho-erp@main` e loja para `caseirinho-loja@main`; ambos tinham último deploy marcado `SUCCESS` em 18/11/2026, o que **não** comprova testes funcionais.
- API compartilhada em `john-cloud-api@main` / projeto Railway John ERP Cloud, com deploy registrado como `SUCCESS`.
- Banco: 92 registros no catálogo publicado do tenant, última alteração em 18/11/2026; configuração da loja em versão 1891.
- Pedidos não excluídos: 182, com 97 entregues/retirados, 81 rejeitados e quatro cancelados. Nenhum registro ativo com integração fora de IMPORTADO, REJEITADO ou CANCELADO na consulta de 19/11. *Não presumir que toda rejeição seja erro.*
- Eventos de sincronização dos últimos sete dias mostram operações de campanhas sazonais, preço, horário de funcionamento, confirmação de recebimentos, pedidos e acessos à loja.
- O relatório de recebimentos existente já separa a receita de vendas e o fluxo financeiro, exclui testes e trata valores não conciliados distintamente. A API limita a consulta a 5.000 pedidos por tenant e aceita filtros e paginação.
- No HTML da loja foram referenciados 36 scripts e 15 folhas CSS. Requer medição real de waterfall, CPU, LCP, INP e CLS; contagem de arquivos não é, por si só, prova de lentidão.
- O manifesto original da Central possuía `start_url` e `scope` absolutos (`/`), impróprios para o caminho do GitHub Pages, além de somente ícone SVG. O código de encomendas não oferecia abertura de detalhe do pedido ao tocar no cartão.
- A consulta de desempenho Railway não retornou amostras para a última hora; não há diagnóstico quantitativo de latência da API. A extensão `pg_stat_statements` não está instalada; não criar extensão sem janela de mudança.

## Alterações desta proposta de revisão
1. Manifesto PWA com escopo relativo ao diretório, ícones locais PNG 192/512, maskable e apple-touch, e identidade `Caseirinho Gestão`.
2. Service worker para app-shell público: arquivos estáticos vêm primeiro do cache e são atualizados em segundo plano; navegação usa rede preferencial; dados autenticados e respostas da API continuam fora do cache.
3. Primeira leva de dados da Central prioriza resumo, pedidos e solicitações; tela útil aparece antes da conclusão de todas as consultas, mantendo os módulos posteriores.
4. Encomendas: cartões permitem abrir detalhes de cliente, itens, data, entrega, sinal e saldo **sem** alterar os valores; cartões de campanha levam ao formulário de edição com indicação visual.
5. Ações de botão com realimentação visual, foco acessível e suporte a teclado.
6. Seção `Conta Cliente`: relatório por cliente de pedidos concluídos com saldo **conciliado**, agrupamento por telefone válido (sem unir homônimos não identificados), exportação CSV, busca e link opcional de conversa WhatsApp. Valores não conciliados ou pagos online pendentes não entram como dívida certa.
7. Testes estáticos de manifesto, scripts, cache, encomendas e relatório incluídos no pipeline de regressão existente.

## Limitações antes da publicação
- Todas as alterações estão numa branch/PR, ainda não ativadas em produção; a revisão de código não equivale a teste de ponta a ponta no Android.
- Não foi possível entrar como administrador no navegador, portanto **não** foram efetuados pedidos teste, publicação de itens, recebimentos ou cancelamentos reais.
- Não se deve cobrar automaticamente pessoas com "saldo" sem validar o vencimento, a conciliação e os comprovantes; o relatório é **a receber**, não um indicador jurídico de inadimplência.
- A ferramenta de devedores consulta os recebimentos de **pedidos da loja**. Convênios, lançamentos de fiado e duplicatas antigos do ERP merecem conciliação adicional antes da unificação em uma conta-corrente única.
- O service worker só armazena shell público; não há operação offline para gravação de pedidos ou baixa de pagamentos.

## Backlog integrado sugerido
### P0 — evitar perda de vendas/dados
- Teste E2E com usuário autorizado em Android e desktop: autenticação, abrir/fechar campanha, cadastro/edição/publicação, itens na vitrine, pack, novo pedido, pagamento, status e sincronização, callbacks e reabertura após atualizar.
- Testar confirmação de sinal/saldo com idempotência, conciliação Mercado Pago e duplicidade de pedidos.
- Estabelecer monitoramento de API com p50/p95, taxa de erro e registro de operações lentas; revisar índices de consultas que forem comprovadamente custosas.

### P1 — ERP como aplicativo único
- Unificar saldo de cliente considerando pedidos concluídos, duplicatas do convênio, fiado, pagamentos manuais e estornos, com histórico conciliável e vencimento verdadeiro por parcela.
- Consolidar o cadastro e a fila de publicação de produtos e encomendas, usando um modelo de estados: Rascunho → Pronto → Publicando → Publicado → Falha/Correção.
- Concentrar caixa, vendas, recebimentos, financeiro, DRE, estoque, compras e PCP na navegação principal; eliminar módulos redundantes sem perder histórico.
- Reduzir quantidade de JS/CSS da loja após profiling, com separação de tarefas de inicialização, code splitting e carregamento prioritário do catálogo/checkout.
- Implementar status de publicação e sincronização visível por comando, com `requestId`, data, resultado confirmado do servidor e opção segura de atualização, sem repetir gravações incertas.

### P2 — recursos com a cara do Caseirinho
- Planejamento de produção de encomendas (por data de retirada, ficha técnica, ingredientes, rendimento e capacidade diária).
- Visão diária "Meu Caseirinho": pedidos a produzir, entregas, saldos a receber, estoque crítico e faturamento esperado/confirmado.
- Fidelidade com recompra, combos por sabor, cashback liberado só após entrega e pagamento e campanhas com consentimento de marketing.
- Precificação e margem real por receita/ficha e canal (loja própria, iFood, 99Food), distinguindo taxas e descontos.
- Cadastro de previsão de entrega/retirada com comunicação simples e registro operacional de etapas.

## Plano de homologação
1. Confirmar CI verde do PR.
2. Conferir arquivos PWA, instalação, abertura offline do app-shell, atualização de versão e exclusão de cache antigo.
3. Testar todas as telas no celular e no PC; verificar que botões respondem e que nenhuma alteração é silenciosamente descartada.
4. Testar no ambiente apropriado sem comprometer produção; validar com pedidos e produtos de teste explicitamente identificados.
5. Fazer deploy em janela controlada, conferir logs de erro e monitorar primeiros pedidos após publicação; manter rollback por commit SHA.

**Critério para declarar pronto:** somente após teste real completo, comparação de saldos, conciliação e verificação de que a loja recebe cada comando publicado. Não declarar "100%" apenas por deploy verde ou compilação de JavaScript.
