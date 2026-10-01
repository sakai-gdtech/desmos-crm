---
version: 1
slug: "apps-web-src-features-workspace-shell-tsx"
primary_target: "apps/web/src/features/workspace/shell.tsx"
related_targets: ["apps/web/src/features/auth/auth-screen.tsx","apps/web/src/app/globals.css","apps/web/src/app/layout.tsx"]
---

# Navegação e identidade Desmos

## Direção fornecida pelo usuário

O vendedor trabalha em Funil de vendas → negociação → próxima tarefa. O usuário pediu uma navegação mais fácil, um símbolo novo com a ideia de laço/conexão, azul com dourado sem brilho e tema claro por padrão. Nome mantido: Desmos CRM. A entrega usa código para o layout e imagem gerada para o símbolo, conforme a prioridade já fornecida de rapidez para apresentação.

## Direction contract

**THESIS:** a navegação apresenta o trabalho comercial antes da administração; clientes e configurações têm agrupamentos claros em vez de uma lista de dezesseis destinos com o mesmo peso.

**OWN-WORLD:** superfícies brancas, azul profundo nas ações e seleção, dourado fosco no laço e detalhes discretos; tipografia de interface, divisórias finas, ícones consistentes e sem efeitos metálicos. Tema claro na primeira visita, escuro apenas quando escolhido.

**STORY:** o vendedor abre o funil, encontra o negócio e programa a próxima tarefa; configurações permanecem acessíveis em um grupo secundário com nomes em português.

**FIRST VIEWPORT:** marca e empresa fixas no topo da lateral, quatro destinos comerciais diretos, Clientes expansível e Visão geral; Configurações e conta ficam no rodapé. Apenas a lista central rola em telas baixas. No celular, o menu abre como painel com Escape, retorno de foco e fechamento ao navegar.

**FORM:** sistema de fichas corporativas e orientação por índice, posição 7, seed 6770c861. A paleta azul/dourado e o laço são decisões posteriores explícitas do usuário e prevalecem sobre as alternativas do seed. Restrained em modo Operate; hierarquia e navegação padrão prevalecem sobre qualquer expressão temática.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Limites e estados

Preservar rotas, permissões, sessões e cadastros. Nenhum destino futuro aparece como implementado. Grupos abrem ao acessar seus destinos diretamente. A seleção atual usa texto, fundo e aria-current. Toda interação deve funcionar por teclado e touch. Configurações reúne empresa, equipe, funis/etapas, tags, lixeira e auditoria conforme permissões. Perfil e sessões pertencem à conta, separados do trabalho comercial. Estado escuro salvo anteriormente continua respeitado.

## Override aprovado — jornada de apresentação A–D, 01/10/2026

Este adendo prevalece sobre STORY e FIRST VIEWPORT históricos acima onde a jornada ou a ordem dos destinos divergem. O material histórico acima permanece preservado; a autoridade atual é docs/presentation-flow-contract.md, PRODUCT.md e o código entregue. Não há nova identidade, novo sorteio de FORM, comp ou asset. O seed histórico é proveniência, não uma nova escolha.

**THESIS:** abrir a Visão geral, reconhecer o motivo de atenção de um negócio e agir no mesmo contexto. A demonstração deve permitir uma operação sem orientação, com dados persistidos e mensagens diretas.

**OWN-WORLD:** identidade incumbente mantida: branco sobre fundo frio, azul profundo para ação/seleção, dourado fosco no símbolo e no pequeno indicador atual; controles compactos, bordas finas e superfícies planas. O painel modal tem a sombra lateral suave entregue, sem estendê-la aos cards. Claro é o padrão; escuro continua por escolha.

**STORY:** Radar → negócio em painel lateral → tarefa rápida → proposta salva → confirmação explícita de ganho → indicadores atualizados. A regra demonstrativa ao entrar em Proposta cria uma tarefa real uma vez por negócio no funil fictício; email e WhatsApp continuam simulações identificadas.

**FIRST VIEWPORT:** Visão geral, Negócios, Clientes expansível e Tarefas nesta ordem na navegação principal. Atividades e lista de Oportunidades passam para Configurações, junto aos destinos administrativos e Automações, conforme permissões. Marca e empresa ficam no topo; perfil/logout no rodapé. Visão geral comercial oferece seleção de funil, quatro indicadores (valor em aberto, ganhos, tarefas atrasadas e sem próxima ação), Novo negócio e Radar com registros nomeados. A conta sem deals.view conserva sua visão de configuração.

**FORM:** extensão em modo Operate da composição corporativa aprovada. Faixa de indicadores separada por divisórias; Radar em linhas; Kanban preservado atrás de painel lateral; campos curtos e detalhes opcionais. Nenhuma composição da apresentação vira obrigação para outras superfícies.

**INTERAÇÃO:** links reais do Kanban/Radar abrem o painel no clique de navegação normal e mantêm destino completo para nova aba. Filtros e rolagem permanecem no Kanban montado. Escape/Fechar negócio/backdrop encerram o painel e devolvem foco ao link de origem sem rolar. Valor final, etapa, responsável e cliente aparecem antes da próxima ação. Criar tarefa usa título, prazo e responsável reutilizado; Mais detalhes guarda descrição. Ver proposta abre itens e totais; ganho pede confirmação do valor final.

**RESPONSIVO:** painel até 760px junto à direita e 100dvh, tornando-se toda a largura disponível no celular, com rolagem interna e cabeçalho sticky. Indicadores passam a duas colunas até 1100px. Radar, tarefas e ações refluem até 760px; formulários se empilham conforme breakpoints incumbentes. Kanban rola no próprio container. Preservar labels, foco e ações essenciais.

**DADOS E VERDADE:** indicadores e Radar são calculados sobre registros ativos no PostgreSQL, separados por moeda e pelo funil escolhido; a tela informa período inteiro e limites das listas. Proposta preserva cliente, itens e preços em snapshots; salvar atualiza o valor final. Acompanhamento real é exclusivo da demo fora de produção; execuções mostram links para tarefas criadas. Não anunciar envio, assinatura, PDF elaborado ou motor genérico como implementados.

**FINISH:** docs/presentation-finish-review.md registra disposition: ship após revisão independente das treze capturas. Esta reconciliação documental lê código e evidências existentes, sem executar browser, detector ou nova rodada visual. O critério é protótipo profissional de apresentação dentro da identidade incumbente.
