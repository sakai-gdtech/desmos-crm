"use client";
import { MotionCollection } from "@/components/ui/motion";
import Link from "next/link";
import { WorkNavigation } from "./navigation";
import { useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react";
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
import { useCrmReferences } from "@/features/crm/shared";
import { api, errorMessage, patch } from "@/lib/api";
import {
  companyDay,
  companyInstant,
  companyInput,
  shiftDay,
  weekStart,
} from "@/lib/company-time";
import { SalesStatus, usePipelines, useSalesInvalidation } from "./shared";
import { WorkForm } from "./work";
import { typeLabels, type Page, type Work, type WorkKind } from "./types";

function useWindow(
  kind: WorkKind,
  query: URLSearchParams,
  enabled: boolean,
  zone: string,
) {
  return useInfiniteQuery({
    queryKey: ["sales", "agenda", kind, query.toString(), zone],
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<Page<Work>>(`/sales/${kind}?${query}&page=${pageParam}&pageSize=100`),
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
  });
}
export function SalesAgenda() {
  const { data: session } = useSession();
  const zone = session?.tenant.timezone ?? "UTC";
  const [date, setDate] = useState("");
  const [view, setView] = useState("week");
  const [bucket, setBucket] = useState("period");
  const [owner, setOwner] = useState("me");
  const [type, setType] = useState("");
  const [pipelineId, setPipelineId] = useState("");
  const [selected, setSelected] = useState<Work | null>(null);
  const [editing, setEditing] = useState(false);
  const { assignees } = useCrmReferences();
  const pipelines = usePipelines();
  const start = weekStart(date || companyDay(new Date(), zone));
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftDay(start, i)),
    [start],
  );
  const query = new URLSearchParams({
    ...(bucket === "period"
      ? {
          from: companyInstant(`${start}T00:00`, zone),
          to: companyInstant(`${shiftDay(start, 7)}T00:00`, zone),
        }
      : { bucket }),
    ...(owner === "me" && session
      ? { assignedTo: session.user.id }
      : owner !== "all" && owner !== "me"
        ? { assignedTo: owner }
        : {}),
    ...(type ? { type } : {}),
    ...(pipelineId ? { pipelineId } : {}),
  });
  const tasks = useWindow(
    "tasks",
    query,
    !!session?.permissions.includes("tasks.view") && (!type || type === "TASK"),
    zone,
  );
  const activities = useWindow(
    "activities",
    query,
    !!session?.permissions.includes("activities.view") && type !== "TASK",
    zone,
  );
  const active = [tasks, activities].filter((_, i) =>
    i === 0
      ? session?.permissions.includes("tasks.view") &&
        (!type || type === "TASK")
      : session?.permissions.includes("activities.view") && type !== "TASK",
  );
  const items = active
    .flatMap((q) => q.data?.pages.flatMap((p) => p.items) ?? [])
    .sort((a, b) =>
      (a.dueAt || a.scheduledAt || "z").localeCompare(
        b.dueAt || b.scheduledAt || "z",
      ),
    );
  const total = active.reduce((n, q) => n + (q.data?.pages[0]?.total ?? 0), 0);
  const more = active.some((q) => q.hasNextPage);
  const invalidate = useSalesInvalidation();
  const lock = useRef(false);
  const complete = useMutation({
    mutationFn: (w: Work) =>
      patch(`/sales/${w.kind}/${w.id}`, {
        status: w.kind === "tasks" ? "DONE" : "COMPLETED",
        version: w.version,
      }),
    onSuccess: async () => {
      setSelected(null);
      await invalidate();
    },
    onError: () => invalidate(),
    onSettled: () => {
      lock.current = false;
    },
  });
  if (!session) return <LoadingPage />;
  if (
    !active.length &&
    !session.permissions.includes("tasks.view") &&
    !session.permissions.includes("activities.view")
  )
    return <PermissionNotice />;
  const groups =
    bucket === "period"
      ? days
      : [
          ...new Set(
            items.map((w) =>
              w.dueAt || w.scheduledAt
                ? companyDay((w.dueAt || w.scheduledAt)!, zone)
                : "undated",
            ),
          ),
        ];
  const label = (day: string) =>
    day === "undated"
      ? "Sem data"
      : new Intl.DateTimeFormat("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          timeZone: "UTC",
        }).format(new Date(`${day}T12:00:00Z`));
  return (
    <div className="page-stack agenda-page">
      <PageHeading
        title="Agenda"
        description={`Próximos passos da equipe · fuso da empresa: ${zone}`}
        action={
          <div className="crm-detail-actions">
            {session.permissions.includes("tasks.create") && (
              <Link className="btn btn-primary" href="/sales/tasks/new">
                <Plus size={16} />
                Criar tarefa
              </Link>
            )}
            {session.permissions.includes("activities.create") && (
              <Link className="btn btn-secondary" href="/sales/activities/new">
                Nova atividade
              </Link>
            )}
          </div>
        }
      />
      <WorkNavigation />
      <div className="agenda-controls">
        <div className="crm-detail-actions">
          <Button
            variant="secondary"
            aria-label="Semana anterior"
            onClick={() => setDate(shiftDay(start, -7))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setDate(companyDay(new Date(), zone));
              setBucket("period");
            }}
          >
            Hoje
          </Button>
          <Button
            variant="secondary"
            aria-label="Próxima semana"
            onClick={() => setDate(shiftDay(start, 7))}
          >
            <ChevronRight size={16} />
          </Button>
          <strong>
            {label(start)} — {label(shiftDay(start, 6))}
          </strong>
        </div>
        <div
          className="crm-tabs agenda-view"
          role="group"
          aria-label="Visualização"
        >
          <button
            type="button"
            aria-pressed={view === "week"}
            onClick={() => setView("week")}
          >
            Semana
          </button>
          <button
            type="button"
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            Lista
          </button>
        </div>
      </div>
      <div className="agenda-filters">
        <Field id="agenda-period" label="Período">
          <Select
            id="agenda-period"
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
          >
            <option value="period">Esta semana</option>
            <option value="overdue">Atrasadas</option>
            <option value="undated">Sem data</option>
          </Select>
        </Field>
        <Field id="agenda-owner" label="Responsável">
          <Select
            id="agenda-owner"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          >
            <option value="me">Minhas</option>
            <option value="all">Toda a equipe</option>
            {assignees.data?.items.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="agenda-type" label="Tipo">
          <Select
            id="agenda-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(typeLabels).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="agenda-pipeline" label="Funil">
          <Select
            id="agenda-pipeline"
            value={pipelineId}
            onChange={(e) => setPipelineId(e.target.value)}
          >
            <option value="">Todos os funis</option>
            {pipelines.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {active.some((q) => q.isPending) ? (
        <LoadingPage />
      ) : active.some((q) => q.isError) ? (
        active
          .filter((q) => q.isError)
          .map((q, i) => (
            <ErrorState key={i} error={q.error} retry={() => q.refetch()} />
          ))
      ) : (
        <>
          <p className="field-hint" role="status">
            {items.length} de {total} registros
            {more
              ? " · carregue mais para ver o restante"
              : " · período completo"}
          </p>
          {!items.length && (
            <EmptyState
              icon={<CalendarClock size={24} />}
              title="Nenhuma ação neste período"
              description="Escolha outra semana, consulte atrasadas ou crie o próximo passo."
            />
          )}
          <MotionCollection
            className={`agenda-days ${view === "week" && bucket === "period" ? "agenda-week" : "agenda-list"}`}
            motionKey={`${start}:${view}:${bucket}:${items.map((item) => `${item.id}:${item.status}`).join("|")}`}
          >
            {groups.map((day) => (
              <section key={day} aria-label={label(day)}>
                <h2>
                  {label(day)}{" "}
                  {day === companyDay(new Date(), zone) && (
                    <Badge tone="indigo">Hoje</Badge>
                  )}
                </h2>
                {items
                  .filter(
                    (w) =>
                      (w.dueAt || w.scheduledAt
                        ? companyDay((w.dueAt || w.scheduledAt)!, zone)
                        : "undated") === day,
                  )
                  .map((w) => (
                    <button
                      type="button"
                      key={w.id}
                      className="agenda-item"
                      onClick={() => {
                        setSelected(w);
                        setEditing(false);
                      }}
                    >
                      <span>
                        {w.kind === "tasks"
                          ? "Prazo"
                          : typeLabels[w.type ?? "OTHER"]}{" "}
                        ·{" "}
                        {w.dueAt || w.scheduledAt
                          ? companyInput(
                              (w.dueAt || w.scheduledAt)!,
                              zone,
                            ).slice(11)
                          : "Sem data"}
                        {w.kind === "activities" &&
                        w.scheduledAt &&
                        w.duration !== null
                          ? ` — ${companyInput(new Date(new Date(w.scheduledAt).getTime() + w.duration * 60000), zone).slice(11)}`
                          : ""}
                      </span>
                      <strong>{w.title}</strong>
                      <small>
                        {w.dealTitle ||
                          w.companyName ||
                          w.contactName ||
                          w.leadName ||
                          "Sem vínculo comercial"}{" "}
                        · {w.assignedToName || "Sem responsável"}
                      </small>
                      <SalesStatus status={w.status} />
                    </button>
                  ))}
              </section>
            ))}
          </MotionCollection>
          {more && (
            <Button
              variant="secondary"
              loading={active.some((q) => q.isFetchingNextPage)}
              onClick={() =>
                active.forEach((q) => {
                  if (q.hasNextPage && !q.isFetchingNextPage)
                    void q.fetchNextPage();
                })
              }
            >
              Carregar mais registros
            </Button>
          )}
          {active.some((q) => q.isFetchNextPageError) && (
            <Alert>
              Não foi possível carregar o restante. Tente Carregar mais
              registros novamente.
            </Alert>
          )}
        </>
      )}
      <Dialog
        open={!!selected}
        title={selected?.title ?? "Ação comercial"}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <section className="agenda-action">
            {editing ? (
              <WorkForm
                kind={selected.kind}
                id={selected.id}
                onDone={() => {
                  setSelected(null);
                  setEditing(false);
                }}
              />
            ) : (
              <>
                <p>
                  {selected.dealTitle ||
                    selected.contactName ||
                    selected.companyName}
                </p>
                <SalesStatus status={selected.status} />
                <p>
                  {selected.kind === "tasks" ? "Prazo" : "Início"}:{" "}
                  {selected.dueAt || selected.scheduledAt
                    ? companyInput(
                        (selected.dueAt || selected.scheduledAt)!,
                        zone,
                      ).replace("T", " · ")
                    : "Sem data"}
                  {selected.kind === "activities" &&
                  selected.scheduledAt &&
                  selected.duration !== null
                    ? ` · Fim: ${companyInput(new Date(new Date(selected.scheduledAt).getTime() + selected.duration * 60000), zone).replace("T", " · ")}`
                    : ""}{" "}
                  · {zone}
                </p>
                <p>{selected.description}</p>
                <p>Responsável: {selected.assignedToName || "Não definido"}</p>
                {complete.isError && (
                  <Alert>{errorMessage(complete.error)}</Alert>
                )}
                <div className="crm-detail-actions">
                  {session.permissions.includes(`${selected.kind}.update`) && (
                    <>
                      <Button
                        loading={complete.isPending}
                        disabled={["DONE", "COMPLETED", "CANCELED"].includes(
                          selected.status,
                        )}
                        onClick={() => {
                          if (!lock.current) {
                            lock.current = true;
                            complete.mutate(selected);
                          }
                        }}
                      >
                        Concluir
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setEditing(true)}
                      >
                        Reagendar ou editar
                      </Button>
                    </>
                  )}
                  {selected.dealId && (
                    <Link
                      className="btn btn-secondary"
                      href={`/sales/deals/${selected.dealId}`}
                    >
                      Abrir negócio
                    </Link>
                  )}
                  {session.permissions.includes("tasks.create") && (
                    <Link
                      className="btn btn-secondary"
                      href={`/sales/tasks/new${selected.dealId ? `?dealId=${selected.dealId}` : ""}`}
                    >
                      Criar próxima ação
                    </Link>
                  )}
                </div>
                <Link
                  className="text-link"
                  href={`/sales/${selected.kind}/${selected.id}`}
                >
                  Abrir registro completo
                </Link>
              </>
            )}
          </section>
        )}
      </Dialog>
    </div>
  );
}
