"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import {
  Button,
  Dialog,
  ErrorState,
  LoadingPage,
} from "@/components/ui/primitives";
import { api, post } from "@/lib/api";
import { formatDate } from "@/lib/types";
import { useSession } from "@/components/providers";
type Notice = {
  id: string;
  title: string;
  reason: string;
  workId: string | null;
  workKind: "tasks" | "activities" | null;
  dealId: string | null;
  readAt: string | null;
  createdAt: string;
};
export function Notifications() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const cache = useQueryClient();
  const notices = useQuery({
    queryKey: ["notifications", session?.tenant.id, session?.user.id],
    enabled: !!session,
    queryFn: () => api<{ items: Notice[] }>("/notifications"),
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
  const mark = useMutation({
    mutationFn: (id: string) => post(`/notifications/${id}/read`),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const count = notices.data?.items.filter((n) => !n.readAt).length ?? 0;
  return (
    <>
      <button
        className="icon-button"
        type="button"
        aria-label={`Avisos internos${count ? ` (${count} não lidos)` : ""}`}
        title="Avisos internos"
        onClick={() => setOpen(true)}
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="notice-count">{count > 9 ? "9+" : count}</span>
        )}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Avisos internos"
        description="Lembretes nas 24 horas anteriores ao prazo e alertas de atraso. Atualizados a cada minuto, enquanto a API estiver ativa."
      >
        {notices.isPending ? (
          <LoadingPage />
        ) : notices.isError ? (
          <ErrorState error={notices.error} retry={() => notices.refetch()} />
        ) : (
          <ul className="crm-related-list notification-list">
            {notices.data.items.map((n) => (
              <li key={n.id}>
                <div>
                  <strong>{n.title}</strong>
                  <p>
                    {n.reason} ·{" "}
                    {formatDate(n.createdAt, session?.tenant.timezone)}
                  </p>
                  <Link
                    className="text-link"
                    href={
                      n.workId
                        ? `/sales/${n.workKind ?? "tasks"}/${n.workId}`
                        : `/sales/deals/${n.dealId}`
                    }
                    onClick={() => {
                      if (!n.readAt) mark.mutate(n.id);
                      setOpen(false);
                    }}
                  >
                    Abrir {n.workId ? "compromisso" : "negócio"}
                  </Link>
                </div>
                {!n.readAt && (
                  <Button
                    variant="ghost"
                    loading={mark.isPending}
                    onClick={() => mark.mutate(n.id)}
                  >
                    Marcar lido
                  </Button>
                )}
              </li>
            ))}
            {!notices.data.items.length && (
              <li>
                Nenhum aviso pendente. Ao atribuir um compromisso com prazo,
                você recebe um lembrete interno.
              </li>
            )}
          </ul>
        )}
      </Dialog>
    </>
  );
}
