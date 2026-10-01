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
}: {
  pipelines: Pipeline[];
  templates: MessageTemplate[];
  user: User;
  onDraft: (rule: Rule, pipelineId: string) => void;
}) {
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
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
    candidates.some((t) => t.id === tid) &&
    !!recipient;
  function submit() {
    const parsed = interpretRequest(text, pipelines);
    setMessages((m) => [...m, text].slice(-8));
    setIntent(parsed);
    setPid("");
    setSid("");
    setTid("");
    setRecipient("");
    if (!parsed || !parsed.supported) {
      setMessages((m) => [
        ...m,
        "Consigo preparar email ou WhatsApp quando um negócio entrar em uma etapa. Não executo comandos, não envio mensagens nem crio eventos de calendário.",
      ]);
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
    setMessages((m) => [
      ...m,
      "Interpretei uma mudança de etapa e uma mensagem. Confirme funil, etapa, modelo e destinatário abaixo antes de gerar o rascunho.",
    ]);
  }
  return (
    <section className="assistant-panel">
      <h2>Assistente de demonstração</h2>
      <Badge tone="amber">Interpretação local · sem envio</Badge>
      <p>
        Descreva uma regra de entrada em etapa. Vou preparar um rascunho para
        você revisar.
      </p>
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
      <div
        className="assistant-conversation"
        role="log"
        aria-label="Conversa do assistente"
      >
        {messages.map((m, i) => (
          <p key={i}>{m}</p>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field id="assistant-request" label="Descreva sua automação">
          <Input
            id="assistant-request"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            required
          />
        </Field>
        <Button type="submit">Interpretar pedido</Button>
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
              <option value="">Escolher modelo</option>
              {candidates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          {!candidates.length && (
            <Alert>
              Crie um modelo deste canal na seção Modelos de mensagem, depois
              volte ao assistente.
            </Alert>
          )}
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
              const t = candidates.find((t) => t.id === tid)!;
              const draft = readRule(
                attachTemplate(
                  {
                    id: crypto.randomUUID(),
                    name: `${intent.channel === "EMAIL" ? "Email" : "WhatsApp"} ao entrar em ${pipeline!.stages.find((s) => s.id === sid)!.name}`,
                    stageId: sid,
                    channel: intent.channel,
                    enabled: false,
                    delay: "0",
                    minimum: "",
                    subject: "",
                    message: "",
                    recipient:
                      recipient === "USER"
                        ? {
                            kind: "USER",
                            id: user.id,
                            name: user.name,
                            email: user.email,
                          }
                        : { kind: "CONTACT" },
                  },
                  t,
                ),
              );
              if (draft) onDraft(draft, pid);
            }}
          >
            Gerar rascunho para revisão
          </Button>
        </div>
      )}
    </section>
  );
}
