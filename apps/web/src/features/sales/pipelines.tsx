"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  GitBranch,
  GripVertical,
  Plus,
  Trash2,
  Workflow,
} from "lucide-react";
import {
  Alert,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingPage,
  PageHeading,
  Select,
} from "@/components/ui/primitives";
import { useSession } from "@/components/providers";
import { PermissionNotice } from "@/features/settings/company";
import { api, errorMessage, patch, post } from "@/lib/api";
import { defaults, type Pipeline, type Stage } from "./types";
import { usePipelines, useSalesInvalidation } from "./shared";
export function Pipelines() {
  const { data: session } = useSession();
  const result = usePipelines();
  const canManage = session?.permissions.includes("pipelines.manage");
  return (
    <div className="page-stack">
      <PageHeading
        title="Pipelines"
        description="Defina os caminhos comerciais e as etapas de cada negociação."
        action={
          canManage && (
            <Link className="btn btn-primary" href="/sales/pipelines/new">
              <Plus size={16} />
              Novo pipeline
            </Link>
          )
        }
      />
      {result.isPending ? (
        <LoadingPage />
      ) : result.isError ? (
        <ErrorState error={result.error} retry={() => result.refetch()} />
      ) : !result.data.items.length ? (
        <EmptyState
          icon={<GitBranch size={26} />}
          title="Seu primeiro funil"
          description={
            canManage
              ? "Crie um pipeline para organizar suas oportunidades por etapa."
              : "Peça ao administrador para configurar o pipeline da sua empresa."
          }
          action={
            canManage && (
              <Link className="btn btn-primary" href="/sales/pipelines/new">
                Criar pipeline
              </Link>
            )
          }
        />
      ) : (
        <Card>
          <div className="sales-pipeline-list">
            {result.data.items.map((p) => (
              <div key={p.id}>
                <div>
                  <Link href={`/sales/board?pipelineId=${p.id}`}>
                    <strong>{p.name}</strong>
                  </Link>
                  <p>
                    {p.stages.length} etapas ·{" "}
                    {p.active ? "Ativo" : "Arquivado"}
                  </p>
                  <span>{p.stages.map((s) => s.name).join(" → ")}</span>
                </div>
                {canManage && (
                  <div className="sales-pipeline-actions">
                    <Link
                      className="btn btn-secondary"
                      href={`/sales/automations?pipelineId=${p.id}`}
                    >
                      <Workflow size={15} />
                      Automações
                    </Link>
                    <Link
                      className="btn btn-secondary"
                      href={`/sales/pipelines/${p.id}/edit`}
                    >
                      Configurar
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
export function PipelineEditor({ id }: { id?: string }) {
  const { data: session } = useSession();
  const result = useQuery({
    queryKey: ["sales", "pipeline", id],
    queryFn: () => api<{ item: Pipeline }>(`/sales/pipelines/${id}`),
    enabled: !!id,
  });
  if (!session) return null;
  if (!session.permissions.includes("pipelines.manage"))
    return <PermissionNotice />;
  if (id && result.isPending) return <LoadingPage />;
  if (result.isError)
    return <ErrorState error={result.error} retry={() => result.refetch()} />;
  return (
    <Editor key={result.data?.item.version ?? "new"} item={result.data?.item} />
  );
}
function Editor({ item }: { item?: Pipeline }) {
  const router = useRouter();
  const invalidate = useSalesInvalidation();
  const [name, setName] = useState(item?.name ?? "Vendas");
  const [description, setDescription] = useState(item?.description ?? "");
  const [active, setActive] = useState(item?.active ?? true);
  const [stages, setStages] = useState(() =>
    (item?.stages ?? defaults).map((s) => ({
      ...s,
      localKey: s.id ?? crypto.randomUUID(),
    })),
  );
  const original = useRef(
    JSON.stringify({
      name: item?.name ?? "Vendas",
      description: item?.description ?? "",
      active: item?.active ?? true,
      stages: item?.stages ?? defaults,
    }),
  );
  const dirty =
    JSON.stringify({
      name,
      description,
      active,
      stages: stages.map(({ localKey, ...s }) => s),
    }) !== original.current;
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const [insertAt, setInsertAt] = useState("end");
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [orderNotice, setOrderNotice] = useState("");
  const [focusKey, setFocusKey] = useState("");
  const saveLocked = useRef(false);
  const dragKey = useRef<string | null>(null);
  useEffect(() => {
    if (!focusKey) return;
    const index = stages.findIndex((s) => s.localKey === focusKey);
    document.getElementById(`stage-name-${index}`)?.focus();
    setFocusKey("");
  }, [focusKey, stages]);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const save = useMutation({
    mutationFn: () =>
      item
        ? patch<{ item: Pipeline }>(`/sales/pipelines/${item.id}`, {
            name,
            description: description || null,
            active,
            version: item.version,
            stages: stages.map(
              ({
                id,
                name,
                probability,
                color,
                staleDays,
                requireActivity,
              }) => ({
                id,
                name,
                probability,
                color,
                staleDays,
                requireActivity,
              }),
            ),
          })
        : post<{ item: Pipeline }>("/sales/pipelines", {
            name,
            description: description || null,
            stages: stages.map(
              ({
                id,
                name,
                probability,
                color,
                staleDays,
                requireActivity,
              }) => ({
                id,
                name,
                probability,
                color,
                staleDays,
                requireActivity,
              }),
            ),
          }),
    onSuccess: async () => {
      await invalidate();
      router.push("/sales/pipelines");
    },
    onSettled: () => {
      saveLocked.current = false;
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/sales/pipelines/${item!.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await invalidate();
      router.push("/sales/pipelines");
    },
  });
  function change(index: number, key: string, value: unknown) {
    setStages((v) =>
      v.map((s, i) => (i === index ? { ...s, [key]: value } : s)),
    );
  }
  function reorder(index: number, target: number) {
    if (target < 0 || target >= stages.length || index === target) return;
    const moved = stages[index];
    setStages((old) => {
      const next = [...old];
      const [entry] = next.splice(index, 1);
      next.splice(target, 0, entry!);
      return next;
    });
    setOrderNotice(
      `${moved.name || "Nova etapa"} agora é a etapa ${target + 1}. Salve para aplicar ao Kanban.`,
    );
  }
  function insert() {
    const index =
      insertAt === "end"
        ? stages.length
        : stages.findIndex((s) => s.localKey === insertAt);
    const localKey = crypto.randomUUID();
    setStages((old) => {
      const next = [...old];
      next.splice(Math.max(0, index), 0, {
        localKey,
        name: "",
        position: 0,
        probability: 0,
        color: "#173b68",
        staleDays: 7,
        requireActivity: false,
      });
      return next;
    });
    setFocusKey(localKey);
    setOrderNotice(
      `Nova etapa inserida na posição ${Math.max(0, index) + 1}. Dê um nome e salve.`,
    );
  }
  return (
    <form
      className="page-stack crm-record-form sales-record-form"
      onSubmit={(e) => {
        e.preventDefault();
        setFormError("");
        if (!stages.length || stages.some((s) => !s.name.trim()))
          return setFormError(
            "Informe pelo menos uma etapa e dê nome a todas elas.",
          );
        if (
          new Set(stages.map((s) => s.name.trim().toLocaleLowerCase())).size !==
          stages.length
        )
          return setFormError("Use nomes diferentes para cada etapa.");
        if (saveLocked.current) return;
        saveLocked.current = true;
        save.mutate();
      }}
    >
      <Link className="back-link" href="/sales/pipelines">
        <ArrowLeft size={15} />
        Voltar para pipelines
      </Link>
      <PageHeading
        title={item ? "Configurar pipeline" : "Novo pipeline"}
        description="Organize as etapas e defina a probabilidade de cada uma."
        action={
          item && (
            <Link
              className="btn btn-secondary"
              href={`/sales/automations?pipelineId=${item.id}`}
            >
              <Workflow size={16} />
              Automações e regras
            </Link>
          )
        }
      />
      {formError && <Alert>{formError}</Alert>}
      {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
      <Card className="sales-form-section">
        <div className="form-grid">
          <Field id="pipeline-name" label="Nome do pipeline">
            <Input
              id="pipeline-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              required
            />
          </Field>
          <Field id="pipeline-description" label="Descrição">
            <Input
              id="pipeline-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
          </Field>
        </div>
        {item && (
          <label className="crm-checkbox">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Pipeline ativo
          </label>
        )}
      </Card>
      <Card className="sales-form-section">
        <div className="crm-section-top">
          <div>
            <h2>Etapas de vendas</h2>
            <p>
              Arraste pela alça ou use as setas. Salvar aplica a ordem ao
              Kanban.
            </p>
          </div>
          <div className="stage-insert-controls">
            <Field id="stage-insert-position" label="Posição da nova etapa">
              <Select
                id="stage-insert-position"
                value={insertAt}
                onChange={(e) => setInsertAt(e.target.value)}
                disabled={save.isPending}
              >
                {stages.map((stage, i) => (
                  <option key={stage.localKey} value={stage.localKey}>
                    {i + 1} · Antes de {stage.name || "nova etapa"}
                  </option>
                ))}
                <option value="end">{stages.length + 1} · No final</option>
              </Select>
            </Field>
            <Button
              variant="secondary"
              disabled={stages.length >= 20 || save.isPending}
              onClick={insert}
            >
              <Plus size={15} />
              Adicionar etapa
            </Button>
          </div>
        </div>
        {orderNotice && (
          <p className="info-note" role="status">
            {orderNotice}
          </p>
        )}
        <p className="field-hint">
          Sequência:{" "}
          {stages
            .map((s, i) => `${i + 1}. ${s.name || "Nova etapa"}`)
            .join(" → ")}
        </p>
        {dirty && (
          <p className="info-note" role="status">
            Alterações não salvas. Salve para aplicar ou cancele para manter a
            versão anterior.
          </p>
        )}
        <div className="sales-stage-editor sales-stage-compact">
          {stages.map((s, i) => (
            <fieldset
              key={s.localKey}
              disabled={save.isPending}
              className={dropAt === i ? "stage-drop-target" : undefined}
              onDragOver={(e) => {
                if (dragKey.current) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setDropAt(i);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = stages.findIndex(
                  (stage) =>
                    stage.localKey ===
                    (e.dataTransfer.getData("text/plain") || dragKey.current),
                );
                if (from >= 0) reorder(from, i);
                setDropAt(null);
              }}
            >
              <legend className="sr-only">Etapa {i + 1}</legend>
              <div className="stage-compact-line">
                <span className="stage-position">{i + 1}</span>
                <button
                  type="button"
                  className="stage-drag-handle"
                  draggable={!save.isPending}
                  aria-label={`Arrastar etapa ${s.name || i + 1}`}
                  onDragStart={(e) => {
                    dragKey.current = s.localKey;
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", s.localKey);
                  }}
                  onDragEnd={() => {
                    dragKey.current = null;
                    setDropAt(null);
                  }}
                >
                  <GripVertical size={18} />
                </button>
                <div className="sales-stage-fields">
                  <Field id={`stage-color-${i}`} label="Cor">
                    <Input
                      id={`stage-color-${i}`}
                      type="color"
                      value={s.color}
                      onChange={(e) => change(i, "color", e.target.value)}
                    />
                  </Field>

                  <Field id={`stage-name-${i}`} label="Nome da etapa">
                    <Input
                      id={`stage-name-${i}`}
                      value={s.name}
                      onChange={(e) => change(i, "name", e.target.value)}
                      required
                      maxLength={100}
                    />
                  </Field>
                </div>
                <div className="sales-stage-controls">
                  <div>
                    <Button
                      variant="ghost"
                      disabled={i === 0}
                      aria-label={`Mover ${s.name || "etapa"} para cima`}
                      onClick={() => reorder(i, i - 1)}
                    >
                      <ArrowUp size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={i === stages.length - 1}
                      aria-label={`Mover ${s.name || "etapa"} para baixo`}
                      onClick={() => reorder(i, i + 1)}
                    >
                      <ArrowDown size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={stages.length === 1}
                      aria-label={`Remover etapa ${s.name || i + 1}`}
                      onClick={() =>
                        setStages((v) => v.filter((_, j) => j !== i))
                      }
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
              <details className="stage-advanced">
                <summary>Detalhes avançados</summary>
                <div className="form-grid">
                  {" "}
                  <Field id={`stage-prob-${i}`} label="Probabilidade (%)">
                    <Input
                      id={`stage-prob-${i}`}
                      type="number"
                      min={0}
                      max={100}
                      value={s.probability}
                      onChange={(e) =>
                        change(i, "probability", Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field id={`stage-days-${i}`} label="Dias sem avanço">
                    <Input
                      id={`stage-days-${i}`}
                      type="number"
                      min={1}
                      max={365}
                      value={s.staleDays}
                      onChange={(e) =>
                        change(i, "staleDays", Number(e.target.value))
                      }
                    />
                  </Field>
                </div>{" "}
                <label className="crm-checkbox">
                  <input
                    type="checkbox"
                    checked={s.requireActivity}
                    onChange={(e) =>
                      change(i, "requireActivity", e.target.checked)
                    }
                  />
                  Exigir próxima atividade ao mover para esta etapa
                </label>
              </details>
            </fieldset>
          ))}
        </div>
      </Card>
      <div className="form-actions">
        <div>
          <Link className="btn btn-secondary" href="/sales/pipelines">
            Cancelar
          </Link>
          {item && (
            <Button variant="danger" onClick={() => setRemoveOpen(true)}>
              Excluir pipeline
            </Button>
          )}
        </div>
        <Button type="submit" loading={save.isPending}>
          Salvar pipeline
        </Button>
      </div>
      <Dialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title="Excluir pipeline?"
        description="A exclusão é possível apenas quando não há oportunidades vinculadas, inclusive na lixeira."
      >
        {remove.isError && <Alert>{errorMessage(remove.error)}</Alert>}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setRemoveOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Confirmar exclusão
          </Button>
        </div>
      </Dialog>
    </form>
  );
}
