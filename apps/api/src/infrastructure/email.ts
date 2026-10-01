import { sql } from "drizzle-orm";
import { type Executor } from "./database.js";
import { opaqueToken, tokenHash } from "../shared/crypto.js";
import { config } from "../shared/config.js";
export async function enqueueEmail(
  tx: Executor,
  recipient: string,
  subject: string,
  body: string,
  retentionHours = 168,
) {
  await tx.execute(
    sql`INSERT INTO outbox(recipient,subject,body,expires_at) VALUES(${recipient},${subject},${body},now()+${`${retentionHours} hours`}::interval)`,
  );
}
export async function sendActionEmail(
  tx: Executor,
  user: { id: string; email: string },
  type: "VERIFY_EMAIL" | "RESET_PASSWORD",
) {
  const token = opaqueToken();
  await tx.execute(
    sql`UPDATE action_tokens SET consumed_at=now() WHERE user_id=${user.id} AND type=${type} AND consumed_at IS NULL`,
  );
  await tx.execute(
    sql`INSERT INTO action_tokens(user_id,type,token_hash,expires_at) VALUES(${user.id},${type},${tokenHash(token)},now()+${type === "VERIFY_EMAIL" ? "24 hours" : "1 hour"}::interval)`,
  );
  const reset = type === "RESET_PASSWORD";
  const path = reset ? "/reset-password" : "/verify-email";
  const subject = reset
    ? "Redefina sua senha — Desmos CRM"
    : "Confirme seu email — Desmos CRM";
  await enqueueEmail(
    tx,
    user.email,
    subject,
    `${reset ? "Para redefinir sua senha" : "Para confirmar seu email"}, acesse:\n\n${config.WEB_URL}${path}?token=${token}\n\nEste link expira em ${reset ? "1 hora" : "24 horas"} e só pode ser usado uma vez. Se não solicitou, ignore esta mensagem.`,
    reset ? 1 : 24,
  );
}
