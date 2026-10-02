"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Building2, Check, ShieldCheck } from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  PageHeading,
  Select,
} from "@/components/ui/primitives";
import { errorMessage, post } from "@/lib/api";
import type { Tenant } from "@/lib/types";

const schema = z
  .object({
    segment: z.string().min(1, "Selecione um segmento."),
    employeeCount: z
      .number("Informe um número.")
      .int()
      .min(1, "A empresa deve ter pelo menos uma pessoa.")
      .max(1_000_000),
    salesCount: z
      .number("Informe um número.")
      .int()
      .min(0, "Use zero ou mais.")
      .max(1_000_000),
    objective: z
      .string()
      .trim()
      .min(3, "Conte seu principal objetivo.")
      .max(500),
    salesMotion: z.string().min(1, "Selecione o modelo de vendas."),
  })
  .refine((v) => v.salesCount <= v.employeeCount, {
    message: "O time de vendas não pode ser maior que a empresa.",
    path: ["salesCount"],
  });
function OnboardingForm({ tenant }: { tenant: Tenant }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      segment: tenant.segment ?? "",
      employeeCount: tenant.employeeCount ?? 1,
      salesCount: tenant.salesCount ?? 0,
      objective: tenant.objective ?? "",
      salesMotion: tenant.salesMotion ?? "",
    },
  });
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof schema>) =>
      post("/tenants/current/onboarding", data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      router.push("/workspace");
    },
  });
  return (
    <form
      className="card settings-form"
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      noValidate
    >
      <div className="section-heading">
        <div>
          <h2>Conhecendo {tenant.name}</h2>
          <p>Essas informações podem ser atualizadas depois.</p>
        </div>
        <Building2 size={22} className="muted" />
      </div>
      {mutation.isError && <Alert>{errorMessage(mutation.error)}</Alert>}
      <Field
        label="Em qual segmento vocês atuam?"
        id="segment"
        error={form.formState.errors.segment?.message}
      >
        <Select
          id="segment"
          value={form.watch("segment")}
          {...form.register("segment")}
        >
          <option value="">Selecione o segmento</option>
          {[
            "Tecnologia",
            "Serviços",
            "Consultoria",
            "Educação",
            "Saúde",
            "Indústria",
            "Varejo",
            "Imobiliário",
            "Outros",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Field>
      <div className="form-grid">
        <Field
          label="Pessoas na empresa"
          id="employeeCount"
          error={form.formState.errors.employeeCount?.message}
        >
          <Input
            id="employeeCount"
            type="number"
            min={1}
            {...form.register("employeeCount", { valueAsNumber: true })}
          />
        </Field>
        <Field
          label="Pessoas no time de vendas"
          id="salesCount"
          error={form.formState.errors.salesCount?.message}
        >
          <Input
            id="salesCount"
            type="number"
            min={0}
            {...form.register("salesCount", { valueAsNumber: true })}
          />
        </Field>
      </div>
      <Field
        label="Como funciona a venda de vocês?"
        id="salesMotion"
        error={form.formState.errors.salesMotion?.message}
      >
        <Select
          id="salesMotion"
          value={form.watch("salesMotion")}
          {...form.register("salesMotion")}
        >
          <option value="">Selecione o modelo de vendas</option>
          {[
            "Consultiva",
            "Transacional",
            "Recorrente",
            "Mista",
            "Ainda estamos definindo",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Field>
      <Field
        label="Qual é o principal objetivo com o CRM?"
        id="objective"
        error={form.formState.errors.objective?.message}
      >
        <textarea
          className="input textarea"
          id="objective"
          rows={3}
          placeholder="Ex.: organizar nossos relacionamentos e melhorar o acompanhamento dos clientes."
          {...form.register("objective")}
        />
      </Field>
      <div className="form-actions">
        <Link href="/workspace" className="text-muted-link">
          Fazer isso depois
        </Link>
        <Button type="submit" loading={mutation.isPending}>
          Concluir configuração <ArrowRight size={16} />
        </Button>
      </div>
    </form>
  );
}
export function Onboarding() {
  const { data: session } = useSession();
  if (!session) return null;
  return (
    <div className="page-stack">
      <PageHeading
        title="Configure sua empresa."
        description="Um pouco de contexto para começar com a empresa organizada."
      />
      {session.permissions.includes("settings.manage") ? (
        <div className="onboarding-layout">
          <OnboardingForm tenant={session.tenant} key={session.tenant.id} />
          <aside className="onboarding-aside">
            <h2>Sua empresa, pronta para trabalhar.</h2>
            <p>
              Depois de configurar sua empresa, convide as pessoas da equipe e
              defina o acesso de cada uma.
            </p>
            <ul>
              <li>
                <Check size={17} /> Um espaço por empresa
              </li>
              <li>
                <Check size={17} /> Acessos com responsabilidades claras
              </li>
              <li>
                <Check size={17} /> Sua equipe conectada com segurança
              </li>
            </ul>
            <div className="security-note">
              <ShieldCheck size={21} />
              <p>Os dados desta empresa ficam vinculados ao seu ambiente.</p>
            </div>
          </aside>
        </div>
      ) : (
        <Card className="empty-state">
          <h2>Configuração gerenciada pela empresa</h2>
          <p>
            Peça a um administrador para completar as informações da
            organização.
          </p>
          <Link href="/workspace" className="btn btn-secondary">
            Voltar ao início
          </Link>
        </Card>
      )}
    </div>
  );
}
