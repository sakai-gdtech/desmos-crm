# Editor de funil — refinamento de 2/10/2026

Modo Operate; identidade Desmos existente, azul profundo e dourado fosco. Escopo: editor de funil novo/existente, sem novas regras ou capacidades.

## Diagnóstico e composição

- Capturas reais em 1440×1000/390×844, claro/escuro: instruções, sequência duplicada e avisos competem com as linhas; nome/cor e ações se espalham no mobile. Avançados repetem um bloco longo por etapa.
- Cabeçalho curto; nome/descrição/status agrupados. Um painel de etapas com contagem, linhas compactas, posição, alça, nome/cor e ações. Sem duplicar a sequência já visível nas linhas.
- Inserção abaixo da lista, com posição e Adicionar etapa juntos. Detalhes avançados recolhidos e campos agrupados; consequência de exigir próxima atividade permanece no label. Informações de ordem, funil ativo, probabilidade, inatividade e requisito em botões i acessíveis por clique/toque/Enter/Space, Escape e fechamento externo.
- Estado não salvo e Salvar/Cancelar/Excluir juntos na barra de ações ao final, no fluxo da página, para não cobrir etapas. Recuperação, erros e confirmação de descarte visíveis. Dourado apenas em ícones de informação, detalhe do título e estado pendente; texto usa tokens com contraste adequado.

## Contrato

IDs/localKey, referências de negócios/regras, retorno ao mesmo funil, recuperação em memória, Motion.dev e Select próprio preservados. Nada aplica ao Kanban antes de salvar. Bloquear edição e ações locais enquanto salva; confirmação de descarte não se esconde em ajuda. Setas continuam alternativas ao arraste, especialmente em touch/teclado. Sem modal para o editor e sem animações novas contínuas.

## Aceitação

Antes/depois nos quatro cenários; informações dentro do viewport e acionáveis sem hover; foco retornado após Escape. Inserir antes/no fim, reordenar, renomear, remover, avançados e nomes longos sem overflow. Cancelar/continuar/descartar, salvar uma vez sob clique duplo/latência, IDs e regras preservados, retorno e reabertura. Testes existentes de recuperação e movimento mantidos; typecheck/build/testes sobre código final. Fixtures novas, sem reset/envio externo/commit/push/deploy.
