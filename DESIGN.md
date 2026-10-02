---
name: "Desmos CRM"
description: "Interface profissional, minimalista e organizada para o trabalho diário."
colors:
  background: "#f8f7f4"
  surface: "#ffffff"
  sidebar: "#ffffff"
  surface-hover: "#f2f1ed"
  text: "#202d40"
  muted: "#5d6b7e"
  subtle: "#6b788a"
  border: "#e4e3de"
  primary: "#173b68"
  primary-hover: "#102c50"
  primary-soft: "#eaf0f7"
  primary-text: "#173b68"
  brand-gold: "#aa8446"
  brand-gold-soft: "#f6f0e4"
  brand-gold-text: "#76551f"
  brand-gold-border: "#dac7a3"
  success: "#217550"
  success-soft: "#e8f4ed"
  warning: "#8a5b16"
  warning-soft: "#fbf1df"
  danger: "#b63b44"
  danger-soft: "#fdf0f0"
  focus: "#3067a9"
  background-dark: "#141c28"
  surface-dark: "#1c2736"
  sidebar-dark: "#182332"
  surface-hover-dark: "#26354a"
  text-dark: "#edf2f8"
  muted-dark: "#afbbcc"
  subtle-dark: "#a2b0c3"
  border-dark: "#35465c"
  primary-dark: "#91baf0"
  primary-hover-dark: "#b2d0f6"
  primary-soft-dark: "#263d59"
  primary-text-dark: "#bad3f5"
  brand-gold-dark: "#c9aa73"
  brand-gold-soft-dark: "#343125"
  brand-gold-text-dark: "#e4c58e"
  brand-gold-border-dark: "#706044"
  success-dark: "#89d7ae"
  success-soft-dark: "#253d34"
  warning-dark: "#e6c286"
  warning-soft-dark: "#3e3428"
  danger-dark: "#ffacb2"
  danger-soft-dark: "#422a33"
  focus-dark: "#91baf0"
  primary-ink-dark: "#10213b"
  input-hover-border: "#a1a8b7"
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.22
    letterSpacing: "-0.035em"
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-0.012em"
  subtitle:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.45
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 550
    lineHeight: 1.5
  button:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "13px"
    fontWeight: 550
    lineHeight: 1.35
  badge:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.6
rounded:
  badge: "5px"
  control: "7px"
  feedback: "8px"
  card: "12px"
  dialog: "14px"
spacing:
  control-gap: "8px"
  field-gap: "7px"
  form-gap: "20px"
  section-gap: "28px"
  panel-padding: "24px"
  settings-padding: "26px"
  page-inline: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.primary-ink-dark}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
    height: "40px"
    width: "100%"
  nav-item:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
    height: "44px"
  nav-item-current:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-text}"
  badge:
    backgroundColor: "{colors.surface-hover}"
    textColor: "{colors.muted}"
    typography: "{typography.badge}"
    rounded: "{rounded.badge}"
    padding: "3px 8px"
  badge-green:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
  badge-indigo:
    backgroundColor: "{colors.primary-soft}"
    textColor: "{colors.primary-text}"
  badge-amber:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.warning}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
  alert-success:
    backgroundColor: "{colors.success-soft}"
    textColor: "{colors.success}"
    rounded: "{rounded.feedback}"
    padding: "12px 14px"
  deal-drawer:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    width: "min(760px, 100vw)"
    height: "100dvh"
  dialog:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.dialog}"
    padding: "25px"
    width: "min(490px, calc(100vw - 32px))"
---

# Design System: Desmos CRM

## Overview

**Creative North Star: "Minimalista, profissional e muito organizada"**

O Desmos CRM adota a direção confirmada no briefing: minimalista, profissional, premium, muito organizada e densa o suficiente para uso empresarial. A hierarquia aparece na tipografia, no alinhamento e nas divisórias; o azul profundo concentra ações e foco sobre superfícies claras; o dourado fosco orienta a navegação e destaca pontos de conexão. As referências de software do produto orientam a clareza do trabalho sem reproduzir a identidade de outra marca.

A marca Desmos mantém a referência grega a laço e conexão. O símbolo próprio é uma imagem raster gerada em azul profundo e dourado fosco, sem brilho ou efeito metálico, compartilhada pela autenticação, barra lateral e ícone da aplicação. A identificação da empresa na barra lateral é estática: cada conta pertence a uma única empresa cliente do SaaS.

Este documento registra os padrões reutilizados na autenticação, onboarding, navegação, configurações e trabalho comercial. A fonte da verdade visual é `apps/web/src/app/globals.css`, combinada com `apps/web/src/components/ui/primitives.tsx`, `apps/web/src/components/brand.tsx`, `apps/web/src/features/workspace/shell.tsx` e os componentes de cada tela. Os valores do frontmatter correspondem à implementação após a mudança de identidade autorizada em 01/10/2026. Capacidades de fases futuras permanecem requisitos, sem componentes fictícios.

**Key Characteristics:**

- Superfícies claras por padrão, separadas por tom e borda fina.
- Densidade operacional com títulos curtos e controles compactos.
- Azul profundo para ação e foco; dourado fosco no símbolo, navegação ativa, abas, seletores e Assistente.
- Tema escuro por escolha explícita e navegação agrupada, adaptada a telas pequenas.

## Colors

A paleta combina neutros claros levemente aquecidos com azul profundo, dourado fosco e cores semânticas contidas. A primeira visita inicia no claro, independentemente do sistema operacional. Uma escolha salva em `orbit-theme` é respeitada; o controle da barra superior alterna e salva claro/escuro. Os tokens sem sufixo correspondem ao tema claro; `-dark` registra o valor que a mesma variável CSS recebe quando a raiz possui `data-theme="dark"`. O código continua consumindo as variáveis semânticas sem sufixo em ambos os temas.

### Primary

- **Azul profundo de ação** (`primary`, `primary-hover`): preenchimento do botão principal e indicação de progresso.
- **Azul suave** (`primary-soft`, `primary-text`): badges de contexto, avatars, links e texto das seleções. O fundo suave não substitui o contraste de texto.
- **Azul de foco** (`focus`): contorno de teclado compartilhado por links, botões e campos.
- **Tinta do botão no tema escuro** (`primary-ink-dark`): texto escuro sobre o azul mais claro do botão principal.

### Secondary

- **Dourado fosco de conexão** (`brand-gold`): indicador atual e linha da aba selecionada. `brand-gold-soft` sustenta navegação/opção selecionada, passo atual e entrada do Assistente. `brand-gold-text` mantém legíveis texto pequeno e ícones nesses fundos; `brand-gold-border` é uma divisória suave. Resumo financeiro, ícones do Radar, contagem de etapas e marcador Hoje da Agenda recebem o mesmo acento. Cores de etapas e badges semânticos permanecem próprias. O símbolo raster também combina azul e dourado; seus pixels são um asset fixo, não uma aplicação dinâmica dos tokens CSS.

### Neutral

- **Fundo levemente aquecido** (`background`): plano de trabalho, cabeçalhos e rodapés de tabela.
- **Superfície** (`surface`): campos, cards, barra superior e diálogo.
- **Navegação clara** (`sidebar`): plano branco contínuo da barra lateral no tema padrão, com adaptação tonal no escuro.
- **Superfície de interação** (`surface-hover`): hover de linhas, navegação e botões secundários; também badges neutros.
- **Texto principal, secundário e auxiliar** (`text`, `muted`, `subtle`): hierarquia de conteúdo, legendas e placeholders.
- **Divisória** (`border`): bordas de campos, containers e linhas. `input-hover-border` registra a borda de hover específica dos campos.

### Semantic states

Verde (`success`, `success-soft`) comunica conclusão; âmbar (`warning`, `warning-soft`) chama atenção para uma pendência; vermelho (`danger`, `danger-soft`) identifica erro ou ação destrutiva. Esses pares também têm valores próprios no tema escuro. O significado vem do texto e, quando presente, do ícone, além da cor. As rampas tonais no sidecar são amostras sintetizadas apenas para o painel de documentação; não são novos tokens da aplicação.

## Typography

**Família compartilhada:** stack de sistema registrada em `typography`. É uma escolha intencional para a interface operacional. Não há webfont, fonte monoespaçada própria nem pareamento de famílias na implementação.

A escala é compacta e baseada nos papéis existentes; não segue uma razão modular única. Pesos intermediários podem variar visualmente conforme a fonte disponível no sistema operacional.

- **Headline:** título principal das páginas de trabalho; usa o papel `headline`, com redução para telas pequenas.
- **Title:** títulos de seções e containers; usa `title`.
- **Subtitle:** subtítulos e rótulos de grupos de conteúdo; usa `subtitle`.
- **Body:** base do documento; descrições operacionais usam frequentemente (12–13px), mantendo entrelinha arejada.
- **Label:** labels persistentes de campos; usa `label`.
- **Button e Badge:** papéis compactos próprios, registrados no frontmatter.

Descrições de página limitam a linha a (70ch); estados vazios a (55ch). Tabelas usam conteúdo de (12px) e cabeçalhos de (10px). Os tamanhos menores de navegação auxiliar e rodapé são detalhes locais, não uma escala recomendada para texto de leitura. O texto maior da autenticação permanece específico daquela composição. Dados numéricos podem usar algarismos tabulares.

## Layout

O shell de trabalho mantém uma barra lateral fixa (244px), barra superior com altura mínima (69px) e conteúdo central com largura máxima (1500px). A área principal usa margens internas de (36px 40px 44px). A estrutura mantém marca e empresa no topo e conta no rodapé. A lista comercial central rola quando a altura é limitada; os filhos expandidos de Configurações têm rolagem independente e altura máxima de (28dvh), preservando perfil e logout visíveis.

O ritmo observado combina (20px) entre campos e blocos de formulário, (24px) entre colunas de resumo e (28px) entre grandes seções. Cards definem o contorno, enquanto cada conteúdo define seu padding; não há padding universal no componente Card. Formulários de configuração usam (26px), resumos e grupos operacionais normalmente usam (22–24px).

Formulários podem ter duas colunas com divisão igual; configurações usam uma coluna principal e notas laterais. Listas, tabelas e divisórias organizam conteúdo denso sem criar um card para cada linha. Tabelas preservam as colunas e permitem rolagem horizontal no próprio container.

| Condição observada | Adaptação implementada                                                                                         |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| A partir de 1600px | Mais espaço superior; coluna lateral do resumo passa a 320px.                                                  |
| Até 1200px         | Conteúdo principal mais compacto; resumo em uma coluna; notas laterais das configurações ocultas.              |
| Até 980px          | Barra lateral de 220px; onboarding em uma coluna; formulários de convite reorganizados.                        |
| Até 760px          | Navegação passa a drawer de 265px; shell ocupa toda a largura; autenticação mostra somente formulário e marca. |
| Até 520px          | Conteúdo com 16px de margem interna lateral; formulários em uma coluna; ações de formulário ocupam a largura.  |

No perfil em telas pequenas, o bloco de nome e e-mail mantém a largura restante ao lado do avatar; o badge passa para a linha seguinte.

No mobile, abrir o drawer de navegação prende o foco dentro da navegação, bloqueia a rolagem do corpo e torna o conteúdo de fundo inativo. Escape, botão de fechar, scrim e navegação encerram o drawer; o foco volta ao controle anterior. O painel de negócio é uma segunda sobreposição, independente da navegação: ocupa até (760px) junto à borda direita, usa a altura do viewport e rolagem interna, com cabeçalho fixo ao rolar. Seu conteúdo tem padding de (24px), reduzido para (20px 16px) até (760px). O Kanban mantém rolagem horizontal no próprio container; abrir e fechar o registro preserva filtros e posição.

A autenticação usa duas áreas no desktop e formulário com largura máxima (385px); a área narrativa desaparece no mobile.

Na superfície de automações, o diretório ocupa a área de trabalho com largura máxima de (1240px). Abrir uma regra substitui a lista por um editor central de uma coluna, limitado a (850px); a revisão pertence ao mesmo fluxo, sem painel lateral sticky. O formulário dedicado da biblioteca limita a leitura a (760px). Até (760px), pesquisa e cabeçalhos se empilham, os passos mantêm três posições compactas e as ações do editor passam a uma sequência vertical. Esses limites são específicos dessas superfícies; a composição aprovada está em `docs/specs/automation-redesign-global-assistant.md`.

O assistente é uma sobreposição ancorada à direita, abaixo da barra superior: largura até (480px), distância lateral de (16px), topo de (76px) e altura até (780px), limitada a `calc(100dvh - 92px)`. O histórico ocupa o corpo com rolagem própria; cabeçalho, identificação demonstrativa e campo de mensagem permanecem disponíveis. Até (760px), ocupa a largura disponível com margens de (8px), topo de (68px) e altura de `calc(100dvh - 76px)`. A página permanece disponível no fundo; o painel não usa backdrop nem se apresenta como diálogo modal.

## Elevation & Depth

As superfícies de trabalho são planas. A profundidade vem de fundos tonais, bordas de (1px) e sobreposição de diálogo ou navegação mobile. Cards não sobem no hover; tabelas e controles mudam de tom. O diálogo central tem backdrop translúcido e a navegação mobile tem scrim, sem blur. O painel lateral de negócio acrescenta uma sombra suave lateral, registrada no sidecar. O assistente usa uma sombra difusa (`0 14px 42px rgb(0 0 0 / 18%)`) para separar a conversa da página; isso não estende sombras aos cards.

**The Flat-By-Default Rule.** Superfícies de conteúdo permanecem planas; sombras separam as sobreposições de negócio e assistente do contexto preservado.

O foco aparece com contorno de (2px), deslocado (3px) nos controles gerais e (1px) nos campos. Esse contorno comunica interação, não elevação. Os valores de backdrop, contorno e camadas ficam nos snippets do sidecar, pois não são propriedades do schema de componentes do frontmatter.

## Shapes

Cantos discretamente arredondados delimitam controles, badges, containers e diálogos conforme `rounded`. Botões e campos compartilham o raio de controle; cards são mais amplos; badges permanecem compactos. A borda comum é fina e contínua.

Avatars usam quadrados arredondados com iniciais e tamanhos contextuais. Círculos ficam restritos a indicadores de estado e progresso. A marca Desmos usa um laço próprio no asset `apps/web/public/brand/desmos-symbol.png`, exibido pelo componente BrandSymbol com (40px) na marca do shell e da autenticação e (180px) na área narrativa do login. O ícone da aplicação usa `apps/web/src/app/icon.png`. No escuro, o símbolo recebe base branca e cantos de controle para preservar seus pixels. A autenticação apresenta o asset sobre azul suave, sem ornamento elíptico. A proveniência está em `docs/desmos-symbol-prompt.txt`; o símbolo não deve ser substituído por um ícone genérico.

## Components

### Buttons

Botões são compactos, com ação explícita em texto. O componente aceita `primary`, `secondary`, `ghost` e `danger`, usando os tokens homônimos no frontmatter. A altura mínima normal é (38px); autenticação usa (44px). Ícone e texto têm intervalo de (8px).

O primário muda para o azul de hover; o secundário muda superfície e borda; o ghost ganha fundo neutro. O danger usa fundo vermelho suave e texto semântico, sem efeito de hover específico adicional. Todo botão recebe foco visível. Desabilitados têm opacidade (0,56); carregamento inclui spinner e impede novo envio.

### Inputs / Fields

Campos de texto e selects compartilham superfície, borda e raio. O `Select` compartilhado usa botão combobox e lista de opções desenhada pelo Desmos, com seta, indicador de seleção e estados de foco próprios nos dois temas; não abre o menu do sistema operacional. Placeholders usam o tom auxiliar. Hover altera a borda, foco mostra contorno e erro usa borda semântica. Campos desabilitados ou somente leitura usam fundo de página e texto secundário.

O menu do Select sobe para a camada de popover do navegador, com portal no mesmo diálogo ou landmark, evitando cortes em tabelas, painéis e modais. A largura e a abertura acima/abaixo acompanham o viewport. Setas, Home/End e PageUp/PageDown movem a opção ativa; digitar encontra o prefixo sem distinguir acentos; Enter/Espaço ou Tab confirmam, Escape cancela. Clique fora fecha sem alterar a escolha. O foco permanece no combobox, e `aria-activedescendant` identifica a opção ativa. O select oculto preserva valores, eventos e integração com formulários, sem participar do teclado ou da árvore acessível. O contrato está em `docs/specs/custom-selects.md`.

Field mantém label associado e liga mensagens de erro ou ajuda ao controle por `aria-describedby`; erros também marcam `aria-invalid`. As mensagens ficam abaixo do campo. A altura padrão é registrada no frontmatter; autenticação aumenta para (44px). Textarea permite expansão vertical.

### Navigation

Links e expansores da barra lateral têm texto compacto (13px), ícone de (18px) e altura mínima de (44px); os filhos usam (12px). O hover usa superfície neutra; o item atual usa azul suave, peso (550), `aria-current="page"` e indicador dourado de (5px). O grupo que contém a página atual recebe texto azul e peso (600).

A navegação principal segue Visão geral → Negócios → Clientes → Agenda → Tarefas → Automações, conforme permissões. Negócios abre o Kanban; Clientes expande Leads, Contatos, Empresas clientes, Tags e Lixeira. Configurações fica no rodapé com Empresa, Equipe e acessos e Auditoria, seguida da área de conta com Meu perfil e Dispositivos e sessões. Perfil e logout permanecem visíveis abaixo do grupo. Os expansores expõem `aria-expanded` e `aria-controls`; os grupos abrem ao acessar um filho diretamente.

Agenda, Tarefas e Atividades compartilham a navegação irmã “Planejamento comercial”, com estado atual textual/visual e links conforme acesso. Negócios mantém Kanban/Lista no mesmo contexto, com o funil selecionado no endereço. “Gerenciar funis” abre o catálogo; “Editar etapas” abre o editor do funil selecionado. O catálogo mostra nome, estado, sequência de etapas e ações de editar/automações. As URLs existentes continuam válidas; lista de negócios e funis usam o estado atual de Negócios no shell, e Atividades usa o de Agenda. A direção desta composição está em `docs/specs/navigation-chat-motion.md`.

A empresa da conta aparece como identificação estática, sem seletor ou ação de criar outra empresa. A marca retorna à Visão geral. Quem tem permissão de negócios vê o painel comercial; os demais mantêm a visão de configuração da empresa. Links de navegação fecham o drawer quando aberto. A mesma hierarquia e os mesmos agrupamentos se mantêm no mobile.

### Chips / Badges

Badges são identificadores de estado e contexto, não botões. Variantes `neutral`, `green`, `indigo` e `amber` usam pares de fundo e texto descritos em Colors. `indigo` é o nome legado da API do badge; seu par semântico agora é azul, sem definir uma segunda identidade. O label informa o significado; não há comportamento de hover interativo.

### Cards / Containers

Card aplica superfície, borda e raio, sem sombra e sem padding próprio. Seções internas, tabelas e listas controlam seus espaçamentos. Bordas entre linhas separam itens sem multiplicar containers arredondados.

### Feedback / Loading / Empty states

Alert de erro usa `role="alert"`; sucesso usa `role="status"`. Ícone e texto compartilham a cor semântica, com fundo suave e borda translúcida. Estados vazios informam ausência de conteúdo e podem apresentar a próxima ação; falhas de carregamento oferecem nova tentativa quando disponível.

Skeletons usam a cor de borda e pulsação de (1,8s); spinners giram em (1s). Transições de cor, fundo e borda duram (150ms); a seta dos expansores gira em (160ms) com `ease-out`. `prefers-reduced-motion: reduce` remove animações e transições. Movimento serve ao estado da operação.

O movimento confirma mudança de contexto, entrada de resultados e continuidade de posição. O cabeçalho de página entra em (280ms) com deslocamento de (20px), horizontal no desktop e vertical até (760px). Coleções entram verticalmente em (240ms), com deslocamento de (12px), intervalos de (20ms) e até seis filhos; o último termina em até (340ms). Isso se aplica aos resultados conectados ao componente de coleção, não a todo card estático nem a toda edição de texto. As métricas conservam seus valores sem contagem artificial.

No Kanban e na sequência de etapas, operações deliberadas capturam a posição antes da mudança e animam o delta real do layout em (320ms), com até vinte elementos animados por operação e medições em lote. Inserções sem posição anterior partem de deslocamento vertical de (18px). A identidade dos registros e o foco permanecem ligados aos mesmos IDs; o movimento não muda a ordenação ou o resultado salvo. Trocas de passo no editor de automações usam (280ms), deslocamento de (24px) horizontal no desktop e de (20px) vertical no mobile, na direção da progressão. O foco chega ao título do passo sem esperar o efeito.

Pressão de controles combina deslocamento de (1px) e escala (0,98) em (110ms). Ícones de ação se deslocam (3px) em (200ms); ícones de navegação usam (4px). Linhas mantêm feedback tonal de (160ms); mudanças de seleção, checklist e expansões têm efeitos finitos de (200–220ms). Diálogos entram em (260ms) com deslocamento vertical de (18px) e escala inicial (0,98). Painéis de negócio e assistente entram em (320ms), com deslocamento horizontal de (-48px) no desktop, para dentro do viewport, ou vertical de (24px) no mobile. Sua desaceleração e a continuidade FLIP usam spring finita sem bounce. A navegação mobile conserva a entrada CSS de (320ms)/(-48px), e backdrop/scrim usam (220ms). Fechar libera o contexto imediatamente. Alertas entram em (220ms) com deslocamento de (10px), e a conversa do assistente anima somente mensagens novas. Demais entradas usam a curva `cubic-bezier(0.16, 1, 0.3, 1)`; a seta dos expansores conserva seu efeito próprio.

A central Motion.dev (13.5.0) usa `animate` de `motion/mini` e o gerador `spring` de `motion`, substituindo o motor manual WAAPI. Mantém registro de animações finitas, cancela no cleanup, ao ocultar a aba e ao ativar redução de movimento em runtime e restaura o transform inline anterior ao terminar ou cancelar. Não inicia efeitos em elementos desconectados, sem área visível ou fora do viewport. CSS conserva feedback simples de cor/pressão/disclosure/backdrop e remove animações/transições com `prefers-reduced-motion: reduce`, preservando texto, cor e foco. Conteúdo e controles já existem antes do efeito; nenhuma entrada espera para permitir submit, seleção ou teclado. Não há observer global de mutações nem um segundo motor de transform dos painéis/coleções. A aplicação por família está em `docs/specs/system-motion.md`.

### Commercial context

O painel comercial usa uma faixa única de indicadores com divisórias, seguida de listas do Radar. Valores têm algarismos tabulares; alertas combinam motivo textual, cliente, valor e etapa. A faixa usa quatro colunas, passando a duas até (1100px); listas refluem até (760px), sem exigir tabela larga. Esses números representam registros persistidos do funil escolhido, com a origem e o período informados na tela. A composição específica da apresentação está no contrato da superfície.

O registro mostra valor final, etapa, responsável e cliente antes da próxima ação. O formulário inline de tarefa usa título, prazo e responsável com labels persistentes; descrição e campos adicionais ficam em “Mais detalhes”. A proposta usa grupos de itens com descrição e controles compactos, divisórias, catálogo opcional e totais alinhados. O valor final fica explícito na confirmação de ganho. A indicação de proposta salva ou alterada e as mensagens de erro/sucesso reutilizam os padrões existentes.

### Rule configuration and stage editor

A configuração de automações começa pelo diretório: funil, “Criar automação”, pesquisa e linhas com nome, resumo do gatilho/ação e status textual. “Biblioteca de mensagens” é acesso secundário; “Ajustes do funil” reúne recursos auxiliares. Receitas de automação ficam em disclosure próprio e iniciam um rascunho com gatilho e ação.

O editor substitui o diretório e mostra apenas os campos do passo atual: “Gatilho e condições” → “Ação e mensagem” → “Revisar e testar”. Labels persistentes, campos compactos e divisórias preservam a identidade. A navegação dos passos usa `aria-current="step"`, número, texto e contorno dourado no passo atual. Condições e prazo de exemplo ficam em disclosures; a ação selecionada determina seus campos. Na ação de mensagem, a seleção de modelo, sua revisão e a prévia aparecem no mesmo fluxo vertical. O resumo de revisão usa lista de definição Quando → Se → Fazer, teste e histórico de até oito resultados.

“Rascunho de simulação”, “Sem efeitos reais” e os textos das ações distinguem exemplos de execução. “Salvar rascunho” aparece na revisão e conserva a configuração local sem ativar regra real; testar apresenta resultado textual sem enviar mensagens ou alterar registros. O retorno ao diretório e o cancelamento preservam a distinção entre conteúdo editado e salvo. Alterações pendentes em regra ou modelo exigem confirmação de descarte nos controles locais e nos links internos; recarregar ou sair da página usa o aviso do navegador. O histórico nativo de voltar/avançar não recebe interceptação específica.

O acompanhamento real de proposta aparece como linha própria do diretório, identificado por “Funciona nesta demo”, e abre sua configuração dedicada. A etapa selecionável, os controles de salvar, pausar/ativar, a prévia e os links às tarefas criadas deixam o efeito real explícito no funil fictício. O estado ativo/pausado recebe texto, e a prévia informa que não altera registros. A identidade da etapa é preservada ao renomear ou reordenar; a apresentação do seu nome acompanha a configuração, sem assumir “Proposta” como gatilho fixo.

No editor de etapas, a posição de inserção e “Adicionar etapa” precedem a sequência de fieldsets separados por divisórias. A numeração acompanha a posição atual. A alça “Arrastar” combina ícone de linha e texto; as setas oferecem a mesma reordenação por teclado ou touch, com labels acessíveis. O alvo de arraste recebe o contorno de foco existente, sem nova cor ou elevação. O nome da etapa inserida recebe foco e o resultado da mudança de ordem aparece em uma mensagem de status.

O seletor de posição e a ação de inserção de etapa se empilham até (760px); as setas preservam alvos de (44px). O editor de etapas mantém sua composição própria, independente dos passos de automação.

O retorno do editor de etapas respeita o contexto de entrada: acesso pelo Kanban usa o mesmo funil selecionado; acesso pelo catálogo retorna ao catálogo. Cancelar/voltar e links internos com alterações abrem confirmação para continuar editando ou descartar. Alterações não salvas são recuperáveis em memória ao retornar na mesma sessão, por identidade tenant + user e chave de funil + versão; salvar ou descartar limpa essa memória. Recarregar ou trocar a identidade encerra essa recuperação, sem substituir a persistência pela API.

### Message library

A biblioteca mostra pesquisa por nome, filtro de canal, nome, revisão e amostra do conteúdo em linhas separadas por divisórias. “Criar modelo” e “Editar modelo” substituem a lista por formulário dedicado com nome, canal, assunto de email e corpo. Variáveis têm controles de inserção, e a prévia usa exemplo identificado como fictício. Salvar e cancelar são ações explícitas. No mobile, linhas e ações se empilham sem perder o canal ou a revisão.

A biblioteca guarda mensagens reutilizáveis; receitas iniciam regras. Uma automação mantém ID, revisão e snapshot do modelo escolhido. Atualizar a biblioteca não altera o conteúdo salvo da regra; o editor informa a nova revisão e oferece atualização explícita ou personalização somente nessa regra. Referência ausente recebe aviso e caminho de reparo antes de salvar.

### Global assistant

“Assistente” permanece na barra superior do shell autenticado, com ícone e texto também no mobile. O chat tem cabeçalho compacto com contexto da rota e “Demonstração local · sem envio”. O histórico domina o corpo rolável; sugestões contextualizadas e campo de mensagem multilinha ficam no rodapé, fora dessa rolagem. O botão expõe `aria-expanded` e `aria-controls`; a abertura leva o foco ao controle de fechar, Escape fecha quando não há outro diálogo aberto e o botão de fechar devolve o foco à entrada. É um painel não modal, sem aprisionamento de foco.

A conversa identifica os autores “Você” e “Desmos”. A mensagem do usuário alinha à direita sobre fundo azul suave; a resposta usa texto na superfície, com quebra de linha e sem caixa tonal concorrente. O estado vazio informa como começar e o alcance local. O histórico usa `role="log"` e anúncio polite de adições; o campo tem label acessível, Enter envia, Shift+Enter quebra a linha e composição IME não dispara envio. “Limpar conversa” reinicia o histórico e a interpretação. Após a primeira abertura, permanece montada ao fechar ou navegar no mesmo workspace. A sessão é memória React ligada à identidade tenant + user e reinicia quando essa identidade muda ou a página recarrega; conversas não são gravadas em armazenamento compartilhado.

A ajuda contextual e a interpretação demonstrativa de entrada em etapa para email/WhatsApp não usam LLM externo nem aplicam dados. A interpretação suportada incorpora uma revisão à resposta na conversa: uma lista de definição resume Funil, Quando, Fazer, Para e Mensagem, seguida de “Ajustar interpretação” e “Gerar rascunho para revisão”. As escolhas de funil, etapa, modelo opcional e destinatário ficam no disclosure, aberto enquanto houver resolução pendente. “Sem efeitos reais” identifica esse bloco. “Eu” mostra nome/email autenticados e fixa o criador no destinatário. O botão abre o editor para revisão e salvamento humanos. Sem `pipelines.manage`, a superfície oferece ajuda sem carregar funis/modelos ou preparar rascunhos. O chat e a navegação estão descritos em `docs/specs/navigation-chat-motion.md`.

### Dialogs

O diálogo usa o elemento nativo `dialog` aberto por `showModal()`, título associado e botão de fechar com label acessível. Escape e clique no backdrop fecham a janela. A largura máxima e o padding estão registrados no frontmatter; o diálogo centraliza com margem automática, limita a altura a `calc(100dvh - 32px)` e permite rolagem interna. O backdrop separa o contexto. Confirmações de alteração de acesso explicam o efeito antes da ação.

O painel lateral de negócio também usa `dialog` com `showModal()`, título associado e fechamento por Escape, botão ou backdrop. Tem cantos retos, cabeçalho sticky e largura/altura registradas em `deal-drawer`. Ao fechar, devolve foco ao link de origem com `preventScroll`; abrir normalmente intercepta o link do Kanban ou Radar, enquanto o destino completo continua disponível para uma nova aba. A rolagem do corpo fica bloqueada durante a abertura.

## Do's and Don'ts

As ferramentas acrescidas para a conclusão mínima do PDF reutilizam superfícies e controles do sistema: campos personalizados no contexto do registro, gestão administrativa contextual, CSV em Arquivo → Prévia → Confirmação → Resumo e captura separada de cadastro manual. A revisão valida o arquivo inteiro e identifica o limite visível de 20 linhas; a política de duplicados e o arquivo ficam bloqueados durante requisições. Tabelas permitem rolagem horizontal em região identificada com foco, preservando o layout mobile.

Tarefas e avisos automáticos têm diretório do servidor e editor progressivo de dois passos, com revisão explícita antes de ativar. Cancelar alterações pede descarte somente quando necessário; a edição fica em memória na mesma sessão isolada e requisições em andamento conservam o bloqueio ao navegar/reabrir. Avisos internos usam um único sino no topo do shell, separados do Assistente global. O painel explica a coorte de criação, a fórmula da conversão e a separação de moedas. Identidade, tema escuro, motion central e reduced motion permanecem.

### Do:

- Do reutilizar os tokens semânticos, manter claro como padrão e verificar os dois temas ao adicionar uma superfície.
- Do usar o símbolo próprio de laço em azul e dourado fosco, preservando sua proveniência.
- Do manter labels visíveis, foco por teclado e feedback textual de erro, sucesso e carregamento.
- Do agrupar campos relacionados, alinhar ações e usar divisórias nas listas e tabelas.
- Do adaptar a composição para telas pequenas, preservando ações essenciais e a rolagem horizontal das tabelas.
- Do escrever em pt-BR simples, respeitoso e direto, descrevendo o estado real da operação.

### Don't:

- Don't transformar cada informação em um card ou introduzir painéis de métricas fictícias.
- Don't adicionar neon, estética futurista, ícones gigantes, gradientes excessivos ou sombras excessivas.
- Don't aplicar brilho, efeito metálico ou acabamento lustroso ao dourado da marca.
- Don't comunicar estado somente pela cor nem remover os indicadores de foco.
- Don't tratar os detalhes decorativos da tela de autenticação como padrão de composição das telas de trabalho.
- Don't apresentar componentes futuros como funcionalidades já disponíveis.
