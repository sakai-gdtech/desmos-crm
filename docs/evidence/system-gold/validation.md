# Dourado no sistema — validação local, 2/10/2026

## Resultado

O ouro fosco agora orienta o destino ativo da navegação, a aba atual, a opção marcada do Select e o passo atual da automação. Entrada, ícone de boas-vindas e linha de estado do Assistente usam os mesmos tokens. Valor em aberto e contorno do resumo financeiro, ícones de seção do Radar/tarefas, contagens de etapas e marcador Hoje da Agenda recebem acentos pontuais.

Claro: canvas, hover e divisórias levemente aquecidos, com superfícies brancas. Escuro: base azul preservada, seleção quente contida. Ação principal, links, foco de teclado, badges semânticos e cores configuradas das etapas permanecem. Não houve mudança de layout, conteúdo, React, backend, dados de usuários anteriores ou biblioteca de motion. A aplicação mudou somente em globals.css; DESIGN.md registra os tokens novos. css.diff isola esta rodada das alterações locais anteriores.

## Verificações

- Baseline completo: 4/4 PASS, desktop/mobile × claro/escuro. A primeira tentativa do harness usava título curto errado em Automações e tentava Lista oculta no mobile da Agenda; foi interrompida e corrigida antes da captura final. Também passou a aguardar o conteúdo lazy do Assistente para as capturas.
- Rodada visual final: 4/4 PASS, 23,4s. Seis rotas, editor progressivo, Select aberto, navegação e Assistente: 40 capturas antes + 40 depois. Revisão manual por amostras de pixels nos dois temas e viewports; sem refinamento adicional após essa revisão.
- 32 análises axe nos novos casos, nenhuma violação detectada; zero pageerrors. Sem overflow horizontal de página nas seis rotas. Abrir Select por teclado, opção atual e Escape/foco; trocar Semana/Lista no desktop; abrir/fechar navegação mobile; carregar e abrir o Assistente.
- Suíte final completa: **47/47 PASS**, zero skipped/flaky/unexpected/retries, 219,5s, início 2026-10-02T15:15:20.267Z. Inclui os novos casos e regressão de CRM, campos, selects, biblioteca/receitas, regras reais e simuladas, assistente, Agenda, navegação, IDs das etapas, rascunhos, falhas de salvamento, clique duplo e Motion/reduced motion. e2e-final.json.
- Typecheck API/web: PASS. Build web de produção Webpack em cópia isolada /tmp/desmos-gold-build-8mxsuh1k: PASS, sem tocar no servidor dev. Fontes dessa cópia conferidas por SHA com as fontes finais. web-build.txt e provenance.json.
- Prettier do teste novo e git diff --check: PASS.
- Contraste sRGB medido sobre tokens computados pelo browser: dourado de texto/fundo selecionado **5,99:1 claro / 7,86:1 escuro**; azul do foco/fundo selecionado **5,09 / 6,51**; indicador dourado/fundo selecionado **3,03 / 5,88**. Texto pequeno usa gold-text; gold-border é divisória decorativa. Azul e todos os tokens semânticos conferidos iguais ao baseline. contrast.json.
- Chrome CDP simulou protanopia e deuteranopia nos dois temas. Navegação preserva texto, aria-current, peso e marcador; seleção não depende somente de cor. Quatro capturas e método reproduzível em vision-check.mjs / vision-checks.json. Simulação não substitui estudo com usuários.
- Gzip nível 9 de todos os arquivos Webpack estáticos: JS **479.346 → 479.333 bytes**, CSS **17.928 → 18.136 bytes**, total **+195 bytes (0,039%)** frente ao build final de funil. Nenhuma dependência ou JS de aplicação alterado. Método em bundle.json; não representa download inicial, latência de interação ou benchmark runtime.

## Limites e isolamento

Chrome local, mobile/touch emulado 390×844 e desktop 1440×1000; mobile com reduced motion, desktop com motion normal. Safari/Firefox, aparelhos físicos, leitor de tela real, viewport intermediário e iniciante sem treinamento não foram testados nesta rodada. Axe e contraste amostral não certificam WCAG.

Fixtures novas e fictícias. A suíte completa entregou um convite sintético somente ao Mailpit local hardcoded 127.0.0.1:1026, sem worker amplo ou envio externo. Sem reset, commit, push ou deploy. Backend inalterado, portanto testes API não repetidos nesta rodada. Publicação continua pendente de confirmação coordenada pelo chat pai.
