"use client";

import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleDot,
  Mail,
  Settings2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Badge,
  Button,
  Card,
  PageHeading,
  Skeleton,
} from "@/components/ui/primitives";
import { api, errorMessage, post } from "@/lib/api";
import { roleLabels, type Invitation, type Member } from "@/lib/types";

export function Overview() {
  const { data: session } = useSession();
  const canManage = session?.permissions.includes("users.manage") ?? false;
  const members = useQuery({
    queryKey: ["memberships", session?.tenant.id],
    queryFn: () => api<{ items: Member[] }>("/memberships"),
    enabled: !!session && canManage,
  });
  const invitations = useQuery({
    queryKey: ["invitations", session?.tenant.id],
    queryFn: () => api<{ items: Invitation[] }>("/invitations"),
    enabled: !!session && canManage,
  });
  const verification = useMutation({
    mutationFn: () => post("/auth/resend-verification"),
  });
  if (!session) return null;
  const { user, tenant, permissions } = session;
  const canSettings = permissions.includes("settings.manage");
  const activeMembers =
    members.data?.items.filter((m) => m.status === "ACTIVE").length ?? 0;
  const pendingInvites =
    invitations.data?.items.filter((i) =>
      i.status
        ? i.status === "PENDING"
        : !i.acceptedAt && new Date(i.expiresAt).getTime() > Date.now(),
    ).length ?? 0;
  const tasks = [
    {
      name: "Crie sua conta e empresa",
      description: "Um espaço exclusivo para organizar o seu negócio.",
      done: true,
      href: "/settings/profile",
      action: "Ver perfil",
    },
    {
      name: "Conte um pouco sobre sua empresa",
      description: "Defina segmento, tamanho da equipe e objetivos.",
      done: !!tenant.onboardingCompletedAt,
      href: canSettings ? "/onboarding" : undefined,
      action: "Configurar",
    },
    {
      name: "Confirme seu email",
      description: `Verifique o endereço ${user.email}.`,
      done: !!user.emailVerifiedAt,
      verify: true,
      action: "Enviar confirmação",
    },
    ...(canManage
      ? [
          {
            name: "Convide as pessoas do seu time",
            description:
              "Distribua acessos com o papel certo para cada pessoa.",
            done: activeMembers > 1 || pendingInvites > 0,
            href: "/settings/team",
            action: "Convidar equipe",
          },
        ]
      : []),
  ];
  const done = tasks.filter((t) => t.done).length;
  const ready = done === tasks.length;
  const today = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    timeZone: tenant.timezone,
  }).format(new Date());
  return (
    <div className="page-stack">
      <PageHeading
        title={`Olá, ${user.name.split(" ")[0]}.`}
        description="Organize sua empresa e os acessos da equipe."
        action={<span className="date-label">{today}</span>}
      />
      <div className="overview-layout">
        <section className="card setup-card">
          <div className="section-heading">
            <div>
              <h2>Primeiros passos</h2>
              <p>Conclua a configuração do seu espaço de trabalho.</p>
            </div>
            <span className="progress-label">
              {done} de {tasks.length}
            </span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Progresso da configuração"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={tasks.length}
          >
            <div style={{ width: `${(done / tasks.length) * 100}%` }} />
          </div>
          <div className="checklist">
            {tasks.map((task) => (
              <div
                className={`checklist-row ${task.done ? "is-complete" : ""}`}
                key={task.name}
              >
                <span className="checklist-icon">
                  {task.done ? <Check size={17} /> : <Circle size={20} />}
                </span>
                <div>
                  <h3>{task.name}</h3>
                  <p>{task.description}</p>
                  {!task.done && !task.href && !task.verify && (
                    <span className="field-hint">
                      O administrador da empresa pode concluir esta etapa.
                    </span>
                  )}
                </div>
                {task.done ? (
                  <Badge tone="green">Concluído</Badge>
                ) : task.verify ? (
                  <Button
                    variant="secondary"
                    loading={verification.isPending}
                    onClick={() => verification.mutate()}
                  >
                    Enviar email <Mail size={14} />
                  </Button>
                ) : task.href ? (
                  <Link href={task.href} className="btn btn-secondary">
                    {task.action}
                    <ChevronRight size={15} />
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
          {verification.isSuccess && (
            <Alert success>
              Solicitação recebida. Confira sua caixa de entrada para confirmar
              o email.
            </Alert>
          )}
          {verification.isError && (
            <Alert>{errorMessage(verification.error)}</Alert>
          )}
        </section>
        <aside className="overview-aside">
          <Card className="company-summary">
            <div className="summary-title">
              <span className="large-company-icon">
                <Building2 size={24} />
              </span>
              <Badge tone="green">Ativa</Badge>
            </div>
            <h2>{tenant.name}</h2>
            <p>{tenant.segment || "Seu segmento ainda não foi definido"}</p>
            <dl className="detail-list">
              <div>
                <dt>Seu papel</dt>
                <dd>{roleLabels[session.membership.role]}</dd>
              </div>
              <div>
                <dt>Fuso horário</dt>
                <dd>{tenant.timezone.replaceAll("_", " ")}</dd>
              </div>
              <div>
                <dt>Moeda</dt>
                <dd>{tenant.currency}</dd>
              </div>
              {canManage && (
                <div>
                  <dt>Pessoas com acesso</dt>
                  <dd>
                    {members.isPending ? (
                      <Skeleton className="skeleton-value" />
                    ) : members.isError ? (
                      "Indisponível"
                    ) : (
                      activeMembers
                    )}
                  </dd>
                </div>
              )}
            </dl>
            {canSettings && (
              <Link href="/settings/company" className="summary-footer">
                Gerenciar empresa <Settings2 size={15} />
              </Link>
            )}
          </Card>
          <div className="security-note">
            <ShieldCheck size={20} />
            <div>
              <h3>Acessos sob controle</h3>
              <p>
                Consulte os dispositivos conectados e encerre sessões quando
                precisar.
              </p>
              <Link href="/settings/sessions">
                Revisar minhas sessões <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
