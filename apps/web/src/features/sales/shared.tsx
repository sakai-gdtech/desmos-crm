"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Field, Input, Select } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { useCrmReferences, useDebounced } from "@/features/crm/shared";
import { useState } from "react";
import type { Deal, Page, Pipeline } from "./types";
import { statusLabels } from "./types";
export function usePipelines() {
  return useQuery({
    queryKey: ["sales", "pipelines"],
    queryFn: () => api<{ items: Pipeline[] }>("/sales/pipelines"),
  });
}
export function useSalesInvalidation() {
  const q = useQueryClient();
  return () =>
    Promise.all([
      q.invalidateQueries({ queryKey: ["sales"] }),
      q.invalidateQueries({ queryKey: ["crm"] }),
      q.invalidateQueries({ queryKey: ["reports"] }),
    ]);
}
export function SalesStatus({ status }: { status: string }) {
  return (
    <Badge
      tone={
        ["WON", "DONE", "COMPLETED"].includes(status)
          ? "green"
          : ["OPEN", "IN_PROGRESS"].includes(status)
            ? "indigo"
            : status === "LOST"
              ? "amber"
              : "neutral"
      }
    >
      {statusLabels[status] ?? status}
    </Badge>
  );
}
export function OwnerField({
  value,
  onChange,
  id = "sales-owner",
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  const { assignees } = useCrmReferences();
  return (
    <Field id={id} label="Responsável">
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Sem responsável</option>
        {assignees.data?.items.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}
export function PipelineFields({
  pipelineId,
  stageId,
  onPipeline,
  onStage,
  prefix = "deal",
  disabled = false,
  lockPipeline = false,
}: {
  pipelineId: string;
  stageId: string;
  onPipeline: (id: string) => void;
  onStage: (id: string) => void;
  prefix?: string;
  disabled?: boolean;
  lockPipeline?: boolean;
}) {
  const pipelines = usePipelines();
  const current = pipelines.data?.items.find((p) => p.id === pipelineId);
  return (
    <div className="form-grid">
      <Field id={`${prefix}-pipeline`} label="Pipeline">
        <Select
          id={`${prefix}-pipeline`}
          value={pipelineId}
          disabled={disabled || lockPipeline}
          required
          onChange={(e) => {
            onPipeline(e.target.value);
            onStage(
              pipelines.data?.items.find((p) => p.id === e.target.value)
                ?.stages[0]?.id ?? "",
            );
          }}
        >
          <option value="">Selecione um pipeline</option>
          {pipelines.data?.items
            .filter((p) => p.active || p.id === pipelineId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {!p.active ? " (arquivado)" : ""}
              </option>
            ))}
        </Select>
      </Field>
      <Field id={`${prefix}-stage`} label="Etapa">
        <Select
          id={`${prefix}-stage`}
          value={stageId}
          disabled={disabled || !current}
          required
          onChange={(e) => onStage(e.target.value)}
        >
          <option value="">Selecione uma etapa</option>
          {current?.stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
export function DealPicker({
  value,
  onChange,
  selectedName,
}: {
  value: string;
  onChange: (v: string) => void;
  selectedName?: string | null;
}) {
  const [search, setSearch] = useState("");
  const q = useDebounced(search);
  const options = useQuery({
    queryKey: ["sales", "deal-picker", q],
    queryFn: () =>
      api<Page<Deal>>(`/sales/deals?pageSize=100&q=${encodeURIComponent(q)}`),
  });
  return (
    <div className="form-grid">
      <Field id="work-deal-search" label="Buscar oportunidade">
        <Input
          id="work-deal-search"
          placeholder="Digite para filtrar opções"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Field>
      <Field id="work-deal" label="Oportunidade vinculada">
        <Select
          id="work-deal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Sem vínculo</option>
          {value && !options.data?.items.some((d) => d.id === value) && (
            <option value={value}>
              {selectedName || "Oportunidade selecionada"}
            </option>
          )}
          {options.data?.items.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </Select>
      </Field>
      {options.isError && (
        <p className="field-error">
          Não foi possível carregar oportunidades. Tente pesquisar novamente.
        </p>
      )}
    </div>
  );
}
