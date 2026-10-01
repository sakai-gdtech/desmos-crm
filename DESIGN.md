---
name: "Desmos CRM"
description: "Interface profissional, minimalista e organizada para o trabalho diário."
colors:
  background: "#f7f8fa"
  surface: "#ffffff"
  sidebar: "#ffffff"
  surface-hover: "#f0f3f7"
  text: "#202d40"
  muted: "#5d6b7e"
  subtle: "#6b788a"
  border: "#e1e6ed"
  primary: "#173b68"
  primary-hover: "#102c50"
  primary-soft: "#eaf0f7"
  primary-text: "#173b68"
  brand-gold: "#aa8446"
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

O Desmos CRM adota a direção confirmada no briefing: minimalista, profissional, premium, muito organizada e densa o suficiente para uso empresarial. A hierarquia aparece na tipografia, no alinhamento e nas divisórias; o azul profundo concentra ações e seleção sobre superfícies claras, com dourado fosco em detalhes de conexão. As referências de software do produto orientam a clareza do trabalho sem reproduzir a identidade de outra marca.

A marca Desmos mantém a referência grega a laço e conexão. O símbolo próprio é uma imagem raster gerada em azul profundo e dourado fosco, sem brilho ou efeito metálico, compartilhada pela autenticação, barra lateral e ícone da aplicação. A identificação da empresa na barra lateral é estática: cada conta pertence a uma única empresa cliente do SaaS.

Este documento registra os padrões reutilizados na autenticação, onboarding, navegação, configurações e trabalho comercial. A fonte da verdade visual é `apps/web/src/app/globals.css`, combinada com `apps/web/src/components/ui/primitives.tsx`, `apps/web/src/components/brand.tsx`, `apps/web/src/features/workspace/shell.tsx` e os componentes de cada tela. Os valores do frontmatter correspondem à implementação após a mudança de identidade autorizada em 01/10/2026. Capacidades de fases futuras permanecem requisitos, sem componentes fictícios.

**Key Characteristics:**

- Superfícies claras por padrão, separadas por tom e borda fina.
- Densidade operacional com títulos curtos e controles compactos.
- Azul profundo para ação e seleção; dourado fosco no símbolo e no indicador atual.
- Tema escuro por escolha explícita e navegação agrupada, adaptada a telas pequenas.

## Colors

A paleta combina neutros frios claros com azul profundo, dourado fosco e cores semânticas contidas. A primeira visita inicia no claro, independentemente do sistema operacional. Uma escolha salva em `orbit-theme` é respeitada; o controle da barra superior alterna e salva claro/escuro. Os tokens sem sufixo correspondem ao tema claro; `-dark` registra o valor que a mesma variável CSS recebe quando a raiz possui `data-theme="dark"`. O código continua consumindo as variáveis semânticas sem sufixo em ambos os temas.

### Primary

- **Azul profundo de ação** (`primary`, `primary-hover`): preenchimento do botão principal e indicação de progresso.
- **Azul suave** (`primary-soft`, `primary-text`): navegação selecionada, badges de contexto, avatars e links. O fundo suave não substitui o contraste de texto.
- **Azul de foco** (`focus`): contorno de teclado compartilhado por links, botões e campos.
- **Tinta do botão no tema escuro** (`primary-ink-dark`): texto escuro sobre o azul mais claro do botão principal.

### Secondary

- **Dourado fosco de conexão** (`brand-gold` e `brand-gold-dark`): pequeno indicador do destino atual. O símbolo raster também combina azul e dourado; seus pixels são um asset fixo, não uma aplicação dinâmica dos tokens CSS.

### Neutral

- **Fundo frio** (`background`): plano de trabalho, cabeçalhos e rodapés de tabela.
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

No mobile, abrir o drawer prende o foco dentro da navegação, bloqueia a rolagem do corpo e torna o conteúdo de fundo inativo. Escape, botão de fechar, scrim e navegação encerram o drawer; o foco volta ao controle anterior. A autenticação usa duas áreas no desktop e formulário com largura máxima (385px); a área narrativa desaparece no mobile.

## Elevation & Depth

As superfícies são planas: a folha global não define `box-shadow`. A profundidade vem de fundos tonais, bordas de (1px) e sobreposição de diálogo ou navegação mobile. Cards não sobem no hover; tabelas e controles mudam de tom. O diálogo tem backdrop translúcido e o drawer tem scrim, sem blur.

O foco aparece com contorno de (2px), deslocado (3px) nos controles gerais e (1px) nos campos. Esse contorno comunica interação, não elevação. Os valores de backdrop, contorno e camadas ficam nos snippets do sidecar, pois não são propriedades do schema de componentes do frontmatter.

## Shapes

Cantos discretamente arredondados delimitam controles, badges, containers e diálogos conforme `rounded`. Botões e campos compartilham o raio de controle; cards são mais amplos; badges permanecem compactos. A borda comum é fina e contínua.

Avatars usam quadrados arredondados com iniciais e tamanhos contextuais. Círculos ficam restritos a indicadores de estado e progresso. A marca Desmos usa um laço próprio no asset `apps/web/public/brand/desmos-symbol.png`, exibido pelo componente BrandSymbol com (40px) na marca do shell e da autenticação e (180px) na área narrativa do login. O ícone da aplicação usa `apps/web/src/app/icon.png`. No escuro, o símbolo recebe base branca e cantos de controle para preservar seus pixels. A autenticação apresenta o asset sobre azul suave, sem ornamento elíptico. A proveniência está em `docs/desmos-symbol-prompt.txt`; o símbolo não deve ser substituído por um ícone genérico.

## Components

### Buttons

Botões são compactos, com ação explícita em texto. O componente aceita `primary`, `secondary`, `ghost` e `danger`, usando os tokens homônimos no frontmatter. A altura mínima normal é (38px); autenticação usa (44px). Ícone e texto têm intervalo de (8px).

O primário muda para o azul de hover; o secundário muda superfície e borda; o ghost ganha fundo neutro. O danger usa fundo vermelho suave e texto semântico, sem efeito de hover específico adicional. Todo botão recebe foco visível. Desabilitados têm opacidade (0,56); carregamento inclui spinner e impede novo envio.

### Inputs / Fields

Campos de texto e selects compartilham superfície, borda e raio; o select é nativo. Placeholders usam o tom auxiliar. Hover altera a borda, foco mostra contorno e erro usa borda semântica. Campos desabilitados ou somente leitura usam fundo de página e texto secundário.

Field mantém label associado e liga mensagens de erro ou ajuda ao controle por `aria-describedby`; erros também marcam `aria-invalid`. As mensagens ficam abaixo do campo. A altura padrão é registrada no frontmatter; autenticação aumenta para (44px). Textarea permite expansão vertical.

### Navigation

Links e expansores da barra lateral têm texto compacto (13px), ícone de (18px) e altura mínima de (44px); os filhos usam (12px). O hover usa superfície neutra; o item atual usa azul suave, peso (550), `aria-current="page"` e indicador dourado de (5px). O grupo que contém a página atual recebe texto azul e peso (600).

Quatro destinos comerciais ficam diretos, nesta ordem: Funil de vendas, Oportunidades, Tarefas e Atividades. Clientes expande Leads, Contatos e Empresas clientes; Visão geral permanece abaixo. Configurações fica no rodapé, com Empresa, Equipe e acessos, Funis e etapas, Tags, Auditoria e Lixeira conforme permissões, seguida da área de conta com Meu perfil e Dispositivos e sessões. Perfil e logout permanecem visíveis abaixo do grupo. Os expansores expõem `aria-expanded` e `aria-controls`; os grupos abrem ao acessar um filho diretamente.

A empresa da conta aparece como identificação estática, sem seletor ou ação de criar outra empresa. A marca retorna ao funil para quem tem acesso a oportunidades, ou à Visão geral. Links de navegação fecham o drawer quando aberto. A mesma hierarquia e os mesmos agrupamentos se mantêm no mobile.

### Chips / Badges

Badges são identificadores de estado e contexto, não botões. Variantes `neutral`, `green`, `indigo` e `amber` usam pares de fundo e texto descritos em Colors. `indigo` é o nome legado da API do badge; seu par semântico agora é azul, sem definir uma segunda identidade. O label informa o significado; não há comportamento de hover interativo.

### Cards / Containers

Card aplica superfície, borda e raio, sem sombra e sem padding próprio. Seções internas, tabelas e listas controlam seus espaçamentos. Bordas entre linhas separam itens sem multiplicar containers arredondados.

### Feedback / Loading / Empty states

Alert de erro usa `role="alert"`; sucesso usa `role="status"`. Ícone e texto compartilham a cor semântica, com fundo suave e borda translúcida. Estados vazios informam ausência de conteúdo e podem apresentar a próxima ação; falhas de carregamento oferecem nova tentativa quando disponível.

Skeletons usam a cor de borda e pulsação de (1,8s); spinners giram em (1s). Transições de cor, fundo e borda duram (150ms); a seta dos expansores gira em (160ms) com `ease-out`. `prefers-reduced-motion: reduce` remove animações e transições. Movimento serve ao estado da operação.

### Dialogs

O diálogo usa o elemento nativo `dialog` aberto por `showModal()`, título associado e botão de fechar com label acessível. Escape e clique no backdrop fecham a janela. A largura máxima e o padding estão registrados no frontmatter; o diálogo centraliza com margem automática, limita a altura a `calc(100dvh - 32px)` e permite rolagem interna. O backdrop separa o contexto. Confirmações de alteração de acesso explicam o efeito antes da ação.

## Do's and Don'ts

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
