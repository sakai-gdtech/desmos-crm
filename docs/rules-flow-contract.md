# Automações e ordem das etapas — contrato da apresentação

Esta documentação registra a etapa anterior. A interface atual, com lista/editor separados, modelos versionados, assistente e Agenda, está no [guia atualizado](automation-workspace-guide.md) e na [especificação da extensão](specs/automation-workspace-agenda.md).

Extensão Operate da identidade clara azul/dourado aprovada, sem novo mundo visual ou assets. Fonte autorizadora: pedido de 01/10 para configuração simples, gatilhos/condições/ações e inserção/reordenação de etapas, mantendo os dados existentes. Qualidade exigida: operação clara na apresentação de 5/10; não implementar motor genérico ou integrações externas.

A automação tem três partes legíveis: Quando acontecer → Se atender às condições (opcional) → Fazer. Modelos, condições progressivas, resumo, prévia e resultados ficam no fluxo existente. Os exemplos são salvos por empresa/funil no navegador; não executam registros automaticamente. Leads não aceitam condições de valor/etapa de negócio. Movimentação para a própria etapa é rejeitada na prévia. Email e WhatsApp não são enviados.

A ação funcional continua sendo a tarefa real da demo. Sua etapa passa a ser configurável por ID, com versão e validação de empresa/permissões. Executa em transições de negócios abertos, no fixture fora de produção, uma vez por negócio; não dispara outro movimento. Renomear ou reordenar preserva o vínculo. Excluir a etapa vinculada exige reconfigurar a regra primeiro. Testar a prévia nunca altera registros; o resultado real é consultado pelas execuções com link à tarefa.

O editor insere uma etapa antes de qualquer outra ou no final. Novas linhas têm identidade local estável até salvar; etapas existentes mantêm UUIDs. Alça de arraste e setas mudam a ordem, numeração acompanha a posição e o Kanban reflete a ordem persistida após salvar/recarregar. Cancelar abandona alterações; versão evita sobrescrita e clique duplo não salva duas vezes. Não apagar dados para contornar vínculos.

Verificar desktop/notebook/mobile, teclado, contraste, overflow, runtime e acessibilidade em duas rodadas no máximo; detector uma vez. API deve verificar isolamento, permissões, conflito, pausa, renomeação/reordenação e exclusão protegida. Navegador deve verificar inserção na terceira posição, arraste/setas, reload/cancelar, cliques duplos, referência do negócio e da regra. Finish reviewer e Documenter independentes antes do commit/push; sem deploy.
