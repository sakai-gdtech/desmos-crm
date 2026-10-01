"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Skeleton,
} from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type {
  Assignee,
  CrmItem,
  CrmKind,
  CrmPage,
  Duplicate,
  LeadStatus,
  Tag,
} from "./types";
import { fullName, statusLabels, temperatureLabels } from "./types";
export function useDebounced(value: string) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), 250);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}
export function useCrmReferences() {
  const tags = useQuery({
    queryKey: ["crm", "tags"],
    queryFn: () => api<{ items: Tag[] }>("/crm/tags"),
  });
  const assignees = useQuery({
    queryKey: ["crm", "assignees"],
    queryFn: () => api<{ items: Assignee[] }>("/crm/assignees"),
  });
  return { tags, assignees };
}
export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge
      tone={
        status === "QUALIFIED" || status === "CONVERTED"
          ? "green"
          : status === "NEW"
            ? "indigo"
            : "neutral"
      }
    >
      {statusLabels[status]}
    </Badge>
  );
}
export function TemperatureBadge({
  temperature,
}: {
  temperature: "COLD" | "WARM" | "HOT";
}) {
  return (
    <Badge tone={temperature === "HOT" ? "amber" : "neutral"}>
      {temperatureLabels[temperature]}
    </Badge>
  );
}
export function Tags({ tags }: { tags: Tag[] }) {
  return (
    <span className="crm-tag-list">
      {tags.map((tag) => (
        <span className="crm-tag" key={tag.id}>
          <span
            className="crm-tag-dot"
            style={{
              backgroundColor: /^#[0-9a-f]{6}$/i.test(tag.color)
                ? tag.color
                : "var(--muted)",
            }}
            aria-hidden="true"
          />
          {tag.name}
        </span>
      ))}
    </span>
  );
}
export function Pagination({
  page,
  total,
  pageSize = 20,
  onChange,
  loading = false,
}: {
  page: number;
  total: number;
  pageSize?: number;
  onChange: (page: number) => void;
  loading?: boolean;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="crm-pagination">
      <span aria-live="polite">
        {total
          ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`
          : "0 registros"}
      </span>
      <div>
        <Button
          variant="ghost"
          aria-label="Página anterior"
          disabled={page <= 1 || loading}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </Button>
        <span>
          Página {page} de {pages}
        </span>
        <Button
          variant="ghost"
          aria-label="Próxima página"
          disabled={page >= pages || loading}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
}
export function TableSkeleton() {
  return (
    <div
      className="crm-table-skeleton"
      role="status"
      aria-label="Carregando registros"
    >
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} className="crm-skeleton-row" />
      ))}
    </div>
  );
}
export function DuplicateWarning({ duplicates }: { duplicates: Duplicate[] }) {
  if (!duplicates.length) return null;
  return (
    <div className="crm-notice" role="status">
      <strong>Existem cadastros com informações semelhantes.</strong>
      <p>O registro foi salvo. Confira os dados antes de seguir:</p>
      <ul>
        {duplicates.map((d) => (
          <li key={d.id}>
            <Link href={`/crm/${d.kind}/${d.id}`}>{d.name}</Link> ·{" "}
            {d.matchedBy
              .map((m) => (m === "email" ? "mesmo email" : "mesmo telefone"))
              .join(" e ")}
          </li>
        ))}
      </ul>
    </div>
  );
}
export function EntityPicker({
  kind,
  value,
  onChange,
  label,
  id,
  selectedName,
  emptyLabel = "Sem vínculo",
  disabled = false,
}: {
  kind: "companies" | "contacts" | "leads";
  value: string;
  onChange: (value: string) => void;
  label: string;
  id: string;
  selectedName?: string | null;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const query = useDebounced(search);
  const results = useQuery({
    queryKey: ["crm", kind, "picker", query],
    queryFn: () =>
      api<CrmPage>(
        `/crm/${kind}?pageSize=100&sort=name&order=asc&q=${encodeURIComponent(query)}`,
      ),
    enabled: !disabled,
  });
  const items = results.data?.items ?? [];
  return (
    <div className="crm-entity-picker">
      <Field
        id={`${id}-search`}
        label={`Buscar ${kind === "companies" ? "empresa cliente" : kind === "leads" ? "lead" : "contato"}`}
      >
        <div className="crm-picker-search">
          <Search size={15} aria-hidden="true" />
          <Input
            id={`${id}-search`}
            value={search}
            disabled={disabled}
            placeholder="Digite para filtrar opções"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Field>
      <Field
        id={id}
        label={label}
        hint={
          results.isPending
            ? "Carregando opções…"
            : results.data && results.data.total > 100
              ? "Digite parte do nome para encontrar mais opções."
              : undefined
        }
      >
        <Select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || results.isPending}
        >
          <option value="">{emptyLabel}</option>
          {value && !items.some((item) => item.id === value) && (
            <option value={value}>
              {selectedName ?? "Registro selecionado"}
            </option>
          )}
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {fullName(item)}
            </option>
          ))}
        </Select>
      </Field>
      {results.isError && (
        <Alert>
          Não foi possível carregar as opções.{" "}
          <button
            type="button"
            className="text-link"
            onClick={() => results.refetch()}
          >
            Tentar novamente
          </button>
        </Alert>
      )}
    </div>
  );
}
export function RecordLink({ kind, item }: { kind: CrmKind; item: CrmItem }) {
  return (
    <Link className="crm-record-link" href={`/crm/${kind}/${item.id}`}>
      {fullName(item)}
    </Link>
  );
}
