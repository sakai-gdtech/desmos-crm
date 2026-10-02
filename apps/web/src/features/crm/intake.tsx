"use client";
import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/providers";
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  PageHeading,
  ErrorState,
  LoadingPage,
} from "@/components/ui/primitives";
import { api, post, patch, errorMessage } from "@/lib/api";
import { PermissionNotice } from "@/features/settings/company";
import { useCrmReferences } from "./shared";
type Intake = {
  id: string;
  name: string;
  source: string;
  ownerIds: string[];
  active: boolean;
  version: number;
};
export function IntakeForms() {
  const { data: session } = useSession();
  const cache = useQueryClient();
  const { assignees } = useCrmReferences();
  const forms = useQuery({
    queryKey: ["intake"],
    queryFn: () => api<{ items: Intake[] }>("/crm/intake"),
    enabled: session?.permissions.includes("settings.manage"),
  });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [owners, setOwners] = useState<string[]>([]);
  const [path, setPath] = useState("");
  const save = useMutation({
    mutationFn: () =>
      post<{ path: string }>("/crm/intake", { name, source, ownerIds: owners }),
    onSuccess: async (data) => {
      setPath(data.path);
      setCreating(false);
      setName("");
      setSource("");
      await cache.invalidateQueries({ queryKey: ["intake"] });
    },
  });
  const toggle = useMutation({
    mutationFn: (f: Intake) =>
      patch(`/crm/intake/${f.id}`, { active: !f.active, version: f.version }),
    onSuccess: () => cache.invalidateQueries({ queryKey: ["intake"] }),
  });
  if (!session) return null;
  if (!session.permissions.includes("settings.manage"))
    return <PermissionNotice />;
  return (
    <div className="page-stack commercial-tools-page">
      <PageHeading
        title="Entrada de leads"
        description="Um formulário de captura com origem preservada e distribuição alternada entre os responsáveis selecionados."
        action={
          !creating && (
            <Button
              onClick={() => {
                setPath("");
                setOwners([session.user.id]);
                setCreating(true);
              }}
            >
              Novo formulário
            </Button>
          )
        }
      />
      <Link href="/crm/leads" className="text-link">
        Voltar aos leads
      </Link>
      {path && (
        <Alert success>
          Formulário criado. Guarde este link; ele aparece uma única vez por
          segurança.
          <p>
            <a
              href={path}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link"
            >
              Abrir formulário de captura
            </a>
          </p>
          <Input
            readOnly
            aria-label="Link do formulário"
            value={
              typeof window === "undefined"
                ? path
                : window.location.origin + path
            }
          />
        </Alert>
      )}
      {creating && (
        <Card>
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <Field id="intake-name" label="Nome do formulário">
              <Input
                id="intake-name"
                value={name}
                required
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field id="intake-source" label="Origem dos leads">
              <Input
                id="intake-source"
                value={source}
                required
                maxLength={100}
                placeholder="Ex.: Evento de outubro"
                onChange={(e) => setSource(e.target.value)}
              />
            </Field>
            <fieldset className="form-stack">
              <legend>Distribuir entre responsáveis ativos</legend>
              <p className="field-hint">
                Selecione pessoas com permissão para editar leads. Cada nova
                entrada vai para o próximo responsável; uma única seleção fixa o
                responsável.
              </p>
              {assignees.data?.items.map((u) => (
                <label className="checkbox-label" key={u.id}>
                  <input
                    type="checkbox"
                    checked={owners.includes(u.id)}
                    onChange={(e) =>
                      setOwners((current) =>
                        e.target.checked
                          ? [...current, u.id]
                          : current.filter((id) => id !== u.id),
                      )
                    }
                  />
                  {u.name}
                </label>
              ))}
            </fieldset>
            <p className="field-hint">
              Qualquer pessoa com o link poderá cadastrar um lead. O formulário
              só recebe nome, email e telefone; não permite consultar clientes.
              Pause-o quando terminar.
            </p>
            {save.isError && <Alert>{errorMessage(save.error)}</Alert>}
            <div className="dialog-actions">
              <Button
                variant="secondary"
                disabled={save.isPending}
                onClick={() => setCreating(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                loading={save.isPending}
                disabled={!owners.length}
              >
                Criar formulário
              </Button>
            </div>
          </form>
        </Card>
      )}
      {toggle.isError && <Alert>{errorMessage(toggle.error)}</Alert>}
      {forms.isPending ? (
        <LoadingPage />
      ) : forms.isError ? (
        <ErrorState error={forms.error} retry={() => forms.refetch()} />
      ) : (
        <Card>
          <ul className="crm-related-list">
            {forms.data?.items.map((f) => (
              <li key={f.id}>
                <div>
                  <strong>{f.name}</strong>
                  <p>
                    {f.source} · {f.ownerIds.length} responsáveis ·{" "}
                    {f.active ? "Recebendo leads" : "Pausado"}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  loading={toggle.isPending}
                  onClick={() => toggle.mutate(f)}
                >
                  {f.active ? "Pausar" : "Ativar"}
                </Button>
              </li>
            ))}
          </ul>
          {!forms.data?.items.length && (
            <p className="muted">
              Crie um formulário para demonstrar uma entrada de leads distinta
              do cadastro manual.
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
export function LeadCapture({
  tenantId,
  token,
}: {
  tenantId: string;
  token: string;
}) {
  const form = useQuery({
    queryKey: ["capture", tenantId, token],
    queryFn: () => api<{ name: string }>(`/capture/${tenantId}/${token}`),
    retry: false,
  });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [requestId] = useState(() => crypto.randomUUID());
  const send = useMutation({
    mutationFn: () =>
      post(`/capture/${tenantId}/${token}`, { name, email, phone, requestId }),
  });
  return (
    <main className="capture-page">
      <Card>
        <p className="wordmark">Desmos</p>
        {form.isPending ? (
          <LoadingPage />
        ) : form.isError ? (
          <ErrorState error={form.error} />
        ) : send.isSuccess ? (
          <>
            <h1>Cadastro recebido</h1>
            <p>
              Seus dados foram registrados. Nenhuma mensagem foi enviada
              automaticamente.
            </p>
          </>
        ) : (
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              send.mutate();
            }}
          >
            <h1>{form.data.name}</h1>
            <p>Deixe seus dados para a equipe responsável pelo formulário.</p>
            <Field id="capture-name" label="Nome">
              <Input
                id="capture-name"
                value={name}
                autoComplete="name"
                maxLength={160}
                required
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field id="capture-email" label="Email">
              <Input
                id="capture-email"
                type="email"
                value={email}
                autoComplete="email"
                maxLength={254}
                required
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field id="capture-phone" label="Telefone">
              <Input
                id="capture-phone"
                type="tel"
                value={phone}
                autoComplete="tel"
                maxLength={40}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            {send.isError && <Alert>{errorMessage(send.error)}</Alert>}
            <Button type="submit" loading={send.isPending}>
              Enviar cadastro
            </Button>
            <p className="field-hint">
              Não inclua dados sensíveis. O cadastro será visível à empresa que
              compartilhou este formulário.
            </p>
          </form>
        )}
      </Card>
    </main>
  );
}
