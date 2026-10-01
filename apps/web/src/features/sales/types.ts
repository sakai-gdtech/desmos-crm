import type { Tag } from "@/features/crm/types";
export type Stage = {
  id?: string;
  name: string;
  position: number;
  probability: number;
  color: string;
  staleDays: number;
  requireActivity: boolean;
};
export type Pipeline = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  version: number;
  demoFixture?: boolean;
  demoFollowupEnabled?: boolean;
  demoFollowupStageId?: string | null;
  stages: Stage[];
  createdAt: string;
  updatedAt: string;
};
export type Deal = {
  id: string;
  title: string;
  pipelineId: string;
  pipelineName: string;
  stageId: string;
  stageName: string;
  stageColor: string;
  contactId: string | null;
  contactName: string | null;
  companyId: string | null;
  companyName: string | null;
  leadId: string | null;
  leadName: string | null;
  value: string;
  currency: string;
  weightedValue: string;
  probability: number;
  expectedCloseDate: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  source: string | null;
  description: string | null;
  temperature: "COLD" | "WARM" | "HOT";
  status: "OPEN" | "WON" | "LOST";
  lostReason: string | null;
  wonAt: string | null;
  lostAt: string | null;
  stageEnteredAt: string;
  daysInStage: number;
  daysInPipeline: number;
  lastActivityAt: string | null;
  nextActivityAt: string | null;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
};
export type WorkKind = "activities" | "tasks";
export type Work = {
  id: string;
  kind: WorkKind;
  title: string;
  description: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  contactId: string | null;
  contactName: string | null;
  companyId: string | null;
  companyName: string | null;
  leadId: string | null;
  leadName: string | null;
  dealId: string | null;
  dealTitle: string | null;
  type: string | null;
  scheduledAt: string | null;
  dueAt: string | null;
  priority: string | null;
  status: string;
  completedAt: string | null;
  duration: number | null;
  result: string | null;
  checklist: { title: string; done: boolean }[];
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  version: number;
};
export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
export type Board = {
  pipeline: Pipeline;
  columns: {
    stage: Stage;
    items: Deal[];
    total: number;
    totals: { currency: string; value: string }[];
  }[];
};
export const statusLabels: Record<string, string> = {
  OPEN: "Aberta",
  WON: "Ganha",
  LOST: "Perdida",
  PLANNED: "Agendada",
  COMPLETED: "Concluída",
  CANCELED: "Cancelada",
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluída",
};
export const typeLabels: Record<string, string> = {
  CALL: "Ligação",
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  MEETING: "Reunião",
  NOTE: "Nota",
  TASK: "Tarefa",
  VISIT: "Visita",
  OTHER: "Outra",
};
export const priorityLabels: Record<string, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};
export const money = (value: string | number, currency = "BRL") =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
    Number(value),
  );
export const defaults: Stage[] = [
  "Novo lead",
  "Qualificação",
  "Reunião",
  "Proposta",
  "Negociação",
  "Fechamento",
].map((name, position) => ({
  name,
  position,
  probability: [10, 20, 35, 55, 75, 90][position],
  color: ["#4f46e5", "#0e7490", "#217550", "#8a5b16", "#b63b44", "#646d80"][
    position
  ],
  staleDays: 7,
  requireActivity: false,
}));
