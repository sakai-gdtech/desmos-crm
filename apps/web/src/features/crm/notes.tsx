"use client";
import { MotionCollection } from "@/components/ui/motion";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AtSign,
  Check,
  MessageSquareText,
  Pencil,
  Pin,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
} from "@/components/ui/primitives";
import { api, errorMessage, patch, post } from "@/lib/api";
import { formatDate } from "@/lib/types";
import { TableSkeleton, useCrmReferences } from "./shared";
import type { CrmKind, CrmNote } from "./types";
function NoteComposer({
  kind,
  recordId,
  note,
  onClose,
}: {
  kind: CrmKind | "deals";
  recordId: string;
  note?: CrmNote;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { assignees } = useCrmReferences();
  const [body, setBody] = useState(note?.body ?? "");
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [mentionIds, setMentionIds] = useState(note?.mentionIds ?? []);
  const [showMentions, setShowMentions] = useState(false);
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () =>
      note
        ? patch(
            `/${kind === "deals" ? "sales" : "crm"}/${kind}/${recordId}/notes/${note.id}`,
            {
              body: body.trim(),
              pinned,
              mentionIds,
            },
          )
        : post(
            `/${kind === "deals" ? "sales" : "crm"}/${kind}/${recordId}/notes`,
            {
              body: body.trim(),
              pinned,
              mentionIds,
            },
          ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm"] });
      onClose();
    },
  });
  return (
    <form
      className="crm-note-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (!body.trim()) {
          setError("Escreva o conteúdo da nota.");
          return;
        }
        if (body.length > 10000) {
          setError("Use até 10.000 caracteres.");
          return;
        }
        if (mentionIds.length > 30) {
          setError("Selecione até 30 pessoas para mencionar.");
          return;
        }
        setError("");
        save.mutate();
      }}
    >
      <Field
        id={note ? `edit-note-${note.id}` : "new-note-body"}
        label={note ? "Editar nota" : "Nova nota"}
        error={error}
      >
        <textarea
          id={note ? `edit-note-${note.id}` : "new-note-body"}
          className="input crm-textarea"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Registre uma conversa, contexto ou decisão…"
        />
      </Field>
      <div className="crm-note-options">
        <label className="crm-check-option">
          <input
            type="checkbox"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
          />
          <Pin size={14} />
          Fixar nota
        </label>
        <Button
          variant="ghost"
          aria-expanded={showMentions}
          onClick={() => setShowMentions(!showMentions)}
        >
          <AtSign size={15} />
          Mencionar equipe{mentionIds.length ? ` (${mentionIds.length})` : ""}
        </Button>
      </div>
      {showMentions && (
        <fieldset className="crm-mention-options">
          <legend>Pessoas mencionadas</legend>
          <p>
            As menções ficam registradas nesta nota e não enviam notificações.
          </p>
          {assignees.data?.items.map((person) => (
            <label className="crm-check-option" key={person.id}>
              <input
                type="checkbox"
                checked={mentionIds.includes(person.id)}
                onChange={(e) => {
                  setMentionIds(
                    e.target.checked
                      ? [...mentionIds, person.id]
                      : mentionIds.filter((id) => id !== person.id),
                  );
                  if (e.target.checked && !body.includes(`@${person.name}`))
                    setBody(
                      (current) =>
                        `${current}${current ? " " : ""}@${person.name} `,
                    );
                }}
              />
              {person.name}
            </label>
          ))}
          {assignees.isPending && <p>Carregando equipe…</p>}
          {assignees.isError && (
            <Alert>
              Não foi possível carregar a equipe.{" "}
              <button
                type="button"
                className="text-link"
                onClick={() => assignees.refetch()}
              >
                Tentar novamente
              </button>
            </Alert>
          )}
        </fieldset>
      )}
      {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
      <div className="crm-note-actions">
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          <Check size={15} />
          {note ? "Salvar nota" : "Adicionar nota"}
        </Button>
      </div>
    </form>
  );
}
export function Notes({
  kind,
  id,
  canEdit,
  timezone,
}: {
  kind: CrmKind | "deals";
  id: string;
  canEdit: boolean;
  timezone: string;
}) {
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<CrmNote | null>(null);
  const notes = useQuery({
    queryKey: ["crm", kind, id, "notes"],
    queryFn: () =>
      api<{ items: CrmNote[] }>(
        `/${kind === "deals" ? "sales" : "crm"}/${kind}/${id}/notes`,
      ),
  });
  const remove = useMutation({
    mutationFn: (noteId: string) =>
      api(
        `/${kind === "deals" ? "sales" : "crm"}/${kind}/${id}/notes/${noteId}`,
        { method: "DELETE" },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm"] });
      setDeleting(null);
    },
  });
  const pin = useMutation({
    mutationFn: (note: CrmNote) =>
      patch(
        `/${kind === "deals" ? "sales" : "crm"}/${kind}/${id}/notes/${note.id}`,
        { pinned: !note.pinned },
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm"] }),
  });
  return (
    <section className="crm-notes" aria-label="Notas do relacionamento">
      <div className="crm-section-top">
        <div>
          <h2>Notas</h2>
          <p>Contexto compartilhado com a equipe.</p>
        </div>
        {canEdit && !composing && (
          <Button variant="secondary" onClick={() => setComposing(true)}>
            <Plus size={15} />
            Nova nota
          </Button>
        )}
      </div>
      {composing && (
        <NoteComposer
          kind={kind}
          recordId={id}
          onClose={() => setComposing(false)}
        />
      )}
      {pin.isError && <Alert>{errorMessage(pin.error)}</Alert>}
      {notes.isPending ? (
        <TableSkeleton />
      ) : notes.isError ? (
        <ErrorState error={notes.error} retry={() => notes.refetch()} />
      ) : !notes.data?.items.length ? (
        !composing && (
          <EmptyState
            icon={<MessageSquareText size={25} />}
            title="Nenhuma nota registrada"
            description="Registre conversas e decisões para manter a equipe no mesmo contexto."
          />
        )
      ) : (
        <MotionCollection
          className="crm-notes-list"
          motionKey={notes.data.items
            .map((note) => `${note.id}:${note.updatedAt}:${note.pinned}`)
            .join("|")}
        >
          {[...notes.data.items]
            .sort(
              (a, b) =>
                Number(b.pinned) - Number(a.pinned) ||
                b.createdAt.localeCompare(a.createdAt),
            )
            .map((note) => (
              <article className="crm-note" key={note.id}>
                {editing === note.id ? (
                  <NoteComposer
                    kind={kind}
                    recordId={id}
                    note={note}
                    onClose={() => setEditing(null)}
                  />
                ) : (
                  <>
                    <div className="crm-note-meta">
                      <div>
                        <strong>{note.authorName}</strong>
                        <span>{formatDate(note.createdAt, timezone)}</span>
                        {note.pinned && (
                          <Badge tone="indigo">
                            <Pin size={11} />
                            Fixada
                          </Badge>
                        )}
                        {note.updatedAt !== note.createdAt && (
                          <span>Editada</span>
                        )}
                      </div>
                      {canEdit && (
                        <div className="crm-note-controls">
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={
                              note.pinned ? "Desafixar nota" : "Fixar nota"
                            }
                            disabled={pin.isPending}
                            onClick={() => pin.mutate(note)}
                          >
                            <Pin size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Editar nota"
                            onClick={() => setEditing(note.id)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Excluir nota"
                            onClick={() => {
                              remove.reset();
                              setDeleting(note);
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="crm-note-body">{note.body}</p>
                  </>
                )}
              </article>
            ))}
        </MotionCollection>
      )}
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Excluir esta nota?"
        description="A nota será removida. O histórico manterá o registro desta ação."
      >
        {remove.isError && <Alert>{errorMessage(remove.error)}</Alert>}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() => deleting && remove.mutate(deleting.id)}
          >
            Excluir nota
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
