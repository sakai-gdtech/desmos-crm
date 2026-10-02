# Automações e assistente global — 02/10/2026

Modo Operate. Base 508bfaf, checkout inicialmente limpo. Substitui a composição de automações da spec anterior; identidade Desmos e contratos de dados preservados. Proposta autorizada para implementação sem aprovação estética adicional.

## Avaliação e direção

A navegação atual apresenta regras, modelos de mensagem, IA e exigências de etapas como pares. O editor apresenta simultaneamente três grupos de campos e outro painel de revisão. A biblioteca adiciona formulário à mesma superfície; o assistente exige criar modelos antes de produzir um rascunho. Essa concorrência dificulta saber onde começar e o que foi salvo.

Escolha: diretório operacional → editor progressivo → revisão. Primeiro viewport: título, funil, CTA “Criar automação”, lista com resumo e status. Biblioteca de mensagens é destino secundário explícito; receitas iniciam uma regra, nunca são conteúdo de mensagem. Ajustes de etapa ficam em acesso auxiliar. Editor substitui o diretório, com retorno e três passos: Gatilho e condições → Ação e mensagem → Revisar e testar. Uma coluna de leitura, apenas campos do passo atual, preview de mensagem junto à ação. Salvar na revisão conserva rascunho local, sem ativação implícita.

Biblioteca: lista pesquisável com canal e amostra de conteúdo; criar/editar substitui a lista. Nome, assunto e mensagem são conteúdo reutilizável, não regras. A ação pode selecionar um modelo e conferir o conteúdo, ou escrever somente nesta regra. Snapshot/revisão, atualização explícita e reparo de referência continuam.

## Assistente

Um ponto de entrada “Assistente” no topo do shell autenticado. Painel lateral no desktop e largura disponível no mobile, contexto da rota legível. Conversa e resolução permanecem ao fechar/reabrir e navegar dentro do mesmo workspace; identidade tenant + user reinicia a sessão. Memória em React, sem salvar conversas em armazenamento compartilhado. Ajuda local para áreas existentes e interpretação demonstrativa de entrada em etapa → email/WhatsApp. Não promete LLM remoto, envio, calendário, atribuição ou mutação. Pode preparar conteúdo sem modelo existente. Resolve “me enviar” para ID/nome/email autenticados. Escolhas pendentes → resumo → botão explícito para abrir rascunho no editor. Editor exige revisão/salvar; conversa nunca aplica dados. Sem permissão pipelines.manage, somente ajuda e sem carregar funis/modelos.

## Movimento e critérios

Momento focal: continuidade entre passos do editor (deslocamento curto na direção da progressão), painel entra pela lateral. Feedback de pressão, hover e status em controles/listas/tarefas, sem coreografia de carregamento. CSS/WAAPI, 120–240 ms, transform/opacity, cleanup e cancelamento ao trocar rota ou preferência. Sem GSAP adicional: a necessidade cabe nas APIs atuais. Conteúdo visível antes de animar; teclado não aguarda animação. reduced-motion zera movimento inclusive runtime.

Aceite: biblioteca → selecionar → preview → salvar/reabrir conserva IDs e snapshot; atualizar biblioteca não muda regra; cancelamento e dirty guard; duplo clique não duplica; conversa entre rotas e isolamento entre contas; estados reais vs simulados; fixture mantém deduplicação/permissões; Agenda intacta; desktop/mobile/escuro sem overflow. Evidência visual, testes/typecheck/build finais e medição explícita de bundle/interações. Sem deploy, push, credenciais, serviços pagos ou envios.

Fontes oficiais consultadas: [GSAP matchMedia](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/), [@gsap/react](https://www.npmjs.com/package/@gsap/react) (consulta npm indisponível), [Awwwards microinterações](https://www.awwwards.com/awwwards/collections/animation/). Inspiração em feedback/continuidade, sem copiar efeitos de marketing.

## Comparação de motion (refinamento do usuário)

Em 02/10 o usuário reforçou movimento discreto, empresarial, com liberdade para considerar Motion.dev. [Motion acessibilidade](https://motion.dev/docs/react-accessibility) oferece configuração central e hook de preferência; [redução de bundle](https://motion.dev/docs/react-reduce-bundle-size) permite carregar recursos sob demanda. Seria útil para transições complexas de layout e presença. GSAP oferece contexto/media/cleanup para sequências controladas. Aqui nenhum desses recursos complexos é necessário: CSS cobre estados de botões, linhas e overlays; WAAPI cobre a troca interrompível entre passos, com matchMedia e cancelamento no cleanup. Decisão: manter CSS/WAAPI e zero dependências adicionais, sem exuberância ou coreografia na entrada de páginas. Medir resultado no bundle compilado, não usar números teóricos das bibliotecas como ganho real.
