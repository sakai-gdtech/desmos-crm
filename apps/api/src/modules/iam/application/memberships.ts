import { sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import {
  db,
  one,
  rows,
  audit,
  camel,
} from "../../../infrastructure/database.js";
import { config } from "../../../shared/config.js";
import {
  opaqueToken,
  tokenHash,
  hashPassword,
  verifyPassword,
} from "../../../shared/crypto.js";
import { enqueueEmail } from "../../../infrastructure/email.js";
import { invariant } from "../../../shared/errors.js";
import { entitlements, type Role } from "../domain/permissions.js";
import { authorize, createSession, type Context } from "./sessions.js";
import { lockTenant } from "../../tenants/application/tenants.js";
export async function listMembers(context: Context) {
  authorize(context, "users.manage");
  return rows(
    db,
    sql`SELECT m.id,m.role,m.status,m.created_at AS "createdAt",json_build_object('id',u.id,'name',u.name,'email',u.email) AS "user" FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=${context.tenantId} ORDER BY u.name,m.id`,
  );
}
export async function updateMember(
  context: Context,
  id: string,
  input: { role?: Role; status?: "ACTIVE" | "SUSPENDED" },
) {
  return db.transaction(async (tx) => {
    const actor = await lockTenant(tx, context, "users.manage");
    const member = await one(
      tx,
      sql`SELECT id,role,status FROM memberships WHERE id=${id} AND tenant_id=${context.tenantId} FOR UPDATE`,
    );
    invariant(member, 404, "NOT_FOUND", "Membro não encontrado.");
    const role = input.role ?? member.role;
    const status = input.status ?? member.status;
    invariant(
      actor.role === "OWNER" || (member.role !== "OWNER" && role !== "OWNER"),
      403,
      "OWNER_REQUIRED",
      "Somente proprietários podem alterar outro proprietário ou conceder esse papel.",
    );
    if (
      member.role === "OWNER" &&
      member.status === "ACTIVE" &&
      (role !== "OWNER" || status !== "ACTIVE")
    ) {
      const owners = await one(
        tx,
        sql`SELECT count(*)::int AS count FROM memberships WHERE tenant_id=${context.tenantId} AND role='OWNER' AND status='ACTIVE'`,
      );
      invariant(
        owners!.count > 1,
        409,
        "LAST_OWNER",
        "A empresa deve manter pelo menos um proprietário ativo.",
      );
    }
    const changed = await one(
      tx,
      sql`UPDATE memberships SET role=${role},status=${status},updated_at=now() WHERE id=${id} AND tenant_id=${context.tenantId} RETURNING id,role,status`,
    );
    await audit(tx, context, "membership.updated", id, member, changed);
    return { membership: changed };
  });
}
export async function listInvitations(context: Context) {
  authorize(context, "users.manage");
  return rows(
    db,
    sql`SELECT id,email,role,expires_at AS "expiresAt",created_at AS "createdAt",CASE WHEN accepted_at IS NOT NULL THEN 'ACCEPTED' WHEN expires_at<=now() THEN 'EXPIRED' ELSE 'PENDING' END AS status FROM invitations WHERE tenant_id=${context.tenantId} ORDER BY created_at DESC,id DESC LIMIT 200`,
  );
}
export async function invite(context: Context, email: string, role: Role) {
  return db.transaction(async (tx) => {
    const actor = await lockTenant(tx, context, "users.manage");
    invariant(
      role !== "OWNER" || actor.role === "OWNER",
      403,
      "OWNER_REQUIRED",
      "Somente proprietários podem convidar outro proprietário.",
    );
    const existing = await one(
      tx,
      sql`SELECT m.id,m.tenant_id FROM memberships m JOIN users u ON u.id=m.user_id WHERE u.email=${email}`,
    );
    invariant(
      !existing || existing.tenant_id === context.tenantId,
      409,
      "ACCOUNT_COMPANY_CONFLICT",
      "Este email já pertence a outra empresa. Use uma conta com outro email.",
    );
    invariant(
      !existing,
      409,
      "ALREADY_MEMBER",
      "Este email já pertence a um membro desta empresa.",
    );
    const count = await one(
      tx,
      sql`SELECT (SELECT count(*) FROM memberships WHERE tenant_id=${context.tenantId})+(SELECT count(*) FROM invitations WHERE tenant_id=${context.tenantId} AND accepted_at IS NULL AND expires_at>now() AND email<>${email}) AS count`,
    );
    invariant(
      Number(count!.count) < entitlements.limits.membersPerTenant,
      409,
      "PLAN_LIMIT",
      "Limite de membros e convites pendentes atingido.",
    );
    const token = opaqueToken();
    await tx.execute(
      sql`UPDATE invitations SET expires_at=now() WHERE tenant_id=${context.tenantId} AND email=${email} AND accepted_at IS NULL`,
    );
    const invitation = await one(
      tx,
      sql`INSERT INTO invitations(tenant_id,email,role,token_hash,invited_by,expires_at) VALUES(${context.tenantId},${email},${role},${tokenHash(token)},${context.userId},now()+interval '7 days') RETURNING id,email,role,expires_at,created_at`,
    );
    const tenant = await one(
      tx,
      sql`SELECT name FROM tenants WHERE id=${context.tenantId}`,
    );
    await enqueueEmail(
      tx,
      email,
      `Convite para ${tenant!.name} — Desmos CRM`,
      `Você foi convidado para a empresa ${tenant!.name} no Desmos CRM.\n\nAceite o convite: ${config.WEB_URL}/accept-invitation?token=${token}\n\nO convite é válido por 7 dias e deve ser aceito com este endereço de email.`,
    );
    await audit(tx, context, "invitation.created", invitation!.id, null, {
      email,
      role,
    });
    return { invitation: { ...camel(invitation!), status: "PENDING" } };
  });
}
export async function acceptInvitation(
  input: { token: string; name?: string; password?: string },
  context: Context | null,
  request: FastifyRequest,
) {
  const passwordHash = input.password
    ? await hashPassword(input.password)
    : null;
  const invitationLookup = await one(
    db,
    sql`SELECT tenant_id FROM invitations WHERE token_hash=${tokenHash(input.token)}`,
  );
  invariant(
    invitationLookup,
    400,
    "INVALID_TOKEN",
    "Convite inválido ou expirado.",
  );
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM tenants WHERE id=${invitationLookup.tenant_id} FOR NO KEY UPDATE`,
    );
    const invitation = await one(
      tx,
      sql`SELECT * FROM invitations WHERE token_hash=${tokenHash(input.token)} AND tenant_id=${invitationLookup.tenant_id} FOR UPDATE`,
    );
    invariant(
      invitation &&
        !invitation.accepted_at &&
        new Date(invitation.expires_at) > new Date(),
      400,
      "INVALID_TOKEN",
      "Convite inválido, utilizado ou expirado.",
    );
    const inviter = await one(
      tx,
      sql`SELECT role FROM memberships WHERE tenant_id=${invitation.tenant_id} AND user_id=${invitation.invited_by} AND status='ACTIVE'`,
    );
    invariant(
      inviter &&
        ["OWNER", "ADMIN"].includes(inviter.role) &&
        (invitation.role !== "OWNER" || inviter.role === "OWNER"),
      400,
      "INVALID_TOKEN",
      "Este convite perdeu a autorização. Peça um novo convite.",
    );
    // Serialize invitations for the same email even while the user does not
    // exist yet. The unique database constraints remain the final guarantee.
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(71200821, hashtext(${invitation.email}))`,
    );
    let user = await one(
      tx,
      sql`SELECT id,email,password_hash FROM users WHERE email=${invitation.email} FOR NO KEY UPDATE`,
    );
    if (user) {
      invariant(
        !context || context.userId === user.id,
        403,
        "INVITATION_EMAIL_MISMATCH",
        "Entre com o email que recebeu o convite.",
      );
      if (context) {
        const source = await one(
          tx,
          sql`SELECT id FROM sessions WHERE id=${context.sessionId} AND user_id=${user.id} AND revoked_at IS NULL AND expires_at>now()`,
        );
        invariant(
          source,
          401,
          "SESSION_REVOKED",
          "Sua sessão foi revogada. Entre novamente.",
        );
      }
      const authenticated =
        context?.userId === user.id ||
        (!context &&
          input.password &&
          (await verifyPassword(input.password, user.password_hash)));
      invariant(
        authenticated,
        401,
        "INVITATION_LOGIN_REQUIRED",
        "Entre com o email convidado ou informe sua senha atual para aceitar.",
      );
    } else {
      invariant(
        !context,
        403,
        "INVITATION_EMAIL_MISMATCH",
        "Saia da conta atual para aceitar um convite de outro email.",
      );
      invariant(
        input.name && passwordHash,
        400,
        "PROFILE_REQUIRED",
        "Informe seu nome e uma senha para aceitar o convite.",
      );
      invariant(
        input.password!.length >= 12,
        400,
        "VALIDATION_ERROR",
        "A nova senha deve ter ao menos 12 caracteres.",
      );
      user = await one(
        tx,
        sql`INSERT INTO users(name,email,password_hash,email_verified_at) VALUES(${input.name},${invitation.email},${passwordHash},now()) RETURNING id,email`,
      );
    }
    const existing = await one(
      tx,
      sql`SELECT id,tenant_id FROM memberships WHERE user_id=${user!.id}`,
    );
    invariant(
      !existing || existing.tenant_id === invitation.tenant_id,
      409,
      "ACCOUNT_COMPANY_CONFLICT",
      "Sua conta já pertence a outra empresa. Use uma conta com outro email.",
    );
    invariant(
      !existing,
      409,
      "ALREADY_MEMBER",
      "Você já pertence a esta empresa.",
    );
    const count = await one(
      tx,
      sql`SELECT count(*)::int AS count FROM memberships WHERE tenant_id=${invitation.tenant_id}`,
    );
    invariant(
      count!.count < entitlements.limits.membersPerTenant,
      409,
      "PLAN_LIMIT",
      "Limite de membros da empresa atingido.",
    );
    const member = await one(
      tx,
      sql`INSERT INTO memberships(tenant_id,user_id,role) VALUES(${invitation.tenant_id},${user!.id},${invitation.role}) RETURNING id`,
    );
    await tx.execute(
      sql`UPDATE invitations SET accepted_at=now() WHERE id=${invitation.id} AND tenant_id=${invitation.tenant_id}`,
    );
    await tx.execute(
      sql`UPDATE users SET email_verified_at=coalesce(email_verified_at,now()) WHERE id=${user!.id}`,
    );
    await audit(
      tx,
      {
        tenantId: invitation.tenant_id,
        userId: user!.id,
        requestId: request.id,
      },
      "invitation.accepted",
      member!.id,
      null,
      { role: invitation.role },
    );
    if (context)
      await tx.execute(
        sql`UPDATE sessions SET revoked_at=now() WHERE id=${context.sessionId} AND user_id=${context.userId}`,
      );
    return createSession(tx, user!.id, invitation.tenant_id, request);
  });
}
