# Registro de design — movimento do Desmos

02/10/2026. Passe documenter Impeccable, modo Operate, sobre as specs autorizadas de [movimento](specs/system-motion.md) e [navegação/chat](specs/navigation-chat-motion.md). A decisão final adota Motion.dev e substitui a etapa intermediária CSS/WAAPI manual. Identidade, tokens e contratos de dados preservados; navegação e composição do chat reconciliadas em `DESIGN.md`, com fatos operacionais atualizados em `PRODUCT.md`. Este registro distingue a amostragem feita pelo documenter dos checks finais e medições fornecidos pelo builder, sem substituir a revisão independente.

## Implementação checada

Fontes lidas: `components/ui/motion.tsx`, `components/providers.tsx`, `components/ui/primitives.tsx`, extensão final de `globals.css`; `workspace/{shell,global-assistant,editor-memory}.tsx`; `sales/{navigation,board,pipelines,automation-editor,automation-assistant}.tsx` e amostras de Agenda/autenticação. Referências do runtime nas demais famílias foram conferidas por busca no código. `apps/web/package.json` declara `motion` na versão `^13.5.0`; a integração usa `animate` de `motion/mini` e `spring` de `motion`.

| Padrão entregue | Gatilho e limites observados |
| --- | --- |
| Contexto | `PageHeading` usa título como chave; 280ms/20px horizontal no desktop, vertical até 760px. `Alert` usa feedback 220ms/10px. |
| Resultados | `MotionCollection` anima até seis filhos em 240ms/12px, intervalo de 20ms, ciclo máximo de 340ms; chave do conjunto governa repetição e cleanup. |
| Continuidade de posição | `useLayoutMotion` captura antes da operação e compara depois: FLIP 320ms com spring sem bounce, até vinte animações, leituras em lote. Kanban chama capture antes da mudança de etapa; editor de etapas chama antes de reordenar, inserir e remover. |
| Passos | Editor de automações usa o player central: 280ms, 24px horizontal ou 20px vertical no mobile, direção da progressão e foco no título independente da animação. |
| Sobreposições | Motion: diálogo 260ms/18px/escala 0,98; negócio/assistente com spring 320ms sem bounce, -48px horizontal no desktop ou +24px vertical no mobile. CSS mantém navegação mobile 320ms/-48px e backdrop/scrim 220ms. Fechamento imediato. |
| Feedback de controles | Pressão 110ms; mudanças tonais 150–180ms; ícones, estado atual/checklist e disclosures 200–220ms. Cards estáticos não recebem elevação por hover. |
| Interrupção e acesso | Registro Motion verifica reduced motion, aba oculta, conexão, área visível e interseção com viewport; cancela em mudança runtime/hidden/cleanup e restaura transform inline original ao terminar/cancelar. CSS tem redução global. Conteúdo existe antes dos efeitos. |

Coleções estão conectadas a CRM/listas, notas, timeline, tags/lixeira; Radar, negócios em lista/detalhe por aba, funis, tarefas/atividades, Agenda, diretório de automações, biblioteca, equipe, sessões e auditoria. Agenda anima os grupos de dias; autenticação anima título/descrição/formulário por modo e conserva marca/narrativa estáticas. Conversa usa `newOnly`, portanto novas mensagens entram sem reanimar o histórico existente. A cobertura corresponde a componentes e gatilhos encontrados, não a cada elemento de cada tela; títulos e feedback compartilhados alcançam as famílias que os reutilizam.

As entradas do runtime Motion amostradas usam deslocamento, sem reduzir a opacidade do conteúdo legível. Limites de seis/vinte dizem respeito a elementos animados; a coleção filtra filhos e FLIP mede os elementos identificados em lote, sem promessa de custo constante para conjuntos maiores. Não há observer global, medição a cada frame, parallax ou bloqueio do teclado introduzidos neste runtime. CSS não disputa o transform dos painéis/coleções com a biblioteca.

## Navegação, recuperação e chat

O shell reúne Visão geral, Negócios, Clientes, Agenda, Tarefas e Automações conforme acesso. Clientes contém Tags/Lixeira. Configurações tem até três destinos administrativos (Empresa/Equipe/Auditoria) e dois da conta (Perfil/Sessões), em vez de misturar atividades, funis e operações comerciais. `WorkNavigation` conecta Agenda/Tarefas/Atividades; `SalesNavigation` conserva Kanban/Lista com funil selecionado e oferece Gerenciar funis. Editar etapas parte do funil selecionado; o catálogo liga ao Kanban, editor e automações. URLs anteriores permanecem válidas; o shell marca a família comercial correspondente.

`EditorMemoryProvider` é filho do layout autenticado reiniciado por tenant + user. O editor de etapas usa chave de funil + versão para recuperar alterações no retorno durante essa sessão; cleanup guarda o rascunho pendente, salvar/descartar limpa-o. Cancelar/voltar e links internos pedem revisão antes do descarte. A entrada `from=board` retorna ao Kanban com o mesmo funil; demais entradas retornam ao catálogo. A memória não é persistência de dados e termina ao recarregar/trocar identidade; não há promessa de interceptação específica do histórico nativo.

O chat usa painel de até 480px e altura até 780px limitada pelo viewport; no mobile ocupa a largura/altura disponíveis com margens de 8px. Histórico é o corpo rolável; sugestões/contexto e composer multilinha permanecem disponíveis. Autores Você/Desmos, alinhamento/fundo diferentes, estado inicial, `role=log`/anúncios polite, Enter/Shift+Enter e proteção IME tornam a conversa legível e operável. A revisão integrada à resposta mostra resumo em lista de definição (Funil/Quando/Fazer/Para/Mensagem), com campos em “Ajustar interpretação”, aberto quando a resolução está pendente. O botão explícito abre um rascunho no editor. Conversa/revisão permanecem em memória ao fechar/navegar, com alcance local, sem LLM externo, execução ou envio. Permissões e destinatário autenticado continuam explícitos.

## Evidência e validação

O [registro final visual](evidence/system-motion/verification.json), relido neste passe, contém 92 entradas de captura (88 nomes únicos), viewports 1440×1000 e 390×844, zero erros JS e zero overflow após a confirmação direcionada. Treze auditorias axe amostradas têm zero violações. A etapa CSS/WAAPI anterior permanece intermediária; os resultados atuais identificam o motor `motion.dev` e a interface final. O documenter abriu uma amostra de nove capturas:

| Família | Capturas inspecionadas |
| --- | --- |
| Navegação comercial e etapas | [Kanban](evidence/system-motion/desktop-board.png), [Atividades](evidence/system-motion/desktop-activities.png), [editor de etapas](evidence/system-motion/desktop-stages.png), [drawer mobile](evidence/system-motion/mobile-navigation.png) |
| Chat, revisão e temas | [revisão desktop](evidence/system-motion/desktop-assistant-draft.png), [revisão mobile](evidence/system-motion/mobile-assistant-draft.png), [chat mobile escuro](evidence/system-motion/mobile-dark-assistant.png) |
| Lista e autenticação | [negócios mobile](evidence/system-motion/mobile-deals.png), [login desktop](evidence/system-motion/desktop-auth-login.png) |

A amostra conserva símbolo, paleta, hierarquia e foco operacional. O chat mostra resumo/revisão dentro do histórico e composer fora de sua rolagem; a tabela de negócios mantém colunas no container. A confirmação registrada reparou dois achados: overflow da tabela mobile e excesso de campos da revisão no histórico. O código final usa `table-scroll` com região nomeada/focável e rolagem horizontal interna; o registro comprova scrollLeft de 120px em área de 356px para conteúdo de 768px, sem overflow do corpo. A revisão usa resumo e disclosure, com campos acessíveis quando necessário.

Capturas estáticas não provam animação. O JSON contém frames de interações reais: 29 no Kanban, três na reversão interrompida de etapas e 43 em cada painel de chat desktop/mobile; todos com overflow zero. Frames com `engine=motion.dev` mostram deslocamento e retorno a `transform:none`; painel desktop parte de -48px em X e mobile de +24px em Y. Reduced motion em runtime passa de uma animação ativa para zero. As durações de spring de 320ms documentadas são configurações do código; os registros nativos amostrados dessas springs aparecem como 350ms, não uma medição de FPS ou latência. A [gravação final](evidence/system-motion/system-motion-walkthrough.webm) foi substituída pela interação ao vivo da build de produção exata, incluindo reordenação/cancelamento de etapas, navegação contextual, biblioteca, revisão compacta do chat, editor progressivo e conversa mantida na Agenda. O [metadata da gravação](evidence/system-motion/video.json), lido neste passe, declara zero erros e conta local fictícia; o documenter não reproduziu o vídeo.

O builder confirmou a suíte final completa de trinta E2E aprovada (2,0min), 61 testes de API, typecheck da raiz e builds de API/web aprovados. A fonte da build final foi comparada com o checkout sem diferenças, conforme confirmação do builder. Os oito testes focados anteriores são intermediários; o resultado registrado aqui corresponde à suíte completa após a correção dos seletores legados de Cancelar. Nenhum comando de QA foi reexecutado pelo documenter; o JSON final de desempenho foi lido na reconciliação abaixo.

A [revisão independente](system-motion-review.md) tem `disposition: ship`, sem bloqueio material na amostragem de código e capturas. Seu parecer antecede a medição final de desempenho e não a valida; os resultados posteriores ficam registrados separadamente abaixo.

## Comparação local de produção

O [JSON de desempenho final](evidence/system-motion/performance.json), lido neste passe, compara base e build final em Chrome headless no mesmo Mac/API/conta, viewport 1440×1000, sem limitação de CPU/rede. Usa uma abertura fria, cinco quentes e cinco entradas de texto; click/input são medidos até o estado observado mais dois `requestAnimationFrame`. O ensaio de troca de passos amostra quarenta frames, produzindo 39 intervalos em cada build e registro de Long Tasks; não é trace completo. gzip é calculado em nível 9 por asset, não compressão observada na transmissão.

| Medida | Base → final | Diferença |
| --- | --- | --- |
| JS inicial gzip | 256.258 → 268.499 bytes | +12.241 bytes (12,0 KiB) |
| CSS inicial/saída gzip | 15.145 → 16.292 bytes | +1.147 bytes (1,1 KiB) |
| JS após abrir editor gzip | 266.352 → 272.785 bytes | +6.433 bytes (6,3 KiB) |
| Toda a saída JS gzip | 454.935 → 463.823 bytes | +8.888 bytes (8,7 KiB) |
| Abertura fria | 334,9 → 322ms | Uma amostra por build |
| Abertura quente, mediana | 29,5 → 22ms | Cinco amostras por build |
| Input, mediana | 32,3 → 33ms | Cinco amostras por build |
| Intervalo entre frames, p95 | 16,8 → 16,7ms | Máximo 16,8ms em ambas |
| Long Tasks observadas | 0 → 0 | Somente janela amostrada |

O custo cobre a extensão completa de Motion.dev, navegação, memória e chat; não pode ser atribuído integralmente à biblioteca. A amostra pequena, as latências locais e os 39 intervalos não comprovam ganho de desempenho, FPS/INP de campo ou comportamento em celular físico. A conclusão sustentada é a diferença de bytes e os resultados observados nesse ensaio, com seus limites.

## Limites de documentação

Frontmatter e `.impeccable/design.json` permanecem intactos; `PRODUCT.md` recebeu somente fatos autorizados de navegação/chat, memória de etapas e tecnologia ativa. Não foi ampliada a reconciliação de drift do sidecar. Este texto registra valores e cancelamentos encontrados no código, sem transformar cobertura prevista da spec em garantia integral. Motion.dev é usado efetivamente pelo runtime; GSAP não integra essa implementação. Capturas e axe são amostrais, e o vídeo foi conferido pelo metadata, sem reprodução pelo documenter. Não restam checks informados como pendentes neste registro; métricas de campo e auditoria integral com tecnologias assistivas ficam fora da evidência coletada.
