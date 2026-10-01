# Comparação do sistema visual — CRM, Fase 2

Revisão documental de 01/10/2026. Extensão do modo **Operate**, preservando a direção existente do Desmos. O contrato Documenter da Impeccable foi aplicado por um subagente de implementação; esta comparação não substitui a revisão visual independente.

## Resultado

**Sistema preservado.** `DESIGN.md` e `.impeccable/design.json` permaneceram sem alterações nesta etapa. A implementação acrescenta superfícies de trabalho, sem introduzir uma nova identidade ou exigir novos tokens globais.

A comparação entre `apps/web/src/app/globals.css` e o frontmatter de `DESIGN.md` encontrou os mesmos **19 tokens semânticos no tema claro e 19 no escuro**, sem divergências de valor. Foram conferidos também o sidecar v2, os componentes compartilhados e amostras de listas, formulários, detalhes, notas, tags e lixeira em `apps/web/src/features/crm`.

| Aspecto                    | Evidência na extensão                                                                                                                                                                                       |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paleta e profundidade      | Superfícies, bordas, ação índigo, foco e feedback consomem as variáveis existentes. Nenhuma sombra ou camada decorativa nova.                                                                               |
| Tipografia e controles     | A família de sistema permanece. Os novos fluxos reutilizam `Button`, `Input`, `Select`, `Field`, `Card`, `Dialog`, `Alert` e estados compartilhados.                                                        |
| Listas                     | Toolbar com busca, filtros expansíveis, tabela com rolagem no próprio container e paginação. Cabeçalhos e dados mantêm a densidade operacional.                                                             |
| Cadastro e detalhe         | Formulários em páginas próprias. Detalhe combina informações do registro com histórico, notas e contatos vinculados, quando aplicável. A composição vira uma coluna no breakpoint já existente de notebook. |
| Histórico e notas          | Lista cronológica, alterações expansíveis, texto simples, notas fixadas e composição inline. Diálogos ficam restritos a conversão e confirmações.                                                           |
| Tags                       | Texto e ponto de cor identificam classificações. As cores escolhidas pelo usuário são dados do cadastro e não uma segunda paleta de marca.                                                                  |
| Responsividade e interação | Reutiliza os breakpoints do sistema, foco visível, redução de movimento e drawer móvel. O rótulo “Sua empresa” foi removido por solicitação do usuário, mantendo nome e ícone.                              |

## Evidência de verificação e limites

O agente principal informou uma rodada de capturas desktop, formulário, detalhe, tema escuro, mobile, detalhe mobile e navegação mobile, salvas em `.impeccable/review/crm-*.png`, com ausência de violações Axe no recorte executado, overflow da página e erros de navegador. Não foram repetidos navegador ou detector nesta comparação documental.

O detector já executado pelo agente principal retornou nenhum antipadrão no recorte TSX e CSS, com 55 avisos CSS, majoritariamente anteriores à extensão. Permanecem avisos de texto auxiliar de **10px** nas datas do cadastro, datas do histórico, rótulos de alterações e metadados de notas (`globals.css`, linhas 2324, 2425, 2456 e 2538 na revisão). Esses valores não foram transformados em tokens nem em recomendação para novas telas. São um limite de legibilidade a considerar em uma revisão tipográfica autorizada; não foram alterados nesta tarefa documental.

O sidecar continua representando os dez componentes fundamentais do sistema. Toolbar, histórico e composição de notas são padrões locais desta fase, registrados aqui, sem promover sua organização de página a regra global. A verificação automatizada citada cobre as superfícies e condições executadas; não constitui certificação integral de acessibilidade.
