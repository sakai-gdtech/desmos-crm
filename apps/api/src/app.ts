import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { Redis } from "ioredis";
import { sql } from "drizzle-orm";
import { ZodError } from "zod";
import { config } from "./shared/config.js";
import { AppError } from "./shared/errors.js";
import { verifyAccess } from "./shared/crypto.js";
import { db } from "./infrastructure/database.js";
import { iamRoutes } from "./modules/iam/http/routes.js";
import { salesRoutes } from "./modules/sales/routes.js";
import { crmRoutes } from "./modules/crm/routes.js";
import { tenantRoutes } from "./modules/tenants/http/routes.js";
export async function buildApp(options: { logger?: boolean } = {}) {
  const app = Fastify({
    logger:
      options.logger === false
        ? false
        : {
            level: "info",
            redact: [
              "req.headers.authorization",
              "req.headers.cookie",
              'res.headers["set-cookie"]',
              "password",
              "token",
              "passwordHash",
            ],
          },
    disableRequestLogging: true,
    bodyLimit: 32 * 1024,
    trustProxy: false,
  });
  const redis = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  redis.on("error", () => app.log.warn("Redis indisponível."));
  await redis.connect();
  app.addHook("onClose", async () => {
    await redis.quit();
  });
  await app.register(cookie);
  await app.register(cors, {
    origin: new URL(config.WEB_URL).origin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  });
  await app.register(helmet);
  await app.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
    redis,
    nameSpace: "orbit:rate:",
    keyGenerator: async (request) => {
      const token = request.cookies.orbit_access;
      if (token) {
        try {
          const identity = await verifyAccess(token);
          return `user:${identity.userId}`;
        } catch {
          // Invalid or expired signatures share the anonymous IP limit.
        }
      }
      return `ip:${request.ip}`;
    },
    errorResponseBuilder: (_request, context) => ({
      statusCode: context.statusCode,
      error: {
        code: "RATE_LIMITED",
        message: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
      },
    }),
  });
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
      request.headers.origin !== new URL(config.WEB_URL).origin
    )
      throw new AppError(
        403,
        "INVALID_ORIGIN",
        "Origem da solicitação não autorizada.",
      );
  });
  app.addHook("onResponse", async (request, reply) => {
    app.log.info(
      {
        requestId: request.id,
        method: request.method,
        route: request.routeOptions.url,
        statusCode: reply.statusCode,
      },
      "Requisição concluída",
    );
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError)
      return reply.code(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues
            .map(
              (issue) => `${issue.path.join(".") || "Dados"}: ${issue.message}`,
            )
            .join(" ")
            .slice(0, 600),
        },
      });
    if (error instanceof AppError)
      return reply
        .code(error.status)
        .send({ error: { code: error.code, message: error.message } });
    const candidate = error as {
      statusCode?: number;
      code?: string;
      cause?: { code?: string };
    };
    if (candidate.code === "23505" || candidate.cause?.code === "23505")
      return reply.code(409).send({
        error: {
          code: "CONFLICT",
          message:
            "Este cadastro já existe. Verifique os dados ou entre na conta.",
        },
      });
    if (candidate.statusCode === 429)
      return reply.code(429).send({
        error: {
          code: "RATE_LIMITED",
          message:
            "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
        },
      });
    if (candidate.statusCode && candidate.statusCode < 500)
      return reply.code(candidate.statusCode).send({
        error: { code: "INVALID_REQUEST", message: "Solicitação inválida." },
      });
    request.log.error(
      {
        requestId: request.id,
        errorCode: candidate.code ?? candidate.cause?.code ?? "INTERNAL_ERROR",
      },
      "Falha ao processar solicitação",
    );
    return reply.code(500).send({
      error: {
        code: "INTERNAL_ERROR",
        message: "Não foi possível concluir a ação. Tente novamente.",
      },
    });
  });
  app.setNotFoundHandler((request, reply) =>
    reply.code(404).send({
      error: { code: "NOT_FOUND", message: "Recurso não encontrado." },
    }),
  );
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/ready", async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      await redis.ping();
      return { status: "ready", database: "ok", redis: "ok" };
    } catch {
      return reply.code(503).send({
        error: {
          code: "NOT_READY",
          message: "Uma dependência está indisponível.",
        },
      });
    }
  });
  await app.register(iamRoutes);
  await app.register(tenantRoutes);
  await app.register(crmRoutes);
  await app.register(salesRoutes);
  return app;
}
