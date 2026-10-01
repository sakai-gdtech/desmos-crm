"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Check, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeading,
} from "@/components/ui/primitives";
import { errorMessage, patch, post } from "@/lib/api";
import { initials, type User } from "@/lib/types";
const schema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo.").max(120),
  phone: z.string().trim().max(40),
});
function ProfileForm({ user }: { user: User }) {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, phone: user.phone ?? "" },
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) => patch("/me", values),
    onSuccess: async (_, values) => {
      form.reset(values);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
  const verification = useMutation({
    mutationFn: () => post("/auth/resend-verification"),
  });
  return (
    <div className="settings-content">
      <Card className="settings-form">
        <div className="profile-banner">
          <span className="avatar avatar-large">{initials(user.name)}</span>
          <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
          </div>
          <Badge tone={user.emailVerifiedAt ? "green" : "amber"}>
            {user.emailVerifiedAt ? "Email confirmado" : "Email pendente"}
          </Badge>
        </div>
        <form
          className="form-stack"
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          noValidate
        >
          {mutation.isError && <Alert>{errorMessage(mutation.error)}</Alert>}
          {mutation.isSuccess && !form.formState.isDirty && (
            <Alert success>Seu perfil foi atualizado.</Alert>
          )}
          <Field
            label="Nome completo"
            id="name"
            error={form.formState.errors.name?.message}
          >
            <Input id="name" autoComplete="name" {...form.register("name")} />
          </Field>
          <Field
            label="Email de acesso"
            id="email"
            hint="Seu email identifica sua conta nesta empresa."
          >
            <Input id="email" type="email" value={user.email} readOnly />
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
              placeholder="(67) 99999-9999"
              {...form.register("phone")}
            />
          </Field>
          <div className="form-actions">
            <span className="muted">
              Seu perfil é usado pela equipe da sua empresa.
            </span>
            <Button type="submit" loading={mutation.isPending}>
              Salvar perfil <Check size={16} />
            </Button>
          </div>
        </form>
      </Card>
      {!user.emailVerifiedAt && (
        <Card className="verification-card">
          <span className="verification-icon">
            <Mail size={21} />
          </span>
          <div>
            <h3>Confirme seu endereço de email</h3>
            <p>Enviaremos um link para {user.email}.</p>
            {verification.isError && (
              <Alert>{errorMessage(verification.error)}</Alert>
            )}
            {verification.isSuccess && (
              <Alert success>
                Solicitação recebida. Confira sua caixa de entrada.
              </Alert>
            )}
          </div>
          <Button
            variant="secondary"
            loading={verification.isPending}
            onClick={() => verification.mutate()}
          >
            Enviar confirmação
          </Button>
        </Card>
      )}
    </div>
  );
}
export function ProfileSettings() {
  const { data: session } = useSession();
  if (!session) return null;
  return (
    <div className="page-stack">
      <PageHeading
        title="Meu perfil"
        description="Suas informações pessoais e seu email de acesso."
      />
      <div className="settings-layout">
        <ProfileForm user={session.user} key={session.user.id} />
        <aside className="settings-aside">
          <UserRound size={22} />
          <h3>Seu acesso à empresa</h3>
          <p>
            Sua conta está vinculada à sua empresa. Seu papel define as áreas e
            ações disponíveis.
          </p>
          <div className="security-note">
            <ShieldCheck size={20} />
            <p>
              Para trocar sua senha, use a recuperação de acesso na tela de
              login.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
