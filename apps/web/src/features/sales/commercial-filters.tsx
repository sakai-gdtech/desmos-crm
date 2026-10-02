"use client";
import { Field, Input, Select } from "@/components/ui/primitives";
import { useCrmReferences } from "@/features/crm/shared";
import { companyInstant, shiftDay } from "@/lib/company-time";
export type CommercialWindow = { source: string; from: string; to: string };
export function commercialParams(window: CommercialWindow, zone: string) {
  return {
    ...(window.source ? { source: window.source.trim() } : {}),
    ...(window.from
      ? { from: companyInstant(`${window.from}T00:00`, zone) }
      : {}),
    ...(window.to
      ? { to: companyInstant(`${shiftDay(window.to, 1)}T00:00`, zone) }
      : {}),
  };
}
export function CommercialFilters({
  value,
  onChange,
  owner,
  onOwner,
  prefix,
}: {
  value: CommercialWindow;
  onChange: (value: CommercialWindow) => void;
  owner?: string;
  onOwner?: (id: string) => void;
  prefix: string;
}) {
  const { assignees } = useCrmReferences();
  return (
    <>
      {onOwner && (
        <Field id={`${prefix}-owner`} label="Responsável">
          <Select
            id={`${prefix}-owner`}
            value={owner}
            onChange={(e) => onOwner(e.target.value)}
          >
            <option value="">Toda a equipe</option>
            {assignees.data?.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field id={`${prefix}-source`} label="Origem">
        <Input
          id={`${prefix}-source`}
          value={value.source}
          maxLength={100}
          placeholder="Todas as origens"
          onChange={(e) => onChange({ ...value, source: e.target.value })}
        />
      </Field>
      <Field id={`${prefix}-from`} label="Criados a partir de">
        <Input
          id={`${prefix}-from`}
          type="date"
          value={value.from}
          max={value.to || undefined}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </Field>
      <Field id={`${prefix}-to`} label="Criados até">
        <Input
          id={`${prefix}-to`}
          type="date"
          value={value.to}
          min={value.from || undefined}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </Field>
    </>
  );
}
