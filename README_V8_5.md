# V8.5.0 — Estabilidade operacional, multiusuário e Pricing independente

## Mudanças principais
- Pedidos voltou ao layout canônico de 13 colunas e não é mais reconstruído quando os dados não mudaram.
- Removido reset automático de rolagem/posição da tabela de Pedidos.
- Sincronização multiusuário usa cursor por aba (sessionStorage), evitando que duas pessoas no mesmo PC “roubem” o cursor uma da outra.
- Pull incremental visível a cada 4 s + aviso imediato entre abas via BroadcastChannel.
- Preço E-commerce é independente do preço ERP; o catálogo sempre publica `precoEcommerce`.
- Pricing do E-commerce não possui mais modo “Replicar do ERP”.
- Pricing de Produtos mantém apenas o filtro Tipo de produto.
- Manutenção de Margem aceita digitação natural com vírgula/ponto e Delete/Backspace sem re-render durante a edição.
- Novo Configuração > Acessos e Segurança: usuário, navegador/SO, último uso, token/fingerprint, reset por navegador, token exclusivo por navegador, saúde do E-commerce e logs.
- Save genérico não republica catálogo e não executa renderização completa do ERP.
- Espelhamento completo automático desativado; operação normal usa incremental.

## Regra de preço
`Preço ERP` é apenas referência. `Preço E-commerce` é a fonte oficial para a Loja e não é alterado quando o preço ERP muda.

## Publicação
Nesta versão, somente o ERP precisa ser atualizado. A Loja V8.4.4 permanece compatível porque já consome o campo `preco` do catálogo público. A API 1.9.4 já possui `/api/v1/admin/sync/changes`, `/sync/batch` e administração de tokens necessários.
