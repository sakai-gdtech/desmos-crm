# Jornada de apresentação Desmos — 01/10/2026

Pedido: docs/presentation-plan.txt, com autorização posterior para concluir todas as etapas A–D. Prioridade: protótipo claro, operável e persistido para 5/10; aproveitar a arquitetura existente.

## Direção

Modo Operate. Refinamento da identidade azul profundo/dourado fosco aprovada, usando os tokens e controles existentes. Tema claro padrão. Sem nova identidade, imagens ou comp. Produto profissional, tarefas curtas, hierarquia explícita e leitura rápida.

## Primeiro viewport

Visão geral com quatro indicadores do funil escolhido e Radar acionável. Sidebar: Visão geral → Negócios → Clientes → Tarefas. Configurações guarda recursos secundários. Radar exibe nomes, cliente, motivo de atenção, valor e etapa. Ação principal: Novo negócio.

## Interação principal

Abrir um negócio no painel lateral mantém o Kanban montado, seus filtros e sua rolagem. Cliente, valor final, responsável e etapa aparecem primeiro. Próxima ação permite criar tarefa inline com título, prazo e responsável reutilizados. Escape e Fechar negócio devolvem foco ao link de origem. Abrir em nova aba permanece possível.

## Dados e verdade

Radar e indicadores são agregados do PostgreSQL e respondem às mudanças. Valores separados por moeda; período inteiro; negócios e tarefas excluídos ficam fora. Sem próxima ação significa ausência de tarefa/atividade pendente com data futura. Negócio parado respeita staleDays da etapa. Lista limitada a 20 alertas/10 tarefas; contagens não são limitadas. Sem permissão de tarefas, o painel não revela seus detalhes.

Proposta salva snapshot de cliente e preços/itens em JSONB. Quantidades inteiras, dinheiro calculado em centavos no backend, desconto absoluto na moeda do negócio, total não negativo. Salvar sincroniza valor do negócio e incrementa versões; ganho exige confirmação do valor final. Alteração posterior do catálogo não modifica propostas salvas. Não há envio, assinatura ou PDF nesta entrega.

Automação restrita ao funil com demo_fixture e ambiente fora de produção: transição real para Proposta gera tarefa real no banco. Uma execução por negócio, inclusive ao reentrar; transação junto à alteração de etapa. Email/WhatsApp existentes continuam simulações visuais claramente identificadas.

## Escopo e validação

A: navegação/kanban/drawer/formulários. B: indicadores/Radar. C: proposta/catálogo simples/fechamento explícito. D: acompanhamento único na demo. Não expandir para motor genérico, cobrança, importação ou assinatura.

Notebook 1440×900 e 1280×650, celular 390×844, claro/escuro, teclado, recarga, cancelar, clique duplo, filtros e rolagem. Testes API de dinheiro/versionamento/isolamento/RLS/deduplicação; roteiro E2E desktop e mobile. Duas rodadas próprias no máximo de captura/QA visual, detector único, revisão independente e comparação documental ao sistema existente.
