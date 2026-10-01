"use client";
import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Field,
  Input,
  Select,
} from "@/components/ui/primitives";
import {
  templateSchema,
  variables,
  renderMessage,
  type MessageTemplate,
} from "./message-model";
export function MessageTemplates({
  items,
  onSave,
}: {
  items: MessageTemplate[];
  onSave: (items: MessageTemplate[]) => boolean;
}) {
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("");
  const [draft, setDraft] = useState<MessageTemplate | null>(null);
  const [error, setError] = useState("");
  const change = (key: keyof MessageTemplate, value: string) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    setError("");
  };
  const sample = renderMessage(draft?.message ?? "", {
    contato: "Marina",
    empresa: "Aurora Digital",
    negociacao: "Implantação comercial",
    responsavel: "Ana",
  });
  return (
    <section className="message-library">
      <div className="crm-section-top">
        <div>
          <h2>Modelos de mensagem</h2>
          <p>Conteúdo reutilizável · salvo neste navegador, por empresa.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setDraft({
              id: crypto.randomUUID(),
              revision: 1,
              name: "",
              channel: "EMAIL",
              subject: "",
              message: "",
            });
            setError("");
          }}
        >
          Criar modelo
        </Button>
      </div>
      {draft ? (
        <form
          className="message-template-form"
          onSubmit={(e) => {
            e.preventDefault();
            const result = templateSchema.safeParse(draft);
            if (!result.success) {
              setError(result.error.issues[0].message);
              return;
            }
            const old = items.find((t) => t.id === draft.id);
            const next = {
              ...result.data,
              revision: old ? old.revision + 1 : 1,
            };
            if (
              onSave(
                old
                  ? items.map((t) => (t.id === next.id ? next : t))
                  : [...items, next],
              )
            )
              setDraft(null);
          }}
        >
          <h3>
            {items.some((t) => t.id === draft.id)
              ? "Editar modelo"
              : "Novo modelo"}
          </h3>
          {error && <Alert>{error}</Alert>}
          <div className="form-grid">
            <Field id="template-name" label="Nome do modelo">
              <Input
                id="template-name"
                value={draft.name}
                onChange={(e) => change("name", e.target.value)}
                required
                maxLength={100}
              />
            </Field>
            <Field id="template-channel" label="Canal do modelo">
              <Select
                id="template-channel"
                value={draft.channel}
                onChange={(e) => change("channel", e.target.value)}
              >
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
              </Select>
            </Field>
          </div>
          {draft.channel === "EMAIL" && (
            <Field id="template-subject" label="Assunto do modelo">
              <Input
                id="template-subject"
                value={draft.subject}
                onChange={(e) => change("subject", e.target.value)}
                required
                maxLength={200}
              />
            </Field>
          )}
          <Field id="template-message" label="Corpo do modelo">
            <textarea
              className="input"
              id="template-message"
              rows={4}
              value={draft.message}
              onChange={(e) => change("message", e.target.value)}
              required
              maxLength={4000}
            />
          </Field>
          <div className="automation-variables">
            <span>Inserir no corpo:</span>
            {variables.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => change("message", `${draft.message} {${v}}`)}
              >{`{${v}}`}</button>
            ))}
          </div>
          <details>
            <summary>Prévia com exemplo fictício</summary>
            <p className="message-text">{sample.value}</p>
            {sample.missing.length > 0 && (
              <Alert>Variáveis sem dados: {sample.missing.join(", ")}</Alert>
            )}
          </details>
          <p className="field-hint">
            Salvar uma revisão não altera o conteúdo de automações já salvas.
          </p>
          <div className="form-actions">
            <Button type="submit">Salvar modelo</Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancelar modelo
            </Button>
          </div>
        </form>
      ) : (
        <>
          <div className="form-grid">
            <Input
              aria-label="Buscar modelo"
              placeholder="Buscar por nome"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              aria-label="Filtrar canal do modelo"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
            >
              <option value="">Todos os canais</option>
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp</option>
            </Select>
          </div>
          {items
            .filter(
              (t) =>
                (!channel || t.channel === channel) &&
                t.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
            )
            .map((t) => (
              <div className="template-row" key={t.id}>
                <div>
                  <strong>{t.name}</strong>
                  <p>
                    {t.channel === "EMAIL" ? "Email" : "WhatsApp"} · revisão{" "}
                    {t.revision}
                  </p>
                </div>
                <div className="crm-detail-actions">
                  <Badge>Local</Badge>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDraft({ ...t });
                      setError("");
                    }}
                  >
                    Editar modelo {t.name}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDraft({
                        ...t,
                        id: crypto.randomUUID(),
                        revision: 1,
                        name: `${t.name.slice(0, 85)} (cópia)`,
                      });
                      setError("");
                    }}
                  >
                    Duplicar {t.name}
                  </Button>
                </div>
              </div>
            ))}
          {!items.length && (
            <p>
              Nenhum modelo ainda. Crie um para reutilizar na ação da automação.
            </p>
          )}
        </>
      )}
    </section>
  );
}
