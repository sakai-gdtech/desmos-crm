"use client";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowUpRight,
  Building2,
  Check,
  Globe2,
  SlidersHorizontal,
} from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeading,
  Select,
} from "@/components/ui/primitives";
import { errorMessage, patch } from "@/lib/api";
import type { Tenant } from "@/lib/types";

const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome da empresa.").max(160),
  email: z.union([z.email("Informe um email válido."), z.literal("")]),
  phone: z.string().max(40),
  website: z.union([
    z
      .url("Informe uma URL completa, como https://empresa.com.br.")
      .refine((v) => /^https?:\/\//.test(v), "Use uma URL http ou https."),
    z.literal(""),
  ]),
  taxId: z.string().max(30),
  address: z.string().max(300),
  timezone: z.string().min(1),
  currency: z.string().length(3),
  locale: z.enum(["pt-BR", "en-US", "es-ES"]),
});
function CompanyForm({ tenant }: { tenant: Tenant }) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: tenant.name,
      email: tenant.email ?? "",
      phone: tenant.phone ?? "",
      website: tenant.website ?? "",
      taxId: tenant.taxId ?? "",
      address: tenant.address ?? "",
      timezone: tenant.timezone,
      currency: tenant.currency,
      locale: tenant.locale as "pt-BR" | "en-US" | "es-ES",
    },
  });
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof schema>) =>
      patch("/tenants/current", data),
    onSuccess: async (_, values) => {
      form.reset(values);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
  const timezones = [
    ...new Set([
      tenant.timezone,
      "America/Campo_Grande",
      "America/Sao_Paulo",
      "America/Manaus",
      "America/Cuiaba",
      "America/Rio_Branco",
      "America/Fortaleza",
      "America/Belem",
      "America/Recife",
      "America/New_York",
      "Europe/Lisbon",
      "UTC",
    ]),
  ];
  return (
    <form
      className="settings-content"
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      noValidate
    >
      {mutation.isError && <Alert>{errorMessage(mutation.error)}</Alert>}
      {mutation.isSuccess && !form.formState.isDirty && (
        <Alert success>As informações da empresa foram salvas.</Alert>
      )}
      <Card className="settings-form">
        <div className="section-heading">
          <div>
            <h2>Informações da empresa</h2>
            <p>Como sua organização é identificada no Desmos.</p>
          </div>
          <Building2 size={20} className="muted" />
        </div>
        <Field
          label="Nome da empresa"
          id="name"
          error={form.formState.errors.name?.message}
        >
          <Input
            id="name"
            autoComplete="organization"
            {...form.register("name")}
          />
        </Field>
        <div className="form-grid">
          <Field
            label="Email da empresa"
            id="email"
            error={form.formState.errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="contato@empresa.com.br"
              {...form.register("email")}
            />
          </Field>
          <Field
            label="Telefone"
            id="phone"
            error={form.formState.errors.phone?.message}
          >
            <Input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="(67) 3000-0000"
              {...form.register("phone")}
            />
          </Field>
          <Field
            label="Site"
            id="website"
            error={form.formState.errors.website?.message}
          >
            <Input
              id="website"
              type="url"
              placeholder="https://suaempresa.com.br"
              {...form.register("website")}
            />
          </Field>
          <Field
            label="CNPJ ou identificação fiscal"
            id="taxId"
            error={form.formState.errors.taxId?.message}
          >
            <Input
              id="taxId"
              placeholder="00.000.000/0001-00"
              {...form.register("taxId")}
            />
          </Field>
        </div>
        <Field
          label="Endereço"
          id="address"
          error={form.formState.errors.address?.message}
        >
          <Input
            id="address"
            autoComplete="street-address"
            placeholder="Rua, número, cidade e estado"
            {...form.register("address")}
          />
        </Field>
      </Card>
      <Card className="settings-form">
        <div className="section-heading">
          <div>
            <h2>Preferências regionais</h2>
            <p>Referências de fuso, moeda e localidade da empresa.</p>
          </div>
          <Globe2 size={20} className="muted" />
        </div>
        <Field
          label="Fuso horário"
          id="timezone"
          error={form.formState.errors.timezone?.message}
        >
          <Select
            id="timezone"
            value={form.watch("timezone")}
            {...form.register("timezone")}
          >
            {timezones.map((tz) => (
              <option key={tz}>{tz}</option>
            ))}
          </Select>
        </Field>
        <div className="form-grid">
          <Field label="Moeda" id="currency">
            <Select
              id="currency"
              value={form.watch("currency")}
              {...form.register("currency")}
            >
              {["BRL", "USD", "EUR"].map((c) => (
                <option key={c} value={c}>
                  {c === "BRL"
                    ? "Real brasileiro (BRL)"
                    : c === "USD"
                      ? "Dólar americano (USD)"
                      : "Euro (EUR)"}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Localidade"
            id="locale"
            hint="A interface está disponível em português."
          >
            <Select
              id="locale"
              value={form.watch("locale")}
              {...form.register("locale")}
            >
              <option value="pt-BR">Brasil (pt-BR)</option>
              <option value="en-US">Estados Unidos (en-US)</option>
              <option value="es-ES">Espanha (es-ES)</option>
            </Select>
          </Field>
        </div>
      </Card>
      <div className="form-actions">
        <span className="muted">As alterações valem para sua empresa.</span>
        <Button type="submit" loading={mutation.isPending}>
          Salvar alterações <Check size={16} />
        </Button>
      </div>
    </form>
  );
}
export function CompanySettings() {
  const { data: session } = useSession();
  if (!session) return null;
  if (!session.permissions.includes("settings.manage"))
    return <PermissionNotice />;
  return (
    <div className="page-stack">
      <PageHeading
        title="Sua empresa"
        description="Mantenha os dados e as preferências da organização atualizados."
      />
      <div className="settings-layout">
        <CompanyForm tenant={session.tenant} key={session.tenant.id} />
        <aside className="settings-aside">
          <SlidersHorizontal size={22} />
          <h3>Contexto da empresa</h3>
          <p>
            Segmento, tamanho da equipe e objetivos ajudam a manter a
            configuração organizada.
          </p>
          <dl className="detail-list">
            <div>
              <dt>Segmento</dt>
              <dd>{session.tenant.segment || "Não definido"}</dd>
            </div>
            <div>
              <dt>Pessoas</dt>
              <dd>{session.tenant.employeeCount ?? "Não informado"}</dd>
            </div>
            <div>
              <dt>Equipe comercial</dt>
              <dd>{session.tenant.salesCount ?? "Não informado"}</dd>
            </div>
          </dl>
          <Link href="/onboarding" className="text-link">
            Editar contexto <ArrowUpRight size={15} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
export function PermissionNotice() {
  return (
    <Card className="empty-state">
      <h2>Seu acesso é limitado a outras áreas</h2>
      <p>
        Peça ao administrador da empresa uma permissão adequada para esta seção.
      </p>
      <Link href="/workspace" className="btn btn-secondary">
        Voltar à visão geral
      </Link>
    </Card>
  );
}
