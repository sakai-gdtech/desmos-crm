"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  GitBranch,
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
  const [stages, setStages] = useState<Stage[]>(item?.stages ?? defaults);
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
            stages: stages.map(({ position, ...s }) => s),
          })
        : post<{ item: Pipeline }>("/sales/pipelines", {
            name,
            description: description || null,
            stages: stages.map(({ position, ...s }) => s),
          }),
    onSuccess: async () => {
      await invalidate();
      router.push("/sales/pipelines");
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
  function reorder(index: number, delta: number) {
    setStages((old) => {
      const v = [...old];
      [v[index], v[index + delta]] = [v[index + delta], v[index]];
      return v;
    });
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
            <p>A ordem abaixo será a ordem das colunas no Kanban.</p>
          </div>
          <Button
            variant="secondary"
            disabled={stages.length >= 20}
            onClick={() =>
              setStages((v) => [
                ...v,
                {
                  name: "",
                  position: v.length,
                  probability: 0,
                  color: "#4f46e5",
                  staleDays: 7,
                  requireActivity: false,
                },
              ])
            }
          >
            <Plus size={15} />
            Adicionar etapa
          </Button>
        </div>
        <div className="sales-stage-editor">
          {stages.map((s, i) => (
            <fieldset key={s.id ?? `new-${i}`}>
              <legend>Etapa {i + 1}</legend>
              <div className="sales-stage-fields">
                <Field id={`stage-name-${i}`} label="Nome da etapa">
                  <Input
                    id={`stage-name-${i}`}
                    value={s.name}
                    onChange={(e) => change(i, "name", e.target.value)}
                    required
                    maxLength={100}
                  />
                </Field>
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
                <Field id={`stage-color-${i}`} label="Cor da etapa">
                  <Input
                    id={`stage-color-${i}`}
                    type="color"
                    value={s.color}
                    onChange={(e) => change(i, "color", e.target.value)}
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
              </div>
              <div className="sales-stage-controls">
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
                <div>
                  <Button
                    variant="ghost"
                    disabled={i === 0}
                    aria-label={`Mover ${s.name || "etapa"} para cima`}
                    onClick={() => reorder(i, -1)}
                  >
                    <ArrowUp size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={i === stages.length - 1}
                    aria-label={`Mover ${s.name || "etapa"} para baixo`}
                    onClick={() => reorder(i, 1)}
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
