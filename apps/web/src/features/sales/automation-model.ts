import { z } from "zod";
import { templateSchema, recipientSchema } from "./message-model";
import type { Pipeline } from "./types";
export const triggers = {
  STAGE_CHANGED: "Negócio mudar de etapa",
  DEAL_CREATED: "Negócio criado",
  LEAD_CREATED: "Lead criado",
  DEAL_WON: "Negócio ganho",
  DEAL_LOST: "Negócio perdido",
} as const;
export const actions = {
  TASK: "Criar tarefa de acompanhamento",
  ASSIGN: "Atribuir responsável",
  MOVE: "Mover para outra etapa",
  EMAIL: "Preparar email",
  WHATSAPP: "Preparar WhatsApp",
} as const;
const ruleSchema = z
  .object({
    id: z.string(),
    name: z.string().max(100),
    stageId: z.string(),
    channel: z.enum(["EMAIL", "WHATSAPP"]),
    enabled: z.boolean(),
    delay: z.string(),
    minimum: z.string(),
    subject: z.string().max(200),
    message: z.string().max(4000),
    trigger: z
      .enum(
        Object.keys(triggers) as [
          keyof typeof triggers,
          ...(keyof typeof triggers)[],
        ],
      )
      .default("STAGE_CHANGED"),
    action: z
      .enum(
        Object.keys(actions) as [
          keyof typeof actions,
          ...(keyof typeof actions)[],
        ],
      )
      .optional(),
    conditionStageId: z.string().default(""),
    ownerId: z.string().default(""),
    assigneeId: z.string().default(""),
    targetStageId: z.string().default(""),
    recipient: recipientSchema.default({ kind: "CONTACT" }),
    messageTemplate: z
      .object({
        id: z.string(),
        revision: z.number().int().positive(),
        snapshot: templateSchema,
      })
      .nullable()
      .default(null),
    taskTitle: z.string().max(200).default("Acompanhar {negociacao}"),
  })
  .refine(
    (r) =>
      !r.messageTemplate ||
      (r.messageTemplate.id === r.messageTemplate.snapshot.id &&
        r.messageTemplate.revision === r.messageTemplate.snapshot.revision),
    "Snapshot inconsistente.",
  )
  .transform((r) => ({ ...r, action: r.action ?? r.channel }));
export type Rule = z.infer<typeof ruleSchema>;
export function readRule(input: unknown) {
  const result = ruleSchema.safeParse(input);
  return result.success ? result.data : null;
}
export function ruleProblem(
  rule: Rule,
  pipeline: Pipeline,
  owners: { id: string }[],
) {
  const exists = (id: string) => pipeline.stages.some((s) => s.id === id);
  if (!rule.name.trim()) return "Dê um nome à automação.";
  if (rule.trigger === "STAGE_CHANGED" && !exists(rule.stageId))
    return "A etapa do gatilho foi removida. Escolha outra antes de salvar ou testar.";
  if (
    rule.trigger === "LEAD_CREATED" &&
    (rule.conditionStageId || rule.minimum)
  )
    return "Leads ainda não têm etapa ou valor de negócio. Remova essas condições ou escolha um gatilho de negócio.";
  if (rule.conditionStageId && !exists(rule.conditionStageId))
    return "A etapa da condição foi removida. Revise a regra.";
  if (rule.minimum && !/^\d{1,14}(\.\d{1,2})?$/.test(rule.minimum))
    return "Informe um valor mínimo positivo com até dois centavos decimais.";
  if (rule.ownerId && !owners.some((o) => o.id === rule.ownerId))
    return "O responsável da condição está indisponível. Escolha outro.";
  if (rule.action === "MOVE") {
    if (rule.trigger === "LEAD_CREATED")
      return "Um lead ainda não tem negócio para mover. Escolha outra ação.";
    if (!exists(rule.targetStageId))
      return "Escolha uma etapa de destino deste funil.";
    if (rule.trigger === "STAGE_CHANGED" && rule.targetStageId === rule.stageId)
      return "Entrada e destino são a mesma etapa. Escolha outra para evitar um ciclo.";
  }
  if (rule.action === "ASSIGN" && !owners.some((o) => o.id === rule.assigneeId))
    return "Escolha um responsável disponível nesta empresa.";
  if (rule.action === "TASK" && !rule.taskTitle.trim())
    return "Dê um título à tarefa.";
  if (
    ["EMAIL", "WHATSAPP"].includes(rule.action) &&
    (!rule.message.trim() || (rule.action === "EMAIL" && !rule.subject.trim()))
  )
    return "Preencha os dados da mensagem.";
  return "";
}
export function exampleResult(rule: Rule, pipeline: Pipeline, ownerId: string) {
  const sampleStage =
    rule.trigger === "STAGE_CHANGED" ? rule.stageId : pipeline.stages[0]?.id;
  if (rule.conditionStageId && sampleStage !== rule.conditionStageId)
    return "Condição não atendida: a etapa do exemplo é diferente. Nenhuma ação foi simulada.";
  if (rule.ownerId && rule.ownerId !== ownerId)
    return "Condição não atendida: o responsável do exemplo é diferente. Nenhuma ação foi simulada.";
  if (Number(rule.minimum || 0) > 25000)
    return "Condição não atendida: o exemplo tem R$ 25.000,00. Nenhuma ação foi simulada.";
  const outcome =
    rule.action === "TASK"
      ? "tarefa de acompanhamento preparada"
      : rule.action === "ASSIGN"
        ? "troca de responsável preparada"
        : rule.action === "MOVE"
          ? "mudança de etapa preparada"
          : `${rule.action === "EMAIL" ? "email" : "WhatsApp"} preparado para ${rule.recipient.kind === "USER" ? rule.recipient.name : "Marina"}`;
  return `Teste concluído: ${outcome}. ${["EMAIL", "WHATSAPP"].includes(rule.action) ? "Nenhuma mensagem real foi enviada." : "Simulação: nenhum registro foi alterado."}`;
}
