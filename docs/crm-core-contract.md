# CRM Core — contrato da Fase 2

Implementação incremental autorizada em 01/10/2026. Marca Desmos; cada conta continua vinculada a uma única empresa cliente do SaaS. `companies` representa organizações atendidas comercialmente por esse cliente, não novos ambientes do SaaS.

## Superfícies e fluxos

Listas próprias de Leads, Contatos e Empresas clientes, com pesquisa, filtros, ordenação e paginação. Cadastro/edição em página própria. Detalhe com dados, tags, responsável, notas e timeline estruturada. Lixeira separada para restaurar registros. Conversão de lead cria ou associa contato e, opcionalmente, empresa cliente dentro de uma transação; oportunidades entram na Fase 3.

Preservar o sistema de design existente: interface operacional, listas densas, cabeçalho com uma ação principal, ícones Lucide, tokens claro/escuro e mobile. Não exibir indicadores, negócios, tarefas ou integrações ainda inexistentes.

Na identificação estática do ambiente no menu, mostrar somente o nome da empresa e seu ícone. O usuário pediu a retirada do rótulo redundante “Sua empresa”.

## Contrato REST

Todas as rotas exigem sessão e extraem tenant do contexto. Prefixo `/crm` (frontend acessa `/api/crm`). Datas ISO, valores monetários como string decimal. IDs UUID; sem `tenantId` aceito no payload.

- `GET /crm/:kind`, onde kind = `contacts|companies|leads`. Query: `q`, `page` (1), `pageSize` (20, máximo 100), `sort` (`createdAt|name|updatedAt`, padrão updatedAt), `order` (`asc|desc`), `status`, `assignedTo`, `tagId`, `companyId`, `source`, `temperature`, `deleted` (`true` para lixeira). Retorno `{items,total,page,pageSize}`.
- `POST /crm/:kind` → 201 `{item,duplicates:[]}`; `GET /crm/:kind/:id` → `{item}`; `PATCH /crm/:kind/:id` → `{item,duplicates:[]}`. Duplicidade por email/telefone normalizados gera alerta informativo sobre registros ativos do mesmo tenant e tipo; cada duplicata identifica o registro e os campos em `matchedBy`. Não mistura ou sobrescreve cadastros automaticamente.
- `DELETE /crm/:kind/:id` → 204, soft delete; `POST /crm/:kind/:id/restore` → `{item}`; `DELETE /crm/:kind/:id/permanent` → 204, apenas registro na lixeira e permissão administrativa, com confirmação explícita na interface.
- `GET /crm/assignees` → `{items:[{id,name}]}` com membros ativos da própria empresa, disponível a quem consulta o CRM.
- `GET /crm/tags` → `{items:[{id,name,color}]}`; `POST /crm/tags` `{name,color}` → `{item}`; `PATCH /crm/tags/:id` e `DELETE /crm/tags/:id`.
- `GET /crm/:kind/:id/timeline?page=1&pageSize=20` → `{items,total,page,pageSize}`; cada evento `{id,type,actorName,createdAt,metadata}`. Tipos incluem `created`, `updated`, `deleted`, `restored`, `converted`, `note.created`, `note.updated`, `note.deleted`.
- `GET /crm/:kind/:id/notes` → `{items}`; `POST` no mesmo caminho `{body,pinned?,mentionIds?}` → `{item}`; `PATCH /crm/:kind/:id/notes/:noteId` e `DELETE` equivalente. Nota `{id,body,pinned,mentionIds,authorName,createdAt,updatedAt}`; texto simples, sem HTML executável. Menções não enviam notificações nesta etapa.
- `POST /crm/leads/:id/convert` `{contactId?,companyId?,createCompany?:boolean}` → `{lead,contact,company}`. Sem contactId, cria contato; createCompany usa companyName do lead; conversão repetida retorna o mesmo resultado sem duplicar registros. Recusar contato/empresa excluídos ou de outro tenant.

## Dados

Campos comuns: `id,name,email,phone,assignedTo,assignedToName,tags:[{id,name,color}],source,description,createdAt,updatedAt,deletedAt,version`. Criações podem enviar `tagIds`; patches exigem `version` para evitar perda silenciosa de edição. Exclusão e restauração usam lock transacional.

O histórico de edição registra somente mudanças efetivas, comparando datas, valores monetários e conjuntos de tags normalizados. Relações guardam `beforeLabel`/`afterLabel` legíveis além dos IDs, e a auditoria mantém o estado anterior completo. Renomear ou remover uma tag incrementa a versão dos registros associados e registra evento `updated` com `metadata.tagAction` e alterações em `tags`.

Contatos: `lastName,whatsapp,jobTitle,companyId,companyName,address,city,state,country,birthday`.

Empresas clientes: `legalName,taxId,website,segment,employeeCount,address,city,state,country`.

Leads: `companyId,companyName,jobTitle,status` (`NEW|CONTACTED|QUALIFIED|DISCARDED|ARCHIVED|CONVERTED`), `temperature` (`COLD|WARM|HOT`), `estimatedValue`, `discardReason`, `lastContactAt`, `nextContactAt`, `convertedContactId`, `convertedCompanyId`. Apenas conversão define CONVERTED; descarte exige motivo. Origem é texto limitado, com sugestões na UI e suporte a valor personalizado.

## Permissões e integridade

`contacts|companies|leads.view/create/update/delete` e `leads.convert`, `tags.manage`, `crm.purge`. OWNER/ADMIN: todas; MANAGER: todas exceto purge; SALES: view/create/update/convert e tags.manage, sem exclusão; SUPPORT: view/update de contatos/empresas e leads.view; VIEWER: somente leitura. Notas usam a permissão update da entidade. Lixeira visível somente para quem tem delete ou purge. Restauração exige delete.

Filtrar todas as consultas pelo tenant; novas tabelas comerciais recebem RLS forçada com contexto transaction-local, FKs compostas para referências e índices por tenant. Validar responsável ativo da empresa. Evento e auditoria são gravados na mesma transação da mutação; referências de outro tenant retornam 404. Tabelas/migration e schema Drizzle representam as mesmas relações.

O armazenamento físico utiliza `crm_records` com discriminador `kind` para contatos, empresas clientes e leads, mantendo os campos tipados e as relações específicas de cada espécie. Isso oferece uma chave referenciada por notas, tags e eventos, sem associações polimórficas órfãs. FKs compostas incluem tenant e, quando necessário, espécie; as rotas e DTOs permanecem separados por entidade. Tabelas complementares: `crm_tags`, `crm_record_tags`, `crm_notes`, `crm_note_mentions` e `crm_events`.

Exclusão definitiva é manual nesta fase e bloqueada quando houver referências comerciais, inclusive de registros na lixeira. Conversão para contato existente preserva seus dados; se um destino de uma conversão anterior foi excluído, a repetição não revela o conteúdo da lixeira. Política configurável de retenção e limpeza agendada serão incorporadas à evolução administrativa; não existe descarte automático de registros nesta entrega.

## Verificação e dados de demonstração

Testar isolamentos de listagem, detalhe, contagem, escrita, associação, notas, tags, timeline, conversão e lixeira; RLS sem contexto; permissões por papel; conversão concorrente/idempotente; versão concorrente; duplicidade normalizada; soft delete/restore/purge. Seed local idempotente com 20 empresas clientes, 60 contatos e 30 leads na Nexa, identificados como demonstração na documentação. Não cadastrar oportunidades ainda.
