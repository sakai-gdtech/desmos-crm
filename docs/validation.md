# Validação da fundação, CRM Core e Vendas

Registro das Fases 1, 2 e 3 e da demonstração visual de automações, atualizado em 1 de outubro de 2026. A marca pública é Desmos e cada conta pertence a uma empresa. A validação cobre os módulos implementados; gestão comercial e fases posteriores seguem o roadmap.

## Verificações executadas

| Verificação                 | Resultado e alcance                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript                  | API e frontend passaram em `npm run typecheck`.                                                                                                                                                                                                                |
| API                         | 55 testes passaram: 5 de domínio, 20 de integração da fundação, 19 de CRM e 11 de Vendas com PostgreSQL/Redis locais. Cada execução cria e remove seu próprio schema no banco de teste.                                                                                      |
| Navegador                   | 13 cenários distintos verificados nesta entrega: suíte completa de 12 na navegação, dois de navegação repetidos após ajuste e um novo de automações aprovado na versão final. Escopo e ordem detalhados abaixo.                                                                                                            |
| Build                       | `npm run build` passou para API e Next.js após as últimas alterações.                                                                                                                                                                                          |
| Docker                      | A imagem `orbit-crm-web:local` foi construída na entrega inicial, com o target `web`, compilando API e frontend em Node 22 Alpine. Não foi reconstruída após a mudança para Desmos; as alterações posteriores passaram no build local.                         |
| Dependências                | `npm audit` e a auditoria de produção reportaram zero vulnerabilidades na entrega da fundação. Não foram repetidos nesta fase; nenhuma dependência foi adicionada para o CRM.                                                                                  |
| Acessibilidade automatizada | Axe não encontrou violações WCAG 2 A/AA e 2.1 AA na visão geral e, nesta fase, em sete capturas de CRM: lista clara/escura/mobile, detalhe desktop/mobile, formulário de contato e drawer mobile. Isso não constitui certificação de todas as telas ou fluxos. |

## Comportamentos exercitados

A API foi testada para hashes de senha com salt, migração de hash legado, assinatura/TTL de JWT, tokens opacos, política de permissões, cadastro transacional, cookies, rotação e replay de refresh, concorrência de refresh, logout, revogação de sessão, isolamento entre empresas, proteção concorrente do último proprietário, escalada de privilégio, suspensão imediata, convites, verificação de email, recuperação de senha e uso único de tokens. Também foram verificados login/reset concorrentes, reset/reenvio concorrentes, persistência do onboarding e prontidão real das dependências.

A regra de uma empresa por conta foi verificada na API e no banco: rejeição de criação de segunda empresa, rejeição de troca para outra empresa, convite para conta já vinculada (inclusive suspensa), aceite simultâneo de convites de duas empresas e convite pendente anterior a um cadastro. A constraint `UNIQUE(memberships.user_id)` está ativa; a migração aborta sem remover vínculos se encontrar duplicidades não resolvidas. O banco local foi consultado após a migração e não contém contas com mais de um vínculo. Ana pertence somente à Nexa; Bruno pertence somente à Horizonte. Empresas e histórico da demonstração foram preservados.

Os sete cenários de navegador cobrem:

1. Cadastro, onboarding, edição persistente da empresa, logout, novo login e tema.
2. Convite entregue pelo worker ao Mailpit, aceite em outra sessão e restrições do papel VIEWER na interface e API, incluindo consulta comercial sem cadastro, edição, exclusão, conversão ou criação de notas.
3. Validação de formulário em tela estreita e resposta neutra de recuperação de senha.
4. Contas de duas empresas independentes, ausência de seletor/criação de segunda empresa, bloqueio de alterações cruzadas e revogação da própria sessão sincronizada entre abas, sem encerrar a conta da outra empresa.
5. Fechamento da navegação móvel ao abrir o perfil e confirmação/cancelamento de alterações no próprio acesso administrativo.
6. Cadastro e edição de lead sem perder outros campos, nota fixada/editada, histórico, conversão em contato/empresa, persistência após reload, exclusão e restauração pela lixeira.
7. Cadastro de empresa cliente/contato, vínculo entre eles, tags, busca/filtro, alerta de duplicidade e acessibilidade do detalhe em tema escuro/mobile.

O CRM recebeu testes para isolamento entre tenants em leitura, contagem, escrita, associações, notas, timeline, conversão e lixeira; permissões dos seis papéis; responsáveis/menções ativos; rejeição de campos inválidos e conflito de versão. Foram verificados histórico e auditoria com snapshots legíveis, normalização de datas/moeda/tags, versionamento após renomear/remover tags, duplicidade por email e telefone, conversão concorrente e idempotente, rollback integral da transação, restore e bloqueio de purge referenciado.

A migração `0004_crm_core.sql` foi aplicada localmente. As seis tabelas comerciais usam `ENABLE` e `FORCE ROW LEVEL SECURITY`; acesso sem contexto não retorna dados. Testes SQL verificaram o isolamento e 12 rejeições de relações cruzadas por FKs compostas. O contexto `app.tenant_id` fica restrito à transação.

O seed comercial foi executado duas vezes: permaneceram 20 empresas clientes, 60 contatos e 30 leads fictícios na Nexa. Usa IDs determinísticos e não sobrescreve cadastros existentes.

## Revisão do design

A skill Impeccable orientou a direção Operate, a revisão de qualidade e a documentação. Foram inspecionadas capturas de desktop, mobile e tema escuro. A revisão de acabamento foi delegada a um agente independente com contexto novo, seguindo o roteiro de fallback da skill; o agente especializado nomeado pelo harness não estava disponível.

A revisão inicial apontou dois ajustes: fechar o drawer ao navegar para o perfil e confirmar mudanças que reduzam o próprio acesso. Ambos foram corrigidos, com capturas atualizadas e teste de regressão. A confirmação visual também levou ao ajuste de centralização do diálogo e da distribuição do cabeçalho de perfil no mobile.

Na verificação final, o revisor considerou os dois apontamentos resolvidos e atribuiu disposition `ship`, restrita a esses ajustes. Não observou regressão material nas duas capturas finais; o teste de navegador foi executado pelo agente principal.

As capturas locais ficam em `.impeccable/review/`, ignorado pelo Git. O design persistente está em `DESIGN.md` e `.impeccable/design.json`.

A mudança para Desmos recebeu uma revisão limitada de marca e identificação da empresa em desktop, mobile e tema escuro. Uma descrição antiga no perfil foi corrigida. A captura final do login não apresentou erros de console ou de execução; um aviso anterior era causado pela ferramenta de captura ao inserir estilo para ocultar o cursor antes da hidratação. Não foi necessário ocultar erros na aplicação. O mobile verificado não apresentou overflow horizontal.

Na Fase 2, as sete capturas de CRM foram feitas em Chrome, com desktop de 1440px e viewport móvel de 390px, incluindo tema escuro. Axe não encontrou violações nos estados capturados; não houve overflow da página nem erros de console/execução. O teste em viewport emulado não substitui validação em dispositivo físico. As tabelas têm rolagem horizontal interna prevista pelo design.

O detector Impeccable não encontrou antipadrões nos novos TSX ou na folha global. A folha global gerou 55 avisos consultivos de valores fora da escala documentada, majoritariamente preexistentes; os tamanhos de 10px nos metadados comerciais seguem a densidade atual. A comparação do Documenter está em [revisão de design do CRM](crm-design-review.md); `DESIGN.md` e seu sidecar foram preservados. Não houve reformulação do sistema visual. O rótulo “Sua empresa” acima do nome da organização foi removido conforme pedido; o nome e o ícone foram preservados.

A revisão independente da Fase 2 retornou `ship` para o acabamento visível nas sete capturas válidas, sem correções materiais. Foi usado o roteiro alternativo `finish-reviewer.md` por ausência do agente especializado no harness. A primeira captura da lista mobile tinha repetição de regiões produzida na montagem de página inteira; foi substituída por uma captura de viewport 390×844 e a revisão completa foi refeita. O DOM tinha um único título e 20 linhas de dados; a paginação continuou acessível ao rolar. A aprovação visual não certifica estados que não foram exibidos.

## Limites desta entrega

O CRM usa sessão, membership, filtros explícitos, FKs compostas e RLS forçada. As tabelas de identidade e acesso continuam protegidas pelo escopo do servidor e pelos testes de integração, sem RLS nessa camada. O Compose entregue é local; publicação para clientes depende da configuração operacional descrita no README. O envio SMTP é de pelo menos uma entrega e pode duplicar mensagens após falha entre envio e confirmação.

Dashboard comercial, Radar, relatórios, metas/forecast, calendário, importação, propostas, automações e billing seguem o roadmap. Seus testes e critérios de aceite serão implementados junto aos respectivos módulos. Menções de notas ainda não geram notificações. A lixeira tem restauração e exclusão definitiva manual; não há retenção automática configurável. A conversão da Fase 3 pode criar uma oportunidade na mesma transação do contato/empresa. Atividades de email/WhatsApp registram interações e não enviam mensagens. A lixeira de vendas restaura registros, sem purga definitiva ou retenção automática.

## Vendas — Fase 3

A migração `0005_sales.sql` foi aplicada no ambiente local. Suas nove tabelas usam RLS habilitada/forçada; o schema Drizzle inclui os vínculos compostos, inclusive a referência circular de conversão entre lead e oportunidade. Os 11 testes de Vendas exercitam isolamento de listas, contagens, detalhe, escrita, pipelines/etapas, board, responsáveis, referências e notas; seis papéis; permissão atualizada dentro da transação, inclusive lixeira com contexto obsoleto; versão concorrente; movimentação com atividade obrigatória; ganho/perda/reabertura; dinheiro de grande magnitude com diferença de um centavo; totais por moeda; agenda/checklist; follow-up único; conversão concorrente e rollback; alterações de tags; FKs compostas e bloqueio de purga CRM referenciada.

O seed foi executado duas vezes: um pipeline de Vendas, 20 oportunidades, 12 atividades e 12 tarefas fictícias na Nexa, sem duplicação nem sobrescrita. A Horizonte permanece independente.

Três novos fluxos de navegador cobrem criação de pipeline e oportunidade, drag-and-drop persistido, ganho/perda/reabertura, tarefa com checklist, conclusão, atividade com follow-up, notas/histórico; conversão de lead com contato/empresa/oportunidade pelo diálogo; movimentação por select, conflito 409 sem sobrescrita, tema escuro e mobile.

A inspeção visual foi limitada a duas rodadas em nove estados: board claro/escuro/mobile, detalhe desktop/mobile, pipeline desktop, formulário de tarefa desktop/mobile e lista de tarefas. A segunda rodada não teve erros de execução/console, overflow da página ou violações Axe WCAG 2 A/AA/2.1 AA nesses estados. As capturas móveis são de viewport 390×844, sem alegação de dispositivo físico ou cobertura de conteúdo fora do recorte.

O detector Impeccable foi executado uma vez nos arquivos alterados: zero findings não consultivos, 55 avisos consultivos preexistentes na folha global e nenhum aviso na seção nova de Vendas. Não foi usado para certificar funcionalidades ou segurança. Capturas e relatório: `.impeccable/review/sales-*.png`, `sales-runtime.json` e `sales-detect.json`.

A validação final confirmou `npm run typecheck`, 55 testes de API, 10 testes de navegador e `npm run build`. A proteção de tráfego também recebeu regressão: 429 com Retry-After, cotas separadas para usuários com JWT verificado atrás do mesmo proxy, cota compartilhada entre sessões do usuário e limite por IP para tokens inválidos/anônimos. Nenhuma dependência nova foi adicionada.

A revisão visual independente Impeccable, com contexto novo e instruções do papel fornecidas ao subagente, retornou **disposition: ship** no escopo das nove capturas válidas. Não apontou correções materiais. A revisão amostrou board, detalhe, tarefas e CSS; não certificou estados não capturados nem substituiu os testes funcionais. A comparação documental do sistema está em [revisão de design de Vendas](sales-design-review.md).

## Identidade, navegação e demonstração de automações

Tema claro passa a ser o padrão inclusive quando o sistema operacional está em modo escuro; escolha explícita e salva de escuro continua respeitada. A marca usa símbolo próprio de laço em azul/dourado fosco, com PNG transparente e prompt de origem embutido. A lateral prioriza quatro destinos comerciais e agrupa Clientes e Configurações; nome da empresa, marca, perfil e sair continuam visíveis, com rolagem própria para o trabalho e para os filhos de Configurações.

`npm run typecheck` passou na nova UI e `npm run build` passou após a demonstração final. A suíte completa com 12 cenários E2E passou após a primeira versão da navegação. Depois do ajuste de rolagem do rodapé, os dois cenários de navegação passaram novamente: claro com SO escuro, escuro salvo, grupos abertos em acesso direto/reload, perfil/logout no viewport de 1280×650 e Escape/foco/fechamento do menu mobile.

Um 13º cenário foi acrescentado e passou após os últimos ajustes da demonstração de automações. Exercita edição do exemplo, troca de canal, variáveis na prévia, simulação, persistência no navegador após reload, configurações independentes entre dois pipelines e requisitos separados. O teste verifica que essas ações não geram POST/PATCH/PUT para envio ou gravação no servidor. Não testa um motor de automações real, que não foi implementado nesta entrega.

A inspeção foi limitada a duas rodadas por superfície. Navegação: oito capturas finais de login, desktop, Clientes, Configurações, tela baixa, escuro e dois estados mobile. Demonstração: oito capturas finais de email, WhatsApp/simulação, regras por etapa, navegação atual e quatro recortes móveis. Nos dois relatórios finais, nenhum overflow de página, nenhuma violação Axe WCAG 2 A/AA/2.1 AA e nenhum pageerror. São viewports emulados, sem alegação de dispositivo físico ou certificação global.

O detector da navegação foi executado uma vez antes dos ajustes finais: 50 advisory, zero primary. O detector do arquivo de automações foi executado uma vez: zero findings. A documentação do sistema foi atualizada pelo Impeccable Documenter em [revisão de design](navigation-design-review.md), DESIGN.md e seu sidecar, com tokens e marca atuais. O [contrato da demonstração](automation-demo-contract.md) documenta o que ainda depende de implementação real.

A revisão independente não apontou correções visuais materiais na navegação. Seu verdict final [ship](navigation-finish-review.md) pontuou como resolvidos os dois itens documentais (identidade e evidência do seed), sem recertificar toda a superfície. A revisão visual completa adicional da [demonstração de automações](automation-finish-review.md) retornou ship nas oito capturas finais, sem achados materiais e sem certificar envios reais. O Documenter confirmou que o módulo demo herda o sistema atualizado, sem novos tokens.
