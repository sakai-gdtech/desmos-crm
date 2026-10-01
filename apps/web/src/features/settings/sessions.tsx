"use client";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Monitor, ShieldCheck, Smartphone } from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingPage,
  PageHeading,
} from "@/components/ui/primitives";
import {
  api,
  errorMessage,
  notifySessionChange,
  setExpectedTenant,
} from "@/lib/api";
import { formatDate, type UserSession } from "@/lib/types";
function deviceName(agent: string | null) {
  if (!agent) return "Dispositivo não identificado";
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /Firefox\//.test(agent)
      ? "Firefox"
      : /Chrome\//.test(agent)
        ? "Chrome"
        : /Safari\//.test(agent)
          ? "Safari"
          : "Navegador";
  const platform = /iPhone|iPad/.test(agent)
    ? "iOS"
    : /Android/.test(agent)
      ? "Android"
      : /Macintosh/.test(agent)
        ? "macOS"
        : /Windows/.test(agent)
          ? "Windows"
          : /Linux/.test(agent)
            ? "Linux"
            : "outro sistema";
  return `${browser} no ${platform}`;
}
export function SessionsSettings() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const sessions = useQuery({
    queryKey: ["sessions", session?.user.id],
    queryFn: () => api<{ items: UserSession[] }>("/sessions"),
    enabled: !!session,
  });
  const revoke = useMutation({
    mutationFn: (item: UserSession) =>
      api(`/sessions/${item.id}`, { method: "DELETE" }),
    onSuccess: async (_, item) => {
      if (item.isCurrent) {
        setExpectedTenant(undefined);
        notifySessionChange("logout");
        queryClient.clear();
        router.replace("/login");
      } else await queryClient.invalidateQueries({ queryKey: ["sessions"] });
    },
  });
  return (
    <div className="page-stack">
      <PageHeading
        title="Dispositivos e sessões"
        description="Veja onde sua conta está conectada e mantenha seus acessos sob controle."
      />
      {revoke.isError && <Alert>{errorMessage(revoke.error)}</Alert>}
      {revoke.isSuccess && <Alert success>Sessão encerrada.</Alert>}
      {sessions.isPending ? (
        <LoadingPage />
      ) : sessions.isError ? (
        <ErrorState error={sessions.error} retry={() => sessions.refetch()} />
      ) : (
        <Card className="sessions-card">
          <div className="section-heading">
            <div>
              <h2>
                Sessões ativas{" "}
                <span className="count-badge">
                  {sessions.data.items.length}
                </span>
              </h2>
              <p>Estes dispositivos podem acessar sua conta.</p>
            </div>
            <ShieldCheck size={22} className="muted" />
          </div>
          {sessions.data.items.length === 0 ? (
            <EmptyState
              icon={<Monitor size={26} />}
              title="Nenhuma sessão encontrada"
              description="Recarregue a página para consultar seus acessos novamente."
              action={
                <Button variant="secondary" onClick={() => sessions.refetch()}>
                  Atualizar sessões
                </Button>
              }
            />
          ) : (
            <div className="session-list">
              {sessions.data.items.map((item) => (
                <div className="session-row" key={item.id}>
                  <span className="device-icon">
                    {/Mobile|Android|iPhone/i.test(item.userAgent ?? "") ? (
                      <Smartphone size={24} />
                    ) : (
                      <Monitor size={24} />
                    )}
                  </span>
                  <div className="session-info">
                    <div>
                      <h3>{deviceName(item.userAgent)}</h3>
                      {item.isCurrent && (
                        <Badge tone="green">Este dispositivo</Badge>
                      )}
                    </div>
                    <p>
                      IP {item.ipAddress ?? "não informado"} <span>·</span>{" "}
                      Iniciada em{" "}
                      {formatDate(item.createdAt, session?.tenant.timezone)}
                    </p>
                    <small>
                      Última atividade:{" "}
                      {formatDate(
                        item.lastSeenAt ?? item.createdAt,
                        session?.tenant.timezone,
                      )}
                    </small>
                  </div>
                  <Button
                    variant="secondary"
                    loading={
                      revoke.isPending && revoke.variables?.id === item.id
                    }
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(item)}
                  >
                    {item.isCurrent
                      ? "Sair deste dispositivo"
                      : "Encerrar sessão"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
      <div className="security-note security-wide">
        <ShieldCheck size={21} />
        <div>
          <h3>Viu um acesso que não reconhece?</h3>
          <p>
            Encerre a sessão desse dispositivo e redefina sua senha pela
            recuperação de acesso. Redefinir a senha encerra todas as sessões da
            conta.
          </p>
        </div>
      </div>
    </div>
  );
}
