"use client";
import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Field,
  Input,
  Select,
} from "@/components/ui/primitives";
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
    { author: "user" | "assistant"; content: string }[]
  >([]);
  function addMessage(author: "user" | "assistant", content: string) {
    setMessages((m) => [...m, { author, content }].slice(-12));
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
  function submit() {
    const parsed = canDraft ? interpretRequest(text, pipelines) : null;
    addMessage("user", text);
    setIntent(parsed);
    setPid("");
    setSid("");
    setTid("");
    setRecipient("");
    if (!parsed && /ajuda|como|onde|o que|posso/i.test(text)) {
      const help =
        context === "Agenda"
          ? "Na Agenda, escolha Semana ou Lista, filtre o responsável e abra uma tarefa para concluir ou reagendar. O fuso exibido é o da empresa."
          : context === "Clientes"
            ? "Em Clientes, busque leads, contatos ou empresas. Abra um registro para consultar o histórico, registrar uma nota ou revisar os dados."
            : context === "Tarefas"
              ? "Em Tarefas, filtre por responsável e situação. Abra uma tarefa para revisar o prazo, concluir ou vincular a um negócio."
              : context === "Negócios"
                ? "No funil, abra um negócio para revisar etapa, cliente e próxima ação. A próxima tarefa mantém o acompanhamento ligado ao negócio."
                : context === "Configurações"
                  ? "Em Configurações, os acessos disponíveis dependem da sua função. Funis e etapas organizam o processo; a biblioteca guarda conteúdo de mensagens."
                  : context === "Visão geral"
                    ? "Use a navegação para abrir Negócios, Clientes, Agenda e Tarefas conforme seus acessos. Em Configurações ficam as opções da empresa e da sua conta."
                    : "Automações têm um gatilho, condições opcionais e uma ação. A biblioteca guarda mensagens reutilizáveis; receitas iniciam regras. Os rascunhos e envios do editor são demonstrações locais.";
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
    addMessage(
      "assistant",
      "Interpretei uma mudança de etapa e uma mensagem. Confirme funil, etapa, conteúdo e destinatário abaixo antes de gerar o rascunho.",
    );
  }
  return (
    <section className="assistant-panel">
      <Badge tone="amber">Interpretação local · sem envio</Badge>
      <p>
        Peça ajuda sobre {context.toLocaleLowerCase()}
        {canDraft
          ? " ou descreva uma automação para preparar um rascunho revisável."
          : "."}
      </p>
      <div className="assistant-suggestions">
        <Button
          variant="secondary"
          onClick={() => setText(`Como usar ${context.toLocaleLowerCase()}?`)}
        >
          Como usar esta tela?
        </Button>
        {canDraft && (
          <Button
            variant="ghost"
            onClick={() =>
              setText(
                "na pipeline de vendas quando chegar na etapa da reunião me enviar um email",
              )
            }
          >
            Usar exemplo de reunião
          </Button>
        )}
      </div>
      <div
        className="assistant-conversation"
        role="log"
        aria-label="Conversa do assistente"
      >
        {messages.map((m, i) => (
          <p key={i} data-author={m.author}>
            <span className="sr-only">
              {m.author === "user" ? "Você: " : "Assistente: "}
            </span>
            {m.content}
          </p>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field
          id="assistant-request"
          label="Pergunte ou descreva uma automação"
        >
          <Input
            id="assistant-request"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            required
          />
        </Field>
        <Button type="submit">Enviar pedido</Button>
      </form>
      {intent?.supported && (
        <div className="assistant-resolution">
          <h3>Revisar interpretação</h3>
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
          <Field id="assistant-template" label="Escolher modelo de mensagem">
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
            O modelo é opcional. Você pode revisar e escrever a mensagem no
            editor.
          </p>
          <Field id="assistant-recipient" label="Destinatário interpretado">
            <Select
              id="assistant-recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            >
              <option value="">Escolher destinatário</option>
              <option value="USER">
                Eu: {user.name} · {user.email}
              </option>
              <option value="CONTACT">Contato vinculado ao negócio</option>
            </Select>
          </Field>
          <p className="info-note">
            {pipeline?.name || "Funil pendente"} →{" "}
            {pipeline?.stages.find((s) => s.id === sid)?.name ||
              "Etapa pendente"}{" "}
            →{" "}
            {intent.channel === "EMAIL"
              ? "Preparar email"
              : "Preparar WhatsApp"}
            {recipient === "USER"
              ? ` para ${user.name} (${user.email})`
              : recipient
                ? " para o contato"
                : ": destinatário pendente"}
            . Apenas simulação; a etapa Reunião não agenda uma reunião.
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
    </section>
  );
}
