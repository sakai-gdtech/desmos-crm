disposition: ship

Limites: revisão independente amostral de uma extensão code-led em modo Operate; sem comp aprovado, QUALITY BAR externo ou contrato de conceito/seed fornecido. A identidade existente, PRODUCT.md, DESIGN.md e as duas especificações são a referência. Performance reconciliada apenas com o ensaio local de produção fornecido; sem validação em hardware mobile físico ou métricas de campo.

## persistence

Pass. PRODUCT.md e DESIGN.md registram a navegação operacional, o chat global, a memória de edição e a implementação efetiva de Motion.dev. `docs/specs/system-motion.md` e `docs/specs/navigation-chat-motion.md` descrevem o comportamento implementado, os limites demonstrativos e a validação prevista. A substituição do primeiro motor WAAPI está documentada, sem apresentar a biblioteca como mera instalação.

Evidência: `docs/evidence/system-motion/verification.json` contém 92 registros de captura, correspondentes a 88 PNGs existentes. Revisei individualmente oito capturas principais: desktop-assistant, desktop-assistant-draft, desktop-assistant-agenda, mobile-assistant, mobile-assistant-draft, mobile-dark-assistant, mobile-navigation e mobile-deals. Inspecionei também o conjunto em oito folhas de contato derivadas dos PNGs fornecidos, para conferir famílias, dimensões, topo e integridade geral; isso não equivale a inspeção individual de cada detalhe dos 88 arquivos. Não encontrei captura ausente, vazia ou incompatível com seu nome. Não renderizei o produto nem rodei novo detector.

Reconciliação final limitada à leitura de `performance.json` e `video.json`: o primeiro registra o ensaio comparativo em produção; o segundo identifica gravação da fonte final em 1440×1000, conta fictícia, interações sem envios reais e zero erros. O WebM permanece não assistido pelo revisor; seus metadados não substituem inspeção visual do vídeo.

## fidelity

| Elemento/promise | Resultado | Evidência e implicação |
| --- | --- | --- |
| TYPE | match | Títulos operacionais, texto de apoio e rótulos mantêm a escala compacta existente. Autores, mensagem e resumo do chat possuem hierarquia legível nas capturas principais. |
| MATERIAL | match | Azul profundo, dourado discreto, superfícies claras e equivalentes escuros preservam o Desmos; sem brilho, ornamentação ou profundidade nova dominando o trabalho. |
| GROUND | match | Alinhamento, divisões e áreas de conteúdo continuam estáveis. Mobile reflow mantém CTA e navegação contextual disponíveis. |
| Motion efetiva e abrangência | match | `components/ui/motion.tsx` usa `animate` de `motion/mini` e `spring` de `motion`; entradas, coleções, continuidade, passos e overlays compartilham esse motor. Integrações amostradas cobrem CRM, comercial, trabalho, automações, configurações e autenticação; formulários e métricas estáticos continuam sem coreografia ornamental. |
| Movimento demonstrado | match | Os registros dinâmicos fornecidos mostram transforms não identidade em Kanban (29 frames), reversão de etapas (3 frames) e painéis desktop/mobile (43 frames cada), com overflow zero nos frames medidos e transform final `none`. Capturas estáticas servem à composição, não como prova de animação. Não assisti ao WebM nesta revisão. |
| Interrupção e reduced motion | match | A central cancela controles, restaura transform autorado e limpa o registro em preferência reduzida, invisibilidade e unmount. Hooks cancelam a própria execução. O ensaio fornecido registra uma animação ativa antes da alteração de preferência e zero depois. O conteúdo não depende de opacity/animation para aparecer. |
| Navegação operacional | adaptation | `sales/navigation.tsx` e shell aproximam Agenda/Tarefas/Atividades e Kanban/Lista/funis, com ações por permissão. Configurações permanece administração e conta; Clientes contém tags/lixeira. Capturas mobile e desktop confirmam os destinos no contexto de trabalho. |
| Guarda e recuperação do editor | match | EditorMemoryProvider é delimitado por tenant/usuário no layout autenticado; etapas usam chave por funil/versão, preservam o rascunho na desmontagem e limpam ao salvar/descartar. Links internos e cancelamento pedem decisão explícita; retorno pelo Kanban conserva o funil. Memória é temporária, sem promessa de persistência após reload ou interceptação especial de histórico nativo. |
| Chat e rascunho explícito | adaptation | Transcript com autores, composer multiline separado, proteção IME e sugestões contextualizadas substituem o formulário dominante. `dl` resumido e `details` para ajustes reduzem a revisão dentro da conversa. A conversa persiste ao navegar; preparar/gerar rascunho exige ação explícita, e o modo local sem envio permanece informado. Permissões limitam preparação e consultas. |
| Mobile e tabela comercial | adaptation | `deals.tsx` usa `table-scroll`, região rotulada e focável. Captura final mantém a página no viewport; confirmação registra scroll interno de 120px, conteúdo de 768px em área de 356px e overflow de body zero. Painéis entram verticalmente no mobile. |
| Acessibilidade e foco | match | Sem remount por chave de animação; IDs e controles nativos preservados. O JSON final contém 13 auditorias axe sem violações e nenhum erro JS. Esses resultados são amostrais e não substituem teste completo com tecnologias assistivas. |
| Verdade do conteúdo | match | Tenant e exemplos demonstrativos identificados; chat declara demonstração local, sem efeitos reais. Não encontrei promessa comercial inventada nem execução implícita por conversa. |

## ceiling

Reached para a extensão da identidade existente: movimento finito e mais perceptível, com continuidade nos objetos de trabalho, entradas de contexto e painéis consistentes. A implementação mantém a leitura empresarial e evita teatralizar cada bloco. Não há base externa para afirmar equivalência a um comp ou premiação visual.

Os limites de seis itens por coleção, vinte movimentos de layout, seleção de elementos visíveis e ausência de observer global são verificáveis no código. O builder informou 30 E2E, 61 testes API, typecheck e builds API/Web finais aprovados; não os reexecutei.

O ensaio de `performance.json` usa Chrome headless no mesmo Mac/API/conta, produção Webpack, viewport 1440×1000 e sem throttling. Há uma abertura fria, cinco quentes, cinco entradas e 39 intervalos rAF durante sete mudanças de passo. JavaScript inicial cresce 12.241 bytes gzip calculado (cerca de 12 KiB), CSS 1.147 bytes, todo JS de saída 8.888 bytes e JS após abrir o editor 6.433 bytes. São tamanhos gzip nível 9 dos assets, não compressão observada na rede nem custo atribuível exclusivamente à biblioteca.

Base/final: abertura fria 334,9/322 ms; mediana quente 29,5/22 ms; mediana de entrada 32,3/33 ms; intervalo rAF p95 16,8/16,7 ms e máximo final 16,8 ms; nenhum Long Task observado. A pequena amostra não indica regressão material no fluxo medido, mas não demonstra ganho de performance, INP de campo, FPS garantido ou comportamento em dispositivo físico. Não executei novo ensaio nem examinei trace completo.

## material_fixes

Clear. Nenhum bloqueio material identificado nesta rodada delimitada de código e evidência final. A pendência de coleta local de performance foi encerrada pelos registros fornecidos; os limites do método permanecem explícitos acima.

## keep

Preservar a hierarquia operacional Desmos, a continuidade por IDs, o composer disponível, as permissões, o rascunho explicitamente revisável e o cancelamento que restaura conteúdo visível imediatamente.
