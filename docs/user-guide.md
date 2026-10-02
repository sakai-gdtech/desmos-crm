# Como usar o Desmos CRM — guia para começar

Este guia descreve a versão **local do Mac**, conferida em 2 de outubro de 2026, incluindo os recursos do PDF e os novos selects. Ela ainda contém alterações que não foram publicadas no GitHub. O CRM local abre em `http://localhost:3017` enquanto os serviços estiverem funcionando.

Você pode ler uma seção, testar somente aquela tela e depois continuar. Os exemplos são fictícios. Este guia não executou nenhuma prática, não alterou cadastros e não enviou mensagens.

## 1. O que significa cada coisa

CRM é um lugar para reunir **com quem você conversa, o que está negociando e qual é o próximo passo**. Ele ajuda a equipe a continuar um atendimento sem depender da memória de uma pessoa.

| Palavra | Significado simples | Exemplo fictício |
| --- | --- | --- |
| Lead | Um possível cliente em fase de primeiro contato ou qualificação. | Marina demonstrou interesse em um serviço. |
| Contato | A pessoa com quem sua equipe se relaciona. | Marina, responsável pelas compras da Aurora. |
| Empresa cliente | A organização dessa pessoa. Pode estar prospectando ou já ter comprado. | Aurora Treino. |
| Clientes, no menu | O grupo que reúne leads, contatos e empresas clientes. | Você procura Marina nesse grupo. |
| Negócio, negociação ou oportunidade | Uma possível venda específica, com valor, responsável e andamento. São nomes usados para o mesmo registro comercial. | Implantação para Aurora, de R$ 1.000. |
| Funil ou pipeline | A sequência de passos do seu processo de vendas. | Entrada → Proposta → Fechamento. |
| Etapa | Uma posição dentro do funil. | O negócio está em Proposta. |
| Tarefa | Algo que alguém precisa fazer, com um prazo. | Telefonar para Marina amanhã. |
| Atividade | Uma interação planejada ou registrada com o cliente. | Reunião de apresentação; ligação realizada. |
| Proposta | Os itens, quantidades, preços e desconto de uma negociação. | Um serviço de implantação por R$ 1.000. |
| Responsável | A pessoa da sua equipe que acompanha aquele registro. | Você cuida do negócio da Aurora. |
| Origem | Como aquele contato ou negócio chegou até sua equipe. | Indicação, evento ou site. |
| Tag | Uma etiqueta para organizar e filtrar registros. | Treino, Indicação ou Prioritário. |
| Follow-up | Retomar o contato depois de uma conversa. | Perguntar amanhã se Marina leu a proposta. |

Uma empresa pode ter vários contatos. O mesmo cliente pode ter várias negociações independentes. **Converter um lead em contato organiza o relacionamento; uma venda fica ganha quando você confirma o ganho do negócio.**

## 2. Como se orientar e entender seu acesso

No computador, a navegação principal fica à esquerda: **Visão geral, Negócios, Clientes, Agenda, Tarefas e Automações**, conforme seu papel. Clique em **Clientes** para abrir os submenus. **Configurações** fica na parte inferior. No celular, use o botão de abrir navegação no topo.

No topo também ficam o **sino de Avisos internos**, o **Assistente**, a troca entre tema claro/escuro e o acesso ao perfil. O nome da sua empresa identifica o ambiente em que você está trabalhando. **Empresas clientes** são as organizações atendidas; **Configurações → Empresa** é a sua própria organização.

As listas de escolha agora têm o visual do Desmos. Clique para abrir e escolher uma opção. Pelo teclado, use setas e Enter; Escape fecha sem confirmar. Digitar letras encontra opções pelo começo do nome, inclusive sem acentos.

| Papel | O que você pode esperar nesta versão |
| --- | --- |
| Proprietário ou Administrador | Recursos comerciais e administrativos: empresa, equipe, auditoria, criação de campos e captura de leads. |
| Gestor | Fluxo comercial, funis, automações e catálogo; pode excluir/restaurar registros. Não administra empresa/equipe/auditoria nem exclusão definitiva de clientes. |
| Vendedor | Cadastros e trabalho comercial, propostas, tarefas, atividades e tags. Não administra funis, automações, catálogo, empresa ou equipe e não exclui registros. |
| Suporte | Consulta comercial, edição de contatos/empresas clientes e criação/edição de tarefas e atividades. Não cria leads/negócios nem administra os recursos acima. |
| Visualizador | Consulta, perfil pessoal e sessões; sem edição dos registros comerciais. |

Se um botão não aparece, seu papel pode não permitir aquela ação. Um filtro de **Responsável** ajuda a organizar a consulta; ele não transforma os registros em uma carteira privada exclusiva do vendedor.

## 3. Visão geral e Radar Comercial

**Para que serve:** escolher o que merece atenção primeiro. **Como chegar:** clique em **Visão geral**, endereço `/workspace`.

1. Escolha o **Funil**. Confira também **Responsável**, **Origem**, **Criados a partir de** e **Criados até**.
2. Leia **Valor em aberto**, **Negócios ganhos**, **Tarefas atrasadas** e **Sem próxima ação**.
3. Em **Resultados dos negócios**, observe conversão, ganhos/perdidos, ticket médio ganho e ciclo até o ganho. **Motivos de perda** mostra as razões registradas pela equipe.
4. Em **Radar Comercial**, clique no nome de um negócio. Ele abre um painel de detalhe sem tirar você do contexto.
5. Em **Próxima ação**, use **Criar tarefa**, preencha o que fazer e um prazo futuro, escolha o responsável e use **Salvar tarefa**.
6. Feche o painel pelo botão de fechar ou Escape. Para consultar a operação completa, use **Ver negócios** ou **Ver tarefas**.

**Resultado:** uma próxima ação fica registrada e pode ser acompanhada na Agenda/Tarefas. Uma ação futura pendente pode resolver **Sem próxima ação**. O alerta de negócio parado depende do tempo na etapa e pode continuar aparecendo.

**Limites:** os filtros de datas selecionam negócios pela **data de criação**, usando seu estado atual. Conversão é ganhos divididos por ganhos + perdidos; sem fechamentos aparece **Sem fechamentos**. Ticket é o valor médio das vendas ganhas; ciclo é o tempo da criação até o ganho. Moedas são apresentadas separadamente. O Radar mostra até 20 negócios e 10 tarefas, embora as contagens possam ser maiores. Quem não possui acesso a negócios recebe uma visão de configuração em vez desse painel.

## 4. Clientes: listas e cadastros

### Leads — `/crm/leads`

**Quando usar:** alguém demonstrou interesse e você ainda está entendendo sua necessidade.

1. Abra **Clientes → Leads**. Use a busca por nome, email ou telefone.
2. Clique em **Novo lead**.
3. Preencha **Nome** e, se disponíveis, email, telefone, cargo e empresa. **Nome da empresa (ainda sem cadastro)** guarda o nome para uma conversão posterior.
4. Em **Qualificação**, escolha **Status** e **Temperatura**. Novo/Contatado/Qualificado descrevem seu acompanhamento; Frio/Morno/Quente representam sua avaliação do interesse.
5. Em **Organização**, defina **Responsável**, **Origem**, tags e descrição conforme necessário.
6. Clique em **Salvar cadastro**. Para sair sem salvar, use **Cancelar**.

**Resultado/continuação:** o detalhe do lead abre. Você pode editar, registrar notas ou converter depois. **Filtros** permite buscar por status, temperatura, responsável, tag, origem e empresa; **Limpar filtros** amplia a consulta. **Ordenar registros** muda a ordem.

**Limites/acesso:** exige permissão de criar lead. Temperatura e qualificação são preenchidas por você. Um aviso de possível duplicado ajuda a conferir email/telefone; não mescla cadastros automaticamente.

### Contatos — `/crm/contacts`

**Quando usar:** você já sabe quem é a pessoa com quem vai manter o relacionamento.

1. Abra **Clientes → Contatos → Novo contato**.
2. Preencha nome/sobrenome, email, telefone, WhatsApp e cargo quando fizer sentido.
3. Em **Empresa cliente vinculada**, procure e selecione uma empresa já cadastrada.
4. Complete responsável/origem/tags e **Salvar cadastro**.

**Resultado/continuação:** a pessoa ganha uma ficha com histórico. Abra seu nome na lista para consultar ou **Editar** para ajustar; **Cancelar** sai da edição. Contatos podem existir sem empresa vinculada.

**Limites/acesso:** criar e editar dependem do papel. Cadastrar um número de WhatsApp não inicia uma conversa nem envia uma mensagem.

### Empresas clientes — `/crm/companies`

**Quando usar:** você atende uma organização e quer reunir as pessoas e negociações ligadas a ela.

1. Abra **Clientes → Empresas clientes → Nova empresa cliente**.
2. Informe **Nome da empresa cliente**. Acrescente razão social, identificação fiscal, email, telefone, site e segmento, se conhecidos.
3. Defina responsável, origem e tags; use **Salvar cadastro**.
4. Depois, vincule os contatos e negócios a essa empresa nos respectivos formulários.

**Resultado/continuação:** o detalhe reúne seus dados e relações, inclusive a aba **Contatos**. Abra nomes vinculados para continuar o atendimento. **Editar** altera o cadastro; **Cancelar** sai sem salvar.

**Limite:** esse cadastro pertence ao CRM da sua empresa. Ele não cria outra conta ou outro ambiente do Desmos.

### Ficha, histórico, notas e comunicação

**Como chegar:** clique no nome de qualquer lead, contato ou empresa cliente na lista.

1. Confira dados e responsável. **Editar** abre o formulário; **Salvar cadastro** termina a criação e **Salvar alterações** termina a edição.
2. Em **Histórico**, leia alterações, conversões, tarefas/atividades e propostas vinculadas, com autor e data quando registrados.
3. Em **Notas**, escreva em **Nova nota** e clique em **Adicionar nota**. Pode usar **Fixar nota** e **Mencionar equipe**; as menções ficam registradas e não enviam avisos.
4. Use **Oportunidades**, **Atividades** ou **Tarefas** para consultar registros relacionados. Em empresa cliente, há também **Contatos**.
5. Links de email e WhatsApp aparecem quando há dados válidos. Eles abrem o aplicativo externo. Para guardar o que aconteceu, crie uma atividade ou nota manualmente.

**Resultado/continuação:** a ficha oferece contexto para o próximo atendimento. Volte pela ligação à lista ou escolha **Clientes** novamente. **Excluir**, quando permitido, pede confirmação e envia à lixeira.

**Limite:** histórico não lê sua caixa de email ou suas conversas de WhatsApp. Notas, tarefas e atividades são formas diferentes de registrar o trabalho.

### Converter lead em contato

**Quando usar:** você decidiu organizar aquele primeiro contato como uma pessoa acompanhada no CRM. **Como chegar:** detalhe do lead → **Converter lead**.

1. Em **Destino do contato**, escolha criar um novo contato ou vincular um contato existente.
2. Em **Empresa cliente**, escolha manter/continuar sem empresa, criar a empresa indicada ou vincular uma existente, conforme as opções mostradas.
3. Se também quiser iniciar uma negociação, marque **Criar oportunidade no funil**.
4. Preencha **Título da oportunidade**, **Pipeline**, **Etapa** e **Valor da oportunidade** quando essa opção estiver marcada.
5. Confira os vínculos e clique em **Confirmar conversão**. **Cancelar** fecha sem converter.

**Resultado/continuação:** o lead passa a **Convertido** e mantém o histórico. Use os links para abrir o contato/empresa e, quando criada, a oportunidade. Dados de um contato existente são preservados.

**Limites:** conversão exige acesso adequado. A oportunidade é opcional. Campos personalizados de lead só acompanham a conversão quando configurados para compartilhar; valores já preenchidos no contato são preservados.

## 5. Campos, planilhas e entrada de leads

### Preencher campos personalizados

**Para que serve:** guardar informações específicas do seu negócio. **Como chegar:** detalhe de lead/contato/empresa/negócio → **Campos personalizados**.

1. Clique em **Editar campos**.
2. Preencha as informações disponíveis; um campo pode ser texto, número, data, Sim/Não ou uma escolha.
3. Clique em **Salvar campos**, ou **Cancelar** para sair sem aplicar.

**Resultado/continuação:** os valores ficam no registro e podem ser consultados ao reabrir. Campos arquivados com valores já existentes continuam identificados como arquivados.

**Acesso:** depende da permissão de editar aquele tipo de registro. Se nenhum campo estiver configurado, um administrador precisa criar a definição primeiro.

### Criar e administrar campos — Proprietário/Administrador

**Como chegar:** na ficha, use **Gerenciar campos de leads/contatos/empresas clientes/negócios**. Endereço `/crm/fields?kind=leads`, `contacts`, `companies` ou `deals`.

1. Confira o **Tipo de registro** e clique em **Novo campo**.
2. Preencha **Nome** e **Tipo**. Para Escolha, use **Opções, uma por linha**.
3. Em lead, marque **Compartilhar este campo com contatos após conversão** se quiser levar esse dado para o contato.
4. Clique em **Criar campo**.
5. Use **Arquivar** ou **Reativar** para controlar a disponibilidade; depois use **Voltar a…**.

**Resultado/limite:** o campo fica disponível nas fichas daquele tipo. O tipo e as opções não são editados livremente depois: para mudar a estrutura, arquive e crie outro campo. Há limite de 50 definições por tipo.

### Importar CSV — `/crm/import?kind=leads`

**Quando usar:** trazer vários cadastros de uma planilha. Também atende contatos e empresas clientes, escolhendo o tipo correspondente.

1. Na lista de Clientes, clique em **Importar CSV**.
2. Confira **Tipo de cadastro**. **Baixar planilha de exemplo** mostra o formato esperado.
3. Escolha um arquivo em **Planilha CSV**: até 300 KB/500 linhas, UTF-8, colunas `nome,email,telefone,origem`; nome é obrigatório. Vírgula ou ponto e vírgula são aceitos.
4. Em **Possíveis duplicados por email ou telefone**, prefira **Ignorar duplicados**. **Criar mesmo assim, sem mesclar** cria outros registros.
5. Clique em **Validar e ver prévia**. Leia linhas inválidas e duplicados; a prévia mostra até 20 linhas, mas valida o arquivo inteiro.
6. Com os erros corrigidos, clique em **Importar N cadastros**.
7. Leia o resumo e use **Ver cadastros** ou **Voltar a…**.

**Resultado:** novos cadastros são criados e atribuídos a você; os existentes não são alterados. A prévia sozinha não cria registros. Linha inválida bloqueia a confirmação.

**Limites/acesso:** exige criação do tipo escolhido. Aceita CSV, não XLSX; não importa negócios nem campos personalizados.

### Exportar CSV

**Como chegar:** lista de Leads, Contatos ou Empresas clientes.

1. Defina busca e filtros para escolher os registros.
2. Clique em **Exportar CSV**.
3. Abra o arquivo baixado e confira seu conteúdo; permaneça na lista para continuar.

**Resultado/limites:** exporta registros ativos que correspondem aos filtros, até 5.000, incluindo outras páginas. O arquivo contém nome, email, telefone e origem. Não é um backup completo: não inclui negócios, histórico ou campos personalizados. Alguns textos recebem um prefixo de proteção para não serem tratados como fórmula pela planilha.

### Entrada de leads — Proprietário/Administrador

**Para que serve:** criar um formulário que recebe novos leads por um link. **Como chegar:** Clientes → Leads → **Entrada de leads**, endereço `/crm/intake`.

1. Clique em **Novo formulário**.
2. Preencha **Nome do formulário** e **Origem dos leads**.
3. Em **Distribuir entre responsáveis ativos**, escolha quem receberá os leads. Uma pessoa fixa o responsável; várias pessoas recebem alternadamente.
4. Clique em **Criar formulário**.
5. Guarde **Link do formulário** imediatamente: ele aparece uma única vez. **Abrir formulário de captura** abre a página pública.
6. Na lista, **Pausar** interrompe novas entradas e **Ativar** permite recebê-las de novo. **Voltar aos leads** retorna à lista.

**Resultado/limites:** entradas válidas criam leads com origem e responsável. O link precisa ser guardado por você. Esta versão tem formulário simples, sem integração externa ou captcha; não equivale a uma campanha completa.

### Formulário público de captura

**Como chegar:** pelo link criado acima, no formato `/capture/empresa/token` — não digite esses códigos manualmente.

1. A pessoa preenche **Nome**, **Email** e **Telefone**; nome/email são exigidos.
2. Usa **Enviar cadastro**.
3. Vê **Cadastro recebido**. A equipe confere o novo registro em Clientes → Leads.

**Limites:** permite enviar dados, não consultar o CRM. Duplicados não criam outra entrada; formulário pausado ou sem responsável elegível não recebe normalmente. Nesta prática, use somente dados fictícios e não divulgue o link a pessoas reais.

## 6. Tags e lixeira de clientes

### Tags — `/crm/tags`

**Quando usar:** classificar registros por grupos que ajudam sua consulta. **Como chegar:** Clientes → **Tags**.

1. Clique em **Nova tag**, preencha **Nome da tag**, escolha a cor e use **Criar tag**.
2. Nos formulários dos registros, marque a tag desejada e salve o cadastro.
3. Na lista de Clientes, use **Filtros → Tag**.
4. Para ajustar, use **Editar → Salvar tag**. **Cancelar** sai do formulário.

**Resultado/limites:** a classificação é compartilhada. **Excluir → Excluir tag** remove a etiqueta dos cadastros, mantendo os próprios registros. Proprietário/Admin/Gestor/Vendedor podem gerenciar tags nesta configuração de papéis.

### Lixeira de clientes — `/crm/trash`

**Para que serve:** recuperar leads, contatos e empresas clientes excluídos.

**Como chegar nesta versão local:** abra `http://localhost:3017/crm/trash`. O atalho de Lixeira do menu Clientes está oculto por um ajuste de navegação pendente; a tela existe e respeita as permissões.

1. Escolha **Tipo de registro** e use **Buscar na lixeira**.
2. Clique em **Restaurar** no registro desejado.
3. Retorne à respectiva lista de Clientes para encontrá-lo.

**Resultado/acesso:** Proprietário/Admin/Gestor podem restaurar os tipos autorizados. **Excluir definitivamente** é administrativo, pede confirmação e apaga cadastro, notas e histórico; referências comerciais podem impedir a exclusão. Não pratique essa ação para aprender. A lixeira de Negócios/Tarefas/Atividades fica nas próprias listas dessas áreas.

## 7. Negócios, funis e propostas

### Kanban — `/sales/board`

**Para que serve:** enxergar o andamento das negociações em colunas. **Como chegar:** **Negócios**.

1. Escolha **Funil**, responsável e **Status**: **Abertas**, **Ganhas** ou **Perdidas**. Há busca, origem e período de criação.
2. Leia as colunas: cada uma corresponde a uma etapa do funil.
3. Clique no título de um negócio para abrir o painel de detalhe.
4. Para avançar uma negociação aberta, arraste o cartão ou use **Mover → Mover para etapa** e escolha o destino.
5. Use **Lista** para mudar a apresentação, mantendo o contexto do funil.

**Resultado/continuação:** a etapa do negócio é atualizada e fica no histórico. Fechar o painel devolve você ao Kanban. Use **Novo negócio** para iniciar outra negociação.

**Limites:** mover exige permissão de edição; negócio fechado precisa ser reaberto. Uma etapa configurada para exigir próxima atividade pede tarefa ou atividade futura pendente antes de mover. **Gerenciar funis** e **Editar etapas** são de Proprietário/Admin/Gestor.

### Lista de negócios — `/sales/deals`

**Quando usar:** pesquisar e comparar negociações em linhas. **Como chegar:** Negócios → **Lista**.

1. Busque por título e filtre pipeline/status, responsável, origem e criação.
2. Abra o nome para consultar o negócio; use **Novo negócio** para criar.
3. Quem pode excluir vê **Lixeira**; nela, **Restaurar** recupera o registro e **Voltar à lista** retorna.
4. Use **Kanban** para continuar pelas colunas.

**Limites:** essa lixeira não tem exclusão definitiva nesta entrega. A exportação CSV oferecida em Clientes não se aplica a esta lista.

### Criar ou editar negócio

**Como chegar:** **Novo negócio**, endereço `/sales/deals/new`; **Editar** na ficha abre o formulário daquele registro.

1. Preencha **Nome do negócio**, **Valor**, **Pipeline** e **Etapa**.
2. Em **Relacionamento**, escolha **Empresa cliente vinculada**, **Contato vinculado** e **Responsável**.
3. Em **Mais detalhes**, ajuste moeda, probabilidade, previsão de fechamento e temperatura se necessário. Em **Outros dados do relacionamento**, defina origem, tags e descrição.
4. Clique em **Salvar negócio**; **Cancelar** volta sem aplicar a edição.

**Resultado/limites:** uma negociação independente fica no funil. O mesmo cliente pode ter outras. Nos campos monetários use, por exemplo, `1000.00`; a exibição apresenta a moeda formatada. Probabilidade é uma estimativa, não garantia de venda.

### Detalhe do negócio, próxima tarefa e fechamento

**Como chegar:** título no Kanban, Lista ou Radar. O endereço individual é `/sales/deals/ID`; o sistema abre o ID correto ao clicar.

1. Confira cliente, etapa, valor e responsável.
2. Em **Próxima ação**, use **Criar tarefa**, informe **O que precisa ser feito?**, **Prazo** e responsável; clique em **Salvar tarefa**.
3. Consulte histórico/notas e as tarefas/atividades relacionadas. **Editar** ajusta os dados do negócio.
4. Quando a venda estiver concluída, use **Marcar como ganho**, confira o valor e **Confirmar ganho**.
5. Quando não fechar, use **Marcar como perdido**, preencha **Motivo da perda** e **Confirmar perda**.
6. Se retomar a negociação, use **Reabrir negócio**.

**Resultado/continuação:** tarefa, ganho ou perda ficam registrados e alimentam as consultas. Feche o painel para voltar ao lugar de origem ou use **Negócios** na ficha completa.

**Limites:** ganho/perda exigem permissão de edição; perda exige motivo. **Excluir → Mover para a lixeira** tira das listas ativas sem purga definitiva.

### Funis e etapas — Proprietário/Administrador/Gestor

**Como chegar:** Negócios → **Gerenciar funis**, endereço `/sales/pipelines`.

1. Confira nome, situação e sequência de etapas dos funis existentes.
2. Use **Novo funil**; preencha **Nome do funil** e descrição. Confira **Funil ativo** para definir sua disponibilidade.
3. Nas etapas, informe nome e cor. Escolha **Posição da nova etapa → Adicionar etapa** para inserir outra.
4. Reordene com a alça de arrastar ou com os botões de mover para cima/baixo.
5. Em **Detalhes avançados**, configure **Probabilidade (%)**, **Dias sem avanço** e, se necessário, **Exigir próxima atividade ao mover para esta etapa**.
6. Clique em **Salvar funil**. **Cancelar** oferece continuar editando ou descartar quando houver alterações.

**Resultado/continuação:** a estrutura é persistida. **Editar etapas** no Kanban abre o funil selecionado; salvar/cancelar mantém esse contexto. **Automações** ou **Automações e regras** levam à configuração correspondente.

**Limites:** nomes/ordem podem mudar preservando os vínculos dos negócios; remover uma etapa ou excluir um funil pode ser bloqueado por registros/regras ligados a ele. Não altere funis de trabalho real como exercício.

### Proposta comercial

**Como chegar:** negócio → **Ver proposta** para a versão compacta; **Abrir proposta e catálogo** para a página `/sales/deals/ID/proposal`.

1. Clique em **Adicionar item** e informe **Descrição**, **Quantidade** e **Preço unitário (moeda)**; ou escolha em **Adicionar do catálogo**.
2. Confira o subtotal. Informe **Desconto (moeda)** se houver.
3. Confira **Valor final** e use **Salvar proposta**.
4. Se estiver editando uma proposta já salva, **Descartar alterações** recupera a versão salva. **Voltar ao negócio** retorna à ficha.

**Resultado:** a proposta e os preços ficam preservados; salvar **atualiza o valor do negócio** e registra um evento no histórico do negócio/clientes vinculados.

**Limites/acesso:** edição exige negócio aberto e acesso para editar. Quantidade é inteira; desconto não pode exceder o subtotal. Não gera PDF, envia proposta, colhe assinatura ou registra aceite externo nesta versão.

### Catálogo de produtos — Proprietário/Administrador/Gestor

**Como chegar:** página completa da proposta → expandir **Catálogo de produtos**. Não há uma página separada `/sales/products` na interface.

1. Em **Novo produto**, informe nome e **Preço (moeda)**.
2. Use **Criar produto**.
3. Para um produto existente, ajuste os campos e **Atualizar preço**.
4. Depois escolha o produto em **Adicionar do catálogo** na proposta e salve a proposta.

**Resultado/limites:** produtos ficam disponíveis para reutilizar na moeda compatível. Alterar o catálogo vale para novos itens; não troca o preço preservado em propostas salvas. O catálogo aparece somente na página completa, não no painel compacto.

## 8. Agenda, Tarefas e Atividades

### Agenda — `/sales/agenda`

**Para que serve:** ver tarefas e interações no calendário da equipe. **Como chegar:** **Agenda**.

1. Escolha **Semana** ou **Lista**; use **Hoje**, semana anterior/próxima semana.
2. Em **Período**, veja **Esta semana**, **Atrasadas** ou **Sem data**. Em responsável, **Minhas** limita a você; **Toda a equipe** amplia. Filtre tipo e funil quando necessário.
3. Clique em um compromisso. Use **Concluir**, **Reagendar ou editar**, **Abrir negócio**, **Criar próxima ação** ou **Abrir registro completo**, conforme disponível.
4. Para iniciar outro registro, use **Criar tarefa** ou **Nova atividade**. **Carregar mais registros** mostra o restante quando houver.

**Resultado/continuação:** são os mesmos registros de Tarefas/Atividades, vistos no calendário. Feche a janela ou use as abas **Agenda / Tarefas / Atividades**.

**Limites:** Agenda exibe o fuso da empresa. Alguns formulários informam o fuso deste dispositivo; confira a indicação ao digitar horas. Não sincroniza Google Calendar/Outlook. Se parecer vazia, confira responsável, semana e filtros.

### Tarefas — `/sales/tasks`

**Quando usar:** você precisa lembrar quem fará algo e até quando. **Como chegar:** **Tarefas**, ou aba Tarefas na Agenda.

1. Use **Todas**, **Hoje**, **Próximas**, **Atrasadas** ou **Concluídas**. Busque por título e filtre responsável.
2. Clique em **Criar tarefa**; preencha título, prazo e responsável. **Mais detalhes** mostra prioridade/status/descrição/checklist no formulário compacto.
3. Vincule o negócio quando disponível; o formulário completo permite outras relações.
4. Use **Salvar tarefa**. Abra o título para conferir ou **Editar** para ajustar prazo/dados.
5. Ao terminar, use **Concluir tarefa** na ficha ou **Concluir** na lista/Agenda.

**Resultado/continuação:** a tarefa aparece nas consultas e, com prazo, na Agenda. Checklist organiza partes do trabalho; marque a conclusão da tarefa quando terminar. **Cancelar** sai da edição e **Tarefas**/voltar retorna à lista.

**Limites:** sem prazo fica em Sem data e não representa uma ação futura para resolver aquele alerta do Radar. Excluir/restaurar, quando permitido, usa a própria **Lixeira** da lista.

### Atividades — `/sales/activities`

**Quando usar:** registrar ou agendar ligação, reunião, visita, email, WhatsApp, nota ou outra interação. **Como chegar:** Agenda/Tarefas → aba **Atividades**.

1. Clique em **Nova atividade**.
2. Preencha **Título**, **Tipo de atividade**, **Data e hora**, responsável e status.
3. Registre descrição, duração e **Resultado da interação** quando fizer sentido. Vincule contato, empresa, negócio ou lead para manter o contexto.
4. Clique em **Salvar atividade**. Depois use **Editar** ou **Concluir atividade** na ficha.
5. Ao editar uma atividade como Concluída, pode preencher **Próximo contato (follow-up)** com data futura; salvar cria uma tarefa de follow-up, uma vez por atividade.

**Resultado/continuação:** a interação fica na Agenda/histórico dos vínculos. Para ajustar um follow-up já criado, abra e edite a tarefa correspondente. Volte pela lista ou abas de planejamento.

**Limites:** escolher Email/WhatsApp registra uma interação; não envia comunicação. Reunião não cria convite em calendário externo. Criação/edição e lixeira dependem do papel.

## 9. Automações: entenda as áreas separadas

**Acesso:** Proprietário/Administrador/Gestor. **Como chegar:** **Automações**, endereço `/sales/automations`; escolha **Pipeline**.

| Área | Para que serve | Efeito nesta versão |
| --- | --- | --- |
| Biblioteca de mensagens | Guardar texto reutilizável de email/WhatsApp. | Conteúdo local, sem envio. |
| Criar automação / receita | Preparar um exemplo de regra Quando → Se → Fazer. | Rascunho e teste locais, sem alterar registros. |
| Tarefas e avisos automáticos | Automatizar trabalho interno. | Cria tarefa e aviso reais no CRM. |
| Regras por etapa · demonstração | Exibir requisitos de exemplo por etapa. | Local; não bloqueia o Kanban. |
| Acompanhamento de proposta | Regra especial do funil fictício, quando esse funil existe. | Tarefa real de acompanhamento, restrita à demo. |

### Biblioteca de mensagens

1. Em Automações, use **Biblioteca de mensagens → Criar modelo**.
2. Preencha **Nome do modelo**, **Canal do modelo**, assunto para Email e **Corpo do modelo**.
3. Use variáveis como `{contato}`, `{empresa}`, `{negociacao}` e `{responsavel}` pelos botões de inserção.
4. Confira **Prévia com exemplo fictício** e clique em **Salvar modelo**.
5. Busque pelo nome/canal; **Editar modelo…** e **Duplicar…** ajudam a reutilizar. **Cancelar modelo** permite revisar o descarte; **Voltar às automações** volta ao diretório.

**Resultado/limites:** modelo guarda conteúdo, não uma regra. Cada edição salva uma revisão; automações já salvas mantêm sua cópia anterior. Modelos ficam neste navegador, não são um catálogo compartilhado no servidor.

### Rascunho de automação e teste demonstrativo

1. Clique em **Criar automação**. Outra entrada é **Começar com uma receita de automação → Receita de automação → Usar receita**.
2. Em **Gatilho e condições**, dê um nome, escolha **O que acontece** e etapa, quando necessária. **Adicionar condições** abre filtros opcionais.
3. Use **Continuar**. Em **Ação e mensagem**, escolha tarefa, atribuição, movimentação ou mensagem demonstrativa.
4. Para comunicação, escolha **Modelo de mensagem** ou personalize nessa regra. Confira destinatário, assunto e corpo. **Eu** identifica o criador autenticado, não o cliente.
5. Se houver nova revisão, **Atualizar versão do modelo** aplica essa escolha explicitamente; **Personalizar só nesta regra** libera a cópia.
6. Use **Continuar** para **Revisar e testar**, escolha **Dados da prévia** e use **Simular envio** ou **Testar com prévia**.
7. Leia o resultado e **Salvar rascunho**. **Voltar ao passo anterior** ajusta; **Cancelar alterações** permite confirmar o descarte.

**Resultado/limites:** salva e testa um exemplo local. Nenhum email/WhatsApp é enviado; a tarefa/atribuição/movimentação desses rascunhos também não é aplicada. O diretório reabre os rascunhos salvos no mesmo navegador. O prazo mostrado é uma simulação.

### Tarefas e avisos automáticos — regras reais

**Como chegar:** Automações → **Tarefas e avisos automáticos**, `/sales/automations/internal?pipelineId=…`.

1. Escolha **Funil → Criar regra interna**.
2. Preencha **Nome da regra** e **Quando**: **Entrada na etapa**, **Negócio sem atualização** ou **Compromisso atrasado**.
3. Escolha etapa quando aplicável, dias e **Título da tarefa**.
4. Use **Revisar regra**. Confira o resumo e marque **Ativar para próximos eventos** somente se quiser que a regra execute.
5. Clique em **Salvar regra**. Na lista, abra a regra para editar ou desmarcar a ativação e salvar.
6. Acompanhe **Execuções recentes**; abra o título da tarefa ou **Abrir negócio**.

**Resultado:** cada negócio elegível pode receber uma tarefa e um aviso interno. A atribuição usa o responsável elegível do negócio ou quem salvou a regra quando necessário.

**Limites:** uma execução por regra/negócio, mesmo após reentrada/reativação. Salvar regra de etapa não executa retroativamente para negócios já naquela etapa. Inatividade considera a última atualização do negócio. A verificação ocorre a cada minuto enquanto a API está ativa; **Verificar atrasos e inatividade agora** executa essa verificação imediatamente e pode criar tarefas/avisos reais. Não é uma prévia. Pausar não apaga tarefas anteriores. Sem email ou WhatsApp automático.

**Voltar/cancelar:** **Voltar** retorna ao primeiro passo; **Cancelar** permite continuar editando ou descartar. Alterações não salvas ficam na mesma sessão ao navegar; recarregar encerra essa edição. **Voltar às automações** retorna ao diretório principal.

### Regras por etapa demonstrativas e acompanhamento da demo

Em **Ajustes do funil → Regras por etapa**, selecione os campos de exemplo e **Salvar regras da etapa**. Eles permanecem demonstrativos e não exigem preenchimento no Kanban. O requisito real de próxima atividade fica no editor de funis/etapas.

Se aparecer **Acompanhamento de proposta — Funciona nesta demo**, abra-o, escolha **Etapa do acompanhamento real** e **Salvar etapa da regra**. Use **Ativar acompanhamento** ou **Pausar acompanhamento** separadamente. **Testar regra real com prévia** apenas explica o efeito; a execução ocorre na próxima entrada do negócio na etapa configurada, criando tarefa para o dia seguinte, uma vez por negócio naquele funil fictício. **Cancelar etapa** abandona a troca ainda não salva; **Abrir funil de demonstração** permite consultar o funil. Essa opção não aparece em todos os funis e não envia comunicação.

## 10. Sino e Assistente global

### Avisos internos

**Como chegar:** clique no sino **Avisos internos** no topo de qualquer área autenticada.

1. Leia o motivo e a data do aviso.
2. Use **Abrir compromisso** ou **Abrir negócio** para agir; abrir também marca o aviso como lido.
3. **Marcar lido** apenas muda a leitura. Feche a janela para voltar.

**Resultado/limites:** avisos são privados do destinatário atual. Compromissos pendentes podem gerar lembrete nas 24 horas anteriores e aviso de atraso; regras reais geram seus avisos de tarefa. Concluir, reagendar ou reatribuir pode remover avisos obsoletos da lista ativa. Ler um aviso não conclui a tarefa. A verificação depende da API ativa e não produz notificação de email/WhatsApp ou menção em nota.

### Assistente

**Como chegar:** clique em **Assistente** no topo, em qualquer tela autenticada relevante.

1. Confira **Contexto: …** e **Demonstração local · sem envio**.
2. Use **Como usar esta tela?** ou escreva uma pergunta no campo.
3. Clique em **Enviar pedido** ou pressione Enter; Shift+Enter quebra a linha.
4. Quem administra automações pode usar **Preparar aviso por email**. Exemplo: “No funil Treino, quando chegar na etapa Proposta, me enviar um email”.
5. Revise a interpretação na conversa. Em **Ajustar interpretação**, confira funil, etapa, modelo opcional e destinatário. **Eu** é você, com seu nome/email autenticados.
6. **Gerar rascunho para revisão** abre o editor demonstrativo; revise antes de salvar.

**Resultado/continuação:** ajuda contextual e preparação de rascunho. Feche pelo botão de fechar; a conversa permanece ao navegar/reabrir na mesma sessão. **Limpar conversa** apaga esse histórico em memória.

**Limites:** usa interpretação local controlada, não uma IA externa que consulta todos os dados. Não executa pedidos arbitrários, altera cadastros, atribui tarefas, envia mensagens ou agenda reuniões por conversa. Recarregar termina a conversa. Vendedor/Suporte/Visualizador recebem ajuda, sem preparação administrativa de rascunhos.

## 11. Configurações e conta

### Sua empresa — Proprietário/Administrador

**Como chegar:** **Configurações → Empresa**, `/settings/company`.

1. Ajuste nome e dados da sua própria organização.
2. Confira **Fuso horário**, **Moeda** e **Localidade**.
3. Use **Salvar alterações**.
4. **Editar contexto** abre a configuração inicial `/onboarding`.

**Resultado/continuação:** preferências da organização são atualizadas; use Visão geral para voltar à operação. A localidade registrada não traduz toda a interface: ela está em português. Não use esta tela para cadastrar empresas clientes.

### Configuração inicial — Proprietário/Administrador

**Como chegar:** primeiro acesso ou Empresa → **Editar contexto**, `/onboarding`.

1. Escolha **Em qual segmento vocês atuam?**.
2. Informe **Pessoas na empresa** e **Pessoas no time de vendas**.
3. Escolha **Como funciona a venda de vocês?** e preencha **Qual é o principal objetivo com o CRM?**.
4. Use **Concluir configuração**; **Fazer isso depois** volta à Visão geral.

**Resultado/limite:** define o contexto da sua empresa. O número do time de vendas não pode superar o total da empresa. Outros papéis recebem orientação de configuração gerenciada pela empresa.

### Equipe e acessos — Proprietário/Administrador

**Como chegar:** **Configurações → Equipe e acessos**, `/settings/team`.

1. Para convidar alguém, preencha **Email da pessoa**, escolha **Papel de acesso** e use **Enviar convite**.
2. Consulte **Pessoas da empresa** e **Convites** para ver a situação.
3. No membro existente, mudar **Papel de…** altera suas permissões. **Suspender** interrompe o acesso; **Reativar** permite voltar.
4. Ao alterar seu próprio acesso, a tela pede confirmação. **Manter meu acesso** cancela; **Confirmar alteração** aplica.

**Resultado/limites:** administra quem pode trabalhar no ambiente. Suspender uma pessoa não exclui os cadastros comerciais. Proprietário tem controle adicional sobre o papel de Proprietário. Convite não cria uma nova empresa; a pessoa precisa aceitar o link. O email depende da fila/serviço de entrega configurado; na demo local não prometa entrega em caixa externa. Para aprender, leia esta tela sem convidar ou suspender pessoas reais.

### Auditoria — Proprietário/Administrador

**Como chegar:** **Configurações → Auditoria**, `/settings/audit`; título **Registro de atividades**.

1. Leia ação, pessoa e data do **Histórico administrativo**.
2. Use **Filtrar eventos** para procurar uma ação ou pessoa.
3. Volte pela navegação principal.

**Resultado/limites:** consulta de quem fez alterações, somente leitura, até os 200 eventos mais recentes. Não é a lista comercial de Atividades e não serve para editar/desfazer eventos.

### Meu perfil — todos os papéis

**Como chegar:** **Configurações → Meu perfil**, suas iniciais no topo ou seu nome na lateral; `/settings/profile`.

1. Atualize **Nome completo** e **Telefone**.
2. Clique em **Salvar perfil**.
3. Se necessário, **Enviar confirmação** solicita o link para verificar o endereço de email.

**Resultado/limites:** atualiza sua identificação pessoal. **Email de acesso** é somente leitura nesta tela. Confirmação depende do link recebido e do serviço de email configurado. Volte pela navegação principal.

### Dispositivos e sessões — todos os papéis

**Como chegar:** **Configurações → Dispositivos e sessões**, `/settings/sessions`.

1. Veja onde a conta está conectada e use **Atualizar sessões** para consultar novamente.
2. **Encerrar sessão** desconecta outro acesso; **Sair deste dispositivo** encerra o atual.
3. Para sair normalmente, também há **Sair da conta** na lateral.

**Resultado/limite:** encerra acesso, preservando os registros. Sair do dispositivo atual devolve ao login. Não pratique encerrando sessões que você deseja manter.

## 12. Entrar, recuperar acesso e aceitar convite

Essas telas dão acesso à conta; quem já está dentro do CRM pode continuar nas áreas acima.

- **Login — `/login`:** informe Email e Senha → **Entrar na minha conta**. Abre a configuração inicial ou área de trabalho conforme a conta. **Esqueci minha senha** abre a recuperação.
- **Cadastro — `/register`:** **Criar minha conta**, preencher Seu nome/Nome da empresa/Email de trabalho/Crie uma senha → **Criar conta e empresa**. Cria um novo ambiente e seu Proprietário. Para participar de uma empresa existente, use o convite dela.
- **Recuperação — `/forgot-password`:** Email da sua conta → **Enviar instruções**. Pelo link recebido, `/reset-password?token=…`, preencha Nova senha e Confirme a nova senha → **Salvar nova senha**. **Solicitar um novo link** trata link inválido/expirado. Não digite o token manualmente.
- **Verificação — link `/verify-email?token=…`:** **Confirmar meu email** → **Ir para minha área de trabalho**. **Voltar para o login** permite retornar.
- **Convite — link `/accept-invitation?token=…`:** siga a tela, preencha nome/senha quando solicitados e **Aceitar convite**. O link define a empresa e o papel do acesso. Convite inválido/expirado precisa ser renovado por quem administra a equipe.

**Limite comum:** solicitações de recuperação/convite/verificação não garantem entrega externa no ambiente local. Não precisa executar esses fluxos para praticar vendas estando autenticado.

## 13. Uma prática fictícia para fazer sozinho

Objetivo: compreender **lead → contato/empresa → negócio → tarefa → proposta → ganho**, sem mexer em cadastros reais. Estes são passos para você executar quando quiser; nada foi criado por este guia.

1. **Prepare um funil de treino.** Se houver um funil fictício apropriado, use-o. Se não houver, Proprietário/Admin/Gestor pode criar **Treino CRM** com **Entrada**, **Proposta** e **Fechamento** e salvar. Quem não administra funis pede essa preparação ao responsável.
2. **Cadastre o lead.** Clientes → Leads → Novo lead: Nome **Marina Treino**; email `marina.treino@example.test`; Nome da empresa (ainda sem cadastro) **Aurora Treino**; Origem **Treino do guia**; Responsável você. Salvar cadastro.
3. **Registre contexto.** Na ficha → Notas: “Pediu uma apresentação do serviço de implantação” → Adicionar nota. Reabra Histórico para localizar os registros.
4. **Converta.** Converter lead → novo contato → criar Aurora Treino, quando oferecido → marcar Criar oportunidade no funil. Título **Implantação Aurora Treino**, funil Treino CRM, etapa Entrada, valor `1000.00` → Confirmar conversão.
5. **Localize a negociação.** Negócios → escolha Treino CRM → abra Implantação Aurora Treino. Confira contato, empresa e responsável.
6. **Crie a próxima ação.** Próxima ação → Criar tarefa: “Apresentar proposta para Marina”; prazo amanhã às 10h, conferindo o fuso indicado; responsável você → Salvar tarefa.
7. **Confira a Agenda.** Agenda → responsável Minhas → semana que contém amanhã. Abra a tarefa e depois volte ao negócio. Isso confirma que você planejou trabalho, sem ter realizado a conversa ainda.
8. **Monte a proposta.** Abrir proposta e catálogo → Adicionar item: descrição “Implantação”, quantidade 1, preço `1000.00`, desconto `0.00` → Salvar proposta → Voltar ao negócio. Confira o valor final e o histórico.
9. **Avance de etapa.** No Kanban, Mover → Proposta. A etapa representa seu acompanhamento; ela não envia a proposta para Marina.
10. **Registre uma conversa fictícia.** Agenda → Atividades → Nova atividade: reunião demonstrativa com Marina, vinculada ao negócio, com resultado “Aprovou a implantação”. Salvar atividade; use o status/conclusão apropriado para representar o exercício.
11. **Conclua a tarefa do exercício.** Tarefas → abra Apresentar proposta para Marina → Concluir tarefa.
12. **Registre o fechamento fictício.** Negócio → Marcar como ganho → conferir R$ 1.000 → Confirmar ganho.
13. **Veja o resultado.** Visão geral → Treino CRM → responsável você → período que inclua a criação. Deve haver um negócio ganho nesse filtro, além dos demais registros fictícios que já estiverem nele. Abra o histórico do contato para reconhecer as relações.

**Como saber que aprendeu:** consiga explicar quem é a pessoa, qual é a empresa, qual venda foi negociada, onde está a proposta e qual tarefa foi concluída. Se um registro não aparecer, confira filtros/funil/responsável antes de cadastrá-lo novamente.

**Extensão opcional para gestor:** em Tarefas e avisos automáticos, configure uma regra de Entrada na etapa → Proposta com o título “Acompanhar proposta do treino”, revise e ative. Depois crie **outro negócio fictício**, inicialmente em Entrada, e mova para Proposta. Veja a tarefa e o aviso. A regra não executa retroativamente no negócio que já estava em Proposta, nem volta a executar para o mesmo negócio.

## 14. O que você precisa fazer manualmente

- Criar/atualizar cadastros e registrar o andamento quando não houver um formulário/regra específica fazendo isso.
- Enviar uma comunicação no aplicativo externo, caso você realmente queira fazê-lo; abrir email/WhatsApp no CRM não envia nem registra a conversa.
- Registrar resultado de ligação, reunião, email ou WhatsApp como atividade/nota.
- Conferir proposta e marcar ganho/perda quando a situação mudar; preparar a proposta não fecha a venda.
- Separar rascunho demonstrativo de regra real. Salvar modelo ou pedir algo ao Assistente não ativa envio ou execução.

A versão local tem recursos reais de cadastro, proposta, tarefa, captura, métricas e avisos. Envio comercial integrado, sincronização de calendários, assinatura/aceite de proposta e IA externa ficam para outra etapa.

## 15. Se alguma coisa parecer estranha

- **Lista vazia:** limpe busca/filtros; confira funil, responsável, período, status e lixeira.
- **Botão salvar desabilitado:** complete os campos exigidos ou confira se a edição realmente mudou algo. Durante o salvamento, aguarde o resultado.
- **Erro ao mover:** confira se o negócio está aberto e se a etapa exige um compromisso futuro.
- **Aviso de versão/dados alterados:** recarregue e confira o registro antes de repetir a edição; outra alteração pode ter sido salva.
- **Voltar/cancelar com edição:** leia o diálogo; Continuar editando preserva o rascunho, Descartar abandona alterações ainda não salvas. A recuperação em memória de alguns editores dura a sessão; recarregar não substitui Salvar.
- **Sem permissão:** peça ao administrador para conferir seu papel. Não crie outra empresa para tentar acessar os mesmos dados.
- **Serviços indisponíveis:** no ambiente local, a aplicação e a API precisam estar funcionando. O botão Tentar novamente ajuda em falhas transitórias; ele não liga serviços desligados.

Este é um guia de funcionamento conferido no código atual. Ele não substitui o teste pendente com uma pessoa iniciante usando o CRM sem orientação.
