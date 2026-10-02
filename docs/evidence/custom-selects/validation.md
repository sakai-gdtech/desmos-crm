# Validação dos selects

Rodada local de 2 de outubro de 2026. Nenhum commit, push ou deploy.

- `npm run typecheck`: PASS (API e web).
- Build web de produção Webpack em cópia isolada `/tmp/desmos-select-build`: PASS. O dev server foi preservado.
- `E2E_EVIDENCE_DIR=docs/evidence/custom-selects node scripts/test-e2e-local-mailpit.mjs`: **35/35 PASS**, zero skipped/flaky/retries, duração 156.1 s. Resultado final em `e2e-final.json`, terminado em `2026-10-02T11:53:36.260Z` (UTC).
- Dois testes dedicados exercitam teclado, busca por prefixo sem acento, Esc/Tab, foco e erro na validação RHF, persistência/reload, desktop claro 1440×1000, viewport mobile escuro 390×844 com touch habilitado e seleção por `tap`, além do menu no diálogo de conversão. Quatro análises axe nas amostras finais, sem violações detectadas; zero pageerrors nos testes dedicados.
- A suíte completa inclui Agenda, tarefas, biblioteca/modelos/receitas, assistente global, filtros, pipelines, Kanban e CRM. Todos os antigos `selectOption` nativos foram migrados ao helper que clica no combobox e na opção visível. O fluxo de importação confirma que selects desabilitados continuam bloqueados durante requisições.
- Capturas desktop/mobile e menus dentro de diálogos inspecionados em duas rodadas. Menu medido após definir sua largura, incluindo quebra de labels longos; não depende de altura nominal de linha.
- `git diff --check` e Prettier dos arquivos novos: PASS.
- Dependências/package-lock permanecem iguais. Soma gzip nível 9 de **todos** os arquivos JS Webpack: 476,913 → 478,081 bytes, +1,168 bytes (0.245%). Comparação com o build anterior da conclusão do PDF. Este total não equivale ao download inicial nem comprova velocidade no uso real.

## Correções verificadas

Identificação duplicada do menu no helper, landmark do portal e fechamento indevido durante a rolagem foram corrigidos durante implementação. A primeira suíte com toque real teve 34 testes passando e uma falha na seleção por toque: blur fechava o popup antes do click. Esse resultado está preservado em `e2e-touch-intermediate.json`. A correção mantém o foco no combobox durante pointerdown, permite pan vertical e pinch zoom via CSS e confirma somente no click. Os dois testes dedicados e a suíte completa foram executados novamente sobre o código final e passaram.

## Isolamento e limites

Fixtures novas e fictícias; nenhuma fixture anterior foi resetada. O runner enviou 1 convite sintético somente ao Mailpit local, limitado à janela e tenant do teste; nenhum envio externo e nenhum worker amplo iniciado. As evidências anteriores do PDF continuam históricas em seu diretório original.

Chrome local em desktop e viewport mobile com touch emulado; Safari/Firefox, aparelhos físicos e leitores de tela reais não foram testados. A amostra axe não é certificação WCAG. Busca é digitação por prefixo, sem caixa de pesquisa separada. API sem alteração nesta rodada, portanto os 70 testes de backend da rodada anterior não foram repetidos. O teste com iniciante sem treinamento continua pendente. As confirmações pendentes do GitHub não autorizam deploy.

Fontes de comportamento: [WAI/APG](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/), [MDN Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using) e [W3C Pointer Events](https://www.w3.org/TR/pointerevents3/).
