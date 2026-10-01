# Desmos CRM — roadmap e critérios de entrega

O SaaS atende empresas clientes independentes. Cada conta pertence a uma única empresa e cada novo cadastro cria o ambiente dessa empresa com seu proprietário. Email de login é único globalmente; convites não transferem contas de outra empresa, inclusive suspensas. Esse esclarecimento do usuário orienta todas as fases.

Atualização de prioridade em 01/10/2026: completar o núcleo comercial usando o RD Station CRM como referência e entregar rapidamente uma demonstração funcional. O [escopo comparado e a ordem de execução](rd-core-scope.md) priorizam gestão comercial, importação CSV, campos personalizados, produtos, produtividade e acesso por equipe antes da plataforma avançada. As fases abaixo preservam os contratos e critérios originais; funcionalidades pendentes continuam identificadas como futuras.

## Fase 1 — Fundação (implementada)

Cadastro transacional de empresa/OWNER, login/logout, refresh rotativo com hash/replay detection, recuperação/verificação por email, convites seguros, memberships, papéis e permissões, onboarding, configurações da empresa, perfil, sessões, auditoria administrativa e layout responsivo claro/escuro. PostgreSQL/Drizzle, Redis/fila, migrações, seed local, Docker Compose e instruções reproduzíveis.

Aceite: aplicação compila; tipos passam; a unicidade de empresa por conta é garantida no banco e na API; criação de segunda empresa e convites conflitantes são recusados; a barra lateral identifica a empresa sem seletor; testes de login, refresh, revogação, memberships, escalada de privilégio e acesso entre empresas passam; fluxos de cadastro/login/configurações são exercitados no navegador. Contas de demonstração são locais e nunca cadastradas automaticamente em produção.

## Fase 2 — CRM Core (implementada)

Contatos, organizações atendidas por cada empresa cliente do SaaS (`companies`), leads, tags, notas com fixação/menções, timeline estruturada, soft delete e lixeira. Esses registros comerciais são distintos dos ambientes das empresas que contratam o SaaS (`tenants`). Listas com busca/filtros/ordenação/paginação, cadastro/edição em página própria e alertas de duplicidade por email/telefone normalizado dentro do mesmo tenant e tipo, sem bloquear persistência nem mesclar automaticamente.

Conversão transacional, concorrente e idempotente em contato e empresa cliente opcional, com criação ou associação a registros existentes; oportunidades entram na Fase 3. Restauração e exclusão definitiva manual por OWNER/ADMIN, bloqueada quando há referências comerciais, inclusive soft-deleted. Não há notificações de menções, retenção automática, importação ou arquivos nesta fase. O seed local acrescenta 20 empresas clientes, 60 contatos e 30 leads fictícios na Nexa.

Aceite: Tenant A não lê, lista, conta, modifica, remove ou associa registros de B. RBAC por entidade; evento e auditoria transacionais; conflito de versão 409; renomear/remover tag mantém histórico nos registros associados. As seis tabelas CRM usam RLS forçada com contexto local à transação e FKs compostas; testes reais exercitam ausência de contexto, relações, concorrência, rollback, conversão e lixeira. Estados de UI e resultados finais da verificação ficam registrados em [validação](validation.md).

Evolução administrativa posterior: política configurável de retenção e limpeza agendada, sem exclusão automática implícita na entrega atual.

## Fase 3 — Vendas (implementada)

Pipelines/etapas configuráveis, oportunidades, Kanban, atividades, tarefas e follow-up. Múltiplos pipelines, ganho/perda, motivos e mudança concorrente com versionamento. Timeline integrada aos registros CRM, notas de oportunidade, lixeira/restauração de vendas e conversão de lead com oportunidade na mesma transação idempotente. Seed local de 20 oportunidades, 12 atividades e 12 tarefas fictícias. O Kanban separa totais por moeda e tem alternativa por select para teclado e touch. Atividades registram interações, sem enviar mensagens externas.

As regras configuráveis de dias sem avanço ficam persistidas nas etapas para o Radar da Fase 4; esta fase exibe o tempo atual e aplica a exigência de próxima atividade ao mover. Sem purga definitiva ou retenção automática de vendas.

Aceite: drag-and-drop persiste, 409 restaura estado, etapa deve pertencer ao pipeline/tenant, atividades respeitam responsáveis válidos, ganho/perda e follow-ups têm testes de autorização e isolamento.

## Fase 4 — Gestão comercial

Dashboard com indicadores reais, Radar Comercial acionável, relatórios, metas, forecast, ranking, funil e motivos de perda. Métricas com definição explícita de período/fuso/status. Cache sempre inclui tenant e filtros.

Aceite: relatórios não expõem dados de B a A; receita e forecast calculados com dinheiro exato; radar abre registro/agendamento; oportunidades paradas e falta de follow-up usam regras configuráveis.

## Fase 5 — Produtividade

Calendário dia/semana/mês, notificações/preferências, filtros salvos, busca Cmd/Ctrl+K, ações rápidas, importação CSV/XLSX e exportação assíncrona com preview, mapeamento, validação, duplicatas e resumo.

Aceite: limites de arquivo/linha e proteção contra fórmulas em exportações; idempotência e cancelamento; resultados parciais rastreáveis; pesquisa e arquivos respeitam tenant/permissões.

## Fase 6 — Comercial avançado

Antecipação para apresentação: há uma demonstração visual de automações por pipeline, email/WhatsApp simulados e campos obrigatórios de exemplo por etapa. Os exemplos ficam neste navegador, separados por empresa/pipeline. O [contrato](automation-demo-contract.md) distingue o protótipo do motor real abaixo, ainda pendente.

Produtos, itens/descontos, propostas e PDF, campos customizados, builder de automação por trigger/conditions/actions, round robin e atribuição por regra.

Aceite: validação de transições de propostas, snapshots de preço, limites de recursão, jobs idempotentes, contador de distribuição concorrente e testes de automações/importação.

## Fase 7 — Plataforma

API keys com hash/escopos/expiração, webhooks assinados e tentativas, integrações, billing, plans/subscriptions/usage/limits e entitlements centralizados. Pagamentos dependem de escolha posterior de provedor.

Aceite: limites atômicos por tenant, rotação/revogação de chaves, proteção SSRF em webhooks, isolamento em workers e cache, backups/restauração verificados, monitoramento e preparação operacional.

## Definição de pronto por funcionalidade

1. Validação de entrada e erros compreensíveis.
2. Autorização backend; UI representa as mesmas permissões.
3. Isolamento tenant em leitura/escrita/referências/jobs/relatórios.
4. Estados de loading, vazio, erro e sucesso; teclado e mobile.
5. Índices, constraints e transações adequados.
6. Timeline/auditoria quando aplicável, sem credenciais ou excesso de dados pessoais.
7. Testes do caso principal, de autorização e de isolamento.
8. Documentação de execução e limitações reais; sem declarar entregues fases futuras.

Os testes obrigatórios de isolamento de contatos, empresas clientes e leads já acompanham as APIs da Fase 2. Negócios e tarefas já têm testes reais na Fase 3. Testes de relatórios serão adicionados junto às respectivas APIs, sem substituir cobertura real por testes contra endpoints inexistentes.
