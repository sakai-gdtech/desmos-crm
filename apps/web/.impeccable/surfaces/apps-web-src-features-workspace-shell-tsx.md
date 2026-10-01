---
version: 1
slug: "apps-web-src-features-workspace-shell-tsx"
primary_target: "apps/web/src/features/workspace/shell.tsx"
related_targets: ["apps/web/src/features/auth/auth-screen.tsx","apps/web/src/app/globals.css","apps/web/src/app/layout.tsx"]
---

# Navegação e identidade Desmos

## Direção fornecida pelo usuário

O vendedor trabalha em Funil de vendas → negociação → próxima tarefa. O usuário pediu uma navegação mais fácil, um símbolo novo com a ideia de laço/conexão, azul com dourado sem brilho e tema claro por padrão. Nome mantido: Desmos CRM. A entrega usa código para o layout e imagem gerada para o símbolo, conforme a prioridade já fornecida de rapidez para apresentação.

## Direction contract

**THESIS:** a navegação apresenta o trabalho comercial antes da administração; clientes e configurações têm agrupamentos claros em vez de uma lista de dezesseis destinos com o mesmo peso.

**OWN-WORLD:** superfícies brancas, azul profundo nas ações e seleção, dourado fosco no laço e detalhes discretos; tipografia de interface, divisórias finas, ícones consistentes e sem efeitos metálicos. Tema claro na primeira visita, escuro apenas quando escolhido.

**STORY:** o vendedor abre o funil, encontra o negócio e programa a próxima tarefa; configurações permanecem acessíveis em um grupo secundário com nomes em português.

**FIRST VIEWPORT:** marca e empresa fixas no topo da lateral, quatro destinos comerciais diretos, Clientes expansível e Visão geral; Configurações e conta ficam no rodapé. Apenas a lista central rola em telas baixas. No celular, o menu abre como painel com Escape, retorno de foco e fechamento ao navegar.

**FORM:** sistema de fichas corporativas e orientação por índice, posição 7, seed 6770c861. A paleta azul/dourado e o laço são decisões posteriores explícitas do usuário e prevalecem sobre as alternativas do seed. Restrained em modo Operate; hierarquia e navegação padrão prevalecem sobre qualquer expressão temática.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Limites e estados

Preservar rotas, permissões, sessões e cadastros. Nenhum destino futuro aparece como implementado. Grupos abrem ao acessar seus destinos diretamente. A seleção atual usa texto, fundo e aria-current. Toda interação deve funcionar por teclado e touch. Configurações reúne empresa, equipe, funis/etapas, tags, lixeira e auditoria conforme permissões. Perfil e sessões pertencem à conta, separados do trabalho comercial. Estado escuro salvo anteriormente continua respeitado.
