"use client";

import Link from "next/link";
import { DemoFollowup } from "./demo-followup";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Clock3,
  GitBranch,
  Mail,
  MessageSquare,
  Play,
  Plus,
  Workflow,
  ListTodo,
  UserRound,
  ArrowRightLeft,
} from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingPage,
  PageHeading,
  Select,
  cn,
} from "@/components/ui/primitives";
import { PermissionNotice } from "@/features/settings/company";
import { usePipelines } from "./shared";
import type { Pipeline } from "./types";
import { useCrmReferences } from "@/features/crm/shared";
import {
  actions,
  triggers,
  readRule,
  ruleProblem,
  exampleResult,
  type Rule,
} from "./automation-model";

type Requirement = "value" | "contact" | "closeDate" | "nextActivity";
const requirementLabels: Record<Requirement, string> = {
  value: "Valor da negociação",
  contact: "Contato vinculado",
  closeDate: "Previsão de fechamento",
  nextActivity: "Próxima atividade agendada",
};
function examples(pipeline: Pipeline): Rule[] {
  const stage =
    pipeline.stages.find((s) => /proposta/i.test(s.name)) ??
    pipeline.stages.at(-1);
  return [
    {
      id: "example-email",
      name: "Enviar proposta por email",
      stageId: stage?.id ?? "",
      channel: "EMAIL",
      enabled: true,
      delay: "0",
      minimum: "",
      subject: "Sua proposta está pronta, {contato}",
      message:
        "Olá, {contato}!\n\nFoi um prazer conhecer os objetivos da {empresa}. Preparamos a proposta de {negociacao} para você.\n\nPodemos conversar sobre os próximos passos?\n\nAté breve,\nEquipe comercial",
    },
    {
      id: "example-whatsapp",
      name: "Acompanhar a proposta no WhatsApp",
      stageId: stage?.id ?? "",
      channel: "WHATSAPP",
      enabled: false,
      delay: "24",
      minimum: "",
      subject: "",
      message:
        "Olá, {contato}! Tudo bem? Você conseguiu conferir nossa proposta para {negociacao}? Estou à disposição para conversar.",
    },
  ].map((r) => readRule(r)!);
}
const preview = (text: string) =>
  text
    .replaceAll("{contato}", "Marina")
    .replaceAll("{empresa}", "Aurora Digital")
    .replaceAll("{negociacao}", "Implantação comercial");

export function SalesAutomations() {
  const { data: session } = useSession();
  const result = usePipelines();
  const params = useSearchParams();
  const [selected, setSelected] = useState("");
  if (!session || result.isPending) return <LoadingPage />;
  if (!session.permissions.includes("pipelines.manage"))
    return <PermissionNotice />;
  if (result.isError)
    return <ErrorState error={result.error} retry={() => result.refetch()} />;
  const pipelines = result.data.items.filter((p) => p.active);
  if (!pipelines.length)
    return (
      <EmptyState
        icon={<GitBranch size={26} />}
        title="Comece pelo seu funil"
        description="Crie um pipeline para explorar as automações e regras de cada etapa."
        action={
          <Link className="btn btn-primary" href="/sales/pipelines/new">
            Criar pipeline
          </Link>
        }
      />
    );
  const pipeline =
    pipelines.find((p) => p.id === (selected || params.get("pipelineId"))) ??
    pipelines[0];
  return (
    <AutomationWorkspace
      key={`${session.tenant.id}:${pipeline.id}`}
      pipeline={pipeline}
      pipelines={pipelines}
      onPipeline={setSelected}
      storageKey={`desmos-demo-automations:${session.tenant.id}:${pipeline.id}`}
    />
  );
}

function AutomationWorkspace({
  pipeline,
  pipelines,
  onPipeline,
  storageKey,
}: {
  pipeline: Pipeline;
  pipelines: Pipeline[];
  onPipeline: (id: string) => void;
  storageKey: string;
}) {
  const initial = examples(pipeline);
  const { assignees } = useCrmReferences();
  const owners = assignees.data?.items ?? [];
  const [template, setTemplate] = useState("TASK");
  const [history, setHistory] = useState<
    { id: string; name: string; result: string; at: string }[]
  >([]);
  const [formError, setFormError] = useState("");
  const tested = useRef("");
  const [rules, setRules] = useState<Rule[]>(initial);
  const [draft, setDraft] = useState<Rule>(initial[0]);
  const [tab, setTab] = useState<"automations" | "stages">("automations");
  const [stageId, setStageId] = useState(initial[0].stageId);
  const [requirements, setRequirements] = useState<
    Record<string, Requirement[]>
  >({});
  const [notice, setNotice] = useState("");
  const [simulation, setSimulation] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const stored = JSON.parse(raw);
        const valid = Array.isArray(stored.rules)
          ? stored.rules.slice(0, 50).map(readRule)
          : [];
        if (valid.length && valid.every(Boolean)) {
          setRules(valid as Rule[]);
          setDraft(valid[0] as Rule);
        }
        if (Array.isArray(stored.history))
          setHistory(
            stored.history
              .filter(
                (h: unknown) =>
                  typeof h === "object" &&
                  h &&
                  ["id", "name", "result", "at"].every(
                    (key) =>
                      typeof (h as Record<string, unknown>)[key] === "string",
                  ),
              )
              .slice(0, 8),
          );
        if (
          stored.requirements &&
          typeof stored.requirements === "object" &&
          !Array.isArray(stored.requirements)
        ) {
          const clean: Record<string, Requirement[]> = {};
          for (const [key, value] of Object.entries(stored.requirements))
            if (Array.isArray(value))
              clean[key] = value.filter(
                (v): v is Requirement =>
                  typeof v === "string" && v in requirementLabels,
              );
          setRequirements(clean);
        }
      }
    } catch {
      setNotice(
        "Não foi possível recuperar os exemplos salvos neste navegador.",
      );
    }
    setLoaded(true);
  }, [storageKey]);
  const persist = (nextRules: Rule[], nextRequirements = requirements) => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          rules: nextRules,
          requirements: nextRequirements,
          history,
        }),
      );
      return true;
    } catch {
      setNotice(
        "Os exemplos mudaram nesta tela, mas este navegador não permitiu salvar.",
      );
      return false;
    }
  };
  const change = <K extends keyof Rule>(key: K, value: Rule[K]) => {
    setDraft((old) => ({
      ...old,
      [key]: value,
      ...(key === "channel" ? { action: value as Rule["action"] } : {}),
    }));
    setFormError("");
    setSimulation("");
    setNotice("");
  };
  const stageName =
    pipeline.stages.find((s) => s.id === draft.stageId)?.name ??
    "Etapa removida";
  const selectedStage =
    pipeline.stages.find((s) => s.id === stageId) ?? pipeline.stages[0];
  const problem = ruleProblem(draft, pipeline, owners);
  const ownerName = (id: string) =>
    owners.find((o) => o.id === id)?.name ?? "Responsável indisponível";
  const triggerSummary =
    draft.trigger === "STAGE_CHANGED"
      ? `Negócio entrar em ${stageName}`
      : triggers[draft.trigger];
  const conditionSummary = [
    `Funil ${pipeline.name}`,
    draft.conditionStageId
      ? `etapa ${pipeline.stages.find((s) => s.id === draft.conditionStageId)?.name ?? "removida"}`
      : "",
    draft.ownerId ? `responsável ${ownerName(draft.ownerId)}` : "",
    draft.minimum ? `valor mínimo R$ ${draft.minimum}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const actionSummary =
    draft.action === "ASSIGN"
      ? `Atribuir a ${ownerName(draft.assigneeId)}`
      : draft.action === "MOVE"
        ? `Mover para ${pipeline.stages.find((s) => s.id === draft.targetStageId)?.name ?? "etapa não escolhida"}`
        : actions[draft.action];
  const startTemplate = () => {
    const action = template as Rule["action"];
    setDraft({
      ...initial[0],
      id: crypto.randomUUID(),
      name:
        action === "TASK"
          ? "Acompanhar novo negócio"
          : action === "ASSIGN"
            ? "Distribuir novos leads"
            : action === "MOVE"
              ? "Avançar negociação"
              : actions[action],
      action,
      trigger:
        action === "ASSIGN"
          ? "LEAD_CREATED"
          : action === "TASK"
            ? "DEAL_CREATED"
            : "STAGE_CHANGED",
      assigneeId: owners[0]?.id ?? "",
      targetStageId:
        pipeline.stages.find((s) => s.id !== initial[0].stageId)?.id ?? "",
    });
    setSimulation("");
    setNotice("");
    setFormError("");
  };
  const testRule = () => {
    if (problem) {
      setFormError(problem);
      return;
    }
    const fingerprint = JSON.stringify({
      draft,
      pipeline: pipeline.version,
      owner: owners[0]?.id,
    });
    const result = exampleResult(draft, pipeline, owners[0]?.id ?? "");
    if (tested.current === fingerprint) {
      setSimulation(result);
      return;
    }
    tested.current = fingerprint;
    setSimulation(result);
    const next = [
      {
        id: crypto.randomUUID(),
        name: draft.name,
        result,
        at: new Date().toISOString(),
      },
      ...history,
    ].slice(0, 8);
    setHistory(next);
    try {
      const raw = localStorage.getItem(storageKey);
      const saved = raw ? JSON.parse(raw) : { rules, requirements };
      localStorage.setItem(
        storageKey,
        JSON.stringify({ ...saved, history: next }),
      );
    } catch {
      setNotice(
        "O teste foi concluído, mas o navegador não permitiu guardar o resultado.",
      );
    }
  };
  const save = () => {
    if (problem) {
      setFormError(problem);
      return;
    }
    const next = rules.some((r) => r.id === draft.id)
      ? rules.map((r) => (r.id === draft.id ? { ...draft } : r))
      : [...rules, { ...draft }];
    setRules(next);
    if (persist(next))
      setNotice("Automação salva na demonstração deste pipeline.");
  };
  return (
    <div className="page-stack automation-page">
      <PageHeading
        title="Automações de vendas"
        description="Cada funil, com seus próprios próximos passos."
        action={<Badge tone="amber">Demonstração</Badge>}
      />
      <div className="automation-demo-note">
        <Workflow size={17} aria-hidden="true" />
        <p>
          Explore as regras e teste o fluxo. Os envios de email e WhatsApp são{" "}
          <strong>simulados</strong>.
        </p>
      </div>
      <div className="automation-toolbar">
        <Field id="automation-pipeline" label="Pipeline">
          <Select
            id="automation-pipeline"
            value={pipeline.id}
            onChange={(e) => onPipeline(e.target.value)}
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Link
          className="btn btn-secondary"
          href={`/sales/pipelines/${pipeline.id}/edit`}
        >
          <GitBranch size={16} />
          Editar etapas
        </Link>
      </div>
      <DemoFollowup pipeline={pipeline} />
      <div
        className="automation-tabs"
        role="tablist"
        aria-label="Personalização do pipeline"
        onKeyDown={(event) => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
            return;
          event.preventDefault();
          const next =
            event.key === "Home"
              ? "automations"
              : event.key === "End"
                ? "stages"
                : tab === "automations"
                  ? "stages"
                  : "automations";
          setTab(next);
          document
            .getElementById(
              next === "automations" ? "automation-tab" : "stages-tab",
            )
            ?.focus();
        }}
      >
        <button
          type="button"
          role="tab"
          id="automation-tab"
          aria-controls="automation-panel"
          aria-selected={tab === "automations"}
          tabIndex={tab === "automations" ? 0 : -1}
          onClick={() => setTab("automations")}
        >
          Automações
        </button>
        <button
          type="button"
          role="tab"
          id="stages-tab"
          aria-controls="stages-panel"
          aria-selected={tab === "stages"}
          tabIndex={tab === "stages" ? 0 : -1}
          onClick={() => setTab("stages")}
        >
          Regras por etapa
        </button>
      </div>
      {notice && (
        <div role="status" className="automation-notice">
          {notice}
        </div>
      )}
      {tab === "automations" ? (
        <div
          id="automation-panel"
          role="tabpanel"
          aria-labelledby="automation-tab"
          className="automation-content"
        >
          <section
            className="automation-rule-list"
            aria-label="Automações deste pipeline"
          >
            <div className="automation-section-heading">
              <h2>Regras do funil</h2>
              <span>{rules.length}</span>
            </div>
            {rules.map((rule) => (
              <button
                key={rule.id}
                type="button"
                className={cn(
                  "automation-rule",
                  draft.id === rule.id && "automation-rule-selected",
                )}
                onClick={() => {
                  setDraft({ ...rule });
                  setSimulation("");
                  setNotice("");
                }}
              >
                {rule.action === "EMAIL" ? (
                  <Mail size={18} aria-hidden="true" />
                ) : rule.action === "WHATSAPP" ? (
                  <MessageSquare size={18} aria-hidden="true" />
                ) : rule.action === "TASK" ? (
                  <ListTodo size={18} />
                ) : rule.action === "ASSIGN" ? (
                  <UserRound size={18} />
                ) : (
                  <ArrowRightLeft size={18} />
                )}
                <span>
                  <strong>{rule.name}</strong>
                  <small>
                    {actions[rule.action]} ·{" "}
                    {rule.enabled ? "Ativa na simulação" : "Pausada"}
                  </small>
                </span>
              </button>
            ))}
            <Field id="automation-template" label="Começar com um modelo">
              <Select
                id="automation-template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                {Object.entries(actions).map(([key, label]) => (
                  <option key={key} value={key}>
                    {{
                      TASK: "Acompanhar novo negócio",
                      ASSIGN: "Distribuir novos leads",
                      MOVE: "Avançar negociação",
                      EMAIL: "Enviar proposta por email",
                      WHATSAPP: "Acompanhar no WhatsApp",
                    }[key] ?? label}
                  </option>
                ))}
              </Select>
            </Field>
            <Button variant="ghost" disabled={!loaded} onClick={startTemplate}>
              <Plus size={16} />
              Criar automação
            </Button>
            <p className="automation-storage-note">
              Exemplos salvos neste navegador, separados por pipeline.
            </p>
          </section>
          <form
            className="automation-builder"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {(formError || problem) && <Alert>{formError || problem}</Alert>}
            <div className="automation-builder-heading">
              <Field id="automation-name" label="Nome da automação">
                <Input
                  id="automation-name"
                  value={draft.name}
                  onChange={(e) => change("name", e.target.value)}
                  required
                  maxLength={100}
                />
              </Field>
              <label className="crm-checkbox">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) => change("enabled", e.target.checked)}
                />
                Ativa na simulação
              </label>
            </div>
            <section className="automation-step">
              <div className="automation-step-heading">
                <span>1</span>
                <h3>Quando acontecer</h3>
              </div>
              <Field id="automation-trigger" label="O que acontece">
                <Select
                  id="automation-trigger"
                  value={draft.trigger}
                  onChange={(e) =>
                    change("trigger", e.target.value as Rule["trigger"])
                  }
                >
                  {Object.entries(triggers).map(([key, label]) => (
                    <option value={key} key={key}>
                      {label}
                    </option>
                  ))}
                </Select>
              </Field>
              {draft.trigger === "STAGE_CHANGED" && (
                <Field id="automation-stage" label="Etapa de entrada">
                  <Select
                    id="automation-stage"
                    value={draft.stageId}
                    onChange={(e) => change("stageId", e.target.value)}
                    required
                  >
                    {pipeline.stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </section>
            <section className="automation-step">
              <div className="automation-step-heading">
                <span>2</span>
                <h3>Se atender às condições</h3>
              </div>
              <p>
                Este funil já está selecionado. Outras condições são opcionais.
              </p>
              <details
                className="crm-more-details"
                open={
                  !!(
                    draft.minimum ||
                    draft.ownerId ||
                    draft.conditionStageId
                  ) || undefined
                }
              >
                <summary>Adicionar condições</summary>
                <div className="form-grid">
                  <Field id="automation-condition-stage" label="Estar na etapa">
                    <Select
                      id="automation-condition-stage"
                      value={draft.conditionStageId}
                      onChange={(e) =>
                        change("conditionStageId", e.target.value)
                      }
                    >
                      <option value="">Qualquer etapa</option>
                      {pipeline.stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field id="automation-owner" label="Responsável do registro">
                    <Select
                      id="automation-owner"
                      value={draft.ownerId}
                      onChange={(e) => change("ownerId", e.target.value)}
                      disabled={assignees.isPending}
                    >
                      <option value="">Qualquer responsável</option>
                      {owners.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    id="automation-minimum"
                    label="Valor mínimo (R$)"
                    hint="Opcional; deixe vazio para qualquer valor."
                  >
                    <Input
                      id="automation-minimum"
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.minimum}
                      placeholder="Qualquer valor"
                      onChange={(e) => change("minimum", e.target.value)}
                    />
                  </Field>
                </div>
              </details>
              {assignees.isError && (
                <ErrorState
                  error={assignees.error}
                  retry={() => assignees.refetch()}
                />
              )}
            </section>
            <section className="automation-step">
              <div className="automation-step-heading">
                <span>3</span>
                <h3>Fazer</h3>
              </div>
              <Field id="automation-action" label="Ação da automação">
                <Select
                  id="automation-action"
                  value={draft.action}
                  onChange={(e) =>
                    change("action", e.target.value as Rule["action"])
                  }
                >
                  {Object.entries(actions).map(([key, label]) => (
                    <option
                      key={key}
                      value={key}
                      disabled={
                        key === "MOVE" && draft.trigger === "LEAD_CREATED"
                      }
                    >
                      {{
                        TASK: "Criar tarefa",
                        ASSIGN: "Atribuir responsável",
                        MOVE: "Mover etapa",
                        EMAIL: "Preparar email",
                        WHATSAPP: "Preparar WhatsApp",
                      }[key] ?? label}{" "}
                      · simulação
                    </option>
                  ))}
                </Select>
              </Field>
              {draft.action === "TASK" && (
                <Field id="automation-task-title" label="Título da tarefa">
                  <Input
                    id="automation-task-title"
                    value={draft.taskTitle}
                    onChange={(e) => change("taskTitle", e.target.value)}
                    maxLength={200}
                    required
                  />
                  <p className="field-help">
                    Prévia de tarefa para o dia seguinte, com o responsável do
                    registro.
                  </p>
                </Field>
              )}
              {draft.action === "ASSIGN" && (
                <Field id="automation-assignee" label="Atribuir a">
                  <Select
                    id="automation-assignee"
                    value={draft.assigneeId}
                    onChange={(e) => change("assigneeId", e.target.value)}
                    required
                  >
                    <option value="">Escolher responsável</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {draft.action === "MOVE" && (
                <Field id="automation-target" label="Etapa de destino">
                  <Select
                    id="automation-target"
                    value={draft.targetStageId}
                    onChange={(e) => change("targetStageId", e.target.value)}
                    required
                  >
                    <option value="">Escolher etapa</option>
                    {pipeline.stages.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {["EMAIL", "WHATSAPP"].includes(draft.action) && (
                <>
                  <div
                    className="automation-channels"
                    role="group"
                    aria-label="Canal da mensagem"
                  >
                    <Button
                      variant={
                        draft.action === "EMAIL" ? "primary" : "secondary"
                      }
                      aria-pressed={draft.action === "EMAIL"}
                      onClick={() => change("channel", "EMAIL")}
                    >
                      <Mail size={16} />
                      Email
                    </Button>
                    <Button
                      variant={
                        draft.action === "WHATSAPP" ? "primary" : "secondary"
                      }
                      aria-pressed={draft.action === "WHATSAPP"}
                      onClick={() => change("channel", "WHATSAPP")}
                    >
                      <MessageSquare size={16} />
                      WhatsApp
                    </Button>
                  </div>
                  <p className="automation-recipient">
                    Para o contato vinculado à oportunidade.
                  </p>
                  {draft.action === "EMAIL" && (
                    <Field id="automation-subject" label="Assunto">
                      <Input
                        id="automation-subject"
                        value={draft.subject}
                        onChange={(e) => change("subject", e.target.value)}
                        required
                        maxLength={200}
                      />
                    </Field>
                  )}
                  <Field id="automation-message" label="Mensagem">
                    <textarea
                      id="automation-message"
                      className="input automation-message"
                      rows={6}
                      value={draft.message}
                      onChange={(e) => change("message", e.target.value)}
                      required
                      maxLength={4000}
                    />
                  </Field>
                  <div className="automation-variables">
                    <span>Inserir:</span>
                    {["{contato}", "{empresa}", "{negociacao}"].map(
                      (variable) => (
                        <button
                          type="button"
                          key={variable}
                          onClick={() =>
                            change("message", draft.message + " " + variable)
                          }
                        >
                          {variable}
                        </button>
                      ),
                    )}
                  </div>
                  <Field id="automation-delay" label="Quando executar">
                    <Select
                      id="automation-delay"
                      value={draft.delay}
                      onChange={(e) => change("delay", e.target.value)}
                    >
                      <option value="0">Imediatamente</option>
                      <option value="1">Após 1 hora</option>
                      <option value="24">Após 24 horas</option>
                      <option value="48">Após 48 horas</option>
                    </Select>
                  </Field>
                </>
              )}
              <p>
                Esta ação é simulada. A regra real de tarefa fica em
                Acompanhamento de proposta.
              </p>
            </section>
            <Button type="submit" disabled={!loaded || assignees.isPending}>
              <Check size={16} />
              Salvar automação
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft({
                  ...(rules.find((r) => r.id === draft.id) ?? rules[0]),
                });
                setFormError("");
                setSimulation("");
                setNotice("Alterações canceladas.");
              }}
            >
              Cancelar alterações
            </Button>
          </form>
          <aside
            className="automation-preview"
            aria-label="Prévia da automação"
          >
            <h2>Resumo da regra</h2>
            <Badge tone="amber">Simulação neste navegador</Badge>
            <dl className="automation-readable-summary">
              <dt>Quando</dt>
              <dd>{triggerSummary}</dd>
              <dt>Se</dt>
              <dd>{conditionSummary}</dd>
              <dt>Fazer</dt>
              <dd>{actionSummary}</dd>
            </dl>
            <p>Exemplo fictício para testar</p>
            <div className="automation-sample">
              <strong>Implantação comercial</strong>
              <span>Marina · Aurora Digital · R$ 25.000,00</span>
              <span>Responsável: {owners[0]?.name ?? "Carregando"}</span>
              <span>
                Etapa:{" "}
                {draft.trigger === "STAGE_CHANGED"
                  ? stageName
                  : pipeline.stages[0]?.name}
              </span>
            </div>
            <div className="automation-message-preview">
              {draft.action === "EMAIL" && (
                <strong>{preview(draft.subject)}</strong>
              )}
              <p>
                {["EMAIL", "WHATSAPP"].includes(draft.action)
                  ? preview(draft.message)
                  : draft.action === "TASK"
                    ? preview(draft.taskTitle)
                    : actionSummary}
              </p>
            </div>
            {["EMAIL", "WHATSAPP"].includes(draft.action) && (
              <div className="automation-timing">
                <Clock3 size={15} />
                <span>
                  {draft.delay === "0"
                    ? "Imediatamente"
                    : `${draft.delay} horas depois`}
                </span>
              </div>
            )}
            <Button
              variant="secondary"
              disabled={!loaded || !draft.enabled || assignees.isPending}
              onClick={testRule}
            >
              <Play size={15} />
              {["EMAIL", "WHATSAPP"].includes(draft.action)
                ? "Simular envio"
                : "Testar com prévia"}
            </Button>
            {simulation && (
              <p className="automation-simulation" role="status">
                {simulation}
              </p>
            )}
            <details className="automation-test-history">
              <summary>Resultados dos testes ({history.length})</summary>
              {history.length ? (
                history.map((h) => (
                  <div key={h.id}>
                    <strong>{h.name}</strong>
                    <time dateTime={h.at}>
                      {new Date(h.at).toLocaleString("pt-BR")}
                    </time>
                    <p>{h.result}</p>
                  </div>
                ))
              ) : (
                <p>Nenhum teste ainda. Use a prévia acima.</p>
              )}
            </details>
          </aside>
        </div>
      ) : (
        <div
          id="stages-panel"
          role="tabpanel"
          aria-labelledby="stages-tab"
          className="automation-stage-layout"
        >
          <section
            className="automation-stage-picker"
            aria-label="Etapas deste pipeline"
          >
            <h2>{pipeline.name}</h2>
            <p>Regras independentes para cada etapa.</p>
            {pipeline.stages.map((stage) => (
              <button
                key={stage.id}
                type="button"
                aria-pressed={selectedStage?.id === stage.id}
                className={cn(
                  "automation-stage-choice",
                  selectedStage?.id === stage.id && "automation-rule-selected",
                )}
                onClick={() => {
                  setStageId(stage.id ?? "");
                  setNotice("");
                }}
              >
                <span
                  className="automation-stage-dot"
                  style={{ background: stage.color }}
                />
                <span>
                  <strong>{stage.name}</strong>
                  <small>{stage.probability}% de probabilidade</small>
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
          </section>
          <section className="automation-stage-rules">
            <h2>O que exigir em {selectedStage?.name}?</h2>
            <p>
              Personalize os critérios para avançar nesta etapa. Estes campos
              são uma demonstração visual e ainda não bloqueiam o Kanban.
            </p>
            <fieldset>
              <legend>Campos obrigatórios</legend>
              {(
                Object.entries(requirementLabels) as [Requirement, string][]
              ).map(([key, label]) => (
                <label className="crm-checkbox" key={key}>
                  <input
                    type="checkbox"
                    checked={(
                      requirements[selectedStage?.id ?? ""] ?? []
                    ).includes(key)}
                    onChange={(e) => {
                      const id = selectedStage?.id ?? "";
                      const current = requirements[id] ?? [];
                      setRequirements((old) => ({
                        ...old,
                        [id]: e.target.checked
                          ? [...current, key]
                          : current.filter((r) => r !== key),
                      }));
                      setNotice("");
                    }}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <div className="automation-stage-summary">
              <h3>Esta etapa já permite configurar</h3>
              <p>
                Nome, ordem, cor, probabilidade, dias sem avanço e exigência de
                próxima atividade.
              </p>
              <Link
                className="btn btn-secondary"
                href={`/sales/pipelines/${pipeline.id}/edit`}
              >
                Editar configurações da etapa
                <ArrowRight size={15} />
              </Link>
            </div>
            <Button
              onClick={() => {
                if (persist(rules))
                  setNotice(
                    "Regras da etapa salvas na demonstração deste pipeline.",
                  );
              }}
              disabled={!loaded}
            >
              <Check size={16} />
              Salvar regras da demonstração
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
