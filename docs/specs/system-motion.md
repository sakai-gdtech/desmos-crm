# Movimento do Desmos — 02/10/2026

Modo Operate. Extensão de movimento sobre `2fbda2a`, checkout inicialmente limpo. Pedido: movimento perceptível e profissional em todo o sistema; identidade, conteúdo, dados e fluxos existentes preservados. Sem push/deploy nesta etapa.

## Linguagem

O movimento comunica passagem entre contextos e progresso do trabalho. Momento focal: um negócio atravessa etapas do Kanban e a sequência de etapas se reorganiza mantendo sua identidade (FLIP). A navegação confirma o contexto novo pelo título; resultados aparecem como uma coleção, com até seis itens e atraso total máximo de 100ms. Não se coreografa a página inteira nem se anima todo card estático.

Entradas de contexto: 280ms, deslocamento horizontal de 20px no desktop e vertical no mobile para evitar overflow transitório. Coleções: 240ms, deslocamento de 12px, intervalos de 20ms até seis itens. Continuidade do Kanban/etapas: 320ms, delta real do layout, sem medir a cada frame. Overlays: diálogo 260ms/18px, painéis 320ms/48px para dentro do viewport no desktop e 24px vertical no mobile; fechar permanece imediato para preservar foco e liberar a tarefa. Passos de automação: 280ms/24px no desktop e 20px vertical no mobile. Disclosure/tabs: 200–240ms. Pressão de controles: 110ms; ícones de ação e indicador de navegação dão feedback. Nenhuma contagem numérica artificial, parallax, scroll hijacking ou loop novo.

Conteúdo existe e é interativo antes da animação. Uma central Motion.dev cancela no cleanup, quando a aba fica oculta e ao ativar reduced motion em runtime. CSS mantém feedback textual/tonal, mas remove movimento com reduced motion. Nenhum atraso bloqueia submit, seleção ou foco. Entradas são finitas; limites de itens e ausência de observer global evitam trabalho proporcional a todas as mutações da aplicação.

## Inventário e cobertura prevista

| Família/telas existentes | Movimento e gatilho |
| --- | --- |
| Shell, navegação desktop/mobile, tema | Título confirma rota; expansão de grupos; drawer/scrim; ícones/pressão e estado atual |
| Visão geral/dashboard/Radar e onboarding | Título, resultados Radar por atualização, checklist/feedback; números mantidos estáticos |
| CRM: leads, contatos, empresas, detalhe/formulário/notas/timeline, tags/lixeira | Entrada de título, coleção de resultados/paginação/filtro, troca de aba, disclosures e feedback/dialogs |
| Negócios: Kanban/lista/detalhe/form/proposta/próxima ação | Coleções de lista, FLIP em movimento de etapa, drawer, tabs/disclosures e feedback |
| Funis/lista/editor de etapas | Coleção de funis e FLIP em reordenar/inserir/remover, com foco e IDs preservados |
| Tarefas/atividades e Agenda | Coleção de resultados e estado concluído, semana/lista, diálogo de registro e formulários |
| Automações/receitas/editor/acompanhamento real/biblioteca | Título, diretório/biblioteca, passos mais legíveis, disclosures, simulação e confirmação |
| Assistente global | Painel lateral e nova resposta, mantendo conversa, revisão e isolamento existentes |
| Configurações: empresa/equipe/perfil/sessões/auditoria | Título, tabelas/listas, formulário/disclosure, sucesso/erro/confirmar |
| Autenticação: login/cadastro/recuperar/reset/verificar/convite | Transição do formulário por modo e feedback; marca/narrativa estáticas |

Cobertura não significa animar todo elemento: formulários de texto, métricas, histórico estático, skeletons e conteúdo fora do viewport não ganham movimento ornamental.

## Tecnologia e custo

Decisão final revisada por preferência explícita do usuário: **Motion.dev 13.5.0**, API `animate` de `motion/mini` e gerador `spring` de `motion`. O motor manual WAAPI foi substituído; todas as entradas/coleções/continuidade/passos/painéis passam por essa API. Springs finitas sem bounce em continuidade e painéis dão desaceleração consistente; curvas de entrada seguem a identidade. CSS permanece para feedback tonal, pressão simples e disclosure/backdrop, sem competir por transform de painéis/coleções. A API mini usa a plataforma nativa e a spring da biblioteca; não há dependência de React layout/gesture que esta integração não utiliza. O ensaio inicial com animate hybrid deixou um transform identidade após cleanup; mini documentada para estilos permite cancelamento determinístico e pacote menor. Não se instala outro motor.

A reorganização de destinos e o chat estão em [navigation-chat-motion.md](navigation-chat-motion.md). A comparação produção/runtime cobre o custo total dessa extensão, sem atribuir toda diferença somente à biblioteca.
Fontes oficiais consultadas: [Motion — acessibilidade](https://motion.dev/docs/react-accessibility), [Motion — reduzir bundle](https://motion.dev/docs/react-reduce-bundle-size), [MDN — Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate), [MDN — Web Animations](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API). Skill do checkout: Impeccable, referências animate/operate/optimize/polish/craft-floor.

## Validação

Inventário comprovado por capturas desktop/mobile/escuro e gravação curta com navegação, Kanban, reordenação, Agenda, biblioteca e assistente. E2E de rotas/fluxos, animações ativas e interrupção/repetição, reduced motion inicial/runtime, foco/teclado; auditoria amostrada após estabilizar. Typecheck, API/regressões e build final. Comparação bundle/runtime local com base, sem inferir desempenho de hardware mobile físico ou INP de campo. Revisor independente após rodada batched; uma rodada de reparos e uma confirmação, sem polimento aberto.
