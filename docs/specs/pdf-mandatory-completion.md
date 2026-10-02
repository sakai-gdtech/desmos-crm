# Conclusão dos subitens obrigatórios do PDF — Desmos CRM

02/10/2026. **Contrato de implementação e aceite; não comprovação de entrega.** Escopo autorizado: concluir os subitens obrigatórios identificados na [auditoria de requisitos](../requirements-coverage-audit.md), mantendo o produto existente. A auditoria registra o estado do commit examinado e permanece histórica; cada conclusão deste contrato precisa de evidência posterior vinculada à versão efetivamente testada.

Fonte: PDF original de quatro páginas, “Um CRM com potencial de impacto no mercado”, identificado com hash na auditoria; [briefing amplo](../product-requirements.txt) e [decisões](../decisions.md) dão contexto sem ampliar o mínimo pedido. Em conflito sobre fechamento perdido, prevalece a exigência de motivo obrigatório do PDF. Esta etapa não promete paridade com um plano/conta do RD Station, preparação integral de produção nem todos os recursos do briefing amplo.

## Invariantes e fronteiras

- Preservar Desmos, DESIGN.md, tokens claro/escuro, componentes, navegação operacional e runtime Motion.dev/reduced motion existentes. Acrescentar funções nos destinos naturais; não reabrir composição, identidade, animações ou chat.
- Preservar catálogo básico, preços em centavos, propostas, snapshots e sincronização transacional com o negócio. O requisito 09 já é funcional no mínimo do PDF; não substituí-lo por mock ou reconstrução.
- Tenant deriva exclusivamente da sessão ou de uma credencial de captura vinculada pelo servidor. Manter RLS forçada, referências compostas, permissões atuais revalidadas no servidor, auditoria e conflitos de versão. Filtros não concedem acesso e o papel vendedor não implica isolamento por carteira.
- Dados fictícios da apresentação permanecem isolados. Ensaios/reset não alteram outros funis ou empresas. Migrações não inventam motivos, autores, datas ou interações históricas.
- Chat continua intérprete local sem LLM, envio ou execução. Modelos/rascunhos demonstrativos existentes não viram regras reais automaticamente. Comunicação por link abre o aplicativo externo; não significa mensagem enviada ou conversa sincronizada.
- Recursos novos persistidos têm estado e limites descritos pela UI. Salvar no servidor não se confunde com memória de sessão ou armazenamento local do navegador.

## Sequência por dependências

| Entrega | Dependências | Resultado mínimo revisável |
| --- | --- | --- |
| A — fechamento, comunicação, continuidade e timeline | Core CRM/Vendas existente | Perda obrigatória também na API; WhatsApp direto; retorno à lista conserva contexto; proposta aparece no histórico do cliente. |
| B — campos personalizados | Validação/RBAC/RLS do core | Definições e valores reais por empresa/entidade; criar, preencher, ler e arquivar conservando valores. |
| C — CSV com preview/importação/exportação | Normalização/duplicidade e transações CRM existentes | Quatro colunas fixas; revisar todo o arquivo antes de escrever; exportar o CRM filtrado com proteção de células. Independente de B. |
| D — captura e distribuição de leads | Normalização/duplicidade e transações CRM existentes | Formulário público controlado com round robin próprio; independente da importação e dos campos personalizados. |
| E — lembretes internos | Work persistido; infraestrutura de processamento | Notificações privadas com link e leitura; prazo/reagendamento/conclusão não geram alertas obsoletos. |
| F — filtros e métricas reais | Datas/origem/responsável consistentes de A–D | Mesmo predicado entre contagem/lista; indicadores com denominador, período e moeda explícitos. Pode avançar em paralelo com E. |
| G — automações persistidas | Eventos de etapa + E + transações Work | Regra de etapa cria tarefa em qualquer funil autorizado; atraso/inatividade geram alertas internos deduplicados. |
| H — comprovação e Radar | A–G estabilizados | Jornada conectada, cobertura dos subitens e comparação reproduzível com/sem Radar, sem fabricar resultado. |

Cada entrega encerra com API/fluxo/UI reais, tratamento de erro, reload e prova de isolamento. Não contabilizar uma tela ou spec como função concluída. Evitar migração de dados locais demonstrativos antes de existir revisão explícita e contrato separado.

| Requisito parcial na auditoria | Subitem a concluir / evidência |
| --- | --- |
| 01 | Campos personalizados: B. |
| 03 | Vendedor, período e origem no funil: F. |
| 04 | Proposta na timeline do cliente e continuidade de contexto: A/H. |
| 05 | Lembretes internos efetivamente emitidos: E. |
| 06 | Iniciar WhatsApp sem copiar número, mantendo o limite de integração: A. |
| 07 | CSV, entrada externa e distribuição: C/D. |
| 08 | Regra persistida fora do fixture e alertas de inatividade/atraso: G. |
| 10 | Motivo obrigatório na UI e no servidor: A. |
| 11 | Filtros e métricas reais com população explícita: F. |
| 13 | Exportação filtrada e controle de importação: C. |
| 14 | Retorno conservando busca/filtros: A; provas de percurso: H. Uso sem treino continua não verificado até avaliação própria. |

Os funcionais 02/09/12 recebem verificação de regressão; não se tornam novos trabalhos de redesenho. A comparação do diferencial pertence à página 4 do PDF e é comprovada separadamente em H.

## A — perda, comunicação, continuidade e histórico

**Motivo da perda:** ao criar um negócio perdido ou transicionar para LOST, exigir texto após trim entre 1 e 1.000 caracteres. UI marca obrigatório, bloqueia confirmação vazia e mantém valores ao receber erro; API responde `400 LOSS_REASON_REQUIRED` sem alterar status, versão, timestamps ou eventos. Não permitir esvaziar o motivo de um registro perdido. Registros históricos LOST sem motivo permanecem legíveis como “Sem motivo registrado”; editar outro campo não fabrica motivo nem bloqueia sua leitura. Reabrir e perder novamente exige motivo. Ganho/reabertura conservam os contratos existentes.

**WhatsApp:** “Abrir WhatsApp” usa o número cadastrado em formato internacional validado, somente dígitos no destino `https://wa.me/<numero>`. Não presumir DDI para um número ambíguo; orientar correção do cadastro. Destino derivado pelo código, nunca URL arbitrária fornecida pelo cadastro; abertura externa com proteção de nova aba. Email `mailto:` e telefone `tel:` permanecem. Não criar automaticamente atividade de envio: a interação real só entra no histórico por registro manual explícito. Referência: [Click to chat — WhatsApp](https://faq.whatsapp.com/5913398998672934).

**Continuidade CRM:** busca, origem, responsável, tags, página, ordenação e expansão dos filtros entregues permanecem em memória por tenant+usuário/tipo de lista durante navegação comum. Entrar no detalhe e voltar devolve a mesma consulta/página. Mudança de filtro reinicia página. Memória termina no reload/troca de conta; não exigir URLs compartilháveis, recuperação de scroll ou autosave universal para corrigir a perda de busca constatada na auditoria.

**Timeline:** salvar proposta registra o evento comercial e o histórico dos clientes vinculados ao negócio na mesma transação, com autor real, horário de servidor e identificação da proposta/negócio. Leitura evita duplicação e respeita tenant/permissão. Mudança de catálogo não reescreve o histórico/snapshot. Nenhum backfill cria uma interação supostamente observada; não exigir recomposição de eventos anteriores ou novo esquema universal de correlação como condição adicional do PDF.

**Aceite A:** rejeitar perda vazia por UI e HTTP direto, inclusive concorrência; confirmar perda válida/reabrir; preservar pesquisa ao abrir/voltar no CRM; verificar destino WhatsApp sem enviar; salvar proposta e observar o mesmo evento no negócio e no cliente após reload. Passagem de contexto entre duas contas autorizadas pode ser demonstrada com dados fictícios; não descrevê-la como teste com dois vendedores humanos se foi automatizada.

## B — campos personalizados

Mínimo: definições por empresa/tipo de registro para Leads, Contatos, Empresas e Negócios; tipos **texto, número, data, booleano e seleção única**. Definição tem UUID estável, nome, entidade, tipo, opções, ativo e versão. Limites do recorte: 50 definições por tipo, nome até 100 caracteres, texto até 2.000 e até 30 opções de seleção. Número deve ser finito; data é ISO válida sem conversão de fuso. Dinheiro específico, obrigatoriedade, ordenação configurável e tipos avançados não são condições adicionais do PDF.

Gerenciar definições exige `settings.manage` e fica acessível por **Gerenciar campos** no contexto dos registros, sem nova expansão de Configurações. Criar/editar valores exige a permissão existente de escrita da entidade; consultar exige sua leitura. Guardar definições e valores no banco com validação backend de tenant, entidade, tipo e opção. Payload usa IDs, não nomes como chaves; versão evita sobrescrita concorrente.

Tipo/opções ficam fixos: criar outra definição quando necessário. Arquivar/reativar conserva valores; edição mescla somente valores enviados, e `null` limpa explicitamente. Campos arquivados com valor permanecem legíveis. Compartilhamento opcional de uma definição Lead → Contato pode conservar valores na conversão quando habilitado; não mapear por nomes, sobrescrever valores existentes silenciosamente ou fazer desse compartilhamento uma dependência do CSV. Confirmar a semântica e evidência quando a extensão for aplicada, sem anunciar antecipadamente.

**Aceite B:** configurar tipos suportados, preencher/editar/reabrir registros; impedir tipo/opção/tenant indevidos por HTTP; conflitos de versão; arquivar sem perder valores. Se houver compartilhamento habilitado, converter lead e conferir cópia/preservação do contato. Não exigir obrigatoriedade, edição de opções ou editor de mapping que não foram pedidos.

## C — CSV seguro: preview, importação e exportação

Mínimo delimitado: **CSV UTF-8, com/sem BOM, vírgula ou ponto e vírgula**, até **300 KB e 500 linhas de dados**, respeitando limites dos campos CRM. Quatro colunas fixas permitidas: **nome/name, email, telefone/phone e origem/source**; nome é obrigatório, demais colunas opcionais. Cabeçalhos PT/EN são reconhecidos após trim/normalização de caixa; colunas desconhecidas ou repetidas são rejeitadas. Importar/exportar Leads, Contatos e Empresas. Campos personalizados, XLSX, exportação de Negócios, backup e mapping livre ficam fora deste recorte e não são lacunas artificiais do PDF.

Fluxo: **Arquivo → Validar e ver prévia → Revisar → Importar → Resumo**. Parser suporta aspas, separadores e quebras dentro de células, rejeita estrutura inválida/bytes nulos e não executa conteúdo. Responsável dos cadastros importados é **o usuário importador**; não há distribuição round robin, associação por nome ou escolha de outro responsável no CSV. Nome/email/telefone/origem seguem validação e normalização do core. Células com fórmula são rejeitadas, inclusive variantes NFKC; telefone internacional válido com `+` é tratado como telefone, não fórmula.

Preview no servidor valida **todo o arquivo** sem alterar cadastros, com contagens e resultados por linha; UI pode mostrar só as primeiras 20, identificando esse limite. Detectar duplicidade por email/telefone normalizado no arquivo e no mesmo tipo/tenant. Política inicial **skip** ignora duplicados; **create** exige escolha explícita e cria sem mesclar/sobrescrever. Qualquer linha inválida bloqueia a importação inteira até correção; não há seleção parcial. Resumo informa criados/pulados/total.

Confirmação revalida o arquivo inteiro e permissões no servidor, em transação limitada. Mudança de arquivo/tipo/política limpa a revisão na UI. Chave idempotente persistida por tenant/autor e hash do conteúdo/tipo/política faz retry retornar o mesmo resultado; reutilização com outro conteúdo/autor gera conflito. Falha aborta o lote. Auditar lote/contagens sem despejar dados pessoais em logs. Não exigir armazenamento de previews, expiração de uma hora ou importação em jobs para este arquivo pequeno.

Exportação CRM aplica autorização e **os filtros atuais**, não apenas a página carregada. Até **5.000 registros ativos**; excesso é recusado claramente, sem truncamento silencioso. As mesmas quatro colunas fixas são exportadas, sem campos personalizados, registros de lixeira, segredos ou dados de outra empresa. Não confundir exportação filtrada com backup/restauração.

Para consumo humano em planilha, células são delimitadas por aspas e aspas internas duplicadas. Detectar início perigoso sobre **NFKC**, incluindo controles/espaços iniciais e variantes Unicode de `=`, `+`, `-`, `@`; prefixar o **valor original** com `[texto] ` antes de serializar. Não confiar somente em aspas/apóstrofo. O prefixo altera a representação textual; não removê-lo automaticamente na importação. Validar os casos de risco e não alegar proteção universal para todo aplicativo. Fundamentação: [OWASP — CSV Injection](https://owasp.org/www-community/attacks/CSV_Injection).

**Aceite C:** preview sem escrita; cabeçalhos PT/EN; aspas/quebras/BOM/delimitadores; limites; inválido na última linha bloqueia tudo; duplicados skip/create; atribuição ao importador; retry/conflito/rollback; tentativas cross-tenant; exportação CRM filtrada e proteção NFKC/fórmulas/aspas/controles. Nenhum conteúdo CSV é executado.

## D — entrada externa e distribuição de leads

Além do cadastro e CSV, entregar **formulário público de captura**, configurado com `settings.manage`, nome/origem e lista de responsáveis elegíveis. URL vincula o formulário à empresa no servidor, com token aleatório armazenado como hash; não aceita escolha de tenant/assignee no payload público nem credencial de usuário. Campos mínimos: nome, email e telefone opcional. Desativar formulário ou revogar o acesso administrativo necessário do criador impede novas entradas.

Validar tamanho/tipos/obrigatórios e limitar taxa da rota pública. Resposta de sucesso é genérica (`received`), tanto para criação quanto duplicado/retry, sem expor registro, responsável ou existência de email/telefone no CRM. Registro novo deve chegar ao banco e ficar legível para conta autorizada; integração simulada não satisfaz esta entrega. Testar a URL fora da sessão autenticada em ambiente controlado; publicação é ação separada. Não exigir captcha/serviço externo ou integração comercial não conectada.

Origem é preenchida pela fonte e fica preservada na conversão. Registrar canal/lote/identificador de entrada para auditoria, sem armazenar indiscriminadamente payload bruto. Duplicidade segue normalização existente: pular por padrão e registrar resultado da entrada, sem sobrescrever/reabrir lead nem redistribuir um duplicado. Submissão possui identificador idempotente; resposta não expõe dados pessoais. Não prometer integração com plataforma comercial concreta que não foi conectada/testada.

Distribuição mínima: **round robin por formulário**, lista ordenada escolhida pelo administrador e cursor persistido. Apenas membros ativos com acesso de editar leads são elegíveis. Seleção/avanço/criação ficam na mesma transação com bloqueio; duplicado/retry/rollback não consome cursor. Membro removido/inativo é ignorado. Sem elegíveis, **recusar claramente com `NO_OWNER`**, sem criar cadastro órfão, fila ou aviso aos administradores prometido. Cadastro manual e CSV não participam desta rotação. Auditoria identifica origem/formulário e atribuição efetiva.

**Aceite D:** duas submissões independentes distribuem em sequência no formulário; concorrência mantém rotação; duplicado/retry não consome posição; membro inativo é ignorado; sem elegíveis recusa sem escrita; fonte desabilitada/token errado/acesso revogado rejeitam; resposta pública não revela CRM. CSV conserva responsável importador.

## E — lembretes e notificações internas

Entregar **Avisos internos** no shell, lista, data, motivo e link autorizado ao compromisso/negócio; marcar lido persiste por destinatário. Indicador conta não lidos da lista retornada, limitada a 100 avisos elegíveis; não prometer total histórico ou “ler todos” inexistente. Não abrir o chat como central de alertas.

Lembretes normais são internos e automáticos para tarefas/atividades pendentes atribuídas com prazo **nas próximas 24 horas**; prazo passado gera aviso de atraso. Datas aparecem no fuso da empresa, persistidas em UTC. Sem data/responsável elegível não há destinatário de lembrete. Reagendar/reatribuir muda elegibilidade; concluir/cancelar/excluir remove aviso obsoleto da lista ativa. Não exigir configurador de minutos ou envio imediato adicional.

Scheduler da API verifica compromissos a cada minuto enquanto ativo; notificações persistem no banco. Deduplicar por **tipo de aviso + compromisso + prazo + destinatário atual**, inclusive reinício/concorrência. Marcar lido não recria aviso. Validar estado/responsável/data na emissão e leitura, e autorização no destino; revogar acesso não dá acesso pelo alerta. UI informa atualização enquanto API ativa. Sem email, push, WhatsApp, configuração de lembrete individual ou integração de calendário nesta entrega.

**Aceite E:** fronteiras de 24 horas/prazo vencido, troca de prazo/responsável, conclusão, repetição/reinício, leitura após reload e isolamento. Aviso de um prazo anterior não permanece ativo ao reagendar; aviso do responsável anterior não dá acesso após reatribuição. Evidência mostra execução efetiva do scheduler, não apenas existência da tabela.

## F — filtros comerciais e métricas reais

Kanban, Lista e Visão geral recebem **funil, vendedor/responsável atual, origem e período**, preservados durante navegação da sessão quando aplicável. Estado inicial sem recorte adicional, mantendo o funil selecionado. Origem compara valor exato após trim; campo vazio significa todas as origens. Intervalo ISO tem início inclusivo/fim exclusivo, calculado a partir dos dias no fuso da empresa; UI inclui o último dia escolhido. Contagens/listas usam o mesmo predicado, mesmo com paginação/limite do quadro. Não exigir filtro extra “Sem origem”, presets ou URLs compartilháveis.

Quadro/lista e **todas as métricas** usam a mesma **coorte de negócios criados no período**, filtrada por funil/origem/responsável atual. Ganhos/perdas são estados atuais dessa coorte, mesmo quando o encerramento ocorreu fora do período de criação. UI explicita esse critério; API identifica `periodBasis: createdAt`. Reatribuição/reabertura pode mudar resultados; não apresentar estoque histórico, coorte por fechamento, receita reconhecida no mês ou snapshot de carteira.

| Métrica | Fórmula e população |
| --- | --- |
| Em aberto | Quantidade e soma de valor dos OPEN não excluídos criados no período; agrupamento por moeda. |
| Ganhos e receita da coorte | Quantidade atualmente WON e soma do valor final desses ganhos criados no período; moeda separada. |
| Conversão da coorte encerrada | WON / (WON + LOST) **dentro da mesma coorte de criação**. Sem fechamentos: “Sem fechamentos”. Não é conversão de leads ou fechamento ocorrido no período. |
| Ticket médio ganho | Soma do valor dos ganhos / quantidade de ganhos **na mesma moeda e coorte de criação**. Zero ganhos: sem dados. |
| Ciclo médio ganho | Média de `(wonAt − createdAt)` em dias decorridos dos ganhos **da mesma coorte de criação**. Não usar entrada na etapa como criação. |
| Motivos de perda | Quantidade atualmente LOST por motivo, **na mesma coorte de criação**, agrupando texto após trim. Legados nulos são identificados como históricos, sem motivo inventado; mostrar limite da lista quando aplicado. |
| Atrasadas/sem próxima ação/paradas | Estado operacional atual do conjunto de negócios criado no período e tarefas autorizadas relacionadas; mesma semântica explicável do Radar existente. Não tratá-lo como estoque histórico daquela data. |

Exclusões lógicas ficam fora; registros arquivados conforme contrato existente não são excluídos silenciosamente. Não somar BRL/USD nem calcular ticket conjunto. Cálculos no banco sobre todos os elegíveis, sem derivar de cartões carregados ou números fixos. Arredondar somente apresentação final; propostas/valores continuam exatos.

**Aceite F:** dataset conhecido com duas moedas, ganhos/perdas/reabertura, origem, dois vendedores e fronteiras de fuso/dia; incluir fechamento fora do período de criação e negócio criado fora mas fechado dentro, comprovando que prevalece a coorte de criação em todas as métricas. Comparar valores com banco e coerência contagem/lista. Dados são fictícios, cálculos reais.

## G — tarefa automática e alertas persistidos

Contrato backend enxuto separado dos rascunhos de mensagens simulados: tenant, funil, nome, enabled, versão, trigger, etapa quando necessária, dias, título da tarefa e autor. Configurar exige `pipelines.manage`/`tasks.create`; leitura/destino respeitam RBAC. **Cada execução cria tarefa + aviso interno**, com efeito real identificado na revisão humana. Chat não ativa, migra ou executa regra.

Mínimo de ações/gatilhos:

1. **Entrada em etapa:** ID estável do funil/etapa; somente transição efetiva de negócio aberto. Salvar a regra ou criar inicialmente na etapa não dispara retrospectivamente. Renomear/reordenar etapa não quebra o ID.
2. **Negócio sem atualização:** negócio aberto cujo **`updatedAt`** ultrapassou o limiar de dias. Não confundir com dias desde entrada na etapa usados pelo Radar.
3. **Compromisso atrasado:** negócio aberto com tarefa/atividade pendente vinculada cujo `dueAt`/`scheduledAt` venceu. Sem data ou compromisso concluído/cancelado não qualifica.

Nos três casos, criar tarefa com título configurado e prazo de agora + dias definidos, para responsável elegível atual do negócio; fallback é quem salvou a regra com acesso válido. Criar aviso interno vinculado à tarefa. Não oferecer responsável fixo/horário comercial configurável além deste recorte, não mover/fechar negócio, não enviar comunicação externa.

Deduplicação é **uma execução por tenant + regra + negócio**, transacional com tarefa/aviso/log e segura em concorrência/retry. Reentrada, nova elegibilidade, leitura do aviso, editar/reativar a mesma regra ou reiniciar scheduler não cria nova execução daquele par. Uma nova regra é identidade distinta; a UI explicita o limite. Pausa impede novas execuções sem apagar trabalho anterior. Scanner de inatividade/atraso pode examinar elegíveis atuais, automaticamente ou por verificação administrativa explícita; regra de etapa somente eventos futuros. Preservar versão/snapshot usados na execução, data e links para tarefa/negócio quando adicionados; conferi-los no aceite, sem substituir provas por anúncio antecipado. Erro não é sucesso.

Regra fixture “Acompanhamento de proposta” permanece compatível e restrita à demo, **uma vez por negócio**. Regras novas persistidas atuam em funis autorizados e têm deduplicação própria por regra/negócio; não ampliar a regra antiga ou converter rascunhos locais silenciosamente. Isso não é motor arbitrário de mensagens comerciais.

**Aceite G:** salvar/reabrir regra do servidor após reload em segundo navegador; cada gatilho cria tarefa/aviso/log reais; concorrência, retry, reentrada e edição/reativação não repetem o mesmo par. Provar inatividade por `updatedAt`, atraso por compromisso, leitura/restart, pausa, isolamento e revogação do autor. Conferir snapshot/versionrun quando adicionados. Fixture legado permanece sem regressão; simulações seguem identificadas.

## H — evidência, jornada e comparação Radar

Reexecutar os fluxos pertinentes e checks obrigatórios após código final, registrando comando, versão da fonte, data, ambiente e resultados, sem transferir os 61 API/30 E2E anteriores para funções novas. Amostrar desktop/mobile/claro/escuro, teclado, foco, overflow e reduced motion nas superfícies acrescidas. Usar dados fictícios, banco de testes/tenant específico; não restaurar outros dados. Cada item da auditoria recebe uma linha de evidência posterior; a auditoria original não é reescrita retroativamente.

Jornada conectada de aceite: captura externa com distribuição ou CSV com responsável importador → lead com campo personalizado → conversão preservando origem/responsável (e valores compartilhados se habilitados) → dois negócios independentes do cliente → tarefa e lembrete → proposta do catálogo existente → etapa cria tarefa/aviso reais → histórico do cliente → ganho/perda com motivo → métricas da coorte de criação/exportação CRM. Mostrar persistência após reload e novo contexto autorizado; provar alertas com scheduler ativo. O roteiro guiado não certifica uso sem treino.

**Comparação reproduzível do Radar:** benchmark operacional com roteiro fixo, sem atribuir resultado a usuário novato ou estudo de usabilidade. Usar dois fixtures equivalentes, mesmos responsáveis, datas/relógio, permissões e casos de atraso/inatividade/sem próxima ação; cenários não mudam durante uma rodada. A tarefa é “identificar os negócios em risco e registrar uma próxima ação válida para cada um”, com gabarito independente armazenado antes do ensaio.

- Condição A: operador utiliza Kanban/Lista/detalhes/Tarefas, sem abrir Radar. Condição B: utiliza Radar e suas ações contextuais. Mesmos resultados exigidos, sem esconder informações necessárias da condição A.
- Documentar operador, familiaridade, instruções e preparação. Comparar ao menos um par válido A/B, restaurando somente os fixtures; se repetir, alternar ordem e registrar treino/preparação para reduzir viés. Número de pares é informado, sem transformar três repetições ou uma amostra humana em exigência nova do PDF. Se executado por script/agente, chamar de benchmark do percurso, sem inventar participantes.
- Medir do primeiro comando de navegação à última ação confirmada: tempo, interações definidas previamente (clique/toque/submissão/navegação), omissões/falsos positivos contra gabarito e correção/persistência das tarefas. Gravar percurso/logs; falhas aparecem, não são removidas silenciosamente. Sem contagem ambígua de teclas versus cliques.
- Reportar tabela bruta, tamanho da amostra e medianas quando houver repetições. Um par isolado é demonstração pontual, não evidência de ganho generalizável. Só afirmar melhoria no atributo medido. “Clareza” exige pergunta/método e resposta real; sem coleta, permanece não avaliada. Motion/performance ou opinião do agente não substituem impacto comercial.

## Definition of done e limites remanescentes

Este contrato conclui as lacunas funcionais mínimas do PDF apenas quando A–H tiverem prova posterior. Campos personalizados, CSV, captura/distribuição, notificações, relatórios e regras do servidor não são declarados entregues pela existência desta spec. Navegação, chat/Motion e catálogo atuais são a base preservada, não novos diferenciais contabilizados duas vezes.

Continuam fora deste mínimo: CSV de campos personalizados, XLSX, mapping livre, backup/exportação de Negócios, integrações comerciais específicas, envio/sincronização automática de conversas, LLM, motor arbitrário de automações, anexos, assinatura/PDF/aceite de proposta, calendário externo/recorrência, relatórios avançados e carteira/equipe além do RBAC existente. São limites deste recorte, não lacunas obrigatórias adicionais do PDF. Uso por pessoa nova sem treino, aparelhos físicos, tecnologias assistivas e prontidão de produção exigem avaliação própria; não fechar o requisito 14 como integralmente comprovado por roteiro automatizado.
