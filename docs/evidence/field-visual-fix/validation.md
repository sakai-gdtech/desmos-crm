# Correção de espaçamento e campos — 2/10/2026

As capturas `after-*` foram recriadas pela regressão posterior do editor de funil (43/43 PASS, em `../pipeline-design/e2e-final.json`); `before-*` e o anexo original permanecem. O manifest registra essa atualização. O teste agora respeita `E2E_EVIDENCE_DIR` para isolar novas rodadas.

## Defeito e causa

O anexo original `image.png` foi materializado pelo helper oficial Library e seus pixels foram inspecionados no Mac. Mostra Campos personalizados sem margem interna no card do negócio; as abas e o Histórico já têm padding. Não mostra defeito no menu de um select.

A reprodução encontrou a seção com padding horizontal **0px**, contra 23px das abas no desktop e 19px no mobile. A classe compartilhada também recebia nomes configuráveis sem quebra, transbordando nos resumos estreitos. A auditoria confirmou um card de captura pública sem padding e padding duplicado na lista administrativa de definições.

## Correções

- Negócio completo e painel lateral: Campos personalizados recebe 24px horizontais, ou 19px até 760px, alinhando cabeçalho, valores, formulário e link à área de Histórico. A diferença de 1px desktop para as abas é a regra incumbente de 23px.
- Leads, contatos e empresas clientes: mantém o padding do resumo pai, sem duplicá-lo. Nomes/valores longos quebram dentro da seção.
- Labels do Field compartilhado e textos das listas relacionadas: podem quebrar; itens flex encolhem e preservam o espaço dos botões. Beneficia definições, formulários e relações com texto extenso.
- Gestão de campos e formulários de entrada: remove o segundo padding horizontal da lista dentro do card já acolchoado.
- Captura pública: card recebe 24px, ou 20px/16px no mobile, em formulário, confirmação e carregamento/erro.
- Loading/erro de CustomFields preservam o mesmo container. Loading anuncia status; erro mostra mensagem e botão de tentar novamente, sem card aninhado.

Nenhuma alteração no código do Select, na API, permissões, persistência, guia, dependências ou motion. O snapshot anterior de 125 fontes só difere em `globals.css` e `crm/fields.tsx`. Trabalho local anterior preservado.

## Verificação

- Reprodução antes: quatro variantes desktop/mobile × claro/escuro; casos adicionais de lista/captura nos dois tamanhos claros. Métricas e imagens `before-*` preservadas.
- Teste dedicado final: **4/4 PASS**, 39,4s. Cobre as quatro entidades, todos os cinco tipos de campo, textos longos, vazio, edição, salvar/reload, cancelar, select por teclado, painel lateral, loading, erro e retry. Quatro análises axe em edição, sem violações detectadas; zero pageerrors.
- Medições finais nas quatro variantes: zero overflow da seção e zero overflow horizontal da página nas rotas auditadas. Campos no card: 24px desktop/19px mobile. Captura: 24px desktop/16px mobile.
- Rotas adicionais: gestão de campos, novo lead, novo negócio, nova tarefa, nova atividade, empresa, automações, importação e entrada de leads. Componentes de campos/selects/chips/abas/textos e seus containers foram conferidos no código. Não se detectou o mesmo defeito de padding nos demais formulários amostrados.
- `npm run typecheck`: PASS, API e web.
- Build web de produção Webpack: PASS, cópia isolada `/tmp/desmos-field-build-u_fzljtl`; dev server preservado. Log `web-build.txt`.
- Prettier dos arquivos TSX/teste e `git diff --check`: PASS.
- Suíte E2E completa final: **39/39 PASS**, zero skipped/flaky/retries, 215,8s. Resultado em `e2e-final.json`, iniciado em `2026-10-02T13:16:10.525Z`. Inclui os quatro testes novos e os fluxos anteriores de selects, CRM, Agenda, tarefas, automações, biblioteca, assistente, navegação e motion.

## Método e limites

Chrome local, 1440×1000 e 390×844; mobile com touch emulado. Reduced motion ativado na amostra dedicada. Dois lotes visuais: reprodução/auditoria antes e confirmação depois; nenhum redesign adicional. Não é certificação de acessibilidade ou teste em aparelho físico; Safari/Firefox e leitor de tela real não foram executados. Não houve benchmark de performance novo; não foi instalada biblioteca ou dependência.

Fixtures novas, fictícias e isoladas por tenant; nenhuma fixture anterior resetada. Captura pública do teste dedicado foi aberta sem submissão; o fluxo anterior da suíte completa submete apenas seu lead fictício. O runner entregou **um convite sintético somente ao Mailpit local**, com escopo de tenant/recipient/janela próprios, sem worker amplo ou envio externo. A primeira tentativa foi bloqueada pelo sandbox ao iniciar Chrome; após autorização de execução, os testes rodaram. Um seletor errado do novo teste (button em vez de link no Kanban) foi corrigido; a execução incompleta foi interrompida e o teste final passou. Testes de backend não repetidos: API sem mudanças nesta rodada. Nenhum commit, push ou deploy.
