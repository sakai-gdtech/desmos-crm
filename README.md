# Desmos CRM

CRM SaaS para **empresas clientes independentes**, construído em fases. Cada empresa possui um ambiente isolado e cada conta pertence a uma única empresa. Esta versão entrega **fundação, CRM Core e Vendas**: identidade, equipe, permissões, cadastros comerciais, pipelines, oportunidades, Kanban, atividades, tarefas, notas, timeline e lixeira. Gestão comercial e os demais módulos seguem no [roadmap](docs/roadmap.md), com critérios de aceite por fase.

A referência funcional do núcleo comercial é o RD Station CRM. O [escopo do núcleo](docs/rd-core-scope.md) distingue recursos implementados e pendentes e registra a ordem das próximas entregas para a apresentação.

## Executar localmente

Requisitos: Node.js 22 ou superior, npm e Docker com Compose.

```bash
npm ci
npm run setup:env
npm run infra:up
npm run db:migrate
npm run db:seed
npm run dev
```

- Aplicação: http://localhost:3017
- API: http://localhost:4000
- Emails locais: http://localhost:8026
- Prontidão: http://localhost:4000/ready

`setup:env` cria `.env` com segredos aleatórios e não sobrescreve arquivo existente. O worker de emails inicia junto com `npm run dev`. O Compose local só publica serviços em `127.0.0.1`; seus volumes preservam dados entre reinícios. `npm run infra:down` encerra os containers sem excluir os volumes.

O seed cria duas empresas independentes. **Nexa Tecnologia** tem Ana (OWNER, `ana@nexa.com`), Felipe (MANAGER, `felipe@nexa.com`), Lucas e Mariana (SALES, `lucas@nexa.com` e `mariana@nexa.com`). **Horizonte Consultoria** tem Bruno Almeida (OWNER, `bruno@horizonte.com`). Ana acessa somente a Nexa; para conhecer a Horizonte, encerre a sessão e entre com a conta de Bruno. A senha de todas as contas de demonstração está em `DEMO_PASSWORD`, no `.env`. O seed é idempotente, não redefine senhas existentes e recusa execução em produção. Também é possível cadastrar uma conta pela interface.

Na Nexa, o seed da Fase 2 acrescenta **20 empresas clientes, 60 contatos e 30 leads fictícios**, com responsáveis, tags, notas e eventos de timeline. Empresas clientes são registros comerciais atendidos pela Nexa, não novos ambientes do SaaS. IDs estáveis evitam duplicação e registros existentes não são sobrescritos. A Fase 3 acrescenta um pipeline, **20 oportunidades, 12 atividades e 12 tarefas fictícias** relacionadas. Não cria propostas.

### Atualizar a demonstração anterior

Se a versão anterior já criou Ana com acesso à Nexa e à Horizonte, execute o seed atualizado **antes** da migração `0003`:

```bash
npm run db:seed
npm run db:migrate
npm run db:seed
```

O primeiro seed reconhece a associação de demonstração, cria Bruno como proprietário da Horizonte, remove somente o vínculo legado de Ana com essa empresa e revoga suas sessões da Horizonte. Os dados das empresas permanecem. Qualquer outra conta com mais de uma associação bloqueia a migração para resolução explícita; a migração não escolhe uma empresa nem remove vínculos automaticamente. O seed preenche CRM e Vendas após as migrações `0004` e `0005`. Em uma instalação nova, use a ordem normal de migração e seed apresentada acima.

## O que funciona nesta etapa

- Cadastro transacional de usuário, empresa e associação OWNER.
- Login/logout, JWT curto, refresh opaco rotativo e armazenado com hash, revogação de sessão e detecção de replay.
- Recuperação de senha, verificação de email e convites por email com tokens de uso único.
- Uma empresa por conta, email de login único e ambiente da empresa validado pela sessão e membership.
- Convites não transferem contas já vinculadas a outra empresa, inclusive contas suspensas; o cadastro cria uma nova empresa com seu proprietário.
- Papéis OWNER, ADMIN, MANAGER, SALES, SUPPORT e VIEWER, com permissões granulares no servidor.
- Proteção do último proprietário, onboarding, configurações, perfil e sessões próprias.
- Gerenciamento de acessos e auditoria administrativa por empresa.
- Cadastro, consulta e edição de contatos, empresas clientes e leads; listas com busca, filtros, ordenação e paginação.
- Responsáveis da própria equipe, tags e alertas de possíveis duplicados por email ou telefone normalizado. O alerta considera o mesmo tipo de registro e tenant e permite salvar, sem mesclar nem sobrescrever cadastros.
- Notas de texto simples, fixação e menções a membros ativos, com histórico e timeline estruturada. Menções ainda não enviam notificações.
- Conversão transacional e idempotente de lead em contato e, opcionalmente, empresa cliente e oportunidade; permite associar registros existentes.
- Pipelines com etapas ordenáveis, cores, probabilidades, arquivamento e exigência de próxima atividade ao mover. Etapas referenciadas são protegidas contra exclusão.
- Kanban com drag-and-drop e alternativa por botão/select para teclado e touch; busca, filtros, contagens e valores separados por moeda. Até 100 cartões por coluna, com acesso à lista paginada.
- Oportunidades com responsável, valor exato, previsão de fechamento, temperatura, tags, ganho/perda/reabertura, notas e histórico integrado ao cliente.
- Atividades por tipo e agenda; tarefas com prazo, prioridade, status e checklist. Conclusão de atividade pode criar uma única tarefa de follow-up e atualizar os contatos recente/próximo do lead.
- Edição com versão e conflito 409, eventos/auditoria na mesma transação e isolamento adicional por RLS nas tabelas comerciais.
- Lixeira com restauração; exclusão definitiva manual por OWNER/ADMIN apenas de registros excluídos e sem referências comerciais, inclusive referências também na lixeira. Não há retenção automática.
- Emails via outbox transacional e worker SMTP com retry; Mailpit captura os emails do ambiente local.
- Interface pt-BR, layout responsivo, tema claro/escuro e estados de feedback. Impeccable orienta o design.

## Arquitetura e decisões

Leia [arquitetura, fluxos e modelo completo](docs/architecture.md), [contrato do CRM Core](docs/crm-core-contract.md), [contrato de Vendas](docs/sales-contract.md), [decisões de engenharia](docs/decisions.md), [roadmap](docs/roadmap.md) e [briefing original](docs/product-requirements.txt). O [contexto de produto](PRODUCT.md) registra as decisões fornecidas pelo usuário. O [sistema de design](DESIGN.md) documenta os tokens, temas e componentes extraídos da implementação com Impeccable.

```text
apps/api/src/modules/iam          identidade, sessões, membros e permissões
apps/api/src/modules/tenants      empresas, onboarding e configurações
apps/api/src/modules/crm          contatos, empresas clientes, leads e relacionamento
apps/api/src/modules/sales        pipelines, oportunidades, atividades e tarefas
apps/api/src/infrastructure       Drizzle, PostgreSQL, migrações, seed e email
apps/api/test                     testes reais de domínio, IAM, CRM, RLS e concorrência
apps/web/src/features/auth        autenticação e aceitação de convites
apps/web/src/features/workspace   shell, identificação da empresa e onboarding
apps/web/src/features/settings    configurações e administração
apps/web/src/features/crm         listas, formulários, detalhe, timeline, notas e lixeira
apps/web/src/features/sales       Kanban, negócios, pipelines e agenda comercial
tests/e2e                        fluxos no navegador
docs                             arquitetura, requisitos e critérios de entrega
```

A marca pública é Desmos CRM. A pasta `orbit-crm`, os workspaces `@orbit/*`, os nomes locais de bancos/serviços e os identificadores internos de autenticação foram preservados por compatibilidade com o ambiente e as sessões existentes.

O runtime PostgreSQL usa papel sem SUPERUSER/BYPASSRLS. As seis tabelas CRM e as nove tabelas de Vendas têm **RLS habilitada e forçada**, com contexto de tenant local à transação, filtros explícitos e FKs compostas. Sem contexto, a política nega acesso aos registros comerciais. IAM e as demais tabelas da fundação continuam protegidos pelas consultas e casos de uso, sem alegação de cobertura RLS. Drizzle mantém o schema e executa consultas parametrizadas; SQL versionado define constraints, políticas e índices.

## Verificação

Os resultados e o alcance da validação desta entrega estão em [validação](docs/validation.md).

Com a infraestrutura local ligada:

```bash
npm run typecheck
npm test
npm run build
```

Os testes da API usam `TEST_DATABASE_URL`, um banco separado (`orbit_test` no Compose) e schemas temporários exclusivos por execução. Cobrem isolamento entre tenants, papéis, relações, RLS, conversão/edição concorrente, histórico e lixeira. Nunca apontar essa variável para produção. Consulte a proteção implementada nos arquivos de teste antes de trocar a URL.

Com `npm run dev` em execução, execute os fluxos de navegador:

```bash
npx playwright install chromium
npm run test:e2e
```

Se o Google Chrome já estiver instalado, use `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e`. As capturas e traces de falhas são gravados em `test-results/`, ignorado pelo Git.

## Aplicação também em containers

Como alternativa aos processos Node locais:

```bash
npm run setup:env
docker compose -f compose.yaml -f compose.app.yaml up --build -d
```

O serviço `migrate` aplica migrações antes da API. Para criar os usuários de demonstração neste modo:

```bash
docker compose -f compose.yaml -f compose.app.yaml exec api node dist/infrastructure/seed.js
```

Esse Compose é de **desenvolvimento local**, inclusive quanto aos cookies HTTP e credenciais dos serviços. Não subir simultaneamente os processos locais e os containers nas mesmas portas.

## Antes de atender clientes reais

Fundação, CRM Core e Vendas não equivalem ao produto completo. Ainda faltam dashboard comercial, Radar, relatórios, metas/forecast, calendário, importação/exportação, produtos, propostas, automações e plataforma descritos no roadmap. A timeline cobre cadastros, oportunidades, atividades e tarefas entregues. Atividades de email/WhatsApp registram o histórico e não enviam mensagens externas. A lixeira de Vendas permite restauração, sem purga definitiva nem retenção automática nesta fase.

Para uma publicação real: HTTPS e `NODE_ENV=production`, `WEB_URL` correto, segredos exclusivos, SMTP autenticado, rede privada para banco/Redis, backups e restauração verificados, monitoramento, alertas do worker e revisão de segurança. O proxy confiável/IP do cliente deve ser definido conforme a infraestrutura; a aplicação não confia indiscriminadamente em `X-Forwarded-For`. O endereço IP visto atrás do proxy Next.js pode ser o do proxy.

Papéis customizados, billing, pagamentos, limites por plano persistidos, gerenciamento de arquivos e integração com calendários não estão ativos. Entitlements iniciais são centralizados para permitir evolução posterior. Envio SMTP possui semântica de pelo menos uma entrega: falha entre envio e confirmação pode gerar email duplicado; tokens continuam de uso único.
