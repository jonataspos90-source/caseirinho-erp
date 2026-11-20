# John Sistemas — Empresa parceira de cosméticos (revenda com estoque próprio)

> **Projeto de implantação, não liberado para vendas.**
> Nenhuma mudança no tenant existente `john-default`, nem em cadastros, pedidos, pagamentos ou DRE do Caseirinho.
> Nome da marca, CNPJ, responsável financeiro, conta PIX e dados fiscais ainda não foram informados/confirmados.

## Modelo de negócio
A empresa parceira compra seus produtos, mantém estoque próprio e os revende em uma loja independente. 
A Central John Sistemas funciona como plataforma de administração multiempresa, **não** como base financeira única.

- **Empresa 1:** `caseirinho` — alimentação, regras de encomenda, produção e cashback atuais.
- **Empresa 2:** tenant novo (slug provisório `cosmeticos-parceira`), vertical `COSMETICOS`; ainda **não criado em produção**.
- **Gestão:** mesmo portal administrativo, autenticação separada por empresa e permissão explícita de suporte/gestão pelo proprietário da plataforma.
- **Loja:** repositório e endereço web próprios; jamais importar automaticamente banco/carrinho dos clientes Caseirinho.
- **Não misturar:** nome fantasia, CNPJ emissor, PIX, Mercado Pago, estoque, compras, lotes, preços, pedidos, clientes, cashback, cupons, fretes, DRE, notas fiscais e arquivos de imagem.
- **Visão consolidada:** apenas relatório agregado autorizado, com origem por empresa e separação dos saldos contábeis.

## Arquitetura proposta
```text
Central John Sistemas (portal de gestão multiempresa)
  ├── Caseirinho (tenant john-default, /?empresa=caseirinho)
  │     └── Loja Caseirinho [repositório e domínio atuais]
  └── Cosméticos (tenant novo, /?empresa=cosmeticos-parceira)
        └── Loja de Cosméticos [novo repositório/domínio independente]
                       |
            API John Cloud, sessão exclusiva da empresa
                       |
             PostgreSQL (tenant_id + RLS forçado)
                  ├── catálogo, preço, clientes, pedidos
                  ├── ERP compras, entradas, estoque, vendas
                  ├── lotes, datas de validade, custo médio
                  └── financeiro, caixa, DRE, relatórios
```

Não usar token, cookie, localStorage ou nome de usuário do Caseirinho na nova loja. O parâmetro `empresa` identifica apenas a loja pública: **a API determina a empresa pelo token assinado**, nunca por campo editável enviado pelo cliente.

## Módulos por prioridade

### Módulos mínimos antes da primeira venda (P0)
1. **Empresa e permissões:** tenant isolado; MASTER e operador da loja; responsável plataforma pode acessar apenas via suporte autorizado.
2. **Identidade e configuração:** marca, logo, cores, endereço, contatos, política de troca, política de privacidade e comunicação ao consumidor.
3. **Fornecedores e compras:** fornecedor, pedido de compra, recebimento, custo unitário, impostos e despesas de aquisição.
4. **Catálogo por SKU:** família, marca, linha, cor/tonalidade, fragrância, volume, GTIN/EAN, NCM (quando aplicável), fotos e situação regulatória.
5. **Lotes e validade:** cada recebimento cria lote; saldo disponível; alerta próximo da validade, lote bloqueado e saída com rastreabilidade.
6. **Precificação:** custo de entrada + impostos/encargos + embalagem/taxas + margem; preço por SKU.
7. **Loja e carrinho:** categorias, busca, favoritos, combos, carrinho e checkout por empresa, sem misturar histórico de clientes.
8. **Pedido, pagamento e entrega:** PIX/gateway da empresa, reservas e baixa de estoque idempotente, retirada/entrega, faturamento e devolução.
9. **Financeiro separado:** caixa, contas a pagar/receber, DRE mensal, CMV, conciliação e relatórios.
10. **Segurança:** RLS, logs, permissões por ação, prevenção de pedidos duplicados, backup, monitoramento e testes de isolamento.

### Segunda fase (P1)
- Ofertas, cupons e kits de beleza que reservam o estoque de cada SKU.
- CRM, recompra, cashback com regras próprias e autorização de mensagens.
- Estoque mínimo/máximo, curva ABC, giro, cobertura e produtos próximos do vencimento.
- Comissão de parceiros/vendedores, se houver contrato de prestação de serviços.
- Relatórios por marca, fornecedor, categoria, tonalidade e rentabilidade.

### Terceira fase (P2)
- Sugestões personalizadas, clube de fidelidade, pedidos recorrentes quando apropriado.
- Integração fiscal/contábil com emissão em nome da empresa vendedora.
- Indicadores comparativos multiempresa sem exposição de dados entre empresas.

## Esquema de dados recomendado
Manter as tabelas genéricas existentes com `tenant_id`, protegidas por RLS. Não clonar tabelas comuns por marca.
Campos específicos permanecem em payloads compatíveis com ERP e, para operações transacionais, usar tabelas especializadas:

- `cosmetic_product_variants`: tenant_id, sku, product_id, cor, tonalidade, fragrancia, volume, marca, gtin, status_regulatorio.
- `cosmetic_stock_lots`: tenant_id, id, sku, lote, validade, recebido_em, quantidade_recebida, quantidade_disponivel, custo_unitario, bloqueado, fornecedor_id, nf_entrada.
- `cosmetic_stock_movements`: tenant_id, id, sku, lote_id, tipo, quantidade, referencia, ocorrido_em, usuario_id, chave_idempotencia.

**Sem movimento físico sem pedido ou documento:** venda reserva item; confirmação operacional emite saída; cancelamento estorna; devolução registra entrada correspondente e conserva vínculo ao lote.
**Sem overselling:** confirmação e reserva de lotes em transação com lock `FOR UPDATE`, sempre verificando tenant e saldo.
**Sem registro duplicado:** índice único por empresa + chave idempotente de operação.
**Sem itens vencidos:** regra da API consulta lote válido e saldo; frontend apenas exibe o resultado. 
Regras fiscais e permissões sanitárias devem ser confirmadas para o estabelecimento antes da abertura comercial.

## Primeira etapa de implantação — segura
- [x] Análise do multi-tenant existente na API e ERP.
- [x] RLS presente e forçado em tabelas comerciais existentes.
- [x] Criada branch técnica isolada `feature/cosmeticos-revenda-fundacao` na API e Central.
- [x] Contrato de SKU/lote/cadastro e checagem de elegibilidade de venda criado em branch de teste.
- [x] Endpoint público de loja inexistente configurado para falhar com 404 (branch; não afetou produção).
- [ ] Criar novo repositório privado `cosmeticos-loja` e implantar a loja em domínio separado.
- [ ] Confirmar marca comercial, dados fiscais, checkout, proprietário legal e permissões da parceria.
- [ ] Criar tenant dedicado via mecanismo seguro de plataforma (loja nasce **desativada** e vazia).
- [ ] Criar MASTER da empresa com token de bootstrap individual (jamais fornecer token do Caseirinho).
- [ ] Importar apenas cosméticos autorizados, sem copiar produtos ou pessoas do Caseirinho.
- [ ] Homologar estoque, compra, pedido, entrega, devolução, pagamentos e isolamentos em teste antes de habilitar vendas.

## Critérios de aceite da separação
1. Token da empresa Cosméticos jamais lê/escreve pedido, cliente, saldo, promoção ou caixa do Caseirinho; o inverso idem.
2. Slug desconhecido retorna 404 em todas as rotas públicas e não cai na empresa padrão.
3. A Central exige autenticação e não permite simples troca da URL para acessar dados de outra empresa.
4. SKU com lote vencido, bloqueado ou sem saldo não pode ser vendido; política deve estar no servidor.
5. Pedido e pagamento não criam baixa duplicada; cada movimento tem auditoria e transação.
6. Loja cosméticos começa fechada, sem aceitar pedidos ou cobrança até homologação.
7. Testes das duas empresas continuam passando antes e depois de cada implantação.
