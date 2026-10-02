"use client";
import { MotionCollection } from "@/components/ui/motion";
import { useRememberedState } from "@/features/workspace/editor-memory";
import Link from "next/link";
import { SalesNavigation } from "./navigation";
import { NextAction } from "./next-action";
import {
  CommercialFilters,
  commercialParams,
  type CommercialWindow,
} from "./commercial-filters";
import { Proposal } from "./proposal";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRightLeft,
  Check,
  GitBranch,
  History,
  List,
  MessageSquareText,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useSession } from "@/components/providers";
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
import { PermissionNotice } from "@/features/settings/company";
import {
  EntityPicker,
  Pagination,
  TableSkeleton,
  Tags,
  TemperatureBadge,
  useCrmReferences,
  useDebounced,
} from "@/features/crm/shared";
import { Notes } from "@/features/crm/notes";
import { CustomFields } from "@/features/crm/fields";
import { Timeline } from "@/features/crm/timeline";
import { api, errorMessage, patch, post } from "@/lib/api";
import { formatDate } from "@/lib/types";
import { money, type Deal, type Page } from "./types";
import {
  OwnerField,
  PipelineFields,
  SalesStatus,
  usePipelines,
  useSalesInvalidation,
} from "./shared";
import { RelatedWork } from "./work";
export function Deals() {
  const { data: session } = useSession();
  const params = useSearchParams();
  const pipelines = usePipelines();
  const [pipelineId, setPipelineId] = useRememberedState(
    "deals:pipeline",
    params.get("pipelineId") ?? "",
    !!params.get("pipelineId"),
  );
  const [search, setSearch] = useRememberedState("deals:search", "");
  const q = useDebounced(search);
  const [status, setStatus] = useRememberedState("deals:status", "");
  const [owner, setOwner] = useRememberedState("deals:owner", "");
  const [window, setWindow] = useRememberedState<CommercialWindow>(
    "deals:window",
    { source: "", from: "", to: "" },
  );
  const [page, setPage] = useRememberedState("deals:page", 1);
  const [deleted, setDeleted] = useRememberedState("deals:deleted", false);
  const query = new URLSearchParams({
    q,
    page: String(page),
    deleted: String(deleted),
    ...(pipelineId ? { pipelineId } : {}),
    ...(status ? { status } : {}),
    ...(owner ? { assignedTo: owner } : {}),
    ...commercialParams(window, session?.tenant.timezone ?? "UTC"),
  });
  const result = useQuery({
    queryKey: ["sales", "deals", "list", query.toString()],
    queryFn: () => api<Page<Deal>>(`/sales/deals?${query}`),
    enabled: !!session?.permissions.includes("deals.view"),
  });
  const invalidate = useSalesInvalidation();
  const restore = useMutation({
    mutationFn: (id: string) => post(`/sales/deals/${id}/restore`),
    onSuccess: () => invalidate(),
  });
  if (!session) return null;
  if (!session.permissions.includes("deals.view")) return <PermissionNotice />;
  return (
    <div className="page-stack">
      <PageHeading
        title={deleted ? "Negócios na lixeira" : "Negócios"}
        description="Consulte os valores, responsáveis e próximos passos das negociações."
        action={
          <div className="crm-detail-actions">
            {session.permissions.includes("deals.create") && (
              <Link className="btn btn-primary" href="/sales/deals/new">
                <Plus size={16} />
                Novo negócio
              </Link>
            )}
          </div>
        }
      />
      <SalesNavigation
        pipelineId={pipelineId}
        canManage={session.permissions.includes("pipelines.manage")}
      />
      <Card>
        <div className="crm-toolbar">
          <Input
            aria-label="Buscar oportunidades na lista"
            value={search}
            placeholder="Buscar por título"
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            aria-label="Filtrar pipeline"
            value={pipelineId}
            onChange={(e) => {
              setPipelineId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos os pipelines</option>
            {pipelines.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Filtrar status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todos os status</option>
            <option value="OPEN">Abertas</option>
            <option value="WON">Ganhas</option>
            <option value="LOST">Perdidas</option>
          </Select>
          {session.permissions.includes("deals.delete") && (
            <Button
              variant="ghost"
              onClick={() => {
                setDeleted((v) => !v);
                setPage(1);
              }}
            >
              <Trash2 size={15} />
              {deleted ? "Voltar à lista" : "Lixeira"}
            </Button>
          )}
        </div>
        <div className="sales-filters">
          <CommercialFilters
            prefix="deals"
            value={window}
            onChange={(value) => {
              setWindow(value);
              setPage(1);
            }}
            owner={owner}
            onOwner={(value) => {
              setOwner(value);
              setPage(1);
            }}
          />
        </div>
        {restore.isError && <Alert>{errorMessage(restore.error)}</Alert>}
        {result.isPending ? (
          <TableSkeleton />
        ) : result.isError ? (
          <ErrorState error={result.error} retry={() => result.refetch()} />
        ) : !result.data.items.length ? (
          <EmptyState
            icon={<List size={25} />}
            title="Nenhuma oportunidade encontrada"
            description={
              deleted
                ? "As oportunidades excluídas poderão ser restauradas aqui."
                : "Cadastre uma oportunidade ou ajuste os filtros para começar."
            }
          />
        ) : (
          <div
            className="table-scroll crm-table-scroll"
            role="region"
            aria-label="Lista de negócios"
            tabIndex={0}
          >
            <table className="data-table crm-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Etapa</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th>Responsável</th>
                  <th>{deleted ? "Ação" : "Próxima atividade"}</th>
                </tr>
              </thead>
              <MotionCollection
                as="tbody"
                motionKey={result.data.items.map((item) => item.id).join("|")}
              >
                {result.data.items.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Link
                        className="crm-record-link"
                        href={`/sales/deals/${d.id}`}
                      >
                        {d.title}
                      </Link>
                      <small className="muted">
                        {d.companyName || d.contactName}
                      </small>
                    </td>
                    <td>
                      {d.stageName}
                      <small className="muted">{d.pipelineName}</small>
                    </td>
                    <td>
                      <SalesStatus status={d.status} />
                    </td>
                    <td className="numeric">{money(d.value, d.currency)}</td>
                    <td>{d.assignedToName || "Sem responsável"}</td>
                    <td>
                      {deleted ? (
                        <Button
                          variant="secondary"
                          loading={
                            restore.isPending && restore.variables === d.id
                          }
                          onClick={() => restore.mutate(d.id)}
                        >
                          Restaurar
                        </Button>
                      ) : d.nextActivityAt ? (
                        formatDate(d.nextActivityAt, session.tenant.timezone)
                      ) : (
                        "Não agendada"
                      )}
                    </td>
                  </tr>
                ))}
              </MotionCollection>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          total={result.data?.total ?? 0}
          onChange={setPage}
        />
      </Card>
    </div>
  );
}
type FormValues = {
  title: string;
  pipelineId: string;
  stageId: string;
  contactId: string;
  companyId: string;
  value: string;
  currency: string;
  probability: string;
  expectedCloseDate: string;
  assignedTo: string;
  source: string;
  description: string;
  temperature: string;
  tagIds: string[];
};
export function DealForm({ id }: { id?: string }) {
  const { data: session } = useSession();
  const result = useQuery({
    queryKey: ["sales", "deals", id],
    queryFn: () => api<{ item: Deal }>(`/sales/deals/${id}`),
    enabled: !!id,
  });
  if (!session) return null;
  if (!session.permissions.includes(id ? "deals.update" : "deals.create"))
    return <PermissionNotice />;
  if (id && result.isPending) return <LoadingPage />;
  if (result.isError)
    return <ErrorState error={result.error} retry={() => result.refetch()} />;
  if (result.data?.item.deletedAt)
    return <Alert>Restaure a oportunidade antes de editar.</Alert>;
  return (
    <DealEditor
      item={result.data?.item}
      key={id ?? "new"}
      currency={session.tenant.currency}
      defaultOwner={session.user.id}
    />
  );
}
function DealEditor({
  item,
  currency,
  defaultOwner,
}: {
  item?: Deal;
  currency: string;
  defaultOwner: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const invalidate = useSalesInvalidation();
  const { tags } = useCrmReferences();
  const pipelines = usePipelines();
  const form = useForm<FormValues>({
    defaultValues: {
      title: item?.title ?? "",
      pipelineId: item?.pipelineId ?? params.get("pipelineId") ?? "",
      stageId: item?.stageId ?? "",
      contactId: item?.contactId ?? "",
      companyId: item?.companyId ?? "",
      value: item?.value ?? "0.00",
      currency: item?.currency ?? currency,
      probability: String(item?.probability ?? 10),
      expectedCloseDate: item?.expectedCloseDate ?? "",
      assignedTo: item ? (item.assignedTo ?? "") : defaultOwner,
      source: item?.source ?? "",
      description: item?.description ?? "",
      temperature: item?.temperature ?? "WARM",
      tagIds: item?.tags.map((t) => t.id) ?? [],
    },
  });
  const dirty = form.formState.dirtyFields;
  const pipelineId = form.watch("pipelineId");
  const stageId = form.watch("stageId");
  const selectedTags = form.watch("tagIds");
  useEffect(() => {
    if (!item && !pipelineId) {
      const first = pipelines.data?.items.find((p) => p.active);
      if (first) form.setValue("pipelineId", first.id);
    }
    if (!item && pipelineId && !stageId) {
      const s = pipelines.data?.items.find((p) => p.id === pipelineId)
        ?.stages[0];
      if (s) {
        form.setValue("stageId", s.id!);
        form.setValue("probability", String(s.probability));
      }
    }
  }, [pipelineId, stageId, pipelines.data, item, form]);
  const set = (key: keyof FormValues, value: any) =>
    form.setValue(key, value, { shouldDirty: true });
  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const body: Record<string, unknown> = {
        ...v,
        probability: Number(v.probability),
        contactId: v.contactId || null,
        companyId: v.companyId || null,
        assignedTo: v.assignedTo || null,
        expectedCloseDate: v.expectedCloseDate || null,
        source: v.source || null,
        description: v.description || null,
      };
      if (item) {
        for (const key of Object.keys(body))
          if (!dirty[key as keyof FormValues]) delete body[key];
        return patch<{ item: Deal }>(`/sales/deals/${item.id}`, {
          ...body,
          version: item.version,
        });
      }
      return post<{ item: Deal }>("/sales/deals", body);
    },
    onSuccess: async (data) => {
      await invalidate();
      router.push(`/sales/deals/${data.item.id}`);
    },
  });
  const input = (
    key: keyof FormValues,
    label: string,
    options: Record<string, any> = {},
  ) => (
    <Field
      id={`deal-${key}`}
      label={label}
      error={form.formState.errors[key]?.message as string}
    >
      <Input
        id={`deal-${key}`}
        {...form.register(
          key,
          options.required ? { required: "Preencha este campo." } : {},
        )}
        {...options}
      />
    </Field>
  );
  return (
    <form
      className="page-stack crm-record-form sales-record-form"
      onSubmit={form.handleSubmit((v) => save.mutate(v))}
    >
      <Link
        className="back-link"
        href={item ? `/sales/deals/${item.id}` : "/sales/deals"}
      >
        <ArrowLeft size={15} />
        Voltar para oportunidades
      </Link>
      <PageHeading
        title={item ? "Editar oportunidade" : "Novo negócio"}
        description="Defina o cliente, o valor e a etapa desta negociação."
      />
      {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
      <Card className="sales-form-section">
        <h2>Negociação</h2>
        <div className="form-grid">
          {input("title", "Nome do negócio", {
            required: true,
            maxLength: 200,
          })}
          {input("value", "Valor", {
            required: true,
            inputMode: "decimal",
            pattern: "[0-9]+([.][0-9]{1,2})?",
            placeholder: "0.00",
          })}
        </div>
        <PipelineFields
          pipelineId={pipelineId}
          stageId={stageId}
          onPipeline={(v) => set("pipelineId", v)}
          onStage={(v) => {
            set("stageId", v);
            const stage = pipelines.data?.items
              .find((p) => p.id === form.getValues("pipelineId"))
              ?.stages.find((s) => s.id === v);
            if (stage) set("probability", String(stage.probability));
          }}
        />
        <details className="more-details">
          <summary>Mais detalhes</summary>
          <div className="form-grid">
            {input("currency", "Moeda", {
              required: true,
              maxLength: 3,
              pattern: "[A-Z]{3}",
            })}
            {input("probability", "Probabilidade (%)", {
              type: "number",
              min: 0,
              max: 100,
              required: true,
            })}
            {input("expectedCloseDate", "Previsão de fechamento", {
              type: "date",
            })}
            <Field id="deal-temperature" label="Temperatura">
              <Select id="deal-temperature" {...form.register("temperature")}>
                <option value="COLD">Frio</option>
                <option value="WARM">Morno</option>
                <option value="HOT">Quente</option>
              </Select>
            </Field>
          </div>
        </details>
      </Card>
      <Card className="sales-form-section">
        <h2>Relacionamento</h2>
        <EntityPicker
          kind="companies"
          id="deal-company"
          label="Empresa cliente vinculada"
          value={form.watch("companyId")}
          onChange={(v) => set("companyId", v)}
          selectedName={item?.companyName}
        />
        <EntityPicker
          kind="contacts"
          id="deal-contact"
          label="Contato vinculado"
          value={form.watch("contactId")}
          onChange={(v) => set("contactId", v)}
          selectedName={item?.contactName}
        />
        <div className="form-grid">
          <OwnerField
            value={form.watch("assignedTo")}
            onChange={(v) => set("assignedTo", v)}
          />
        </div>
        <details className="more-details">
          <summary>Outros dados do relacionamento</summary>
          {input("source", "Origem", { maxLength: 100 })}
          <fieldset className="crm-tags-field">
            <legend>Tags</legend>
            {tags.data?.items.map((t) => (
              <label className="crm-checkbox" key={t.id}>
                <input
                  type="checkbox"
                  checked={selectedTags.includes(t.id)}
                  onChange={(e) =>
                    set(
                      "tagIds",
                      e.target.checked
                        ? [...selectedTags, t.id]
                        : selectedTags.filter((id) => id !== t.id),
                    )
                  }
                />
                {t.name}
              </label>
            ))}
          </fieldset>
          <Field id="deal-description" label="Descrição">
            <textarea
              className="input"
              id="deal-description"
              rows={5}
              maxLength={10000}
              {...form.register("description")}
            />
          </Field>
        </details>
      </Card>
      <div className="form-actions">
        <Link
          className="btn btn-secondary"
          href={item ? `/sales/deals/${item.id}` : "/sales/deals"}
        >
          Cancelar
        </Link>
        <Button
          type="submit"
          loading={save.isPending}
          disabled={!!item && !form.formState.isDirty}
        >
          Salvar negócio
        </Button>
      </div>
    </form>
  );
}
export function DealDetail({
  id,
  embedded = false,
  onClose,
}: {
  id: string;
  embedded?: boolean;
  onClose?: () => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const invalidate = useSalesInvalidation();
  const result = useQuery({
    queryKey: ["sales", "deals", id],
    queryFn: () => api<{ item: Deal }>(`/sales/deals/${id}`),
    enabled: !!session?.permissions.includes("deals.view"),
  });
  const [tab, setTab] = useState("history");
  const [proposalOpen, setProposalOpen] = useState(false);
  const [winOpen, setWinOpen] = useState(false);
  const gainLocked = useRef(false);
  const [lossOpen, setLossOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [message, setMessage] = useState("");
  const change = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      patch(`/sales/deals/${id}`, {
        ...body,
        version: result.data!.item.version,
      }),
    onSuccess: async () => {
      setLossOpen(false);
      setWinOpen(false);
      setMessage("Oportunidade atualizada.");
      await invalidate();
    },
    onError: () => invalidate(),
    onSettled: () => {
      gainLocked.current = false;
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/sales/deals/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await invalidate();
      if (onClose) onClose();
      else router.push("/sales/deals");
    },
  });
  if (!session) return null;
  if (!session.permissions.includes("deals.view")) return <PermissionNotice />;
  if (result.isPending) return <LoadingPage />;
  if (result.isError || !result.data)
    return <ErrorState error={result.error} retry={() => result.refetch()} />;
  const d = result.data.item;
  const canEdit = session.permissions.includes("deals.update") && !d.deletedAt;
  const dt = (label: string, value: React.ReactNode) => (
    <div key={label}>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
  return (
    <div className="page-stack crm-page">
      {!embedded && (
        <Link className="back-link" href="/sales/board">
          <ArrowLeft size={15} />
          Negócios
        </Link>
      )}
      <PageHeading
        title={d.title}
        description={
          [d.companyName, d.contactName].filter(Boolean).join(" · ") ||
          "Dados e histórico da negociação."
        }
        action={
          <div className="crm-detail-actions">
            {canEdit && (
              <Link
                className="btn btn-secondary"
                href={`/sales/deals/${id}/edit`}
              >
                <Pencil size={15} />
                Editar
              </Link>
            )}
            {!d.deletedAt && session.permissions.includes("deals.delete") && (
              <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={15} />
                Excluir
              </Button>
            )}
          </div>
        }
      />
      {message && <Alert success>{message}</Alert>}
      {change.isError && <Alert>{errorMessage(change.error)}</Alert>}
      {d.deletedAt && (
        <Alert>
          Esta oportunidade está na lixeira. Restaure-a pela lista para voltar a
          editar.
        </Alert>
      )}
      <div className="deal-essentials">
        <div>
          <span>Valor final</span>
          <strong>{money(d.value, d.currency)}</strong>
        </div>
        <div>
          <span>Etapa</span>
          <strong>{d.stageName}</strong>
        </div>
        <div>
          <span>Responsável</span>
          <strong>{d.assignedToName || "Sem responsável"}</strong>
        </div>
        <div>
          <span>Cliente</span>
          <strong>
            {d.companyName || d.contactName || d.leadName || "Não informado"}
          </strong>
        </div>
      </div>
      <NextAction deal={d} />
      <section className="proposal-access">
        <div>
          <h2>Proposta comercial</h2>
          <p>Itens, preços e valor final desta negociação.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setProposalOpen(!proposalOpen)}
        >
          {proposalOpen ? "Fechar proposta" : "Ver proposta"}
        </Button>
      </section>
      {proposalOpen && (
        <>
          <Proposal id={id} embedded />
          <Link className="text-link" href={`/sales/deals/${id}/proposal`}>
            Abrir proposta e catálogo
          </Link>
        </>
      )}
      <div className="crm-detail-grid">
        <Card className="crm-detail-summary">
          <div className="sales-value-heading">
            <SalesStatus status={d.status} />
            <strong>{money(d.value, d.currency)}</strong>
            <span>
              Valor ponderado: {money(d.weightedValue, d.currency)} ·{" "}
              {d.probability}%
            </span>
          </div>
          <details className="more-details">
            <summary>Mais detalhes do negócio</summary>
            <dl className="crm-data-list">
              {dt("Pipeline", d.pipelineName)}
              {dt("Etapa", d.stageName)}
              {dt(
                "Empresa cliente",
                d.companyId ? (
                  <Link
                    href={`/crm/companies/${d.companyId}`}
                    className="text-link"
                  >
                    {d.companyName || "Abrir empresa"}
                  </Link>
                ) : null,
              )}
              {dt(
                "Contato",
                d.contactId ? (
                  <Link
                    href={`/crm/contacts/${d.contactId}`}
                    className="text-link"
                  >
                    {d.contactName || "Abrir contato"}
                  </Link>
                ) : null,
              )}
              {dt("Responsável", d.assignedToName || "Sem responsável")}
              {dt(
                "Previsão de fechamento",
                d.expectedCloseDate
                  ? new Intl.DateTimeFormat("pt-BR", {
                      dateStyle: "short",
                      timeZone: "UTC",
                    }).format(new Date(d.expectedCloseDate + "T12:00:00Z"))
                  : null,
              )}
              {dt("Tempo na etapa", `${d.daysInStage} dias`)}
              {dt("Tempo no pipeline", `${d.daysInPipeline} dias`)}
              {dt(
                "Última atividade",
                d.lastActivityAt
                  ? formatDate(d.lastActivityAt, session.tenant.timezone)
                  : null,
              )}
              {dt(
                "Próxima atividade",
                d.nextActivityAt
                  ? formatDate(d.nextActivityAt, session.tenant.timezone)
                  : null,
              )}
              {dt("Origem", d.source)}
              {d.lostReason && dt("Motivo da perda", d.lostReason)}
            </dl>
            <div className="crm-summary-tags">
              <TemperatureBadge temperature={d.temperature} />
              <Tags tags={d.tags} />
            </div>
            {d.description && (
              <div className="crm-summary-description">
                <h3>Descrição</h3>
                <p>{d.description}</p>
              </div>
            )}
          </details>
          {canEdit && (
            <div className="sales-deal-controls">
              <PipelineFields
                pipelineId={d.pipelineId}
                stageId={d.stageId}
                disabled={change.isPending || d.status !== "OPEN"}
                lockPipeline
                onPipeline={() => {}}
                onStage={(stageId) => change.mutate({ stageId })}
                prefix="detail"
              />
              {d.status === "OPEN" ? (
                <div className="crm-detail-actions">
                  <Button
                    variant="secondary"
                    loading={change.isPending}
                    onClick={() => setWinOpen(true)}
                  >
                    <Check size={15} />
                    Marcar como ganho
                  </Button>
                  <Button variant="secondary" onClick={() => setLossOpen(true)}>
                    <X size={15} />
                    Marcar como perdido
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  loading={change.isPending}
                  onClick={() => change.mutate({ status: "OPEN" })}
                >
                  <ArrowRightLeft size={15} />
                  Reabrir negócio
                </Button>
              )}
            </div>
          )}
        </Card>
        <Card className="crm-activity-panel">
          <CustomFields kind="deals" id={id} />
          <div
            className="crm-tabs"
            role="group"
            aria-label="Conteúdo da oportunidade"
          >
            {[
              ["history", "Histórico", History],
              ["notes", "Notas", MessageSquareText],
              ["activities", "Atividades", List],
              ["tasks", "Tarefas", Check],
            ].map(([value, label, Icon]) => {
              const I = Icon as typeof History;
              return (
                <button
                  key={value as string}
                  type="button"
                  aria-pressed={tab === value}
                  onClick={() => setTab(value as string)}
                >
                  <I size={16} />
                  {label as string}
                </button>
              );
            })}
          </div>
          <MotionCollection motionKey={tab}>
            {tab === "history" ? (
              <Timeline
                kind="deals"
                id={id}
                timezone={session.tenant.timezone}
              />
            ) : tab === "notes" ? (
              <Notes
                kind="deals"
                id={id}
                canEdit={canEdit}
                timezone={session.tenant.timezone}
              />
            ) : (
              <RelatedWork
                kind={tab as "tasks" | "activities"}
                referenceKey="dealId"
                referenceId={id}
              />
            )}
          </MotionCollection>
        </Card>
      </div>
      <Dialog
        open={winOpen}
        onClose={() => setWinOpen(false)}
        title="Confirmar negócio ganho"
        description="Confira o valor final que será incluído nos indicadores."
      >
        <p className="final-value">{money(d.value, d.currency)}</p>
        <p className="muted">{d.title}</p>
        {change.isError && <Alert>{errorMessage(change.error)}</Alert>}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setWinOpen(false)}>
            Cancelar
          </Button>
          <Button
            loading={change.isPending}
            onClick={() => {
              if (gainLocked.current || change.isPending) return;
              gainLocked.current = true;
              change.mutate({ status: "WON" });
            }}
          >
            Confirmar ganho
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={lossOpen}
        onClose={() => setLossOpen(false)}
        title="Marcar oportunidade como perdida"
        description="Registre o motivo para ajudar a equipe a melhorar as próximas negociações."
      >
        <form
          className="form-stack"
          onSubmit={(e) => {
            e.preventDefault();
            change.mutate({ status: "LOST", lostReason: lostReason.trim() });
          }}
        >
          <Field id="deal-lost-reason" label="Motivo da perda">
            <Input
              id="deal-lost-reason"
              required
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              maxLength={1000}
              list="lost-reasons"
            />
            <datalist id="lost-reasons">
              {[
                "Preço",
                "Concorrente",
                "Sem orçamento",
                "Sem interesse",
                "Timing",
                "Produto inadequado",
                "Sem retorno",
                "Projeto cancelado",
              ].map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </Field>
          {change.isError && <Alert>{errorMessage(change.error)}</Alert>}
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setLossOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={change.isPending}
              disabled={!lostReason.trim()}
            >
              Confirmar perda
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Mover oportunidade para a lixeira?"
        description="O registro sairá das listas e poderá ser restaurado."
      >
        {remove.isError && <Alert>{errorMessage(remove.error)}</Alert>}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Mover para a lixeira
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
