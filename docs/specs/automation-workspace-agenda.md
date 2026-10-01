# Automação, modelos e Agenda — Desmos CRM

Especificação autorizada em 01/10/2026; apresentação segunda-feira, 05/10/2026. Base limpa: 7979cec86cfaf64e1ce028eef3abbe40947402e0. Evolução do monólito existente Fastify/PostgreSQL/Next/React, sem troca de arquitetura. PRODUCT.md, DESIGN.md e contratos comerciais são autoridades locais; Impeccable shape/operate/optimize/craft-floor orientam composição e verificação. Modo Operate, sistema claro azul profundo/dourado fosco preservado.

## Fluxo e requisitos

1. Lista de automações com nome, resumo, funil, estado e badge de capacidade. Edição separada: Quando → Condições opcionais → Ação, uma ação principal, resumo e preview. A regra funcional do fixture aparece como linha da mesma lista; configurar/salvar etapa não se confunde com ativação. Rascunhos e testes simulados nunca indicam envio/execução real. Receitas, manual e assistente produzem o mesmo Rule.
2. Modelos de mensagem separados das receitas: busca nome/canal, criar/editar/duplicar, assunto email, corpo, variáveis. Armazenamento local versionado por empresa, claramente indicado; migrar regras locais existentes mantendo IDs/conteúdo. Regra guarda ID, revisão e snapshot do modelo; alterações não atualizam regras silenciosamente. Atualizar revisão ou personalizar nesta regra é explícito; ausentes têm reparo explícito. Preview de registro disponível, variáveis faltantes avisadas.
3. Assistente de demonstração conversacional, interpretação local controlada. Exemplo: “na pipeline de vendas quando chegar na etapa da reunião me enviar um email”. Resolver IDs existentes, pedir escolha quando não há resolução única; nunca inventar etapas/modelos/destinatários. “Eu” fixa ID/nome/email do criador autenticado no draft, independente de quem abrir depois. Interpretação revisável → mesmo editor; confirmar substituição de edição manual. Comandos não suportados retornam limite claro; etapa Reunião não cria calendário.
4. Funis: linhas compactas (alça, posição, cor, nome), detalhes avançados expansíveis. Inserir entre etapas, arraste e setas, sequência visível e feedback; aviso de alterações, salvar/cancelar. Preservar UUID/localKey/referências e conflitos 409; backend explica exclusões bloqueadas. Mobile sem corte.
5. Agenda real com Semana/Lista, dias no desktop e lista agrupada no mobile, Hoje/anterior/próximo, equipe/minhas/responsável/tipo/funil, atrasadas/sem data. Registros sales_work, painel para concluir/reagendar/abrir negócio/criar próxima ação usando mesmo formulário/registro. Tarefa = prazo; reunião = início e fim somente quando duração armazenada existe. Consultas from inclusivo/to exclusivo, paginação até fim (>100), vínculo de funil via negócio. Fuso da empresa visível/centralizado nos inputs/dias/filtros/Hoje; datas puras mantêm dia e instantes mantêm instante. RLS/permissões preservados.
6. Schema/componentes menores, editor carregado por demanda quando útil, cache por período/filtro/fuso e consultas sem N+1. Sem biblioteca pesada. Medir abrir/digitar/reordenar antes/depois no Chrome local, método e limites explícitos; latência automatizada não é INP de campo. Foco/labels/contraste/alternativas a arraste/reduced motion. Loading/vazio/erro/sem permissão; cancelar/voltar/reload/duplo clique.

## Critérios de aceite

- Editar funil → criar modelo → pedir automação → resolver ambiguidade → revisar preview → salvar e reabrir com mesmos IDs/snapshot/destinatário.
- Prévia não altera registros/não cria tarefas/não envia mensagens. Modelo atualizado não muda snapshot antigo; usuário B não troca “eu”. Renomear/reordenar preserva IDs; referência faltante/invalid IDs são visíveis e exigem reparo.
- Regra real do fixture mantém pausa/versão/deduplicação, cria uma única tarefa. Agenda a encontra e concluir nela reflete no negócio.
- Mais de 100 registros acessíveis sem truncamento; fronteiras meia-noite e janela inclusiva/exclusiva verificadas. Inputs/filtros exibem mesmo fuso.
- Testes API/navegador/typecheck/build; revisão visual desktop/mobile independente após últimas alterações. Roteiro/capturas/gravação com cenário fictício restaurável. Commit/push, hash local/remoto e checks remotos conferidos.

## Limites

Sem motor genérico de automação, envio externo, LLM remoto, sync Google/Outlook, convites de calendário, recorrência, novos lembretes externos, serviços pagos, credenciais/permissões novas ou deploy. Receitas, modelos e assistente são demonstrações locais; somente followup restrito ao fixture é executável. Modelos e rascunhos locais não têm colaboração multiusuário/entre dispositivos. Agenda usa scheduledAt/dueAt e duration já suportados, sem inventar duração. Paginação incremental informa carregamento/falha e não apresenta conjunto parcial como completo. Não alegar paridade integral com RD Station nem INP medido sem evidência.

## Fontes e aplicação

Consultadas em 01/10/2026. Padrões de interação inspiram decisões; nenhuma marca/layout copiado.

- [Pipedrive Automations](https://support.pipedrive.com/en/article/workflow-automation): lista separada da configuração, gatilho/ação e salvar/ativar distintos.
- [Pipedrive Conditions](https://support.pipedrive.com/en/article/workflow-automation-conditions): condições aplicadas ao contexto do gatilho; manter modelo simples nesta demo.
- [Pipedrive Email templates](https://support.pipedrive.com/en/article/email-templates): reutilização de conteúdo e campos de registro; nosso snapshot explícito evita mudança silenciosa.
- [Zapier geração de workflows](https://help.zapier.com/hc/en-us/articles/15703650952077-Use-the-power-of-AI-to-generate-Zap-workflows): linguagem natural → rascunho editável. Aqui interpretação controlada local, sem AI remota.
- [HubSpot pipelines](https://knowledge.hubspot.com/object-settings/set-up-and-customize-pipelines): edição/reordenação contextual de etapas, preservando identidade.
- [Pipedrive Activities](https://support.pipedrive.com/en/article/activities): ação comercial vinculada ao negócio e vista de calendário/lista.
- [WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/): alternativa de clique para arraste, alvo e foco acessíveis.
- [web.dev INP](https://web.dev/articles/inp): responsividade inclui processamento/pintura; ensaio local de interação não equivale a percentil de campo.

## Evidência de entrega

Resultados e limitações registrados em [validação](../automation-workspace-validation.md), com [guia de uso](../automation-workspace-guide.md) e [revisão independente](../automation-workspace-review.md).
