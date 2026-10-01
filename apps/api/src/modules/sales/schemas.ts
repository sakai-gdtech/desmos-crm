import { z } from "zod";
const id = z.uuid();
const nullableId = id.nullable().optional();
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();
export const money = z
  .string()
  .regex(
    /^\d{1,14}(\.\d{1,2})?$/,
    "Use um valor positivo com até duas casas decimais.",
  );
const date = z.iso.date().nullable().optional();
const timestamp = z.iso.datetime({ offset: true }).nullable().optional();
const tagIds = z
  .array(id)
  .max(30)
  .transform((v) => [...new Set(v)])
  .optional();
export const stage = z
  .object({
    id: id.optional(),
    name: z.string().trim().min(1).max(100),
    probability: z.number().int().min(0).max(100),
    color: z.string().regex(/^#[a-fA-F0-9]{6}$/),
    staleDays: z.number().int().min(1).max(365).default(7),
    requireActivity: z.boolean().default(false),
  })
  .strict();
const stages = z
  .array(stage)
  .min(1)
  .max(20)
  .refine(
    (v) => new Set(v.map((s) => s.name.toLowerCase())).size === v.length,
    "Use nomes distintos nas etapas.",
  )
  .refine(
    (v) =>
      new Set(v.filter((s) => s.id).map((s) => s.id)).size ===
      v.filter((s) => s.id).length,
    "Etapa repetida.",
  );
export const pipelineCreate = z
  .object({
    name: z.string().trim().min(1).max(100),
    description: text(2000),
    stages,
  })
  .strict()
  .refine((v) => v.stages.every((s) => !s.id), "Novas etapas não recebem IDs.");
export const pipelinePatch = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: text(2000),
    active: z.boolean().optional(),
    stages: stages.optional(),
    version: z.number().int().positive(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 1, "Informe uma alteração.");
export const dealCreate = z
  .object({
    title: z.string().trim().min(1).max(200),
    pipelineId: id,
    stageId: id,
    contactId: nullableId,
    companyId: nullableId,
    leadId: nullableId,
    value: money.default("0"),
    currency: z.string().regex(/^[A-Z]{3}$/),
    probability: z.number().int().min(0).max(100).optional(),
    expectedCloseDate: date,
    assignedTo: nullableId,
    source: text(100),
    description: text(10000),
    temperature: z.enum(["COLD", "WARM", "HOT"]).default("WARM"),
    tagIds,
  })
  .strict();
export const dealPatch = dealCreate
  .partial()
  .extend({
    value: money.optional(),
    temperature: z.enum(["COLD", "WARM", "HOT"]).optional(),
    status: z.enum(["OPEN", "WON", "LOST"]).optional(),
    lostReason: text(1000),
    version: z.number().int().positive(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 1, "Informe uma alteração.");
const commonWork = {
  title: z.string().trim().min(1).max(200),
  description: text(10000),
  assignedTo: nullableId,
  contactId: nullableId,
  companyId: nullableId,
  leadId: nullableId,
  dealId: nullableId,
  tagIds,
};
export const activityCreate = z
  .object({
    ...commonWork,
    type: z.enum([
      "CALL",
      "EMAIL",
      "WHATSAPP",
      "MEETING",
      "NOTE",
      "TASK",
      "VISIT",
      "OTHER",
    ]),
    scheduledAt: timestamp,
    status: z.enum(["PLANNED", "COMPLETED", "CANCELED"]).default("PLANNED"),
    duration: z.number().int().min(0).max(100000).nullable().optional(),
    result: text(10000),
    followUpAt: timestamp,
  })
  .strict();
export const taskCreate = z
  .object({
    ...commonWork,
    dueAt: timestamp,
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
    status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).default("TODO"),
    checklist: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(300),
            done: z.boolean(),
          })
          .strict(),
      )
      .max(50)
      .default([]),
  })
  .strict();
export const activityPatch = activityCreate
  .partial()
  .extend({
    status: z.enum(["PLANNED", "COMPLETED", "CANCELED"]).optional(),
    version: z.number().int().positive(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 1, "Informe uma alteração.");
export const taskPatch = taskCreate
  .partial()
  .extend({
    status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELED"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    checklist: z
      .array(
        z
          .object({
            title: z.string().trim().min(1).max(300),
            done: z.boolean(),
          })
          .strict(),
      )
      .max(50)
      .optional(),
    version: z.number().int().positive(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 1, "Informe uma alteração.");
export const pagination = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const list = pagination
  .extend({
    q: z.string().trim().max(200).optional(),
    pipelineId: id.optional(),
    assignedTo: id.optional(),
    contactId: id.optional(),
    companyId: id.optional(),
    leadId: id.optional(),
    dealId: id.optional(),
    status: z.string().max(30).optional(),
    deleted: z.enum(["true", "false"]).default("false"),
    bucket: z
      .enum(["all", "today", "upcoming", "overdue", "completed"])
      .default("all"),
  })
  .strict();
export const board = z
  .object({
    pipelineId: id,
    q: z.string().trim().max(200).optional(),
    assignedTo: id.optional(),
    status: z.enum(["OPEN", "WON", "LOST"]).default("OPEN"),
  })
  .strict();
export const conversion = z
  .object({
    contactId: id.optional(),
    companyId: id.optional(),
    createCompany: z.boolean().optional(),
    opportunity: z
      .object({
        title: z.string().trim().min(1).max(200),
        pipelineId: id,
        stageId: id,
        value: money.optional(),
        currency: z
          .string()
          .regex(/^[A-Z]{3}$/)
          .optional(),
        expectedCloseDate: date,
      })
      .strict(),
  })
  .strict()
  .refine(
    (v) => !(v.companyId && v.createCompany),
    "Escolha uma empresa existente ou crie uma nova.",
  );
export type WorkKind = "activities" | "tasks";
