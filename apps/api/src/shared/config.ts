import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";
loadEnv({
  path: fileURLToPath(new URL("../../../../.env", import.meta.url)),
  quiet: true,
});
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_URL: z.url().default("http://localhost:3017"),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().default(1026),
  SMTP_FROM: z.string().default("Desmos CRM <nao-responda@desmos.local>"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});
export const config = schema.parse(process.env);
if (config.NODE_ENV === "production" && !config.WEB_URL.startsWith("https://"))
  throw new Error("WEB_URL deve usar HTTPS em produção.");
