# Reconciliação do sistema — jornada de apresentação Desmos

Passe Documenter independente, com leitura integral de .agents/skills/impeccable/reference/document.md e adoção de reference/degraded/documenter.md. O harness dispõe de agente separado; a substituição inline do preâmbulo degradado não se aplica. Escrita limitada a DESIGN.md, .impeccable/design.json, apps/web/.impeccable/surfaces/apps-web-src-features-workspace-shell-tsx.md e este arquivo. Não houve implementação, browser, detector, polimento, build ou teste neste passe.

## Autoridade e comparação

PRODUCT.md, docs/presentation-plan.txt e docs/presentation-flow-contract.md autorizam A–D como extensão em modo Operate. docs/presentation-finish-review.md contém disposition: ship e a revisão independente das treze capturas. Mantêm-se a identidade azul profundo/dourado fosco, claro padrão e escuro opcional, sem novo mundo, sorteio de FORM ou comp.

A comparação usou globals.css, shell.tsx, overview.tsx, dashboard.tsx, deal-drawer.tsx, next-action.tsx, proposal.tsx, demo-followup.tsx e trechos relevantes de board.tsx/deals.tsx. Paleta, stack de fonte, raios e controles incumbentes correspondem à fonte e foram preservados. As mudanças documentais seguem a semântica entregue: Visão geral → Negócios → Clientes → Tarefas; Atividades e Oportunidades (lista) em Configurações; marca retorna à Visão geral.

DESIGN.md recebe o painel lateral modal e sua única sombra suave como exceção local à superfície plana, a faixa de indicadores/Radar, tarefa inline, proposta e confirmação do ganho. O frontmatter acrescenta somente o componente deal-drawer com cores referenciadas e dimensões observadas; não altera tokens incumbentes. O sidecar mantém primitives no frontmatter, inclui a sombra e o breakpoint de duas colunas (1100px), atualiza a descrição da navegação e acrescenta um snippet autocontido do painel com ícone SVG, hover, foco e redução de movimento. O snippet é prévia visual, sem simular callbacks ou abertura modal.

A superfície existente em apps/web/.impeccable/surfaces/apps-web-src-features-workspace-shell-tsx.md recebeu o override da apresentação no próprio arquivo, preservando material histórico e esclarecendo a precedência do contrato atual. Não há segunda cópia ou autoridade paralela. Detalhes de composição do roteiro permanecem na superfície, não como proibições globais.

## Evidência disponível e limites

O reviewer independente já abriu as treze capturas de dashboard, drawer, tarefa rápida, notebook, proposta, automação, escuro e seis estados mobile, sem achado material pendente. Não foram reabertas nesta passagem documental. Esse parecer registra ausência de overflow horizontal, erros de página e violações Axe selecionadas no runtime; detector único com zero primary e 51 advisory. São evidências existentes, não novas execuções do Documenter.

O agente principal informou 59 testes API aprovados, build TypeScript da API e build de produção Next com webpack aprovados, além da execução final consolidada de 15/15 E2E (PLAYWRIGHT_CHANNEL=chrome, 31s) após o ajuste funcional do retorno de foco. O build padrão Turbopack encontra uma restrição ambiental de abertura de porta no processamento de CSS; docs/validation.md registra o fallback webpack e seu resultado. Informou também dois ensaios com reset entre/depois e gravação de reserva em docs/demo/desmos-apresentacao.webm. São resultados executados pelo agente principal, não repetidos pelo Documenter.

## Deriva e defeitos não canonizados

O sidecar já contém entradas históricas de narrative.rules como strings, em divergência ao schema v2 descrito no skill; a reconciliação não reforma esse desvio histórico. A nova regra local de superfície plana é registrada como objeto conforme o schema e corresponde literalmente à regra em DESIGN.md. Raios, tamanhos locais e pequenos textos auxiliares preexistentes permanecem detalhes do artefato, sem expansão indiscriminada da escala para legitimar advisories. A tipografia de sistema na composição grande de autenticação não vira regra de display para futuras telas. O nome legado indigo da API de Badge não cria outra paleta.

Nenhuma destas derivas é reparada fora de escopo. Não se canonizam defeitos para eliminar findings: a sombra lateral tem uso modal explícito e foi aprovada na revisão; cards continuam planos. Indicadores representam registros persistidos e dados fictícios identificados, sem transformar a rejeição histórica a métricas inventadas em veto aos indicadores reais solicitados. O presente documento registra a fidelidade ao protótipo autorizado e não certifica preparação para produção.
