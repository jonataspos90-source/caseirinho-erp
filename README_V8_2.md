# John ERP V8.2 — Sincronização Multi-dispositivo

Correções principais:
- PostgreSQL/API como fonte operacional compartilhada.
- Envio incremental seguido de leitura automática da base central.
- Atualização automática a cada ~3 segundos, ao voltar para a aba e ao reconectar internet.
- Pessoa mantém vínculos Cliente, Usuário ou Cliente + Usuário.
- Pedidos do E-commerce atualizados automaticamente em todos os dispositivos.
- Popup de novo pedido, contador no menu e avanço para o próximo pedido.
- Proteção de pedido em análise por outro operador (API 1.8).
- E-commerce alinhado ao design visual dos demais módulos.
- Cache PWA atualizado para V8.2.


## V8.2.1 correção de estabilidade
- Pedidos: restaura Pedido, Separação, WhatsApp, Editar e Excluir.
- Tabela de pedidos inicia pela primeira coluna e mantém rolagem horizontal controlada.
- Sincronização operacional reduzida: pedidos ~0,9 s e espelho ERP ~1,2 s, com proteção contra sobrescrever salvamento local em andamento.
- Renderização da base só ocorre quando o conteúdo remoto mudou, reduzindo travamentos e saltos de tela.
