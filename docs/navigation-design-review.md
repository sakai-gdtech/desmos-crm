# Revisão da navegação e identidade Desmos

Escopo: identidade e shell final de navegação, incluindo login, tema claro padrão e escuro explícito. Direção autorizada em `docs/navigation-design-brief.md` e no contrato da superfície em `apps/web/.impeccable/surfaces/apps-web-src-features-workspace-shell-tsx.md`. O símbolo raster em `apps/web/public/brand/desmos-symbol.png` e o ícone da aplicação têm proveniência em `docs/desmos-symbol-prompt.txt`.

## Parecer recebido e fechamento documental

O reviewer independente informou que não havia correção visual material pendente. Seu veredito `fix` se devia exclusivamente à identidade antiga ainda registrada em DESIGN.md. A atualização documental resolve esse item: azul profundo e dourado fosco, símbolo próprio de laço, claro por padrão e agrupamentos atuais substituem a descrição anterior. Este registro não constitui uma nova inspeção visual ou execução de testes pelo Documenter.

DESIGN.md foi reconciliado com os valores reais de `globals.css`, `layout.tsx`, BrandSymbol e WorkspaceShell; o sidecar `.impeccable/design.json` recebeu os mesmos fallbacks de cor nos snippets e rampas tonais coerentes com as novas cores, incluindo `brand-gold` nos dois temas. Espaçamento, tipografia operacional e demais componentes incumbentes foram preservados. O destino atual conserva texto, fundo azul e `aria-current`; o ponto dourado complementa a seleção. Configurações tem filhos com rolagem e limite de 28dvh, mantendo perfil e saída visíveis.

## Evidências existentes

O arquivo `.impeccable/review/navigation-runtime.json`, lido nesta passagem documental, registra oito estados: login, desktop, clients, settings, short, dark, mobile e mobile-clients. Todos têm `overflow: false`, nenhuma violação Axe e nenhum erro de página no array geral `errors`.

As capturas finais correspondentes estão em `.impeccable/review/navigation-{login,desktop,clients,settings,short,dark,mobile,mobile-clients}.png`. O seed corroborador está em `.impeccable/review/navigation-seed.txt`.

Segundo a execução informada pelo agente principal: typecheck aprovado; 12 testes E2E aprovados antes do ajuste do rodapé; os dois testes de navegação foram repetidos e aprovados após esse ajuste, assim como os builds API e Next. O Documenter não repetiu browser, detector, builds ou testes.

O detector existente em `.impeccable/review/navigation-detect.json` foi executado uma vez: 50 achados advisory e zero primary. O resultado permanece como evidência daquela execução, anterior à reconciliação documental; não se afirma que foi regenerado ou que seus achados foram todos eliminados.

## Deriva preexistente e limites

Advisories de raios e tamanhos locais — avatars, marca, cabeçalhos e adaptações responsivas — não foram promovidos em massa a tokens normativos nem corrigidos para fazer desaparecer o relatório. A tipografia de sistema em composição grande da autenticação permanece uma característica do artefato, sem canonização como regra de display para futuras superfícies.

O sidecar incumbente contém `narrative.rules` como strings, embora o formato v2 descrito no skill espere objetos com nome, corpo e seção. Esse desvio estrutural preexistente foi preservado; apenas a string de identidade obsoleta foi atualizada. Corrigir seu schema fica fora da mudança autorizada.

A API legada de Badge conserva o nome `indigo`; ela agora consome os tokens semânticos azuis. O nome técnico não constitui a identidade atual. Este passe não modifica UI, imagens, PRODUCT.md nem capacidades futuras, e não declara integrações ou automações de fases futuras como implementadas.

## Extensão compatível: demonstração de automações

Comparação de fonte entre `apps/web/src/features/sales/automations.tsx`, a seção “Sales automation demonstration” de `globals.css` e `docs/automation-demo-contract.md`: a extensão reutiliza os componentes de campos, botões, badges e feedback existentes, as cores semânticas globais, divisórias e raios de controles (7px), feedback (8px) e containers (12px). O checkbox nativo usa `accent-color: var(--primary)`; o indicador de etapa herda a cor configurada do pipeline. Nenhum novo token global foi adicionado. DESIGN.md e `.impeccable/design.json` permanecem os da identidade aprovada.

No desktop, a composição segue regras → construtor → prévia, em três colunas (220px, centro flexível, 280px), com intervalo de 24px e prévia lateral sticky. Até 1200px, as regras ocupam a faixa superior; até 980px, construtor e prévia passam para uma coluna e a prévia perde o sticky. No mobile a ordem de leitura continua regras → construtor → prévia. “Regras por etapa” usa lista de etapas e painel de requisitos em duas colunas, também reduzidas a uma até 980px. A fonte registra abas com `tablist`, `tab`, `tabpanel`, seleção acessível e tratamento de setas, Home e End; isso descreve o código, sem afirmar verificação funcional de teclado.

A demonstração vincula regras ao pipeline selecionado e permite editar Quando → Condição → Ação, mensagem e prévia fictícia. Os requisitos de valor, contato, previsão de fechamento e próxima atividade são exemplos independentes por etapa, salvos localmente por empresa/pipeline; não bloqueiam o Kanban nem substituem validação backend. Email e WhatsApp são somente simulações visuais, conforme pedido explícito do usuário. Este adendo resulta apenas da comparação documental de código e contrato; não houve nova inspeção funcional, browser, teste ou detector.
