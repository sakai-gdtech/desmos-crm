# Decisões de engenharia

## ADR 001 — Monólito modular

API Fastify independente do Next.js. Transações locais preservam consistência dos dados e deixam clara a fronteira entre HTTP, casos de uso e persistência. Extrair serviços somente diante de necessidade operacional observada.

## ADR 002 — Tenant na sessão e consulta explícita

Membership é a autoridade da associação. Sessão determina a única empresa da conta; requisições verificam sessão e membership no banco. A fundação utiliza filtros explícitos de tenant nos casos de uso e testes reais. PostgreSQL roda com usuário sem SUPERUSER/BYPASSRLS. A Fase 2 ativa e força RLS nas seis tabelas CRM, usando `app.tenant_id` local à transação, mantendo filtros explícitos e FKs compostas. Testes exercitam ausência de contexto e referências estrangeiras. IAM e as demais tabelas da fundação continuam sem RLS; essa cobertura não é generalizada para todo o banco.

## ADR 003 — Cookies e proxy same-origin

Next.js encaminha `/api` ao backend. Cookies HttpOnly evitam expor credenciais ao JavaScript. Origin permitido protege mutações. A API não aceita tenant enviado pelo cliente como autoridade. O cache de consultas deve ser limpo em logout ou mudança da sessão autenticada, inclusive entre abas.

## ADR 004 — Outbox para emails

Cadastro/convites/recuperação gravam mensagem de email na mesma transação. Um worker entrega mensagens via SMTP com tentativas e bloqueio de linha. Essa primeira fila durável em PostgreSQL reduz a complexidade da entrega transacional. Redis atende rate limits/readiness; BullMQ fica para importações/automações e trabalhos mais amplos. O transporte local usa Mailpit.

## ADR 005 — Design orientado a operação

Impeccable solicitada pelo usuário e obtida de [pbakaus/impeccable](https://github.com/pbakaus/impeccable). Guias aplicáveis: Operate, craft-floor, audit e polish. O contexto deriva do briefing fornecido, sem reabrir decisões já estabelecidas. A skill fica no projeto em `.agents/skills/impeccable`.

O carregamento inicial de contexto falhou por permissão de execução; o contexto foi lido diretamente, conforme fallback da skill. Posteriormente, o engine 0.1.9 foi disponibilizado pelo launcher executado com `sh`, e o detector foi aplicado aos arquivos de interface. A revisão incluiu capturas da aplicação em desktop, mobile e tema escuro, além dos estados funcionais. Um agente independente revisou o acabamento; seus dois apontamentos foram corrigidos e receberam teste de regressão no navegador. Não foi necessário gerar imagens decorativas para esta aplicação operacional.

Os tokens e componentes implementados estão registrados em [DESIGN.md](../DESIGN.md), com sidecar em `.impeccable/design.json`. A documentação descreve o código existente, sem apresentar componentes futuros como disponíveis.

## ADR 006 — Desmos e uma empresa por conta

Em 01/10/2026, o usuário definiu a marca **Desmos**, com referência ao grego, e esclareceu que multiempresa significa empresas clientes independentes usando o mesmo SaaS. Confirmou **uma empresa por conta**. Esta decisão substitui a interpretação inicial de uma identidade com várias empresas e complementa o briefing original preservado em `docs/product-requirements.txt`.

Cada cadastro cria uma empresa, seu usuário proprietário e membership OWNER em uma transação. O email de login é único globalmente; `UNIQUE (memberships.user_id)` impede um segundo vínculo, inclusive quando o primeiro está suspenso. Convites não transferem contas de outra empresa. A interface mostra a empresa da conta como identificação estática, sem seletor nem criação de outra empresa.

Para compatibilidade, `POST /tenants` recusa criar uma segunda empresa (`409 ONE_COMPANY_PER_ACCOUNT`) e `/auth/switch-tenant` recusa outro tenant (404). O seed mantém Ana somente na Nexa Tecnologia; Bruno Almeida (`bruno@horizonte.com`) é o proprietário independente da Horizonte Consultoria. Dados legados com mais de um vínculo precisam de resolução explícita antes de aplicar a restrição; o seed trata apenas a associação demonstrativa conhecida.

A marca pública usa Desmos CRM e um símbolo de elos. Pasta, workspaces, cookies, issuer/audience, bancos e serviços locais mantêm seus identificadores internos `orbit` para preservar compatibilidade, sessões e dados. A alteração não muda os tokens visuais nem antecipa módulos comerciais.

## ADR 007 — Identidade comercial comum e relacionamentos íntegros

Na Fase 2, `crm_records` armazena contatos, empresas clientes e leads com discriminador `kind`, campos tipados e validação/DTOs/permissões por entidade. As tabelas `crm_tags`, `crm_record_tags`, `crm_notes`, `crm_note_mentions` e `crm_events` completam o armazenamento. Essa identidade comum permite FKs reais para notas, tags e eventos, evitando referências polimórficas órfãs. FKs compostas incluem tenant e, em vínculos de empresa/conversão, tipo do registro. `companies` são organizações atendidas comercialmente dentro de um tenant, não novos ambientes do SaaS.

Email e telefone comerciais são normalizados para detectar possíveis duplicados dentro do mesmo tenant e tipo. Não possuem unicidade comercial obrigatória: a resposta alerta e permite persistir sem mesclar ou sobrescrever registros. O email de autenticação continua único globalmente.

## ADR 008 — Histórico e concorrência do CRM

PATCH exige a versão lida e devolve `409 VERSION_CONFLICT` se outra alteração venceu. Registro, evento estruturado e auditoria são gravados na mesma transação. A timeline descreve os campos efetivamente alterados e guarda rótulos de responsáveis, empresas e tags, sem transformar campos equivalentes em alterações. Notas têm histórico de conteúdo na auditoria; menções são relacionamentos locais e ainda não geram notificações.

Renomear ou excluir uma tag registra o impacto e incrementa a versão dos registros associados. Mutações de associações e gestão de tags usam serialização por tenant antes dos locks de registros para evitar inversão de locks. Conversão bloqueia o lead e retorna os mesmos vínculos em chamadas repetidas, sem criar duplicados; referências inválidas fazem rollback dos registros e de seus históricos. O destino atual é contato com empresa cliente opcional, sem oportunidades.

## ADR 009 — Lixeira e exclusão definitiva explícita

Exclusão comercial é lógica. Usuários com permissão de exclusão consultam a lixeira e restauram registros; somente OWNER/ADMIN têm `crm.purge`. Exclusão definitiva exige registro já excluído e ausência de referências comerciais, inclusive quando os registros que o referenciam estão na lixeira. O sistema não desassocia clientes nem conversões automaticamente para permitir purge.

Purge remove notas, menções, associações de tags e eventos do registro por cascata, preservando a auditoria. A ação é manual e recebe confirmação na interface. Retenção configurável e limpeza agendada continuam pendentes; não existe descarte automático nesta fase.

## ADR 010 — Demonstração comercial reproduzível

O seed local inclui 20 empresas clientes, 60 contatos e 30 leads fictícios na Nexa, com tags, responsáveis, notas e eventos. IDs derivados de chaves estáveis impedem duplicação e os registros existentes não são sobrescritos. O seed respeita o contexto RLS e recusa produção. A Horizonte mantém seu proprietário independente e não recebe os dados comerciais da Nexa. Oportunidades e demais entidades futuras não são antecipadas com dados simulando funcionalidades prontas.

## ADR 010 — Vendas transacionais e agenda local

A Fase 3 separa pipelines/etapas/oportunidades do CRM Core, mantendo FKs compostas com os cadastros e memberships. Atividades e tarefas compartilham identidade em `sales_work`, com estados e campos próprios impostos por constraints. Não há referências polimórficas sem FK. As nove tabelas têm RLS forçada.

A conversão de lead com oportunidade ocorre na mesma transação e é idempotente via vínculo persistido no lead. Dinheiro continua decimal exato; o Kanban não soma moedas distintas. Arrastar e mover por select usam a mesma API com versionamento e resposta 409, seguida de recarga do estado real.

Follow-up é uma tarefa vinculada a uma atividade concluída, com unicidade por atividade. Registro de email/WhatsApp não autoriza envio externo. Regras de dias sem avanço são preparadas para o Radar, sem apresentá-lo como implementado. Sistema visual Operate, tokens e marca Desmos permanecem preservados.

## ADR 011 — Limites através do proxy

O proxy same-origin concentra as conexões no IP do servidor Next. O limite global é 200 requisições/minuto por usuário identificado por JWT com assinatura e validade verificadas; múltiplas sessões desse usuário compartilham o limite. Tokens inválidos/expirados e acessos anônimos usam a cota por IP. O identificador enviado em body/header ou o texto de um token não verificado nunca cria uma cota autenticada. Limites específicos de login/recuperação por identidade permanecem.

O errorResponseBuilder do plugin fornece statusCode para o handler da aplicação: excesso retorna 429 RATE_LIMITED e Retry-After. Teste de integração verifica limite, isolamento de usuários com o mesmo IP, compartilhamento entre sessões e impossibilidade de escapar trocando tokens inválidos.
