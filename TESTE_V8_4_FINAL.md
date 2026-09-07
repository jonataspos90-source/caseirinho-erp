# Validação final — John ERP V8.4

Data da validação: 07/09/2026

## Testes automatizados executados
- 88 blocos JavaScript inline do ERP validados individualmente com `node --check`: **0 erros de sintaxe**.
- Service Worker do ERP validado com `node --check`: **0 erros de sintaxe**.
- HTML estático: **724 IDs e nenhum ID duplicado**.
- HTML estático: **nenhum nó de texto literal `\\n`/`\\r` fora de scripts/estilos**.
- Execução do ERP em navegador headless por mais de 13 segundos: corrigidos dois erros antigos de `insertBefore` causados pela reorganização do menu e uma recursão de wrappers de relatório que podia gerar `Maximum call stack size exceeded`.
- Reexecução após as correções: **nenhum erro de `insertBefore`, nenhum estouro de pilha e nenhum erro JavaScript crítico** no ciclo de inicialização testado.
- Criação dinâmica confirmada das páginas V8.4: Manutenção de Produtos, Manutenção de Ficha Técnica, Planejamento de Estoque/Produção, Produtos Online e Token / Links / Acesso.
- Menu Configuração validado com somente **Configurações**.
- Menu Margem Ideal validado sem contador no rótulo.
- Filtro Origem em Pedidos de Clientes validado com **Todos / ERP / E-commerce**.
- Renderização sintética da Manutenção de Produtos e do Planejamento de Estoque/Produção executada com dados de teste.

## Regras críticas verificadas no código final
- Rejeitar/cancelar pedido do E-commerce não executa exclusão física da fila.
- Catálogo é publicado com `replaceCatalog:false` e exclusões vazias por padrão, preservando itens online entre versões.
- Antes de publicar, imagens existentes no catálogo da nuvem são reutilizadas quando o registro local chegar temporariamente sem imagem.
- A tela Produtos Online lê o catálogo público diretamente da API para mostrar o que realmente está disponível ao cliente.
- Tokens podem ser testados, trocados, gerados, revogados e reativados; geração administrativa é restrita a MASTER/ADMINISTRADOR.
- Telas extensas mantêm overflow dentro da tabela e evitam deslocar o ERP inteiro horizontalmente.
- Cache PWA do ERP identificado como V8.4 FINAL.

## Teste obrigatório após publicação
A validação local não substitui a prova multi-dispositivo no ambiente real. Após publicar, testar simultaneamente em pelo menos 2 aparelhos usando a mesma API/PostgreSQL:
1. Alterar cadastro em um aparelho e conferir o outro.
2. Publicar/despublicar produto e conferir a Loja.
3. Rejeitar pedido novo e confirmar REJEITADO em ambos.
4. Cancelar pedido já aceito e confirmar CANCELADO em ambos sem sumir a fila.
5. Trocar token em um dispositivo e confirmar que os demais continuam ativos.
6. Abrir Produtos Online e conferir preço, disponibilidade e imagem (inclusive Coxinha).
