"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Check } from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Button,
  Card,
  ErrorState,
  Field,
  Input,
  LoadingPage,
  PageHeading,
  Select,
} from "@/components/ui/primitives";
import { PermissionNotice } from "@/features/settings/company";
import { ApiError, api, errorMessage, patch, post } from "@/lib/api";
import { EntityPicker, useCrmReferences } from "./shared";
import {
  labels,
  statusLabels,
  temperatureLabels,
  type CrmItem,
  type CrmKind,
  type CrmResponse,
} from "./types";
const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Informe o nome.")
      .max(160, "Use até 160 caracteres."),
    lastName: z.string().max(160),
    email: z.union([
      z.email("Informe um email válido.").max(254),
      z.literal(""),
    ]),
    phone: z.string().max(40),
    whatsapp: z.string().max(40),
    jobTitle: z.string().max(160),
    companyId: z.string(),
    companyName: z.string().max(200),
    assignedTo: z.string(),
    source: z.string().max(100),
    description: z.string().max(10000, "Use até 10.000 caracteres."),
    address: z.string().max(300),
    city: z.string().max(100),
    state: z.string().max(100),
    country: z.string().max(100),
    birthday: z.string(),
    legalName: z.string().max(200),
    taxId: z.string().max(40),
    website: z.union([
      z
        .url("Informe uma URL completa.")
        .max(2000)
        .refine(
          (value) => /^https?:\/\//i.test(value),
          "Use uma URL http ou https.",
        ),
      z.literal(""),
    ]),
    segment: z.string().max(100),
    employeeCount: z
      .string()
      .refine(
        (value) =>
          !value || (/^\d+$/.test(value) && Number(value) <= 100000000),
        "Informe um número inteiro positivo.",
      ),
    status: z.string(),
    temperature: z.string(),
    estimatedValue: z
      .string()
      .refine(
        (value) => !value || /^\d{1,14}(\.\d{1,2})?$/.test(value),
        "Informe um valor positivo com até 2 casas decimais.",
      ),
    discardReason: z.string().max(1000),
    lastContactAt: z.string(),
    nextContactAt: z.string(),
    tagIds: z.array(z.string()).max(30, "Selecione até 30 tags."),
  })
  .superRefine((values, context) => {
    if (values.status === "DISCARDED" && !values.discardReason.trim())
      context.addIssue({
        code: "custom",
        path: ["discardReason"],
        message: "Informe o motivo do descarte.",
      });
  });
type FormData = z.infer<typeof schema>;
function localDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
function defaults(item?: CrmItem): FormData {
  return {
    name: item?.name ?? "",
    lastName: item?.lastName ?? "",
    email: item?.email ?? "",
    phone: item?.phone ?? "",
    whatsapp: item?.whatsapp ?? "",
    jobTitle: item?.jobTitle ?? "",
    companyId: item?.companyId ?? "",
    companyName: item?.companyName ?? "",
    assignedTo: item?.assignedTo ?? "",
    source: item?.source ?? "",
    description: item?.description ?? "",
    address: item?.address ?? "",
    city: item?.city ?? "",
    state: item?.state ?? "",
    country: item?.country ?? "Brasil",
    birthday: item?.birthday?.slice(0, 10) ?? "",
    legalName: item?.legalName ?? "",
    taxId: item?.taxId ?? "",
    website: item?.website ?? "",
    segment: item?.segment ?? "",
    employeeCount: item?.employeeCount?.toString() ?? "",
    status: item?.status ?? "NEW",
    temperature: item?.temperature ?? "WARM",
    estimatedValue: item?.estimatedValue ?? "",
    discardReason: item?.discardReason ?? "",
    lastContactAt: localDate(item?.lastContactAt),
    nextContactAt: localDate(item?.nextContactAt),
    tagIds: item?.tags.map((tag) => tag.id) ?? [],
  };
}
function RecordForm({ kind, item }: { kind: CrmKind; item?: CrmItem }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tags, assignees } = useCrmReferences();
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: defaults(item),
  });
  const dirtyFields = form.formState.dirtyFields;
  const mutation = useMutation({
    mutationFn: (values: FormData) => {
      const common = [
        "name",
        "email",
        "phone",
        "assignedTo",
        "source",
        "description",
        "tagIds",
      ];
      const extra =
        kind === "contacts"
          ? [
              "lastName",
              "whatsapp",
              "jobTitle",
              "companyId",
              "address",
              "city",
              "state",
              "country",
              "birthday",
            ]
          : kind === "companies"
            ? [
                "legalName",
                "taxId",
                "website",
                "segment",
                "employeeCount",
                "address",
                "city",
                "state",
                "country",
              ]
            : [
                "companyId",
                "companyName",
                "jobTitle",
                "status",
                "temperature",
                "estimatedValue",
                "discardReason",
                "lastContactAt",
                "nextContactAt",
              ];
      const body: Record<string, unknown> = {};
      for (const key of [...common, ...extra] as (keyof FormData)[]) {
        const value = values[key];
        body[key] = value === "" ? null : value;
      }
      if (kind === "companies")
        body.employeeCount = values.employeeCount
          ? Number(values.employeeCount)
          : null;
      if (kind === "leads") {
        for (const key of ["lastContactAt", "nextContactAt"] as const)
          body[key] = values[key] ? new Date(values[key]).toISOString() : null;
        if (item?.status === "CONVERTED") delete body.status;
      }
      if (item) {
        for (const key of Object.keys(body)) {
          if (!dirtyFields[key as keyof FormData]) delete body[key];
        }
      }
      return item
        ? patch<CrmResponse>(`/crm/${kind}/${item.id}`, {
            ...body,
            version: item.version,
          })
        : post<CrmResponse>(`/crm/${kind}`, body);
    },
    onSuccess: async (result) => {
      queryClient.setQueryData(["crm", "saved", kind, result.item.id], true);
      queryClient.setQueryData(
        ["crm", "duplicates", kind, result.item.id],
        result.duplicates,
      );
      await queryClient.invalidateQueries({ queryKey: ["crm"] });
      router.push(`/crm/${kind}/${result.item.id}`);
    },
  });
  const input = (
    key: keyof FormData,
    label: string,
    options: { type?: string; placeholder?: string; maxLength?: number } = {},
  ) => (
    <Field
      key={key}
      id={`crm-${key}`}
      label={label}
      error={form.formState.errors[key]?.message}
    >
      <Input
        id={`crm-${key}`}
        type={options.type ?? "text"}
        placeholder={options.placeholder}
        maxLength={options.maxLength}
        {...form.register(key)}
      />
    </Field>
  );
  const tagIds = form.watch("tagIds");
  const companyId = form.watch("companyId");
  return (
    <form
      className="crm-record-form"
      noValidate
      onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
    >
      {mutation.isError && (
        <Alert>
          {errorMessage(mutation.error)}
          {mutation.error instanceof ApiError &&
            mutation.error.status === 409 && (
              <p>
                Abra o registro novamente para conferir os dados atuais antes de
                editar.
              </p>
            )}
        </Alert>
      )}
      <Card className="settings-form">
        <div className="section-heading">
          <div>
            <h2>
              Informações {kind === "companies" ? "da empresa" : "do contato"}
            </h2>
            <p>
              Nome é obrigatório. Os demais dados podem ser preenchidos depois.
            </p>
          </div>
        </div>
        <div className="form-grid">
          {input(
            "name",
            kind === "companies" ? "Nome da empresa cliente" : "Nome",
            { maxLength: 160 },
          )}
          {kind === "contacts" && input("lastName", "Sobrenome")}
          {kind === "companies" && input("legalName", "Razão social")}
          {input("email", "Email", { type: "email" })}
          {input("phone", "Telefone", { type: "tel" })}
          {kind === "contacts" &&
            input("whatsapp", "WhatsApp", { type: "tel" })}
          {kind !== "companies" && input("jobTitle", "Cargo")}
          {kind === "companies" && (
            <>
              {input("taxId", "CNPJ / identificação fiscal")}
              {input("website", "Site", {
                type: "url",
                placeholder: "https://empresa.com.br",
              })}
              {input("segment", "Segmento")}
              {input("employeeCount", "Número de funcionários", {
                type: "number",
              })}
            </>
          )}
        </div>
        {kind !== "companies" && (
          <EntityPicker
            kind="companies"
            id="crm-companyId"
            label="Empresa cliente vinculada"
            value={companyId}
            selectedName={item?.companyName}
            onChange={(value) =>
              form.setValue("companyId", value, { shouldDirty: true })
            }
          />
        )}
        {kind === "leads" &&
          !companyId &&
          input("companyName", "Nome da empresa (ainda sem cadastro)", {
            placeholder: "Pode ser cadastrada ao converter o lead",
          })}
      </Card>
      {kind === "leads" && (
        <Card className="settings-form">
          <div className="section-heading">
            <div>
              <h2>Qualificação</h2>
              <p>Registre a situação atual e as próximas datas de contato.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field id="crm-status" label="Status">
              <Select
                id="crm-status"
                {...form.register("status")}
                disabled={item?.status === "CONVERTED"}
              >
                {Object.entries(statusLabels)
                  .filter(
                    ([value]) =>
                      value !== "CONVERTED" || item?.status === "CONVERTED",
                  )
                  .map(([value, text]) => (
                    <option value={value} key={value}>
                      {text}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field id="crm-temperature" label="Temperatura">
              <Select id="crm-temperature" {...form.register("temperature")}>
                {Object.entries(temperatureLabels).map(([value, text]) => (
                  <option value={value} key={value}>
                    {text}
                  </option>
                ))}
              </Select>
            </Field>
            {input("estimatedValue", "Valor estimado", { placeholder: "0.00" })}
            {input("lastContactAt", "Último contato", {
              type: "datetime-local",
            })}
            {input("nextContactAt", "Próximo contato", {
              type: "datetime-local",
            })}
          </div>
          {form.watch("status") === "DISCARDED" && (
            <Field
              id="crm-discardReason"
              label="Motivo do descarte"
              error={form.formState.errors.discardReason?.message}
            >
              <textarea
                className="input crm-textarea"
                id="crm-discardReason"
                rows={3}
                {...form.register("discardReason")}
              />
            </Field>
          )}
        </Card>
      )}
      {kind !== "leads" && (
        <Card className="settings-form">
          <div className="section-heading">
            <div>
              <h2>
                Localização{kind === "contacts" ? " e dados pessoais" : ""}
              </h2>
              <p>Informações complementares para o relacionamento.</p>
            </div>
          </div>
          {input("address", "Endereço")}
          <div className="form-grid">
            {input("city", "Cidade")}
            {input("state", "Estado")}
            {input("country", "País")}
            {kind === "contacts" &&
              input("birthday", "Aniversário", { type: "date" })}
          </div>
        </Card>
      )}
      <Card className="settings-form">
        <div className="section-heading">
          <div>
            <h2>Organização</h2>
            <p>Defina o contexto e quem acompanha este relacionamento.</p>
          </div>
        </div>
        <div className="form-grid">
          <Field
            id="crm-assignedTo"
            label="Responsável"
            hint={assignees.isPending ? "Carregando equipe…" : undefined}
          >
            <Select
              id="crm-assignedTo"
              {...form.register("assignedTo")}
              disabled={assignees.isPending}
            >
              <option value="">Sem responsável</option>
              {item?.assignedTo &&
                !assignees.data?.items.some(
                  (a) => a.id === item.assignedTo,
                ) && (
                  <option value={item.assignedTo}>
                    {item.assignedToName ?? "Responsável anterior"}
                  </option>
                )}
              {assignees.data?.items.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            id="crm-source"
            label="Origem"
            error={form.formState.errors.source?.message}
            hint="Escolha uma sugestão ou digite outra origem."
          >
            <Input
              id="crm-source"
              list="crm-sources"
              {...form.register("source")}
            />
            <datalist id="crm-sources">
              {[
                "Indicação",
                "Site",
                "Prospecção",
                "Evento",
                "Redes sociais",
                "Anúncio",
                "Parceiro",
              ].map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </Field>
        </div>
        {assignees.isError && (
          <Alert>
            Não foi possível carregar os responsáveis.{" "}
            <button
              type="button"
              className="text-link"
              onClick={() => assignees.refetch()}
            >
              Tentar novamente
            </button>
          </Alert>
        )}
        <fieldset className="crm-tags-field">
          <legend>Tags</legend>
          {tags.isPending ? (
            <p>Carregando tags…</p>
          ) : tags.isError ? (
            <Alert>
              Não foi possível carregar as tags.{" "}
              <button
                type="button"
                className="text-link"
                onClick={() => tags.refetch()}
              >
                Tentar novamente
              </button>
            </Alert>
          ) : tags.data?.items.length ? (
            <div className="crm-tag-options">
              {tags.data.items.map((tag) => (
                <label className="crm-check-option" key={tag.id}>
                  <input
                    type="checkbox"
                    checked={tagIds.includes(tag.id)}
                    onChange={(e) =>
                      form.setValue(
                        "tagIds",
                        e.target.checked
                          ? [...tagIds, tag.id]
                          : tagIds.filter((id) => id !== tag.id),
                        { shouldDirty: true },
                      )
                    }
                  />
                  <span
                    className="crm-tag-dot"
                    style={{ backgroundColor: tag.color }}
                    aria-hidden="true"
                  />
                  {tag.name}
                </label>
              ))}
            </div>
          ) : (
            <p>Não há tags cadastradas.</p>
          )}
          {form.formState.errors.tagIds?.message && (
            <p role="alert" className="field-error">
              {form.formState.errors.tagIds.message}
            </p>
          )}
        </fieldset>
        <Field
          id="crm-description"
          label="Descrição"
          error={form.formState.errors.description?.message}
        >
          <textarea
            className="input crm-textarea"
            id="crm-description"
            rows={5}
            {...form.register("description")}
          />
        </Field>
      </Card>
      <div className="form-actions">
        <Link
          href={item ? `/crm/${kind}/${item.id}` : `/crm/${kind}`}
          className="btn btn-secondary"
        >
          Cancelar
        </Link>
        <Button
          type="submit"
          loading={mutation.isPending}
          disabled={!!item && !form.formState.isDirty}
        >
          <Check size={16} />
          {item ? "Salvar alterações" : "Salvar cadastro"}
        </Button>
      </div>
    </form>
  );
}
export function CrmForm({ kind, id }: { kind: CrmKind; id?: string }) {
  const { data: session } = useSession();
  const record = useQuery({
    queryKey: ["crm", kind, id],
    queryFn: () => api<{ item: CrmItem }>(`/crm/${kind}/${id}`),
    enabled: !!id && !!session,
  });
  if (!session) return null;
  if (!session.permissions.includes(`${kind}.${id ? "update" : "create"}`))
    return <PermissionNotice />;
  if (id && record.isPending) return <LoadingPage />;
  if (record.isError)
    return <ErrorState error={record.error} retry={() => record.refetch()} />;
  if (record.data?.item.deletedAt)
    return (
      <Card className="empty-state">
        <h2>Este registro está na lixeira</h2>
        <p>Restaure o registro antes de editá-lo.</p>
        <Link href="/crm/trash" className="btn btn-secondary">
          Abrir lixeira
        </Link>
      </Card>
    );
  return (
    <div className="page-stack crm-page">
      <Link
        href={id ? `/crm/${kind}/${id}` : `/crm/${kind}`}
        className="back-link crm-back"
      >
        <ArrowLeft size={15} />
        {id
          ? "Voltar ao registro"
          : `Voltar para ${labels[kind].plural.toLowerCase()}`}
      </Link>
      <PageHeading
        title={id ? labels[kind].edit : labels[kind].create}
        description="Mantenha os dados de relacionamento claros e atualizados."
      />
      <RecordForm key={id ?? kind} kind={kind} item={record.data?.item} />
    </div>
  );
}
