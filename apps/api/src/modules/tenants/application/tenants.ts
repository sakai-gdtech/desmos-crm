import { sql } from "drizzle-orm";
import {
  db,
  one,
  rows,
  camel,
  audit,
  type Executor,
} from "../../../infrastructure/database.js";
import { AppError, invariant } from "../../../shared/errors.js";
import { authorize, type Context } from "../../iam/application/sessions.js";
export async function lockTenant(
  tx: Executor,
  context: Context,
  permission: "settings.manage" | "users.manage",
) {
  const tenant = await one(
    tx,
    sql`SELECT id FROM tenants WHERE id=${context.tenantId} FOR NO KEY UPDATE`,
  );
  invariant(tenant, 404, "NOT_FOUND", "Empresa não encontrada.");
  const actor = await one(
    tx,
    sql`SELECT role FROM memberships WHERE tenant_id=${context.tenantId} AND user_id=${context.userId} AND status='ACTIVE'`,
  );
  invariant(actor, 403, "FORBIDDEN", "Seu acesso à empresa foi removido.");
  const fresh = { ...context, role: actor.role };
  authorize(fresh, permission);
  return fresh;
}
export function createTenant() {
  throw new AppError(
    409,
    "ONE_COMPANY_PER_ACCOUNT",
    "Cada conta pertence a uma única empresa. Cadastre outra conta com um email diferente para criar uma nova empresa.",
  );
}
export async function currentTenant(context: Context) {
  return {
    tenant: camel(
      (await one(db, sql`SELECT * FROM tenants WHERE id=${context.tenantId}`))!,
    ),
  };
}
export async function updateTenant(
  context: Context,
  input: Record<string, unknown>,
  onboarding = false,
) {
  return db.transaction(async (tx) => {
    await lockTenant(tx, context, "settings.manage");
    const before = await one(
      tx,
      sql`SELECT * FROM tenants WHERE id=${context.tenantId}`,
    );
    const allowed: Record<string, string> = {
      name: "name",
      email: "email",
      phone: "phone",
      website: "website",
      taxId: "tax_id",
      address: "address",
      timezone: "timezone",
      currency: "currency",
      locale: "locale",
      segment: "segment",
      employeeCount: "employee_count",
      salesCount: "sales_count",
      objective: "objective",
      salesMotion: "sales_motion",
    };
    const updates = Object.entries(input).map(
      ([key, value]) => sql`${sql.identifier(allowed[key]!)}=${value}`,
    );
    if (onboarding) updates.push(sql`onboarding_completed_at=now()`);
    updates.push(sql`updated_at=now()`);
    const tenant = await one(
      tx,
      sql`UPDATE tenants SET ${sql.join(updates, sql`, `)} WHERE id=${context.tenantId} RETURNING *`,
    );
    await audit(
      tx,
      context,
      onboarding ? "tenant.onboarded" : "tenant.updated",
      context.tenantId,
      camel(before!),
      camel(tenant!),
    );
    return { tenant: camel(tenant!) };
  });
}
export async function auditLogs(context: Context, limit: number) {
  authorize(context, "audit.view");
  return rows(
    db,
    sql`SELECT a.id,a.action,a.subject_id AS "entityId",split_part(a.action,'.',1) AS "entityType",u.name AS "actorName",a.created_at AS "createdAt",a.before,a.after FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_id WHERE a.tenant_id=${context.tenantId} ORDER BY a.created_at DESC,a.id DESC LIMIT ${limit}`,
  );
}
