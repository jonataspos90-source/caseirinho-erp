# John Sistema ERP — Caseirinho V8.4

Versão operacional final preparada em 07/09/2026 para publicação no GitHub Pages.

## Publicação
Envie **o conteúdo desta pasta diretamente para a raiz** do repositório `caseirinho-erp`.
Não envie uma pasta contendo estes arquivos, para evitar o problema de publicação em subdiretório.

Link esperado do ERP:
`https://jonataspos90-source.github.io/caseirinho-erp/`

## Integração
A API/PostgreSQL é a fonte central de dados. A linha de API esperada é 1.9.1 / schema 9.
A V8.4 acrescenta correções de operação, manutenção, pricing, financeiro, catálogo online, tokens, pedidos e layout compacto sem exigir nova migração de banco.

## PWA
O ERP pode ser instalado no celular, tablet ou PC. O cache desta entrega é identificado como V8.4 e versões anteriores são removidas durante a ativação do Service Worker.

## Segurança
Nenhum token, senha ou ERP_API_KEY é gravado dentro dos arquivos publicados. A credencial administrativa permanece no armazenamento do dispositivo e pode ser trocada, revogada ou reativada pela tela E-commerce → Token / Links / Acesso.

Consulte `README_V8_4.md` e `TESTE_V8_4_FINAL.md` para o escopo e as validações.
