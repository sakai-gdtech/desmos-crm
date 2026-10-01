# Comparação do sistema visual — Vendas, Fase 3

Revisão documental de 01/10/2026 pelo Impeccable Documenter. Esta é uma extensão incremental do modo **Operate**, com a direção de `docs/sales-contract.md` e o contexto atual de `PRODUCT.md`. O papel `impeccable_documenter.toml` e `reference/document.md` foram lidos integralmente antes da comparação.

## Resultado

**Sistema preservado.** Os valores e componentes da extensão continuam compatíveis com o sistema do Desmos. `DESIGN.md` e `.impeccable/design.json` foram preservados; esta comparação não autoriza uma nova identidade, novos tokens globais nem a regularização de desvios anteriores.

A comparação dos blocos `:root` e `:root[data-theme="dark"]` de `apps/web/src/app/globals.css` com o frontmatter de `DESIGN.md` encontrou os mesmos **19 tokens semânticos no tema claro e 19 no escuro**, sem divergências de valor. A seção de estilos de vendas começa na linha 2823 nesta revisão e não declara novas variáveis de cor nem cores hexadecimais próprias. A folha global continua sem `box-shadow`.

Foram conferidos o frontmatter e o texto de `DESIGN.md`, os metadados, snippets e narrativa do sidecar v2, `apps/web/src/components/ui/primitives.tsx`, a folha global e amostras de estrutura, estados e controles dos seguintes arquivos:

- `apps/web/src/features/sales/board.tsx`, `deals.tsx`, `work.tsx`, `pipelines.tsx`, `shared.tsx` e `types.ts`.
- `apps/web/src/features/crm/detail.tsx`, `notes.tsx` e `timeline.tsx`, reutilizados ou estendidos para o contexto comercial.
- `apps/web/src/features/workspace/shell.tsx`, com a navegação de vendas e a identificação estática da empresa.

## Comparação com o sistema vigente

| Aspecto | Evidência na extensão |
| --- | --- |
| Paleta e profundidade | Fundos, bordas, hover, foco, ações e feedback consomem as variáveis semânticas vigentes. Colunas e oportunidades usam planos tonais e bordas de 1px, sem sombra. |
| Tipografia | Mantém a família de sistema registrada. Os títulos e controles compartilhados conservam a escala de 28/16/14/13/12/11px nos papéis existentes. Valores monetários usam algarismos tabulares. Ajustes de peso, tamanho e tracking específicos do quadro e do valor no detalhe permanecem locais. |
| Controles e estados | Reutiliza Button, Input, Select nativo, Field, Card, Badge, Alert, Dialog e estados de espera, erro e vazio. A ação tem texto, labels são associados aos campos, controles recebem foco visível e erros/sucessos usam feedback textual. |
| Marca e empresa | Mantém Desmos CRM, símbolo Link2 e ícones Lucide. O shell mostra o nome da empresa da sessão como identificação estática, sem seletor. O texto “Sua empresa” não aparece acima do nome; isso preserva a correção solicitada para Nexa. |
| Contexto comercial | O quadro mostra pipeline, busca, responsável e status, seguido de etapas com quantidade e valores separados por moeda. Cada oportunidade apresenta cliente, valor, responsável e próxima atividade ou sua ausência. O detalhe reúne negociação, histórico, notas, atividades e tarefas no padrão CRM. |
| Interação | Arrastar uma oportunidade e usar “Mover” com select chamam a mesma alteração de etapa com versão e feedback de operação. O documento registra essa estrutura observada no frontend; a validação funcional da API é independente. |
| Responsividade | O quadro rola horizontalmente dentro do próprio container. A navegação e a composição de detalhe herdam os breakpoints do sistema; formulários empilham campos nas telas pequenas. Ajustes locais ampliam controles selecionados para 44px no mobile. |

O sidecar continua representando os dez componentes fundamentais da fundação. Não precisa ganhar novos exemplos para comprovar esta extensão: Kanban, agenda, checklist e editor de etapas são composições locais sobre os mesmos componentes.

## Padrões locais duráveis

Estas observações orientam a manutenção do módulo de vendas, sem substituir o sistema global:

- **Quadro:** colunas de 292px no desktop, intervalo de 16px, cabeçalho de 16px e conteúdo com padding/intervalo de 12px. As oportunidades têm padding de 16px e o raio de card existente de 12px. No mobile, colunas usam `calc(100vw - 64px)`, limitadas a 330px, com intervalo de 12px e rolagem horizontal.
- **Negociação:** o resumo financeiro precede dados e ações; o painel adjacente preserva histórico, notas e próximos passos. As abas usam os estilos CRM e seleção textual com `aria-pressed`.
- **Formulários:** agrupam negociação/interação e relacionamento em seções com padding de 24px e intervalo de 20px. A condição local de até 680px reduz esse padding para 20px e amplia as labels de checkbox; ela não é promovida a breakpoint global. O editor de etapas usa fieldsets e divisórias, com quatro campos no desktop e duas colunas até 980px.
- **Agenda e checklist:** linhas com divisórias organizam vínculo comercial, responsável, prazo e status; ações permanecem próximas ao registro. Checklists usam controles nativos com labels, sem criar um card por item.
- **Cor das etapas:** a cor configurável é um dado do pipeline, acompanhada pelo nome da etapa. Os valores iniciais em `types.ts`, incluindo o tom ciano, não constituem uma segunda paleta de marca nem novos tokens globais.

## Evidência de revisão e limites

O agente principal forneceu a disposição **ship** do finish reviewer independente, executado em contexto novo, sobre nove capturas válidas em `.impeccable/review/`: `sales-desktop.png`, `sales-detail.png`, `sales-pipeline.png`, `sales-form.png`, `sales-tasks.png`, `sales-dark.png`, `sales-mobile.png`, `sales-mobile-detail.png` e `sales-mobile-form.png`. O pacote informa desktop com largura de 1440px e captura da página completa, e mobile de 390×844px com captura do viewport. Esse veredito pertence ao reviewer, não a uma inspeção visual própria deste documento.

O relatório do agente principal em `.impeccable/review/sales-runtime.json` registra nove estados, todos com `overflow: false` e nenhuma violação no recorte Axe WCAG 2 A/AA e 2.1 AA informado, além de uma lista vazia de erros. O detector foi executado uma vez pelo agente principal: `.impeccable/review/sales-detect.json` contém 55 entradas advisory, nenhuma não advisory. Todas apontam para CSS anterior à seção de vendas, com última linha reportada em 2538; não há advisory da nova seção. Estes arquivos foram lidos como evidência recebida. Não foram repetidos navegador, capturas ou detector nesta comparação.

O agente principal também informou aprovação de TypeScript, 55 testes de API, 10 cenários Playwright e build na validação funcional final. Não houve alteração de UI depois do **ship**; a correção posterior se limitou ao limite de requisições do backend. Esses resultados complementam o pacote e não são testes executados pelo Documenter.

## Desvios preservados, sem canonização

Os 55 avisos anteriores incluem tamanhos de fonte e raios fora das escalas documentadas. O texto auxiliar de 10px nas datas do registro, datas do histórico, labels das alterações e metadados de notas continua presente nos componentes CRM reutilizados. Esses valores não foram adicionados à escala nem recomendados para novas superfícies; sua legibilidade permanece assunto de uma revisão tipográfica autorizada.

O sidecar v2 mantém `narrative.rules` como duas strings, enquanto `reference/document.md` descreve objetos com `name`, `body` e `section`. Essa divergência documental já existe no arquivo recebido e foi registrada sem reescrever o sidecar. A descrição histórica da fundação também permanece como registro de sua origem. A tarefa autoriza comparar uma extensão, não reparar ou legitimar desvios preexistentes do sistema.

Os arquivos canônicos ficaram byte a byte iguais aos lidos no início desta comparação: `DESIGN.md` com SHA-256 `9c04fa3e9801b059ee57bdc06680eee8dfae25d9e06f9a3f992e88cd018bfaf3` e `.impeccable/design.json` com SHA-256 `f5950dee43e3bd2bb1d07fba06f046023d0349bacfb2d18279b64b116db1e020`.
