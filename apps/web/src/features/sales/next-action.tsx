"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarClock, Check, Plus } from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Button,
  ErrorState,
  Field,
  Input,
  LoadingPage,
} from "@/components/ui/primitives";
import { api, errorMessage, patch, post } from "@/lib/api";
import { formatDate } from "@/lib/types";
import { OwnerField, useSalesInvalidation } from "./shared";
import type { Deal, Page, Work } from "./types";
export function NextAction({ deal }: { deal: Deal }) {
  const { data: session } = useSession();
  const invalidate = useSalesInvalidation();
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const result = useQuery({
    queryKey: ["sales", "tasks", "next", deal.id],
    queryFn: () =>
      api<Page<Work>>(`/sales/tasks?dealId=${deal.id}&pageSize=100`),
    enabled: !!session?.permissions.includes("tasks.view"),
  });
  const complete = useMutation({
    mutationFn: (work: Work) =>
      patch(`/sales/tasks/${work.id}`, {
        status: "DONE",
        version: work.version,
      }),
    onSuccess: async () => {
      setNotice("Tarefa concluída.");
      await invalidate();
    },
    onError: () => invalidate(),
  });
  if (!session?.permissions.includes("tasks.view") || deal.deletedAt)
    return null;
  const tasks =
    result.data?.items.filter((w) =>
      ["TODO", "IN_PROGRESS"].includes(w.status),
    ) ?? [];
  return (
    <section className="next-action" aria-label="Próxima ação">
      <div className="crm-section-top">
        <h2>
          <CalendarClock size={18} />
          Próxima ação
        </h2>
        {session.permissions.includes("tasks.create") && !creating && (
          <Button
            onClick={() => {
              setCreating(true);
              setNotice("");
            }}
          >
            <Plus size={15} />
            Criar tarefa
          </Button>
        )}
      </div>
      {notice && <Alert success>{notice}</Alert>}
      {complete.isError && <Alert>{errorMessage(complete.error)}</Alert>}
      {creating ? (
        <QuickTask
          deal={deal}
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            setNotice("Próxima ação registrada.");
          }}
        />
      ) : result.isPending ? (
        <LoadingPage />
      ) : result.isError ? (
        <ErrorState error={result.error} retry={() => result.refetch()} />
      ) : tasks.length ? (
        <div className="next-task-list">
          {tasks.slice(0, 3).map((w) => (
            <div className="next-task" key={w.id}>
              <div>
                <Link className="text-link" href={`/sales/tasks/${w.id}`}>
                  {w.title}
                </Link>
                <p
                  className={
                    w.dueAt && new Date(w.dueAt) < new Date()
                      ? "task-overdue"
                      : ""
                  }
                >
                  {w.dueAt
                    ? formatDate(w.dueAt, session.tenant.timezone)
                    : "Sem prazo"}{" "}
                  · {w.assignedToName || "Sem responsável"}
                </p>
              </div>
              {session.permissions.includes("tasks.update") && (
                <Button
                  variant="secondary"
                  loading={complete.isPending}
                  onClick={() => complete.mutate(w)}
                  aria-label={`Concluir ${w.title}`}
                >
                  <Check size={15} />
                  Concluir
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted">
          Nenhuma tarefa pendente. Registre o próximo passo para manter a
          negociação em movimento.
        </p>
      )}
    </section>
  );
}
function tomorrow() {
  const d = new Date(Date.now() + 86400000);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
export function QuickTask({
  deal,
  onCancel,
  onSaved,
}: {
  deal: Deal;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { data: session } = useSession();
  const invalidate = useSalesInvalidation();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(tomorrow);
  const [owner, setOwner] = useState(deal.assignedTo || session?.user.id || "");
  const [description, setDescription] = useState("");
  const lock = useRef(false);
  const save = useMutation({
    mutationFn: () =>
      post("/sales/tasks", {
        title: title.trim(),
        dueAt: new Date(due).toISOString(),
        assignedTo: owner || null,
        dealId: deal.id,
        companyId: deal.companyId,
        contactId: deal.contactId,
        leadId: deal.leadId,
        description: description || null,
        priority: "MEDIUM",
        status: "TODO",
        checklist: [],
      }),
    onSuccess: async () => {
      await invalidate();
      onSaved();
    },
    onSettled: () => {
      lock.current = false;
    },
  });
  return (
    <form
      className="form-stack quick-task-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (lock.current) return;
        lock.current = true;
        save.mutate();
      }}
    >
      <Field id="next-title" label="O que precisa ser feito?">
        <Input
          autoFocus
          id="next-title"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: confirmar proposta com o cliente"
        />
      </Field>
      <div className="form-grid">
        <Field id="next-due" label="Prazo">
          <Input
            id="next-due"
            type="datetime-local"
            required
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </Field>
        <OwnerField id="next-owner" value={owner} onChange={setOwner} />
      </div>
      <p className="field-hint">
        Vinculada a {deal.title}. Horário deste dispositivo.
      </p>
      <details className="more-details">
        <summary>Mais detalhes</summary>
        <Field id="next-description" label="Descrição">
          <textarea
            id="next-description"
            className="input"
            maxLength={10000}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </details>
      {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
      <div className="form-actions">
        <Button
          variant="secondary"
          disabled={save.isPending}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          Salvar tarefa
        </Button>
      </div>
    </form>
  );
}
