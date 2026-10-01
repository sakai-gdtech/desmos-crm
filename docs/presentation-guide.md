# Apresentar o Desmos CRM

Entrega do plano A–D: fluxo enxuto, painel/Radar, proposta simples e tarefa de acompanhamento no ambiente de demonstração. É uma apresentação funcional com dados fictícios; envio comercial, assinatura/PDF e motor genérico de automações ficam fora deste roteiro.

## Preparar

Na pasta do projeto, execute `npm run db:migrate`, `npm run db:seed`, `npm run demo:prepare` e inicie `npm run dev` se o sistema ainda não estiver em execução. Acesse http://localhost:3017 e entre com **ana@nexa.com**, usando `DEMO_PASSWORD` do `.env` (o arquivo não entra no Git).

O painel seleciona o funil **Apresentação Desmos (dados fictícios)** automaticamente. Estado inicial: R$ 55.000,00 em aberto, zero ganhos, uma tarefa atrasada e dois negócios sem ação futura. Aurora Digital: R$ 25.000,00 na Reunião, sem tarefa. Atlas Logística: R$ 12.000,00, 12 dias na Qualificação e tarefa atrasada. Vértice Saúde: R$ 18.000,00 em Fechamento, com tarefa futura. Todos pertencem a Ana.

## Roteiro de cerca de dois minutos

1. **Visão geral:** mostre os quatro indicadores e o Radar. Abra **Implantação comercial · Aurora Digital** no Radar.
2. **Negócio:** confira cliente, responsável, etapa e valor. Clique **Criar tarefa**, escreva **Confirmar proposta com Marina** e salve mantendo o prazo sugerido. Feche o painel; Aurora sai do alerta de falta de próxima ação.
3. **Proposta:** abra Aurora novamente, clique **Ver proposta**. O negócio já preenche cliente e valor. Para demonstrar catálogo, altere o item principal para **Implantação comercial**, preço **20000.00**, quantidade 1; adicione **Treinamento da equipe**, preço R$ 5.000,00. Salve: total R$ 25.000,00, também no negócio. Desconto é um valor absoluto em reais, não percentual.
4. **Acompanhamento:** feche a proposta e mova a etapa para **Proposta** pelo seletor do negócio ou pelo botão **Mover** no cartão. Uma tarefa **Acompanhar proposta · …** aparece. Ela é real nesta demo, criada uma vez por negócio; nenhum email/WhatsApp é enviado. Reentrar na etapa não duplica a tarefa.
5. **Ganho:** clique **Marcar como ganho**, confira o valor final e **Confirmar ganho**. Feche o painel. Os indicadores mostram R$ 30.000,00 em aberto, um negócio ganho/R$ 25.000,00 e um negócio sem ação futura. Recarregue para comprovar persistência.
6. **Automações:** em Configurações → Automações, abra **Acompanhamento de proposta · Proposta** e confira a regra de acompanhamento e sua execução com link para a tarefa criada. Os outros exemplos de email/WhatsApp continuam identificados como simulados.

O Kanban abre o mesmo painel sem sair da tela; fechar ou Escape preserva filtros e rolagem. Links permitem abrir a página completa em outra aba. Tarefas atrasadas do painel abrem a tarefa correspondente para concluir ou reagendar.

## Restaurar e repetir

Execute `npm run demo:reset` e recarregue o painel antes do próximo ensaio. A restauração atua somente no funil fictício dedicado: reabre seus três negócios, repõe valores e etapas, remove suas propostas/execuções e exclui logicamente tarefas anteriores, restaurando as duas tarefas do roteiro. Não altera outros funis ou empresas; históricos e auditorias gerais são preservados. O comando é recusado em produção.

Dois ensaios completos foram automatizados com restauração entre eles. Para reproduzir: instale o componente de vídeo com `npx playwright install ffmpeg` e execute `node --env-file=.env scripts/presentation-rehearsal.mjs` com API e web ativos. O roteiro restaura a demo ao terminar com sucesso e salva a gravação em `docs/demo/desmos-apresentacao.webm`. Se interrompido, use `demo:reset` manualmente.

## Gravação de reserva

[Desmos — apresentação gravada](demo/desmos-apresentacao.webm), sem áudio. Mostra o roteiro, indicadores atualizados, recarga e execução da regra. Use um player compatível com WebM ou o navegador. A gravação não substitui a operação ao vivo.

## Limites conhecidos

Indicadores usam todo o período e separam moedas; filtro é por funil. “Sem próxima ação” exige tarefa/atividade pendente com data futura, então um compromisso atrasado não conta como próxima ação. “Parado” usa os dias definidos na etapa. O Radar lista no máximo 20 negócios e 10 tarefas; as contagens são completas. Alertas podem persistir por atraso na etapa mesmo após agendar contato; mover de etapa atualiza esse tempo.

Não há integração comercial, notificações automáticas, PDF, assinatura ou automações genéricas. Dados da empresa e permissões continuam validados no servidor. A demo não comprova atendimento integral do briefing original nem preparação de produção.
