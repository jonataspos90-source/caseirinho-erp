# John Sistema ERP V8.6.1

- Sincronização multiusuário incremental por dispositivo/aba sem baixar o espelho completo a cada abertura.
- Pedidos de E-commerce usam feed incremental; reconciliação completa foi reduzida para evitar tráfego excessivo.
- Removida consulta redundante de pedidos da camada antiga no início do ERP.
- Mantidas as funções V8.6.0: CEP/Frete integrado, regras por cidade/bairro/CEP, categoria obrigatória de E-commerce, descrição, LGPD, Pricing independente, Acessos e Segurança, PIX e demais integrações.
- A ativação inicial de um novo dispositivo ainda pode baixar o espelho completo, pois é necessária para montar a base local pela primeira vez.
