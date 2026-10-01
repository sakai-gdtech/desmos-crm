"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  CalendarClock,
  GitBranch,
  GripVertical,
  List,
  Plus,
  Search,
  Settings2,
} from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Button,
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
  Tags,
  TemperatureBadge,
  useCrmReferences,
  useDebounced,
} from "@/features/crm/shared";
import { api, errorMessage, patch } from "@/lib/api";
import { formatDate } from "@/lib/types";
import type { Board, Deal } from "./types";
import { money } from "./types";
import { usePipelines, useSalesInvalidation } from "./shared";
export function SalesBoard() {
  const { data: session } = useSession();
  const params = useSearchParams();
  const pipelines = usePipelines();
  const [selected, setSelected] = useState(params.get("pipelineId") ?? "");
  const active = pipelines.data?.items.filter((p) => p.active) ?? [];
  const pipelineId =
    selected || active[0]?.id || pipelines.data?.items[0]?.id || "";
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const [assignedTo, setAssignedTo] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [dragging, setDragging] = useState<Deal | null>(null);
  const [over, setOver] = useState("");
  const [notice, setNotice] = useState("");
  const [moving, setMoving] = useState("");
  const { assignees } = useCrmReferences();
  const invalidate = useSalesInvalidation();
  const result = useQuery({
    queryKey: ["sales", "board", pipelineId, q, assignedTo, status],
    queryFn: () =>
      api<Board>(
        `/sales/board?${new URLSearchParams({ pipelineId, q, ...(assignedTo ? { assignedTo } : {}), status })}`,
      ),
    enabled: !!pipelineId && !!session?.permissions.includes("deals.view"),
  });
  const move = useMutation({
    mutationFn: ({ deal, stageId }: { deal: Deal; stageId: string }) =>
      patch(`/sales/deals/${deal.id}`, { stageId, version: deal.version }),
    onSuccess: async () => {
      setNotice("Oportunidade movida.");
      setMoving("");
      await invalidate();
    },
    onError: async () => {
      setMoving("");
      await invalidate();
    },
  });
  if (!session) return null;
  if (!session.permissions.includes("deals.view")) return <PermissionNotice />;
  const canUpdate = session.permissions.includes("deals.update");
  const canCreate = session.permissions.includes("deals.create");
  const canManage = session.permissions.includes("pipelines.manage");
  const changeStage = (deal: Deal, stageId: string) => {
    setDragging(null);
    setOver("");
    if (stageId !== deal.stageId) {
      setNotice("");
      move.reset();
      move.mutate({ deal, stageId });
    }
  };
  return (
    <div className="page-stack sales-board-page">
      <PageHeading
        title="Funil de vendas"
        description="Acompanhe cada negociação e mantenha o próximo passo em vista."
        action={
          <div className="crm-detail-actions">
            <Link className="btn btn-secondary" href="/sales/deals">
              <List size={15} />
              Lista
            </Link>
            {canCreate && pipelineId && (
              <Link
                className="btn btn-primary"
                href={`/sales/deals/new?pipelineId=${pipelineId}`}
              >
                <Plus size={16} />
                Nova oportunidade
              </Link>
            )}
          </div>
        }
      />
      {pipelines.isPending ? (
        <LoadingPage />
      ) : pipelines.isError ? (
        <ErrorState error={pipelines.error} retry={() => pipelines.refetch()} />
      ) : !pipelines.data?.items.length ? (
        <EmptyState
          icon={<GitBranch size={28} />}
          title="Organize seu primeiro funil"
          description={
            canManage
              ? "Crie um pipeline para começar a acompanhar as negociações."
              : "Peça ao administrador para configurar o primeiro pipeline."
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
        <>
          <div className="sales-board-toolbar">
            <Field id="board-pipeline" label="Pipeline">
              <Select
                id="board-pipeline"
                value={pipelineId}
                onChange={(e) => {
                  setSelected(e.target.value);
                  move.reset();
                  setNotice("");
                }}
              >
                {pipelines.data.items.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {!p.active ? " (arquivado)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="search-field">
              <Search size={17} />
              <Input
                aria-label="Buscar oportunidades"
                placeholder="Buscar oportunidade"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Field id="board-owner" label="Responsável">
              <Select
                id="board-owner"
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
              >
                <option value="">Toda a equipe</option>
                {assignees.data?.items.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="board-status" label="Status">
              <Select
                id="board-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="OPEN">Abertas</option>
                <option value="WON">Ganhas</option>
                <option value="LOST">Perdidas</option>
              </Select>
            </Field>
            {canManage && (
              <Link
                href={`/sales/pipelines/${pipelineId}/edit`}
                className="btn btn-ghost"
              >
                <Settings2 size={16} />
                Configurar
              </Link>
            )}
          </div>
          {move.isError && <Alert>{errorMessage(move.error)}</Alert>}
          {notice && <Alert success>{notice}</Alert>}
          {move.isPending && (
            <div className="info-note" role="status">
              Movendo oportunidade…
            </div>
          )}
          {result.isPending ? (
            <LoadingPage />
          ) : result.isError ? (
            <ErrorState error={result.error} retry={() => result.refetch()} />
          ) : (
            result.data && (
              <>
                <p className="sales-board-hint">
                  {canUpdate && status === "OPEN"
                    ? "Arraste entre etapas ou use “Mover” em cada oportunidade. "
                    : ""}
                  <span>Deslize o quadro para ver todas as etapas.</span>
                </p>
                <div
                  className="sales-kanban"
                  aria-label="Quadro de oportunidades"
                >
                  {result.data.columns.map((column) => (
                    <section
                      key={column.stage.id}
                      className={`sales-column ${over === column.stage.id ? "is-drop-target" : ""}`}
                      aria-label={`Etapa ${column.stage.name}`}
                      onDragOver={(e) => {
                        if (dragging && canUpdate && !move.isPending) {
                          e.preventDefault();
                          setOver(column.stage.id!);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node))
                          setOver("");
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragging) changeStage(dragging, column.stage.id!);
                      }}
                    >
                      <header>
                        <div>
                          <span
                            className="sales-stage-dot"
                            style={{ backgroundColor: column.stage.color }}
                            aria-hidden="true"
                          />
                          <h2>{column.stage.name}</h2>
                          <span className="sales-column-count">
                            {column.total}
                          </span>
                        </div>
                        <p>
                          {column.totals.length
                            ? column.totals
                                .map((t) => money(t.value, t.currency))
                                .join(" · ")
                            : money("0", session.tenant.currency)}
                        </p>
                      </header>
                      <div className="sales-column-body">
                        {column.items.map((deal) => (
                          <article
                            key={deal.id}
                            className={`sales-deal-card ${dragging?.id === deal.id ? "is-dragging" : ""}`}
                            draggable={
                              canUpdate &&
                              status === "OPEN" &&
                              !move.isPending &&
                              result.data.pipeline.active
                            }
                            onDragStart={(e) => {
                              setDragging(deal);
                              e.dataTransfer.effectAllowed = "move";
                              e.dataTransfer.setData("text/plain", deal.id);
                            }}
                            onDragEnd={() => {
                              setDragging(null);
                              setOver("");
                            }}
                          >
                            <div className="sales-deal-title">
                              <Link href={`/sales/deals/${deal.id}`}>
                                {deal.title}
                              </Link>
                              {canUpdate && status === "OPEN" && (
                                <GripVertical size={15} aria-hidden="true" />
                              )}
                            </div>
                            <p>
                              {deal.companyName ||
                                deal.contactName ||
                                "Sem cliente vinculado"}
                            </p>
                            <strong className="sales-deal-value">
                              {money(deal.value, deal.currency)}
                            </strong>
                            <div className="sales-deal-meta">
                              <TemperatureBadge
                                temperature={deal.temperature}
                              />
                              <span>
                                {deal.daysInStage}{" "}
                                {deal.daysInStage === 1 ? "dia" : "dias"} na
                                etapa
                              </span>
                            </div>
                            <div className="sales-deal-owner">
                              {deal.assignedToName || "Sem responsável"}
                            </div>
                            <div
                              className={`sales-next-activity ${!deal.nextActivityAt ? "is-missing" : ""}`}
                            >
                              <CalendarClock size={14} />
                              {deal.nextActivityAt
                                ? formatDate(
                                    deal.nextActivityAt,
                                    session.tenant.timezone,
                                  )
                                : "Próxima atividade não agendada"}
                            </div>
                            {deal.tags.length > 0 && <Tags tags={deal.tags} />}{" "}
                            {canUpdate &&
                              status === "OPEN" &&
                              result.data.pipeline.active &&
                              (moving === deal.id ? (
                                <Field
                                  id={`move-${deal.id}`}
                                  label="Mover para etapa"
                                >
                                  <Select
                                    id={`move-${deal.id}`}
                                    value={deal.stageId}
                                    disabled={move.isPending}
                                    onChange={(e) =>
                                      changeStage(deal, e.target.value)
                                    }
                                  >
                                    {result.data.pipeline.stages.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </Select>
                                </Field>
                              ) : (
                                <Button
                                  variant="ghost"
                                  onClick={() => setMoving(deal.id)}
                                >
                                  <ArrowRightLeft size={14} />
                                  Mover
                                </Button>
                              ))}
                          </article>
                        ))}
                        {!column.items.length && (
                          <p className="sales-column-empty">
                            Nenhuma oportunidade nesta etapa.
                          </p>
                        )}
                        {column.total > column.items.length && (
                          <Link
                            className="text-link"
                            href={`/sales/deals?pipelineId=${pipelineId}`}
                          >
                            Ver todas as {column.total} oportunidades
                          </Link>
                        )}
                      </div>
                    </section>
                  ))}
                </div>
              </>
            )
          )}
        </>
      )}
    </div>
  );
}
