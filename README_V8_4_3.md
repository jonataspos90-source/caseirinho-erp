# Caseirinho ERP V8.4.3 — Performance, Pedidos e Token ERP

Base: V8.4.2 Sync Mídia.

## Alterações
- Tela Pedidos voltou ao comportamento visual anterior (tabela com largura natural e rolagem horizontal interna), preservando todas as colunas e integrações financeiras existentes.
- Apenas a área de ações foi compactada: Pedido, Separação, WhatsApp, Editar, Ver conta e Excluir continuam disponíveis.
- Pull incremental deixou de rodar a cada 600 ms e passa a 15 s; gravações continuam disparando sincronização imediata.
- Consulta automática de pedidos online deixou 450/650 ms e passa a 5 s, com deduplicação/coalescência já existente.
- Foco da janela ganhou throttle de 8 s para evitar rajadas de sincronização.
- Geração de token ERP agora usa `replaceActive:true`: tokens anteriores do mesmo usuário são revogados.
- Tokens revogados permanecem como histórico e não recebem mais botão de reativação na interface.
- Navegadores com token revogado, ao receber 401/403 administrativo, limpam somente a credencial/ativação e exibem novamente "Ative este dispositivo". A base `pcp_app_v1` não é apagada.
- Service Worker recebeu nova chave de cache V8.4.3.

## API
Não foi necessária mudança de backend: a API 1.9.3 atual já suporta `replaceActive` na geração de token.
