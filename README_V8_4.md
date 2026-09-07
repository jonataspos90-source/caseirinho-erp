# John Sistema ERP — V8.4 Correção Operacional

Data: 07/09/2026

## Objetivo
Esta versão concentra correções operacionais de estabilidade, usabilidade e integração do John ERP com o E-commerce. A API em produção permanece na linha 1.9.1/schema 9; este pacote atualiza o frontend do ERP.

## Correções principais
- Manutenção de Produtos reconstruída em tela compacta, com edição rápida e acesso ao cadastro completo.
- Manutenção de Ficha Técnica reconstruída com rendimento, unidade, mínimo de produção, dia, antecedência, regra, custo adicional, status e edição completa.
- Planejamento de Estoque/Produção reconstruído com estoque atual, estoque mínimo, pedidos em aberto, sugestão arredondada por lote mínimo e programação.
- Margem Ideal sem contador no menu e com campo manual de margem em percentual, sem setas de incremento.
- Pricing com filtro real por tipo de produto e Precificação E-commerce com busca e filtro de tipo.
- Financeiro com reconstrução do menu para restaurar Fluxo de Caixa, Convênio, Aging, Contas a Pagar, Fluxo Projetado, Conciliação, Fechamento, Auditoria, Free-lance e Despesas.
- Configuração mantém apenas a tela Configurações no grupo correspondente.
- E-commerce ganhou Produtos Online para conferir o catálogo real da nuvem e Token / Links / Acesso.
- Publicação do catálogo usa fluxo seguro sem apagar produtos por ausência momentânea em uma versão. Imagens existentes na nuvem são preservadas quando o frontend local não as traz.
- Reparação de imagens armazenadas consulta mídias existentes no PostgreSQL e recompõe o vínculo local antes da publicação.
- Token pode ser testado, trocado, gerado por MASTER/ADMINISTRADOR, revogado e reativado.
- Pedidos do E-commerce são cancelados/rejeitados sem exclusão física da fila ou histórico.
- Chaves antigas de configuração de token são normalizadas para a chave canônica para reduzir divergência entre aparelhos.
- Pedidos de clientes mantêm filtro de origem Todos / ERP / E-commerce.
- Telas compridas passam a manter o scroll horizontal dentro da tabela e usam espaçamentos compactos.
- Removidos artefatos de texto literal \\n que apareciam no canto da interface.
- Chevron do E-commerce padronizado com os demais módulos.

## Validações executadas antes do empacotamento
- Sintaxe dos três scripts V8.4 validada com `node --check`.
- Sintaxe dos Service Workers ERP e Loja validada.
- Estrutura HTML analisada sem IDs estáticos duplicados e sem nós de texto literal `\\n` fora de scripts/estilos.
- IDs dos patches V8.4 presentes uma única vez no HTML final.
- Presença dos novos módulos, filtros, rotas de ação e caches V8.4 validada por inspeção automatizada.

## Validação operacional recomendada após publicação
Fazer teste simultâneo em pelo menos dois dispositivos reais: alteração de cadastro, publicação de produto, rejeição/cancelamento de pedido, geração/troca de token e atualização do catálogo. Esse teste final depende do ambiente publicado e da mesma base PostgreSQL utilizada pelos aparelhos.

## Correções adicionais da validação final
- Corrigidos dois pontos legados que usavam `insertBefore` assumindo a estrutura antiga do menu e podiam quebrar após a reorganização em módulos.
- Corrigido um wrapper recursivo de Relatório de Entradas que podia gerar `Maximum call stack size exceeded` após múltiplos patches de versão.
- Service Worker do ERP atualizado definitivamente para cache V8.4 FINAL.
- Pacote da Loja passa a levar os ícones PWA que já eram referenciados no HTML, evitando ícones quebrados na instalação do aplicativo.
