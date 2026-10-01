"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus, Tags as TagsIcon, Trash2, X } from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeading,
} from "@/components/ui/primitives";
import { PermissionNotice } from "@/features/settings/company";
import { api, errorMessage, patch, post } from "@/lib/api";
import { TableSkeleton, Tags } from "./shared";
import type { Tag } from "./types";
const colors = [
  "#6366f1",
  "#0d9488",
  "#d97706",
  "#e11d48",
  "#8b5cf6",
  "#0284c7",
  "#64748b",
  "#16a34a",
];
const colorNames = [
  "Índigo",
  "Verde-azulado",
  "Âmbar",
  "Rosa",
  "Violeta",
  "Azul",
  "Cinza",
  "Verde",
];
function TagForm({ tag, onClose }: { tag?: Tag; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(tag?.name ?? "");
  const [color, setColor] = useState(tag?.color ?? colors[0]);
  const [error, setError] = useState("");
  const save = useMutation({
    mutationFn: () =>
      tag
        ? patch(`/crm/tags/${tag.id}`, { name: name.trim(), color })
        : post("/crm/tags", { name: name.trim(), color }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm"] });
      onClose();
    },
  });
  return (
    <form
      className="crm-tag-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) {
          setError("Informe o nome da tag.");
          return;
        }
        setError("");
        save.mutate();
      }}
    >
      <Field id="tag-name" label="Nome da tag" error={error}>
        <Input
          id="tag-name"
          autoFocus
          maxLength={50}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Cliente estratégico"
        />
      </Field>
      <fieldset className="crm-color-field">
        <legend>Cor da tag</legend>
        <div className="crm-color-options">
          {colors.map((value, i) => (
            <label key={value} title={colorNames[i]}>
              <input
                type="radio"
                name="tag-color"
                value={value}
                checked={color === value}
                onChange={() => setColor(value)}
                aria-label={colorNames[i]}
              />
              <span style={{ backgroundColor: value }}>
                {color === value && <Check size={13} />}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="crm-tag-preview">
        <span>Prévia</span>
        <Tags
          tags={[{ id: "preview", name: name.trim() || "Nome da tag", color }]}
        />
      </div>
      {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
      <div className="crm-note-actions">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={save.isPending}>
          {tag ? "Salvar tag" : "Criar tag"}
        </Button>
      </div>
    </form>
  );
}
export function CrmTags() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Tag | "new" | null>(null);
  const [deleting, setDeleting] = useState<Tag | null>(null);
  const result = useQuery({
    queryKey: ["crm", "tags"],
    queryFn: () => api<{ items: Tag[] }>("/crm/tags"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/crm/tags/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm"] });
      setDeleting(null);
    },
  });
  if (!session) return null;
  if (!session.permissions.includes("tags.manage")) return <PermissionNotice />;
  return (
    <div className="page-stack crm-page">
      <PageHeading
        title="Tags"
        description="Organize leads, contatos e empresas clientes com classificações compartilhadas."
        action={
          !editing && (
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} />
              Nova tag
            </Button>
          )
        }
      />
      {editing && (
        <Card className="settings-form crm-tag-edit">
          <div className="section-heading">
            <h2>{editing === "new" ? "Nova tag" : "Editar tag"}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Fechar edição de tag"
              onClick={() => setEditing(null)}
            >
              <X size={18} />
            </button>
          </div>
          <TagForm
            key={editing === "new" ? "new" : editing.id}
            tag={editing === "new" ? undefined : editing}
            onClose={() => setEditing(null)}
          />
        </Card>
      )}
      <Card className="table-card">
        {result.isPending ? (
          <TableSkeleton />
        ) : result.isError ? (
          <ErrorState error={result.error} retry={() => result.refetch()} />
        ) : !result.data?.items.length ? (
          <EmptyState
            icon={<TagsIcon size={28} />}
            title="Crie sua primeira tag"
            description="Use tags para identificar segmentos, interesses e outros grupos de relacionamento."
          />
        ) : (
          <ul className="crm-tags-management">
            {result.data.items.map((tag) => (
              <li key={tag.id}>
                <Tags tags={[tag]} />
                <div className="crm-row-actions">
                  <Button
                    variant="ghost"
                    aria-label={`Editar tag ${tag.name}`}
                    onClick={() => setEditing(tag)}
                  >
                    <Pencil size={14} />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={`Excluir tag ${tag.name}`}
                    onClick={() => {
                      remove.reset();
                      setDeleting(tag);
                    }}
                  >
                    <Trash2 size={14} />
                    Excluir
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Excluir esta tag?"
        description="A tag será removida de todos os cadastros. Os registros continuarão disponíveis."
      >
        <p className="crm-dialog-record">{deleting?.name}</p>
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
            Excluir tag
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
