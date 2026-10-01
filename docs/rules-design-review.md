# Reconciliação documental — automações e ordem das etapas

Data: 01/10/2026. Papel: Impeccable Documenter independente. Método: leitura integral de `.agents/skills/impeccable/reference/document.md`, adoção de `reference/degraded/documenter.md` como agente separado e comparação dos documentos com o código entregue. Extensão ordinária em modo Operate; não houve novo mundo visual, FORM, composição aprovada ou alteração de tokens.

## Fontes e limites da evidência

Foram comparados DESIGN.md, `.impeccable/design.json`, PRODUCT.md, `docs/rules-flow-contract.md`, `docs/rules-guide.md`, `docs/rules-finish-review.md` e o briefing existente em `apps/web/.impeccable/surfaces/apps-web-src-features-workspace-shell-tsx.md` com `apps/web/src/app/globals.css` e `apps/web/src/features/sales/{automations,pipelines,demo-followup}.tsx`, além de `automation-model.ts`.

A revisão de acabamento independente registra `disposition: ship`, cinco seções completas e nenhuma correção material. Os quatorze PNGs `rules-*` requeridos estão presentes em `.impeccable/review/`. A evidência visual, runtime e testes deste registro vem da revisão e dos resultados fornecidos pelo agente principal: quatorze estados sem overflow, violações Axe ou erros; detector com zero achados primários e 51 advisories; 60 testes API e 17 E2E aprovados, typecheck, build API e build Next com webpack aprovados. Não foram executados navegador, detector, polish ou novos testes nesta passagem. A limitação do recorte mobile da prévia permanece conforme a revisão de acabamento.

## Correspondência do sistema

Os tokens claros/escuros de azul profundo, dourado fosco, neutros frios e estados semânticos correspondem ao stylesheet. A stack de sistema e a escala compacta de interface permanecem escolhas incumbentes confirmadas. Superfícies planas, bordas finas, raios de controle/container e foco visível mantêm o material existente; os novos seletores não introduzem primitivas de cor, tipo, sombra ou movimento.

O builder entregue organiza gatilho, condições opcionais e ação em três grupos com labels persistentes e divisórias. Modelos, campos condicionais, resumo em lista de definição, prévia e disclosure de testes usam os controles existentes. Todas as ações, inclusive TASK, ASSIGN e MOVE, comunicam simulação. O acompanhamento real fica em disclosure próprio com badge, seletor de etapa, estado ativo/pausado, prévia e links às tarefas. O editor usa posição de inserção, fieldsets numerados, alça com texto, setas acessíveis e contorno de foco para o alvo de arraste; chaves locais e UUIDs preservam a identidade das etapas.

Os breakpoints observados refluem lista/formulário/resumo e controles de inserção, preservando ações essenciais. Estes comportamentos foram incorporados à seção Components de DESIGN.md e reconciliados no briefing existente. O frontmatter normativo, o North Star, as regras visuais e os snippets do sidecar foram preservados; o sidecar apenas descreve a aplicação adicional do container incumbente e registra a atualização.

## Drift e defeitos não canonizados

Nenhum drift material de paleta, tipografia ou material foi identificado nesta extensão. O sidecar preexistente contém onze previews e duas entradas históricas em texto em `narrative.rules`, além da regra nomeada; essa diferença em relação ao exemplo de schema do guia foi preservada por ser anterior à extensão e estar fora da reconciliação autorizada. Nenhum valor novo foi usado para legitimar defeitos; nenhum achado advisory ou limite da evidência tornou-se regra de design.
