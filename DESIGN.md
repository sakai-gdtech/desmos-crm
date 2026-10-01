---
name: "Desmos CRM"
description: "Interface profissional, minimalista e organizada para o trabalho diário."
colors:
  background: "#f7f8fb"
  surface: "#ffffff"
  sidebar: "#f1f3f8"
  surface-hover: "#f4f5f9"
  text: "#202538"
  muted: "#646d80"
  subtle: "#71798b"
  border: "#e3e7ef"
  primary: "#4f46e5"
  primary-hover: "#4338ca"
  primary-soft: "#eaeafa"
  primary-text: "#4840bd"
  success: "#217550"
  success-soft: "#e8f4ed"
  warning: "#8a5b16"
  warning-soft: "#fbf1df"
  danger: "#b63b44"
  danger-soft: "#fdf0f0"
  focus: "#818cf8"
  background-dark: "#151722"
  surface-dark: "#1e2130"
  sidebar-dark: "#1a1c2b"
  surface-hover-dark: "#282c3e"
  text-dark: "#ebedf5"
  muted-dark: "#a8afc2"
  subtle-dark: "#9ca5ba"
  border-dark: "#34384c"
  primary-dark: "#847af4"
  primary-hover-dark: "#958cfb"
  primary-soft-dark: "#33304f"
  primary-text-dark: "#beb7ff"
  success-dark: "#89d7ae"
  success-soft-dark: "#253d34"
  warning-dark: "#e6c286"
  warning-soft-dark: "#3e3428"
  danger-dark: "#ffacb2"
  danger-soft-dark: "#422a33"
  focus-dark: "#a6a5ff"
  primary-ink-dark: "#141422"
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

O Desmos CRM adota a direção confirmada no briefing: minimalista, profissional, premium, muito organizada e densa o suficiente para uso empresarial. A hierarquia aparece na tipografia, no alinhamento e nas divisórias; o índigo concentra ações e seleção sobre superfícies frias. As referências de software do produto orientam a clareza do trabalho sem reproduzir a identidade de outra marca.

A marca Desmos foi escolhida pelo usuário, com referência ao grego. O símbolo usa elos, com Link2 na interface e favicon correspondente. A identificação da empresa na barra lateral é estática: cada conta pertence a uma única empresa cliente do SaaS.

Este documento registra a implementação da fundação: autenticação, onboarding, navegação, empresa, equipe, perfil e sessões. A fonte da verdade visual é `apps/web/src/app/globals.css`, combinada com `apps/web/src/components/ui/primitives.tsx` e os componentes de cada tela. Os nomes descritivos abaixo resumem o código; não constituem uma nova marca. A paleta sugerida no briefing foi adaptada na implementação e os valores extraídos no frontmatter são os valores vigentes.

**Key Characteristics:**

- Superfícies claras ou escuras, separadas por tom e borda fina.
- Densidade operacional com títulos curtos e controles compactos.
- Índigo para ação e seleção; status sempre acompanhados de texto.
- Tema escuro completo e navegação adaptada a telas pequenas.

## Colors

A paleta combina neutros frios com índigo e cores semânticas contidas. Os tokens sem sufixo correspondem ao tema claro; `-dark` registra o valor que a mesma variável CSS recebe quando a raiz possui `data-theme="dark"`. O código continua consumindo as variáveis semânticas sem sufixo em ambos os temas.

### Primary

- **Índigo de ação** (`primary`, `primary-hover`): preenchimento do botão principal e indicação de progresso.
- **Índigo suave** (`primary-soft`, `primary-text`): navegação selecionada, badges de contexto, avatars e links. O fundo suave não substitui o contraste de texto.
- **Índigo de foco** (`focus`): contorno de teclado compartilhado por links, botões e campos.
- **Tinta do botão no tema escuro** (`primary-ink-dark`): texto escuro sobre o índigo mais claro do botão principal.

### Neutral

- **Fundo frio** (`background`): plano de trabalho, cabeçalhos e rodapés de tabela.
- **Superfície** (`surface`): campos, cards, barra superior e diálogo.
- **Navegação fria** (`sidebar`): plano contínuo da barra lateral.
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

O shell de trabalho mantém uma barra lateral fixa (244px), barra superior com altura mínima (69px) e conteúdo central com largura máxima (1500px). A área principal usa margens internas de (36px 40px 44px). A estrutura mantém o contexto da empresa e da conta visível enquanto o conteúdo muda.

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

Avatars usam quadrados arredondados com iniciais e tamanhos contextuais. Círculos ficam restritos a indicadores de estado e progresso. A marca Desmos usa elos (ícone Link2 e favicon correspondente) para representar conexão. A autenticação preserva sua geometria elíptica ao redor do símbolo de conexão. Esse motivo visual não altera os tokens nem precisa se repetir nas telas de trabalho.

## Components

### Buttons

Botões são compactos, com ação explícita em texto. O componente aceita `primary`, `secondary`, `ghost` e `danger`, usando os tokens homônimos no frontmatter. A altura mínima normal é (38px); autenticação usa (44px). Ícone e texto têm intervalo de (8px).

O primário muda para o índigo de hover; o secundário muda superfície e borda; o ghost ganha fundo neutro. O danger usa fundo vermelho suave e texto semântico, sem efeito de hover específico adicional. Todo botão recebe foco visível. Desabilitados têm opacidade (0,56); carregamento inclui spinner e impede novo envio.

### Inputs / Fields

Campos de texto e selects compartilham superfície, borda e raio; o select é nativo. Placeholders usam o tom auxiliar. Hover altera a borda, foco mostra contorno e erro usa borda semântica. Campos desabilitados ou somente leitura usam fundo de página e texto secundário.

Field mantém label associado e liga mensagens de erro ou ajuda ao controle por `aria-describedby`; erros também marcam `aria-invalid`. As mensagens ficam abaixo do campo. A altura padrão é registrada no frontmatter; autenticação aumenta para (44px). Textarea permite expansão vertical.

### Navigation

Links da barra lateral têm texto compacto (12px), ícone e altura mínima (39px). O hover usa superfície neutra; o item atual usa índigo suave, peso (550) e um pequeno indicador. A empresa da conta aparece como identificação estática, sem seletor ou ação de criar outra empresa. Links de navegação fecham o drawer quando ele está aberto.

### Chips / Badges

Badges são identificadores de estado e contexto, não botões. Variantes `neutral`, `green`, `indigo` e `amber` usam pares de fundo e texto descritos em Colors. O label informa o significado; não há comportamento de hover interativo.

### Cards / Containers

Card aplica superfície, borda e raio, sem sombra e sem padding próprio. Seções internas, tabelas e listas controlam seus espaçamentos. Bordas entre linhas separam itens sem multiplicar containers arredondados.

### Feedback / Loading / Empty states

Alert de erro usa `role="alert"`; sucesso usa `role="status"`. Ícone e texto compartilham a cor semântica, com fundo suave e borda translúcida. Estados vazios informam ausência de conteúdo e podem apresentar a próxima ação; falhas de carregamento oferecem nova tentativa quando disponível.

Skeletons usam a cor de borda e pulsação de (1,8s); spinners giram em (1s). Transições de cor, fundo e borda duram (150ms). `prefers-reduced-motion: reduce` remove animações e transições. Movimento serve ao estado da operação.

### Dialogs

O diálogo usa o elemento nativo `dialog` aberto por `showModal()`, título associado e botão de fechar com label acessível. Escape e clique no backdrop fecham a janela. A largura máxima e o padding estão registrados no frontmatter; o diálogo centraliza com margem automática, limita a altura a `calc(100dvh - 32px)` e permite rolagem interna. O backdrop separa o contexto. Confirmações de alteração de acesso explicam o efeito antes da ação.

## Do's and Don'ts

### Do:

- Do reutilizar os tokens semânticos e verificar os dois temas ao adicionar uma superfície.
- Do manter labels visíveis, foco por teclado e feedback textual de erro, sucesso e carregamento.
- Do agrupar campos relacionados, alinhar ações e usar divisórias nas listas e tabelas.
- Do adaptar a composição para telas pequenas, preservando ações essenciais e a rolagem horizontal das tabelas.
- Do escrever em pt-BR simples, respeitoso e direto, descrevendo o estado real da operação.

### Don't:

- Don't transformar cada informação em um card ou introduzir painéis de métricas fictícias.
- Don't adicionar neon, estética futurista, ícones gigantes, gradientes excessivos ou sombras excessivas.
- Don't comunicar estado somente pela cor nem remover os indicadores de foco.
- Don't tratar os detalhes decorativos da tela de autenticação como padrão de composição das telas de trabalho.
- Don't apresentar componentes futuros como funcionalidades já disponíveis.
