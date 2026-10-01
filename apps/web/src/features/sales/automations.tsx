"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { GitBranch, Plus } from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  LoadingPage,
  PageHeading,
  Select,
} from "@/components/ui/primitives";
import { PermissionNotice } from "@/features/settings/company";
import { usePipelines } from "./shared";
import { DemoFollowup } from "./demo-followup";
import { MessageTemplates } from "./message-templates";
import { actions, readRule, type Rule } from "./automation-model";
import { templateSchema, type MessageTemplate } from "./message-model";
import type { Pipeline } from "./types";
import type { TestResult } from "./automation-editor";
const AutomationEditor = dynamic(() => import("./automation-editor"), {
  loading: () => <LoadingPage />,
});
const Assistant = dynamic(
  () => import("./automation-assistant").then((m) => m.AutomationAssistant),
  { loading: () => <LoadingPage /> },
);
export function newRule(pipeline: Pipeline, action: Rule["action"] = "EMAIL") {
  return readRule({
    id: crypto.randomUUID(),
    name:
      action === "TASK"
        ? "Acompanhar novo negócio"
        : action === "ASSIGN"
          ? "Distribuir novos leads"
          : actions[action],
    stageId:
      pipeline.stages.find((s) => /proposta/i.test(s.name))?.id ??
      pipeline.stages[0]?.id ??
      "",
    channel: action === "WHATSAPP" ? "WHATSAPP" : "EMAIL",
    enabled: false,
    delay: "0",
    minimum: "",
    subject: "Sua proposta está pronta, {contato}",
    message: "Olá, {contato}! Vamos conversar sobre {negociacao} na {empresa}?",
    action,
    trigger:
      action === "TASK"
        ? "DEAL_CREATED"
        : action === "ASSIGN"
          ? "LEAD_CREATED"
          : "STAGE_CHANGED",
    targetStageId: pipeline.stages[1]?.id ?? "",
  })!;
}
export function SalesAutomations() {
  const { data: session } = useSession();
  const result = usePipelines();
  const params = useSearchParams();
  const [selected, setSelected] = useState("");
  const [incoming, setIncoming] = useState<{
    rule: Rule;
    pipelineId: string;
  } | null>(null);
  if (!session || result.isPending) return <LoadingPage />;
  if (!session.permissions.includes("pipelines.manage"))
    return <PermissionNotice />;
  if (result.isError)
    return <ErrorState error={result.error} retry={() => result.refetch()} />;
  const pipelines = result.data.items.filter((p) => p.active);
  const pipeline =
    pipelines.find((p) => p.id === (selected || params.get("pipelineId"))) ??
    pipelines[0];
  if (!pipeline)
    return (
      <EmptyState
        icon={<GitBranch size={24} />}
        title="Comece pelo seu funil"
        description="Crie um funil antes de configurar automações."
        action={
          <Link className="btn btn-primary" href="/sales/pipelines/new">
            Criar pipeline
          </Link>
        }
      />
    );
  return (
    <Workspace
      key={`${session.tenant.id}:${pipeline.id}`}
      pipeline={pipeline}
      pipelines={pipelines}
      tenantId={session.tenant.id}
      incoming={incoming?.pipelineId === pipeline.id ? incoming.rule : null}
      onPipeline={setSelected}
      onGenerated={(rule, pipelineId) => {
        setIncoming({ rule, pipelineId });
        setSelected(pipelineId);
      }}
    />
  );
}
function Workspace({
  pipeline,
  pipelines,
  tenantId,
  onPipeline,
  onGenerated,
  incoming,
}: {
  pipeline: Pipeline;
  pipelines: Pipeline[];
  tenantId: string;
  onPipeline: (id: string) => void;
  onGenerated: (rule: Rule, pid: string) => void;
  incoming: Rule | null;
}) {
  const { data: session } = useSession();
  const key = `desmos-demo-automations:${tenantId}:${pipeline.id}`;
  const templateKey = `desmos-message-templates:${tenantId}:v1`;
  const [rules, setRules] = useState<Rule[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [history, setHistory] = useState<TestResult[]>([]);
  const [requirements, setRequirements] = useState<Record<string, string[]>>(
    {},
  );
  const [draft, setDraft] = useState<Rule | null>(incoming);
  const [baseline, setBaseline] = useState(
    incoming ? JSON.stringify(incoming) : "",
  );
  const [view, setView] = useState(incoming ? "editor" : "list");
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState<Rule["action"]>("TASK");
  const [pending, setPending] = useState<(() => void) | null>(null);
  const dirty = !!draft && JSON.stringify(draft) !== baseline;
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        const saved = (Array.isArray(data.rules) ? data.rules : []).map(
          readRule,
        );
        setRules(saved.filter(Boolean) as Rule[]);
        if (saved.some((r: Rule | null) => !r))
          setError(
            "Há um rascunho antigo inválido. O conteúdo original foi preservado; revise antes de salvar.",
          );
        if (data.requirements && typeof data.requirements === "object")
          setRequirements(data.requirements);
        if (Array.isArray(data.history))
          setHistory(
            data.history
              .filter(
                (h: TestResult) =>
                  h &&
                  [h.id, h.name, h.result, h.at].every(
                    (v) => typeof v === "string",
                  ),
              )
              .slice(0, 8),
          );
      } else {
        const a = newRule(pipeline);
        a.id = "example-email";
        a.name = "Enviar proposta por email";
        const b = newRule(pipeline, "WHATSAPP");
        b.id = "example-whatsapp";
        b.name = "Acompanhar a proposta no WhatsApp";
        setRules([a, b]);
      }
      const rawTemplates = localStorage.getItem(templateKey);
      if (rawTemplates) {
        const data = JSON.parse(rawTemplates);
        if (data.version !== 1 || !Array.isArray(data.items))
          throw new Error("Versão de modelos inválida");
        const ts = data.items.map((t: unknown) => templateSchema.parse(t));
        setTemplates(ts);
      }
    } catch {
      setError(
        "Não foi possível ler os dados locais. Nenhum conteúdo foi substituído. Confira o armazenamento deste navegador.",
      );
    }
    setLoaded(true);
  }, [key, templateKey, pipeline]);
  useEffect(() => {
    if (incoming) {
      setDraft(incoming);
      setBaseline("");
      setView("editor");
    }
  }, [incoming]);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  function protect(action: () => void) {
    if (dirty) setPending(() => action);
    else action();
  }
  function persist(next: Rule[], tests = history) {
    try {
      const raw = localStorage.getItem(key);
      const previous = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        key,
        JSON.stringify({
          ...previous,
          ...(previous.version !== 2 && previous.rules
            ? { legacyRules: previous.rules }
            : {}),
          version: 2,
          rules: next,
          history: tests,
          requirements,
        }),
      );
      return true;
    } catch {
      setError(
        "Não foi possível salvar neste navegador. Suas alterações continuam abertas.",
      );
      return false;
    }
  }
  function start(r: Rule) {
    setDraft({ ...r });
    setBaseline(JSON.stringify(r));
    setView("editor");
    setNotice("");
  }
  function saveTemplates(next: MessageTemplate[]) {
    try {
      localStorage.setItem(
        templateKey,
        JSON.stringify({ version: 1, items: next }),
      );
      setTemplates(next);
      setNotice(
        "Modelo salvo neste navegador. Snapshots existentes foram mantidos.",
      );
      return true;
    } catch {
      setError("Não foi possível salvar os modelos neste navegador.");
      return false;
    }
  }
  return (
    <div className="page-stack automation-page automation-workspace-v2">
      <PageHeading
        title="Automações de vendas"
        description="Organize regras, revise o próximo passo e teste antes de usar."
        action={<Badge tone="amber">Demonstração</Badge>}
      />
      <div className="automation-toolbar">
        <Field id="automation-pipeline" label="Pipeline">
          <Select
            id="automation-pipeline"
            value={pipeline.id}
            onChange={(e) => {
              const id = e.target.value;
              protect(() => onPipeline(id));
            }}
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
          Editar etapas
        </Link>
      </div>
      <nav className="crm-tabs" aria-label="Área de automações">
        {[
          ["list", "Automações"],
          ["templates", "Modelos de mensagem"],
          ["assistant", "Assistente"],
          ["stages", "Regras por etapa"],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            aria-pressed={view === id}
            onClick={() => protect(() => setView(id))}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && <Alert>{error}</Alert>}
      {notice && (
        <p role="status" className="info-note">
          {notice}
        </p>
      )}
      {!loaded ? (
        <LoadingPage />
      ) : view === "list" ? (
        <section className="automation-directory">
          <div className="crm-section-top">
            <div>
              <h2>Regras do funil</h2>
              <p>{pipeline.name} · simulações salvas neste navegador.</p>
            </div>
            <Button onClick={() => start(newRule(pipeline))}>
              <Plus size={16} />
              Criar automação
            </Button>
          </div>
          {pipeline.demoFixture && (
            <button
              type="button"
              className="automation-directory-row"
              onClick={() => setView("real")}
            >
              <span>
                <strong>Acompanhamento de proposta</strong>
                <small>
                  Entrada em{" "}
                  {pipeline.stages.find(
                    (s) => s.id === pipeline.demoFollowupStageId,
                  )?.name ?? "etapa configurada"}{" "}
                  → tarefa no dia seguinte · {pipeline.name}
                </small>
              </span>
              <span>
                <Badge tone="green">Funciona nesta demo</Badge>
                <small>
                  {pipeline.demoFollowupEnabled ? "Ativa" : "Pausada"}
                </small>
              </span>
            </button>
          )}
          {rules.map((r) => (
            <button
              type="button"
              className="automation-directory-row"
              key={r.id}
              onClick={() => start(r)}
            >
              <span>
                <strong>{r.name}</strong>
                <small>
                  {r.trigger === "STAGE_CHANGED"
                    ? `Entrada em ${pipeline.stages.find((s) => s.id === r.stageId)?.name ?? "etapa indisponível"}`
                    : r.trigger === "DEAL_CREATED"
                      ? "Novo negócio"
                      : r.trigger === "LEAD_CREATED"
                        ? "Novo lead"
                        : r.trigger === "DEAL_WON"
                          ? "Negócio ganho"
                          : "Negócio perdido"}{" "}
                  → {actions[r.action]} · {pipeline.name}
                </small>
              </span>
              <span>
                <Badge tone="amber">Simulação</Badge>
                <small>Rascunho salvo · não executável</small>
              </span>
            </button>
          ))}
          <details className="automation-recipes">
            <summary>Começar com uma receita</summary>
            <Field id="automation-template" label="Receita de automação">
              <Select
                id="automation-template"
                value={recipe}
                onChange={(e) => setRecipe(e.target.value as Rule["action"])}
              >
                {Object.entries(actions).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              variant="secondary"
              onClick={() => start(newRule(pipeline, recipe))}
            >
              Usar receita
            </Button>
          </details>
        </section>
      ) : view === "editor" && draft ? (
        <>
          <div className="crm-section-top">
            <h2>Editar automação</h2>
            <Button
              variant="ghost"
              onClick={() => protect(() => setView("list"))}
            >
              Voltar às automações
            </Button>
          </div>
          {dirty && <p className="field-hint">Alterações não salvas.</p>}
          <AutomationEditor
            draft={draft}
            setDraft={setDraft}
            pipeline={pipeline}
            templates={templates}
            history={history}
            onTest={(test) => {
              const next = [test, ...history].slice(0, 8);
              if (persist(rules, next)) setHistory(next);
            }}
            onCancel={() => {
              setDraft(null);
              setView("list");
              setNotice("Alterações canceladas.");
            }}
            onSave={() => {
              const saved = { ...draft, enabled: false };
              const next = rules.some((r) => r.id === saved.id)
                ? rules.map((r) => (r.id === saved.id ? saved : r))
                : [...rules, saved];
              if (persist(next)) {
                setRules(next);
                setDraft(saved);
                setBaseline(JSON.stringify(saved));
                setNotice(
                  "Rascunho salvo neste navegador. Nenhuma regra real foi ativada.",
                );
              }
            }}
          />
        </>
      ) : view === "templates" ? (
        <MessageTemplates items={templates} onSave={saveTemplates} />
      ) : view === "assistant" && session ? (
        <Assistant
          pipelines={pipelines}
          templates={templates}
          user={session.user}
          onDraft={(r, pid) => protect(() => onGenerated(r, pid))}
        />
      ) : view === "real" ? (
        <>
          <Button variant="ghost" onClick={() => setView("list")}>
            Voltar às automações
          </Button>
          <DemoFollowup pipeline={pipeline} expanded />
        </>
      ) : (
        <section className="message-library">
          <h2>Regras por etapa · demonstração</h2>
          <p>Campos obrigatórios de exemplo. Não bloqueiam o Kanban.</p>
          {pipeline.stages.map((s) => (
            <details key={s.id}>
              <summary>
                {s.position + 1} · {s.name}
              </summary>
              {[
                ["value", "Valor da negociação"],
                ["contact", "Contato vinculado"],
                ["closeDate", "Previsão de fechamento"],
                ["nextActivity", "Próxima atividade agendada"],
              ].map(([id, label]) => (
                <label className="crm-checkbox" key={id}>
                  <input
                    type="checkbox"
                    checked={requirements[s.id ?? ""]?.includes(id) ?? false}
                    onChange={(e) => {
                      const next = {
                        ...requirements,
                        [s.id!]: e.target.checked
                          ? [...(requirements[s.id!] ?? []), id]
                          : (requirements[s.id!] ?? []).filter((v) => v !== id),
                      };
                      setRequirements(next);
                    }}
                  />
                  {label}
                </label>
              ))}
            </details>
          ))}
          <Button
            onClick={() => {
              if (persist(rules))
                setNotice(
                  "Regras de exemplo salvas; o Kanban não aplica esses bloqueios.",
                );
            }}
          >
            Salvar regras da etapa
          </Button>
        </section>
      )}
      <Dialog
        open={!!pending}
        title="Substituir alterações não salvas?"
        description="Seu rascunho tem alterações. Salve antes de continuar ou confirme que deseja descartá-las."
        onClose={() => setPending(null)}
      >
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setPending(null)}>
            Continuar editando
          </Button>
          <Button
            onClick={() => {
              const action = pending;
              setPending(null);
              setDraft(null);
              action?.();
            }}
          >
            Descartar e continuar
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
