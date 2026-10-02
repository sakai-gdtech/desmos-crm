"use client";
import { useLayoutMotion, MotionCollection } from "@/components/ui/motion";
import { InfoHelp } from "@/components/ui/info-help";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEditorMemory } from "@/features/workspace/editor-memory";
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
      <Link className="back-link" href="/sales/board">
        <ArrowLeft size={15} />
        Voltar para negócios
      </Link>
      <PageHeading
        title="Funis e etapas"
        description="Defina os caminhos comerciais e as etapas de cada negociação."
        action={
          canManage && (
            <Link className="btn btn-primary" href="/sales/pipelines/new">
              <Plus size={16} />
              Novo funil
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
              ? "Crie um funil para organizar suas oportunidades por etapa."
              : "Peça ao administrador para configurar o funil da sua empresa."
          }
          action={
            canManage && (
              <Link className="btn btn-primary" href="/sales/pipelines/new">
                Criar funil
              </Link>
            )
          }
        />
      ) : (
        <Card>
          <MotionCollection
            className="sales-pipeline-list"
            motionKey={result.data.items.map((item) => item.id).join("|")}
          >
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
                      Editar etapas
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </MotionCollection>
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
  const params = useSearchParams();
  const returnTo =
    item && params.get("from") === "board"
      ? `/sales/board?pipelineId=${encodeURIComponent(item.id)}`
      : "/sales/pipelines";
  const invalidate = useSalesInvalidation();
  type Draft = {
    name: string;
    description: string;
    active: boolean;
    stages: (Stage & { localKey: string })[];
  };
  const memory = useEditorMemory<Draft>(
    `pipeline:${item?.id ?? "new"}:${item?.version ?? "new"}`,
  );
  const [recovered] = useState(() => memory.read());
  const [name, setName] = useState(recovered?.name ?? item?.name ?? "Vendas");
  const [description, setDescription] = useState(
    recovered?.description ?? item?.description ?? "",
  );
  const [active, setActive] = useState(
    recovered?.active ?? item?.active ?? true,
  );
  const [stages, setStages] = useState(
    () =>
      recovered?.stages ??
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
  const latest = useRef({ dirty, name, description, active, stages });
  latest.current = { dirty, name, description, active, stages };
  const discarded = useRef(false);
  const memoryRef = useRef(memory);
  useEffect(
    () => () => {
      if (latest.current.dirty && !discarded.current)
        memoryRef.current.write(latest.current);
    },
    [],
  );
  const [leaveTo, setLeaveTo] = useState("");
  const leave = () => {
    if (saveLocked.current) return;
    dirty ? setLeaveTo(returnTo) : router.push(returnTo);
  };
  useEffect(() => {
    if (!dirty) return;
    const clicked = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const target = new URL(link.href, location.href);
      if (
        target.origin !== location.origin ||
        (target.pathname === location.pathname &&
          target.search === location.search)
      )
        return;
      event.preventDefault();
      if (saveLocked.current) return;
      setLeaveTo(`${target.pathname}${target.search}${target.hash}`);
    };
    document.addEventListener("click", clicked, true);
    return () => document.removeEventListener("click", clicked, true);
  }, [dirty]);
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
  const stagesRef = useRef<HTMLDivElement>(null);
  const captureStages = useLayoutMotion(
    stagesRef,
    stages.map((stage) => stage.localKey).join("|"),
  );
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
      discarded.current = true;
      memory.clear();
      await invalidate();
      router.push(returnTo);
    },
    onSettled: () => {
      saveLocked.current = false;
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/sales/pipelines/${item!.id}`, { method: "DELETE" }),
    onSuccess: async () => {
      discarded.current = true;
      memory.clear();
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
    captureStages();
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
    captureStages();
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
      className="page-stack crm-record-form sales-record-form pipeline-editor"
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
      <button
        type="button"
        className="back-link"
        onClick={leave}
        disabled={save.isPending}
      >
        <ArrowLeft size={15} />
        {params.get("from") === "board"
          ? "Voltar para negócios"
          : "Voltar para funis"}
      </button>
      <PageHeading
        title={item ? "Editar funil" : "Novo funil"}
        description={item?.name ?? "Seu processo de vendas."}
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
      {recovered && (
        <Alert success>
          Retomamos as alterações desta sessão. Salve para aplicar.
        </Alert>
      )}
      {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
      <Card className="sales-form-section pipeline-basics">
        <fieldset className="pipeline-basics-grid" disabled={save.isPending}>
          <Field id="pipeline-name" label="Nome do funil">
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
          {item && (
            <div className="pipeline-active">
              <label className="crm-checkbox">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />
                Funil ativo
              </label>
              <InfoHelp title="Funil ativo" disabled={save.isPending}>
                Desativar impede criar novos negócios neste funil. Os registros
                existentes permanecem disponíveis.
              </InfoHelp>
            </div>
          )}
        </fieldset>
      </Card>
      <Card className="sales-form-section pipeline-stages-panel">
        <div className="pipeline-stages-heading">
          <div>
            <GitBranch size={18} aria-hidden="true" />
            <h2>Etapas de vendas</h2>
            <span>{stages.length} etapas</span>
          </div>
          <InfoHelp title="Ordem das etapas" disabled={save.isPending}>
            Arraste pela alça ou use as setas para reordenar. Escolha uma
            posição abaixo para inserir. Salvar aplica a sequência ao Kanban;
            renomear ou reordenar mantém os vínculos dos negócios e das regras.
          </InfoHelp>
        </div>
        {orderNotice && (
          <p className="sr-only" role="status">
            {orderNotice}
          </p>
        )}
        <div className="pipeline-stage-columns" aria-hidden="true">
          <span>Cor</span>
          <span>Nome da etapa</span>
        </div>
        <div ref={stagesRef} className="sales-stage-editor sales-stage-compact">
          {stages.map((s, i) => (
            <fieldset
              data-motion-key={s.localKey}
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
                      placeholder="Nome da etapa"
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
                      onClick={() => {
                        captureStages();
                        setStages((v) => v.filter((_, j) => j !== i));
                        if (insertAt === s.localKey) setInsertAt("end");
                        setFocusKey(
                          stages[i + 1]?.localKey ??
                            stages[i - 1]?.localKey ??
                            "",
                        );
                        setOrderNotice(
                          `${s.name || "Etapa"} removida. Salve para aplicar.`,
                        );
                      }}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </div>
              <details className="stage-advanced">
                <summary
                  aria-label={`Detalhes avançados de ${s.name || `etapa ${i + 1}`}`}
                >
                  Detalhes avançados
                </summary>
                <div className="pipeline-advanced-body">
                  <div className="form-grid">
                    <div className="pipeline-advanced-field">
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
                      <InfoHelp title="Probabilidade" disabled={save.isPending}>
                        Estimativa de chance de ganho nesta etapa. Compõe o
                        valor ponderado do negócio; não garante uma venda.
                      </InfoHelp>
                    </div>
                    <div className="pipeline-advanced-field">
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
                      <InfoHelp
                        title="Dias sem avanço"
                        disabled={save.isPending}
                      >
                        Tempo parado na etapa para sinalizar atenção no Radar
                        Comercial. Não envia mensagens nem move o negócio
                        automaticamente.
                      </InfoHelp>
                    </div>
                  </div>
                  <div className="pipeline-activity-setting">
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
                    <InfoHelp
                      title="Próxima atividade"
                      disabled={save.isPending}
                    >
                      Exige uma tarefa ou atividade futura pendente antes de
                      mover o negócio para esta etapa. Concluir ou reagendar o
                      compromisso pode exigir outra próxima ação.
                    </InfoHelp>
                  </div>
                </div>
              </details>
            </fieldset>
          ))}
        </div>
        <div className="stage-insert-controls pipeline-insert">
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
      </Card>
      <div className="form-actions pipeline-actions">
        <div className="pipeline-save-summary">
          <span
            className="pipeline-save-status"
            role="status"
            data-dirty={dirty}
          >
            {save.isPending
              ? "Salvando…"
              : dirty
                ? "Alterações não salvas"
                : "Sem alterações"}
          </span>
          <InfoHelp title="Alterações do funil" disabled={save.isPending}>
            Salvar aplica os dados e a ordem ao Kanban. O rascunho desta sessão
            pode ser retomado ao navegar; recarregar ou sair da conta encerra
            essa recuperação.
          </InfoHelp>
        </div>
        <div className="pipeline-actions-buttons">
          <Button variant="secondary" onClick={leave} disabled={save.isPending}>
            Cancelar
          </Button>
          {item && (
            <Button
              variant="danger"
              onClick={() => setRemoveOpen(true)}
              disabled={save.isPending}
            >
              Excluir funil
            </Button>
          )}
          <Button type="submit" loading={save.isPending}>
            Salvar funil
          </Button>
        </div>
      </div>
      <Dialog
        open={!!leaveTo}
        onClose={() => setLeaveTo("")}
        title="Descartar alterações do funil?"
        description="A ordem e os dados editados ainda não foram aplicados. Continue editando ou descarte para sair."
      >
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setLeaveTo("")}>
            Continuar editando
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              discarded.current = true;
              memory.clear();
              router.push(leaveTo);
              setLeaveTo("");
            }}
          >
            Descartar alterações
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title="Excluir funil?"
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
