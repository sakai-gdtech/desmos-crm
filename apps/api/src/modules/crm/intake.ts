import { randomBytes, createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  one,
  rows,
  camel,
  audit,
  type Row,
} from "../../infrastructure/database.js";
import { invariant } from "../../shared/errors.js";
import type { Context } from "../iam/application/sessions.js";
import { hasPermission } from "../iam/domain/permissions.js";
import { crmTransaction, withCrmTenant } from "./tenant.js";
import { insert, normalizeEmail, normalizePhone } from "./service.js";
export const intakeInput = z
  .object({
    name: z.string().trim().min(1).max(100),
    source: z.string().trim().min(1).max(100),
    ownerIds: z
      .array(z.uuid())
      .min(1)
      .max(30)
      .refine((v) => new Set(v).size === v.length),
  })
  .strict();
export const captureInput = z
  .object({
    name: z.string().trim().min(1).max(160),
    email: z.email().max(254),
    phone: z.string().trim().max(40).optional(),
    requestId: z.uuid(),
  })
  .strict();
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function intakeForms(ctx: Context) {
  return crmTransaction(ctx, "settings.manage", async (tx) => ({
    items: (
      await rows(
        tx,
        sql`SELECT id,name,source,owner_ids,active,version FROM crm_intake_forms WHERE tenant_id=${ctx.tenantId} ORDER BY name,id`,
      )
    ).map(camel),
  }));
}
export async function createIntake(
  ctx: Context,
  input: z.infer<typeof intakeInput>,
) {
  return crmTransaction(ctx, "settings.manage", async (tx, ctx) => {
    for (const id of input.ownerIds) {
      const member = await one(
        tx,
        sql`SELECT role FROM memberships WHERE tenant_id=${ctx.tenantId} AND user_id=${id} AND status='ACTIVE' FOR SHARE`,
      );
      invariant(
        member && hasPermission(member.role, "leads.update"),
        400,
        "INVALID_OWNER",
        "Escolha responsáveis ativos que possam editar leads.",
      );
    }
    invariant(
      (await one(
        tx,
        sql`SELECT count(*)::int AS total FROM crm_intake_forms WHERE tenant_id=${ctx.tenantId}`,
      ))!.total < 30,
      400,
      "FORM_LIMIT",
      "Limite de 30 formulários.",
    );
    const token = randomBytes(24).toString("hex");
    const item = await one(
      tx,
      sql`INSERT INTO crm_intake_forms(tenant_id,token_hash,name,source,owner_ids,created_by) VALUES(${ctx.tenantId},${digest(token)},${input.name},${input.source},${JSON.stringify(input.ownerIds)}::jsonb,${ctx.userId}) RETURNING id,name,source,owner_ids,active,version`,
    );
    await audit(tx, ctx, "intake.created", item!.id, null, item);
    return { item: camel(item!), path: `/capture/${ctx.tenantId}/${token}` };
  });
}
export async function toggleIntake(
  ctx: Context,
  id: string,
  version: number,
  active: boolean,
) {
  return crmTransaction(ctx, "settings.manage", async (tx, ctx) => {
    const item = await one(
      tx,
      sql`UPDATE crm_intake_forms SET active=${active},version=version+1 WHERE tenant_id=${ctx.tenantId} AND id=${id} AND version=${version} RETURNING id,name,source,owner_ids,active,version`,
    );
    invariant(
      item,
      409,
      "VERSION_CONFLICT",
      "Formulário alterado ou indisponível.",
    );
    await audit(tx, ctx, "intake.updated", id, null, item);
    return { item: camel(item) };
  });
}
/** A bearer link can submit only the bounded capture schema; it never lists CRM records. */
export async function capture(
  tenantId: string,
  token: string,
  input?: z.infer<typeof captureInput>,
) {
  return withCrmTenant(tenantId, async (tx) => {
    if (input)
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${"crm-import:" + tenantId},0))`,
      );
    const form = await one(
      tx,
      sql`SELECT * FROM crm_intake_forms WHERE tenant_id=${tenantId} AND token_hash=${digest(token)} AND active ${input ? sql`FOR UPDATE` : sql`FOR SHARE`}`,
    );
    invariant(form, 404, "NOT_FOUND", "Formulário indisponível.");
    if (!input) return { name: form.name };
    const creator = await one(
      tx,
      sql`SELECT role FROM memberships WHERE tenant_id=${tenantId} AND user_id=${form.created_by} AND status='ACTIVE' FOR SHARE`,
    );
    invariant(
      creator &&
        hasPermission(creator.role, "settings.manage") &&
        hasPermission(creator.role, "leads.create"),
      409,
      "FORM_UNAVAILABLE",
      "O formulário está pausado por mudança de acesso.",
    );
    if (
      await one(
        tx,
        sql`SELECT record_id FROM crm_intake_entries WHERE tenant_id=${tenantId} AND form_id=${form.id} AND request_id=${input.requestId}`,
      )
    )
      return { received: true };
    const eligible: string[] = [];
    for (const id of form.owner_ids) {
      const member = await one(
        tx,
        sql`SELECT role FROM memberships WHERE tenant_id=${tenantId} AND user_id=${id} AND status='ACTIVE' FOR SHARE`,
      );
      if (member && hasPermission(member.role, "leads.update"))
        eligible.push(id);
    }
    invariant(
      eligible.length,
      409,
      "NO_OWNER",
      "Não há um responsável disponível para receber este cadastro.",
    );
    const duplicate = await one(
      tx,
      sql`SELECT id FROM crm_records WHERE tenant_id=${tenantId} AND kind='leads' AND deleted_at IS NULL AND (email_normalized=${normalizeEmail(input.email)} OR (${normalizePhone(input.phone)}::text IS NOT NULL AND phone_normalized=${normalizePhone(input.phone)})) ORDER BY created_at,id LIMIT 1`,
    );
    if (duplicate) {
      await tx.execute(
        sql`INSERT INTO crm_intake_entries(tenant_id,form_id,request_id,record_id) VALUES(${tenantId},${form.id},${input.requestId},${duplicate.id})`,
      );
      return { received: true };
    }
    const { requestId, ...data } = input;
    const ctx = {
      tenantId,
      userId: form.created_by,
      role: creator.role,
    } as Context;
    const record = await insert(tx, ctx, "leads", {
      ...data,
      source: form.source,
      assignedTo: eligible[form.cursor % eligible.length],
      description: `Recebido pelo formulário ${form.name}.`,
    });
    await tx.execute(
      sql`UPDATE crm_intake_forms SET cursor=(cursor+1)%1000000 WHERE tenant_id=${tenantId} AND id=${form.id}`,
    );
    await tx.execute(
      sql`INSERT INTO crm_intake_entries(tenant_id,form_id,request_id,record_id) VALUES(${tenantId},${form.id},${requestId},${record.id})`,
    );
    await audit(tx, ctx, "intake.received", record.id, null, {
      formId: form.id,
      source: form.source,
      assignedTo: record.assignedTo,
    });
    return { received: true };
  });
}
