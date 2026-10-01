# Desmos CRM — núcleo comercial de referência

Direção definida pelo usuário em 01/10/2026: o Desmos deve cobrir as funcionalidades essenciais de um CRM de vendas, usando o RD Station CRM como referência. A prioridade imediata é uma demonstração funcional, com evolução por entregas pequenas. Este documento define o escopo do Desmos; não é uma promessa de equivalência integral a um plano do RD.

Referências oficiais consultadas em 01/10/2026: [produto RD Station CRM](https://www.rdstation.com/produtos/crm/) e [funcionalidades por plano](https://www.rdstation.com/planos/crm/). A seleção abaixo é nossa interpretação do núcleo necessário para o Desmos. Os produtos RD Station Marketing e Conversas têm escopos próprios.

## Situação atual e entregas necessárias

| Capacidade do Desmos | Situação atual | Entrega que falta |
| --- | --- | --- |
| Contatos, empresas clientes e leads | Implementado: cadastros, responsáveis, pesquisa, tags, notas, histórico e conversão | Importar e exportar cadastros |
| Funis e negociações | Implementado: múltiplos pipelines, etapas, Kanban, valores, previsão, ganho/perda e reabertura | Campos obrigatórios por etapa e filtros salvos |
| Tarefas e interações | Implementado: agenda em lista, tipos de atividade, prazos, prioridades, checklist e follow-up | Calendário visual, lembretes e notificações |
| Gestão comercial | Valores e quantidades no Kanban; probabilidade e previsão persistidas | Dashboard, relatórios, conversão, perdas, metas, previsão agregada e desempenho por vendedor |
| Equipe e acesso | Convites, seis papéis, permissões por ação e isolamento entre empresas | Grupos de vendas e visibilidade de registros por responsável/equipe |
| Adaptação ao negócio | Tags, etapas, responsáveis e exigência de próxima atividade | Campos personalizados e obrigatórios, motivos de perda administráveis |
| Produtos e serviços | Ainda não implementado | Catálogo, itens da negociação, quantidades, preços, descontos e totais |
| Comunicação comercial | Registro manual de atividades de email, ligação e WhatsApp | Envio comercial de email, modelos e integração de WhatsApp com histórico |

Os motivos de perda atuais são texto com sugestões no formulário, sem catálogo administrável. Papéis não equivalem a restrições por carteira: hoje o acesso permitido pelo papel abrange os registros da própria empresa. O SMTP existente atende autenticação e convites, sem editor de email comercial. Registrar uma atividade de WhatsApp não sincroniza conversas.

## Ordem de desenvolvimento para apresentação

1. **Gestão comercial:** dashboard com dados persistidos, negócios abertos/ganhos/perdidos, receita realizada, previsão ponderada, distribuição por etapa, perdas e desempenho por responsável. Filtros por período e pipeline; metas simples; Radar com negócios sem avanço e tarefas vencidas. Esta é a próxima entrega de interface.
2. **Entrada e adaptação dos dados:** importação/exportação CSV com mapeamento e resumo, campos personalizados básicos, obrigatoriedade por etapa e catálogo de motivos de perda. Começar por CSV; XLSX pode vir depois.
3. **Venda completa:** produtos e serviços associados às negociações, descontos, totais e proposta simples; calendário visual e lembretes internos.
4. **Operação de equipe e comunicação:** visibilidade por carteira/equipe, filtros salvos, modelos e envio comercial de email. O WhatsApp começa com uma ação explícita para abrir a conversa; sincronização e envio por provedor serão uma integração separada, identificada como tal.

As fases originais continuam em [roadmap.md](roadmap.md). Esta ordem antecipa capacidades dessas fases para completar o núcleo comercial antes das funções avançadas. Automações complexas, IA, billing e plataforma de integrações permanecem posteriores. Não criar telas com números fixos apresentados como resultados reais.

## Critério para apresentar o núcleo como completo

O usuário deve conseguir cadastrar/importar clientes, criar e mover uma negociação, definir campos e itens, registrar uma interação, programar o próximo contato, concluir uma venda e acompanhar o resultado nos relatórios. Cada ação deve persistir e respeitar a empresa e as permissões da conta. O ambiente de demonstração pode usar registros fictícios identificados como tal.

Enquanto houver capacidade pendente na tabela acima, comunicar a versão como **núcleo comercial em desenvolvimento**. Integrações externas só são consideradas entregues depois de conectadas e verificadas com um provedor real. A apresentação não substitui a preparação operacional para clientes reais.
