# John Sistema ERP V8.6.2

Hotfix de integridade do Pricing E-commerce.

- Editar descrição, limite por pedido, categoria, imagens ou demais campos comerciais não apaga mais `precoEcommerce`.
- O Preço E-commerce continua totalmente independente do Preço ERP.
- Antes de publicar, se uma versão anterior tiver apagado o Preço E-commerce local, o ERP tenta recuperar o último preço do mesmo produto já publicado na nuvem.
- Se não existir preço recuperável, a publicação é bloqueada com orientação clara para informar o Preço E-commerce; nunca usa o preço ERP como substituto.
- Cache PWA atualizado para forçar a nova versão nos navegadores.
