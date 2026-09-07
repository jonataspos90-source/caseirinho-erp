# John ERP V8.3 — Sincronização crítica e origem de pedidos

- Status REJEITADO/CANCELADO do E-commerce vem da nuvem e é autoridade em todos os aparelhos.
- Fila do E-commerce atualizada automaticamente (~650 ms com aba ativa).
- Pedido rejeitado não volta a ABERTO por um ERP local desatualizado.
- Pedido aceito cancelado reflete na nuvem e nos demais dispositivos.
- Pedidos de clientes agora podem ser filtrados por Origem: Todos / ERP / E-commerce.
- Service Worker atualizado para remover cache antigo.
