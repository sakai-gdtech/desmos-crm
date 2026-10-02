# Dourado no sistema Desmos

Refinamento de identidade, modo Operate. Preserva layouts, conteúdo, contratos e estados existentes.

## Hierarquia

- Azul profundo: ação principal, links e foco de teclado. Mantém a base comercial do Desmos.
- Ouro fosco: orientação e marca. Destino ativo da navegação, linha da aba selecionada, marca de opção selecionada, passo atual do editor e entrada do Assistente. Ícones de seção do Radar e resumo financeiro recebem destaque pontual.
- Neutros: plano claro levemente aquecido, superfícies brancas; tema escuro mantém profundidade azul com ouro mais claro e fundo de seleção quente contido.
- Verde, âmbar e vermelho: sucesso, atenção e erro. Não reutilizar ouro para simular esses estados.

## Aplicação

Tokens adicionais `brand-gold-soft`, `brand-gold-text` e `brand-gold-border` distinguem fundo, texto legível e divisória. Ouro original continua em ícones sobre superfície neutra; texto pequeno usa o token mais escuro no claro. Seleção tem texto, peso, marcador ou sublinhado além da cor; foco permanece azul.

Camada compartilhada de CSS: shell e navegação, abas CRM/Agenda/Automações, Select, Assistente e editor progressivo. Resumo comercial e ícones de seção usam os mesmos tokens; cores configuradas das etapas, badges semânticos e ações de dados são preservados. Sem biblioteca, tema novo ou mudança de layout.

## Aceite

- Antes/depois em desktop/mobile e claro/escuro: Visão geral/Radar, Negócios, Agenda, Automações, formulário, funil e Assistente.
- Seleção por teclado/toque, foco visível, contraste medido e amostras axe; sem overflow novo ou erro de runtime.
- Regressão existente, typecheck e build sobre fontes finais. Evidências em `docs/evidence/system-gold/`.
- Sem reset de dados anteriores, commit, push, deploy ou envio externo.
