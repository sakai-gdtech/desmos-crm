# Vendas — contrato da Fase 3

Extensão incremental autorizada pelo usuário em 01/10/2026. Preservar Desmos, uma empresa por conta, sistema Operate de DESIGN.md. Não reabrir a identidade visual. Primeiro viewport: pipeline escolhido, colunas com quantidade/valor por moeda e oportunidades reais. Arrastar move a etapa; alternativa por botão/select atende teclado e touch. Formulários, detalhes, notas e histórico seguem os padrões CRM existentes.

## API

Todas as rotas em `/sales`, acessadas como `/api/sales` pelo frontend. Tenant somente da sessão; autorização atualizada dentro da transação, RLS forçada e FKs compostas. Valores monetários strings decimais. Patch exige version; conflito retorna 409.

- Pipelines: GET/POST `/pipelines`, GET/PATCH/DELETE `/pipelines/:id`. DTO `{id,name,description,active,version,stages:[{id,name,position,probability,color,staleDays,requireActivity}],createdAt,updatedAt}`. Criação recebe etapas ordenadas sem id. Patch recebe etapas ordenadas com id para existentes e sem id para novas; remoção de etapa referenciada retorna 409. Delete somente pipeline sem negócios, incluindo lixeira. Arquivar não apaga histórico.
- GET `/board?pipelineId=&q=&assignedTo=&status=OPEN`: `{pipeline,columns:[{stage,items,total,totals:[{currency,value}]}]}`. Máximo 100 registros por coluna, com indicação de mais resultados. Listagem paginada permite acessar os demais. Sem somar moedas diferentes.
- Deals: GET/POST `/deals`, GET/PATCH/DELETE `/deals/:id`, POST `/deals/:id/restore`, GET `/deals/:id/timeline`, CRUD `/deals/:id/notes`. Campos: title,pipelineId,stageId,contactId?,companyId?,leadId?,value,currency,probability?,expectedCloseDate?,assignedTo?,source?,temperature,tagIds?,status OPEN/WON/LOST,lostReason?,description. Movimentação registra snapshots das etapas, muda stageEnteredAt e herda a probabilidade da etapa quando não informada explicitamente. Ganho/perda guarda timestamps. Reabrir é explícito via patch status OPEN.
- POST `/leads/:id/convert`: campos da conversão CRM e `opportunity:{title,pipelineId,stageId,value?,currency?,expectedCloseDate?}`. Conversão e criação da oportunidade na mesma transação, repetição retorna o mesmo negócio. Contato existente preservado.
- Work: GET/POST `/activities` e `/tasks`, GET/PATCH/DELETE `/:kind/:id`, POST `/:kind/:id/restore`. Referências contactId/companyId/leadId/dealId, title,description,assignedTo,tagIds. Activities: type CALL/EMAIL/WHATSAPP/MEETING/NOTE/TASK/VISIT/OTHER,scheduledAt,status PLANNED/COMPLETED/CANCELED,duration?,result?,followUpAt?. Tasks: dueAt,priority LOW/MEDIUM/HIGH/URGENT,status TODO/IN_PROGRESS/DONE/CANCELED,checklist:[{title,done}]. Follow-up cria uma tarefa vinculada uma única vez por atividade.
- Listas: q,page,pageSize (20, até 100), assignedTo,dealId,contactId,companyId,leadId, status, deleted, bucket today/upcoming/overdue/completed/all, pipelineId (deals). Timeline e notas têm o mesmo DTO usado no CRM Core.

## Papéis

OWNER/ADMIN/MANAGER gerenciam pipelines e todo o módulo; SALES cria/edita/move/fecha negociações, atividades e tarefas, sem exclusão nem configuração de pipelines. SUPPORT consulta negócios e cria/edita atividades/tarefas. VIEWER somente consulta. Permissões `pipelines.view/manage`, `deals.view/create/update/delete`, `activities.view/create/update/delete`, `tasks.view/create/update/delete`.

## Evidência e limites

Seed local idempotente: pipeline de Vendas, 20 oportunidades fictícias, tarefas e atividades relacionadas. Testar isolamento em listagem/contagem/detalhe/escrita/referências, RBAC, movimento concorrente, ganho/perda/reabertura, conversão idempotente/rollback, tarefas e RLS. Capturas desktop/mobile/escuro, detector uma vez e revisão independente Impeccable. Atividades de email/WhatsApp registram a interação; não enviam mensagens externas. Integrações e notificações pertencem às fases posteriores.
