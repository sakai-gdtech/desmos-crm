"use client";
import { MotionCollection } from "@/components/ui/motion";
import { CustomFields } from "./fields";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  ContactRound,
  History,
  MessageSquareText,
  Pencil,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useSession } from "@/components/providers";
import {
  Alert,
  Button,
  Card,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  LoadingPage,
  Input,
  PageHeading,
  Select,
} from "@/components/ui/primitives";
import { PermissionNotice } from "@/features/settings/company";
import { api, errorMessage, post } from "@/lib/api";
import { formatDate, initials } from "@/lib/types";
import {
  DuplicateWarning,
  EntityPicker,
  Pagination,
  RecordLink,
  StatusBadge,
  TableSkeleton,
  Tags,
  TemperatureBadge,
} from "./shared";
import { RelatedDeals, RelatedWork } from "@/features/sales/work";
import { PipelineFields } from "@/features/sales/shared";
import { Notes } from "./notes";
import { Timeline } from "./timeline";
import {
  fullName,
  labels,
  type CrmItem,
  type CrmKind,
  type CrmPage,
  type Duplicate,
} from "./types";
function SafeWebsite({ value }: { value: string }) {
  return /^https?:\/\//i.test(value) ? (
    <a
      className="crm-inline-link"
      href={value}
      target="_blank"
      rel="noopener noreferrer"
    >
      {value}
    </a>
  ) : (
    <>{value}</>
  );
}
function RecordData({
  kind,
  item,
  timezone,
  currency,
}: {
  kind: CrmKind;
  item: CrmItem;
  timezone: string;
  currency: string;
}) {
  const field = (label: string, value: ReactNode) => (
    <div key={label}>
      <dt>{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
  return (
    <Card className="crm-detail-summary">
      <div className="crm-summary-identity">
        <span className="avatar avatar-lg">
          {kind === "companies" ? (
            <Building2 size={25} />
          ) : (
            initials(fullName(item))
          )}
        </span>
        <div>
          <strong>{fullName(item)}</strong>
          <p>
            {kind === "companies"
              ? item.segment || "Empresa cliente"
              : item.jobTitle || (kind === "leads" ? "Lead" : "Contato")}
          </p>
        </div>
      </div>
      {kind === "leads" && (
        <div className="crm-summary-badges">
          {item.status && <StatusBadge status={item.status} />}
          {item.temperature && (
            <TemperatureBadge temperature={item.temperature} />
          )}
        </div>
      )}
      <dl className="crm-data-list">
        {field(
          "Email",
          item.email ? <a href={`mailto:${item.email}`}>{item.email}</a> : null,
        )}
        {field(
          "Telefone",
          item.phone ? (
            <a href={`tel:${item.phone.replace(/[^+\d]/g, "")}`}>
              {item.phone}
            </a>
          ) : null,
        )}
        {kind === "contacts" &&
          field(
            "WhatsApp",
            item.whatsapp &&
              /^[0-9]{8,15}$/.test(item.whatsapp.replace(/\D/g, "")) ? (
              <a
                href={`https://wa.me/${item.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.whatsapp} · Abrir conversa
              </a>
            ) : (
              item.whatsapp
            ),
          )}
        {kind !== "companies" &&
          field(
            "Empresa cliente",
            item.companyId ? (
              <Link
                className="crm-inline-link"
                href={`/crm/companies/${item.companyId}`}
              >
                {item.companyName || "Abrir empresa cliente"}
              </Link>
            ) : (
              item.companyName
            ),
          )}
        {field("Responsável", item.assignedToName || "Sem responsável")}
        {field("Origem", item.source)}
        {kind === "companies" && (
          <>
            {field("Razão social", item.legalName)}
            {field("CNPJ / identificação fiscal", item.taxId)}
            {field(
              "Site",
              item.website && <SafeWebsite value={item.website} />,
            )}
            {field("Funcionários", item.employeeCount?.toLocaleString("pt-BR"))}
          </>
        )}
        {kind !== "leads" && (
          <>
            {field("Endereço", item.address)}
            {field(
              "Cidade / Estado",
              [item.city, item.state].filter(Boolean).join(" / "),
            )}
            {field("País", item.country)}
          </>
        )}
        {kind === "contacts" &&
          field(
            "Aniversário",
            item.birthday
              ? new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeZone: "UTC",
                }).format(new Date(item.birthday.slice(0, 10) + "T12:00:00Z"))
              : null,
          )}
        {kind === "leads" && (
          <>
            {field(
              "Valor estimado",
              item.estimatedValue
                ? new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency,
                  }).format(Number(item.estimatedValue))
                : null,
            )}
            {field(
              "Último contato",
              item.lastContactAt
                ? formatDate(item.lastContactAt, timezone)
                : null,
            )}
            {field(
              "Próximo contato",
              item.nextContactAt
                ? formatDate(item.nextContactAt, timezone)
                : null,
            )}
            {item.discardReason &&
              field("Motivo do descarte", item.discardReason)}
          </>
        )}
      </dl>
      {(item.email || (kind === "contacts" && item.whatsapp)) && (
        <p className="muted">
          Os links abrem seu aplicativo de email ou WhatsApp. Nenhuma mensagem é
          enviada ou registrada automaticamente; registre a interação em
          Atividades.
        </p>
      )}
      <div className="crm-summary-tags">
        <h3>Tags</h3>
        {item.tags.length ? <Tags tags={item.tags} /> : <p>Nenhuma tag</p>}
      </div>
      {item.description && (
        <div className="crm-summary-description">
          <h3>Descrição</h3>
          <p>{item.description}</p>
        </div>
      )}
      <CustomFields kind={kind} id={item.id} />
      <div className="crm-record-dates">
        <span>Criado em {formatDate(item.createdAt, timezone)}</span>
        <span>Atualizado em {formatDate(item.updatedAt, timezone)}</span>
      </div>
    </Card>
  );
}
function CompanyContacts({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const result = useQuery({
    queryKey: ["crm", "contacts", "company", id, page],
    queryFn: () =>
      api<CrmPage>(
        `/crm/contacts?companyId=${id}&page=${page}&pageSize=20&sort=name&order=asc`,
      ),
  });
  return (
    <section>
      <div className="crm-section-top">
        <div>
          <h2>Contatos vinculados</h2>
          <p>Pessoas relacionadas a esta empresa cliente.</p>
        </div>
        <UsersRound size={20} className="muted" />
      </div>
      {result.isPending ? (
        <TableSkeleton />
      ) : result.isError ? (
        <ErrorState error={result.error} retry={() => result.refetch()} />
      ) : !result.data?.items.length ? (
        <EmptyState
          icon={<ContactRound size={25} />}
          title="Nenhum contato vinculado"
          description="Ao cadastrar ou editar um contato, selecione esta empresa cliente para criar o vínculo."
        />
      ) : (
        <>
          <ul className="crm-related-list">
            {result.data.items.map((item) => (
              <li key={item.id}>
                <span className="avatar">{initials(fullName(item))}</span>
                <div>
                  <RecordLink kind="contacts" item={item} />
                  <p>{item.jobTitle || item.email || "Contato"}</p>
                </div>
              </li>
            ))}
          </ul>
          <Pagination
            page={page}
            total={result.data.total}
            onChange={setPage}
          />
        </>
      )}
    </section>
  );
}
function Conversion({
  item,
  open,
  onClose,
}: {
  item: CrmItem;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [createOpportunity, setCreateOpportunity] = useState(
    item.status === "CONVERTED",
  );
  const [opportunityTitle, setOpportunityTitle] = useState(
    `Negociação com ${item.name}`,
  );
  const [pipelineId, setPipelineId] = useState("");
  const [stageId, setStageId] = useState("");
  const [value, setValue] = useState(item.estimatedValue ?? "0.00");
  const [contactMode, setContactMode] = useState("new");
  const [contactId, setContactId] = useState("");
  const [companyMode, setCompanyMode] = useState(
    item.companyId ? "existing" : item.companyName ? "new" : "none",
  );
  const [companyId, setCompanyId] = useState(item.companyId ?? "");
  const convert = useMutation({
    mutationFn: () =>
      post<{ lead: CrmItem; contact: CrmItem; company: CrmItem | null }>(
        `/${createOpportunity ? "sales" : "crm"}/leads/${item.id}/convert`,
        {
          ...(contactMode === "existing" ? { contactId } : {}),
          ...(companyMode === "existing" ? { companyId } : {}),
          ...(companyMode === "new" ? { createCompany: true } : {}),
          ...(createOpportunity
            ? {
                opportunity: {
                  title: opportunityTitle,
                  pipelineId,
                  stageId,
                  value,
                  currency: session?.tenant.currency,
                },
              }
            : {}),
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm"] });
      await queryClient.invalidateQueries({ queryKey: ["sales"] });
      onClose();
    },
  });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Converter lead em contato"
      description="O lead será marcado como convertido e continuará disponível com seu histórico."
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          convert.mutate();
        }}
      >
        <Field id="convert-contact-mode" label="Destino do contato">
          <Select
            id="convert-contact-mode"
            value={contactMode}
            onChange={(e) => setContactMode(e.target.value)}
          >
            <option value="new">
              Criar novo contato com os dados deste lead
            </option>
            <option value="existing">Vincular a um contato existente</option>
          </Select>
        </Field>
        {contactMode === "existing" && (
          <EntityPicker
            kind="contacts"
            id="convert-contact"
            label="Contato existente"
            value={contactId}
            onChange={setContactId}
            emptyLabel="Selecione um contato"
          />
        )}
        <Field id="convert-company-mode" label="Empresa cliente">
          <Select
            id="convert-company-mode"
            value={companyMode}
            onChange={(e) => setCompanyMode(e.target.value)}
          >
            <option value="none">
              {item.companyId
                ? "Manter empresa já vinculada ao lead"
                : "Continuar sem criar ou selecionar empresa"}
            </option>
            {item.companyName && !item.companyId && (
              <option value="new">Criar {item.companyName}</option>
            )}
            <option value="existing">
              Vincular a uma empresa cliente existente
            </option>
          </Select>
        </Field>
        {companyMode === "existing" && (
          <EntityPicker
            kind="companies"
            id="convert-company"
            label="Empresa cliente existente"
            value={companyId}
            onChange={setCompanyId}
            selectedName={item.companyName}
            emptyLabel="Selecione uma empresa"
          />
        )}
        {contactMode === "existing" && (
          <p className="info-note">
            Os dados do contato existente serão preservados. A conversão
            registrará o vínculo com o lead.
          </p>
        )}
        {session?.permissions.includes("deals.create") && (
          <label className="crm-checkbox">
            <input
              type="checkbox"
              checked={createOpportunity}
              onChange={(e) => setCreateOpportunity(e.target.checked)}
            />
            Criar oportunidade no funil
          </label>
        )}
        {createOpportunity && (
          <>
            <Field id="convert-deal-title" label="Título da oportunidade">
              <Input
                id="convert-deal-title"
                value={opportunityTitle}
                onChange={(e) => setOpportunityTitle(e.target.value)}
                maxLength={200}
                required
              />
            </Field>
            <PipelineFields
              prefix="convert-deal"
              pipelineId={pipelineId}
              stageId={stageId}
              onPipeline={setPipelineId}
              onStage={setStageId}
            />
            <Field id="convert-deal-value" label="Valor da oportunidade">
              <Input
                id="convert-deal-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
                pattern="[0-9]+([.][0-9]{1,2})?"
                required
              />
            </Field>
          </>
        )}
        {convert.isError && <Alert>{errorMessage(convert.error)}</Alert>}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={convert.isPending}
            disabled={
              (contactMode === "existing" && !contactId) ||
              (companyMode === "existing" && !companyId) ||
              (createOpportunity &&
                (!pipelineId || !stageId || !opportunityTitle.trim()))
            }
          >
            Confirmar conversão
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
export function CrmDetail({ kind, id }: { kind: CrmKind; id: string }) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [tab, setTab] = useState("history");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const record = useQuery({
    queryKey: ["crm", kind, id],
    queryFn: () => api<{ item: CrmItem }>(`/crm/${kind}/${id}`),
    enabled: !!session,
  });
  const remove = useMutation({
    mutationFn: () => api(`/crm/${kind}/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["crm"] });
      router.push(`/crm/${kind}`);
    },
  });
  if (!session) return null;
  if (!session.permissions.includes(`${kind}.view`))
    return <PermissionNotice />;
  if (record.isPending) return <LoadingPage />;
  if (record.isError || !record.data)
    return <ErrorState error={record.error} retry={() => record.refetch()} />;
  const { item } = record.data;
  const canUpdate =
    !item.deletedAt && session.permissions.includes(`${kind}.update`);
  const saved = queryClient.getQueryData<boolean>(["crm", "saved", kind, id]);
  const duplicates =
    queryClient.getQueryData<Duplicate[]>(["crm", "duplicates", kind, id]) ??
    [];
  return (
    <div className="page-stack crm-page">
      <Link href={`/crm/${kind}`} className="back-link crm-back">
        <ArrowLeft size={15} />
        {labels[kind].plural}
      </Link>
      <PageHeading
        title={fullName(item)}
        description={
          kind === "companies"
            ? "Dados da empresa e histórico do relacionamento."
            : [item.jobTitle, item.companyName].filter(Boolean).join(" · ") ||
              "Dados e histórico do relacionamento."
        }
        action={
          <div className="crm-detail-actions">
            {canUpdate && (
              <Link
                href={`/crm/${kind}/${id}/edit`}
                className="btn btn-secondary"
              >
                <Pencil size={15} />
                Editar
              </Link>
            )}
            {!item.deletedAt &&
              session.permissions.includes(`${kind}.delete`) && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    remove.reset();
                    setDeleteOpen(true);
                  }}
                >
                  <Trash2 size={15} />
                  Excluir
                </Button>
              )}
            {!item.deletedAt &&
              kind === "leads" &&
              item.status !== "CONVERTED" &&
              session.permissions.includes("leads.convert") && (
                <Button onClick={() => setConvertOpen(true)}>
                  <ArrowRightLeft size={16} />
                  Converter lead
                </Button>
              )}
          </div>
        }
      />
      {saved && <Alert success>Cadastro salvo.</Alert>}
      <DuplicateWarning duplicates={duplicates} />
      {item.deletedAt && (
        <div className="crm-notice" role="status">
          <strong>Este registro está na lixeira.</strong>
          <p>Restaure-o para voltar a editar as informações.</p>
          <Link className="text-link" href="/crm/trash">
            Abrir lixeira
          </Link>
        </div>
      )}
      {kind === "leads" && item.status === "CONVERTED" && (
        <div className="crm-converted" role="status">
          <ArrowRightLeft size={19} />
          <div>
            <strong>Lead convertido</strong>
            <p>
              {item.convertedContactId && (
                <Link href={`/crm/contacts/${item.convertedContactId}`}>
                  Abrir contato
                </Link>
              )}
              {item.convertedDealId && (
                <Link href={`/sales/deals/${item.convertedDealId}`}>
                  Abrir oportunidade
                </Link>
              )}
              {!item.convertedDealId &&
                session.permissions.includes("deals.create") &&
                session.permissions.includes("leads.convert") && (
                  <Button
                    variant="secondary"
                    onClick={() => setConvertOpen(true)}
                  >
                    Criar oportunidade
                  </Button>
                )}
              {item.convertedCompanyId && (
                <Link href={`/crm/companies/${item.convertedCompanyId}`}>
                  Abrir empresa cliente
                </Link>
              )}
            </p>
          </div>
        </div>
      )}
      <div className="crm-detail-grid">
        <RecordData
          kind={kind}
          item={item}
          timezone={session.tenant.timezone}
          currency={session.tenant.currency}
        />
        <Card className="crm-activity-panel">
          <div
            className="crm-tabs"
            role="group"
            aria-label="Conteúdo do relacionamento"
          >
            <button
              type="button"
              aria-pressed={tab === "history"}
              onClick={() => setTab("history")}
            >
              <History size={16} />
              Histórico
            </button>
            <button
              type="button"
              aria-pressed={tab === "notes"}
              onClick={() => setTab("notes")}
            >
              <MessageSquareText size={16} />
              Notas
            </button>
            {session.permissions.includes("deals.view") && (
              <button
                type="button"
                aria-pressed={tab === "deals"}
                onClick={() => setTab("deals")}
              >
                Oportunidades
              </button>
            )}
            {session.permissions.includes("activities.view") && (
              <button
                type="button"
                aria-pressed={tab === "activities"}
                onClick={() => setTab("activities")}
              >
                Atividades
              </button>
            )}
            {session.permissions.includes("tasks.view") && (
              <button
                type="button"
                aria-pressed={tab === "tasks"}
                onClick={() => setTab("tasks")}
              >
                Tarefas
              </button>
            )}
            {kind === "companies" && (
              <button
                type="button"
                aria-pressed={tab === "contacts"}
                onClick={() => setTab("contacts")}
              >
                <ContactRound size={16} />
                Contatos
              </button>
            )}
          </div>
          <MotionCollection motionKey={tab}>
            {tab === "history" ? (
              <Timeline
                kind={kind}
                id={id}
                timezone={session.tenant.timezone}
              />
            ) : tab === "notes" ? (
              <Notes
                kind={kind}
                id={id}
                canEdit={canUpdate}
                timezone={session.tenant.timezone}
              />
            ) : tab === "deals" ? (
              <RelatedDeals
                referenceKey={
                  kind === "leads"
                    ? "leadId"
                    : kind === "contacts"
                      ? "contactId"
                      : "companyId"
                }
                referenceId={id}
              />
            ) : tab === "tasks" || tab === "activities" ? (
              <RelatedWork
                kind={tab}
                referenceKey={
                  kind === "leads"
                    ? "leadId"
                    : kind === "contacts"
                      ? "contactId"
                      : "companyId"
                }
                referenceId={id}
              />
            ) : (
              <CompanyContacts id={id} />
            )}
          </MotionCollection>
        </Card>
      </div>
      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title={`Mover ${labels[kind].singular} para a lixeira?`}
        description="O cadastro sairá das listas e poderá ser restaurado pela equipe com permissão."
      >
        {remove.isError && <Alert>{errorMessage(remove.error)}</Alert>}
        <p className="crm-dialog-record">{fullName(item)}</p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Mover para a lixeira
          </Button>
        </div>
      </Dialog>
      {kind === "leads" && (
        <Conversion
          key={`${item.id}:${item.status}`}
          item={item}
          open={convertOpen}
          onClose={() => setConvertOpen(false)}
        />
      )}
    </div>
  );
}
