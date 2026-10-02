"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/providers";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Select,
  PageHeading,
  ErrorState,
  LoadingPage,
} from "@/components/ui/primitives";
import { api, post, patch, errorMessage } from "@/lib/api";
import { PermissionNotice } from "@/features/settings/company";
type Kind = "contacts" | "companies" | "leads" | "deals";
type Definition = {
  id: string;
  kind: Kind;
  name: string;
  type: "text" | "number" | "date" | "boolean" | "choice";
  options: string[];
  active: boolean;
  shareOnConversion: boolean;
  version: number;
};
type Values = {
  values: Record<string, string | number | boolean | null>;
  version: number;
};
const kinds: Record<Kind, string> = {
  leads: "Leads",
  contacts: "Contatos",
  companies: "Empresas clientes",
  deals: "Negócios",
};
const types: Record<Definition["type"], string> = {
  text: "Texto",
  number: "Número",
  date: "Data",
  boolean: "Sim ou não",
  choice: "Escolha",
};
function useFields(kind: Kind) {
  return useQuery({
    queryKey: ["fields", kind],
    queryFn: () => api<{ items: Definition[] }>(`/crm/fields?kind=${kind}`),
  });
}
export function CustomFields({ kind, id }: { kind: Kind; id: string }) {
  const { data: session } = useSession();
  const fields = useFields(kind);
  const queryClient = useQueryClient();
  const path = `/${kind === "deals" ? "sales" : "crm"}/${kind}/${id}/fields`;
  const values = useQuery({
    queryKey: ["fields", kind, id],
    queryFn: () => api<Values>(path),
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Values["values"]>({});
  const save = useMutation({
    mutationFn: () =>
      api(path, {
        method: "PUT",
        body: JSON.stringify({ version: values.data!.version, values: draft }),
      }),
    onSuccess: async () => {
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["fields", kind] });
      await queryClient.invalidateQueries({ queryKey: ["crm"] });
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
  if (fields.isPending || values.isPending)
    return (
      <section
        className="custom-fields-section"
        aria-label="Campos personalizados"
        aria-busy="true"
      >
        <p className="muted" role="status">
          Carregando campos personalizados…
        </p>
      </section>
    );
  if (fields.isError || values.isError)
    return (
      <section
        className="custom-fields-section"
        aria-label="Campos personalizados"
      >
        <div className="crm-section-top">
          <h3>Campos personalizados</h3>
        </div>
        <Alert>
          Não foi possível carregar os campos.{" "}
          {errorMessage(fields.error ?? values.error)}
        </Alert>
        <Button
          variant="secondary"
          className="custom-fields-retry"
          onClick={() => {
            void fields.refetch();
            void values.refetch();
          }}
        >
          Tentar novamente
        </Button>
      </section>
    );
  const definitions = fields.data.items.filter(
    (f) => f.active || values.data.values[f.id] != null,
  );
  return (
    <section
      className="custom-fields-section"
      aria-label="Campos personalizados"
    >
      <div className="crm-section-top">
        <h3>Campos personalizados</h3>
        {!editing &&
          session?.permissions.includes(`${kind}.update`) &&
          definitions.some((f) => f.active) && (
            <Button
              variant="ghost"
              onClick={() => {
                save.reset();
                setDraft({});
                setEditing(true);
              }}
            >
              Editar campos
            </Button>
          )}
      </div>
      {definitions.length ? (
        editing ? (
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            {definitions
              .filter((f) => f.active)
              .map((f) => {
                const v = Object.hasOwn(draft, f.id)
                  ? draft[f.id]
                  : values.data.values[f.id];
                const change = (value: Values["values"][string]) =>
                  setDraft((d) => ({ ...d, [f.id]: value }));
                return (
                  <Field key={f.id} id={`field-${f.id}`} label={f.name}>
                    {f.type === "choice" || f.type === "boolean" ? (
                      <Select
                        id={`field-${f.id}`}
                        value={v == null ? "" : String(v)}
                        onChange={(e) =>
                          change(
                            !e.target.value
                              ? null
                              : f.type === "boolean"
                                ? e.target.value === "true"
                                : e.target.value,
                          )
                        }
                      >
                        <option value="">Não informado</option>
                        {(f.type === "boolean"
                          ? ["true", "false"]
                          : f.options
                        ).map((o) => (
                          <option value={o} key={o}>
                            {f.type === "boolean"
                              ? o === "true"
                                ? "Sim"
                                : "Não"
                              : o}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        id={`field-${f.id}`}
                        type={f.type === "text" ? "text" : f.type}
                        maxLength={2000}
                        step={f.type === "number" ? "any" : undefined}
                        value={v == null ? "" : String(v)}
                        onChange={(e) =>
                          change(
                            !e.target.value
                              ? null
                              : f.type === "number"
                                ? Number(e.target.value)
                                : e.target.value,
                          )
                        }
                      />
                    )}
                  </Field>
                );
              })}
            {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
            <div className="dialog-actions">
              <Button
                variant="secondary"
                disabled={save.isPending}
                onClick={() => setEditing(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={save.isPending}>
                Salvar campos
              </Button>
            </div>
          </form>
        ) : (
          <dl className="crm-data-list">
            {definitions.map((f) => (
              <div key={f.id}>
                <dt>
                  {f.name}
                  {!f.active ? " (arquivado)" : ""}
                </dt>
                <dd>
                  {values.data.values[f.id] == null
                    ? "—"
                    : typeof values.data.values[f.id] === "boolean"
                      ? values.data.values[f.id]
                        ? "Sim"
                        : "Não"
                      : String(values.data.values[f.id])}
                </dd>
              </div>
            ))}
          </dl>
        )
      ) : (
        <p className="muted">
          Nenhum campo configurado para este tipo de registro.
        </p>
      )}
      {session?.permissions.includes("settings.manage") && (
        <Link className="text-link" href={`/crm/fields?kind=${kind}`}>
          Gerenciar campos de {kinds[kind].toLowerCase()}
        </Link>
      )}
    </section>
  );
}
export function FieldManager() {
  const params = useSearchParams();
  const initial = params.get("kind") as Kind;
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<Kind>(initial in kinds ? initial : "leads");
  const fields = useFields(kind);
  const [name, setName] = useState("");
  const [type, setType] = useState<Definition["type"]>("text");
  const [options, setOptions] = useState("");
  const [share, setShare] = useState(false);
  const [creating, setCreating] = useState(false);
  const save = useMutation({
    mutationFn: () =>
      post("/crm/fields", {
        kind,
        name,
        type,
        shareOnConversion: kind === "leads" && share,
        options:
          type === "choice"
            ? options
                .split("\n")
                .map((v) => v.trim())
                .filter(Boolean)
            : [],
      }),
    onSuccess: async () => {
      setCreating(false);
      setName("");
      setOptions("");
      await queryClient.invalidateQueries({ queryKey: ["fields"] });
    },
  });
  const toggle = useMutation({
    mutationFn: (field: Definition) =>
      patch(`/crm/fields/${field.id}`, {
        version: field.version,
        active: !field.active,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fields"] }),
  });
  if (!session) return null;
  if (!session.permissions.includes("settings.manage"))
    return <PermissionNotice />;
  return (
    <div className="page-stack commercial-tools-page">
      <PageHeading
        title="Campos personalizados"
        description="Adapte o cadastro ao seu processo. Campos arquivados conservam os valores já registrados."
        action={
          !creating && (
            <Button onClick={() => setCreating(true)}>Novo campo</Button>
          )
        }
      />
      <Link
        href={kind === "deals" ? "/sales/deals" : `/crm/${kind}`}
        className="text-link"
      >
        Voltar a {kinds[kind].toLowerCase()}
      </Link>
      <Field id="fields-kind" label="Tipo de registro">
        <Select
          id="fields-kind"
          value={kind}
          disabled={creating}
          onChange={(e) => setKind(e.target.value as Kind)}
        >
          {Object.entries(kinds).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      {creating && (
        <Card>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <h2>Novo campo de {kinds[kind].toLowerCase()}</h2>
            <Field id="field-name" label="Nome">
              <Input
                id="field-name"
                required
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field id="field-type" label="Tipo">
              <Select
                id="field-type"
                value={type}
                onChange={(e) => setType(e.target.value as Definition["type"])}
              >
                {Object.entries(types).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            {kind === "leads" && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={share}
                  onChange={(e) => setShare(e.target.checked)}
                />
                Compartilhar este campo com contatos após conversão
              </label>
            )}
            {type === "choice" && (
              <Field id="field-options" label="Opções, uma por linha">
                <textarea
                  id="field-options"
                  className="input"
                  value={options}
                  required
                  maxLength={3000}
                  onChange={(e) => setOptions(e.target.value)}
                />
              </Field>
            )}
            <p className="field-hint">
              O tipo permanece fixo para preservar os valores. Para mudar o
              tipo, arquive e crie outro campo.
            </p>
            {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
            <div className="dialog-actions">
              <Button
                variant="secondary"
                disabled={save.isPending}
                onClick={() => setCreating(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={save.isPending}>
                Criar campo
              </Button>
            </div>
          </form>
        </Card>
      )}
      {toggle.isError && <Alert>{errorMessage(toggle.error)}</Alert>}
      {fields.isPending ? (
        <LoadingPage />
      ) : fields.isError ? (
        <ErrorState error={fields.error} retry={() => fields.refetch()} />
      ) : (
        <Card>
          <ul className="crm-related-list">
            {fields.data.items.map((f) => (
              <li key={f.id}>
                <div>
                  <strong>{f.name}</strong>
                  <p>
                    {types[f.type]} · {f.active ? "Ativo" : "Arquivado"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  loading={toggle.isPending}
                  onClick={() => toggle.mutate(f)}
                >
                  {f.active ? "Arquivar" : "Reativar"}
                </Button>
              </li>
            ))}
          </ul>
          {!fields.data.items.length && (
            <p className="muted">
              Crie o primeiro campo para registrar informações específicas do
              seu negócio.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
