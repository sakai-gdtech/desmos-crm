// Bounded test runner. Never starts the application's broad outbox worker.
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import dotenv from "dotenv";
import pg from "pg";
import nodemailer from "nodemailer";
dotenv.config({ quiet: true });
const dbUrl = new URL(process.env.DATABASE_URL);
if (
  !["localhost", "127.0.0.1"].includes(dbUrl.hostname) ||
  process.env.NODE_ENV === "production"
)
  throw new Error("Test runner requires a local development database.");
const info = await fetch("http://127.0.0.1:8026/api/v1/info");
if (!info.ok) throw new Error("Local Mailpit unavailable.");
const startedAt = new Date().toISOString();
const evidenceDirectory =
  process.env.E2E_EVIDENCE_DIR ?? "docs/evidence/pdf-completion";
// SMTP is hardcoded to the local sink: no environment host/auth or external delivery.
const transport = nodemailer.createTransport({
  host: "127.0.0.1",
  port: 1026,
  secure: false,
  connectionTimeout: 3000,
  socketTimeout: 5000,
});
const pool = new pg.Pool({ connectionString: dbUrl.toString(), max: 1 });
let finished = false,
  output = "",
  delivered = 0;
const child = spawn(
  "npx",
  ["playwright", "test", "--reporter=json", ...process.argv.slice(2)],
  {
    env: { ...process.env, PLAYWRIGHT_CHANNEL: "chrome" },
    stdio: ["ignore", "pipe", "inherit"],
  },
);
child.stdout.on("data", (chunk) => (output += chunk));
const completion = new Promise((resolve, reject) => {
  child.on("error", (error) => {
    finished = true;
    reject(error);
  });
  child.on("exit", (code) => {
    finished = true;
    resolve(code);
  });
});
const drain = (async () => {
  while (!finished) {
    const connection = await pool.connect();
    try {
      await connection.query("BEGIN");
      const { rows } = await connection.query(
        `SELECT o.* FROM outbox o
        WHERE o.created_at >= $1 AND o.sent_at IS NULL AND o.attempts < 8
        AND o.available_at <= now() AND o.expires_at > now() AND o.body <> ''
        AND o.recipient ~ '^viewer-[0-9]+-[a-z0-9]+@example[.]test$'
        AND EXISTS (SELECT 1 FROM invitations i JOIN tenants t ON t.id=i.tenant_id
          WHERE i.email=o.recipient AND i.created_at >= $1 AND t.name='Empresa de Convites')
        ORDER BY o.id LIMIT 1 FOR UPDATE OF o SKIP LOCKED`,
        [startedAt],
      );
      const mail = rows[0];
      if (mail) {
        await transport.sendMail({
          from: "Desmos test <test@desmos.local>",
          to: mail.recipient,
          subject: mail.subject,
          text: mail.body,
          messageId: `<${mail.id}@orbit.local>`,
        });
        await connection.query(
          "UPDATE outbox SET sent_at=now(),body='',recipient='',last_error=NULL,attempts=attempts+1 WHERE id=$1",
          [mail.id],
        );
        delivered++;
      }
      await connection.query("COMMIT");
    } catch (error) {
      await connection.query("ROLLBACK");
      finished = true;
      child.kill("SIGTERM");
      throw error;
    } finally {
      connection.release();
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
})();
let exitCode;
try {
  [exitCode] = await Promise.all([completion, drain]);
} finally {
  transport.close();
  await pool.end();
}
const report = JSON.parse(output);
await mkdir(evidenceDirectory, { recursive: true });
await writeFile(
  `${evidenceDirectory}/e2e-final.json`,
  JSON.stringify(
    {
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode,
      delivered,
      mailScope:
        "Only invitations created after runner start, synthetic viewer-<timestamp>-<suffix>@example.test recipients in Empresa de Convites; SMTP hardcoded 127.0.0.1:1026 without credentials. No broad queue worker.",
      report,
    },
    null,
    2,
  ),
);
console.log(JSON.stringify({ exitCode, delivered, stats: report.stats }));
if (exitCode) process.exit(exitCode);
