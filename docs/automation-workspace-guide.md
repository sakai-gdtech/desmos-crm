# Automações, modelos e Agenda

## Criar uma automação demonstrativa

Em Configurações → Automações, selecione o funil. A lista separa a regra funcional da demo dos rascunhos de simulação. Abra uma receita, crie manualmente ou use o Assistente: todos levam ao mesmo editor.

O editor segue Quando → Condições opcionais → Ação. Escolha a etapa existente, revise o destinatário, o conteúdo e o resumo. A prévia pode usar um negócio disponível ou dados fictícios. Variáveis não preenchidas aparecem como aviso. **Simular envio** não envia mensagens nem altera negócios/tarefas. **Salvar rascunho** guarda a configuração neste navegador e não ativa execução. Reabrir preserva IDs, conteúdo e destinatário. Voltar com alterações pede confirmação; Cancelar descarta a edição.

## Modelos de mensagem

Na aba Modelos de mensagem, busque por nome/canal, crie, edite ou duplique modelos de email e WhatsApp. Email exige assunto; o corpo aceita `{contato}`, `{empresa}`, `{negociacao}` e `{responsavel}`. A prévia mostra dados fictícios.

Ao selecionar um modelo na regra, ela guarda ID, revisão e uma cópia do conteúdo. Editar o modelo não modifica regras já salvas. No editor, atualizar a revisão é uma ação explícita. **Personalizar só nesta regra** desvincula a cópia para edição manual. Referência removida exige selecionar outro modelo ou personalizar antes de salvar/testar.

Modelos e rascunhos são versionados por empresa no armazenamento local do navegador; rascunhos também são separados por funil. Não são compartilhados com colegas, dispositivos ou outro navegador. Conteúdo legado é mantido na migração; erros de leitura/salvamento são informados.

## Assistente

Experimente: “na pipeline de vendas quando chegar na etapa da reunião me enviar um email”. O assistente interpreta pedidos controlados de email/WhatsApp localmente. Escolha entre funis, etapas e modelos reais quando o nome estiver ausente ou ambíguo; não são inventados registros.

“Me enviar” fixa o ID, nome e email do usuário que criou o rascunho. Outro usuário abrir o conteúdo não muda esse destinatário. **Gerar rascunho para revisão** abre o mesmo editor; a interpretação não executa a automação. Pedidos não suportados informam o limite. Usar a etapa Reunião não cria um evento de calendário. Não há conexão com LLM externo.

## Personalizar etapas

Em Configurações → Funis, cada linha mostra posição, cor e nome. Insira uma etapa entre outras, arraste ou use as setas. Mais detalhes expõe probabilidade, prazo de estagnação e exigência de atividade. Confira a sequência e salve ou cancele. Renomear/reordenar preserva IDs e vínculos. O servidor bloqueia a exclusão de etapa referenciada e informa como resolver; conflito de versão não sobrescreve outra edição.

## Agenda real

No menu comercial, abra Agenda. Desktop oferece Semana e Lista; no celular, a lista é agrupada por dia. Use Hoje/anterior/próximo e filtros de equipe, responsável, tipo, funil, atrasadas ou sem data. O fuso da empresa é indicado e rege dias e horários dos formulários.

Clique em um compromisso para abrir seu painel: consulte o vínculo, conclua, reagende/edite, abra o negócio ou crie a próxima ação. A Agenda utiliza as mesmas tarefas e atividades das outras telas, sem cópias; a conclusão aparece também no negócio. Tarefa mostra prazo. Atividade mostra início e fim somente quando a duração foi registrada.

A contagem informa quantos registros foram carregados. Acima de 100 por tipo, use **Carregar mais** até o total; uma página parcial não é apresentada como agenda completa. Se falhar, tente novamente. Calendários Google/Outlook, recorrência, convites e lembretes externos ficam para outra etapa.

## Regra que funciona na apresentação

A linha **Acompanhamento de proposta** é exclusiva do funil fictício. Abra para escolher/salvar a etapa e depois ativar ou pausar. Entrar na etapa configurada cria uma única tarefa de acompanhamento por negócio, persistida no servidor. A configuração respeita versão e não permite ativar uma mudança de etapa ainda não salva. Os demais rascunhos permanecem simulações.

[Roteiro completo e restauração](presentation-guide.md) · [Escopo e critérios](specs/automation-workspace-agenda.md) · [Validação e limites](automation-workspace-validation.md)
