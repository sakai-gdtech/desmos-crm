export type CrmKind = "leads" | "contacts" | "companies";
export type Tag = { id: string; name: string; color: string };
export type Assignee = { id: string; name: string };
export type CrmItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  tags: Tag[];
  source: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
  lastName?: string | null;
  whatsapp?: string | null;
  jobTitle?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  birthday?: string | null;
  legalName?: string | null;
  taxId?: string | null;
  website?: string | null;
  segment?: string | null;
  employeeCount?: number | null;
  status?: LeadStatus;
  temperature?: "COLD" | "WARM" | "HOT";
  estimatedValue?: string | null;
  discardReason?: string | null;
  lastContactAt?: string | null;
  nextContactAt?: string | null;
  convertedContactId?: string | null;
  convertedCompanyId?: string | null;
  convertedDealId?: string | null;
};
export type LeadStatus =
  "NEW" | "CONTACTED" | "QUALIFIED" | "DISCARDED" | "ARCHIVED" | "CONVERTED";
export type CrmPage = {
  items: CrmItem[];
  total: number;
  page: number;
  pageSize: number;
};
export type Duplicate = {
  id: string;
  name: string;
  kind: CrmKind;
  matchedBy: ("email" | "phone")[];
};
export type CrmResponse = { item: CrmItem; duplicates: Duplicate[] };
export type CrmNote = {
  id: string;
  body: string;
  pinned: boolean;
  mentionIds: string[];
  authorName: string;
  createdAt: string;
  updatedAt: string;
};
export type TimelineEvent = {
  id: string;
  type: string;
  actorName: string | null;
  createdAt: string;
  metadata: {
    changes?: {
      field: string;
      before: unknown;
      after: unknown;
      beforeLabel?: string;
      afterLabel?: string;
    }[];
    name?: string;
    bodyPreview?: string;
    contactId?: string;
    companyId?: string;
    [key: string]: unknown;
  };
};
export const kinds: CrmKind[] = ["leads", "contacts", "companies"];
export const labels = {
  leads: {
    plural: "Leads",
    singular: "lead",
    create: "Novo lead",
    edit: "Editar lead",
    description: "Organize os primeiros contatos e avance na qualificação.",
    empty:
      "Cadastre um lead para acompanhar o primeiro contato e sua evolução.",
  },
  contacts: {
    plural: "Contatos",
    singular: "contato",
    create: "Novo contato",
    edit: "Editar contato",
    description: "As pessoas e o histórico de relacionamento da sua equipe.",
    empty:
      "Cadastre seu primeiro contato e mantenha as informações de relacionamento reunidas.",
  },
  companies: {
    plural: "Empresas clientes",
    singular: "empresa cliente",
    create: "Nova empresa cliente",
    edit: "Editar empresa cliente",
    description: "As organizações com as quais sua equipe se relaciona.",
    empty: "Cadastre uma empresa cliente para conectar pessoas e histórico.",
  },
};
export const statusLabels: Record<LeadStatus, string> = {
  NEW: "Novo",
  CONTACTED: "Contatado",
  QUALIFIED: "Qualificado",
  DISCARDED: "Descartado",
  ARCHIVED: "Arquivado",
  CONVERTED: "Convertido",
};
export const temperatureLabels = { COLD: "Frio", WARM: "Morno", HOT: "Quente" };
export const fieldLabels: Record<string, string> = {
  title: "Título",
  pipelineId: "Pipeline",
  stageId: "Etapa",
  value: "Valor",
  probability: "Probabilidade",
  currency: "Moeda",
  expectedCloseDate: "Previsão de fechamento",
  dealId: "Oportunidade",
  leadId: "Lead",
  contactId: "Contato",
  scheduledAt: "Data e hora",
  dueAt: "Prazo",
  priority: "Prioridade",
  checklist: "Checklist",
  duration: "Duração",
  result: "Resultado",
  type: "Tipo",
  name: "Nome",
  lastName: "Sobrenome",
  email: "Email",
  phone: "Telefone",
  whatsapp: "WhatsApp",
  jobTitle: "Cargo",
  companyId: "Empresa cliente",
  companyName: "Empresa",
  assignedTo: "Responsável",
  tagIds: "Tags",
  tags: "Tags",
  source: "Origem",
  description: "Descrição",
  legalName: "Razão social",
  taxId: "CNPJ / identificação fiscal",
  website: "Site",
  segment: "Segmento",
  employeeCount: "Número de funcionários",
  address: "Endereço",
  city: "Cidade",
  state: "Estado",
  country: "País",
  birthday: "Aniversário",
  status: "Status",
  temperature: "Temperatura",
  estimatedValue: "Valor estimado",
  discardReason: "Motivo do descarte",
  lastContactAt: "Último contato",
  nextContactAt: "Próximo contato",
};
export function fullName(item: CrmItem) {
  return [item.name, item.lastName].filter(Boolean).join(" ");
}
