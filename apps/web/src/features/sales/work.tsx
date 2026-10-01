"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
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
  useCrmReferences,
  useDebounced,
} from "@/features/crm/shared";
import { api, errorMessage, patch, post } from "@/lib/api";
import { formatDate } from "@/lib/types";
import {
  DealPicker,
  OwnerField,
  SalesStatus,
  useSalesInvalidation,
} from "./shared";
import {
  priorityLabels,
  typeLabels,
  type Page,
  type Work,
  type WorkKind,
} from "./types";
const names = {
  tasks: { title: "Tarefas", new: "Nova tarefa", singular: "tarefa" },
  activities: {
    title: "Atividades",
    new: "Nova atividade",
    singular: "atividade",
  },
};
export function WorkList({ kind }: { kind: WorkKind }) {
  const { data: session } = useSession();
  const [bucket, setBucket] = useState("all");
  const [assigned, setAssigned] = useState("all");
  const [deleted, setDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounced(search);
  const { assignees } = useCrmReferences();
  const query = new URLSearchParams({
    q,
    page: String(page),
    bucket,
    deleted: String(deleted),
    ...(assigned === "me"
      ? { assignedTo: session?.user.id ?? "" }
      : assigned !== "all"
        ? { assignedTo: assigned }
        : {}),
  });
  const result = useQuery({
    queryKey: ["sales", kind, "list", query.toString()],
    queryFn: () => api<Page<Work>>(`/sales/${kind}?${query}`),
    enabled: !!session?.permissions.includes(`${kind}.view`),
  });
  if (!session) return null;
  if (!session.permissions.includes(`${kind}.view`))
    return <PermissionNotice />;
  return (
    <div className="page-stack">
      <PageHeading
        title={deleted ? `${names[kind].title} na lixeira` : names[kind].title}
        description={
          kind === "tasks"
            ? "Organize os prazos e mantenha o follow-up em dia."
            : "Registre interações e planeje os próximos contatos com clientes."
        }
        action={
          session.permissions.includes(`${kind}.create`) && (
            <Link className="btn btn-primary" href={`/sales/${kind}/new`}>
              <Plus size={16} />
              {names[kind].new}
            </Link>
          )
        }
      />
      <Card>
        <div
          className="crm-tabs sales-agenda-tabs"
          role="group"
          aria-label="Período da agenda"
        >
          {[
            ["all", "Todas"],
            ["today", "Hoje"],
            ["upcoming", "Próximas"],
            ["overdue", "Atrasadas"],
            ["completed", "Concluídas"],
          ].map(([v, label]) => (
            <button
              key={v}
              type="button"
              aria-pressed={bucket === v}
              onClick={() => {
                setBucket(v);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="crm-toolbar">
          <Input
            aria-label={`Buscar ${names[kind].title.toLowerCase()}`}
            placeholder="Buscar por título"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            aria-label="Filtrar responsável"
            value={assigned}
            onChange={(e) => {
              setAssigned(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Toda a equipe</option>
            <option value="me">Minhas {names[kind].title.toLowerCase()}</option>
            {assignees.data?.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
          {session.permissions.includes(`${kind}.delete`) && (
            <Button
              variant="ghost"
              onClick={() => {
                setDeleted((v) => !v);
                setBucket("all");
                setPage(1);
              }}
            >
              <Trash2 size={15} />
              {deleted ? "Voltar à lista" : "Lixeira"}
            </Button>
          )}
        </div>
        {result.isPending ? (
          <TableSkeleton />
        ) : result.isError ? (
          <ErrorState error={result.error} retry={() => result.refetch()} />
        ) : (
          <WorkRows kind={kind} items={result.data.items} deleted={deleted} />
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
function WorkRows({
  kind,
  items,
  deleted = false,
}: {
  kind: WorkKind;
  items: Work[];
  deleted?: boolean;
}) {
  const { data: session } = useSession();
  const invalidate = useSalesInvalidation();
  const update = useMutation({
    mutationFn: ({ item, restore }: { item: Work; restore?: boolean }) =>
      restore
        ? post(`/sales/${kind}/${item.id}/restore`)
        : patch(`/sales/${kind}/${item.id}`, {
            status: kind === "tasks" ? "DONE" : "COMPLETED",
            version: item.version,
          }),
    onSuccess: () => invalidate(),
    onError: () => invalidate(),
  });
  return (
    <>
      {update.isError && <Alert>{errorMessage(update.error)}</Alert>}
      {!items.length ? (
        <EmptyState
          icon={<CalendarClock size={24} />}
          title="Agenda sem registros neste filtro"
          description="Crie um próximo passo ou escolha outro período para consultar."
        />
      ) : (
        <div className="sales-work-list">
          {items.map((w) => (
            <div className="sales-work-row" key={w.id}>
              <div className="sales-work-main">
                <Link href={`/sales/${kind}/${w.id}`}>{w.title}</Link>
                <p>
                  {w.dealTitle ||
                    w.companyName ||
                    w.contactName ||
                    w.leadName ||
                    "Sem vínculo comercial"}{" "}
                  · {w.assignedToName || "Sem responsável"}
                </p>
                <span>
                  {kind === "tasks"
                    ? priorityLabels[w.priority ?? "MEDIUM"]
                    : typeLabels[w.type ?? "OTHER"]}
                </span>
              </div>
              <div className="sales-work-due">
                {w.dueAt || w.scheduledAt
                  ? formatDate(
                      (w.dueAt || w.scheduledAt)!,
                      session?.tenant.timezone,
                    )
                  : "Sem data"}
                <SalesStatus status={w.status} />
              </div>
              {deleted && session?.permissions.includes(`${kind}.delete`) ? (
                <Button
                  variant="secondary"
                  loading={
                    update.isPending && update.variables?.item.id === w.id
                  }
                  onClick={() => update.mutate({ item: w, restore: true })}
                >
                  Restaurar
                </Button>
              ) : (
                session?.permissions.includes(`${kind}.update`) &&
                !["DONE", "COMPLETED", "CANCELED"].includes(w.status) && (
                  <Button
                    variant="ghost"
                    aria-label={`Concluir ${names[kind].singular} ${w.title}`}
                    loading={
                      update.isPending && update.variables?.item.id === w.id
                    }
                    onClick={() => update.mutate({ item: w })}
                  >
                    <Check size={17} />
                    Concluir
                  </Button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
export function RelatedWork({
  kind,
  referenceKey,
  referenceId,
}: {
  kind: WorkKind;
  referenceKey: "dealId" | "contactId" | "companyId" | "leadId";
  referenceId: string;
}) {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const result = useQuery({
    queryKey: ["sales", kind, referenceKey, referenceId, page],
    queryFn: () =>
      api<Page<Work>>(
        `/sales/${kind}?${referenceKey}=${referenceId}&page=${page}`,
      ),
    enabled: !!session?.permissions.includes(`${kind}.view`),
  });
  if (!session?.permissions.includes(`${kind}.view`))
    return <PermissionNotice />;
  return (
    <section>
      <div className="crm-section-top">
        <div>
          <h2>{names[kind].title}</h2>
          <p>Próximos passos e interações deste relacionamento.</p>
        </div>
        {session.permissions.includes(`${kind}.create`) && (
          <Link
            className="btn btn-secondary"
            href={`/sales/${kind}/new?${referenceKey}=${referenceId}`}
          >
            <Plus size={14} />
            {names[kind].new}
          </Link>
        )}
      </div>
      {result.isPending ? (
        <TableSkeleton />
      ) : result.isError ? (
        <ErrorState error={result.error} retry={() => result.refetch()} />
      ) : (
        <WorkRows kind={kind} items={result.data.items} />
      )}
      <Pagination
        page={page}
        total={result.data?.total ?? 0}
        onChange={setPage}
      />
    </section>
  );
}
export function RelatedDeals({
  referenceKey,
  referenceId,
}: {
  referenceKey: "contactId" | "companyId" | "leadId";
  referenceId: string;
}) {
  const { data: session } = useSession();
  const [page, setPage] = useState(1);
  const result = useQuery({
    queryKey: ["sales", "related-deals", referenceKey, referenceId, page],
    queryFn: () =>
      api<Page<import("./types").Deal>>(
        `/sales/deals?${referenceKey}=${referenceId}&page=${page}`,
      ),
    enabled: !!session?.permissions.includes("deals.view"),
  });
  return (
    <section>
      <div className="crm-section-top">
        <div>
          <h2>Oportunidades</h2>
          <p>Negociações vinculadas a este relacionamento.</p>
        </div>
      </div>
      {result.isPending ? (
        <TableSkeleton />
      ) : result.isError ? (
        <ErrorState error={result.error} retry={() => result.refetch()} />
      ) : !result.data?.items.length ? (
        <EmptyState
          icon={<ClipboardList size={24} />}
          title="Nenhuma oportunidade vinculada"
          description="As negociações deste relacionamento aparecerão aqui."
        />
      ) : (
        <div className="sales-work-list">
          {result.data.items.map((d) => (
            <div className="sales-work-row" key={d.id}>
              <div className="sales-work-main">
                <Link href={`/sales/deals/${d.id}`}>{d.title}</Link>
                <p>
                  {d.pipelineName} · {d.stageName}
                </p>
              </div>
              <SalesStatus status={d.status} />
              <strong>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: d.currency,
                }).format(Number(d.value))}
              </strong>
            </div>
          ))}
        </div>
      )}
      <Pagination
        page={page}
        total={result.data?.total ?? 0}
        onChange={setPage}
      />
    </section>
  );
}
type Values = {
  title: string;
  description: string;
  assignedTo: string;
  contactId: string;
  companyId: string;
  dealId: string;
  leadId: string;
  type: string;
  scheduledAt: string;
  dueAt: string;
  priority: string;
  status: string;
  duration: string;
  result: string;
  followUpAt: string;
  tagIds: string[];
  checklist: { title: string; done: boolean }[];
};
const localDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export function WorkForm({ kind, id }: { kind: WorkKind; id?: string }) {
  const { data: session } = useSession();
  const result = useQuery({
    queryKey: ["sales", kind, id],
    queryFn: () => api<{ item: Work }>(`/sales/${kind}/${id}`),
    enabled: !!id,
  });
  if (!session) return null;
  if (!session.permissions.includes(`${kind}.${id ? "update" : "create"}`))
    return <PermissionNotice />;
  if (id && result.isPending) return <LoadingPage />;
  if (result.isError)
    return <ErrorState error={result.error} retry={() => result.refetch()} />;
  if (result.data?.item.deletedAt)
    return <Alert>Restaure o registro antes de editar.</Alert>;
  return <WorkEditor key={id ?? "new"} kind={kind} item={result.data?.item} />;
}
function WorkEditor({ kind, item }: { kind: WorkKind; item?: Work }) {
  const params = useSearchParams();
  const { data: session } = useSession();
  const router = useRouter();
  const invalidate = useSalesInvalidation();
  const { tags } = useCrmReferences();
  const form = useForm<Values>({
    defaultValues: {
      title: item?.title ?? "",
      description: item?.description ?? "",
      assignedTo: item?.assignedTo ?? session?.user.id ?? "",
      contactId: item?.contactId ?? params.get("contactId") ?? "",
      companyId: item?.companyId ?? params.get("companyId") ?? "",
      leadId: item?.leadId ?? params.get("leadId") ?? "",
      dealId: item?.dealId ?? params.get("dealId") ?? "",
      type: item?.type ?? "CALL",
      scheduledAt: localDate(item?.scheduledAt),
      dueAt: localDate(item?.dueAt),
      priority: item?.priority ?? "MEDIUM",
      status: item?.status ?? (kind === "tasks" ? "TODO" : "PLANNED"),
      duration: item?.duration == null ? "" : String(item.duration),
      result: item?.result ?? "",
      followUpAt: "",
      tagIds: item?.tags.map((t) => t.id) ?? [],
      checklist: item?.checklist ?? [],
    },
  });
  const dirty = form.formState.dirtyFields;
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "checklist",
  });
  const set = (key: keyof Values, value: any) =>
    form.setValue(key, value, { shouldDirty: true });
  const save = useMutation({
    mutationFn: (v: Values) => {
      const keys = [
        "title",
        "description",
        "assignedTo",
        "contactId",
        "companyId",
        "leadId",
        "dealId",
        "tagIds",
        "status",
        ...(kind === "tasks"
          ? ["dueAt", "priority", "checklist"]
          : ["type", "scheduledAt", "duration", "result", "followUpAt"]),
      ] as (keyof Values)[];
      const body: Record<string, unknown> = {};
      for (const key of keys) {
        if (item && !dirty[key]) continue;
        let value: unknown = v[key] || null;
        if (["dueAt", "scheduledAt", "followUpAt"].includes(key))
          value = v[key] ? new Date(v[key] as string).toISOString() : null;
        if (key === "duration") value = v.duration ? Number(v.duration) : null;
        body[key] = value;
      }
      return item
        ? patch<{ item: Work }>(`/sales/${kind}/${item.id}`, {
            ...body,
            version: item.version,
          })
        : post<{ item: Work }>(`/sales/${kind}`, body);
    },
    onSuccess: async (data) => {
      await invalidate();
      router.push(`/sales/${kind}/${data.item.id}`);
    },
  });
  const input = (
    key: keyof Values,
    label: string,
    options: Record<string, any> = {},
  ) => (
    <Field id={`work-${key}`} label={label}>
      <Input
        id={`work-${key}`}
        {...form.register(key, options.required ? { required: true } : {})}
        {...options}
      />
    </Field>
  );
  const tagIds = form.watch("tagIds");
  return (
    <form
      className="page-stack crm-record-form sales-record-form"
      onSubmit={form.handleSubmit((v) => save.mutate(v))}
    >
      <Link
        className="back-link"
        href={item ? `/sales/${kind}/${item.id}` : `/sales/${kind}`}
      >
        <ArrowLeft size={15} />
        Voltar para {names[kind].title.toLowerCase()}
      </Link>
      <PageHeading
        title={item ? `Editar ${names[kind].singular}` : names[kind].new}
        description={
          kind === "tasks"
            ? "Defina o próximo passo, responsável e prazo."
            : "Agende ou registre a interação com o cliente. Emails e mensagens são registrados como histórico."
        }
      />
      {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
      <Card className="sales-form-section">
        <h2>{kind === "tasks" ? "Próximo passo" : "Interação"}</h2>
        {input("title", "Título", { required: true, maxLength: 200 })}
        <div className="form-grid">
          {kind === "tasks" ? (
            <>
              {input("dueAt", "Prazo", { type: "datetime-local" })}
              <Field id="work-priority" label="Prioridade">
                <Select id="work-priority" {...form.register("priority")}>
                  {Object.entries(priorityLabels).map(([key, value]) => (
                    <option value={key} key={key}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          ) : (
            <>
              <Field id="work-type" label="Tipo de atividade">
                <Select id="work-type" {...form.register("type")}>
                  {Object.entries(typeLabels).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value}
                    </option>
                  ))}
                </Select>
              </Field>
              {input("scheduledAt", "Data e hora", { type: "datetime-local" })}
            </>
          )}
          <OwnerField
            value={form.watch("assignedTo")}
            onChange={(v) => set("assignedTo", v)}
          />
          <Field id="work-status" label="Status">
            <Select id="work-status" {...form.register("status")}>
              {(kind === "tasks"
                ? ["TODO", "IN_PROGRESS", "DONE", "CANCELED"]
                : ["PLANNED", "COMPLETED", "CANCELED"]
              ).map((s) => (
                <option key={s} value={s}>
                  {
                    (
                      {
                        TODO: "A fazer",
                        IN_PROGRESS: "Em andamento",
                        DONE: "Concluída",
                        CANCELED: "Cancelada",
                        PLANNED: "Agendada",
                        COMPLETED: "Concluída",
                      } as Record<string, string>
                    )[s]
                  }
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="field-hint">
          Datas e horários são informados no fuso deste dispositivo.
        </p>
        <Field id="work-description" label="Descrição">
          <textarea
            className="input"
            id="work-description"
            rows={4}
            maxLength={10000}
            {...form.register("description")}
          />
        </Field>
        {kind === "activities" && (
          <>
            <div className="form-grid">
              {input("duration", "Duração (minutos)", {
                type: "number",
                min: 0,
                max: 100000,
              })}
              {input("followUpAt", "Próximo contato (follow-up)", {
                type: "datetime-local",
                disabled: form.watch("status") !== "COMPLETED",
              })}
            </div>
            <p className="field-hint">
              Ao concluir a atividade, escolha uma data futura para criar uma
              tarefa de follow-up.
            </p>
            <Field id="work-result" label="Resultado da interação">
              <textarea
                className="input"
                id="work-result"
                rows={3}
                maxLength={10000}
                {...form.register("result")}
              />
            </Field>
          </>
        )}
      </Card>
      <Card className="sales-form-section">
        <h2>Relacionamento</h2>
        <DealPicker
          value={form.watch("dealId")}
          onChange={(v) => set("dealId", v)}
          selectedName={item?.dealTitle}
        />
        <EntityPicker
          kind="contacts"
          id="work-contact"
          label="Contato vinculado"
          value={form.watch("contactId")}
          onChange={(v) => set("contactId", v)}
          selectedName={item?.contactName}
        />
        <EntityPicker
          kind="companies"
          id="work-company"
          label="Empresa cliente vinculada"
          value={form.watch("companyId")}
          onChange={(v) => set("companyId", v)}
          selectedName={item?.companyName}
        />
        <EntityPicker
          kind="leads"
          id="work-lead"
          label="Lead vinculado"
          value={form.watch("leadId")}
          onChange={(v) => set("leadId", v)}
          selectedName={item?.leadName}
        />
        {form.watch("leadId") && (
          <p className="info-note">
            Esta ação será registrada no histórico do lead vinculado.
          </p>
        )}
        <fieldset className="crm-tags-field">
          <legend>Tags</legend>
          {tags.data?.items.map((t) => (
            <label key={t.id} className="crm-checkbox">
              <input
                type="checkbox"
                checked={tagIds.includes(t.id)}
                onChange={(e) =>
                  set(
                    "tagIds",
                    e.target.checked
                      ? [...tagIds, t.id]
                      : tagIds.filter((id) => id !== t.id),
                  )
                }
              />
              {t.name}
            </label>
          ))}
        </fieldset>
      </Card>
      {kind === "tasks" && (
        <Card className="sales-form-section">
          <div className="crm-section-top">
            <h2>Checklist</h2>
            <Button
              variant="secondary"
              disabled={fields.length >= 50}
              onClick={() => append({ title: "", done: false })}
            >
              <Plus size={14} />
              Adicionar item
            </Button>
          </div>
          {fields.map((f, i) => (
            <div className="sales-checklist-editor" key={f.id}>
              <label>
                <input
                  type="checkbox"
                  {...form.register(`checklist.${i}.done`)}
                />
                <span className="sr-only">Item {i + 1} concluído</span>
              </label>
              <Input
                aria-label={`Título do item ${i + 1}`}
                {...form.register(`checklist.${i}.title`)}
                required
                maxLength={300}
              />
              <Button
                variant="ghost"
                aria-label={`Remover item ${i + 1}`}
                onClick={() => remove(i)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </Card>
      )}
      <div className="form-actions">
        <Link
          className="btn btn-secondary"
          href={item ? `/sales/${kind}/${item.id}` : `/sales/${kind}`}
        >
          Cancelar
        </Link>
        <Button
          type="submit"
          loading={save.isPending}
          disabled={!!item && !form.formState.isDirty}
        >
          Salvar {names[kind].singular}
        </Button>
      </div>
    </form>
  );
}
export function WorkDetail({ kind, id }: { kind: WorkKind; id: string }) {
  const { data: session } = useSession();
  const router = useRouter();
  const invalidate = useSalesInvalidation();
  const result = useQuery({
    queryKey: ["sales", kind, id],
    queryFn: () => api<{ item: Work }>(`/sales/${kind}/${id}`),
    enabled: !!session?.permissions.includes(`${kind}.view`),
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const change = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      patch(`/sales/${kind}/${id}`, {
        ...data,
        version: result.data!.item.version,
      }),
    onSuccess: () => invalidate(),
    onError: () => invalidate(),
  });
  const remove = useMutation({
    mutationFn: () => api(`/sales/${kind}/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await invalidate();
      router.push(`/sales/${kind}`);
    },
  });
  if (!session) return null;
  if (!session.permissions.includes(`${kind}.view`))
    return <PermissionNotice />;
  if (result.isPending) return <LoadingPage />;
  if (result.isError || !result.data)
    return <ErrorState error={result.error} retry={() => result.refetch()} />;
  const w = result.data.item;
  const canEdit =
    session.permissions.includes(`${kind}.update`) && !w.deletedAt;
  return (
    <div className="page-stack">
      <Link className="back-link" href={`/sales/${kind}`}>
        <ArrowLeft size={15} />
        {names[kind].title}
      </Link>
      <PageHeading
        title={w.title}
        description={
          kind === "tasks"
            ? "Tarefa e próximos passos do relacionamento."
            : "Registro da interação com o cliente."
        }
        action={
          <div className="crm-detail-actions">
            {canEdit && (
              <Link
                className="btn btn-secondary"
                href={`/sales/${kind}/${id}/edit`}
              >
                <Pencil size={15} />
                Editar
              </Link>
            )}
            {!w.deletedAt && session.permissions.includes(`${kind}.delete`) && (
              <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={15} />
                Excluir
              </Button>
            )}
          </div>
        }
      />
      {change.isError && <Alert>{errorMessage(change.error)}</Alert>}
      {w.deletedAt && (
        <Alert>
          Este registro está na lixeira. Restaure-o pela lista para editar.
        </Alert>
      )}
      <Card className="sales-form-section">
        <div className="crm-section-top">
          <SalesStatus status={w.status} />
          {canEdit && !["DONE", "COMPLETED", "CANCELED"].includes(w.status) && (
            <Button
              loading={change.isPending}
              onClick={() =>
                change.mutate({
                  status: kind === "tasks" ? "DONE" : "COMPLETED",
                })
              }
            >
              <Check size={16} />
              Concluir {names[kind].singular}
            </Button>
          )}
        </div>
        <dl className="crm-data-list">
          {[
            ["Responsável", w.assignedToName || "Sem responsável"],
            [
              kind === "tasks" ? "Prazo" : "Data e hora",
              w.dueAt || w.scheduledAt
                ? formatDate(
                    (w.dueAt || w.scheduledAt)!,
                    session.tenant.timezone,
                  )
                : "Sem data",
            ],
            [
              kind === "tasks" ? "Prioridade" : "Tipo",
              kind === "tasks"
                ? priorityLabels[w.priority ?? "MEDIUM"]
                : typeLabels[w.type ?? "OTHER"],
            ],
            [
              "Concluída em",
              w.completedAt
                ? formatDate(w.completedAt, session.tenant.timezone)
                : "—",
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="sales-work-links">
          {w.dealId && (
            <Link className="text-link" href={`/sales/deals/${w.dealId}`}>
              {w.dealTitle || "Abrir oportunidade"}
            </Link>
          )}
          {w.contactId && (
            <Link className="text-link" href={`/crm/contacts/${w.contactId}`}>
              {w.contactName || "Abrir contato"}
            </Link>
          )}
          {w.companyId && (
            <Link className="text-link" href={`/crm/companies/${w.companyId}`}>
              {w.companyName || "Abrir empresa"}
            </Link>
          )}
          {w.leadId && (
            <Link className="text-link" href={`/crm/leads/${w.leadId}`}>
              {w.leadName || "Abrir lead"}
            </Link>
          )}
        </div>
        {w.tags.length > 0 && <Tags tags={w.tags} />}{" "}
        {w.description && (
          <div className="crm-summary-description">
            <h2>Descrição</h2>
            <p>{w.description}</p>
          </div>
        )}
        {w.result && (
          <div className="crm-summary-description">
            <h2>Resultado</h2>
            <p>{w.result}</p>
          </div>
        )}
        {kind === "tasks" && w.checklist.length > 0 && (
          <div className="sales-checklist">
            <h2>Checklist</h2>
            {w.checklist.map((c, i) => (
              <label className="crm-checkbox" key={i}>
                <input
                  type="checkbox"
                  checked={
                    change.isPending &&
                    Array.isArray(change.variables?.checklist)
                      ? (change.variables.checklist[i]?.done ?? c.done)
                      : c.done
                  }
                  disabled={!canEdit || change.isPending}
                  onChange={(e) =>
                    change.mutate({
                      checklist: w.checklist.map((old, j) =>
                        j === i ? { ...old, done: e.target.checked } : old,
                      ),
                    })
                  }
                />
                {c.title}
              </label>
            ))}
          </div>
        )}
      </Card>
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Mover ${names[kind].singular} para a lixeira?`}
        description="O registro poderá ser restaurado pela equipe com permissão."
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
