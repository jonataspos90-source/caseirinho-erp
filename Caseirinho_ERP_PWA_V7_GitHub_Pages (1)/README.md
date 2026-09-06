# John Sistemas — Caseirinho ERP PWA V7

ERP preparado para GitHub Pages e instalação como aplicativo (PWA).

## Segurança
- Nenhuma `ERP_API_KEY`, senha ou token está gravado neste repositório.
- Em hospedagem HTTP/HTTPS, o login padrão de demonstração é bloqueado com senha aleatória.
- Antes do primeiro login, o dispositivo precisa ser ativado e carregar a base do PostgreSQL.
- A credencial fica apenas no navegador do dispositivo. Use somente em dispositivo confiável.
- A limpeza total da base local foi desativada no ERP hospedado.
- O site pede `noindex` e também possui `robots.txt`.

## Publicação no GitHub Pages
1. Crie um repositório público chamado `caseirinho-erp`.
2. Envie **todo o conteúdo desta pasta** para a raiz do repositório.
3. Settings → Pages → Deploy from a branch.
4. Branch `main`/`principal`, pasta `/(root)`.
5. Salve.

URL esperada: `https://SEU-USUARIO.github.io/caseirinho-erp/`.

## Primeiro acesso
1. Abra o endereço publicado.
2. Informe URL da API e uma credencial autorizada.
3. Clique **Ativar e carregar minha base**.
4. O ERP baixa o espelho do PostgreSQL e recarrega.
5. Entre com o usuário/senha real do ERP.

## PWA
No Android/Chrome ou Samsung Internet, use **Instalar aplicativo / Adicionar à tela inicial**. O ERP abrirá em modo standalone, com ícone John ERP e sem a barra normal do navegador.

## API 1.5 recomendada
Com a API 1.5, tokens de usuário MASTER/ADMINISTRADOR também podem autenticar as rotas administrativas do ERP. Antes disso, a ativação funciona com a `ERP_API_KEY`, apenas em dispositivo confiável.
