# Desmos CRM

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Solicitado pelo usuário: Next.js, React, TypeScript, Tailwind, componentes shadcn/ui, TanStack Query, React Hook Form, Zod; backend Node/TypeScript Fastify ou NestJS; PostgreSQL/Drizzle; Docker e Redis. Decisão de implementação registrada em docs/architecture.md: Fastify, monólito modular.

## Users

Pequenas e médias empresas de serviços e B2B, seus vendedores, gestores, administradores e suporte. Usam o CRM diariamente para entender o histórico do cliente e organizar ações comerciais. Desktop é prioritário; mobile deve permitir trabalho essencial.

## Product Purpose

Todo o relacionamento com o cliente em um único lugar. O produto deve evoluir para uso por empresas reais com isolamento entre organizações, manutenção sustentável e foco operacional.

## Positioning

Timeline de relacionamento e Radar Comercial por regras: contexto rápido e próximos passos acionáveis. As Fases 2 e 3 entregam timeline estruturada de cadastros e oportunidades, incluindo alterações, notas, conversão, atividades e tarefas. A jornada de apresentação entrega indicadores persistidos e Radar acionável; relatórios gerenciais extensos continuam futuros.

## Operating Context

Usuário cadastra empresa, torna-se proprietário e configura o ambiente, convida equipe e passa a trabalhar em um contexto empresarial isolado. Empresas clientes diferentes usam o SaaS em ambientes independentes. Cada conta pertence a uma única empresa, com email de login globalmente único; o cadastro cria o ambiente e seu proprietário. Convites adicionam a equipe sem transferir contas já vinculadas a outra empresa, mesmo quando suspensas. Vendedores organizam contatos, negociações e próximos follow-ups; gestores acompanham vendas, conversão e atenção necessária.

## Capabilities and Constraints

O escopo implementado abrange Fundação, CRM Core e Vendas: autenticação, tenants, memberships, RBAC, equipe, onboarding, configurações e cadastro/edição de contatos, empresas clientes e leads. O CRM oferece listas com pesquisa, filtros, ordenação e paginação; responsáveis ativos, tags, notas com menções e timeline. Possíveis duplicados por email/telefone são alertas no mesmo tenant e tipo de registro, sem bloqueio de cadastro nem mesclagem automática.

A conversão de lead cria ou associa contato e, opcionalmente, empresa cliente em uma transação idempotente; a oportunidade opcional participa dessa mesma transação. A lixeira CRM permite restaurar e excluir definitivamente por ação administrativa manual, bloqueando registros com referências comerciais. Vendas tem lixeira/restauração, sem purga definitiva nesta fase. Não há retenção automática nem notificações de menções. As seis tabelas CRM e doze tabelas de vendas usam RLS forçada e FKs compostas; IAM mantém autorização e filtros explícitos no backend.

Vendas entrega pipelines, etapas configuráveis, Kanban, negócios com ganho/perda/reabertura, atividades por tipo e tarefas com checklist. Follow-up é uma tarefa local, criada uma vez por atividade concluída. As Fases 4–7 constam de docs/roadmap.md. O painel simples, o Radar e a proposta da apresentação estão implementados; não anunciar relatórios completos, integrações ou cobrança ainda não implementados. Dados reais de cada conta, feedback de erro/sucesso e segurança backend são necessários.

Direção adicional do usuário em 01/10/2026: cobrir o núcleo comercial do RD Station CRM e priorizar rapidez para apresentação. docs/rd-core-scope.md registra o que existe e as lacunas: gestão comercial, importação/exportação, campos personalizados, produtos, calendário/lembretes, visibilidade por equipe e comunicação integrada. O plano posterior da apresentação antecipou o painel/Radar, catálogo e proposta simples persistidos, mantendo a identidade visual Desmos e o Impeccable. As demais lacunas seguem no escopo comparado; não declarar essas capacidades avançadas implementadas.

A direção mais recente consta de docs/presentation-plan.txt, com autorização para concluir A–D. docs/presentation-flow-contract.md descreve a jornada: Radar → painel lateral → tarefa rápida → proposta → confirmação de ganho → indicadores. Catálogo e propostas usam PostgreSQL, snapshots de cliente/itens/preços e cálculos em centavos. Três negócios fictícios ficam no funil Apresentação Desmos; demo:prepare não sobrescreve e demo:reset restaura somente esse funil. Uma regra de acompanhamento cria uma tarefa real em transições para Proposta, fora de produção e apenas nesse funil, uma vez por negócio. Envios email/WhatsApp e campos obrigatórios adicionais da tela existente continuam simulações no navegador.

## Brand Commitments

Nome definido pelo usuário: Desmos, apresentado como Desmos CRM quando descritivo, com referência ao grego. Atualização explícita em 01/10/2026: símbolo próprio de laço/conexão, azul profundo com dourado fosco, sem brilho ou efeito metálico; superfícies claras e tema claro como padrão. Escuro continua disponível por escolha. Linguagem pt-BR simples, respeitosa e direta. Usuário pediu interface minimalista, profissional, premium, organizada e suficientemente densa. Referências explicitadas: Linear, Attio, HubSpot, Pipedrive, Notion e Slack, sem copiar. Sem neon, estética futurista, sombras excessivas ou gradientes excessivos.

Fluxo principal confirmado: Funil de vendas → negociação → próxima tarefa. A prioridade atual da navegação é Visão geral, Negócios, Clientes e Tarefas; administração e funções secundárias ficam em Configurações. Funções e permissões atuais permanecem. Estratégia da superfície em docs/navigation-design-brief.md.

O usuário também pediu automações por etapa e personalização independente por pipeline. Confirmou que esta entrega deve ser uma demonstração visual, sem envios reais. A rota /sales/automations permite configurar exemplos de email/WhatsApp, condições e prazo, testar simulação e selecionar campos obrigatórios de exemplo. Regras salvas somente no navegador, separadas por empresa/pipeline, sem aplicação backend ou bloqueio real do Kanban. Escopo em docs/automation-demo-contract.md. A personalização existente de etapas continua persistida pela API.

## Evidence on Hand

Requisitos integrais: docs/product-requirements.txt, preservado como briefing original. Esclarecimento do usuário em 01/10/2026: SaaS para empresas clientes independentes, uma empresa por conta, marca Desmos. Essa decisão atualiza a interpretação inicial de multiempresa e está registrada em docs/decisions.md. Arquitetura: docs/architecture.md. Contratos implementados: docs/crm-core-contract.md e docs/sales-contract.md. Nexa Tecnologia, os personagens e as 20 empresas clientes, 60 contatos e 30 leads, 20 oportunidades, 12 atividades e 12 tarefas do seed são demonstração fictícia, não clientes ou indicadores comprovados. Não há depoimentos, indicadores comerciais reais ou material de marca fornecido.

## Product Principles

- Isolamento e autorização fazem parte de toda funcionalidade.
- Cada conta trabalha no ambiente de uma única empresa; a barra lateral identifica esse ambiente sem seletor.
- O histórico deve ajudar o usuário a agir.
- Evoluir módulo por módulo mantendo execução e testes.
- Interface informa o estado real e o próximo passo.

## Accessibility & Inclusion

Navegação por teclado, labels, contraste, foco visível, atributos aria e feedback visual. Responsividade para desktop, notebook, tablet e mobile. Redução de movimento respeitada. Não depender de cor para comunicar status.

Última extensão autorizada em 01/10/2026: automações em Quando → Se → Fazer, com cinco gatilhos e modelos de tarefa, atribuição, movimentação e comunicação. Esses modelos/condições são simulados no navegador, com resumo, teste e histórico; não há motor genérico. A regra funcional do fixture cria tarefa na etapa configurada por ID, com versão, pausa e proteção de referência; renomeação/reordenação não muda seu vínculo. O editor de funis insere em qualquer posição, oferece arraste e setas e preserva negócios/IDs. Contrato e validação: docs/rules-flow-contract.md e docs/rules-guide.md.
