"use client";
import { MotionCollection } from "@/components/ui/motion";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Building2,
  ChevronDown,
  ScrollText,
  Search,
  UsersRound,
} from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingPage,
  PageHeading,
} from "@/components/ui/primitives";
import { api } from "@/lib/api";
import { formatDate, type AuditEvent } from "@/lib/types";
import { PermissionNotice } from "./company";
const actionLabels: Record<string, string> = {
  "tenant.created": "Empresa criada",
  "tenant.updated": "Dados da empresa atualizados",
  "tenant.onboarded": "Configuração inicial concluída",
  "membership.updated": "Acesso de integrante atualizado",
  "invitation.created": "Convite enviado",
  "invitation.accepted": "Convite aceito",
  "user.updated": "Perfil atualizado",
  "session.revoked": "Sessão encerrada",
  "auth.login": "Login realizado",
  "auth.logout": "Logout realizado",
};
function AuditContent({
  tenantId,
  timezone,
}: {
  tenantId: string;
  timezone: string;
}) {
  const [search, setSearch] = useState("");
  const logs = useQuery({
    queryKey: ["audit-logs", tenantId],
    queryFn: () => api<{ items: AuditEvent[] }>("/audit-logs?limit=200"),
  });
  const visible = logs.data?.items.filter((event) =>
    `${actionLabels[event.action] ?? event.action} ${event.actorName ?? ""}`
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  return (
    <Card className="table-card">
      <div className="section-heading">
        <div>
          <h2>Histórico administrativo</h2>
          <p>Os 200 eventos mais recentes desta empresa.</p>
        </div>
        <div className="search-field">
          <Search size={16} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar eventos"
            aria-label="Filtrar eventos por ação ou pessoa"
          />
        </div>
      </div>
      {logs.isPending ? (
        <LoadingPage />
      ) : logs.isError ? (
        <ErrorState error={logs.error} retry={() => logs.refetch()} />
      ) : !visible?.length ? (
        <EmptyState
          icon={<ScrollText size={27} />}
          title={
            search
              ? "Nenhum evento corresponde ao filtro"
              : "O histórico começa com as primeiras ações"
          }
          description={
            search
              ? "Tente buscar por outra ação ou nome de pessoa."
              : "Alterações na empresa, convites e acessos aparecerão aqui conforme forem realizados."
          }
        />
      ) : (
        <div className="table-scroll">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Evento</th>
                <th>Responsável</th>
                <th>Data e hora</th>
              </tr>
            </thead>
            <MotionCollection
              as="tbody"
              motionKey={visible.map((item) => item.id).join("|")}
            >
              {visible.map((event) => (
                <tr key={event.id}>
                  <td>
                    <div className="audit-action">
                      <span className="audit-icon">
                        {event.action.startsWith("tenant") ? (
                          <Building2 size={16} />
                        ) : event.action.includes("membership") ||
                          event.action.includes("invitation") ? (
                          <UsersRound size={16} />
                        ) : (
                          <Activity size={16} />
                        )}
                      </span>
                      <span>{actionLabels[event.action] ?? event.action}</span>
                    </div>
                  </td>
                  <td>{event.actorName ?? "Sistema"}</td>
                  <td className="tabular">
                    {formatDate(event.createdAt, timezone)}
                  </td>
                </tr>
              ))}
            </MotionCollection>
          </table>
        </div>
      )}
      <div className="table-bottom">
        Horários apresentados em {timezone.replaceAll("_", " ")}.
      </div>
    </Card>
  );
}
export function AuditSettings() {
  const { data: session } = useSession();
  if (!session) return null;
  if (!session.permissions.includes("audit.view")) return <PermissionNotice />;
  return (
    <div className="page-stack">
      <PageHeading
        title="Registro de atividades"
        description="Acompanhe quem realizou alterações administrativas na sua empresa."
        action={<Badge>Somente leitura</Badge>}
      />
      <AuditContent
        tenantId={session.tenant.id}
        timezone={session.tenant.timezone}
      />
    </div>
  );
}
