# John Sistema ERP V8.4.1 FAST

Correções principais:
- sincronização incremental imediata após salvar/publicar;
- removida exportação completa da base a cada ~900 ms;
- recebimento de alterações de outros aparelhos via `/api/v1/admin/sync/changes`;
- ciclo leve de mudanças a cada ~600 ms e pedidos a cada ~450 ms;
- indicador mostra envio apenas durante operação real;
- publicação do catálogo chama a API imediatamente.

API esperada: 1.9.2 / schema 9.
