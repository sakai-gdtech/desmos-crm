"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailPlus, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingPage,
  PageHeading,
  Select,
} from "@/components/ui/primitives";
import { api, errorMessage, patch, post } from "@/lib/api";
import {
  formatDate,
  initials,
  roleLabels,
  roles,
  type Invitation,
  type Member,
  type Role,
} from "@/lib/types";
import { PermissionNotice } from "./company";
const schema = z.object({
  email: z.email("Informe um email válido."),
  role: z.enum(["OWNER", "ADMIN", "MANAGER", "SALES", "SUPPORT", "VIEWER"]),
});
function TeamContent({
  tenantId,
  owner,
  timezone,
  userId,
}: {
  tenantId: string;
  owner: boolean;
  timezone: string;
  userId: string;
}) {
  const queryClient = useQueryClient();
  const [pendingChange, setPendingChange] = useState<{
    id: string;
    role?: Role;
    status?: string;
  } | null>(null);
  const members = useQuery({
    queryKey: ["memberships", tenantId],
    queryFn: () => api<{ items: Member[] }>("/memberships"),
  });
  const invitations = useQuery({
    queryKey: ["invitations", tenantId],
    queryFn: () => api<{ items: Invitation[] }>("/invitations"),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", role: "SALES" },
  });
  const invite = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      post("/invitations", values),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({
        queryKey: ["invitations", tenantId],
      });
    },
  });
  const update = useMutation({
    mutationFn: ({
      id,
      ...values
    }: {
      id: string;
      role?: Role;
      status?: string;
    }) => patch(`/memberships/${id}`, values),
    onSuccess: async () => {
      setPendingChange(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["memberships", tenantId] }),
        queryClient.invalidateQueries({ queryKey: ["me"] }),
      ]);
    },
  });
  const requestUpdate = (
    member: Member,
    values: { role?: Role; status?: string },
  ) => {
    update.reset();
    const change = { id: member.id, ...values };
    if (
      member.user.id === userId &&
      (values.status === "SUSPENDED" ||
        (values.role && values.role !== member.role))
    ) {
      setPendingChange(change);
    } else {
      update.mutate(change);
    }
  };
  return (
    <div className="page-stack">
      <Dialog
        open={!!pendingChange}
        onClose={() => {
          if (!update.isPending) setPendingChange(null);
        }}
        title="Alterar seu próprio acesso?"
        description={
          pendingChange?.status === "SUSPENDED"
            ? "Você será desconectado desta empresa. Outra pessoa com permissão precisará reativar seu acesso."
            : `Seu papel mudará para ${pendingChange?.role ? roleLabels[pendingChange.role] : "outro papel"}. Outra pessoa com permissão precisará restaurar o papel anterior.`
        }
      >
        <div className="form-stack">
          {update.isError && <Alert>{errorMessage(update.error)}</Alert>}
          <div className="form-actions">
            <Button
              variant="secondary"
              disabled={update.isPending}
              onClick={() => setPendingChange(null)}
            >
              Manter meu acesso
            </Button>
            <Button
              variant="danger"
              loading={update.isPending}
              onClick={() => {
                if (pendingChange) update.mutate(pendingChange);
              }}
            >
              Confirmar alteração
            </Button>
          </div>
        </div>
      </Dialog>
      <Card className="invite-card">
        <div className="section-heading">
          <div>
            <h2>Traga sua equipe para o Desmos</h2>
            <p>
              Um convite individual, com a permissão certa para cada pessoa.
            </p>
          </div>
          <MailPlus size={22} className="muted" />
        </div>
        <form
          className="invite-form"
          onSubmit={form.handleSubmit((v) => invite.mutate(v))}
          noValidate
        >
          <Field
            label="Email da pessoa"
            id="invite-email"
            error={form.formState.errors.email?.message}
          >
            <Input
              id="invite-email"
              type="email"
              placeholder="pessoa@empresa.com.br"
              {...form.register("email")}
            />
          </Field>
          <Field
            label="Papel de acesso"
            id="invite-role"
            error={form.formState.errors.role?.message}
          >
            <Select id="invite-role" {...form.register("role")}>
              {roles
                .filter((r) => owner || r !== "OWNER")
                .map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
            </Select>
          </Field>
          <Button type="submit" loading={invite.isPending}>
            <UserPlus size={16} /> Enviar convite
          </Button>
        </form>
        {invite.isError && <Alert>{errorMessage(invite.error)}</Alert>}
        {invite.isSuccess && (
          <Alert success>
            Convite criado. A pessoa receberá as instruções por email.
          </Alert>
        )}
      </Card>
      <Card className="table-card">
        <div className="section-heading">
          <div>
            <h2>
              Pessoas da empresa{" "}
              {members.data && (
                <span className="count-badge">{members.data.items.length}</span>
              )}
            </h2>
            <p>Gerencie as responsabilidades e o acesso de cada pessoa.</p>
          </div>
        </div>
        {update.isError && (
          <div className="table-feedback">
            <Alert>{errorMessage(update.error)}</Alert>
          </div>
        )}
        {update.isSuccess && (
          <div className="table-feedback">
            <Alert success>Acesso atualizado.</Alert>
          </div>
        )}
        {members.isPending ? (
          <LoadingPage />
        ) : members.isError ? (
          <ErrorState error={members.error} retry={() => members.refetch()} />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Pessoa</th>
                  <th>Papel</th>
                  <th>Status</th>
                  <th className="align-right">Acesso</th>
                </tr>
              </thead>
              <tbody>
                {members.data.items.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div className="person-cell">
                        <span className="avatar avatar-small">
                          {initials(member.user.name)}
                        </span>
                        <div>
                          <strong>
                            {member.user.name}
                            {member.user.id === userId && (
                              <span className="self-label">Você</span>
                            )}
                          </strong>
                          <small>{member.user.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Select
                        aria-label={`Papel de ${member.user.name}`}
                        className="table-select"
                        value={member.role}
                        disabled={
                          update.isPending ||
                          (!owner && member.role === "OWNER")
                        }
                        onChange={(e) =>
                          requestUpdate(member, {
                            role: e.target.value as Role,
                          })
                        }
                      >
                        {roles
                          .filter(
                            (r) =>
                              owner || r !== "OWNER" || member.role === "OWNER",
                          )
                          .map((r) => (
                            <option key={r} value={r}>
                              {roleLabels[r]}
                            </option>
                          ))}
                      </Select>
                    </td>
                    <td>
                      <Badge
                        tone={member.status === "ACTIVE" ? "green" : "amber"}
                      >
                        {member.status === "ACTIVE" ? "Ativo" : "Suspenso"}
                      </Badge>
                    </td>
                    <td className="align-right">
                      <Button
                        variant="ghost"
                        className={
                          member.status === "ACTIVE" ? "danger-text" : ""
                        }
                        disabled={
                          update.isPending ||
                          (!owner && member.role === "OWNER")
                        }
                        onClick={() =>
                          requestUpdate(member, {
                            status:
                              member.status === "ACTIVE"
                                ? "SUSPENDED"
                                : "ACTIVE",
                          })
                        }
                      >
                        {member.status === "ACTIVE" ? "Suspender" : "Reativar"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Card className="table-card">
        <div className="section-heading">
          <div>
            <h2>Convites</h2>
            <p>Acompanhe os convites enviados por esta empresa.</p>
          </div>
        </div>
        {invitations.isPending ? (
          <LoadingPage />
        ) : invitations.isError ? (
          <ErrorState
            error={invitations.error}
            retry={() => invitations.refetch()}
          />
        ) : invitations.data.items.length === 0 ? (
          <EmptyState
            icon={<MailPlus size={26} />}
            title="Seu primeiro convite começa acima"
            description="Informe o email e o papel de uma pessoa para trazê-la ao seu espaço de trabalho."
          />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Papel</th>
                  <th>Status</th>
                  <th>Válido até</th>
                </tr>
              </thead>
              <tbody>
                {invitations.data.items.map((invitation) => (
                  <tr key={invitation.id}>
                    <td>{invitation.email}</td>
                    <td>{roleLabels[invitation.role]}</td>
                    <td>
                      <Badge
                        tone={
                          invitation.status === "ACCEPTED"
                            ? "green"
                            : invitation.status === "EXPIRED"
                              ? "neutral"
                              : "amber"
                        }
                      >
                        {invitation.status === "ACCEPTED"
                          ? "Aceito"
                          : invitation.status === "EXPIRED"
                            ? "Expirado"
                            : "Pendente"}
                      </Badge>
                    </td>
                    <td className="tabular">
                      {formatDate(invitation.expiresAt, timezone)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="roles-note">
        <ShieldCheck size={20} />
        <div>
          <h3>Permissões acompanham o papel</h3>
          <p>
            Proprietários e administradores gerenciam a empresa e os acessos.
            Gestores, vendedores, suporte e visualizadores têm permissões
            operacionais específicas. Apenas proprietários podem alterar o papel
            de outro proprietário.
          </p>
        </div>
      </div>
    </div>
  );
}
export function TeamSettings() {
  const { data: session } = useSession();
  if (!session) return null;
  if (!session.permissions.includes("users.manage"))
    return <PermissionNotice />;
  return (
    <div className="page-stack">
      <PageHeading
        title="Equipe e acessos"
        description={`As pessoas que fazem parte de ${session.tenant.name}.`}
        action={
          <span className="page-heading-icon">
            <UsersRound size={23} />
          </span>
        }
      />
      <TeamContent
        tenantId={session.tenant.id}
        owner={session.membership.role === "OWNER"}
        timezone={session.tenant.timezone}
        userId={session.user.id}
      />
    </div>
  );
}
