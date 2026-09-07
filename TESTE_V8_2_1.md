# John ERP / Caseirinho V8.2.1 — revisão técnica

## Correções desta versão
- Tela Pedidos: restaura ações Pedido, Separação, WhatsApp, Editar, Ver conta (quando aplicável) e Excluir.
- Tela Pedidos: cabeçalho Cliente / WhatsApp e telefone visível por pedido.
- Tela Pedidos: tabela com rolagem horizontal controlada, primeira coluna fixa e retorno à primeira coluna ao entrar no módulo.
- Sincronização: fila de pedidos consultada aproximadamente a cada 0,9 s quando a aba está ativa.
- Sincronização: espelho operacional consultado aproximadamente a cada 1,2 s quando a aba está ativa.
- Sincronização: não substitui a tela/base local enquanto um salvamento recente está em processamento.
- Sincronização: re-renderiza o ERP apenas quando o conteúdo remoto mudou, reduzindo travamentos e saltos de tela.
- Indicador de sincronização: evita permanecer em “Sincronizando...” em chamadas rápidas.
- Service Worker: cache alterado para V8.2.1.

## Validações executadas
- 84 blocos JavaScript do index.html: validação de sintaxe com Node.js, sem erro.
- service-worker.js: validação de sintaxe com Node.js, sem erro.
- manifest.webmanifest: JSON válido.
- IDs HTML: nenhum ID duplicado encontrado.
- Renderização controlada da tabela de Pedidos com pedido sintético: 15 colunas corretas.
- Ações verificadas na renderização: Pedido, Separação, WhatsApp, Editar e Excluir.
- Cabeçalho verificado: Cliente / WhatsApp.
- Telefone do cliente verificado na linha do pedido.

## Observação
A validação automatizada cobre estrutura, sintaxe e o fluxo crítico de renderização de Pedidos. Testes de integração em produção entre múltiplos aparelhos dependem da API/Railway publicada e devem ser confirmados após a publicação da V8.2.1 do ERP.
