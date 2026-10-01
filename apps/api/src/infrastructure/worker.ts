import nodemailer from "nodemailer";
import { sql } from "drizzle-orm";
import { db, one, pool } from "./database.js";
import { config } from "../shared/config.js";
const transport = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_PORT === 465,
  auth: config.SMTP_USER
    ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
    : undefined,
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
});
let stopping = false;
async function deliverOne() {
  await db.execute(
    sql`UPDATE outbox SET body='',recipient='',last_error='Conteúdo expirado e removido',attempts=8 WHERE expires_at<=now() AND body<>''`,
  );
  return db.transaction(async (tx) => {
    const mail = await one(
      tx,
      sql`SELECT * FROM outbox WHERE sent_at IS NULL AND attempts<8 AND available_at<=now() AND expires_at>now() AND body<>'' ORDER BY available_at,id LIMIT 1 FOR UPDATE SKIP LOCKED`,
    );
    if (!mail) return false;
    try {
      await transport.sendMail({
        from: config.SMTP_FROM,
        to: mail.recipient,
        subject: mail.subject,
        text: mail.body,
        messageId: `<${mail.id}@orbit.local>`,
      });
      await tx.execute(
        sql`UPDATE outbox SET sent_at=now(),body='',recipient='',last_error=NULL,attempts=attempts+1 WHERE id=${mail.id}`,
      );
      console.log(JSON.stringify({ event: "email.sent", id: mail.id }));
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "SMTP_ERROR";
      const delay = Math.min(3600, 30 * 2 ** mail.attempts);
      await tx.execute(
        sql`UPDATE outbox SET attempts=attempts+1,available_at=now()+${`${delay} seconds`}::interval,last_error=${code} WHERE id=${mail.id}`,
      );
      console.warn(
        JSON.stringify({
          event: "email.retry",
          id: mail.id,
          attempt: mail.attempts + 1,
          code,
        }),
      );
    }
    return true;
  });
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    stopping = true;
  });
console.log(JSON.stringify({ event: "email.worker.started" }));
while (!stopping) {
  try {
    if (await deliverOne()) continue;
  } catch {
    console.error(JSON.stringify({ event: "email.worker.database_error" }));
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));
}
transport.close();
await pool.end();
