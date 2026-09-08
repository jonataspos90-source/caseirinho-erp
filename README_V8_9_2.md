# John Sistema ERP V8.9.2

Versão de estabilização do E-commerce.

## Principais correções
- Consulta de CEP passa a priorizar a API Cloud, com fallback para ViaCEP, e inicia automaticamente ao completar 8 números.
- Cadastro de frete aceita Cidade exata, Bairro exato, CEP exato, Prefixo de CEP, Faixa de CEP e Raio em KM.
- Bairro deixa de usar correspondência parcial.
- Publicação das regras de frete inclui os novos campos de faixa e raio.
- Rejeição do pedido pede uma mensagem específica para o cliente e envia ao App.
- Produtos Online ganha o botão **Auditar categorias** para comparar cadastro e publicação.

## Compatibilidade
Requer John Cloud API 1.13.2 ou superior para usar todos os recursos desta versão.
