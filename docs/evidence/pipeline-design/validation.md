# Editor de funil — validação local, 2/10/2026

## Resultado

Menos explicação visível, sem sequência duplicada. Nome/descrição/ativo agrupados; linhas compactas com posição, alça, cor, nome e ações. Avançados recolhidos, com probabilidade/inatividade e requisito de próxima atividade. Inserção ao final com posição escolhida. Estado e ações reunidos ao fim, sem sobrepor etapas. Labels individuais continuam acessíveis e Cor/Nome têm cabeçalhos visíveis.

Botões i dourados abrem informação por clique, toque, Enter/Space. Popover nativo, com Escape, fechamento externo e foco no acionador. Textos e consequências essenciais usam tokens de texto; dourado fica em ícones e indicador de alteração. Erros, recuperação e confirmação de descarte permanecem visíveis. IDs, regras, retorno ao funil, Select e Motion.dev preservados.

## Verificação executada

- Suíte completa final: **43/43 PASS**, zero skipped/flaky/retries, 214,2s, início `2026-10-02T14:44:03.810Z`. `e2e-final.json` inclui os quatro novos testes e regressão do CRM, campos, selects, biblioteca/receitas, assistente, Agenda, pipelines, negócios, navegação e motion.
- Novos testes: desktop 1440×1000/mobile 390×844 × claro/escuro; mobile com touch emulado e reduced motion, desktop com motion normal. Informação fechada por padrão, clique/Enter/toque, Escape/foco e fechamento externo; avançados e seus três campos; inserção/reordenação/renomeação; erro fictício de salvamento conserva dados; latência e clique duplo produzem uma requisição real, bloqueando edição/cancelamento durante envio; salvar/reabrir e cancelar/continuar/descartar; IDs e valores preservados; vinte etapas com nomes longos, limite, remoção/inclusão e zero overflow horizontal.
- Quatro análises axe dos novos casos, sem violações detectadas. Zero pageerrors. Testes anteriores verificam arraste, vínculos de negócios/modelos/regras, recuperação na sessão e transições interrompidas/reduced motion.
- Typecheck API/web: PASS. Build web de produção Webpack em cópia isolada `/tmp/desmos-pipeline-build-_mgylkvd`: PASS, com CSS final; servidor dev preservado. `web-build.txt`.
- Soma de todos os JS Webpack em gzip nível 9: **478.186 → 479.346 bytes**, +1.160 (0,243%), contra o build anterior da correção de campos. Método explícito em `bundle.json`; não representa o download inicial ou mede a velocidade no uso real. Sem dependência adicionada.
- Contraste medido: ícone dourado/surface **3,44:1 claro / 6,81:1 escuro**; texto principal **13,90 / 13,39**; texto de ajuda **5,43 / 7,76**. Dourado não é usado como texto pequeno. `contrast.json`.
- Prettier dos TSX/testes e `git diff --check`: PASS.

## Correções durante a verificação

Uma regra genérica do cabeçalho interferia no display do popover fechado; passou a mirar só o grupo do título e o componente protege os estados aberto/fechado. No mobile, o details interceptava a seta; sua superfície não captura ponteiros fora do summary/conteúdo. A barra inicialmente fixa cobria etapas; agora fica no fluxo da página. Todos esses casos foram corrigidos antes da suíte final. O seletor de inserção volta ao final quando a etapa selecionada é removida; o foco segue para uma etapa existente.

Os testes de campos tinham destino fixo e recriaram suas capturas after da rodada anterior. Baselines/anexo preservados, manifest atualizado e ambos os novos testes agora respeitam E2E_EVIDENCE_DIR. Execução direcionada: **8/8 PASS**, 61,9s, zero skipped/flaky/unexpected, confirma a separação em `scope-check/`; resultado em `evidence-scope-check.json`. Os 25 artefatos históricos before/anexo de campos foram conferidos por SHA-256 e permanecem iguais.

## Limites

Chrome local e viewport mobile/touch emulados; Safari/Firefox, aparelhos físicos, leitor de tela real e uso por iniciante não testados. Popovers requerem suporte à API nativa. Capturas completas de página com scroll podem mostrar o shell fixo na posição do viewport; comparação principal usa a tela inicial. Nenhum benchmark de tempo de interação novo ou certificação WCAG.

Fixtures novas e fictícias, sem reset de registros anteriores. Uma entrega sintética somente ao Mailpit local pela suíte completa, sem worker amplo ou envio externo. Backend sem alteração; testes API não repetidos. Sem commit, push ou deploy; publicação continua pendente de confirmação.
