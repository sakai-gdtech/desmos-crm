# Registro de design — automações e assistente global

02/10/2026. Passe documenter da skill Impeccable, executado por agente delegado; o arquivo `reference/degraded/documenter.md` foi usado como contrato do papel, sem substituição inline. Autoridade: identidade Desmos existente e [spec autorizada](specs/automation-redesign-global-assistant.md). Extensão de superfície, sem troca de identidade ou criação de novos tokens.

Atualizados `DESIGN.md` e `PRODUCT.md`: diretório → editor progressivo de uma coluna → revisão/teste; biblioteca de mensagens com edição dedicada; assistente global no shell, persistência em memória tenant + user e handoff explícito para revisão. A descrição anterior de três colunas e o alcance antigo do assistente foram reconciliados com o código. Frontmatter, `.impeccable/design.json` e demais contratos preservados.

## Evidência checada

Código amostrado: `sales/{automations,automation-editor,automation-assistant,message-templates}.tsx`, `workspace/{shell,global-assistant,assistant-context}.tsx`, tokens e extensão final de `globals.css`. Comparação com `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json` e [revisão independente](automation-redesign-review.md).

| Decisão registrada | Evidência |
| --- | --- |
| Diretório antes de editar; receitas em disclosure; status textual real/simulado | `automations.tsx`; [desktop](evidence/automation-redesign/desktop-directory.png), [mobile](evidence/automation-redesign/mobile-directory.png) |
| Uma coluna de até 850px; passos; prévia na ação; salvar na revisão | `automation-editor.tsx`, CSS; [gatilho](evidence/automation-redesign/desktop-trigger.png), [ação](evidence/automation-redesign/desktop-action.png), [revisão](evidence/automation-redesign/desktop-review.png) |
| Biblioteca com lista e formulário exclusivo; revisão/snapshot preservados | `message-templates.tsx`, `automation-editor.tsx`; [lista](evidence/automation-redesign/desktop-library.png), [editor](evidence/automation-redesign/desktop-library-editor.png) |
| Entrada global, contexto da rota, conversa mantida e painel responsivo | `shell.tsx`, `global-assistant.tsx`, `assistant-context.tsx`; [Agenda](evidence/automation-redesign/desktop-assistant-agenda.png), [mobile](evidence/automation-redesign/mobile-assistant.png) |
| Escuro usa a identidade existente; ações essenciais continuam verticais | Tokens CSS, media query até 760px; [revisão mobile escura](evidence/automation-redesign/mobile-dark-review.png) |
| Movimento de 120–220ms; passos WAAPI 180ms; cancelamento/runtime reduced motion | CSS e effect do editor; [ensaio de movimento](evidence/automation-redesign/accessibility-motion.json) |

As dez capturas vinculadas foram abertas neste passe. O [registro visual](evidence/automation-redesign/visual-results.json) informa 1440×1000 e 390×844, zero erros e ausência de overflow mobile; a amostragem é compatível com esse registro. Capturas estáticas não comprovam movimento ou isolamento. O ensaio existente registra uma animação ativa antes de reduced motion e zero após a mudança em runtime; não foi reexecutado pelo documenter.

O reparo de cancelamento observado no código captura cliques em links internos sem modificadores, excluindo nova aba/download, e pede descarte antes de `router.push`; controles locais e `beforeunload` também protegem alterações. Não há interceptação especial de voltar/avançar do histórico nativo. O builder informou quatro E2E de assistente/navegação aprovados, incluindo cancelar saída para Agenda, preservar corpo de modelo e confirmar descarte/navegação com drawer fechado em desktop/mobile. Testes funcionais, typecheck e build não foram reexecutados pelo documenter.

## Compatibilidade e limites

Azul profundo/dourado fosco, claro padrão, pares escuros, fonte de sistema, controles compactos e superfícies planas continuam compatíveis com o frontmatter e os snippets do sidecar. A sombra do assistente é uma separação de sobreposição, sem elevar cards. CSS/WAAPI descrevem o código; fontes oficiais de Motion e GSAP e a decisão de dispensar dependências adicionais estão na spec. A [medição de laboratório da build final exata](evidence/automation-redesign/performance.json) não comprova ganho de desempenho: abertura quente mediana de 28,2 para 29,1ms e resposta mediana ao input de 32,6 para 32,5ms. O JS gzip calculado após abrir o editor passa de 261.908 para 266.331 bytes; toda a saída da build passa de 448.365 para 454.909 bytes de JS gzip e de 13.855 para 15.145 bytes de CSS gzip. São medições locais em Chrome headless, sem limitação de CPU/rede, e tamanhos gzip calculados; não representam INP/FPS de campo nem compressão observada na transmissão.

Drift preexistente não reparado: a sequência de navegação em `DESIGN.md` e no snippet/narrativa do sidecar omite Agenda; o sidecar contém entradas de `narrative.rules` em formato de string além dos objetos recomendados pelo schema. Seu catálogo também antecede o assistente e a extensão de motion atual, e sua regra de sombra ainda menciona somente o negócio. A documentação de superfície foi atualizada dentro do escopo; regeneração do sidecar e reconciliação global ficam fora desta extensão autorizada.

O ensaio final de acessibilidade, relido após a estabilização dos estados e a correção da hierarquia dos títulos pelo builder, registra zero violações nos sete estados: diretório, gatilho, ação, revisão, assistente desktop/mobile e revisão mobile escura. Resultados transitórios anteriores não foram promovidos a regras do sistema. Esse ensaio amostrado não equivale a conformidade integral de acessibilidade. Nenhuma correção de código foi feita pelo documenter.
