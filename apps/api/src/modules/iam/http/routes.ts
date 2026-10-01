import type { FastifyInstance, FastifyRequest } from "fastify";
import { tokenHash } from "../../../shared/crypto.js";
import * as account from "../application/accounts.js";
import * as members from "../application/memberships.js";
import {
  authenticate,
  optionalAuth,
  issueCookies,
  clearCookies,
  rotateSession,
  logout,
} from "../application/sessions.js";
import * as schema from "./schemas.js";
const identityKey = (request: FastifyRequest) => {
  const body = request.body as { email?: unknown } | undefined;
  const identity =
    typeof body?.email === "string"
      ? body.email.trim().toLowerCase()
      : request.ip;
  return `${request.routeOptions.url}:${tokenHash(identity)}`;
};
const authLimit = {
  rateLimit: {
    max: 15,
    timeWindow: "15 minutes",
    hook: "preHandler" as const,
    keyGenerator: identityKey,
  },
};
const emailLimit = {
  rateLimit: {
    max: 5,
    timeWindow: "15 minutes",
    hook: "preHandler" as const,
    keyGenerator: identityKey,
  },
};
export async function iamRoutes(app: FastifyInstance) {
  app.post("/auth/register", { config: authLimit }, async (request, reply) => {
    const session = await account.register(
      schema.registerSchema.parse(request.body),
      request,
    );
    await issueCookies(reply, session);
    return reply.code(201).send({ message: "Conta criada com sucesso." });
  });
  app.post("/auth/login", { config: authLimit }, async (request, reply) => {
    const session = await account.login(
      schema.loginSchema.parse(request.body),
      request,
    );
    await issueCookies(reply, session);
    return { message: "Acesso autorizado." };
  });
  app.post(
    "/auth/refresh",
    { config: { rateLimit: { max: 40, timeWindow: "15 minutes" } } },
    async (request, reply) => {
      try {
        await issueCookies(
          reply,
          await rotateSession(request.cookies.orbit_refresh),
        );
        return { message: "Sessão renovada." };
      } catch (error) {
        clearCookies(reply);
        throw error;
      }
    },
  );
  app.post("/auth/logout", async (request, reply) => {
    await logout(request);
    clearCookies(reply);
    return { message: "Você saiu da conta." };
  });
  app.post("/auth/forgot-password", { config: emailLimit }, async (request) => {
    await account.requestPasswordReset(
      schema.emailSchema.parse(request.body).email,
    );
    return {
      message:
        "Se o email estiver cadastrado, enviaremos um link para redefinir a senha.",
    };
  });
  app.post(
    "/auth/reset-password",
    { config: authLimit },
    async (request, reply) => {
      const input = schema.resetSchema.parse(request.body);
      await account.consumeAction(
        input.token,
        "RESET_PASSWORD",
        input.password,
      );
      clearCookies(reply);
      return { message: "Senha redefinida. Entre novamente." };
    },
  );
  app.post("/auth/verify-email", { config: authLimit }, async (request) => {
    await account.consumeAction(
      schema.tokenSchema.parse(request.body).token,
      "VERIFY_EMAIL",
    );
    return { message: "Email confirmado." };
  });
  app.post(
    "/auth/resend-verification",
    { config: emailLimit },
    async (request) => {
      await account.resendVerification(await authenticate(request));
      return {
        message: "Se necessário, enviamos um novo link de confirmação.",
      };
    },
  );
  app.get("/me", async (request) => account.me(await authenticate(request)));
  app.patch("/me", async (request) =>
    account.updateProfile(
      await authenticate(request),
      schema.profileSchema.parse(request.body),
    ),
  );
  app.post("/auth/switch-tenant", async (request, reply) => {
    const context = await authenticate(request);
    const { tenantId } = schema.switchSchema.parse(request.body);
    await issueCookies(
      reply,
      await account.switchTenant(context, tenantId, request),
    );
    return { message: "Empresa alterada." };
  });
  app.get("/memberships", async (request) => ({
    items: await members.listMembers(await authenticate(request)),
  }));
  app.patch("/memberships/:id", async (request) =>
    members.updateMember(
      await authenticate(request),
      schema.idParams.parse(request.params).id,
      schema.memberSchema.parse(request.body),
    ),
  );
  app.get("/invitations", async (request) => ({
    items: await members.listInvitations(await authenticate(request)),
  }));
  app.post("/invitations", async (request, reply) => {
    const context = await authenticate(request);
    const input = schema.inviteSchema.parse(request.body);
    return reply
      .code(201)
      .send(await members.invite(context, input.email, input.role));
  });
  app.post(
    "/auth/accept-invitation",
    { config: authLimit },
    async (request, reply) => {
      const session = await members.acceptInvitation(
        schema.acceptSchema.parse(request.body),
        await optionalAuth(request),
        request,
      );
      await issueCookies(reply, session);
      return reply.code(201).send({ message: "Convite aceito." });
    },
  );
  app.get("/sessions", async (request) => ({
    items: await account.listSessions(await authenticate(request)),
  }));
  app.delete("/sessions/:id", async (request, reply) => {
    const context = await authenticate(request);
    const { id } = schema.idParams.parse(request.params);
    await account.revokeSession(context, id);
    if (id === context.sessionId) clearCookies(reply);
    return { message: "Sessão encerrada." };
  });
}
