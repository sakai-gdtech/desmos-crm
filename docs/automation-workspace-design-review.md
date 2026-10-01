# Revisão de continuidade visual — automações e Agenda

Revisão documental de 01/10/2026. A extensão segue o modo Operate e o sistema existente do Desmos CRM. `DESIGN.md` e `.impeccable/design.json` foram preservados: esta entrega acrescenta superfícies comerciais, sem autorizar outra identidade ou uma reescrita do sistema.

## Autoridade e evidência

Foram lidos integralmente `.agents/skills/impeccable/reference/document.md`, a especificação `docs/specs/automation-workspace-agenda.md`, `PRODUCT.md` e a revisão independente `docs/automation-workspace-review.md`. O sistema foi comparado com os tokens e estilos de `apps/web/src/app/globals.css`, o shell em `apps/web/src/features/workspace/shell.tsx` e amostras de `automations.tsx`, `automation-editor.tsx`, `automation-assistant.tsx`, `message-templates.tsx`, `pipelines.tsx`, `agenda.tsx`, `work.tsx` e `demo-followup.tsx`, em `apps/web/src/features/sales/`.

A revisão independente registra disposição **ship**, vinte capturas válidas de desktop/mobile e nenhuma correção visual material. Este documento usa essa evidência existente; não constitui outra rodada de captura, detector ou QA, nem substitui os testes finais descritos em `docs/automation-workspace-validation.md`.

## Continuidade do sistema

| Regra existente | Resultado observado na extensão |
| --- | --- |
| Azul profundo e dourado fosco | Os tokens claros continuam `primary: #173b68` e `brand-gold: #aa8446`. Os estilos acrescentados consomem variáveis semânticas; não introduzem paleta ou acabamento de marca. |
| Superfícies claras e tema escuro opcional | Fundo `#f7f8fa`, superfície branca e borda `#e1e6ed` permanecem. Os tokens dos temas claro e escuro coincidem com os valores registrados no frontmatter de `DESIGN.md`. |
| Tipografia operacional compacta | A stack de sistema permanece `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Títulos, campos, ações e badges reutilizam os papéis existentes; resumos usam 12px e itens da Agenda 13px com metadados de 11px. Não há nova família ou asset. |
| The Flat-By-Default Rule | Diretório, biblioteca, assistente e Agenda usam superfície, borda fina e separadores. Não recebem sombra ornamental. O painel da Agenda reutiliza Dialog com forma lateral, sem converter a elevação modal em regra de cards. |
| Forma discreta e controles nativos | Containers de 12px, itens de Agenda de 7px, fields/selects, botões e disclosures continuam a linguagem existente. Foco vem do token compartilhado; estados e limites recebem texto além da cor. |

## Expressão desta superfície

A primeira vista é a lista de regras do funil. Ela expõe nome, contexto e capacidade antes de abrir o editor. O editor separado organiza Quando → condições opcionais → Fazer, com resumo e prévia ao lado no desktop e “Salvar rascunho” explícito. Modelos de mensagem e assistente controlado chegam ao mesmo rascunho revisável. Os rótulos distinguem simulações locais da regra funcional do fixture; esses limites são comportamento da entrega, não novos tokens ou proibições visuais globais.

Etapas compactas alinham posição, alça, cor, nome e setas; detalhes avançados ficam em disclosure. A Agenda apresenta os registros comerciais por dia e abre o mesmo contexto de trabalho para concluir, reagendar e criar a próxima ação. Essa sequência sustenta a tese da superfície: entender regra, contexto e revisão antes do efeito.

O editor usa duas colunas com intervalo de 28px e resumo sticky no desktop; até 800px passa a uma coluna e remove o sticky. A Agenda usa sete colunas, quatro até 1100px e dias empilhados até 800px. Até 540px, linhas de automação, modelos e controles de etapas refluem, e os containers reduzem padding de 24px para 16px. O painel de ação da Agenda ocupa até 760px e toda a altura do viewport. Esses números descrevem esta implementação; não substituem os breakpoints gerais do shell.

## Drift preservado e não canonizado

O registro existente de configuração de regras em `DESIGN.md` ainda descreve a composição anterior de lista/formulário/resumo em três colunas; a nova extensão usa lista separada e editor em duas colunas. A descrição de navegação em `DESIGN.md` e no snippet do sidecar também antecede a inclusão da Agenda. Esses retratos de superfície permanecem históricos nesta passagem e devem ser reconciliados somente em uma atualização autorizada do sistema; não são diretrizes para recriar a composição anterior.

Há ainda uma divergência de formato preexistente no sidecar: os dois primeiros itens de `narrative.rules` são strings, enquanto a referência atual descreve objetos com `name`, `body` e `section`. O terceiro item, The Flat-By-Default Rule, segue o formato. Não foi realizada validação de consumidor nem reparo de schema neste escopo documental.

Nenhum defeito visual material foi identificado pela revisão independente. A divergência histórica de composição/navegação e o formato misto de regras não foram promovidos a padrões novos nem reparados, pois esta extensão ordinária preserva os arquivos do sistema e limita a escrita a este registro.
