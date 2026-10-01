disposition: ship

## persistence

**pass.** PRODUCT.md registra automações como demonstração visual sem envio real, regras salvas somente no navegador por empresa/pipeline e sem bloqueio backend do Kanban. `docs/automation-demo-contract.md` contém pedido, esclarecimento, cinco promessas e limites. DESIGN.md e sidecar refletem o sistema Desmos herdado: claro padrão, azul profundo/dourado fosco e laço raster com proveniência. Esta é extensão em código do sistema aprovado; não exige comp nova, QUALITY BAR de catálogo, raster novo ou roll independente.

## fidelity

**Evidência válida:** inspecionadas as oito capturas `automation-{desktop,whatsapp,stages,navigation,mobile,mobile-builder,mobile-preview,mobile-stages}.png`. Desktop/WhatsApp mostram documentos completos a 1440px de largura a partir de viewport 1440×1000; stages/navigation mostram viewport desktop; mobile e seus recortes intencionalmente rolados usam 390×844. Conteúdo e nomes correspondem aos estados, sem regiões vazias, falhas de renderização ou cortes que ocultem a inspeção dos controles/prévia. Comp não foi adotada: matriz usa contrato e identidade vigente.

| Promessa / elemento | Estado | Evidência e alcance |
| --- | --- | --- |
| THESIS: Quando → Condição → Ação por pipeline | match | Pipeline explícito acima das abas; construtor divide etapa de entrada, valor mínimo/prazo e canal/mensagem em sequência numerada com sentido funcional. |
| OWN-WORLD / TYPE | match | Tipografia operacional herdada, labels persistentes, títulos compactos, hierarquia de pesos e ícones Lucide. Stack de sistema coerente com extensão Operate. |
| OWN-WORLD / MATERIAL | match | Superfícies planas, bordas finas e controles nativos com accent-color; sem metal, brilho, efeito físico falso ou segunda identidade. Laço Desmos permanece na lateral. |
| OWN-WORLD / GROUND | match | Fundo frio claro, containers brancos, azul profundo em ação/seleção; indicador dourado discreto na navegação. |
| STORY: escolher funil, editar, ler, simular | match | Regras à esquerda, campos centrais e prévia com variáveis resolvidas à direita. Email mostra assunto; WhatsApp o omite. Captura WhatsApp exibe resultado explícito: nenhuma mensagem real enviada. |
| STORY: requisitos por etapa | match | Etapas listadas com texto/probabilidade, seleção Proposta e quatro requisitos editáveis; texto local afirma demonstração sem bloqueio do Kanban. Link aponta para configuração real existente. |
| FIRST VIEWPORT: desktop e mobile | match | Pipeline/abas antecedem conteúdo. Mobile mantém regras → construtor → prévia em página rolável, com campos de uma coluna, botões legíveis e controles sem overflow. Capturas complementares mostram o fim do construtor, simulação e salvamento de requisitos. |
| FORM: extensão Operate | match | Reutiliza navegação, tokens, controles e densidade do Desmos; não transforma automação em ferramenta com linguagem visual concorrente. |
| Truth: demonstração, dados e persistência | match | Badge Demonstração e aviso de envios simulados no topo; nota de exemplos salvos neste navegador; prévia rotulada Exemplo de oportunidade. Código usa storageKey por tenant/pipeline, substituições fictícias fixas e estado local para simulação. Não há cliente de mutação ou envio importado pelo módulo. |
| Encontrar e acessar | match | Automações aparece no grupo Configurações com seleção textual/fundo/ponto; links existentes na lista e edição de pipelines mantêm pipelineId. Permissão pipelines.manage continua aplicada no módulo. |

`automation-runtime.json` registra oito estados sem overflow, violações Axe ou pageerrors; `automation-detect.json` é lista vazia. Código das abas prevê ArrowLeft/ArrowRight/Home/End, foco e seleção ARIA; canal usa aria-pressed, requisitos têm labels/fieldset e mensagens de retorno têm role=status. A lista de regras mantém estado visual distinguível.

Alcance: revisão visual das capturas fornecidas, leitura da implementação `automations.tsx`, estilos do módulo, links em `pipelines.tsx`/shell e documentação. E2E e build final são evidências relatadas pelo pacote; o E2E relatado cobre edição, salvamento, troca de pipeline, requisitos, reload, prévia/simulação e zero POST/PATCH/PUT gerado pela demo. Não foram executados novos testes, browser ou detector pelo reviewer. Não há certificação de envios automáticos reais, integrações, persistência compartilhada, filas ou aplicação backend dos requisitos. Tema escuro, todos os estados de erro/loading e outras larguras não receberam inspeção visual adicional neste módulo.

## ceiling

Reached no escopo Operate/demonstração: organização funcional em sequência, prévia legível junto ao construtor no desktop, ordem preservada no mobile, limites de produto explícitos e continuidade da marca. Não há dispositivo visual adicional necessário à apresentação autorizada. O craft floor não aponta elemento material de recusa nas capturas: sem kicker, gradiente de texto, halo, sombra dura, ícone glyph ou moldura ornamental; numeração comunica a sequência funcional.

## material_fixes

Nenhum achado material nos estados inspecionados.

## keep

Preservar os avisos de demonstração/simulação e salvamento local, isolamento por empresa/pipeline, ausência de envios reais, Quando → Condição → Ação, prévia legível e identidade clara azul/dourado fosco do Desmos.
