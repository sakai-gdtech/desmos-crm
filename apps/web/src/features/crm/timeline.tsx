"use client";
import { MotionCollection } from "@/components/ui/motion";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Check,
  History,
  MessageSquareText,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { EmptyState, ErrorState } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/types";
import { Pagination, TableSkeleton } from "./shared";
import {
  fieldLabels,
  statusLabels,
  temperatureLabels,
  type CrmKind,
  type LeadStatus,
  type TimelineEvent,
} from "./types";
const eventLabels: Record<string, string> = {
  created: "criou o cadastro",
  "proposal.saved": "salvou a proposta",
  "stage.changed": "moveu a oportunidade de etapa",
  "status.won": "marcou a oportunidade como ganha",
  "status.lost": "marcou a oportunidade como perdida",
  "status.open": "reabriu a oportunidade",
  "deal.created": "criou uma oportunidade",
  "deal.stage.changed": "moveu uma oportunidade de etapa",
  "deal.status.won": "registrou uma venda ganha",
  "deal.status.lost": "registrou uma venda perdida",
  "deal.status.open": "reabriu uma oportunidade",
  "deal.updated": "atualizou uma oportunidade",
  "deal.deleted": "moveu uma oportunidade para a lixeira",
  "activity.created": "registrou uma atividade",
  "activity.updated": "atualizou uma atividade",
  "activity.status.completed": "concluiu uma atividade",
  "activity.status.planned": "reagendou uma atividade",
  "activity.status.canceled": "cancelou uma atividade",
  "activity.deleted": "moveu uma atividade para a lixeira",
  "task.created": "criou uma tarefa",
  "task.updated": "atualizou uma tarefa",
  "task.status.done": "concluiu uma tarefa",
  "task.status.in_progress": "iniciou uma tarefa",
  "task.status.todo": "reabriu uma tarefa",
  "task.status.canceled": "cancelou uma tarefa",
  "task.deleted": "moveu uma tarefa para a lixeira",
  updated: "atualizou o cadastro",
  deleted: "moveu o cadastro para a lixeira",
  restored: "restaurou o cadastro",
  converted: "converteu o lead",
  "note.created": "adicionou uma nota",
  "note.updated": "atualizou uma nota",
  "note.deleted": "excluiu uma nota",
  "tag.updated": "atualizou uma tag",
  "tag.deleted": "removeu uma tag",
};
function humanValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "")
    return "Não informado";
  if (field === "status")
    return (
      statusLabels[value as LeadStatus] ??
      (
        {
          OPEN: "Aberta",
          WON: "Ganha",
          LOST: "Perdida",
          TODO: "A fazer",
          IN_PROGRESS: "Em andamento",
          DONE: "Concluída",
          PLANNED: "Agendada",
          COMPLETED: "Concluída",
          CANCELED: "Cancelada",
        } as Record<string, string>
      )[String(value)] ??
      String(value)
    );
  if (field === "temperature")
    return (
      temperatureLabels[value as keyof typeof temperatureLabels] ??
      String(value)
    );
  if (field.endsWith("Id") || field === "assignedTo" || field === "tagIds")
    return "Vínculo alterado";
  if (Array.isArray(value))
    return (
      value
        .map((item) =>
          typeof item === "object" && item !== null && "name" in item
            ? String(item.name)
            : String(item),
        )
        .join(", ") || "Nenhuma"
    );
  if (typeof value === "object") return "Informação atualizada";
  return String(value);
}
export function Timeline({
  kind,
  id,
  timezone,
}: {
  kind: CrmKind | "deals";
  id: string;
  timezone: string;
}) {
  const [page, setPage] = useState(1);
  const result = useQuery({
    queryKey: ["crm", kind, id, "timeline", page],
    queryFn: () =>
      api<{
        items: TimelineEvent[];
        total: number;
        page: number;
        pageSize: number;
      }>(
        `/${kind === "deals" ? "sales" : "crm"}/${kind}/${id}/timeline?page=${page}&pageSize=20`,
      ),
  });
  return (
    <section className="crm-timeline" aria-label="Histórico do relacionamento">
      <div className="crm-section-top">
        <div>
          <h2>Histórico</h2>
          <p>Atualizações e decisões registradas neste relacionamento.</p>
        </div>
        <History size={20} className="muted" />
      </div>
      {result.isPending ? (
        <TableSkeleton />
      ) : result.isError ? (
        <ErrorState error={result.error} retry={() => result.refetch()} />
      ) : !result.data?.items.length ? (
        <EmptyState
          icon={<History size={25} />}
          title="Histórico ainda vazio"
          description="As próximas alterações neste registro aparecerão aqui."
        />
      ) : (
        <>
          <MotionCollection
            as="ol"
            className="crm-events"
            motionKey={result.data.items.map((event) => event.id).join("|")}
          >
            {result.data.items.map((event) => {
              const Icon = event.type.startsWith("note.")
                ? MessageSquareText
                : event.type === "created"
                  ? Plus
                  : event.type === "deleted"
                    ? Trash2
                    : event.type === "restored"
                      ? RotateCcw
                      : event.type === "converted"
                        ? ArrowRightLeft
                        : Pencil;
              return (
                <li key={event.id}>
                  <span className="crm-event-icon" aria-hidden="true">
                    <Icon size={14} />
                  </span>
                  <div className="crm-event-content">
                    <div>
                      <strong>{event.actorName || "Sistema"}</strong>{" "}
                      {(event.metadata?.tagAction === "updated"
                        ? "atualizou uma tag"
                        : event.metadata?.tagAction === "deleted"
                          ? "removeu uma tag"
                          : eventLabels[event.type]) ??
                        "registrou uma atualização"}
                    </div>
                    <time dateTime={event.createdAt}>
                      {formatDate(event.createdAt, timezone)}
                    </time>
                    {typeof event.metadata?.title === "string" && (
                      <p className="crm-event-preview">
                        {String(event.metadata.title)}
                      </p>
                    )}
                    {event.type === "proposal.saved" &&
                      typeof event.metadata?.total === "string" &&
                      typeof event.metadata?.currency === "string" &&
                      /^[A-Z]{3}$/.test(event.metadata.currency) && (
                        <p className="crm-event-preview">
                          Total:{" "}
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: event.metadata.currency,
                          }).format(Number(event.metadata.total))}
                        </p>
                      )}
                    {event.metadata?.bodyPreview && (
                      <p className="crm-event-preview">
                        {event.metadata.bodyPreview}
                      </p>
                    )}
                    {event.metadata?.changes?.length ? (
                      <details className="crm-change-details">
                        <summary>
                          Ver {event.metadata.changes.length}{" "}
                          {event.metadata.changes.length === 1
                            ? "alteração"
                            : "alterações"}
                        </summary>
                        <dl>
                          {event.metadata.changes.map((change) => (
                            <div key={change.field}>
                              <dt>
                                {fieldLabels[change.field] ?? change.field}
                              </dt>
                              <dd>
                                <span>
                                  {change.beforeLabel ??
                                    humanValue(change.field, change.before)}
                                </span>
                                <span aria-hidden="true"> → </span>
                                <strong>
                                  {change.afterLabel ??
                                    humanValue(change.field, change.after)}
                                </strong>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </details>
                    ) : null}
                    {typeof event.metadata?.dealId === "string" && (
                      <Link
                        className="text-link"
                        href={`/sales/deals/${event.metadata.dealId}`}
                      >
                        Abrir oportunidade
                      </Link>
                    )}
                    {typeof event.metadata?.workId === "string" && (
                      <Link
                        className="text-link"
                        href={`/sales/${event.type.startsWith("task.") ? "tasks" : "activities"}/${event.metadata.workId}`}
                      >
                        Abrir{" "}
                        {event.type.startsWith("task.")
                          ? "tarefa"
                          : "atividade"}
                      </Link>
                    )}
                    {event.type === "converted" &&
                      event.metadata?.contactId && (
                        <Link
                          className="text-link"
                          href={`/crm/contacts/${event.metadata.contactId}`}
                        >
                          Ver contato criado ou vinculado <Check size={12} />
                        </Link>
                      )}
                  </div>
                </li>
              );
            })}
          </MotionCollection>
          <Pagination
            page={page}
            total={result.data.total}
            pageSize={20}
            onChange={setPage}
          />
        </>
      )}
    </section>
  );
}
