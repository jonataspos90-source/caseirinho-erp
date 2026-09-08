# ERP V8.9.1 — Sincronização de Categorias, Grades e Pré-cadastro

- Categorias são enviadas imediatamente ao PostgreSQL; o cadastro ganhou **Salvar e publicar**.
- Grades ativas reconciliam automaticamente suas variantes como produtos publicados quando possuem Preço E-commerce.
- Antes de publicar o catálogo, o ERP faz um pull das últimas alterações dos outros navegadores.
- O cursor multiusuário usa `nextCursor` da API 1.13.1.
- Alterações remotas de `config`, `ecommerceGrades` e `produtos` atualizam suas telas correspondentes.
- Produto já publicado no E-commerce é republicado silenciosamente quando o cadastro é alterado.
- Pré-cadastro agora é reconhecido exclusivamente pelo WhatsApp e usa revisão **De/Para**.
- Cadastro existente: dados informados são atualizados após aprovação e o **nome fica protegido**.
- WhatsApp duplicado em mais de uma pessoa bloqueia a aprovação até a duplicidade ser corrigida.
