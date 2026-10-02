"use client";
import { MotionCollection } from "@/components/ui/motion";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, MessageSquare, Sparkles } from "lucide-react";
import { Button, Field, Select } from "@/components/ui/primitives";
import type { User } from "@/lib/types";
import type { Pipeline } from "./types";
import { readRule, type Rule } from "./automation-model";
import { attachTemplate, type MessageTemplate } from "./message-model";
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export function interpretRequest(text: string, pipelines: Pipeline[]) {
  const input = normalize(text);
  if (
    !/quando/.test(input) ||
    !/etapa/.test(input) ||
    !/(email|whatsapp)/.test(input)
  )
    return null;
  const match = input.match(
    /(?:pipeline|funil)(?:\s+de|\s+da|\s+do)?\s+(.+?)\s+quando/,
  );
  const requested = match?.[1]?.trim();
  const choices = requested
    ? pipelines.filter(
        (p) =>
          normalize(p.name) === requested ||
          normalize(p.name).includes(requested),
      )
    : pipelines;
  const stageMatch = input.match(
    /etapa(?:\s+da|\s+de|\s+do)?\s+(.+?)(?:\s+me\s+|\s+enviar\s+|\s+mandar\s+|$)/,
  );
  const stageName = stageMatch?.[1]?.trim() ?? "";
  return {
    pipelineIds: choices.map((p) => p.id),
    stageName,
    channel: /whatsapp/.test(input)
      ? ("WHATSAPP" as const)
      : ("EMAIL" as const),
    self: /\bme\b|para mim|pra mim/.test(input),
    supported:
      !/(excluir|apagar|recorrente|todo dia|google|outlook|calendario|sms)/.test(
        input,
      ),
  };
}
export function AutomationAssistant({
  pipelines,
  templates,
  user,
  onDraft,
  context = "Automações",
  canDraft = true,
}: {
  pipelines: Pipeline[];
  templates: MessageTemplate[];
  user: User;
  context?: string;
  canDraft?: boolean;
  onDraft: (rule: Rule, pipelineId: string) => void;
}) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<
    { id: string; author: "user" | "assistant"; content: string }[]
  >([]);
  const [reviewId, setReviewId] = useState("");
  const transcript = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  function addMessage(author: "user" | "assistant", content: string) {
    const message = { id: crypto.randomUUID(), author, content };
    setMessages((m) => [...m, message].slice(-12));
    return message.id;
  }
  const [intent, setIntent] =
    useState<ReturnType<typeof interpretRequest>>(null);
  const [pid, setPid] = useState("");
  const [sid, setSid] = useState("");
  const [tid, setTid] = useState("");
  const [recipient, setRecipient] = useState("");
  const pipeline = pipelines.find((p) => p.id === pid);
  const candidates = templates.filter((t) => t.channel === intent?.channel);
  const ready =
    !!intent?.supported &&
    !!pipeline &&
    pipeline.stages.some((s) => s.id === sid) &&
    (!tid || candidates.some((t) => t.id === tid)) &&
    !!recipient;
  useEffect(() => {
    const root = transcript.current;
    const last = root?.querySelector<HTMLElement>(
      ".assistant-message:last-child",
    );
    if (root && last)
      root.scrollTop +=
        last.getBoundingClientRect().top -
        root.getBoundingClientRect().top -
        16;
  }, [messages]);
  function suggest(value: string) {
    setText(value);
    composer.current?.focus({ preventScroll: true });
  }
  function submit() {
    if (!text.trim()) return;
    setText("");
    if (intent?.supported && reviewId)
      setMessages((old) =>
        old.map((message) =>
          message.id === reviewId
            ? {
                ...message,
                content:
                  "Esta interpretação foi substituída pelo novo pedido. Nenhuma ação foi executada.",
              }
            : message,
        ),
      );
    const parsed = canDraft ? interpretRequest(text, pipelines) : null;
    addMessage("user", text);
    setIntent(parsed);
    setPid("");
    setSid("");
    setTid("");
    setRecipient("");
    if (!parsed && /ajuda|como|onde|o que|posso/i.test(text)) {
      const topic = normalize(text);
      const help =
        /funil|pipeline|etapas/.test(topic) || context === "Funis e etapas"
          ? "Em Negócios, use Gerenciar funis para abrir o catálogo, ou Editar etapas para o funil selecionado. Reordene pelas setas ou pela alça e salve para aplicar. Cancelar permite revisar alterações antes de descartá-las."
          : /atividade|proximos contatos/.test(topic) ||
              context === "Atividades"
            ? "Atividades registra ligações, reuniões e outros contatos com clientes. Encontre a lista pela navegação Planejamento comercial, junto de Agenda e Tarefas. Concluir uma atividade pode criar seu follow-up, conforme a configuração existente."
            : /biblioteca|modelo|automac/.test(topic) ||
                context === "Automações"
              ? "Automações têm gatilho, condições opcionais e ação. Receitas iniciam regras; a Biblioteca de mensagens guarda conteúdo reutilizável. Escolha a mensagem na ação, confira a prévia e salve o rascunho. Regras e envios deste editor são demonstrações locais; o acompanhamento real aparece identificado separadamente."
              : context === "Agenda"
                ? "Na Agenda, escolha Semana ou Lista, filtre responsável e tipo, e abra uma tarefa para concluir ou reagendar. O fuso exibido é o da empresa. A navegação ao lado do título leva às listas de Tarefas e Atividades."
                : context === "Clientes"
                  ? "Em Clientes, busque leads, contatos ou empresas. Abra um registro para consultar o histórico, registrar uma nota ou revisar dados. Tags e Lixeira ficam nesse mesmo grupo da navegação, conforme seus acessos."
                  : context === "Tarefas"
                    ? "Em Tarefas, filtre responsável e situação. Abra uma tarefa para revisar prazo, concluir ou vincular ao negócio. Agenda mostra o planejamento por período; Atividades registra as interações com clientes."
                    : context === "Negócios"
                      ? "Em Negócios, escolha Kanban ou Lista. Abra um negócio para revisar etapa, cliente e próxima ação. Gerenciar funis abre os processos comerciais; Editar etapas modifica o funil selecionado, conforme seu acesso."
                      : context === "Configurações"
                        ? "Configurações reúne Empresa, Equipe e acessos e Auditoria, conforme suas permissões. Perfil e sessões cuidam da sua conta. Funis ficam em Negócios; Atividades junto da Agenda; Automações tem acesso próprio na navegação."
                        : "Use Negócios para acompanhar o funil, Clientes para o relacionamento e Agenda/Tarefas para próximos passos. Automações prepara regras demonstrativas. Configurações reúne a administração da empresa e da conta.";
      addMessage("assistant", help);
      setText("");
      return;
    }
    if (!parsed || !parsed.supported) {
      addMessage(
        "assistant",
        canDraft
          ? "Consigo explicar as áreas do CRM e preparar email ou WhatsApp quando um negócio entrar em uma etapa. Não executo comandos, não envio mensagens nem crio eventos de calendário."
          : "Posso ajudar a entender a tela. Sua conta não tem permissão para preparar automações. Não executo comandos nem altero registros.",
      );
      return;
    }
    const resolved = pipelines.find((p) => p.id === parsed.pipelineIds[0]);
    if (parsed.pipelineIds.length === 1 && resolved) {
      setPid(resolved.id);
      const stages = resolved.stages.filter(
        (s) => normalize(s.name) === parsed.stageName,
      );
      if (stages.length === 1) setSid(stages[0].id ?? "");
    }
    const ts = templates.filter((t) => t.channel === parsed.channel);
    if (ts.length === 1) setTid(ts[0].id);
    if (parsed.self) setRecipient("USER");
    setReviewId(
      addMessage(
        "assistant",
        "Preparei a interpretação abaixo. Confira os dados e abra um rascunho no editor quando estiver pronto.",
      ),
    );
  }
  const examplePipeline = pipelines[0];
  const exampleStage =
    examplePipeline?.stages.find((stage) =>
      /reuniao/.test(normalize(stage.name)),
    ) ?? examplePipeline?.stages[0];
  const contextual =
    context === "Negócios" || context === "Funis e etapas"
      ? "Como editar as etapas do funil?"
      : context === "Agenda" ||
          context === "Tarefas" ||
          context === "Atividades"
        ? "Como organizar meus próximos contatos?"
        : context === "Clientes"
          ? "Onde encontro tags e lixeira?"
          : context === "Configurações"
            ? "Onde encontro funis e atividades?"
            : "Como usar a biblioteca de mensagens?";
  return (
    <section className="assistant-panel" aria-label="Chat demonstrativo">
      <div className="assistant-transcript" ref={transcript}>
        {!messages.length && (
          <div className="assistant-welcome">
            <span className="assistant-welcome-icon">
              <MessageSquare size={24} />
            </span>
            <h3>Como posso ajudar?</h3>
            <p>
              Posso explicar {context.toLocaleLowerCase()}
              {canDraft
                ? " e preparar um rascunho de automação para você revisar."
                : "."}
            </p>
            <p className="assistant-mode-note">
              Demonstração local, sem LLM externo. Nenhuma ação ou mensagem é
              executada pela conversa.
            </p>
          </div>
        )}
        <MotionCollection
          className="assistant-conversation"
          motionKey={messages.at(-1)?.id ?? ""}
          newOnly
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="Conversa do assistente"
        >
          {messages.map((m) => (
            <article
              key={m.id}
              className={`assistant-message assistant-message-${m.author}`}
              data-author={m.author}
            >
              <span className="assistant-message-author">
                {m.author === "user" ? (
                  "Você"
                ) : (
                  <>
                    <Sparkles size={13} />
                    Desmos
                  </>
                )}
              </span>
              <p>{m.content}</p>
              {intent?.supported && m.id === reviewId && (
                <div
                  className="assistant-resolution"
                  role="region"
                  aria-label="Revisão do rascunho de automação"
                >
                  <div className="assistant-draft-heading">
                    <Sparkles size={16} />
                    <h3>Rascunho de automação</h3>
                    <span>Sem efeitos reais</span>
                  </div>
                  <dl className="assistant-draft-summary">
                    <dt>Funil</dt>
                    <dd>{pipeline?.name || "Escolha o funil"}</dd>
                    <dt>Quando</dt>
                    <dd>
                      Entrar em{" "}
                      {pipeline?.stages.find((stage) => stage.id === sid)
                        ?.name || "etapa pendente"}
                    </dd>
                    <dt>Fazer</dt>
                    <dd>
                      {intent.channel === "EMAIL"
                        ? "Preparar email"
                        : "Preparar WhatsApp"}
                    </dd>
                    <dt>Para</dt>
                    <dd>
                      {recipient === "USER"
                        ? `${user.name} (${user.email})`
                        : recipient
                          ? "Contato vinculado ao negócio"
                          : "Escolha o destinatário"}
                    </dd>
                    <dt>Mensagem</dt>
                    <dd>
                      {candidates.find((template) => template.id === tid)
                        ?.name || "Escrever no editor"}
                    </dd>
                  </dl>
                  <details className="assistant-draft-details" open={!ready}>
                    <summary>Ajustar interpretação</summary>
                    <Field id="assistant-pipeline" label="Escolher funil">
                      <Select
                        id="assistant-pipeline"
                        value={pid}
                        onChange={(e) => {
                          setPid(e.target.value);
                          setSid("");
                        }}
                      >
                        <option value="">
                          {intent.pipelineIds.length !== 1
                            ? "Não encontrei um único funil. Escolha."
                            : "Escolher"}
                        </option>
                        {pipelines.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field id="assistant-stage" label="Escolher etapa">
                      <Select
                        id="assistant-stage"
                        value={sid}
                        onChange={(e) => setSid(e.target.value)}
                      >
                        <option value="">Escolha uma etapa existente</option>
                        {pipeline?.stages.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field
                      id="assistant-template"
                      label="Escolher modelo de mensagem"
                    >
                      <Select
                        id="assistant-template"
                        value={tid}
                        onChange={(e) => setTid(e.target.value)}
                      >
                        <option value="">Escrever somente nesta regra</option>
                        {candidates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <p className="field-hint">
                      O modelo é opcional. Você pode revisar e escrever a
                      mensagem no editor.
                    </p>
                    <Field
                      id="assistant-recipient"
                      label="Destinatário interpretado"
                    >
                      <Select
                        id="assistant-recipient"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                      >
                        <option value="">Escolher destinatário</option>
                        <option value="USER">
                          Eu: {user.name} · {user.email}
                        </option>
                        <option value="CONTACT">
                          Contato vinculado ao negócio
                        </option>
                      </Select>
                    </Field>
                  </details>
                  <p className="field-hint">
                    Somente rascunho. A etapa Reunião não cria um evento na
                    Agenda.
                  </p>
                  <Button
                    disabled={!ready}
                    onClick={() => {
                      const t = candidates.find((t) => t.id === tid);
                      const draft = readRule({
                        id: crypto.randomUUID(),
                        name: `${intent.channel === "EMAIL" ? "Email" : "WhatsApp"} ao entrar em ${pipeline!.stages.find((s) => s.id === sid)!.name}`,
                        stageId: sid,
                        channel: intent.channel,
                        enabled: false,
                        delay: "0",
                        minimum: "",
                        subject: "Aviso sobre {negociacao}",
                        message:
                          "Olá! O negócio {negociacao} chegou à etapa selecionada.",
                        recipient:
                          recipient === "USER"
                            ? {
                                kind: "USER",
                                id: user.id,
                                name: user.name,
                                email: user.email,
                              }
                            : { kind: "CONTACT" },
                      });
                      if (draft) {
                        onDraft(t ? attachTemplate(draft, t) : draft, pid);
                        setIntent(null);
                        addMessage(
                          "assistant",
                          "Rascunho aberto no editor. Revise antes de salvar; nenhuma ação foi executada.",
                        );
                      }
                    }}
                  >
                    Gerar rascunho para revisão
                  </Button>
                </div>
              )}
            </article>
          ))}
        </MotionCollection>
      </div>
      <div className="assistant-composer-area">
        <div
          className="assistant-suggestions"
          aria-label="Sugestões para esta tela"
        >
          <button
            type="button"
            onClick={() => suggest(`Como usar ${context.toLocaleLowerCase()}?`)}
          >
            Como usar esta tela?
          </button>
          <button type="button" onClick={() => suggest(contextual)}>
            {contextual}
          </button>
          {canDraft && examplePipeline && exampleStage && (
            <button
              type="button"
              onClick={() =>
                suggest(
                  `no funil ${examplePipeline.name} quando chegar na etapa ${exampleStage.name} me enviar um email`,
                )
              }
            >
              Preparar aviso por email
            </button>
          )}
        </div>
        <form
          className="assistant-composer"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="sr-only" htmlFor="assistant-request">
            Pergunte ou descreva uma automação
          </label>
          <textarea
            id="assistant-request"
            ref={composer}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Pergunte ou descreva uma automação…"
            rows={2}
            maxLength={500}
            required
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                if (text.trim()) event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button
            type="submit"
            disabled={!text.trim()}
            aria-label="Enviar pedido"
            title="Enviar pedido"
          >
            <ArrowUp size={18} />
          </Button>
        </form>
        <div className="assistant-composer-meta">
          <span>Conversa em memória · Enter envia</span>
          {!!messages.length && (
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setIntent(null);
                setReviewId("");
                setText("");
                composer.current?.focus();
              }}
            >
              Limpar conversa
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
