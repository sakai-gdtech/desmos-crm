"use client";
import { MotionCollection } from "@/components/ui/motion";
import { ExportRecords } from "./import";
import Link from "next/link";
import { useRememberedState } from "@/features/workspace/editor-memory";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  Building2,
  ContactRound,
  Plus,
  Search,
  SlidersHorizontal,
  UserRoundSearch,
  X,
} from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeading,
  Select,
} from "@/components/ui/primitives";
import { PermissionNotice } from "@/features/settings/company";
import { api } from "@/lib/api";
import { formatDate, initials } from "@/lib/types";
import {
  labels,
  statusLabels,
  temperatureLabels,
  type CrmKind,
  type CrmPage,
} from "./types";
import {
  EntityPicker,
  Pagination,
  RecordLink,
  StatusBadge,
  TableSkeleton,
  Tags,
  TemperatureBadge,
  useCrmReferences,
  useDebounced,
} from "./shared";
export function CrmList({ kind }: { kind: CrmKind }) {
  const { data: session } = useSession();
  const { tags, assignees } = useCrmReferences();
  const [search, setSearch] = useRememberedState(`crm:${kind}:search`, "");
  const query = useDebounced(search);
  const [page, setPage] = useRememberedState(`crm:${kind}:page`, 1);
  const [showFilters, setShowFilters] = useRememberedState(
    `crm:${kind}:show-filters`,
    false,
  );
  const [filters, setFilters] = useRememberedState(`crm:${kind}:filters`, {
    status: "",
    temperature: "",
    assignedTo: "",
    tagId: "",
    source: "",
    companyId: "",
  });
  const [sort, setSort] = useRememberedState(
    `crm:${kind}:sort`,
    "updatedAt:desc",
  );
  const [sortBy, order] = sort.split(":");
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    pageSize: "20",
    sort: sortBy,
    order,
  });
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const results = useQuery({
    queryKey: ["crm", kind, "list", params.toString()],
    queryFn: () => api<CrmPage>(`/crm/${kind}?${params}`),
    enabled: !!session?.permissions.includes(`${kind}.view`),
    placeholderData: keepPreviousData,
  });
  if (!session) return null;
  if (!session.permissions.includes(`${kind}.view`))
    return <PermissionNotice />;
  const canCreate = session.permissions.includes(`${kind}.create`);
  const info = labels[kind];
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const filter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };
  const Icon =
    kind === "leads"
      ? UserRoundSearch
      : kind === "contacts"
        ? ContactRound
        : Building2;
  return (
    <div className="page-stack crm-page">
      <PageHeading
        title={info.plural}
        description={info.description}
        action={
          canCreate && (
            <Link href={`/crm/${kind}/new`} className="btn btn-primary">
              <Plus size={16} />
              {info.create}
            </Link>
          )
        }
      />
      <Card className="table-card">
        <div className="crm-toolbar">
          <div className="search-field">
            <Search size={17} aria-hidden="true" />
            <Input
              aria-label={`Buscar ${info.plural.toLowerCase()}`}
              placeholder="Buscar por nome, email ou telefone"
              maxLength={200}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="crm-toolbar-actions">
            {canCreate && (
              <Link href={`/crm/import?kind=${kind}`} className="btn btn-ghost">
                Importar CSV
              </Link>
            )}
            <ExportRecords kind={kind} query={params} />
            {kind === "leads" &&
              session.permissions.includes("settings.manage") && (
                <Link href="/crm/intake" className="btn btn-ghost">
                  Entrada de leads
                </Link>
              )}
            <Button
              variant={showFilters || activeFilters ? "secondary" : "ghost"}
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-controls="crm-filters"
            >
              <SlidersHorizontal size={16} />
              Filtros{activeFilters ? ` (${activeFilters})` : ""}
            </Button>
            <Select
              aria-label="Ordenar registros"
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
            >
              <option value="updatedAt:desc">Atualizados recentemente</option>
              <option value="createdAt:desc">Criados recentemente</option>
              <option value="name:asc">Nome: A–Z</option>
              <option value="name:desc">Nome: Z–A</option>
            </Select>
          </div>
        </div>
        {showFilters && (
          <div id="crm-filters" className="crm-filters">
            {kind === "leads" && (
              <>
                <Field id="filter-status" label="Status">
                  <Select
                    id="filter-status"
                    value={filters.status}
                    onChange={(e) => filter("status", e.target.value)}
                  >
                    <option value="">Todos os status</option>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field id="filter-temperature" label="Temperatura">
                  <Select
                    id="filter-temperature"
                    value={filters.temperature}
                    onChange={(e) => filter("temperature", e.target.value)}
                  >
                    <option value="">Todas as temperaturas</option>
                    {Object.entries(temperatureLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            )}
            <Field id="filter-assignee" label="Responsável">
              <Select
                id="filter-assignee"
                value={filters.assignedTo}
                onChange={(e) => filter("assignedTo", e.target.value)}
              >
                <option value="">Todos os responsáveis</option>
                {assignees.data?.items.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="filter-tag" label="Tag">
              <Select
                id="filter-tag"
                value={filters.tagId}
                onChange={(e) => filter("tagId", e.target.value)}
              >
                <option value="">Todas as tags</option>
                {tags.data?.items.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field id="filter-source" label="Origem">
              <Input
                id="filter-source"
                value={filters.source}
                placeholder="Ex.: Indicação"
                maxLength={100}
                onChange={(e) => filter("source", e.target.value)}
              />
            </Field>
            {kind !== "companies" && (
              <EntityPicker
                kind="companies"
                id="filter-company"
                label="Empresa cliente"
                value={filters.companyId}
                onChange={(value) => filter("companyId", value)}
                emptyLabel="Todas as empresas"
              />
            )}
            {activeFilters > 0 && (
              <Button
                variant="ghost"
                onClick={() => {
                  setFilters({
                    status: "",
                    temperature: "",
                    assignedTo: "",
                    tagId: "",
                    source: "",
                    companyId: "",
                  });
                  setPage(1);
                }}
              >
                <X size={15} />
                Limpar filtros
              </Button>
            )}
          </div>
        )}
        {results.isPending ? (
          <TableSkeleton />
        ) : results.isError ? (
          <ErrorState error={results.error} retry={() => results.refetch()} />
        ) : !results.data?.items.length ? (
          <EmptyState
            icon={<Icon size={29} />}
            title={
              query || activeFilters
                ? "Nenhum resultado encontrado"
                : `Seus ${kind === "companies" ? "clientes" : info.plural.toLowerCase()} começam aqui`
            }
            description={
              query || activeFilters
                ? "Tente outro termo ou ajuste os filtros para encontrar o registro."
                : info.empty
            }
            action={
              !query &&
              !activeFilters &&
              canCreate && (
                <Link href={`/crm/${kind}/new`} className="btn btn-secondary">
                  <Plus size={16} />
                  {info.create}
                </Link>
              )
            }
          />
        ) : (
          <div
            className="table-scroll crm-table-scroll"
            tabIndex={0}
            role="region"
            aria-label={`Lista de ${info.plural.toLowerCase()}`}
            aria-busy={results.isFetching}
          >
            <table className="crm-table">
              <thead>
                <tr>
                  <th scope="col">
                    {kind === "companies" ? "Empresa cliente" : "Nome"}
                  </th>
                  {kind === "leads" ? (
                    <>
                      <th scope="col">Status</th>
                      <th scope="col">Temperatura</th>
                    </>
                  ) : (
                    <th scope="col">
                      {kind === "companies" ? "Segmento" : "Empresa cliente"}
                    </th>
                  )}
                  <th scope="col">Responsável</th>
                  <th scope="col">Tags</th>
                  <th scope="col">Atualizado</th>
                </tr>
              </thead>
              <MotionCollection
                as="tbody"
                motionKey={results.data.items.map((item) => item.id).join("|")}
              >
                {results.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="person-cell">
                        <span className="avatar crm-record-avatar">
                          {kind === "companies" ? (
                            <Building2 size={17} />
                          ) : (
                            initials(item.name)
                          )}
                        </span>
                        <div>
                          <RecordLink kind={kind} item={item} />
                          <small>
                            {item.email ||
                              item.phone ||
                              "Sem contato informado"}
                          </small>
                        </div>
                      </div>
                    </td>
                    {kind === "leads" ? (
                      <>
                        <td>
                          {item.status && <StatusBadge status={item.status} />}
                        </td>
                        <td>
                          {item.temperature && (
                            <TemperatureBadge temperature={item.temperature} />
                          )}
                        </td>
                      </>
                    ) : (
                      <td>
                        {kind === "companies" ? (
                          item.segment || "—"
                        ) : item.companyId ? (
                          <Link
                            className="crm-inline-link"
                            href={`/crm/companies/${item.companyId}`}
                          >
                            {item.companyName}
                          </Link>
                        ) : (
                          item.companyName || "—"
                        )}
                      </td>
                    )}
                    <td>
                      {item.assignedToName || (
                        <span className="muted">Sem responsável</span>
                      )}
                    </td>
                    <td>
                      <Tags tags={item.tags} />
                    </td>
                    <td className="muted crm-date">
                      {formatDate(item.updatedAt, session.tenant.timezone)}
                    </td>
                  </tr>
                ))}
              </MotionCollection>
            </table>
          </div>
        )}
        {results.data && (
          <Pagination
            page={page}
            total={results.data.total}
            pageSize={20}
            onChange={setPage}
            loading={results.isFetching}
          />
        )}
      </Card>
    </div>
  );
}
