# Validação — automações e assistente global

02/10/2026. Validação anterior à publicação, sobre `508bfafe60a0b9b96ea2860c1e65b21523ae710e`; checkout inicialmente limpo. Na validação não houve commit, push, deploy, credenciais novas ou envio real. [Spec](specs/automation-redesign-global-assistant.md), [parecer independente](automation-redesign-review.md), [registro de design](automation-redesign-design-review.md).

## Resultado visual e funcional

O diretório prioriza regras, resumo, status e uma CTA. Criar/editar substitui a lista por três passos em uma coluna: gatilho, ação/mensagem e revisão/teste. Biblioteca de conteúdo reutilizável tem lista e edição próprias; receitas iniciam regras. Selecionar mensagem mostra a prévia no passo da ação e conserva conteúdo/revisão anteriores ao editar a biblioteca.

O assistente tem uma entrada no topo de todas as áreas autenticadas do shell. O contexto acompanha a rota e a conversa permanece ao fechar/reabrir ou navegar no mesmo workspace. Tenant + usuário reinicia a sessão. É interpretação local demonstrativa: ajuda contextual e rascunhos de email/WhatsApp por entrada em etapa, com resolução explícita, revisão e salvamento humanos. “Me enviar email” usa o usuário autenticado. Nenhum pedido de conversa envia mensagens ou altera dados comerciais.

CSS e WAAPI dão feedback curto em controles, navegação e overlays; passos usam 180ms, cleanup e cancelamento. Preferência de movimento reduzido cancela também a animação JS em execução. Nenhuma dependência foi adicionada.

## Checks executados

| Check | Resultado |
| --- | --- |
| `npm run typecheck` | Passou nos dois workspaces, sobre o código final |
| `npm test` | 61 testes de API passaram; inclui deduplicação, permissões/isolamento e Agenda |
| Build API | TypeScript passou |
| Build web de produção | Webpack passou na cópia isolada do código final em `/tmp/desmos-redesign-build/final`; base arquivada do commit passou separadamente |
| E2E completo | 22 passaram antes dos reparos finais do guard/títulos |
| Gate E2E final | 10 passaram depois dos reparos: automation-demo, automation-workspace, global-assistant, navigation e rules-and-stages |
| Auditoria axe amostrada | Zero violações em sete estados estáveis: diretório, três passos, assistente desktop/mobile e revisão mobile escura |
| Movimento runtime | Uma animação antes de reduced motion, zero após; interrupção entre passos mantém uma animação e ação visível; zero pageerrors |
| Inspeção visual | 16 capturas finais, desktop 1440×1000, mobile 390×844, claro/escuro; zero overflow mobile e pageerrors no roteiro |
| `git diff --check` | Passou |
| Detector Impeccable em `automations.tsx` | `[]`; não equivale a auditoria integral |
| Revisão independente final | `disposition: ship`; dois reparos materiais resolvidos, 16 recapturas válidas e nenhuma regressão visual observada |

E2E cobrem biblioteca → seleção → preview → salvar/reabrir, atualização de modelo sem alterar snapshot salvo, IDs de etapas, testes repetidos, cancelar/retornar, persistência local após reload, handoff com alterações pendentes, conversa entre rotas, identidade/permissões e navegação para Agenda com drawer mobile. Cancelar saída preserva alterações; confirmar descarta e navega. O teste de identidade usa sessão mockada de outro usuário/tenant sem permissão, verifica conversa vazia e ausência de leitura de funis.

API, E2E e captura usaram serviços locais e Chrome instalado. O teste de API precisou de execução local fora do sandbox devido ao pipe IPC do tsx. Tentativas preliminares com artefatos E2E concorrentes e seletores antigos foram descartadas e repetidas em um único runner; o gate final acima passou. Aviso preexistente de depreciação Fastify não gerou falha. Não foi executado ensaio em hardware mobile físico nem auditoria WCAG integral.

## Medição explícita

[Dados e método](evidence/automation-redesign/performance.json). Produção Webpack, mesmo Mac/API/conta fictícia, Chrome headless, sem throttling. Abertura medida do clique até campo presente + dois requestAnimationFrame: uma fria e cinco quentes. Input: evento + dois frames, cinco amostras. Gzip nível 9 calculado por asset, sem alegar compressão observada na rede. Assets iniciais variam com prefetch; comparação abaixo usa assets após abrir o editor e a saída total compilada.

| Métrica | Base | Final |
| --- | ---: | ---: |
| Abertura quente, mediana | 28,2ms | 29,1ms |
| Input, mediana | 32,6ms | 32,5ms |
| JS carregado após editor, gzip calculado | 261.908 bytes | 266.331 bytes |
| Toda saída JS, gzip calculado | 448.365 bytes | 454.909 bytes |
| Toda saída CSS, gzip calculado | 13.855 bytes | 15.145 bytes |

Latências locais semelhantes e aumento pequeno: +4,3KiB de JS carregado após o editor e +1,3KiB de CSS. Sem ganho de performance comprovado, medição de campo, INP ou FPS. Os servidores temporários comparativos foram encerrados; o servidor de desenvolvimento existente foi preservado.

## Evidências e reprodução

[Galeria local](evidence/automation-redesign/index.html) reúne antes/depois, capturas e [gravação](evidence/automation-redesign/desmos-automation-walkthrough.webm). [Registro visual](evidence/automation-redesign/visual-results.json), [axe/motion](evidence/automation-redesign/accessibility-motion.json). Scripts: `scripts/verify-automation-redesign.mjs`, `scripts/audit-automation-redesign.mjs`, `scripts/measure-automation-redesign.mjs`. Criam/usam conta fictícia local e auth temporária em `/tmp`; não há senha/token nos deliverables. Medição requer builds locais base/final nas portas 3018/3019.

## Limites entregues

- Conversa dura enquanto o shell permanece montado; reload inicia conversa nova. Regras/modelos locais seguem a persistência demonstrativa existente por tenant.
- A linguagem aceita o conjunto demonstrativo descrito na UI; não há API de LLM, envio real ou novos recursos de calendário/atribuição.
- Saída pelos controles e links internos pede descarte; reload/fechar usa `beforeunload`. Voltar/avançar nativo do histórico não tem interceptação especial de descarte.
- Backend do followup real não foi alterado; suas permissões e deduplicação permanecem. O editor distingue simulação de acompanhamento funcional.
- Esta validação antecede a autorização de publicação. Em 02/10/2026 às 01:12:46 UTC, o usuário autorizou commit e push pelo pai; deploy continua fora do escopo.
