import { z } from "zod";
import { sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import {
  one,
  rows,
  audit,
  type Executor,
  type Row,
} from "../../infrastructure/database.js";
import { invariant } from "../../shared/errors.js";
import type { Context } from "../iam/application/sessions.js";
import type { Permission } from "../iam/domain/permissions.js";
import { crmTransaction } from "./tenant.js";
import {
  kindSchema,
  createSchema,
  type Kind,
  type ListQuery,
} from "./schemas.js";
import {
  insert,
  normalizeEmail,
  normalizePhone,
  crmWhere,
  crmJoins,
} from "./service.js";
export const importInput = z
  .object({
    kind: kindSchema,
    csv: z.string().min(1).max(300000),
    mode: z.enum(["preview", "import"]).default("preview"),
    duplicatePolicy: z.enum(["skip", "create"]).default("skip"),
    requestId: z.uuid().optional(),
  })
  .strict()
  .refine(
    (v) => v.mode !== "import" || !!v.requestId,
    "Use um identificador para importar.",
  );
const aliases: Record<string, string> = {
  name: "name",
  nome: "name",
  email: "email",
  phone: "phone",
  telefone: "phone",
  source: "source",
  origem: "source",
};
/** Bounded RFC4180 parser: quoted separators/newlines, escaped quotes, no executable cells. */
export function parseCsv(csv: string) {
  invariant(
    Buffer.byteLength(csv, "utf8") <= 300000 && !csv.includes("\0"),
    400,
    "INVALID_CSV",
    "Arquivo inválido ou maior que 300 KB.",
  );
  csv = csv.replace(/^\uFEFF/, "");
  const separator = csv.split(/\r?\n/, 1)[0]!.includes(";") ? ";" : ",";
  const lines: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]!;
    if (quoted) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += ch;
    } else if (ch === separator || ch === "\n" || ch === "\r") {
      row.push(cell);
      cell = "";
      closed = false;
      if (ch !== separator) {
        if (ch === "\r" && csv[i + 1] === "\n") i++;
        if (row.some((c) => c.trim())) lines.push(row);
        row = [];
        invariant(
          lines.length <= 501,
          400,
          "CSV_LIMIT",
          "Use até 500 linhas por arquivo.",
        );
      }
    } else if (ch === '"') {
      invariant(
        !cell && !closed,
        400,
        "INVALID_CSV",
        "Aspas fora de uma célula.",
      );
      quoted = true;
    } else {
      invariant(!closed, 400, "INVALID_CSV", "Conteúdo depois das aspas.");
      cell += ch;
    }
  }
  invariant(!quoted, 400, "INVALID_CSV", "Célula com aspas não fechadas.");
  row.push(cell);
  if (row.some((c) => c.trim())) lines.push(row);
  invariant(
    lines.length >= 2 && lines.length <= 501,
    400,
    "CSV_LIMIT",
    "Use um cabeçalho e de 1 a 500 linhas.",
  );
  const header = lines.shift()!.map(
    (v) =>
      aliases[
        v
          .replace(/^\uFEFF/, "")
          .trim()
          .toLowerCase()
      ],
  );
  invariant(
    header.every(Boolean) &&
      header.includes("name") &&
      new Set(header).size === header.length,
    400,
    "CSV_HEADER",
    "Use as colunas nome, email, telefone e origem (nome é obrigatório).",
  );
  return lines.map((line, index) => ({
    line: index + 2,
    raw:
      line.length === header.length
        ? Object.fromEntries(header.map((key, i) => [key, line[i]!.trim()]))
        : null,
  }));
}
export function safeCsvCell(value: unknown) {
  let cell = String(value ?? "");
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(cell.normalize("NFKC")))
    cell = "[texto] " + cell;
  return `"${cell.replaceAll('"', '""')}"`;
}
async function preview(tx: Executor, ctx: Context, kind: Kind, csv: string) {
  const seenEmails = new Set<string>(),
    seenPhones = new Set<string>();
  const results = [];
  for (const entry of parseCsv(csv)) {
    const parsed = entry.raw ? createSchema(kind).safeParse(entry.raw) : null;
    const errors =
      parsed && !parsed.success
        ? parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
        : !entry.raw
          ? ["Quantidade de colunas diferente do cabeçalho."]
          : [];
    if (entry.raw)
      for (const [key, v] of Object.entries(entry.raw))
        if (
          /^[\s]*[=+\-@]/.test(v.normalize("NFKC")) &&
          !(key === "phone" && /^[+\d()\s-]+$/.test(v))
        )
          errors.push(`${key}: fórmulas não são permitidas.`);
    if (!parsed?.success || errors.length) {
      results.push({
        line: entry.line,
        data: entry.raw,
        errors,
        duplicate: false,
      });
      continue;
    }
    const data = parsed.data as Row,
      email = normalizeEmail(data.email),
      phone = normalizePhone(data.phone);
    const duplicate = !!(
      (email && seenEmails.has(email)) ||
      (phone && seenPhones.has(phone)) ||
      (await one(
        tx,
        sql`SELECT id FROM crm_records WHERE tenant_id=${ctx.tenantId} AND kind=${kind} AND deleted_at IS NULL AND ((${email}::text IS NOT NULL AND email_normalized=${email}) OR (${phone}::text IS NOT NULL AND phone_normalized=${phone})) LIMIT 1`,
      ))
    );
    if (email) seenEmails.add(email);
    if (phone) seenPhones.add(phone);
    results.push({ line: entry.line, data, errors: [], duplicate });
  }
  return results;
}
export async function importCsv(
  ctx: Context,
  input: z.infer<typeof importInput>,
) {
  return crmTransaction(
    ctx,
    `${input.kind}.create` as Permission,
    async (tx, ctx) => {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${"crm-import:" + ctx.tenantId},0))`,
      );
      const hash = createHash("sha256")
        .update(
          JSON.stringify({
            kind: input.kind,
            csv: input.csv,
            duplicatePolicy: input.duplicatePolicy,
          }),
        )
        .digest("hex");
      if (input.mode === "import") {
        const old = await one(
          tx,
          sql`SELECT * FROM crm_imports WHERE tenant_id=${ctx.tenantId} AND id=${input.requestId}`,
        );
        if (old) {
          invariant(
            old.actor_id === ctx.userId && old.content_hash === hash,
            409,
            "IMPORT_CONFLICT",
            "Este identificador já foi usado em outra importação.",
          );
          return old.result;
        }
      }
      const entries = await preview(tx, ctx, input.kind, input.csv);
      if (input.mode === "preview")
        return {
          rows: entries,
          total: entries.length,
          invalid: entries.filter((r) => r.errors.length).length,
          duplicates: entries.filter((r) => r.duplicate).length,
        };
      invariant(
        !entries.some((r) => r.errors.length),
        400,
        "INVALID_ROWS",
        "Corrija as linhas inválidas antes de importar. Nenhum registro foi criado.",
      );
      let created = 0,
        skipped = 0;
      for (const entry of entries) {
        if (entry.duplicate && input.duplicatePolicy === "skip") {
          skipped++;
          continue;
        }
        await insert(tx, ctx, input.kind, {
          ...entry.data,
          assignedTo: ctx.userId,
        });
        created++;
      }
      const result = { created, skipped, total: entries.length };
      await tx.execute(
        sql`INSERT INTO crm_imports(tenant_id,id,actor_id,content_hash,result) VALUES(${ctx.tenantId},${input.requestId},${ctx.userId},${hash},${JSON.stringify(result)}::jsonb)`,
      );
      await audit(tx, ctx, "crm.imported", input.requestId!, null, {
        kind: input.kind,
        ...result,
      });
      return result;
    },
  );
}
export async function exportCsv(ctx: Context, kind: Kind, query: ListQuery) {
  return crmTransaction(ctx, `${kind}.view` as Permission, async (tx, ctx) => {
    invariant(
      query.deleted === "false",
      400,
      "INVALID_EXPORT",
      "Exporte registros ativos pela lista.",
    );
    const items = await rows(
      tx,
      sql`SELECT r.name,r.email,r.phone,r.source FROM crm_records r ${crmJoins} WHERE ${crmWhere(ctx, kind, query)} ORDER BY r.name,r.id LIMIT 5001`,
    );
    invariant(
      items.length <= 5000,
      400,
      "EXPORT_LIMIT",
      "A exportação permite até 5.000 registros por vez.",
    );
    await audit(tx, ctx, "crm.exported", ctx.userId, null, {
      kind,
      total: items.length,
    });
    return {
      csv:
        "\uFEFF" +
        [
          "nome,email,telefone,origem",
          ...items.map((r) =>
            ["name", "email", "phone", "source"]
              .map((k) => safeCsvCell(r[k]))
              .join(","),
          ),
        ].join("\r\n"),
      total: items.length,
    };
  });
}
