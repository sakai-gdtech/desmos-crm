# Automações e personalização de pipeline — demonstração

Pedido do usuário em 01/10/2026: configurar automações próprias de cada pipeline, como enviar email ou WhatsApp ao entrar em Proposta, e ter personalização granular por etapa. Esclarecimento explícito: nesta entrega, os envios são exemplos para apresentar; a prioridade é o funcionamento visual, sem conectar serviços externos.

## Entrega da demonstração

- Rota `/sales/automations`, acessível em Configurações → Automações e na configuração de cada pipeline.
- Seleção de pipelines reais da empresa; regras de exemplo próprias por pipeline, com dois modelos iniciais de email e WhatsApp.
- Criar/editar nome, etapa de entrada, canal, assunto, mensagem, valor mínimo, prazo e estado ativo/pausado.
- Variáveis de contato, empresa e negociação, prévia com personagem e oportunidade fictícios e teste manual simulado.
- Personalização de campos obrigatórios por etapa: valor, contato, previsão de fechamento e próxima atividade. Estes requisitos são exemplos e não bloqueiam a movimentação real do Kanban.
- Exemplos salvos no navegador com chave por empresa e pipeline. Não são compartilhados com outras pessoas, outros navegadores ou dispositivos.
- Nome, ordem, cores, probabilidades, dias sem avanço e exigência de próxima atividade continuam na configuração existente de pipelines, persistida pela API.

Não há disparo automático real, fila de mensagens, provedor de WhatsApp, email comercial, histórico real de execução, retentativas ou aplicação backend dos novos campos obrigatórios. A ação de simular não chama um endpoint de envio. Os exemplos não modificam negociações nem criam atividades comerciais reais. A interface informa a demonstração no título e no texto de orientação.

## Direction contract

**THESIS:** uma regra deve ser compreendida como Quando → Condição → Ação, sempre vinculada a um pipeline, e não como uma configuração global que surpreende o vendedor.

**OWN-WORLD:** herdar o sistema aprovado Desmos de superfícies claras, azul profundo, dourado fosco e tipografia operacional. Nada de uma segunda identidade para automações.

**STORY:** escolher um funil, editar a regra, ler a mensagem como o cliente a receberia e testar uma simulação; escolher uma etapa para definir seus requisitos de exemplo.

**FIRST VIEWPORT:** pipeline e abas no topo; regras à esquerda, construtor no centro e prévia à direita. Mobile preserva a ordem regras → construtor → prévia, com controles nativos e rolagem da página.

**FORM:** extensão precisa em modo Operate; propósito, estados e composição fixados pelo pedido e pelo exemplo de proposta do usuário. Não substitui a direção global.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Evolução para envio real

O backend deverá persistir regras por tenant/pipeline/etapa, avaliar condições na transição, publicar execução em outbox na mesma transação, deduplicar o disparo e controlar retentativas, cancelamento e logs. Regras não devem disparar com eventos de outra empresa. Email e WhatsApp exigem conexão explícita com os serviços escolhidos antes de serem anunciados como envio real. Campos obrigatórios devem ser validados também pela API na movimentação.
