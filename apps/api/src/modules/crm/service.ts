import { sql, type SQL } from "drizzle-orm";
import {
  one,
  rows,
  camel,
  audit,
  type Executor,
  type Row,
} from "../../infrastructure/database.js";
import { invariant } from "../../shared/errors.js";
import { type Context } from "../iam/application/sessions.js";
import { hasPermission, type Permission } from "../iam/domain/permissions.js";
import { crmTransaction } from "./tenant.js";
import type { Kind, ListQuery } from "./schemas.js";

const commonFields = [
  "id",
  "name",
  "email",
  "phone",
  "assignedTo",
  "source",
  "description",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "version",
];
const kindFields: Record<Kind, string[]> = {
  contacts: [
    "lastName",
    "whatsapp",
    "jobTitle",
    "companyId",
    "companyName",
    "address",
    "city",
    "state",
    "country",
    "birthday",
  ],
  companies: [
    "legalName",
    "taxId",
    "website",
    "segment",
    "employeeCount",
    "address",
    "city",
    "state",
    "country",
  ],
  leads: [
    "companyId",
    "companyName",
    "jobTitle",
    "status",
    "temperature",
    "estimatedValue",
    "discardReason",
    "lastContactAt",
    "nextContactAt",
    "convertedContactId",
    "convertedCompanyId",
    "convertedDealId",
  ],
};
const column = (key: string) =>
  key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const permission = (
  kind: Kind,
  action: "view" | "create" | "update" | "delete",
) => `${kind}.${action}` as Permission;
const idsSql = (ids: string[]) =>
  sql.join(
    ids.map((id) => sql`${id}::uuid`),
    sql`, `,
  );
export const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() || null : null;
export const normalizePhone = (value: unknown) =>
  typeof value === "string" ? value.replace(/\D/g, "") || null : null;
function canSeeDeleted(context: Context, kind: Kind) {
  return (
    hasPermission(context.role, permission(kind, "delete")) ||
    hasPermission(context.role, "crm.purge")
  );
}
function assertVisible(
  record: Row | undefined,
  context: Context,
  kind: Kind,
  mutable = false,
): asserts record is Row {
  invariant(
    record && (!record.deleted_at || canSeeDeleted(context, kind)),
    404,
    "NOT_FOUND",
    "Registro não encontrado.",
  );
  if (mutable)
    invariant(
      !record.deleted_at,
      409,
      "DELETED_RECORD",
      "Restaure o registro antes de alterá-lo.",
    );
}
async function record(
  tx: Executor,
  context: Context,
  kind: Kind,
  id: string,
  lock = false,
  mutable = false,
) {
  const result = await one(
    tx,
    sql`SELECT * FROM crm_records WHERE tenant_id=${context.tenantId} AND kind=${kind} AND id=${id} ${lock ? sql`FOR UPDATE` : sql`FOR SHARE`}`,
  );
  assertVisible(result, context, kind, mutable);
  return result;
}
const projection = sql`r.*,r.birthday::text AS birthday,u.name AS assigned_to_name,coalesce(company.name,r.company_name) AS resolved_company_name,
 coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'color',t.color) ORDER BY lower(t.name),t.id) FROM crm_record_tags rt JOIN crm_tags t ON t.tenant_id=rt.tenant_id AND t.id=rt.tag_id WHERE rt.tenant_id=r.tenant_id AND rt.record_id=r.id),'[]'::jsonb) AS tags`;
const joins = sql`LEFT JOIN users u ON u.id=r.assigned_to LEFT JOIN crm_records company ON company.tenant_id=r.tenant_id AND company.id=r.company_id AND company.kind='companies'`;
function dto(row: Row, kind: Kind) {
  const c = camel(row);
  const output: Row = Object.fromEntries(
    [...commonFields, ...kindFields[kind]].map((key) => [key, c[key] ?? null]),
  );
  output.assignedToName = c.assignedToName ?? null;
  output.tags = c.tags ?? [];
  if (kind !== "companies")
    output.companyName = c.resolvedCompanyName ?? c.companyName ?? null;
  return output;
}
async function item(tx: Executor, context: Context, kind: Kind, id: string) {
  const result = await one(
    tx,
    sql`SELECT ${projection} FROM crm_records r ${joins} WHERE r.tenant_id=${context.tenantId} AND r.kind=${kind} AND r.id=${id}`,
  );
  invariant(result, 404, "NOT_FOUND", "Registro não encontrado.");
  return dto(result, kind);
}
async function event(
  tx: Executor,
  context: Context,
  kind: Kind,
  id: string,
  type: string,
  metadata: unknown = {},
  before: unknown = null,
  after: unknown = null,
) {
  await tx.execute(
    sql`INSERT INTO crm_events(tenant_id,record_id,type,actor_id,metadata) VALUES(${context.tenantId},${id},${type},${context.userId},${JSON.stringify(metadata)}::jsonb)`,
  );
  await audit(tx, context, `${kind}.${type}`, id, before, after ?? metadata);
}
async function activeMember(tx: Executor, context: Context, id: string) {
  const member = await one(
    tx,
    sql`SELECT user_id FROM memberships WHERE tenant_id=${context.tenantId} AND user_id=${id} AND status='ACTIVE' FOR SHARE`,
  );
  invariant(
    member,
    404,
    "NOT_FOUND",
    "Responsável ou pessoa mencionada não encontrada na sua empresa.",
  );
}
async function activeCompany(tx: Executor, context: Context, id: string) {
  const result = await one(
    tx,
    sql`SELECT * FROM crm_records WHERE tenant_id=${context.tenantId} AND id=${id} AND kind='companies' AND deleted_at IS NULL FOR SHARE`,
  );
  invariant(result, 404, "NOT_FOUND", "Empresa cliente não encontrada.");
  return result;
}
async function validateReferences(tx: Executor, context: Context, input: Row) {
  if (input.assignedTo) await activeMember(tx, context, input.assignedTo);
  if (input.companyId) await activeCompany(tx, context, input.companyId);
  if (input.tagIds?.length) {
    const found = await rows(
      tx,
      sql`SELECT id FROM crm_tags WHERE tenant_id=${context.tenantId} AND id IN (${idsSql(input.tagIds)}) ORDER BY id FOR SHARE`,
    );
    invariant(
      found.length === input.tagIds.length,
      404,
      "NOT_FOUND",
      "Uma das tags não foi encontrada.",
    );
  }
}
function validateLead(data: Row) {
  invariant(
    data.status !== "DISCARDED" ||
      (typeof data.discardReason === "string" &&
        data.discardReason.trim().length > 0),
    400,
    "DISCARD_REASON_REQUIRED",
    "Informe o motivo do descarte.",
  );
}
async function replaceTags(
  tx: Executor,
  context: Context,
  id: string,
  tagIds: string[],
) {
  await tx.execute(
    sql`DELETE FROM crm_record_tags WHERE tenant_id=${context.tenantId} AND record_id=${id}`,
  );
  for (const tagId of tagIds)
    await tx.execute(
      sql`INSERT INTO crm_record_tags(tenant_id,record_id,tag_id) VALUES(${context.tenantId},${id},${tagId})`,
    );
}
async function duplicates(
  tx: Executor,
  context: Context,
  kind: Kind,
  current: Row,
) {
  const email = normalizeEmail(current.email),
    phone = normalizePhone(current.phone);
  if (!email && !phone) return [];
  const found = await rows(
    tx,
    sql`SELECT id,name,kind,email_normalized,phone_normalized FROM crm_records WHERE tenant_id=${context.tenantId} AND kind=${kind} AND deleted_at IS NULL AND id<>${current.id} AND ((${email}::text IS NOT NULL AND email_normalized=${email}) OR (${phone}::text IS NOT NULL AND phone_normalized=${phone})) ORDER BY updated_at DESC,id LIMIT 20`,
  );
  return found.map((r) => ({
    id: r.id,
    name: r.name,
    kind: r.kind,
    matchedBy: [
      ...(email && r.email_normalized === email ? ["email"] : []),
      ...(phone && r.phone_normalized === phone ? ["phone"] : []),
    ],
  }));
}
// All operations that can change tag membership take this before locking records.
// It allows deterministic record -> tag locks without racing newly linked records.
async function lockTagMemberships(tx: Executor, context: Context) {
  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${"crm-tags:" + context.tenantId}, 0))`,
  );
}
async function insert(tx: Executor, context: Context, kind: Kind, input: Row) {
  await validateReferences(tx, context, input);
  const data: Row = { ...input };
  delete data.tagIds;
  if (kind === "leads") {
    data.status ??= "NEW";
    data.temperature ??= "WARM";
    validateLead(data);
  }
  data.emailNormalized = normalizeEmail(input.email);
  data.phoneNormalized = normalizePhone(input.phone);
  data.tenantId = context.tenantId;
  data.kind = kind;
  const keys = Object.keys(data);
  const result = await one(
    tx,
    sql`INSERT INTO crm_records(${sql.join(
      keys.map((k) => sql.identifier(column(k))),
      sql`, `,
    )}) VALUES(${sql.join(
      keys.map((k) => sql`${data[k]}`),
      sql`, `,
    )}) RETURNING id`,
  );
  const id = result!.id as string;
  if (input.tagIds) await replaceTags(tx, context, id, input.tagIds);
  const created = await item(tx, context, kind, id);
  await event(
    tx,
    context,
    kind,
    id,
    "created",
    { name: created.name },
    null,
    created,
  );
  return created;
}
export async function list(context: Context, kind: Kind, query: ListQuery) {
  return crmTransaction(
    context,
    permission(kind, "view"),
    async (tx, fresh) => {
      if (query.deleted === "true")
        invariant(
          canSeeDeleted(fresh, kind),
          403,
          "FORBIDDEN",
          "Seu perfil não tem acesso à lixeira.",
        );
      const filters: SQL[] = [
        sql`r.tenant_id=${context.tenantId}`,
        sql`r.kind=${kind}`,
        query.deleted === "true"
          ? sql`r.deleted_at IS NOT NULL`
          : sql`r.deleted_at IS NULL`,
      ];
      if (query.q) {
        const match = `%${query.q.replace(/[\\%_]/g, "\\$&")}%`;
        filters.push(
          sql`(r.name ILIKE ${match} ESCAPE '\\' OR r.last_name ILIKE ${match} ESCAPE '\\' OR r.email ILIKE ${match} ESCAPE '\\' OR r.phone ILIKE ${match} ESCAPE '\\' OR r.company_name ILIKE ${match} ESCAPE '\\' OR company.name ILIKE ${match} ESCAPE '\\')`,
        );
      }
      for (const key of [
        "status",
        "assignedTo",
        "companyId",
        "source",
        "temperature",
      ] as const)
        if (query[key])
          filters.push(sql`r.${sql.identifier(column(key))}=${query[key]}`);
      if (query.tagId)
        filters.push(
          sql`EXISTS(SELECT 1 FROM crm_record_tags rt WHERE rt.tenant_id=r.tenant_id AND rt.record_id=r.id AND rt.tag_id=${query.tagId})`,
        );
      const where = sql.join(filters, sql` AND `),
        direction = query.order === "asc" ? sql`ASC` : sql`DESC`,
        sort =
          query.sort === "name"
            ? sql`lower(r.name)`
            : sql`r.${sql.identifier(column(query.sort))}`;
      // One query obtains both the page and its total from the same database snapshot.
      const result = await one(
        tx,
        sql`WITH filtered AS (SELECT r.id FROM crm_records r ${joins} WHERE ${where}), page AS (SELECT ${projection} FROM crm_records r JOIN filtered f ON f.id=r.id ${joins} WHERE r.tenant_id=${context.tenantId} ORDER BY ${sort} ${direction},r.id ${direction} LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}) SELECT (SELECT count(*)::int FROM filtered) AS total, coalesce((SELECT jsonb_agg(p) FROM page p),'[]'::jsonb) AS items`,
      );
      return {
        items: result!.items.map((r: Row) => dto(r, kind)),
        total: result!.total,
        page: query.page,
        pageSize: query.pageSize,
      };
    },
  );
}
export async function detail(context: Context, kind: Kind, id: string) {
  return crmTransaction(
    context,
    permission(kind, "view"),
    async (tx, fresh) => {
      await record(tx, fresh, kind, id);
      return { item: await item(tx, context, kind, id) };
    },
  );
}
export async function create(context: Context, kind: Kind, input: Row) {
  return crmTransaction(context, permission(kind, "create"), async (tx) => {
    if (input.tagIds) await lockTagMemberships(tx, context);
    const created = await insert(tx, context, kind, input);
    return {
      item: created,
      duplicates: await duplicates(tx, context, kind, created),
    };
  });
}
function comparisonValue(field: string, value: unknown): unknown {
  if (value == null) return null;
  if (field === "tagIds") return [...(value as string[])].sort();
  if (field === "estimatedValue") {
    const [whole, decimal = ""] = String(value).split(".");
    return `${whole.replace(/^0+(?=\d)/, "")}.${decimal.padEnd(2, "0")}`;
  }
  if (["lastContactAt", "nextContactAt"].includes(field))
    return new Date(value as string).toISOString();
  return value;
}
function changesBetween(input: Row, before: Row, after: Row) {
  return Object.keys(input)
    .filter((field) => field !== "version")
    .flatMap((field) => {
      const previous =
        field === "tagIds"
          ? before.tags.map((tag: Row) => tag.id)
          : (before[field] ?? null);
      const next =
        field === "tagIds"
          ? after.tags.map((tag: Row) => tag.id)
          : (after[field] ?? null);
      if (
        JSON.stringify(comparisonValue(field, previous)) ===
        JSON.stringify(comparisonValue(field, next))
      )
        return [];
      const change: Row = { field, before: previous, after: next };
      if (field === "assignedTo") {
        change.beforeLabel = before.assignedToName ?? "Sem responsável";
        change.afterLabel = after.assignedToName ?? "Sem responsável";
      }
      if (field === "companyId") {
        change.beforeLabel = before.companyId
          ? before.companyName
          : "Sem empresa";
        change.afterLabel = after.companyId ? after.companyName : "Sem empresa";
      }
      if (field === "tagIds") {
        change.beforeLabel =
          before.tags.map((tag: Row) => tag.name).join(", ") || "Sem tags";
        change.afterLabel =
          after.tags.map((tag: Row) => tag.name).join(", ") || "Sem tags";
      }
      return [change];
    });
}
export async function update(
  context: Context,
  kind: Kind,
  id: string,
  input: Row,
) {
  return crmTransaction(
    context,
    permission(kind, "update"),
    async (tx, fresh) => {
      if (input.tagIds) await lockTagMemberships(tx, context);
      const before = await record(tx, fresh, kind, id, true, true);
      invariant(
        input.version === before.version,
        409,
        "VERSION_CONFLICT",
        "Este registro foi alterado por outra pessoa. Atualize a página antes de salvar.",
      );
      if (kind === "leads") {
        invariant(
          before.status !== "CONVERTED" || !input.status,
          409,
          "CONVERTED_LEAD",
          "O status de um lead convertido não pode ser alterado.",
        );
        validateLead({ ...camel(before), ...input });
      }
      await validateReferences(tx, context, input);
      const beforeItem = await item(tx, context, kind, id);
      const data = { ...input };
      delete data.version;
      delete data.tagIds;
      if (Object.hasOwn(input, "email"))
        data.emailNormalized = normalizeEmail(input.email);
      if (Object.hasOwn(input, "phone"))
        data.phoneNormalized = normalizePhone(input.phone);
      const assignments = Object.entries(data).map(
        ([key, value]) => sql`${sql.identifier(column(key))}=${value}`,
      );
      assignments.push(sql`version=version+1`, sql`updated_at=now()`);
      await tx.execute(
        sql`UPDATE crm_records SET ${sql.join(assignments, sql`, `)} WHERE tenant_id=${context.tenantId} AND id=${id} AND kind=${kind}`,
      );
      if (input.tagIds) await replaceTags(tx, context, id, input.tagIds);
      const updated = await item(tx, context, kind, id);
      const changes = changesBetween(input, beforeItem, updated);
      await event(
        tx,
        context,
        kind,
        id,
        "updated",
        { changes },
        beforeItem,
        updated,
      );
      return {
        item: updated,
        duplicates: await duplicates(tx, context, kind, updated),
      };
    },
  );
}
export async function remove(context: Context, kind: Kind, id: string) {
  return crmTransaction(
    context,
    permission(kind, "delete"),
    async (tx, fresh) => {
      const before = await record(tx, fresh, kind, id, true);
      if (before.deleted_at) return;
      const beforeItem = await item(tx, context, kind, id);
      await tx.execute(
        sql`UPDATE crm_records SET deleted_at=now(),updated_at=now(),version=version+1 WHERE tenant_id=${context.tenantId} AND id=${id} AND kind=${kind}`,
      );
      await event(
        tx,
        context,
        kind,
        id,
        "deleted",
        { name: before.name },
        beforeItem,
        await item(tx, context, kind, id),
      );
    },
  );
}
export async function restore(context: Context, kind: Kind, id: string) {
  return crmTransaction(
    context,
    permission(kind, "delete"),
    async (tx, fresh) => {
      const before = await record(tx, fresh, kind, id, true);
      if (!before.deleted_at)
        return { item: await item(tx, context, kind, id) };
      const beforeItem = await item(tx, context, kind, id);
      await tx.execute(
        sql`UPDATE crm_records SET deleted_at=NULL,updated_at=now(),version=version+1 WHERE tenant_id=${context.tenantId} AND id=${id} AND kind=${kind}`,
      );
      const restored = await item(tx, context, kind, id);
      await event(
        tx,
        context,
        kind,
        id,
        "restored",
        { name: before.name },
        beforeItem,
        restored,
      );
      return { item: restored };
    },
  );
}
export async function purge(context: Context, kind: Kind, id: string) {
  return crmTransaction(context, "crm.purge", async (tx, fresh) => {
    const before = await record(tx, fresh, kind, id, true);
    invariant(
      before.deleted_at,
      409,
      "NOT_DELETED",
      "Envie o registro para a lixeira antes de excluí-lo permanentemente.",
    );
    const reference = await one(
      tx,
      sql`SELECT id FROM crm_records WHERE tenant_id=${context.tenantId} AND (company_id=${id} OR converted_contact_id=${id} OR converted_company_id=${id}) LIMIT 1`,
    );
    invariant(
      !reference,
      409,
      "REFERENCED_RECORD",
      "Este registro possui vínculos comerciais. Remova os vínculos antes de excluí-lo permanentemente.",
    );
    const salesReference = await one(
      tx,
      sql`SELECT id FROM sales_deals WHERE tenant_id=${context.tenantId} AND (contact_id=${id} OR company_id=${id} OR lead_id=${id}) UNION ALL SELECT id FROM sales_work WHERE tenant_id=${context.tenantId} AND (contact_id=${id} OR company_id=${id} OR lead_id=${id}) LIMIT 1`,
    );
    invariant(
      !salesReference,
      409,
      "REFERENCED_RECORD",
      "Este registro possui oportunidades ou atividades vinculadas. Remova os vínculos antes de excluir permanentemente.",
    );
    await audit(
      tx,
      context,
      `${kind}.purged`,
      id,
      await item(tx, context, kind, id),
      null,
    );
    await tx.execute(
      sql`DELETE FROM crm_records WHERE tenant_id=${context.tenantId} AND id=${id} AND kind=${kind}`,
    );
  });
}
export async function assignees(context: Context) {
  return crmTransaction(context, "contacts.view", async (tx) => ({
    items: await rows(
      tx,
      sql`SELECT u.id,u.name FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=${context.tenantId} AND m.status='ACTIVE' ORDER BY lower(u.name),u.id`,
    ),
  }));
}
export async function tags(context: Context) {
  return crmTransaction(context, "contacts.view", async (tx) => ({
    items: await rows(
      tx,
      sql`SELECT id,name,color FROM crm_tags WHERE tenant_id=${context.tenantId} ORDER BY lower(name),id`,
    ),
  }));
}
export async function createTag(context: Context, input: Row) {
  return crmTransaction(context, "tags.manage", async (tx) => {
    const created = await one(
      tx,
      sql`INSERT INTO crm_tags(tenant_id,name,color) VALUES(${context.tenantId},${input.name},${input.color}) RETURNING id,name,color`,
    );
    await audit(tx, context, "tag.created", created!.id, null, created);
    return { item: created };
  });
}
async function tagLinkedRecords(tx: Executor, context: Context, id: string) {
  await lockTagMemberships(tx, context);
  const crm = await rows(
    tx,
    sql`SELECT r.id,r.kind FROM crm_records r JOIN crm_record_tags rt ON rt.tenant_id=r.tenant_id AND rt.record_id=r.id WHERE r.tenant_id=${context.tenantId} AND rt.tag_id=${id} ORDER BY r.id FOR UPDATE OF r`,
  );
  const deals = await rows(
    tx,
    sql`SELECT d.id,'deals' AS kind FROM sales_deals d JOIN sales_deal_tags dt ON dt.tenant_id=d.tenant_id AND dt.deal_id=d.id WHERE d.tenant_id=${context.tenantId} AND dt.tag_id=${id} ORDER BY d.id FOR UPDATE OF d`,
  );
  const work = await rows(
    tx,
    sql`SELECT w.id,w.kind FROM sales_work w JOIN sales_work_tags wt ON wt.tenant_id=w.tenant_id AND wt.work_id=w.id WHERE w.tenant_id=${context.tenantId} AND wt.tag_id=${id} ORDER BY w.id FOR UPDATE OF w`,
  );
  return [...crm, ...deals, ...work];
}
async function tagChanged(
  tx: Executor,
  context: Context,
  linked: Row[],
  before: Row,
  after: Row | null,
) {
  for (const target of linked) {
    const metadata = {
      tagAction: after ? "updated" : "deleted",
      changes: [
        {
          field: "tags",
          before: [before],
          after: after ? [after] : [],
          beforeLabel: `${before.name} (${before.color})`,
          afterLabel: after ? `${after.name} (${after.color})` : "Tag removida",
        },
      ],
    };
    if (["deals", "activities", "tasks"].includes(target.kind)) {
      await tx.execute(
        sql`UPDATE ${sql.identifier(target.kind === "deals" ? "sales_deals" : "sales_work")} SET version=version+1,updated_at=now() WHERE tenant_id=${context.tenantId} AND id=${target.id}`,
      );
      await tx.execute(
        sql`INSERT INTO sales_events(tenant_id,deal_id,work_id,actor_id,type,metadata) VALUES(${context.tenantId},${target.kind === "deals" ? target.id : null},${target.kind === "deals" ? null : target.id},${context.userId},'updated',${JSON.stringify(metadata)}::jsonb)`,
      );
      await audit(
        tx,
        context,
        `${target.kind}.tag.updated`,
        target.id,
        before,
        after,
      );
      continue;
    }
    await tx.execute(
      sql`UPDATE crm_records SET version=version+1,updated_at=now() WHERE tenant_id=${context.tenantId} AND id=${target.id}`,
    );
    await event(tx, context, target.kind, target.id, "updated", metadata);
  }
}
export async function updateTag(context: Context, id: string, input: Row) {
  return crmTransaction(context, "tags.manage", async (tx) => {
    const linked = await tagLinkedRecords(tx, context, id);
    const before = await one(
      tx,
      sql`SELECT id,name,color FROM crm_tags WHERE tenant_id=${context.tenantId} AND id=${id} FOR UPDATE`,
    );
    invariant(before, 404, "NOT_FOUND", "Tag não encontrada.");
    const assignments = Object.entries(input).map(
      ([key, value]) => sql`${sql.identifier(key)}=${value}`,
    );
    const updated = await one(
      tx,
      sql`UPDATE crm_tags SET ${sql.join(assignments, sql`, `)} WHERE tenant_id=${context.tenantId} AND id=${id} RETURNING id,name,color`,
    );
    await audit(tx, context, "tag.updated", id, before, updated);
    await tagChanged(tx, context, linked, before, updated!);
    return { item: updated };
  });
}
export async function removeTag(context: Context, id: string) {
  return crmTransaction(context, "tags.manage", async (tx) => {
    const linked = await tagLinkedRecords(tx, context, id);
    const before = await one(
      tx,
      sql`SELECT id,name,color FROM crm_tags WHERE tenant_id=${context.tenantId} AND id=${id} FOR UPDATE`,
    );
    invariant(before, 404, "NOT_FOUND", "Tag não encontrada.");
    await audit(tx, context, "tag.deleted", id, before, null);
    await tx.execute(
      sql`DELETE FROM crm_tags WHERE tenant_id=${context.tenantId} AND id=${id}`,
    );
    await tagChanged(tx, context, linked, before, null);
  });
}
export async function timeline(
  context: Context,
  kind: Kind,
  id: string,
  query: { page: number; pageSize: number },
) {
  return crmTransaction(
    context,
    permission(kind, "view"),
    async (tx, fresh) => {
      await record(tx, fresh, kind, id);
      const result = await one(
        tx,
        sql`WITH filtered AS (SELECT e.id,e.type,u.name AS "actorName",e.created_at AS "createdAt",e.metadata FROM crm_events e JOIN users u ON u.id=e.actor_id WHERE e.tenant_id=${context.tenantId} AND e.record_id=${id}), page AS (SELECT * FROM filtered ORDER BY "createdAt" DESC,id DESC LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}) SELECT (SELECT count(*)::int FROM filtered) AS total,coalesce((SELECT jsonb_agg(p) FROM page p),'[]'::jsonb) AS items`,
      );
      return { ...result, page: query.page, pageSize: query.pageSize };
    },
  );
}
const noteProjection = sql`n.id,n.body,n.pinned,u.name AS "authorName",n.created_at AS "createdAt",n.updated_at AS "updatedAt",coalesce((SELECT jsonb_agg(nm.user_id ORDER BY nm.user_id) FROM crm_note_mentions nm WHERE nm.tenant_id=n.tenant_id AND nm.note_id=n.id),'[]'::jsonb) AS "mentionIds"`;
async function noteItem(tx: Executor, context: Context, id: string) {
  return one(
    tx,
    sql`SELECT ${noteProjection} FROM crm_notes n JOIN users u ON u.id=n.author_id WHERE n.tenant_id=${context.tenantId} AND n.id=${id}`,
  );
}
async function mentions(
  tx: Executor,
  context: Context,
  noteId: string,
  mentionIds: string[],
) {
  for (const id of [...mentionIds].sort()) await activeMember(tx, context, id);
  await tx.execute(
    sql`DELETE FROM crm_note_mentions WHERE tenant_id=${context.tenantId} AND note_id=${noteId}`,
  );
  for (const id of mentionIds)
    await tx.execute(
      sql`INSERT INTO crm_note_mentions(tenant_id,note_id,user_id) VALUES(${context.tenantId},${noteId},${id})`,
    );
}
export async function notes(context: Context, kind: Kind, id: string) {
  return crmTransaction(
    context,
    permission(kind, "view"),
    async (tx, fresh) => {
      await record(tx, fresh, kind, id);
      return {
        items: await rows(
          tx,
          sql`SELECT ${noteProjection} FROM crm_notes n JOIN users u ON u.id=n.author_id WHERE n.tenant_id=${context.tenantId} AND n.record_id=${id} ORDER BY n.pinned DESC,n.created_at DESC,n.id DESC`,
        ),
      };
    },
  );
}
export async function createNote(
  context: Context,
  kind: Kind,
  id: string,
  input: Row,
) {
  return crmTransaction(
    context,
    permission(kind, "update"),
    async (tx, fresh) => {
      await record(tx, fresh, kind, id, true, true);
      const created = await one(
        tx,
        sql`INSERT INTO crm_notes(tenant_id,record_id,author_id,body,pinned) VALUES(${context.tenantId},${id},${context.userId},${input.body},${input.pinned ?? false}) RETURNING id`,
      );
      if (input.mentionIds)
        await mentions(tx, context, created!.id, input.mentionIds);
      const result = await noteItem(tx, context, created!.id);
      await event(
        tx,
        context,
        kind,
        id,
        "note.created",
        { noteId: created!.id, bodyPreview: input.body.slice(0, 160) },
        null,
        result,
      );
      return { item: result };
    },
  );
}
export async function updateNote(
  context: Context,
  kind: Kind,
  id: string,
  noteId: string,
  input: Row,
) {
  return crmTransaction(
    context,
    permission(kind, "update"),
    async (tx, fresh) => {
      await record(tx, fresh, kind, id, true, true);
      const before = await one(
        tx,
        sql`SELECT * FROM crm_notes WHERE tenant_id=${context.tenantId} AND record_id=${id} AND id=${noteId} FOR UPDATE`,
      );
      invariant(before, 404, "NOT_FOUND", "Nota não encontrada.");
      const assignments: SQL[] = [sql`updated_at=now()`];
      if (input.body !== undefined) assignments.push(sql`body=${input.body}`);
      if (input.pinned !== undefined)
        assignments.push(sql`pinned=${input.pinned}`);
      await tx.execute(
        sql`UPDATE crm_notes SET ${sql.join(assignments, sql`, `)} WHERE tenant_id=${context.tenantId} AND record_id=${id} AND id=${noteId}`,
      );
      if (input.mentionIds)
        await mentions(tx, context, noteId, input.mentionIds);
      const result = await noteItem(tx, context, noteId);
      await event(
        tx,
        context,
        kind,
        id,
        "note.updated",
        { noteId, bodyPreview: result!.body.slice(0, 160) },
        camel(before),
        result,
      );
      return { item: result };
    },
  );
}
export async function removeNote(
  context: Context,
  kind: Kind,
  id: string,
  noteId: string,
) {
  return crmTransaction(
    context,
    permission(kind, "update"),
    async (tx, fresh) => {
      await record(tx, fresh, kind, id, true, true);
      const before = await one(
        tx,
        sql`SELECT * FROM crm_notes WHERE tenant_id=${context.tenantId} AND record_id=${id} AND id=${noteId} FOR UPDATE`,
      );
      invariant(before, 404, "NOT_FOUND", "Nota não encontrada.");
      await tx.execute(
        sql`DELETE FROM crm_notes WHERE tenant_id=${context.tenantId} AND record_id=${id} AND id=${noteId}`,
      );
      await event(
        tx,
        context,
        kind,
        id,
        "note.deleted",
        { noteId },
        camel(before),
        null,
      );
    },
  );
}
export async function convert(
  context: Context,
  id: string,
  input: Row,
  afterConversion?: (
    tx: Executor,
    fresh: Context,
    result: { lead: Row; contact: Row; company: Row | null },
  ) => Promise<Row>,
) {
  return crmTransaction(context, "leads.convert", async (tx, fresh) => {
    await lockTagMemberships(tx, context);
    const lead = await record(tx, fresh, "leads", id, true, true);
    if (lead.status === "CONVERTED") {
      const target = await one(
        tx,
        sql`SELECT id FROM crm_records WHERE tenant_id=${context.tenantId} AND id=${lead.converted_contact_id} AND kind='contacts' AND deleted_at IS NULL FOR SHARE`,
      );
      invariant(
        target,
        404,
        "NOT_FOUND",
        "O contato desta conversão está na lixeira. Restaure-o para consultar a conversão.",
      );
      if (lead.converted_company_id)
        await activeCompany(tx, context, lead.converted_company_id);
      const result = {
        lead: await item(tx, context, "leads", id),
        contact: await item(tx, context, "contacts", lead.converted_contact_id),
        company: lead.converted_company_id
          ? await item(tx, context, "companies", lead.converted_company_id)
          : null,
      };
      return afterConversion ? afterConversion(tx, fresh, result) : result;
    }
    const beforeItem = await item(tx, context, "leads", id);
    let company: Row | null = null,
      contact: Row | null = null;
    if (input.companyId) {
      company = dto(
        await activeCompany(tx, context, input.companyId),
        "companies",
      );
      company = await item(tx, context, "companies", company.id);
    } else if (input.createCompany) {
      invariant(
        lead.company_name?.trim(),
        400,
        "COMPANY_NAME_REQUIRED",
        "Informe o nome da empresa no lead antes de convertê-lo.",
      );
      invariant(
        lead.company_name.trim().length <= 160,
        400,
        "COMPANY_NAME_TOO_LONG",
        "Use até 160 caracteres para o nome da empresa antes de converter o lead.",
      );
      company = await insert(tx, context, "companies", {
        name: lead.company_name,
        source: lead.source,
        assignedTo: lead.assigned_to,
      });
    } else if (lead.company_id) {
      await activeCompany(tx, context, lead.company_id);
      company = await item(tx, context, "companies", lead.company_id);
    }
    if (input.contactId) {
      const existing = await one(
        tx,
        sql`SELECT id FROM crm_records WHERE tenant_id=${context.tenantId} AND kind='contacts' AND id=${input.contactId} AND deleted_at IS NULL FOR SHARE`,
      );
      invariant(existing, 404, "NOT_FOUND", "Contato não encontrado.");
      contact = await item(tx, context, "contacts", input.contactId);
    } else {
      const leadTags = await rows(
        tx,
        sql`SELECT tag_id FROM crm_record_tags WHERE tenant_id=${context.tenantId} AND record_id=${id}`,
      );
      contact = await insert(tx, context, "contacts", {
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
        description: lead.description,
        jobTitle: lead.job_title,
        assignedTo: lead.assigned_to,
        companyId: company?.id ?? null,
        tagIds: leadTags.map((t) => t.tag_id),
      });
    }
    await tx.execute(
      sql`UPDATE crm_records SET status='CONVERTED',converted_contact_id=${contact.id},converted_company_id=${company?.id ?? null},version=version+1,updated_at=now() WHERE tenant_id=${context.tenantId} AND kind='leads' AND id=${id}`,
    );
    const converted = await item(tx, context, "leads", id);
    await event(
      tx,
      context,
      "leads",
      id,
      "converted",
      { contactId: contact.id, companyId: company?.id ?? null },
      beforeItem,
      converted,
    );
    const result = { lead: converted, contact, company };
    return afterConversion ? afterConversion(tx, fresh, result) : result;
  });
}
