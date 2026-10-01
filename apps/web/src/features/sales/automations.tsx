"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
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

type Rule = {
  id: string;
  name: string;
  stageId: string;
  channel: "EMAIL" | "WHATSAPP";
  enabled: boolean;
  delay: string;
  minimum: string;
  subject: string;
  message: string;
};
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
  ];
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
        const valid =
          Array.isArray(stored.rules) &&
          stored.rules.every(
            (r: Rule) =>
              r &&
              typeof r.name === "string" &&
              typeof r.message === "string" &&
              typeof r.subject === "string" &&
              typeof r.delay === "string" &&
              typeof r.minimum === "string" &&
              typeof r.enabled === "boolean" &&
              ["EMAIL", "WHATSAPP"].includes(r.channel) &&
              typeof r.id === "string" &&
              typeof r.stageId === "string",
          );
        if (valid && stored.rules.length) {
          setRules(stored.rules);
          setDraft(stored.rules[0]);
        }
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
        JSON.stringify({ rules: nextRules, requirements: nextRequirements }),
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
    setDraft((old) => ({ ...old, [key]: value }));
    setSimulation("");
    setNotice("");
  };
  const stageName =
    pipeline.stages.find((s) => s.id === draft.stageId)?.name ??
    "Etapa removida";
  const selectedStage =
    pipeline.stages.find((s) => s.id === stageId) ?? pipeline.stages[0];
  const save = () => {
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
                {rule.channel === "EMAIL" ? (
                  <Mail size={18} aria-hidden="true" />
                ) : (
                  <MessageSquare size={18} aria-hidden="true" />
                )}
                <span>
                  <strong>{rule.name}</strong>
                  <small>
                    {pipeline.stages.find((s) => s.id === rule.stageId)?.name ??
                      "Etapa removida"}{" "}
                    · {rule.enabled ? "Ativa" : "Pausada"}
                  </small>
                </span>
              </button>
            ))}
            <Button
              variant="ghost"
              disabled={!loaded}
              onClick={() => {
                setDraft({
                  ...initial[0],
                  id: crypto.randomUUID(),
                  name: "Nova automação",
                  message: "Olá, {contato}!",
                  subject: "Vamos conversar?",
                });
                setSimulation("");
                setNotice("");
              }}
            >
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
                Ativa
              </label>
            </div>
            <section className="automation-step">
              <div className="automation-step-heading">
                <span>1</span>
                <h3>Quando acontecer</h3>
              </div>
              <p>A oportunidade entrar em uma etapa deste pipeline.</p>
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
            </section>
            <section className="automation-step">
              <div className="automation-step-heading">
                <span>2</span>
                <h3>Condições e momento</h3>
              </div>
              <div className="form-grid">
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
              </div>
            </section>
            <section className="automation-step">
              <div className="automation-step-heading">
                <span>3</span>
                <h3>Executar uma ação</h3>
              </div>
              <div
                className="automation-channels"
                role="group"
                aria-label="Canal da mensagem"
              >
                <Button
                  variant={draft.channel === "EMAIL" ? "primary" : "secondary"}
                  aria-pressed={draft.channel === "EMAIL"}
                  onClick={() => change("channel", "EMAIL")}
                >
                  <Mail size={16} />
                  Email
                </Button>
                <Button
                  variant={
                    draft.channel === "WHATSAPP" ? "primary" : "secondary"
                  }
                  aria-pressed={draft.channel === "WHATSAPP"}
                  onClick={() => change("channel", "WHATSAPP")}
                >
                  <MessageSquare size={16} />
                  WhatsApp
                </Button>
              </div>
              <p className="automation-recipient">
                Para o contato vinculado à oportunidade.
              </p>
              {draft.channel === "EMAIL" && (
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
                {["{contato}", "{empresa}", "{negociacao}"].map((variable) => (
                  <button
                    type="button"
                    key={variable}
                    onClick={() =>
                      change("message", draft.message + " " + variable)
                    }
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </section>
            <Button
              type="submit"
              disabled={
                !loaded || !pipeline.stages.some((s) => s.id === draft.stageId)
              }
            >
              <Check size={16} />
              Salvar automação
            </Button>
          </form>
          <aside
            className="automation-preview"
            aria-label="Prévia da automação"
          >
            <h2>Prévia do envio</h2>
            <p>Exemplo de oportunidade</p>
            <div className="automation-sample">
              <strong>Implantação comercial</strong>
              <span>Marina · Aurora Digital · R$ 25.000,00</span>
            </div>
            <div className="automation-flow-summary">
              <span>
                <GitBranch size={15} />
                {stageName}
              </span>
              <ArrowRight size={15} />
              <span>{draft.channel === "EMAIL" ? "Email" : "WhatsApp"}</span>
            </div>
            <div className="automation-message-preview">
              {draft.channel === "EMAIL" && (
                <strong>{preview(draft.subject)}</strong>
              )}
              <p>{preview(draft.message)}</p>
            </div>
            <div className="automation-timing">
              <Clock3 size={15} />
              <span>
                {draft.delay === "0"
                  ? "Ao entrar na etapa"
                  : `${draft.delay} horas após entrar na etapa`}
              </span>
            </div>
            <Button
              variant="secondary"
              disabled={!draft.enabled || !draft.message.trim()}
              onClick={() =>
                setSimulation(
                  Number(draft.minimum || 0) > 25000
                    ? "A condição não foi atendida: o exemplo tem valor de R$ 25.000,00. Nenhum envio foi simulado."
                    : `Teste concluído: ${draft.channel === "EMAIL" ? "email" : "WhatsApp"} preparado para Marina. Nenhuma mensagem real foi enviada.`,
                )
              }
            >
              <Play size={15} />
              Simular envio
            </Button>
            {simulation && (
              <p className="automation-simulation" role="status">
                {simulation}
              </p>
            )}
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
