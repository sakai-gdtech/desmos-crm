# Validação — navegação, conversa e Motion.dev

02/10/2026. Extensão sobre `2fbda2a90e934dc53c09af96810da81c8219a764`. A validação foi concluída localmente antes da autorização específica de commit/push para `main`; não houve deploy. Conta, empresas, contatos e mensagens de QA são fictícios; nenhum envio real, credencial externa ou serviço pago foi configurado.

## Entrega e referências

- [Proposta anterior à implementação](specs/navigation-chat-motion.md): diagnóstico, destinos operacionais, retorno de etapas e chat.
- [Inventário e linguagem de movimento](specs/system-motion.md): famílias, gatilhos, duração, limites e reduced motion.
- [Galeria e vídeo final](evidence/system-motion/index.html): 88 estados únicos, desktop 1440×1000/mobile 390×844/escuro e autenticação. Há 92 registros no JSON porque algumas capturas foram confirmadas/repetidas; a referência anterior do chat está separada.
- [Parecer independente](system-motion-review.md), `disposition: ship`; [registro de design](system-motion-design-review.md), DESIGN.md e PRODUCT.md reconciliados. Inspeção visual amostral explícita, sem alegação de revisão individual integral dos 88 PNGs.
- [QA bruto](evidence/system-motion/verification.json), [medição de produção](evidence/system-motion/performance.json), [gravação e método](evidence/system-motion/video.json).

Configurações concentra administração/conta. Agenda/Tarefas/Atividades são destinos irmãos; Kanban/Lista/funis/etapas mantêm o contexto comercial. O editor de etapas oferece decisão explícita de descarte e recuperação temporária durante navegação comum por funil/versão; salvar retorna ao funil aberto. O chat tem autores, histórico rolável e composer multilinha separado; interpretação abre um rascunho somente após revisão explícita. Sessão e memória são delimitadas por tenant/usuário e terminam após recarregar/trocar identidade. O comportamento demonstrativo, destinatário autenticado, snapshots de modelos, IDs e regras reais continuam preservados.

Motion.dev 13.5.0 é o motor efetivo (`motion/mini` + `spring` de `motion`), em contexto, coleções, Kanban/etapas, passos e painéis; CSS atende feedback simples. A biblioteca substituiu o runtime manual intermediário. A integração cancela/restaura transform no cleanup, aba oculta e reduced motion em runtime. Limites: seis filhos por coleção e vinte movimentos de layout, sem observer global nem medidas por frame. Springs configuradas em 320ms resultaram em 350ms nos registros nativos amostrados; os valores de configuração não são duração real garantida.

## Verificações executadas

| Verificação final | Resultado |
| --- | --- |
| `npm run typecheck` (API + web) | PASS |
| `npm test` (API) | 61 PASS |
| `npm run build -w @orbit/api` | PASS |
| `npm run build -w @orbit/web -- --webpack` | PASS; executado em cópia temporária da fonte final com a mesma instalação |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` | 30 PASS, 2,0min, um worker, sem retries locais |
| `git diff --check` | PASS |
| Comparação `diff -rq apps/web/src /tmp/desmos-system-motion/final/apps/web/src` | Sem diferenças na fonte usada pelo build/métricas/vídeo |
| `node scripts/verify-system-motion.mjs` + confirmação delimitada | 92 registros/88 nomes únicos; zero erros JS, zero overflow final |
| `node scripts/confirm-system-motion.mjs` | PASS; 13 estados axe com zero violações, tabela rolável/focável |
| `node scripts/record-system-motion.mjs` | PASS; WebM final de produção, 14,04s, zero erros JS; três frames do arquivo foram amostrados pelo builder |
| `node scripts/measure-system-motion.mjs` | PASS; comparação de produção abaixo |

E2E cobre rotas/fluxos existentes, permissões, biblioteca → seleção/preview → salvar/reabrir automação e revisão de modelos, distinção entre simulações e acompanhamento real, conversa global/isolamento, usuário autenticado como destinatário, Agenda e regressões comerciais. Os testes novos verificam movimento não identidade, reversão antes do término, reduced motion inicial e em runtime, fechar/reabrir e Escape/foco; cancelamento/continuação/descarte, retorno e recuperação pelo histórico do editor; chat desktop/mobile (Enter/Shift+Enter, conversa conservada na navegação e apagada após reload). Os testes de API cobrem permissões/RLS, IDs/versões, Agenda e deduplicação do acompanhamento real. Nenhuma regra backend foi alterada nesta extensão.

O passe visual amplo foi seguido de uma única rodada de reparos e confirmação direcionada: (1) a tabela mobile de negócios extravasava o corpo, corrigida com o container de rolagem existente e região acessível; (2) o formulário de revisão ocupava a conversa, substituído por resumo e disclosure de ajustes. A confirmação mede `scrollLeft=120`, largura de conteúdo 768px/container 356px e zero overflow do corpo. Falhas intermediárias de seletores legados/loading coexistente/sessão de QA expirada foram corrigidas no harness; não são reportadas como pass do código anterior.

Os registros dinâmicos mostram transform real no Kanban (29 frames), reversão de etapas interrompida (3) e painel do chat em desktop/mobile (43 cada), sem overflow nos frames medidos. A preferência reduzida alterada em runtime passou de uma animação ativa a zero. Conteúdo e foco continuam disponíveis sem esperar animação. O vídeo mostra interação real com reordenação/cancelamento, destinos contextuais, biblioteca, conversa/revisão, editor progressivo e sessão conservada na Agenda; não é uma coleção de capturas estáticas.

## Custo de produção e amostra local

Base: archive de `2fbda2a`; final: cópia exata da fonte atual. Ambas com Next 16.3.8/Webpack/mesmo node_modules, em servidores temporários 3018/3019, mesmo Mac/API/conta fictícia e Chrome headless 1440×1000. Nenhuma outra suíte/build rodava durante a medição. Sem throttling de CPU/rede. Gzip por asset em nível 9, calculado sobre arquivos/respostas; não é compressão observada na rede. A diferença inclui toda a extensão de navegação/chat/movimento, não somente a biblioteca.

| Métrica | Base | Final | Diferença |
| --- | ---: | ---: | ---: |
| JS inicial da rota automações, gzip | 256.258 B | 268.499 B | +12.241 B (12,0 KiB) |
| CSS inicial, gzip | 15.145 B | 16.292 B | +1.147 B (1,1 KiB) |
| JS carregado após abrir editor, gzip | 266.352 B | 272.785 B | +6.433 B (6,3 KiB) |
| Todos os assets JS de saída, gzip | 454.935 B | 463.823 B | +8.888 B (8,7 KiB) |
| Abrir editor frio | 334,9ms | 322,0ms | −12,9ms |
| Abrir editor quente, mediana de cinco | 29,5ms | 22,0ms | −7,5ms |
| Input + dois rAF, mediana de cinco | 32,3ms | 33,0ms | +0,7ms |
| Gap rAF p95, 39 intervalos | 16,8ms | 16,7ms | −0,1ms |
| Gap rAF máximo | 16,8ms | 16,8ms | 0,0ms |
| Long Tasks observadas na janela | 0 | 0 | 0 |

Abertura mede clique até o input existir mais dois rAF (uma fria/cinco quentes); input mede evento mais dois rAF. Amostra de quarenta callbacks rAF com sete trocas de passo fornece 39 intervalos efetivos, com PerformanceObserver de Long Tasks. Não é trace completo, INP de campo ou garantia de FPS. Amostra pequena, sequencial e sem throttling: não permite atribuir ganho ao movimento nem concluir equivalência de desempenho em hardware diferente. Não apareceu regressão material de resposta nesta amostra; o aumento de bundle está explícito.

## Limites e próximo passo

Firefox/WebKit, aparelhos móveis físicos e leitores de tela não foram executados; axe e inspeção visual são amostrais. Não houve teste de LLM externo, envio real, produção remota ou credenciais, pois o assistente é intérprete local demonstrativo e o envio deste editor é simulado. Capturas usam emulação Chrome e dados fictícios. A comparação não isola o custo de cada módulo. Os servidores temporários de medição foram encerrados. Na checagem final, os processos antigos de dev/API já não escutavam; interface 3017 e API 4000 foram restauradas, usando os containers existentes. Nenhum worker foi iniciado.

Nenhum bloqueio material aberto na revisão independente. O usuário autorizou a publicação no GitHub após o fechamento desta validação. Antes do commit, fonte web, manifesto e lockfile foram comparados com o build final validado, sem diferenças; nenhuma mudança funcional nova exigiu repetir as suítes. A alteração automática de caminhos de tipos em `next-env.d.ts`, produzida ao restaurar o servidor dev, foi retirada do diff. Specs e pareceres anteriores preservam a situação de autorização de quando foram escritos.
