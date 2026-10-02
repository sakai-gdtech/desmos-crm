"use client";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { Alert } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { SessionContext } from "@/lib/types";
import type { Pipeline } from "@/features/sales/types";
import {
  templateSchema,
  type MessageTemplate,
} from "@/features/sales/message-model";
import { useAssistantDraft } from "./assistant-context";
const Conversation = dynamic(
  () =>
    import("@/features/sales/automation-assistant").then(
      (m) => m.AutomationAssistant,
    ),
  { loading: () => <p role="status">Abrindo assistente…</p> },
);
export function GlobalAssistant({ session }: { session: SessionContext }) {
  const pathname = usePathname();
  const router = useRouter();
  const { queueDraft } = useAssistantDraft();
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [error, setError] = useState("");
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const canDraft = session.permissions.includes("pipelines.manage");
  const pipelines = useQuery({
    queryKey: ["sales", "pipelines"],
    queryFn: () => api<{ items: Pipeline[] }>("/sales/pipelines"),
    enabled: open && canDraft,
  });
  const context = pathname.includes("automations")
    ? "Automações"
    : pathname.includes("agenda")
      ? "Agenda"
      : pathname.includes("tasks")
        ? "Tarefas"
        : pathname.includes("crm")
          ? "Clientes"
          : pathname.includes("sales")
            ? "Negócios"
            : pathname.includes("settings")
              ? "Configurações"
              : "Visão geral";
  useEffect(() => {
    if (!open) return;
    const read = () => {
      if (!canDraft) return;
      try {
        const raw = localStorage.getItem(
          `desmos-message-templates:${session.tenant.id}:v1`,
        );
        const data = raw ? JSON.parse(raw) : { version: 1, items: [] };
        if (data.version !== 1 || !Array.isArray(data.items)) throw new Error();
        setTemplates(data.items.map((t: unknown) => templateSchema.parse(t)));
        setError("");
      } catch {
        setTemplates([]);
        setError(
          "Não foi possível ler a biblioteca local. Você ainda pode preparar uma mensagem nesta regra.",
        );
      }
    };
    read();
    window.addEventListener("desmos:templates-updated", read);
    window.addEventListener("storage", read);
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    panel.current
      ?.querySelector<HTMLButtonElement>("button")
      ?.focus({ preventScroll: true });
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) {
        setOpen(false);
        previous?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("desmos:templates-updated", read);
      window.removeEventListener("storage", read);
      window.removeEventListener("keydown", escape);
    };
  }, [open, canDraft, session.tenant.id]);
  function close() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  return (
    <>
      <button
        ref={trigger}
        className="btn btn-secondary assistant-entry"
        aria-expanded={open}
        aria-controls="global-assistant"
        onClick={() => {
          setVisited(true);
          setOpen((v) => !v);
        }}
      >
        <Sparkles size={16} />
        <span>Assistente</span>
      </button>
      {visited && (
        <aside
          ref={panel}
          id="global-assistant"
          hidden={!open}
          className="global-assistant"
          aria-label="Assistente Desmos"
        >
          <div className="global-assistant-heading">
            <div>
              <h2>Assistente Desmos</h2>
              <p>Contexto: {context}</p>
            </div>
            <button
              className="icon-button"
              onClick={close}
              aria-label="Fechar assistente"
            >
              <X size={20} />
            </button>
          </div>
          <div className="global-assistant-body">
            {error && <Alert>{error}</Alert>}
            {pipelines.isError && (
              <Alert>
                Os funis não carregaram. Feche e reabra para tentar novamente; a
                ajuda continua disponível.
              </Alert>
            )}
            <Conversation
              pipelines={pipelines.data?.items.filter((p) => p.active) ?? []}
              templates={templates}
              user={session.user}
              context={context}
              canDraft={canDraft}
              onDraft={(rule, pipelineId) => {
                queueDraft({ rule, pipelineId });
                close();
                if (!pathname.includes("automations"))
                  router.push(
                    `/sales/automations?pipelineId=${encodeURIComponent(pipelineId)}`,
                  );
              }}
            />
          </div>
        </aside>
      )}
    </>
  );
}
