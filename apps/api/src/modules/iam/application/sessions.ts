import { sql } from "drizzle-orm";
import type { FastifyRequest, FastifyReply } from "fastify";
import { db, one, type Executor } from "../../../infrastructure/database.js";
import { config } from "../../../shared/config.js";
import { invariant, AppError } from "../../../shared/errors.js";
import {
  opaqueToken,
  tokenHash,
  signAccess,
  verifyAccess,
} from "../../../shared/crypto.js";
import {
  hasPermission,
  type Permission,
  type Role,
} from "../domain/permissions.js";
export interface Context {
  userId: string;
  sessionId: string;
  tenantId: string;
  membershipId: string;
  role: Role;
  requestId: string;
}
export async function authenticate(request: FastifyRequest): Promise<Context> {
  let identity: { userId: string; sessionId: string };
  try {
    identity = await verifyAccess(request.cookies.orbit_access ?? "");
  } catch {
    throw new AppError(
      401,
      "UNAUTHENTICATED",
      "Entre na sua conta para continuar.",
    );
  }
  const current = await one(
    db,
    sql`SELECT s.id, s.tenant_id, m.id AS membership_id,m.role FROM sessions s JOIN memberships m ON m.user_id=s.user_id AND m.tenant_id=s.tenant_id WHERE s.id=${identity.sessionId} AND s.user_id=${identity.userId} AND s.revoked_at IS NULL AND s.expires_at>now() AND m.status='ACTIVE'`,
  );
  invariant(
    current,
    401,
    "SESSION_REVOKED",
    "Sua sessão expirou ou foi revogada. Entre novamente.",
  );
  const expected = request.headers["x-expected-tenant-id"];
  if (expected && !["GET", "HEAD", "OPTIONS"].includes(request.method))
    invariant(
      expected === current.tenant_id,
      409,
      "TENANT_CONTEXT_CHANGED",
      "A empresa ativa mudou em outra aba. Atualize a página antes de continuar.",
    );
  return {
    userId: identity.userId,
    sessionId: identity.sessionId,
    tenantId: current.tenant_id,
    membershipId: current.membership_id,
    role: current.role,
    requestId: request.id,
  };
}
export function authorize(context: Context, permission: Permission) {
  invariant(
    hasPermission(context.role, permission),
    403,
    "FORBIDDEN",
    "Seu perfil não tem permissão para esta ação.",
  );
}
export async function optionalAuth(request: FastifyRequest) {
  if (!request.cookies.orbit_access) return null;
  try {
    return await authenticate(request);
  } catch {
    return null;
  }
}
export async function createSession(
  executor: Executor,
  userId: string,
  tenantId: string,
  request: FastifyRequest,
) {
  const session = await one(
    executor,
    sql`INSERT INTO sessions(user_id,tenant_id,expires_at,user_agent,ip) VALUES(${userId},${tenantId},now()+interval '30 days',${request.headers["user-agent"]?.slice(0, 500) ?? null},${request.ip}) RETURNING id`,
  );
  const refresh = opaqueToken();
  await executor.execute(
    sql`INSERT INTO refresh_tokens(session_id,token_hash,expires_at) VALUES(${session!.id},${tokenHash(refresh)},now()+interval '30 days')`,
  );
  return { userId, sessionId: session!.id as string, refresh };
}
export async function issueCookies(
  reply: FastifyReply,
  session: { userId: string; sessionId: string; refresh: string },
) {
  const options = {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  reply.setCookie(
    "orbit_access",
    await signAccess(session.userId, session.sessionId),
    { ...options, maxAge: 15 * 60 },
  );
  reply.setCookie("orbit_refresh", session.refresh, {
    ...options,
    maxAge: 30 * 24 * 60 * 60,
  });
}
export function clearCookies(reply: FastifyReply) {
  const options = {
    path: "/",
    secure: config.NODE_ENV === "production",
    sameSite: "lax" as const,
    httpOnly: true,
  };
  reply
    .clearCookie("orbit_access", options)
    .clearCookie("orbit_refresh", options);
}
export async function rotateSession(refresh: string | undefined) {
  invariant(
    refresh && refresh.length <= 256,
    401,
    "UNAUTHENTICATED",
    "Sua sessão expirou. Entre novamente.",
  );
  const outcome = await db.transaction(async (tx) => {
    const token = await one(
      tx,
      sql`SELECT * FROM refresh_tokens WHERE token_hash=${tokenHash(refresh)} FOR UPDATE`,
    );
    if (!token) return { error: true as const };
    const session = await one(
      tx,
      sql`SELECT * FROM sessions WHERE id=${token.session_id} FOR UPDATE`,
    );
    if (
      !session ||
      session.revoked_at ||
      new Date(session.expires_at) <= new Date()
    )
      return { error: true as const };
    if (token.used_at) {
      await tx.execute(
        sql`UPDATE sessions SET revoked_at=now() WHERE id=${session.id}`,
      );
      return { error: true as const };
    }
    if (new Date(token.expires_at) <= new Date())
      return { error: true as const };
    const membership = await one(
      tx,
      sql`SELECT id FROM memberships WHERE tenant_id=${session.tenant_id} AND user_id=${session.user_id} AND status='ACTIVE'`,
    );
    if (!membership) {
      await tx.execute(
        sql`UPDATE sessions SET revoked_at=now() WHERE id=${session.id}`,
      );
      return { error: true as const };
    }
    const replacement = opaqueToken();
    await tx.execute(
      sql`UPDATE refresh_tokens SET used_at=now() WHERE id=${token.id}`,
    );
    await tx.execute(
      sql`INSERT INTO refresh_tokens(session_id,token_hash,expires_at) VALUES(${session.id},${tokenHash(replacement)},${session.expires_at})`,
    );
    await tx.execute(
      sql`UPDATE sessions SET last_used_at=now() WHERE id=${session.id}`,
    );
    return {
      error: false as const,
      userId: session.user_id as string,
      sessionId: session.id as string,
      refresh: replacement,
    };
  });
  invariant(
    !outcome.error,
    401,
    "REFRESH_REJECTED",
    "Sua sessão expirou ou foi revogada. Entre novamente.",
  );
  return outcome;
}
export async function logout(request: FastifyRequest) {
  const refresh = request.cookies.orbit_refresh;
  if (refresh && refresh.length <= 256)
    await db.execute(
      sql`UPDATE sessions SET revoked_at=coalesce(revoked_at,now()) WHERE id IN (SELECT session_id FROM refresh_tokens WHERE token_hash=${tokenHash(refresh)})`,
    );
  const context = await optionalAuth(request);
  if (context)
    await db.execute(
      sql`UPDATE sessions SET revoked_at=coalesce(revoked_at,now()) WHERE id=${context.sessionId} AND user_id=${context.userId}`,
    );
}
