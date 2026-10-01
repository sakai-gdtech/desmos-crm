import { sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import {
  db,
  one,
  rows,
  camel,
  audit,
} from "../../../infrastructure/database.js";
import {
  hashPassword,
  verifyPassword,
  needsPasswordRehash,
  tokenHash,
} from "../../../shared/crypto.js";
import { sendActionEmail } from "../../../infrastructure/email.js";
import { invariant } from "../../../shared/errors.js";
import { createSession, type Context } from "./sessions.js";
import { entitlements, rolePermissions } from "../domain/permissions.js";
const dummyHash = hashPassword("Timing-only-unused-dummy-password");
export async function register(
  input: { name: string; email: string; password: string; companyName: string },
  request: FastifyRequest,
) {
  const passwordHash = await hashPassword(input.password);
  return db.transaction(async (tx) => {
    const user = await one(
      tx,
      sql`INSERT INTO users(name,email,password_hash) VALUES(${input.name},${input.email},${passwordHash}) RETURNING id,email`,
    );
    const tenant = await one(
      tx,
      sql`INSERT INTO tenants(name) VALUES(${input.companyName}) RETURNING id`,
    );
    await tx.execute(
      sql`INSERT INTO memberships(user_id,tenant_id,role) VALUES(${user!.id},${tenant!.id},'OWNER')`,
    );
    await sendActionEmail(
      tx,
      user as { id: string; email: string },
      "VERIFY_EMAIL",
    );
    await audit(
      tx,
      { userId: user!.id, tenantId: tenant!.id, requestId: request.id },
      "tenant.created",
      tenant!.id,
      null,
      { name: input.companyName },
    );
    return createSession(tx, user!.id, tenant!.id, request);
  });
}
export async function login(
  input: { email: string; password: string },
  request: FastifyRequest,
) {
  const user = await one(
    db,
    sql`SELECT id,password_hash FROM users WHERE email=${input.email}`,
  );
  const valid = await verifyPassword(
    input.password,
    user?.password_hash ?? (await dummyHash),
  );
  invariant(
    user && valid,
    401,
    "INVALID_CREDENTIALS",
    "Email ou senha incorretos.",
  );
  const upgradedHash = needsPasswordRehash(user.password_hash)
    ? await hashPassword(input.password)
    : null;
  return db.transaction(async (tx) => {
    const lockedUser = await one(
      tx,
      sql`SELECT password_hash FROM users WHERE id=${user.id} FOR NO KEY UPDATE`,
    );
    // Recheck after taking the row lock: a password reset may have committed meanwhile.
    const unchanged = lockedUser?.password_hash === user.password_hash;
    const stillValid =
      lockedUser &&
      (unchanged ||
        (await verifyPassword(input.password, lockedUser.password_hash)));
    invariant(
      stillValid,
      401,
      "INVALID_CREDENTIALS",
      "Email ou senha incorretos.",
    );
    if (upgradedHash && needsPasswordRehash(lockedUser!.password_hash))
      await tx.execute(
        sql`UPDATE users SET password_hash=${upgradedHash},updated_at=now() WHERE id=${user.id}`,
      );
    const membership = await one(
      tx,
      sql`SELECT tenant_id FROM memberships WHERE user_id=${user.id} AND status='ACTIVE' ORDER BY created_at,id LIMIT 1`,
    );
    invariant(
      membership,
      403,
      "NO_ACTIVE_MEMBERSHIP",
      "Sua conta não possui acesso ativo a uma empresa.",
    );
    return createSession(tx, user.id, membership.tenant_id, request);
  });
}
export async function me(context: Context) {
  const [user, tenant, membership, memberships] = await Promise.all([
    one(
      db,
      sql`SELECT id,name,email,phone,email_verified_at FROM users WHERE id=${context.userId}`,
    ),
    one(db, sql`SELECT * FROM tenants WHERE id=${context.tenantId}`),
    one(
      db,
      sql`SELECT id,role,status FROM memberships WHERE id=${context.membershipId} AND tenant_id=${context.tenantId}`,
    ),
    listTenants(context.userId),
  ]);
  return {
    user: camel(user!),
    tenant: camel(tenant!),
    membership,
    permissions: rolePermissions[context.role],
    memberships,
    entitlements,
  };
}
export async function listTenants(userId: string) {
  return (
    await rows(
      db,
      sql`SELECT m.id,m.tenant_id,t.name AS tenant_name,m.role,m.status FROM memberships m JOIN tenants t ON t.id=m.tenant_id WHERE m.user_id=${userId} AND m.status='ACTIVE' ORDER BY t.name,m.id`,
    )
  ).map(camel);
}
export async function updateProfile(
  context: Context,
  input: { name: string; phone?: string | null },
) {
  const user = await one(
    db,
    sql`UPDATE users SET name=${input.name},phone=${input.phone ?? null},updated_at=now() WHERE id=${context.userId} RETURNING id,name,email,phone,email_verified_at`,
  );
  return { user: camel(user!) };
}
export async function requestPasswordReset(email: string) {
  await db.transaction(async (tx) => {
    const user = await one(
      tx,
      sql`SELECT id,email FROM users WHERE email=${email} FOR NO KEY UPDATE`,
    );
    if (user)
      await sendActionEmail(
        tx,
        user as { id: string; email: string },
        "RESET_PASSWORD",
      );
  });
}
export async function resendVerification(context: Context) {
  await db.transaction(async (tx) => {
    const user = await one(
      tx,
      sql`SELECT id,email,email_verified_at FROM users WHERE id=${context.userId} FOR NO KEY UPDATE`,
    );
    if (user && !user.email_verified_at)
      await sendActionEmail(
        tx,
        user as { id: string; email: string },
        "VERIFY_EMAIL",
      );
  });
}
export async function consumeAction(
  token: string,
  type: "VERIFY_EMAIL" | "RESET_PASSWORD",
  password?: string,
) {
  const passwordHash = password ? await hashPassword(password) : null;
  await db.transaction(async (tx) => {
    const lookup = await one(
      tx,
      sql`SELECT user_id FROM action_tokens WHERE token_hash=${tokenHash(token)} AND type=${type}`,
    );
    invariant(
      lookup,
      400,
      "INVALID_TOKEN",
      "Link inválido, utilizado ou expirado. Solicite um novo link.",
    );
    await tx.execute(
      sql`SELECT id FROM users WHERE id=${lookup.user_id} FOR NO KEY UPDATE`,
    );
    const action = await one(
      tx,
      sql`SELECT * FROM action_tokens WHERE token_hash=${tokenHash(token)} AND type=${type} FOR UPDATE`,
    );
    invariant(
      action && !action.consumed_at && new Date(action.expires_at) > new Date(),
      400,
      "INVALID_TOKEN",
      "Link inválido, utilizado ou expirado. Solicite um novo link.",
    );
    if (type === "RESET_PASSWORD") {
      await tx.execute(
        sql`UPDATE users SET password_hash=${passwordHash},updated_at=now() WHERE id=${action.user_id}`,
      );
      await tx.execute(
        sql`UPDATE sessions SET revoked_at=now() WHERE user_id=${action.user_id} AND revoked_at IS NULL`,
      );
    } else
      await tx.execute(
        sql`UPDATE users SET email_verified_at=coalesce(email_verified_at,now()),updated_at=now() WHERE id=${action.user_id}`,
      );
    await tx.execute(
      sql`UPDATE action_tokens SET consumed_at=now() WHERE id=${action.id}`,
    );
  });
}
export async function switchTenant(
  context: Context,
  tenantId: string,
  request: FastifyRequest,
) {
  invariant(
    tenantId === context.tenantId,
    404,
    "NOT_FOUND",
    "Empresa não encontrada.",
  );
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM users WHERE id=${context.userId} FOR NO KEY UPDATE`,
    );
    const source = await one(
      tx,
      sql`SELECT id FROM sessions WHERE id=${context.sessionId} AND user_id=${context.userId} AND revoked_at IS NULL AND expires_at>now() FOR UPDATE`,
    );
    invariant(
      source,
      401,
      "SESSION_REVOKED",
      "Sua sessão foi revogada. Entre novamente.",
    );
    const membership = await one(
      tx,
      sql`SELECT id FROM memberships WHERE tenant_id=${tenantId} AND user_id=${context.userId} AND status='ACTIVE'`,
    );
    invariant(membership, 404, "NOT_FOUND", "Empresa não encontrada.");
    await tx.execute(
      sql`UPDATE sessions SET revoked_at=now() WHERE id=${context.sessionId} AND user_id=${context.userId}`,
    );
    return createSession(tx, context.userId, tenantId, request);
  });
}
export async function listSessions(context: Context) {
  return await rows(
    db,
    sql`SELECT id,user_agent AS "userAgent",ip AS "ipAddress",created_at AS "createdAt",last_used_at AS "lastSeenAt",expires_at AS "expiresAt",(id=${context.sessionId}) AS "isCurrent" FROM sessions WHERE user_id=${context.userId} AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC,id DESC`,
  );
}
export async function revokeSession(context: Context, id: string) {
  const session = await one(
    db,
    sql`UPDATE sessions SET revoked_at=now() WHERE id=${id} AND user_id=${context.userId} RETURNING id`,
  );
  invariant(session, 404, "NOT_FOUND", "Sessão não encontrada.");
}
