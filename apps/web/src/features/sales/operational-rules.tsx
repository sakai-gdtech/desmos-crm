"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  useQuery,
  useMutation,
  useMutationState,
  useQueryClient,
} from "@tanstack/react-query";
import { useSession } from "@/components/providers";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  PageHeading,
  ErrorState,
  LoadingPage,
  Dialog,
} from "@/components/ui/primitives";
import { MotionCollection } from "@/components/ui/motion";
import {
  useEditorMemory,
  useRememberedState,
} from "@/features/workspace/editor-memory";
import { PermissionNotice } from "@/features/settings/company";
import { api, post, patch, errorMessage } from "@/lib/api";
import { formatDate } from "@/lib/types";
import { usePipelines } from "./shared";
import type { Pipeline } from "./types";
type Rule = {
  id: string;
  pipelineId: string;
  stageId: string | null;
  name: string;
  trigger: "STAGE" | "INACTIVITY" | "OVERDUE";
  days: number;
  taskTitle: string;
  enabled: boolean;
  version: number;
  executions: number;
};
type Directory = {
  items: Rule[];
  runs: {
    ruleId: string;
    dealId: string;
    dealTitle: string;
    taskId: string;
    taskTitle: string;
    createdAt: string;
  }[];
};
type RuleDraft = Partial<Rule> & { editorId?: string };
const triggers = {
  STAGE: "Entrada na etapa",
  INACTIVITY: "Negócio sem atualização",
  OVERDUE: "Compromisso atrasado",
};
export function OperationalRules() {
  const params = useSearchParams();
  const { data: session } = useSession();
  const pipelines = usePipelines();
  const [selected, setSelected] = useRememberedState(
    "internal-rules:pipeline",
    params.get("pipelineId") ?? "",
    !!params.get("pipelineId"),
  );
  const pipeline =
    pipelines.data?.items.find((p) => p.id === selected) ??
    pipelines.data?.items.find((p) => p.active);
  if (!session) return null;
  if (!session.permissions.includes("pipelines.manage"))
    return <PermissionNotice />;
  if (pipelines.isPending) return <LoadingPage />;
  if (pipelines.isError)
    return (
      <ErrorState error={pipelines.error} retry={() => pipelines.refetch()} />
    );
  return (
    <div className="page-stack automation-page commercial-tools-page">
      <PageHeading
        title="Tarefas e avisos automáticos"
        description="Regras persistidas para o trabalho interno da equipe. Sem email ou WhatsApp automático."
      />
      <Link
        href={`/sales/automations${pipeline ? `?pipelineId=${pipeline.id}` : ""}`}
        className="text-link"
      >
        Voltar às automações
      </Link>
      <Field id="real-pipeline" label="Funil">
        <Select
          id="real-pipeline"
          value={pipeline?.id ?? ""}
          onChange={(e) => setSelected(e.target.value)}
        >
          {pipelines.data?.items
            .filter((p) => p.active)
            .map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
        </Select>
      </Field>
      {pipeline ? (
        <RuleWorkspace key={pipeline.id} pipeline={pipeline} />
      ) : (
        <p>Crie um funil ativo para começar.</p>
      )}
    </div>
  );
}
function RuleWorkspace({ pipeline }: { pipeline: Pipeline }) {
  const { data: session } = useSession();
  const cache = useQueryClient();
  const saveKey = [
    "sales",
    "rules",
    "save",
    session?.tenant.id,
    session?.user.id,
    pipeline.id,
  ];
  const recovery = useEditorMemory(`internal-rules:${pipeline.id}:draft`);
  const result = useQuery({
    queryKey: ["sales", "rules", pipeline.id],
    queryFn: () => api<Directory>(`/sales/rules?pipelineId=${pipeline.id}`),
  });
  const [draft, setDraft] = useRememberedState<RuleDraft | null>(
    `internal-rules:${pipeline.id}:draft`,
    null,
  );
  const [baseline, setBaseline] = useRememberedState(
    `internal-rules:${pipeline.id}:baseline`,
    "",
  );
  const [discardOpen, setDiscardOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [step, setStep] = useRememberedState(
    `internal-rules:${pipeline.id}:step`,
    1,
  );
  const dirty = !!draft && JSON.stringify(draft) !== baseline;
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const save = useMutation({
    mutationKey: saveKey,
    mutationFn: (submitted: RuleDraft) => {
      const data = {
        pipelineId: pipeline.id,
        stageId: submitted.stageId ?? null,
        name: submitted.name,
        trigger: submitted.trigger,
        days: submitted.days,
        taskTitle: submitted.taskTitle,
        enabled: submitted.enabled,
        ...(submitted.id ? { version: submitted.version } : {}),
      };
      return submitted.id
        ? patch(`/sales/rules/${submitted.id}`, data)
        : post("/sales/rules", data);
    },
    onSuccess: async () => {
      // Also clear when the request finishes after ordinary navigation/unmount.
      recovery.clear();
      setDraft(null);
      setNotice(
        "Regra salva no servidor. Próximos eventos usarão esta configuração.",
      );
      await cache.invalidateQueries({ queryKey: ["sales", "rules"] });
    },
  });
  const submissions = useMutationState({
    filters: { mutationKey: saveKey, exact: true },
    select: (mutation) => ({
      status: mutation.state.status,
      error: mutation.state.error,
      editorId: (mutation.state.variables as RuleDraft | undefined)?.editorId,
    }),
  });
  const isSaving = submissions.some(
    (submission) => submission.status === "pending",
  );
  const currentSubmission = submissions
    .filter(
      (submission) =>
        !!draft?.editorId && submission.editorId === draft.editorId,
    )
    .at(-1);
  const saveError =
    currentSubmission?.status === "error" ? currentSubmission.error : null;
  const savedCurrentDraft =
    !!draft?.editorId &&
    submissions.some(
      (submission) =>
        submission.status === "success" &&
        submission.editorId === draft.editorId,
    );
  useEffect(() => {
    if (!savedCurrentDraft) return;
    recovery.clear();
    setDraft(null);
    setNotice(
      "Regra salva no servidor. Próximos eventos usarão esta configuração.",
    );
  }, [savedCurrentDraft]);
  const scan = useMutation({
    mutationFn: () => post("/sales/rules/scan", { pipelineId: pipeline.id }),
    onSuccess: async () => {
      setNotice(
        "Atrasos e inatividade verificados. Regras de etapa executam ao mover um negócio.",
      );
      await cache.invalidateQueries({ queryKey: ["sales"] });
      await cache.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
  const open = (rule?: Rule) => {
    save.reset();
    setStep(1);
    const value = rule
      ? { ...rule }
      : {
          pipelineId: pipeline.id,
          name: "",
          trigger: "STAGE" as const,
          stageId: pipeline.stages[0]?.id ?? null,
          days: 1,
          taskTitle: "Acompanhar negociação",
          enabled: false,
        };
    const next = { ...value, editorId: crypto.randomUUID() };
    setDraft(next);
    setBaseline(JSON.stringify(next));
  };
  const edit = (values: Partial<Rule>) =>
    setDraft((d) => ({ ...d, ...values }));
  if (result.isPending) return <LoadingPage />;
  if (result.isError)
    return <ErrorState error={result.error} retry={() => result.refetch()} />;
  return (
    <>
      {notice && <Alert success>{notice}</Alert>}
      {draft ? (
        <Card className="automation-focused-editor">
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (cache.isMutating({ mutationKey: saveKey, exact: true }))
                return;
              if (step === 1) setStep(2);
              else {
                const submitted = {
                  ...draft,
                  editorId: draft.editorId ?? crypto.randomUUID(),
                };
                setDraft(submitted);
                save.mutate(submitted);
              }
            }}
          >
            <div className="crm-section-top">
              <h2>{draft.id ? "Editar regra" : "Nova regra"}</h2>
              <span>Passo {step} de 2</span>
            </div>
            <p className="field-hint">
              Alterações ficam nesta sessão ao navegar. Use Salvar regra para
              persistir no servidor; recarregar encerra a edição não salva.
            </p>
            {step === 1 ? (
              <>
                <Field id="real-name" label="Nome da regra">
                  <Input
                    id="real-name"
                    required
                    maxLength={100}
                    value={draft.name}
                    onChange={(e) => edit({ name: e.target.value })}
                  />
                </Field>
                <Field id="real-trigger" label="Quando">
                  <Select
                    id="real-trigger"
                    value={draft.trigger}
                    onChange={(e) =>
                      edit({
                        trigger: e.target.value as Rule["trigger"],
                        stageId:
                          e.target.value === "STAGE"
                            ? (pipeline.stages[0]?.id ?? null)
                            : null,
                      })
                    }
                  >
                    {Object.entries(triggers).map(([v, label]) => (
                      <option key={v} value={v}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                {draft.trigger === "STAGE" && (
                  <Field id="real-stage" label="Etapa">
                    <Select
                      id="real-stage"
                      value={draft.stageId ?? ""}
                      required
                      onChange={(e) => edit({ stageId: e.target.value })}
                    >
                      {pipeline.stages.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <Field
                  id="real-days"
                  label={
                    draft.trigger === "INACTIVITY"
                      ? "Dias sem atualização e prazo da nova tarefa"
                      : "Prazo da nova tarefa, em dias"
                  }
                >
                  <Input
                    id="real-days"
                    type="number"
                    min={1}
                    max={365}
                    required
                    value={draft.days}
                    onChange={(e) => edit({ days: Number(e.target.value) })}
                  />
                </Field>
                <Field id="real-title" label="Título da tarefa">
                  <Input
                    id="real-title"
                    maxLength={160}
                    required
                    value={draft.taskTitle}
                    onChange={(e) => edit({ taskTitle: e.target.value })}
                  />
                </Field>
              </>
            ) : (
              <>
                <h3>Revise antes de ativar</h3>
                <dl className="crm-data-list">
                  <div>
                    <dt>Regra</dt>
                    <dd>{draft.name}</dd>
                  </div>
                  <div>
                    <dt>Quando</dt>
                    <dd>
                      {triggers[draft.trigger!]}
                      {draft.stageId
                        ? ` · ${pipeline.stages.find((s) => s.id === draft.stageId)?.name}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Então</dt>
                    <dd>
                      Criar “{draft.taskTitle}” para daqui a {draft.days}{" "}
                      {draft.days === 1 ? "dia" : "dias"} e avisar o responsável
                      internamente.
                    </dd>
                  </div>
                </dl>
                <p>
                  Uma execução por negócio nesta regra, mesmo se ele retornar à
                  etapa. Usa o responsável ativo do negócio; sem responsável
                  disponível, usa quem salvou a regra. Execuções anteriores
                  conservam suas tarefas.
                </p>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    disabled={isSaving}
                    checked={draft.enabled}
                    onChange={(e) => edit({ enabled: e.target.checked })}
                  />
                  Ativar para próximos eventos
                </label>
              </>
            )}
            {saveError && <Alert>{errorMessage(saveError)}</Alert>}
            <div className="dialog-actions">
              <Button
                variant="secondary"
                disabled={isSaving}
                onClick={() => {
                  if (dirty) setDiscardOpen(true);
                  else setDraft(null);
                }}
              >
                Cancelar
              </Button>
              {step === 2 && (
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  disabled={isSaving}
                >
                  Voltar
                </Button>
              )}
              <Button type="submit" loading={isSaving}>
                {step === 1 ? "Revisar regra" : "Salvar regra"}
              </Button>
            </div>
          </form>
          <Dialog
            open={discardOpen}
            onClose={() => setDiscardOpen(false)}
            title="Descartar alterações?"
          >
            <p>A configuração salva no servidor será mantida.</p>
            <div className="dialog-actions">
              <Button variant="secondary" onClick={() => setDiscardOpen(false)}>
                Continuar editando
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setDraft(null);
                  setDiscardOpen(false);
                }}
              >
                Descartar alterações
              </Button>
            </div>
          </Dialog>
        </Card>
      ) : (
        <>
          <div className="crm-section-top">
            <div>
              <h2>Regras de {pipeline.name}</h2>
              <p>{result.data.items.length} regras persistidas no servidor</p>
            </div>
            <Button onClick={() => open()}>Criar regra interna</Button>
          </div>
          <MotionCollection
            motionKey={result.data.items
              .map((r) => `${r.id}:${r.version}`)
              .join("|")}
          >
            {result.data.items.map((rule) => (
              <button
                key={rule.id}
                type="button"
                className="automation-directory-row"
                onClick={() => open(rule)}
              >
                <span>
                  <strong>{rule.name}</strong>
                  <small>
                    {triggers[rule.trigger]} → tarefa e aviso interno ·{" "}
                    {rule.executions} execuções
                  </small>
                </span>
                <Badge tone={rule.enabled ? "green" : "neutral"}>
                  {rule.enabled ? "Ativa" : "Pausada"}
                </Badge>
              </button>
            ))}
          </MotionCollection>
          {!result.data.items.length && (
            <p className="muted">
              Crie uma regra de etapa, inatividade ou atraso. Cada tarefa e
              aviso ficará ligado ao negócio.
            </p>
          )}
          <p className="field-hint">
            Inatividade usa a última atualização do negócio. Verificação a cada
            minuto enquanto a API estiver ativa.
          </p>
          <Button
            variant="secondary"
            loading={scan.isPending}
            onClick={() => scan.mutate()}
          >
            Verificar atrasos e inatividade agora
          </Button>
          {scan.isError && <Alert>{errorMessage(scan.error)}</Alert>}
          <section className="radar-section">
            <h2>Execuções recentes</h2>
            {result.data.runs.length ? (
              <ul className="crm-related-list">
                {result.data.runs.map((run) => (
                  <li key={`${run.ruleId}:${run.dealId}`}>
                    <div>
                      <Link
                        href={`/sales/tasks/${run.taskId}`}
                        className="text-link"
                      >
                        {run.taskTitle}
                      </Link>
                      <p>
                        {run.dealTitle} ·{" "}
                        {formatDate(run.createdAt, session?.tenant.timezone)}
                      </p>
                    </div>
                    <Link
                      href={`/sales/deals/${run.dealId}`}
                      className="text-link"
                    >
                      Abrir negócio
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                Nenhuma execução. Salvar uma regra de etapa não executa
                retroativamente.
              </p>
            )}
          </section>
        </>
      )}
    </>
  );
}
