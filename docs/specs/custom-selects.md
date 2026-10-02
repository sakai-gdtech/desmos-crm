# Selects do Desmos

Pedido: substituir a aparência nativa de Windows/macOS por um componente consistente em todo o CRM. Refinamento em modo Operate, preservando os formulários e os tokens existentes.

## Decisões

- Um único `Select`, exportado pelos primitives, atende os 72 usos atuais: onboarding, configurações, CRM, filtros, negócios, tarefas, automações e assistente global.
- Mantém a API de escolha única com `<option>`, `value`, `defaultValue`, `onChange` e ref. O botão visível recebe o label/erro; o select oculto preserva a integração de formulário. Os usos com React Hook Form observam seus valores para refletir `reset` e valores carregados.
- Menu do próprio Desmos: superfície do tema, escolha marcada, foco azul, texto longo com quebra nas opções e truncamento no controle compacto. Desabilitado impede abertura. Sem nova dependência.
- Popover não modal na camada superior; portal fica no diálogo/landmark de origem. Posicionamento limitado ao viewport, acima ou abaixo conforme espaço, lista com rolagem própria. Fallback por portal quando a API de popover não está disponível.
- Teclado: setas/Home/End/PageUp/PageDown exploram sem aplicar; Enter/Espaço e Tab confirmam; Escape cancela sem fechar o diálogo pai. Digitação busca prefixo em até 700 ms, sem distinção de acentos; letras repetidas percorrem resultados. Não é um campo de pesquisa textual separado.
- Mouse/touch escolhem opções; clique fora fecha. Labels, `aria-controls`, `aria-expanded`, `aria-selected` e `aria-activedescendant` preservam o significado e o foco. A lista não altera dados até a seleção humana.
- Entrada CSS de 130 ms, sem ocultar conteúdo; `prefers-reduced-motion` remove o movimento. Eventos e frames são limpos ao fechar/desmontar.

## Verificação

Testes dedicados cobrem teclado, cancelamento, digitação com acento, Tab, valores RHF no onboarding, persistência e recarga da moeda, criação de lead, menu dentro do diálogo de conversão e amostras axe nos dois temas. A suíte existente passa a operar o menu visível por `scripts/select-option.mjs`; não manipula o select oculto.

Resultados, capturas e limites finais em `docs/evidence/custom-selects/validation.md`. As evidências da rodada anterior do PDF permanecem históricas; esta rodada utiliza outro diretório.

Referências de comportamento: [WAI/APG, combobox de seleção](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/) e [MDN, Popover API](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API/Using). Estes padrões orientam a implementação; testes automatizados não certificam leitores de tela ou todos os navegadores físicos.
