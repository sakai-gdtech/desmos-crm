import { z } from "zod";
export const kinds = ["contacts", "companies", "leads"] as const;
export type Kind = (typeof kinds)[number];
export const kindSchema = z.enum(kinds);
export const idSchema = z.uuid();
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullable()
    .optional();
const optionalId = z
  .union([z.uuid(), z.literal(""), z.null()])
  .transform((v) => v || null)
  .optional();
const email = z
  .string()
  .trim()
  .pipe(z.union([z.email().max(254), z.literal("")]))
  .nullable()
  .transform((v) => v?.toLowerCase() || null)
  .optional();
const common = {
  name: z.string().trim().min(1).max(160),
  email,
  phone: text(40),
  assignedTo: optionalId,
  source: text(100),
  description: text(10000),
  tagIds: z
    .array(z.uuid())
    .max(30)
    .transform((v) => [...new Set(v)])
    .optional(),
};
const address = {
  address: text(300),
  city: text(100),
  state: text(100),
  country: text(100),
};
const birthday = z
  .union([
    z.iso
      .date()
      .refine(
        (v) =>
          v >= "0001-01-01" &&
          !Number.isNaN(new Date(v + "T00:00:00.000Z").getTime()) &&
          new Date(v + "T00:00:00.000Z").toISOString().slice(0, 10) === v,
        "Data inválida.",
      ),
    z.literal(""),
    z.null(),
  ])
  .transform((v) => v || null)
  .optional();
const contact = z
  .object({
    ...common,
    lastName: text(160),
    whatsapp: text(40),
    jobTitle: text(160),
    companyId: optionalId,
    ...address,
    birthday,
  })
  .strict();
const company = z
  .object({
    ...common,
    legalName: text(200),
    taxId: text(40),
    website: z
      .union([
        z
          .url()
          .max(2000)
          .refine((v) => /^https?:\/\//i.test(v), "Use uma URL http ou https."),
        z.literal(""),
        z.null(),
      ])
      .transform((v) => v || null)
      .optional(),
    segment: text(100),
    employeeCount: z.number().int().min(0).max(100000000).nullable().optional(),
    ...address,
  })
  .strict();
const lead = z
  .object({
    ...common,
    companyId: optionalId,
    companyName: text(200),
    jobTitle: text(160),
    status: z
      .enum(["NEW", "CONTACTED", "QUALIFIED", "DISCARDED", "ARCHIVED"])
      .optional(),
    temperature: z.enum(["COLD", "WARM", "HOT"]).optional(),
    estimatedValue: z
      .union([
        z
          .string()
          .regex(
            /^\d{1,14}(\.\d{1,2})?$/,
            "Informe um valor decimal positivo, com até duas casas.",
          ),
        z.literal(""),
        z.null(),
      ])
      .transform((v) => v || null)
      .optional(),
    discardReason: text(1000),
    lastContactAt: z.iso.datetime({ offset: true }).nullable().optional(),
    nextContactAt: z.iso.datetime({ offset: true }).nullable().optional(),
  })
  .strict();
const schemaMap = { contacts: contact, companies: company, leads: lead };
export function createSchema(kind: Kind) {
  return schemaMap[kind];
}
const patchMap = {
  contacts: contact
    .partial()
    .extend({ version: z.number().int().positive() })
    .strict(),
  companies: company
    .partial()
    .extend({ version: z.number().int().positive() })
    .strict(),
  leads: lead
    .partial()
    .extend({ version: z.number().int().positive() })
    .strict(),
};
export function patchSchema(kind: Kind) {
  return (patchMap[kind] as z.ZodObject).refine(
    (v) => Object.keys(v).length > 1,
    "Informe uma alteração.",
  );
}
export const pagination = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const listSchema = pagination
  .extend({
    q: z.string().trim().max(200).optional(),
    sort: z.enum(["createdAt", "name", "updatedAt"]).default("updatedAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
    status: z
      .enum([
        "NEW",
        "CONTACTED",
        "QUALIFIED",
        "DISCARDED",
        "ARCHIVED",
        "CONVERTED",
      ])
      .optional(),
    assignedTo: z.uuid().optional(),
    tagId: z.uuid().optional(),
    companyId: z.uuid().optional(),
    source: z.string().max(100).optional(),
    temperature: z.enum(["COLD", "WARM", "HOT"]).optional(),
    deleted: z.enum(["true", "false"]).default("false"),
  })
  .strict();
export const tagCreate = z
  .object({
    name: z.string().trim().min(1).max(50),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  })
  .strict();
export const tagPatch = tagCreate
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Informe uma alteração.");
export const noteCreate = z
  .object({
    body: z.string().trim().min(1).max(10000),
    pinned: z.boolean().optional(),
    mentionIds: z
      .array(z.uuid())
      .max(30)
      .transform((v) => [...new Set(v)])
      .optional(),
  })
  .strict();
export const notePatch = noteCreate
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Informe uma alteração.");
export const conversion = z
  .object({
    contactId: z.uuid().optional(),
    companyId: z.uuid().optional(),
    createCompany: z.boolean().optional(),
  })
  .strict()
  .refine(
    (v) => !(v.companyId && v.createCompany),
    "Escolha uma empresa existente ou crie uma nova.",
  );
export type ListQuery = z.infer<typeof listSchema>;
