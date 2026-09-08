# TESTE V8.10.1 — Cadastro de Pessoas

## Diagnóstico em produção
- Consulta ao PostgreSQL não encontrou pessoa com nome Natalia/Natália.
- Não havia novo evento de sincronização da entidade `pessoas` correspondente ao cadastro informado.
- O erro ocorreu antes da persistência na nuvem.
- A V8.10.0 possuía múltiplos handlers de `submit` para `pessoaForm`, incluindo lógica assíncrona que dependia do formulário após ele já ter sido limpo.

## Correção
- Handler canônico único em fase de captura para Cadastro de Pessoas.
- Preserva Cliente, Usuário e Cliente + Usuário (`AMBOS`).
- Confirma persistência local antes de limpar formulário.
- Captura e envia alteração incremental ao PostgreSQL.
- Faz tentativa de confirmação de leitura após sincronização.
- Se a nuvem estiver indisponível, mantém o cadastro local e informa que há sincronização pendente.
- Não faz `renderAll()` durante o salvamento de Pessoas.

## Testes executados
- 99/99 scripts inline do ERP: sintaxe JavaScript válida (`node --check`).
- Cenário CLIENTE: aprovado.
- Cenário CLIENTE + USUÁRIO: aprovado.
- Cenário USUÁRIO: aprovado.
- Cenário API/rede indisponível: cadastro local preservado e marcado como pendente.
- Service Worker versionado para V8.10.1.

## Escopo
Este hotfix altera somente o ERP. Loja V8.10.0 e API 1.14.0 permanecem válidas.
