import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  one,
  rows,
  camel,
  audit,
  type Executor,
  type Row,
} from "../../infrastructure/database.js";
import { invariant } from "../../shared/errors.js";
import type { Context } from "../iam/application/sessions.js";
import type { Permission } from "../iam/domain/permissions.js";
import { crmTransaction } from "./tenant.js";
export const fieldKind = z.enum(["contacts", "companies", "leads", "deals"]);
export const fieldInput = z
  .object({
    kind: fieldKind,
    name: z.string().trim().min(1).max(100),
    type: z.enum(["text", "number", "date", "boolean", "choice"]),
    shareOnConversion: z.boolean().default(false),
    options: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  })
  .strict()
  .refine(
    (v) => !v.shareOnConversion || v.kind === "leads",
    "Compartilhamento disponível apenas para leads.",
  )
  .refine(
    (v) => v.type !== "choice" || v.options.length > 0,
    "Informe as opções.",
  )
  .refine(
    (v) => new Set(v.options).size === v.options.length,
    "Opções repetidas.",
  );
export const valuesInput = z
  .object({
    version: z.number().int().positive(),
    values: z
      .record(
        z.uuid(),
        z.union([
          z.string().max(2000),
          z.number().finite(),
          z.boolean(),
          z.null(),
        ]),
      )
      .refine((v) => Object.keys(v).length <= 50),
  })
  .strict();
export async function listFields(
  ctx: Context,
  kind: z.infer<typeof fieldKind>,
) {
  return crmTransaction(ctx, `${kind}.view` as Permission, async (tx) => ({
    items: (
      await rows(
        tx,
        sql`SELECT * FROM crm_fields WHERE tenant_id=${ctx.tenantId} AND (kind=${kind} OR (${kind}='contacts' AND kind='leads' AND share_on_conversion)) ORDER BY name,id`,
      )
    ).map(camel),
  }));
}
export async function createField(
  ctx: Context,
  input: z.infer<typeof fieldInput>,
) {
  return crmTransaction(ctx, "settings.manage", async (tx, ctx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${"fields:" + ctx.tenantId + input.kind},0))`,
    );
    invariant(
      (await one(
        tx,
        sql`SELECT count(*)::int AS total FROM crm_fields WHERE tenant_id=${ctx.tenantId} AND kind=${input.kind}`,
      ))!.total < 50,
      400,
      "FIELD_LIMIT",
      "Limite de 50 campos por tipo.",
    );
    invariant(
      !(await one(
        tx,
        sql`SELECT id FROM crm_fields WHERE tenant_id=${ctx.tenantId} AND kind=${input.kind} AND lower(name)=lower(${input.name})`,
      )),
      409,
      "DUPLICATE_FIELD",
      "Já existe um campo com esse nome.",
    );
    const item = await one(
      tx,
      sql`INSERT INTO crm_fields(tenant_id,kind,name,type,options,share_on_conversion) VALUES(${ctx.tenantId},${input.kind},${input.name},${input.type},${JSON.stringify(input.options)}::jsonb,${input.shareOnConversion}) RETURNING *`,
    );
    await audit(tx, ctx, "field.created", item!.id, null, item);
    return { item: camel(item!) };
  });
}
export async function toggleField(
  ctx: Context,
  id: string,
  version: number,
  active: boolean,
) {
  return crmTransaction(ctx, "settings.manage", async (tx, ctx) => {
    const item = await one(
      tx,
      sql`UPDATE crm_fields SET active=${active},version=version+1 WHERE tenant_id=${ctx.tenantId} AND id=${id} AND version=${version} RETURNING *`,
    );
    invariant(
      item,
      409,
      "VERSION_CONFLICT",
      "Campo alterado ou indisponível. Recarregue.",
    );
    await audit(tx, ctx, "field.updated", id, null, item);
    return { item: camel(item) };
  });
}
export async function validateValues(
  tx: Executor,
  ctx: Context,
  kind: string,
  values: Row,
) {
  const definitions = await rows(
    tx,
    sql`SELECT * FROM crm_fields WHERE tenant_id=${ctx.tenantId} AND (kind=${kind} OR (${kind}='contacts' AND kind='leads' AND share_on_conversion)) AND active FOR SHARE`,
  );
  for (const [id, value] of Object.entries(values)) {
    const field = definitions.find((f) => f.id === id);
    invariant(field, 400, "INVALID_FIELD", "Campo inexistente ou arquivado.");
    if (value === null) continue;
    const valid =
      field.type === "text"
        ? typeof value === "string"
        : field.type === "number"
          ? typeof value === "number" && Number.isFinite(value)
          : field.type === "boolean"
            ? typeof value === "boolean"
            : field.type === "choice"
              ? typeof value === "string" && field.options.includes(value)
              : typeof value === "string" &&
                z.iso.date().safeParse(value).success;
    invariant(
      valid,
      400,
      "INVALID_FIELD_VALUE",
      `Valor inválido para ${field.name}.`,
    );
  }
}
export async function fieldValues(
  ctx: Context,
  kind: z.infer<typeof fieldKind>,
  id: string,
  input?: z.infer<typeof valuesInput>,
) {
  return crmTransaction(
    ctx,
    `${kind}.${input ? "update" : "view"}` as Permission,
    async (tx, ctx) => {
      const table = sql.identifier(
        kind === "deals" ? "sales_deals" : "crm_records",
      );
      const record = await one(
        tx,
        sql`SELECT custom_fields,version FROM ${table} WHERE tenant_id=${ctx.tenantId} AND id=${id} AND deleted_at IS NULL ${kind === "deals" ? sql`` : sql`AND kind=${kind}`} ${input ? sql`FOR UPDATE` : sql`FOR SHARE`}`,
      );
      invariant(record, 404, "NOT_FOUND", "Registro não encontrado.");
      if (!input)
        return { values: record.custom_fields, version: record.version };
      invariant(
        record.version === input.version,
        409,
        "VERSION_CONFLICT",
        "O registro mudou. Recarregue antes de salvar.",
      );
      await validateValues(tx, ctx, kind, input.values);
      // Merge preserves archived fields and unrelated values; null explicitly clears a value.
      const values = { ...record.custom_fields, ...input.values };
      await tx.execute(
        sql`UPDATE ${table} SET custom_fields=${JSON.stringify(values)}::jsonb,version=version+1,updated_at=now() WHERE tenant_id=${ctx.tenantId} AND id=${id}`,
      );
      await audit(
        tx,
        ctx,
        "custom-fields.updated",
        id,
        record.custom_fields,
        values,
      );
      const metadata = JSON.stringify({
        changes: Object.keys(input.values).map((field) => ({
          field,
          before: record.custom_fields[field] ?? null,
          after: values[field],
        })),
      });
      if (kind === "deals")
        await tx.execute(
          sql`INSERT INTO sales_events(tenant_id,deal_id,actor_id,type,metadata) VALUES(${ctx.tenantId},${id},${ctx.userId},'updated',${metadata}::jsonb)`,
        );
      else
        await tx.execute(
          sql`INSERT INTO crm_events(tenant_id,record_id,actor_id,type,metadata) VALUES(${ctx.tenantId},${id},${ctx.userId},'updated',${metadata}::jsonb)`,
        );
      return { values, version: record.version + 1 };
    },
  );
}
