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

## Extensão da apresentação — A–D

A navegação comercial usa Negócios como nome do Kanban e preserva URLs existentes. Clique comum abre detalhe em drawer; abertura em nova aba continua disponível. O formulário rápido cria tarefa real vinculada ao negócio. Ganho exige confirmação explícita do valor final.

Rotas adicionais, sempre no tenant da sessão:

| Rota | Permissão e comportamento |
| --- | --- |
| GET `/dashboard?pipelineId=` | `deals.view`; totais por moeda, contagens, Radar até 20 negócios e 10 tarefas. Tarefas exigem também `tasks.view`. Sem período selecionável; considera todos os registros não excluídos. |
| GET `/products` | `deals.view`; catálogo da empresa. |
| POST `/products`, PATCH `/products/:id` | `pipelines.manage`; nome, preço decimal e moeda. PATCH exige versão atual; conflito 409. |
| GET `/deals/:id/proposal` | `deals.view`; proposta salva ou item nulo. |
| PUT `/deals/:id/proposal` | `deals.update`; negócio aberto, versão 0 para nova proposta, versão atual para edição. Itens de 1 a 30, quantidade inteira positiva, preço decimal, desconto absoluto não superior ao subtotal. Total limitado a numeric(16,2). |
| GET/PATCH `/pipelines/:id/demo-automation` | `pipelines.manage`; configuração e últimas dez execuções. Exclusivo do fixture fora de produção; PATCH recebe enabled booleano. |

A proposta guarda nome do cliente e snapshots dos itens/preços, moeda do negócio e versão. Referências de produto exigem tenant e moeda compatíveis. Atualiza o valor e a versão do negócio atomicamente; gera evento e auditoria. Modificação posterior do catálogo não altera o snapshot. Negócio fechado exige reabertura para editar proposta. PATCH do negócio que diverge do total ou da moeda da proposta retorna 409 `PROPOSAL_VALUE_MISMATCH`.

O dashboard soma separadamente por moeda; sem próxima ação significa negócio aberto sem tarefa/atividade futura pendente. Tarefa vencida não conta como ação futura. Negócios parados obedecem staleDays da etapa. As contagens consideram todos os registros elegíveis, mesmo quando a lista do Radar atinge o limite.

Regra única de apresentação: transição de negócio aberto para etapa com nome Proposta cria tarefa de follow-up real, se o pipeline demo estiver habilitado. Não dispara na criação inicial já em Proposta. Execução e tarefa são transacionais e únicas por tenant/negócio, inclusive em concorrência ou retorno à etapa. Pode ser pausada na interface. Envio de email/WhatsApp continua apenas simulado no navegador. Produtos/propostas não incluem PDF, assinatura, validade ou aceite externo.
