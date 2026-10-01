# Validação — automações, modelos e Agenda

Extensão autorizada em 01/10/2026 sobre `7979cec86cfaf64e1ce028eef3abbe40947402e0`. [Especificação anterior à implementação](specs/automation-workspace-agenda.md) e [guia de uso](automation-workspace-guide.md). Sem migração de arquitetura, dependência pesada, motor genérico ou envio comercial externo.

## Verificações funcionais

- API: 61 testes aprovados, incluindo isolamento por empresa, permissões, paginação de 105 tarefas (100 + 5), filtros de funil/tipo, fronteiras from inclusivo/to exclusivo, sem data, janela inválida e duração armazenada de reunião.
- Navegador: 20 testes aprovados novamente após os últimos ajustes. Jornada desktop/mobile: inserir terceira etapa preservando IDs, criar modelo, interpretar pedido, resolver referências existentes, gerar/revisar/simular/salvar/reabrir, preservar snapshot após edição do modelo e atualizar explicitamente.
- Destinatário “eu”: outra identidade é simulada pela resposta `/api/me` no teste de navegador; o destinatário armazenado continua o criador. Isso comprova o comportamento do snapshot no cliente, sem alegar compartilhamento multiusuário de modelos locais ou uma segunda sessão real.
- Modelo ausente bloqueia salvar/testar até reparo. Cancelamento com confirmação preserva conteúdo salvo. Duplo teste não duplica histórico e a prévia não faz mutações HTTP comerciais.
- Agenda: reagendar usa o mesmo formulário/registro; concluir persiste status. Teste desktop acessa 102 tarefas carregando a segunda página. Datas puras preservam o dia; instantes têm conversão consistente, incluindo virada de ano, fronteira do dia e horário inexistente em mudança de fuso.
- Tipagem e builds da API e web aprovados. Web utiliza `next build --webpack`; o caminho Turbopack não foi validado neste ambiente.

## Inspeção visual limitada

Impeccable Operate e craft-floor orientaram a extensão do sistema existente. Duas rodadas próprias, com os mesmos 20 estados: lista/modelos/assistente/editor/mensagem/regra real/funis/Agenda/painel em desktop e mobile, preview mobile e lista escura desktop. Capturas abertas individualmente. Viewports Chrome emulados de 1440×900 e 390×844; não equivalem a dispositivos físicos nem cobrem conteúdo fora do recorte.

Na confirmação, Axe WCAG 2 A/AA, 2.1 AA e 2.2 AA não encontrou violações nos 20 estados capturados; sem overflow horizontal da página ou erros de execução registrados. A primeira rodada apontou alvo pequeno em disclosure; corrigido na confirmação. Axe não substitui revisão manual completa de acessibilidade.

Evidências locais ignoradas pelo Git: `.impeccable/review/workspace-*.png`, `workspace-runtime.json`. Um detector Impeccable foi executado e retornou `[]` em `workspace-detect.json`; a saída não discrimina os alvos, portanto não constitui certificação integral de todos os arquivos. Revisão independente documentada separadamente.

## Responsividade medida

Cinco amostras por ação em Chrome local, desktop, rotas de desenvolvimento aquecidas, sem limitação de CPU/rede. Medição: tempo da ação Playwright mais dois callbacks requestAnimationFrame. Base extraída do commit anterior em ambiente temporário, mesma máquina. O editor anterior já estava renderizado; o novo editor é carregado sob demanda. Valores não são INP de campo, percentil de usuários ou comparação de carregamento inicial em produção.

| Ação | Mediana anterior | Mediana atual |
| --- | ---: | ---: |
| Abrir editor | 67 ms | 61 ms |
| Digitar | 32 ms | 32 ms |
| Reordenar etapa | 53 ms | 82 ms |

A reordenação ficou mais lenta neste ensaio; não se afirma melhora geral. As cinco amostras atuais variaram até 87 ms. Separação de componentes, carregamento sob demanda, cache por período/filtro/fuso e consultas de vínculo sem N+1 são mudanças estruturais; desempenho sob carga continua não medido. Dados brutos em `workspace-perf.json`.

## Limites de entrega

Agenda e personalização de funis persistem na API e mantêm RLS/permissões. Apenas o acompanhamento restrito ao fixture cria tarefa automaticamente. Modelos, assistente e rascunhos são locais por empresa/navegador; não executam email/WhatsApp, integração, LLM, calendário externo ou automação genérica. Não há alegação de paridade integral com RD Station nem preparação de produção.

## Confirmação final

- Os 20 testes de navegador passaram novamente após os ajustes finais (Chrome, 1 minuto).
- Dois ensaios completos passaram com restauração entre eles e no finally. Valores conferidos: proposta/ganho R$ 25.000,00, aberto R$ 30.000,00; uma tarefa automática por negócio; Agenda conclui essa mesma tarefa e o negócio mostra Concluída. O segundo ensaio também cria modelo, gera/simula/salva rascunho, aguarda a confirmação explícita antes de recarregar e o reabre. O ajuste de espera corrige uma corrida do roteiro, sem mudança de persistência da aplicação.
- A gravação `docs/demo/desmos-apresentacao.webm` foi atualizada: 1440×900, 20,12 segundos, metadados e decodificação/reprodução conferidos em Chrome; sem áudio. O fixture foi restaurado.
- [Revisão independente](automation-workspace-review.md): disposition **ship**, limitada aos 20 recortes e ao código amostrado; cinco seções de contrato entregues, nenhuma correção material solicitada. Checks finais são um gate separado desta revisão.
- A tipagem final passou em ambos os workspaces; o frontend compilou novamente com Webpack após os últimos ajustes. Build da API já havia passado e não houve alteração posterior no backend. [Documenter independente](automation-workspace-design-review.md) comparou a extensão com o sistema existente e preservou DESIGN.md/sidecar. Divergências históricas de composição/narrativa foram registradas sem reparo ou canonização. O hash local/remoto e checks GitHub serão conferidos após o commit/push e reportados na mensagem final; nenhum deploy integra esta entrega.
