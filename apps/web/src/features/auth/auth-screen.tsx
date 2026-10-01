"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Link2,
  Fingerprint,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import { Alert, Button, Field, Input } from "@/components/ui/primitives";
import {
  api,
  errorMessage,
  notifySessionChange,
  post,
  setExpectedTenant,
} from "@/lib/api";
import type { SessionContext } from "@/lib/types";

export type AuthMode =
  | "login"
  | "register"
  | "forgot-password"
  | "reset-password"
  | "verify-email"
  | "accept-invitation";
const email = z.email("Informe um email válido.");
const password = z
  .string()
  .min(12, "Use pelo menos 12 caracteres.")
  .max(128, "Use no máximo 128 caracteres.");
const loginSchema = z.object({
  email,
  password: z.string().min(1, "Informe sua senha."),
});
const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  companyName: z.string().trim().min(2, "Informe o nome da empresa.").max(160),
  email,
  password,
});
const emailSchema = z.object({ email });
const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    message: "As senhas precisam ser iguais.",
    path: ["confirm"],
  });
const inviteSchema = z.object({
  name: z.string().max(120).optional(),
  password: z.string().max(128).optional(),
});

function useEnterWorkspace() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const search = useSearchParams();
  return async () => {
    const session = await api<SessionContext>("/me");
    setExpectedTenant(session.tenant.id);
    notifySessionChange("changed");
    queryClient.clear();
    queryClient.setQueryData(["me"], session);
    const next = search.get("next");
    router.replace(
      next?.startsWith("/accept-invitation?")
        ? next
        : !session.tenant.onboardingCompletedAt &&
            session.permissions.includes("settings.manage")
          ? "/onboarding"
          : "/workspace",
    );
  };
}

function LoginForm() {
  const enter = useEnterWorkspace();
  const search = useSearchParams();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof loginSchema>) => {
      await post("/auth/login", data);
      await enter();
    },
  });
  return (
    <form
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      className="form-stack"
      noValidate
    >
      {search.get("reset") === "success" && (
        <Alert success>Senha atualizada. Entre com sua nova senha.</Alert>
      )}
      {mutation.isError && <Alert>{errorMessage(mutation.error)}</Alert>}
      <Field
        label="Email"
        id="email"
        error={form.formState.errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com.br"
          aria-invalid={!!form.formState.errors.email}
          {...form.register("email")}
        />
      </Field>
      <Field
        label="Senha"
        id="password"
        error={form.formState.errors.password?.message}
      >
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          aria-invalid={!!form.formState.errors.password}
          {...form.register("password")}
        />
      </Field>
      <div className="form-meta">
        <span>Seu espaço. Sua equipe.</span>
        <Link href="/forgot-password">Esqueci minha senha</Link>
      </div>
      <Button type="submit" loading={mutation.isPending} className="full-width">
        Entrar na minha conta <ArrowRight size={17} />
      </Button>
      <p className="auth-switch">
        Ainda não tem uma conta? <Link href="/register">Criar minha conta</Link>
      </p>
    </form>
  );
}
function RegisterForm() {
  const enter = useEnterWorkspace();
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", companyName: "", email: "", password: "" },
  });
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof registerSchema>) => {
      await post("/auth/register", data);
      await enter();
    },
  });
  return (
    <form
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      className="form-stack"
      noValidate
    >
      {mutation.isError && <Alert>{errorMessage(mutation.error)}</Alert>}
      <Field
        label="Seu nome"
        id="name"
        error={form.formState.errors.name?.message}
      >
        <Input
          id="name"
          autoComplete="name"
          placeholder="Como podemos chamar você?"
          {...form.register("name")}
        />
      </Field>
      <Field
        label="Nome da empresa"
        id="companyName"
        error={form.formState.errors.companyName?.message}
      >
        <Input
          id="companyName"
          autoComplete="organization"
          placeholder="Sua empresa"
          {...form.register("companyName")}
        />
      </Field>
      <Field
        label="Email de trabalho"
        id="email"
        error={form.formState.errors.email?.message}
      >
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com.br"
          {...form.register("email")}
        />
      </Field>
      <Field
        label="Crie uma senha"
        id="password"
        error={form.formState.errors.password?.message}
        hint="Use pelo menos 12 caracteres."
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Uma senha forte e exclusiva"
          aria-describedby="password-hint"
          {...form.register("password")}
        />
      </Field>
      <Button type="submit" loading={mutation.isPending} className="full-width">
        Criar conta e empresa <ArrowRight size={17} />
      </Button>
      <p className="auth-switch">
        Já usa o Desmos? <Link href="/login">Entrar na minha conta</Link>
      </p>
    </form>
  );
}
function ForgotForm() {
  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof emailSchema>) =>
      post("/auth/forgot-password", data),
  });
  return (
    <form
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      className="form-stack"
      noValidate
    >
      {mutation.isSuccess ? (
        <Alert success>
          Se esse email estiver cadastrado, você receberá as instruções para
          criar uma nova senha. Confira também a caixa de spam.
        </Alert>
      ) : (
        <>
          {mutation.isError && <Alert>{errorMessage(mutation.error)}</Alert>}
          <Field
            label="Email da sua conta"
            id="email"
            error={form.formState.errors.email?.message}
          >
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com.br"
              {...form.register("email")}
            />
          </Field>
          <Button
            type="submit"
            loading={mutation.isPending}
            className="full-width"
          >
            Enviar instruções <ArrowRight size={17} />
          </Button>
        </>
      )}
      <Link href="/login" className="back-link">
        <ArrowLeft size={15} /> Voltar para o login
      </Link>
    </form>
  );
}
function ResetForm() {
  const token = useSearchParams().get("token");
  const router = useRouter();
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof resetSchema>) =>
      post("/auth/reset-password", { token, password: data.password }),
    onSuccess: () => router.replace("/login?reset=success"),
  });
  if (!token)
    return (
      <div className="form-stack">
        <Alert>
          Este link de recuperação está incompleto. Solicite um novo email.
        </Alert>
        <Link className="btn btn-primary" href="/forgot-password">
          Solicitar novo link
        </Link>
      </div>
    );
  return (
    <form
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      className="form-stack"
      noValidate
    >
      {mutation.isError && <Alert>{errorMessage(mutation.error)}</Alert>}
      <Field
        label="Nova senha"
        id="password"
        error={form.formState.errors.password?.message}
        hint="Pelo menos 12 caracteres."
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
        />
      </Field>
      <Field
        label="Confirme a nova senha"
        id="confirm"
        error={form.formState.errors.confirm?.message}
      >
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          {...form.register("confirm")}
        />
      </Field>
      <Button type="submit" loading={mutation.isPending} className="full-width">
        Salvar nova senha
      </Button>
      <Link href="/forgot-password" className="back-link">
        Solicitar um novo link
      </Link>
    </form>
  );
}
function VerifyForm() {
  const token = useSearchParams().get("token");
  const mutation = useMutation({
    mutationFn: () => post("/auth/verify-email", { token }),
  });
  return (
    <div className="form-stack">
      {mutation.isError && <Alert>{errorMessage(mutation.error)}</Alert>}
      {mutation.isSuccess ? (
        <>
          <Alert success>
            Email confirmado. Sua conta está pronta para continuar.
          </Alert>
          <Link href="/workspace" className="btn btn-primary">
            Ir para minha área de trabalho
          </Link>
        </>
      ) : token ? (
        <Button onClick={() => mutation.mutate()} loading={mutation.isPending}>
          Confirmar meu email <Check size={17} />
        </Button>
      ) : (
        <Alert>
          Este link de verificação está incompleto. Entre na sua conta para
          solicitar outro email.
        </Alert>
      )}
      <Link className="back-link" href="/login">
        <ArrowLeft size={15} /> Voltar para o login
      </Link>
    </div>
  );
}
function InvitationForm() {
  const token = useSearchParams().get("token");
  const enter = useEnterWorkspace();
  const form = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: "", password: "" },
  });
  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof inviteSchema>) => {
      await post("/auth/accept-invitation", {
        token,
        ...(data.name ? { name: data.name } : {}),
        ...(data.password ? { password: data.password } : {}),
      });
      await enter();
    },
  });
  if (!token)
    return (
      <Alert>
        O link do convite está incompleto. Peça um novo convite ao administrador
        da empresa.
      </Alert>
    );
  const next = encodeURIComponent(
    `/accept-invitation?token=${encodeURIComponent(token)}`,
  );
  return (
    <form
      onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      className="form-stack"
      noValidate
    >
      {mutation.isError && <Alert>{errorMessage(mutation.error)}</Alert>}
      <div className="info-note">
        Já tem uma conta? Informe sua senha atual ou{" "}
        <Link href={`/login?next=${next}`}>entre com o email convidado</Link>{" "}
        para aceitar. Cada conta pertence a uma única empresa. Se seu email já
        está vinculado a outra empresa, use outro email no convite.
      </div>
      <Field
        label="Seu nome, se for uma nova conta"
        id="name"
        error={form.formState.errors.name?.message}
      >
        <Input id="name" autoComplete="name" {...form.register("name")} />
      </Field>
      <Field
        label="Senha atual ou senha para sua nova conta"
        id="password"
        error={form.formState.errors.password?.message}
        hint="Para uma nova conta, use pelo menos 12 caracteres."
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...form.register("password")}
        />
      </Field>
      <Button type="submit" loading={mutation.isPending} className="full-width">
        Aceitar convite <ArrowRight size={17} />
      </Button>
    </form>
  );
}
const copy: Record<
  AuthMode,
  { label: string; title: string; description: string }
> = {
  login: {
    label: "BEM-VINDO AO DESMOS",
    title: "Entre no seu\nespaço de trabalho.",
    description: "Entre para organizar sua empresa e conectar sua equipe.",
  },
  register: {
    label: "COMECE COM UMA BOA BASE",
    title: "Crie a conta\nda sua empresa.",
    description:
      "Crie um ambiente exclusivo para sua empresa e convide sua equipe.",
  },
  "forgot-password": {
    label: "RECUPERAÇÃO DE CONTA",
    title: "Vamos recuperar\nseu acesso.",
    description: "Informe seu email e enviaremos as próximas instruções.",
  },
  "reset-password": {
    label: "RECUPERAÇÃO DE CONTA",
    title: "Defina sua\nnova senha.",
    description: "Escolha uma senha forte para manter sua conta protegida.",
  },
  "verify-email": {
    label: "QUASE TUDO PRONTO",
    title: "Confirme que\neste email é seu.",
    description: "Essa confirmação ajuda a manter o acesso à sua conta seguro.",
  },
  "accept-invitation": {
    label: "SEU TIME ESTÁ ESPERANDO",
    title: "Junte-se\nà sua equipe.",
    description: "Aceite o convite para se juntar à empresa no Desmos.",
  },
};
export function AuthScreen({ mode }: { mode: AuthMode }) {
  const content = copy[mode];
  return (
    <main className="auth-layout">
      <section className="auth-story" aria-label="Desmos CRM">
        <Link href="/login" className="brand brand-light">
          <span className="brand-mark">
            <Link2 size={23} />
          </span>
          <span>
            desmos<span className="brand-suffix">crm</span>
          </span>
        </Link>
        <div className="auth-story-content">
          <h2>
            Sua empresa.
            <br />
            Sua equipe.
            <br />
            <em>Um só lugar.</em>
          </h2>
          <p>
            Organize seu espaço de trabalho e dê a cada pessoa o acesso de que
            ela precisa.
          </p>
          <div className="orbit-illustration" aria-hidden="true">
            <div className="orbit-ring ring-one" />
            <div className="orbit-ring ring-two" />
            <div className="orbit-ring ring-three" />
            <div className="orbit-core">
              <Link2 size={46} />
            </div>
            <span className="orbit-node node-a">
              <Layers3 size={22} />
            </span>
            <span className="orbit-node node-b">
              <ShieldCheck size={22} />
            </span>
            <span className="orbit-node node-c">
              <Fingerprint size={22} />
            </span>
            <span className="orbit-point point-a" />
            <span className="orbit-point point-b" />
          </div>
        </div>
        <footer className="auth-story-footer">
          <span>ORGANIZAÇÃO QUE CONECTA.</span>
          <span>Desmos CRM © {new Date().getFullYear()}</span>
        </footer>
      </section>
      <section className="auth-main">
        <Link href="/login" className="brand mobile-brand">
          <span className="brand-mark">
            <Link2 size={23} />
          </span>
          <span>
            desmos<span className="brand-suffix">crm</span>
          </span>
        </Link>
        <div className="auth-form-wrap">
          <h1>{content.title}</h1>
          <p className="auth-description">{content.description}</p>
          {mode === "login" ? (
            <LoginForm />
          ) : mode === "register" ? (
            <RegisterForm />
          ) : mode === "forgot-password" ? (
            <ForgotForm />
          ) : mode === "reset-password" ? (
            <ResetForm />
          ) : mode === "verify-email" ? (
            <VerifyForm />
          ) : (
            <InvitationForm />
          )}
        </div>
        <p className="auth-bottom">
          <ShieldCheck size={14} /> Sua conexão com a equipe começa com
          segurança.
        </p>
      </section>
    </main>
  );
}
