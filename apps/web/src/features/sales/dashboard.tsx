"use client";
import { MotionCollection } from "@/components/ui/motion";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, Plus, Target } from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingPage,
  PageHeading,
  Field,
  Select,
} from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/types";
import { useRememberedState } from "@/features/workspace/editor-memory";
import {
  CommercialFilters,
  commercialParams,
  type CommercialWindow,
} from "./commercial-filters";
import { money } from "./types";
import { usePipelines } from "./shared";
import { DealDrawer } from "./deal-drawer";
type Dashboard = {
  totals: {
    currency: string;
    openValue: string;
    wonValue: string;
    wonCount: number;
    openCount: number;
    lostCount: number;
    averageTicket: string | null;
    salesCycleDays: string | null;
  }[];
  conversion: number | null;
  lossReasons: { reason: string; total: number }[];
  noActionCount: number;
  overdueCount: number | null;
  deals: {
    id: string;
    title: string;
    clientName: string;
    ownerName: string | null;
    value: string;
    currency: string;
    stageName: string;
    noAction: boolean;
    daysInStage: number;
    staleDays: number;
  }[];
  tasks: {
    id: string;
    title: string;
    dueAt: string;
    dealId: string | null;
    dealTitle: string | null;
  }[];
};
export function SalesDashboard() {
  const { data: session } = useSession();
  const [deal, setDeal] = useState<string | null>(null);
  const pipelines = usePipelines();
  const [selected, setSelected] = useRememberedState<string | null>(
    "dashboard:pipeline",
    null,
  );
  const pipelineId =
    selected ?? pipelines.data?.items.find((p) => p.demoFixture)?.id ?? "";
  const [owner, setOwner] = useRememberedState("dashboard:owner", "");
  const [window, setWindow] = useRememberedState<CommercialWindow>(
    "dashboard:window",
    { source: "", from: "", to: "" },
  );
  const filters = new URLSearchParams({
    ...(pipelineId ? { pipelineId } : {}),
    ...(owner ? { assignedTo: owner } : {}),
    ...commercialParams(window, session?.tenant.timezone ?? "UTC"),
  });
  const result = useQuery({
    queryKey: ["sales", "dashboard", filters.toString()],
    queryFn: () => api<Dashboard>(`/sales/dashboard?${filters}`),
    enabled: !pipelines.isPending,
  });
  if (!session) return null;
  if (result.isPending || pipelines.isPending) return <LoadingPage />;
  if (result.isError)
    return <ErrorState error={result.error} retry={() => result.refetch()} />;
  const data = result.data;
  return (
    <div className="page-stack commercial-dashboard">
      <DealDrawer id={deal} onClose={() => setDeal(null)} />
      <PageHeading
        title="Visão geral"
        description={`Olá, ${session.user.name.split(" ")[0]}. Veja o que precisa de atenção e organize o próximo passo.`}
        action={
          session.permissions.includes("deals.create") && (
            <Link href="/sales/deals/new" className="btn btn-primary">
              <Plus size={16} />
              Novo negócio
            </Link>
          )
        }
      />
      <div className="dashboard-filter">
        <Field id="dashboard-pipeline" label="Funil">
          <Select
            id="dashboard-pipeline"
            value={pipelineId}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Todos os funis</option>
            {pipelines.data?.items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.demoFixture ? " (dados fictícios)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <CommercialFilters
          value={window}
          onChange={setWindow}
          owner={owner}
          onOwner={setOwner}
          prefix="dashboard"
        />
      </div>
      <dl className="commercial-indicators">
        <div>
          <dt>Valor em aberto</dt>
          <dd>
            {data.totals.length
              ? data.totals.map((t) => (
                  <span key={t.currency}>{money(t.openValue, t.currency)}</span>
                ))
              : money(0, session.tenant.currency)}
          </dd>
          <dd className="indicator-caption">
            <small>
              {data.totals.reduce((n, t) => n + t.openCount, 0)} negócios ativos
            </small>
          </dd>
        </div>
        <div>
          <dt>Negócios ganhos</dt>
          <dd>{data.totals.reduce((n, t) => n + t.wonCount, 0)}</dd>
          <dd className="indicator-caption">
            <small>
              {data.totals.map((t) => (
                <span key={t.currency}>{money(t.wonValue, t.currency)}</span>
              ))}
            </small>
          </dd>
        </div>
        <div>
          <dt>Tarefas atrasadas</dt>
          <dd>{data.overdueCount ?? "—"}</dd>
          <dd className="indicator-caption">
            <small>
              {data.overdueCount === null
                ? "Sem acesso a tarefas"
                : "Pendentes de conclusão"}
            </small>
          </dd>
        </div>
        <div>
          <dt>Sem próxima ação</dt>
          <dd>{data.noActionCount}</dd>
          <dd className="indicator-caption">
            <small>Negócios sem ação futura</small>
          </dd>
        </div>
      </dl>
      <section className="radar-section">
        <div className="section-heading">
          <div>
            <h2>Resultados dos negócios</h2>
            <p>
              Negócios criados no período selecionado. Conversão: ganhos ÷
              (ganhos + perdidos).
            </p>
          </div>
          <strong>
            {data.conversion === null
              ? "Sem fechamentos"
              : `${data.conversion}% de conversão`}
          </strong>
        </div>
        <div
          className="table-scroll"
          role="region"
          aria-label="Resultados por moeda"
          tabIndex={0}
        >
          <table className="crm-table">
            <thead>
              <tr>
                <th>Moeda</th>
                <th>Ganhos</th>
                <th>Perdidos</th>
                <th>Ticket médio ganho</th>
                <th>Ciclo até o ganho</th>
              </tr>
            </thead>
            <tbody>
              {data.totals.map((t) => (
                <tr key={t.currency}>
                  <td>{t.currency}</td>
                  <td>{t.wonCount}</td>
                  <td>{t.lostCount}</td>
                  <td>
                    {t.averageTicket ? money(t.averageTicket, t.currency) : "—"}
                  </td>
                  <td>
                    {t.salesCycleDays === null
                      ? "—"
                      : `${t.salesCycleDays} dias`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>Motivos de perda</h3>
        {data.lossReasons.length ? (
          <dl className="crm-data-list">
            {data.lossReasons.map((r) => (
              <div key={r.reason}>
                <dt>{r.reason}</dt>
                <dd>
                  {r.total} {r.total === 1 ? "negócio" : "negócios"}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="muted">Nenhuma perda nos filtros selecionados.</p>
        )}
      </section>
      <section className="radar-section">
        <div className="section-heading">
          <div>
            <h2>
              <Target size={21} />
              Radar Comercial
            </h2>
            <p>
              Abra um negócio e registre a próxima ação para resolver o alerta.
            </p>
          </div>
          <Link href="/sales/board" className="text-link">
            Ver negócios <ArrowRight size={15} />
          </Link>
        </div>
        {data.deals.length ? (
          <MotionCollection
            className="radar-list"
            motionKey={data.deals.map((item) => item.id).join("|")}
          >
            {data.deals.map((d) => (
              <Link
                href={`/sales/deals/${d.id}`}
                key={d.id}
                className="radar-row"
                onClick={(e) => e.currentTarget.focus({ preventScroll: true })}
                onNavigate={(e) => {
                  e.preventDefault();
                  setDeal(d.id);
                }}
              >
                <div>
                  <strong>{d.title}</strong>
                  <p>
                    {d.clientName} · {d.ownerName || "Sem responsável"}
                  </p>
                  <div className="radar-reasons">
                    {d.noAction && <Badge tone="amber">Sem próxima ação</Badge>}
                    {d.daysInStage >= d.staleDays && (
                      <Badge>{d.daysInStage} dias na etapa</Badge>
                    )}
                  </div>
                </div>
                <div className="radar-row-value">
                  <strong>{money(d.value, d.currency)}</strong>
                  <span>{d.stageName}</span>
                </div>
                <ArrowRight size={18} />
              </Link>
            ))}
          </MotionCollection>
        ) : (
          <EmptyState
            icon={<Target size={26} />}
            title="Tudo em dia por aqui"
            description="Nenhum negócio parado ou sem próxima ação. Continue acompanhando o funil."
          />
        )}
      </section>
      <section className="radar-section">
        <div className="section-heading">
          <div>
            <h2>
              <CalendarClock size={21} />
              Tarefas que precisam de atenção
            </h2>
            <p>Conclua ou ajuste o prazo de cada compromisso.</p>
          </div>
          <Link href="/sales/tasks" className="text-link">
            Ver tarefas <ArrowRight size={15} />
          </Link>
        </div>
        {data.tasks.length ? (
          <MotionCollection
            className="radar-list"
            motionKey={data.tasks.map((item) => item.id).join("|")}
          >
            {data.tasks.map((t) => (
              <Link
                className="radar-row"
                key={t.id}
                href={`/sales/tasks/${t.id}`}
              >
                <div>
                  <strong>{t.title}</strong>
                  <p>{t.dealTitle || "Tarefa sem negócio vinculado"}</p>
                </div>
                <span className="task-overdue">
                  {formatDate(t.dueAt, session.tenant.timezone)}
                </span>
                <ArrowRight size={18} />
              </Link>
            ))}
          </MotionCollection>
        ) : (
          <p className="muted">
            {data.overdueCount === null
              ? "Você não tem acesso às tarefas desta empresa."
              : "Nenhuma tarefa atrasada."}
          </p>
        )}
      </section>
      <p className="field-hint">
        Indicadores calculados sobre os registros ativos do funil selecionado,
        criados no período selecionado, no fuso da empresa. Sem datas, considera
        todo o histórico. O ciclo mede criação até ganho; moedas são calculadas
        separadamente. O Radar considera ações futuras e o prazo de permanência
        definido em cada etapa; mostra até 20 negócios e 10 tarefas.
      </p>
    </div>
  );
}
