import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { authenticate } from "../../iam/application/sessions.js";
import { listTenants } from "../../iam/application/accounts.js";
import * as tenant from "../application/tenants.js";
const name = z.string().trim().min(2).max(160);
const create = z.object({ name }).strict();
const nullableText = (max: number) =>
  z.string().trim().max(max).nullable().optional();
const update = z
  .object({
    name: name.optional(),
    email: z
      .union([z.email(), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    phone: nullableText(40),
    website: z
      .union([
        z
          .url()
          .refine(
            (value) => /^https?:\/\//.test(value),
            "Use uma URL http ou https.",
          ),
        z.literal(""),
        z.null(),
      ])
      .transform((value) => value || null)
      .optional(),
    taxId: nullableText(30),
    address: nullableText(300),
    timezone: z
      .string()
      .max(80)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("pt-BR", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Fuso horário inválido.")
      .optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .optional(),
    locale: z.enum(["pt-BR", "en-US", "es-ES"]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Informe uma alteração.");
const onboarding = z
  .object({
    segment: z.string().trim().min(2).max(100),
    employeeCount: z.number().int().min(1).max(1_000_000),
    salesCount: z.number().int().min(0).max(1_000_000),
    objective: z.string().trim().min(2).max(500),
    salesMotion: z.string().trim().min(2).max(100),
  })
  .strict()
  .refine(
    (value) => value.salesCount <= value.employeeCount,
    "A equipe comercial não pode exceder o total de colaboradores.",
  );
export async function tenantRoutes(app: FastifyInstance) {
  app.get("/tenants", async (request) => ({
    items: await listTenants((await authenticate(request)).userId),
  }));
  app.post("/tenants", async (request) => {
    await authenticate(request);
    create.parse(request.body);
    return tenant.createTenant();
  });
  app.get("/tenants/current", async (request) =>
    tenant.currentTenant(await authenticate(request)),
  );
  app.patch("/tenants/current", async (request) =>
    tenant.updateTenant(
      await authenticate(request),
      update.parse(request.body),
    ),
  );
  app.post("/tenants/current/onboarding", async (request) =>
    tenant.updateTenant(
      await authenticate(request),
      onboarding.parse(request.body),
      true,
    ),
  );
  app.get("/audit-logs", async (request) => {
    const query = z
      .object({ limit: z.coerce.number().int().min(1).max(200).default(100) })
      .strict()
      .parse(request.query);
    return {
      items: await tenant.auditLogs(await authenticate(request), query.limit),
    };
  });
}
