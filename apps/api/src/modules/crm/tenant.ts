import { sql } from "drizzle-orm";
import { db, one, type Executor } from "../../infrastructure/database.js";
import { invariant } from "../../shared/errors.js";
import { authorize, type Context } from "../iam/application/sessions.js";
import type { Permission } from "../iam/domain/permissions.js";

/** Always transaction-local: pooled connections must never retain tenant context. */
export async function withCrmTenant<T>(
  tenantId: string,
  work: (tx: Executor) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`,
    );
    return work(tx);
  });
}
export async function crmTransaction<T>(
  context: Context,
  permission: Permission,
  work: (tx: Executor, fresh: Context) => Promise<T>,
): Promise<T> {
  authorize(context, permission);
  return withCrmTenant(context.tenantId, async (tx) => {
    // Membership changes cannot race with an already authorized commercial mutation.
    const actor = await one(
      tx,
      sql`SELECT role FROM memberships WHERE tenant_id=${context.tenantId} AND user_id=${context.userId} AND status='ACTIVE' FOR SHARE`,
    );
    invariant(actor, 403, "FORBIDDEN", "Seu acesso à empresa foi removido.");
    const fresh = { ...context, role: actor.role };
    authorize(fresh, permission);
    return work(tx, fresh);
  });
}
