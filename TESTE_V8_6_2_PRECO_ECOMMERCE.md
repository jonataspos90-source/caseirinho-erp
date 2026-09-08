# Teste V8.6.2 — Integridade do Preço E-commerce

## Causa raiz confirmada
O submit do cadastro de produto recriava `p.ecommerce` somente com os campos do formulário (descrição, limite, categoria, disponibilidade etc.). Como `precoEcommerce` não pertence àquele bloco de formulário, ele era removido ao salvar uma edição.

## Correção
- O cadastro agora faz merge dos campos editados sobre o objeto E-commerce existente.
- `precoEcommerce`, `precoModo`, `precoOrigem`, `categoriaId`, `imagens` e outros metadados não editados são preservados.
- Antes de publicar, o ERP tenta recuperar da nuvem o último Preço E-commerce de produtos publicados cujo preço local tenha sido apagado pela versão anterior.
- Se não existir preço recuperável, bloqueia a publicação e orienta o usuário a informar o Preço E-commerce. O Preço ERP nunca é usado como substituto.
- Cache PWA incrementado para V8.6.2.

## Validação executada
- 93 scripts inline do ERP: sem erro de sintaxe.
- Service Worker: sem erro de sintaxe.
- Confirmada ausência da atribuição destrutiva `p.ecommerce=tmp.ecommerce`.
- Confirmado merge preservando dados existentes.
- Confirmada rotina de recuperação do preço publicado.
