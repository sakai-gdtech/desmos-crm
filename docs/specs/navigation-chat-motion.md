# Navegação operacional, chat e Motion.dev — 02/10/2026

Modo Operate; extensão autorizada sobre a etapa de movimento de `2fbda2a`. Sem push/deploy. Impeccable (shape/operate/clarify/animate/craft-floor) e revisão independente.

## Diagnóstico observado

- A captura `system-motion/before-assistant.png` e o shell mostram nove destinos em Configurações, misturando atividades, oportunidades, funis, automações, tags e lixeira com administração. Em notebook, a expansão ocupa o rodapé e exige scroll para descobrir funções comerciais.
- Atividades só aparece nessa expansão, apesar de Agenda/Tarefas tratarem os mesmos próximos contatos. A lista de oportunidades duplica Negócios em outro grupo. Funis/etapas fica longe do seletor do Kanban; “Configurar” não informa qual objeto será editado.
- O editor de etapas protege reload com beforeunload, mas Cancelar/Voltar usa Link e descarta alterações na navegação comum sem revisão. O retorno ao catálogo também perde o contexto do funil aberto.
- O assistente tem texto introdutório, botões e um formulário antes/ao redor da conversa. Todos os blocos rolam juntos; o composer some em conversas/revisões longas. A revisão é um formulário solto abaixo do envio. Não há estado inicial de chat nem papel visual claro do assistente versus usuário.
- A coleta ampla da etapa anterior cobriu listas/formulários/detalhes, mas falhou no harness quando dois loading states coexistiram. Os 25 E2E daquela etapa passaram; isso não valida ainda o escopo novo. Há suspeita do revisor de overflow durante entrada horizontal do painel; medir frames, além da captura estável.

## Proposta e prioridades

1. **Navegação pelo trabalho:** Visão geral, Negócios, Clientes, Agenda, Tarefas e Automações. Clientes contém leads/contatos/empresas/tags/lixeira conforme permissões. Configurações contém empresa/equipe/auditoria e conta (perfil/sessões). Não criar página depósito de links.
2. **Destinos contextuais:** Agenda/Tarefas/Atividades têm navegação irmã, com Atividades encontrada junto do planejamento. Negócios mantém Kanban/Lista no mesmo contexto e oferece “Gerenciar funis” e “Editar etapas” do funil selecionado. Catálogo permite abrir negócios, editar etapas e automações desse funil. URLs atuais permanecem; estado ativo do shell representa a família comercial correta.
3. **Retorno seguro de etapas:** entrar pelo Kanban passa contexto de retorno validado, salvar volta ao mesmo funil e cancelamento com alterações oferece continuar edição ou descartar explicitamente. IDs, permissões, backend e deduplicação permanecem.
4. **Chat global:** cabeçalho compacto com contexto e modo demonstrativo; transcript ocupa o corpo rolável, mensagens têm autor e alinhamento; composer multiline fixo no rodapé (Enter envia, Shift+Enter quebra, composição IME preservada). Sugestões contextualizadas iniciam pedidos. Interpretação suportada gera card integrado à conversa para confirmar funil/etapa/mensagem/destinatário e abrir o editor. Conversa/rascunho pendente ficam em memória do mesmo tenant+user, não persistidos após reload; nenhum comando executa mutação ou envio por conversa.
5. **Motion.dev efetiva:** migração do runtime central para `animate` de Motion, com controle de conclusão/cancelamento, curva consistente e springs finitas para continuidade. Motion também controla entrada de painéis e passos; CSS fica apenas com feedback simples de cor/pressão/disclosure/backdrop, sem motor duplicado na mesma propriedade. Reduced motion inicial/runtime, visibilidade, unmount e StrictMode cancelam e restauram defaults. Nada depende de animação para aparecer ou receber foco.

## Critérios e validação

- Operações comerciais descobertas sem expandir Configurações; papéis sem permissão não veem ações administrativas. URLs antigas continuam abrindo a mesma função.
- Agenda → Atividades → Tarefas e Kanban → etapas → salvar/voltar/cancelar funcionam em desktop/mobile; cancelar e interrupção não aplicam mudanças. Funil selecionado preservado no retorno.
- Transcript legível em claro/escuro; composer acessível permanece disponível com histórico e card de revisão. Sugestões têm contexto atual; sessão sobrevive navegação/fechar, reset em troca de conta e reload. “Me enviar email” aponta criador autenticado.
- Testar Motion realmente produz deslocamento/continuidade, interrupção, runtime reduced motion, overflow frame a frame, foco, duplo clique, drawer/mobile e rotas de auth. Comparar produção/bundle com base e registrar método, sem prometer FPS/INP de campo.
- Rodada batched desktop/mobile/escuro, axe amostrado, E2E final/typecheck/build; revisão independente e uma rodada de reparos. Evidências anteriores ficam intermediárias até recaptura final.

Decisão revisada: CSS/WAAPI puro foi a primeira implementação. O usuário prefere biblioteca pronta; Motion.dev passa a ser a implementação ativa, não instalação ornamental. Docs oficiais: [animate](https://motion.dev/docs/animate), [React](https://motion.dev/docs/react), [acessibilidade](https://motion.dev/docs/react-accessibility), [bundle](https://motion.dev/docs/react-reduce-bundle-size).
