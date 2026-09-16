# John Sistemas · Arquitetura ERP / API / Loja

Os três componentes são publicados em repositórios separados e trabalham integrados.

## ERP
- Repositório: `jonataspos90-source/caseirinho-erp`
- Front-end/PWA administrativo.
- Motor Comercial e Central Gerencial ficam visíveis como módulos centrais do ERP.
- Consome a John Cloud API e publica alterações do catálogo/e-commerce.

## API
- Repositório: `jonataspos90-source/john-cloud-api`
- Produção: `https://john-cloud-api-production.up.railway.app`
- Railway: projeto `John ERP Cloud`, serviço `john-cloud-api`.
- Responsável por PostgreSQL, catálogo, pedidos, mídia, uso online, Motor Comercial e Central Gerencial.

## Loja / App do cliente
- Repositório: `jonataspos90-source/caseirinho-loja`
- Front-end/PWA do e-commerce.
- Lê catálogo e regras comerciais pela API.
- Cross-sell, upsell, combos, cupons, fidelidade, capacidade, avaliações, CEP/frete e histórico dependem da API.

## Fluxo
`ERP -> API/PostgreSQL -> Loja/App`

Eventos de cliente e pedidos retornam no sentido:
`Loja/App -> API/PostgreSQL -> ERP`

## Imagens
As fotos reais devem ser preservadas no catálogo/mídia da API. O ERP V8.22.1 carrega também o reparo profundo `catalog-deep-recovery-v8-18-1.js`, que usa `/api/v1/admin/store/media/repair-from-erp` para recuperar imagens ainda existentes nos registros ERP e religá-las ao catálogo.

## Uso online
O painel deve separar:
- ERP ativos agora
- ERP App/PWA agora
- ERP navegador agora
- Loja/App PWA agora
- Loja/App navegador agora

A regra de online é atividade/ping recebida nos últimos 5 minutos.
