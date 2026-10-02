# Conclusão mínima do PDF — registro de implementação e validação

02/10/2026. **Implementação e checks finais reconciliados na fonte congelada, após ajuste de CSS/feedback de recuperação. Sem declaração de 14/14.** Este registro complementa a [auditoria histórica](requirements-coverage-audit.md), sem alterar sua matriz do commit anterior. Escopo é a [spec mínima reconciliada](specs/pdf-mandatory-completion.md); [guia atual](presentation-guide.md) não exige preparação/reset do fixture.

Os estados abaixo delimitam implementação e comportamento verificado pelos relatórios finais da fonte atual. PASS se refere aos cenários exercitados, não a uso humano universal ou cobertura de toda a plataforma. Teste escrito/PNG isolado não é aprovação; resultados anteriores de UI/Motion/core não foram transferidos para os módulos novos.

## Evidências e estado dos checks

| Evidência / check | Estado e alcance |
| --- | --- |
| Código/migrações | `0008_commercial_completion.sql` e `0009_commercial_snapshots.sql` aplicadas normalmente no ambiente local, sem rewrite/reset, conforme fechamento do coordenador. Campos compartilhados/snapshots reais preservam os contratos existentes. |
| `npm run typecheck` | **PASS** na fonte congelada; [log final](evidence/pdf-completion/typecheck.txt). |
| `npm test` | **70 PASS / 0 FAIL / 0 skipped/cancelled**; [log API final](evidence/pdf-completion/api-tests.txt), 13,4 s na rodada de fechamento. Inclui CSV, captura/rotação, campos/conversão, regras/snapshots/revogação, avisos/prazos, métricas/timeline e RLS/FKs. |
| Build API | **PASS**; [log final](evidence/pdf-completion/api-build.txt), compilação TypeScript. |
| Build web | **PASS**, snapshot Webpack final após CSS dos filtros/feedback de recuperação; [log final](evidence/pdf-completion/web-build.txt). Não confundir com deploy ou medição de performance. |
| [Ensaio PDF final](evidence/pdf-completion/rehearsal.json) | `node scripts/presentation-rehearsal.mjs`: **3/3 PASS**, zero fail/flaky/skipped, exitCode 0; 02/10/2026 05:33:10–05:33:23 UTC, 12,5 s de execução. Empresas novas fictícias; nunca reset. Jornada ampliada com dois negócios/ganho-perda/50% conversão/tarefa/aviso/exportação; regra e mobile/reduced motion. Parte da montagem é via API, não sessão humana. Nenhuma restauração de fixture. Artefato final corresponde à fonte congelada, incluindo as últimas linhas de feedback de recuperação. |
| [Suíte E2E final](evidence/pdf-completion/e2e-final.json) | `node scripts/test-e2e-local-mailpit.mjs`: **33/33 PASS**, zero fail/flaky/skipped, exitCode 0; 05:21:03–05:23:12 UTC, sem retry na rodada final. Resolveu resultado 31/2. O [intermediário 32/33](evidence/pdf-completion/e2e-intermediate.json), com assert mobile de “Sim”, está preservado e não se reproduziu na rodada 33/33 informada pelo coordenador. A rodada exata após CSS/feedback também passou 33/33, sem omitir o intermediário. Inclui recuperação da edição de regra, cancelamento/continuar e bloqueio de política CSV durante importação. |
| Convite durante suíte | **1 entregue somente ao Mailpit**, SMTP hardcoded `127.0.0.1:1026`, destinatário sintético `viewer-<timestamp>-<suffix>@example.test`, empresa `Empresa de Convites`, registro criado após início do runner, filtrado em SQL. Sem credenciais/worker amplo; não é envio comercial ou email de cliente real. Método registrado no JSON final. |
| [Galeria final](evidence/pdf-completion/index.html) | Estados 01…08 desktop claro/mobile escuro/reduced motion amostrados; capturas 09/10 de produção após CSS confirmam filtros em grid responsivo e ausência de overflow observado. Axe sem violações nos estados dos testes PDF, não certificação integral. Inspeção amostral do coordenador; PNG não comprova sozinho lógica/backend ou motion. |
| [Revisão independente](evidence/pdf-completion/review.md) | **Quatro P2 resolvidos**: BOM do CSV, lock do funil, política CSV durante importação e save/navegação/retorno com instância remontada. Parecer final favorável; revisão de código, sem executar a suíte consolidada ou ensaio concorrente específico de arquivamento. Provas de execução são os relatórios do coordenador. |
| [Scheduler automático](evidence/pdf-completion/scheduler.json) | Empresa fictícia nova, compromisso vencido e regra OVERDUE; somente polling de leitura, **sem scan manual**. 05:16:17→05:16:59 UTC: uma execução/snapshot/tarefa e dois avisos (regra + atraso), sem envio externo. |
| [Radar — comparação bruta](evidence/pdf-completion/radar-comparison.json) | Executada: um par por Playwright, 15 vs. 12 ações, duas tarefas persistidas por condição, zero omissões/falsos positivos. Limites abaixo. |
| [Medição final de produção](evidence/pdf-completion/performance.json) | 02/10/2026 05:30:57 UTC, fonte congelada vs HEAD `bbd6fc6`. Scripts modernos da rota por HTML SSR, sem `noModule` e sem prefetch de Link; todos os assets JS de saída têm população distinta; método abaixo. `initialAssets` observado não serve como comparação determinista de rota. Laboratório, sem ganho comprovado. |
| [Proveniência](evidence/pdf-completion/provenance.json) | Manifest da fonte/artefatos de fechamento, mantido pelo coordenador; logs/relatórios/galeria referenciados de forma relativa nesta pasta. Sem commit/push/deploy/reset nesta etapa. |

## Reconciliação dos 14 requisitos

| Requisito do PDF | Implementação / prova nesta etapa | Estado e limite de evidência |
| --- | --- | --- |
| 01 Cadastro unificado | Core CRM + definições/valores personalizados text/number/date/boolean/choice por tipo/tenant; arquivar conserva valores; compartilhamento opcional Lead → Contato na conversão, sem sobrescrever preenchido. | **Implementado/verificado no recorte.** Ensaio 3/3 e API (70) cobrem campo compartilhado/reload, tipos/validação/isolamento e conversão sem sobrescrita. Sem dinheiro/fórmulas/obrigatoriedade configurável prometidos. |
| 02 Oportunidades | Dois negócios independentes para o mesmo cliente, dados/etapas/valores reais; conversão vinculada e produtos via proposta existentes. | **Core e regressão aprovados.** Ensaio conectado confirma dois negócios do mesmo cliente, IDs/estados independentes e ganho/perda; não é filmagem de todos os casos. |
| 03 Funil visual | Múltiplos funis/etapas/arraste/alternativa acessível preservados; responsável, período de criação e origem no quadro/lista. | **Implementado/verificado no recorte.** API (70) / E2E (33) exercitam filtros, totais, etapas/referências e regressão; mobile amostrado não valida aparelho físico. |
| 04 Histórico | Proposta agora registra histórico dos clientes vinculados além do negócio, com autor/data; notas/work/movimentos existentes. | **Implementado/verificado no recorte.** Ensaio (3) e API (70) observam proposta na timeline do cliente. Sem conversa externa automática ou passagem real entre dois vendedores humanos alegada. |
| 05 Tarefas/próximos passos | Core Work/Agenda + avisos internos de prazo nas próximas 24h e atraso; leitura persistida, elegibilidade atual e dedup por prazo/destinatário. | **Implementado/verificado no recorte.** API (70) cobre dedup, reagendamento, conclusão e destinatário atual; ensaio (3) / E2E (33) observam aviso/leitura. Scheduler precisa estar ativo; [execução automática](evidence/pdf-completion/scheduler.json) comprova emissão sem scan manual. Sem email/push/calendário externo. |
| 06 Comunicação | `mailto:` / `tel:` / lançamento `wa.me` pelo cadastro; atividades email/WhatsApp continuam registro manual. | **Destinos dos links verificados** nas assertions do ensaio aprovado; aplicativo externo não acionado pela QA. Sem enviar mensagem comercial na QA ou anunciar envio/sincronização comercial; integração limitada à abertura direta. |
| 07 Entrada/distribuição | CSV CRM com preview e responsável importador; captura pública com origem e round robin por formulário. Duplicado/retry não avança cursor; sem elegíveis recusa. | **Implementado/verificado no recorte.** Ensaio (3) demonstra captura; API (70) cobre rotação, retry/duplicados sem consumo de cursor, recusa/isolamento. Resposta pública não consulta/revela CRM. |
| 08 Automações básicas | Regras reais próprias: etapa, inatividade `updatedAt`, compromisso vencido; cada execução cria tarefa + aviso, uma vez por regra/negócio, snapshot/versionrun; pausa/revisão/log. | **Implementado/verificado no recorte.** Ensaio (3)/E2E (33) cobrem etapa/reabrir/pausa/aviso/recuperação; API (70) cobre varredura, snapshot/versionrun, dedup e revogação; scheduler automático foi observado em artefato próprio. Rascunhos locais e fixture antigo são distintos. |
| 09 Produtos/propostas | Catálogo básico e proposta existentes; centavos/snapshot/valor do negócio preservados; novo fluxo observa R$ 200,19 e timeline do contato. | **Core e regressão aprovados.** Sem PDF/assinatura/validade/status avançado. Não classificar catálogo como ausente. |
| 10 Ganhos/perdas | Motivo de perda obrigatório na UI/API; perda vazia bloqueada, valor/data/estado persistidos; legados sem motivo identificados. Ganho/reabertura existentes. | **Implementado/verificado no recorte.** Ensaio (3) cobre bloqueio/perda válida/ganho e 50% conversão; API (70) / E2E (33) aprovam a regressão de fechamento/conflitos. Não preencher motivo histórico inventado. |
| 11 Painel gerencial | Filtros funil/responsável/origem/período e ganhos/perdas/conversão/ticket/ciclo/motivos calculados no banco sobre a mesma coorte criada no período. | **Implementado/verificado no recorte.** API (70) verifica fórmulas/filtros/moedas; ensaio (3) confirma 50% conversão. Estado/responsável atuais; não receita por fechamento ou estoque histórico. |
| 12 Usuários/permissões | RBAC/tenant/RLS existentes, revalidados nas novas APIs/refs; destinatário privado e formulário com acesso de criador/responsáveis revisto. | **Core/extensão e regressão aprovados em API (70) / E2E (33).** Sem visibilidade por carteira/equipe presumida. |
| 13 Qualidade/controle | Validação/duplicidade/auditoria + CSV: validar arquivo todo, skip/create explícitos, transação/retry/hash; export CRM filtrado até 5.000 com prefixo `[texto] ` para risco NFKC. | **Implementado/verificado no recorte.** API (70) cobre **BOM**, preview/duplicados/rollback/retry/export seguro; ensaio (3) / E2E (33) cobrem política bloqueada/export e controles de acesso. BOM é prova de API, não da UI. Não é backup, merge automático, XLSX ou exportação de Negócios/campos personalizados. |
| 14 Facilidade de uso | Navegação/chat/Motion preservados; busca/filtros/página CRM sobrevivem ida/volta em memória de sessão; cenário mobile escuro/reduced motion/overflow e axe delimitado. | **Parcial. NOVICE NÃO EXECUTADO:** nenhuma sessão com pessoa nova sem treino. Suíte guiada/script não substitui estudo humano, aparelhos/tecnologias assistivas ou certificação completa. |

## Radar: diferencial e comparação

[Dados brutos](evidence/pdf-completion/radar-comparison.json), [fixtures](evidence/pdf-completion/radar-fixtures.json), [sem Radar](evidence/pdf-completion/radar-withoutRadar.webm) e [com Radar](evidence/pdf-completion/radar-withRadar.webm). Tarefa: identificar negócios sem próxima ação válida e criar tarefa futura para cada um. Um negócio com data anterior no cartão já tinha uma ação futura válida, permitindo conferir falso positivo.

| Condição | Ações | Tempo automático | Tarefas persistidas | Omissões / falsos positivos |
| --- | --- | --- | --- | --- |
| Sem Radar | 15 | 1.260 ms | 2 | 0 / 0 |
| Com Radar | 12 | 904,8 ms | 2 | 0 / 0 |

**Três ações a menos neste percurso registrado.** Um par equivalente A→B, script Playwright preparado, Chrome headless/dev, reduced motion, sem throttling e sem participante humano. “Ação” é navegação/select/clique/preenchimento/submissão, incluindo começo/seleção aplicáveis. Tempo inclui carregamento/rede e entrada automatizada; não é velocidade humana nem benchmark de produção. Sem inferência estatística/ganho generalizável, amostra de novatos ou clareza subjetiva medida. Essa evidência é separada da aprovação da suíte final e não certifica o requisito 14.

## Medição final de produção

[JSON/método de 05:30:57 UTC](evidence/pdf-completion/performance.json): builds Webpack novos da base `bbd6fc63b369ed6a18cfc0c272d5546e764437b6` e fonte final congelada, mesmo Mac/API/conta fictícia, Chrome headless 1440×1000, contexto novo por build, sem throttling de CPU/rede. Percurso comum do editor demonstrativo: uma abertura fria + cinco quentes (clique ao input montado + dois rAF), cinco amostras de input até dois rAF, 40 frames/39 intervalos. É um par local de versões, sem participantes humanos.

Para comparar JS da rota, usar **scripts modernos identificados no HTML SSR, excluindo `noModule` sem distinção de caixa e sem prefetch de Link** (`routeScriptJsGzip`); `initialAssets` observado contém prefetch assíncrono e não é um conjunto determinista de rota. Todos os assets JS de saída têm outra população; não somar ambas as medidas. Gzip nível9 por asset é tamanho calculado, não tráfego de rede nem tempo de download.

| Medida | HEAD/base | Fonte final | Diferença |
| --- | --- | --- | --- |
| Scripts modernos da rota via SSR, gzip | 263.711 B | 270.841 B | +7.130 B (7,0 KiB; 2,70%) |
| Todos os assets JS de saída, gzip | 464.798 B | 476.913 B | +12.115 B (11,8 KiB; 2,61%) |
| Abertura fria, uma amostra | 323,7 ms | 323,0 ms | −0,7 ms |
| Abertura quente, mediana de cinco | 29,9 ms | 21,8 ms | −8,1 ms |
| Input, mediana de cinco | 32,8 ms | 32,0 ms | −0,8 ms |
| Intervalo entre frames, p95 | 16,8 ms | 16,7 ms | −0,1 ms |
| Maior intervalo observado | 16,8 ms | 16,8 ms | sem diferença |
| Long Tasks observadas | 0 | 0 | nenhuma na janela amostrada |

Reduced motion final amostrado separadamente: `matches=true`, zero animações ativas. **Sem melhora comprovada**: uma amostra fria e cinco quentes/input, em laboratório headless sem throttling, não sustentam inferência geral. Esses números não medem todas as funções novas, velocidade humana, INP de campo ou FPS de aparelho físico. A comparação Radar tem tarefa/método próprios e não é inferida desta medição.

## Captura pública e limites operacionais

GET público retorna **somente o nome do formulário**, sem CRM, origem/responsáveis/IDs de registros. POST validado devolve confirmação genérica para criação/duplicado/retry. O caminho usa tenant + token aleatório de **24 bytes / 48 caracteres hex**, persistido como hash; token concedido somente na criação. Pausa/token inválido/revogação do criador ou ausência de responsáveis elegíveis recusam novas entradas conforme contrato. Rate limit por IP: **30 GET e 20 POST por minuto**. Não há captcha, integração comercial real ou certificação de resistência a abuso/infraestrutura de produção. São controles mínimos locais, não promessa de segurança universal.

## Fechamento e avaliação ainda não executada

Fonte congelada confirmada: 70 API, 33 E2E, ensaio 3/3, typecheck/builds e medição final, após CSS/feedback de recuperação. Logs intermediários ficam preservados; resultados não são apagados para afirmar aprovação. Harness PDF não é ensaio humano de todos os 14; medição local não sustenta alegação de melhora.

A auditoria histórica e gravação A–D anterior ficam preservadas. Nenhum reset/seed/preparação foi executado ou autorizado por estes documentos; harness legado bloqueado não é roteiro atual. O estudo com novatos permanece **NÃO EXECUTADO** até existir participação/instruções/resultados reais. Implementação mínima, comparação pontual e testes guiados não justificam selo “14/14” ou prontidão de produção.
