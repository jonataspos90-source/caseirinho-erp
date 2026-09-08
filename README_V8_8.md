# John Sistema ERP · V8.8.0

- Publicação canônica do E-commerce: elimina interceptador legado que bloqueava a Rosquinha mesmo com preço online existente.
- Recupera Preço E-commerce pelo último catálogo publicado sem usar Preço ERP como substituto.
- Produtos Online: botão para enviar/confirmar imagens anexadas nos cadastros antes da publicação.
- Grades / Variações: agrupa tamanhos como 500 g e 1 kg em um único produto visual na Loja, preservando SKU, preço, estoque e mínimo de cada variante.
- Exclusão de pedidos sincronizada em todos os dispositivos, com tombstone na API 1.12 e histórico preservado no PostgreSQL.

## Diagnóstico de produção confirmado
A Rosquinha possuía R$ 1,49 no catálogo e preço E-commerce zerado no espelho do ERP. A publicação canônica recupera o valor publicado antes de validar. O mesmo tratamento recupera outros produtos que estejam na mesma condição.

O botão de imagens atualiza também produtos que já estão no catálogo online, mesmo que o flag local de publicação tenha ficado divergente entre versões.
