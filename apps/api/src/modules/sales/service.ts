import { sql, type SQL } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  audit,
  camel,
  one,
  rows,
  type Executor,
  type Row,
} from "../../infrastructure/database.js";
import { invariant } from "../../shared/errors.js";
import { authorize, type Context } from "../iam/application/sessions.js";
import { hasPermission, type Permission } from "../iam/domain/permissions.js";
import { crmTransaction } from "../crm/tenant.js";
import { convert as convertCrm } from "../crm/service.js";
import type { WorkKind } from "./schemas.js";
const table = (kind: string) =>
  kind === "deals" ? "sales_deals" : "sales_work";
const column = (key: string) =>
  key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const perm = (kind: string, action: string) =>
  `${kind}.${action}` as Permission;
const json = (value: unknown) => JSON.stringify(value);
const moneyEqual = (a: unknown, b: unknown) => {
  const cents = (value: unknown) => {
    const [whole, fraction = ""] = String(value ?? "0").split(".");
    return BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
  };
  return cents(a) === cents(b);
};
async function mutation<T>(
  ctx: Context,
  p: Permission,
  fn: (tx: Executor, fresh: Context) => Promise<T>,
) {
  return crmTransaction(ctx, p, async (tx, fresh) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`crm-tags:${ctx.tenantId}`},0))`,
    );
    return fn(tx, fresh);
  });
}
async function member(tx: Executor, ctx: Context, id: string) {
  invariant(
    await one(
      tx,
      sql`SELECT user_id FROM memberships WHERE tenant_id=${ctx.tenantId} AND user_id=${id} AND status='ACTIVE' FOR SHARE`,
    ),
    404,
    "NOT_FOUND",
    "Responsável ou pessoa mencionada não encontrado.",
  );
}
async function reference(tx: Executor, ctx: Context, kind: string, id: string) {
  invariant(
    await one(
      tx,
      sql`SELECT id FROM crm_records WHERE tenant_id=${ctx.tenantId} AND kind=${kind} AND id=${id} AND deleted_at IS NULL FOR SHARE`,
    ),
    404,
    "NOT_FOUND",
    "Cadastro relacionado não encontrado.",
  );
}
async function validate(tx: Executor, ctx: Context, data: Row) {
  if (data.assignedTo) await member(tx, ctx, data.assignedTo);
  for (const [key, kind] of [
    ["companyId", "companies"],
    ["contactId", "contacts"],
    ["leadId", "leads"],
  ])
    if (data[key]) await reference(tx, ctx, kind, data[key]);
  if (data.dealId) await locked(tx, ctx, "deals", data.dealId, false, true);
  for (const tagId of [...(data.tagIds ?? [])].sort())
    invariant(
      await one(
        tx,
        sql`SELECT id FROM crm_tags WHERE tenant_id=${ctx.tenantId} AND id=${tagId} FOR SHARE`,
      ),
      404,
      "NOT_FOUND",
      "Tag não encontrada.",
    );
}
async function locked(
  tx: Executor,
  ctx: Context,
  kind: string,
  id: string,
  write = false,
  active = false,
) {
  const row = await one(
    tx,
    sql`SELECT * FROM ${sql.identifier(table(kind))} WHERE tenant_id=${ctx.tenantId} AND id=${id} ${kind !== "deals" ? sql`AND kind=${kind}` : sql``} ${write ? sql`FOR UPDATE` : sql`FOR SHARE`}`,
  );
  invariant(
    row &&
      (!row.deleted_at ||
        hasPermission(ctx.role, perm(kind, "delete")) ||
        hasPermission(ctx.role, "crm.purge")),
    404,
    "NOT_FOUND",
    "Registro não encontrado.",
  );
  if (active)
    invariant(
      !row.deleted_at,
      409,
      "DELETED_RECORD",
      "Restaure o registro antes de alterá-lo.",
    );
  return row;
}
async function pipeline(
  tx: Executor,
  ctx: Context,
  id: string,
  write = false,
): Promise<Row & { stages: Row[] }> {
  const row = await one(
    tx,
    sql`SELECT * FROM sales_pipelines WHERE tenant_id=${ctx.tenantId} AND id=${id} ${write ? sql`FOR UPDATE` : sql`FOR SHARE`}`,
  );
  invariant(row, 404, "NOT_FOUND", "Pipeline não encontrado.");
  const stages = await rows(
    tx,
    sql`SELECT * FROM sales_stages WHERE tenant_id=${ctx.tenantId} AND pipeline_id=${id} ORDER BY position,id`,
  );
  return { ...camel(row), stages: stages.map(camel) };
}
async function targetStage(
  tx: Executor,
  ctx: Context,
  pipelineId: string,
  stageId: string,
) {
  const p = await pipeline(tx, ctx, pipelineId);
  invariant(
    p.active,
    409,
    "INACTIVE_PIPELINE",
    "Ative o pipeline antes de adicionar ou mover oportunidades.",
  );
  const stage = p.stages.find((s: Row) => s.id === stageId);
  invariant(stage, 404, "NOT_FOUND", "A etapa não pertence a este pipeline.");
  return stage;
}
const dealProjection = sql`d.*,d.expected_close_date::text AS expected_close_date,p.name AS pipeline_name,s.name AS stage_name,s.color AS stage_color,u.name AS assigned_to_name,c.name AS company_name,concat_ws(' ',ct.name,ct.last_name) AS contact_name,l.name AS lead_name,(d.value*d.probability/100)::numeric(16,2)::text AS weighted_value,floor(extract(epoch FROM (now()-d.stage_entered_at))/86400)::int AS days_in_stage,floor(extract(epoch FROM (now()-d.created_at))/86400)::int AS days_in_pipeline,
 (SELECT min(coalesce(w.scheduled_at,w.due_at)) FROM sales_work w WHERE w.tenant_id=d.tenant_id AND w.deal_id=d.id AND w.deleted_at IS NULL AND w.status IN ('PLANNED','TODO','IN_PROGRESS')) AS next_activity_at,
 (SELECT max(w.completed_at) FROM sales_work w WHERE w.tenant_id=d.tenant_id AND w.deal_id=d.id AND w.deleted_at IS NULL) AS last_activity_at,
 coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'color',t.color) ORDER BY lower(t.name),t.id) FROM sales_deal_tags dt JOIN crm_tags t ON t.tenant_id=dt.tenant_id AND t.id=dt.tag_id WHERE dt.tenant_id=d.tenant_id AND dt.deal_id=d.id),'[]'::jsonb) AS tags`;
const dealJoins = sql`JOIN sales_pipelines p ON p.tenant_id=d.tenant_id AND p.id=d.pipeline_id JOIN sales_stages s ON s.tenant_id=d.tenant_id AND s.id=d.stage_id LEFT JOIN users u ON u.id=d.assigned_to LEFT JOIN crm_records c ON c.tenant_id=d.tenant_id AND c.id=d.company_id LEFT JOIN crm_records ct ON ct.tenant_id=d.tenant_id AND ct.id=d.contact_id LEFT JOIN crm_records l ON l.tenant_id=d.tenant_id AND l.id=d.lead_id`;
const workProjection = sql`w.*,u.name AS assigned_to_name,actor.name AS created_by_name,d.title AS deal_title,c.name AS company_name,concat_ws(' ',ct.name,ct.last_name) AS contact_name,l.name AS lead_name,
 coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'color',t.color) ORDER BY lower(t.name),t.id) FROM sales_work_tags wt JOIN crm_tags t ON t.tenant_id=wt.tenant_id AND t.id=wt.tag_id WHERE wt.tenant_id=w.tenant_id AND wt.work_id=w.id),'[]'::jsonb) AS tags`;
const workJoins = sql`LEFT JOIN users u ON u.id=w.assigned_to JOIN users actor ON actor.id=w.created_by LEFT JOIN sales_deals d ON d.tenant_id=w.tenant_id AND d.id=w.deal_id LEFT JOIN crm_records c ON c.tenant_id=w.tenant_id AND c.id=w.company_id LEFT JOIN crm_records ct ON ct.tenant_id=w.tenant_id AND ct.id=w.contact_id LEFT JOIN crm_records l ON l.tenant_id=w.tenant_id AND l.id=w.lead_id`;
function dto(row: Row) {
  const out = camel(row);
  for (const key of ["tenantId", "companyKind", "contactKind", "leadKind"])
    delete out[key];
  return out;
}
async function item(tx: Executor, ctx: Context, kind: string, id: string) {
  const row =
    kind === "deals"
      ? await one(
          tx,
          sql`SELECT ${dealProjection} FROM sales_deals d ${dealJoins} WHERE d.tenant_id=${ctx.tenantId} AND d.id=${id}`,
        )
      : await one(
          tx,
          sql`SELECT ${workProjection} FROM sales_work w ${workJoins} WHERE w.tenant_id=${ctx.tenantId} AND w.id=${id} AND w.kind=${kind}`,
        );
  invariant(row, 404, "NOT_FOUND", "Registro não encontrado.");
  return dto(row);
}
async function tags(
  tx: Executor,
  ctx: Context,
  kind: string,
  id: string,
  ids: string[],
) {
  const name = kind === "deals" ? "sales_deal_tags" : "sales_work_tags";
  const key = kind === "deals" ? "deal_id" : "work_id";
  await tx.execute(
    sql`DELETE FROM ${sql.identifier(name)} WHERE tenant_id=${ctx.tenantId} AND ${sql.identifier(key)}=${id}`,
  );
  for (const tag of ids)
    await tx.execute(
      sql`INSERT INTO ${sql.identifier(name)}(tenant_id,${sql.identifier(key)},tag_id) VALUES(${ctx.tenantId},${id},${tag})`,
    );
}
async function event(
  tx: Executor,
  ctx: Context,
  kind: string,
  id: string,
  type: string,
  metadata: Row,
  before: unknown = null,
  after: unknown = null,
) {
  await tx.execute(
    sql`INSERT INTO sales_events(tenant_id,deal_id,work_id,actor_id,type,metadata) VALUES(${ctx.tenantId},${kind === "deals" ? id : null},${kind === "deals" ? null : id},${ctx.userId},${type},${json(metadata)}::jsonb)`,
  );
  await audit(tx, ctx, `${kind}.${type}`, id, before, after ?? metadata);
}
async function fanout(
  tx: Executor,
  ctx: Context,
  data: Row,
  type: string,
  metadata: Row,
) {
  const ids = new Set<string>(
    [data.contactId, data.companyId, data.leadId].filter(Boolean),
  );
  if (data.dealId) {
    const deal = await one(
      tx,
      sql`SELECT contact_id,company_id,lead_id FROM sales_deals WHERE tenant_id=${ctx.tenantId} AND id=${data.dealId}`,
    );
    if (deal)
      for (const id of [deal.contact_id, deal.company_id, deal.lead_id])
        if (id) ids.add(id);
    await tx.execute(
      sql`INSERT INTO sales_events(tenant_id,deal_id,actor_id,type,metadata) VALUES(${ctx.tenantId},${data.dealId},${ctx.userId},${type},${json(metadata)}::jsonb)`,
    );
  }
  for (const id of [...ids].sort())
    await tx.execute(
      sql`INSERT INTO crm_events(tenant_id,record_id,actor_id,type,metadata) VALUES(${ctx.tenantId},${id},${ctx.userId},${type},${json(metadata)}::jsonb)`,
    );
}
export async function pipelines(ctx: Context) {
  return crmTransaction(ctx, "pipelines.view", async (tx, ctx) => {
    const ids = await rows(
      tx,
      sql`SELECT id FROM sales_pipelines WHERE tenant_id=${ctx.tenantId} ORDER BY active DESC,lower(name),id`,
    );
    const items = [];
    for (const p of ids) items.push(await pipeline(tx, ctx, p.id));
    return { items };
  });
}
export async function pipelineDetail(ctx: Context, id: string) {
  return crmTransaction(ctx, "pipelines.view", async (tx, ctx) => ({
    item: await pipeline(tx, ctx, id),
  }));
}
export async function createPipeline(ctx: Context, input: Row) {
  return mutation(ctx, "pipelines.manage", async (tx, ctx) => {
    const row = await one(
      tx,
      sql`INSERT INTO sales_pipelines(tenant_id,name,description) VALUES(${ctx.tenantId},${input.name},${input.description ?? null}) RETURNING id`,
    );
    for (const [position, s] of input.stages.entries())
      await tx.execute(
        sql`INSERT INTO sales_stages(tenant_id,pipeline_id,name,position,probability,color,stale_days,require_activity) VALUES(${ctx.tenantId},${row!.id},${s.name},${position},${s.probability},${s.color},${s.staleDays},${s.requireActivity})`,
      );
    const result = await pipeline(tx, ctx, row!.id);
    await audit(tx, ctx, "pipelines.created", result.id, null, result);
    return { item: result };
  });
}
export async function updatePipeline(ctx: Context, id: string, input: Row) {
  return mutation(ctx, "pipelines.manage", async (tx, ctx) => {
    const before = await pipeline(tx, ctx, id, true);
    invariant(
      before.version === input.version,
      409,
      "VERSION_CONFLICT",
      "O pipeline foi alterado. Atualize a página antes de salvar.",
    );
    if (input.stages) {
      const keep = new Set(
        input.stages.filter((s: Row) => s.id).map((s: Row) => s.id),
      );
      for (const s of input.stages)
        if (s.id)
          invariant(
            before.stages.some((old: Row) => old.id === s.id),
            404,
            "NOT_FOUND",
            "Etapa não encontrada neste pipeline.",
          );
      for (const old of before.stages)
        if (!keep.has(old.id)) {
          invariant(
            !(await one(
              tx,
              sql`SELECT id FROM sales_deals WHERE tenant_id=${ctx.tenantId} AND stage_id=${old.id} LIMIT 1`,
            )),
            409,
            "REFERENCED_STAGE",
            "Mova as oportunidades desta etapa antes de removê-la, incluindo as da lixeira.",
          );
          await tx.execute(
            sql`DELETE FROM sales_stages WHERE tenant_id=${ctx.tenantId} AND id=${old.id}`,
          );
        }
      for (const [position, s] of input.stages.entries()) {
        if (s.id)
          await tx.execute(
            sql`UPDATE sales_stages SET name=${s.name},position=${position},probability=${s.probability},color=${s.color},stale_days=${s.staleDays},require_activity=${s.requireActivity} WHERE tenant_id=${ctx.tenantId} AND id=${s.id} AND pipeline_id=${id}`,
          );
        else
          await tx.execute(
            sql`INSERT INTO sales_stages(tenant_id,pipeline_id,name,position,probability,color,stale_days,require_activity) VALUES(${ctx.tenantId},${id},${s.name},${position},${s.probability},${s.color},${s.staleDays},${s.requireActivity})`,
          );
      }
    }
    await tx.execute(
      sql`UPDATE sales_pipelines SET name=${input.name ?? before.name},description=${input.description === undefined ? before.description : input.description},active=${input.active ?? before.active},version=version+1,updated_at=now() WHERE tenant_id=${ctx.tenantId} AND id=${id}`,
    );
    const result = await pipeline(tx, ctx, id);
    await audit(tx, ctx, "pipelines.updated", id, before, result);
    return { item: result };
  });
}
export async function deletePipeline(ctx: Context, id: string) {
  return mutation(ctx, "pipelines.manage", async (tx, ctx) => {
    const before = await pipeline(tx, ctx, id, true);
    invariant(
      !(await one(
        tx,
        sql`SELECT id FROM sales_deals WHERE tenant_id=${ctx.tenantId} AND pipeline_id=${id} LIMIT 1`,
      )),
      409,
      "REFERENCED_PIPELINE",
      "Este pipeline possui oportunidades. Arquive-o ou mova os registros antes de excluir.",
    );
    await audit(tx, ctx, "pipelines.deleted", id, before, null);
    await tx.execute(
      sql`DELETE FROM sales_pipelines WHERE tenant_id=${ctx.tenantId} AND id=${id}`,
    );
  });
}
export async function list(ctx: Context, kind: string, q: Row) {
  return crmTransaction(ctx, perm(kind, "view"), async (tx, ctx) => {
    if (q.deleted === "true")
      invariant(
        hasPermission(ctx.role, perm(kind, "delete")) ||
          hasPermission(ctx.role, "crm.purge"),
        403,
        "FORBIDDEN",
        "Você não pode acessar esta lixeira.",
      );
    const alias = kind === "deals" ? "d" : "w";
    const field = (key: string) =>
      sql`${sql.identifier(alias)}.${sql.identifier(key)}`;
    const filters: SQL[] = [
      sql`${field("tenant_id")}=${ctx.tenantId}`,
      q.deleted === "true"
        ? sql`${field("deleted_at")} IS NOT NULL`
        : sql`${field("deleted_at")} IS NULL`,
    ];
    if (kind !== "deals") filters.push(sql`w.kind=${kind}`);
    if (q.q)
      filters.push(
        sql`${field("title")} ILIKE ${`%${q.q.replace(/[\\%_]/g, "\\$&")}%`}`,
      );
    for (const key of [
      "pipelineId",
      "assignedTo",
      "contactId",
      "companyId",
      "leadId",
      "dealId",
    ])
      if (
        q[key] &&
        (key !== "pipelineId" || kind === "deals") &&
        (key !== "dealId" || kind !== "deals")
      )
        filters.push(sql`${field(column(key))}=${q[key]}`);
    if (q.status) filters.push(sql`${field("status")}=${q.status}`);
    if (kind !== "deals" && q.bucket !== "all") {
      const due = kind === "tasks" ? sql`w.due_at` : sql`w.scheduled_at`;
      const zone = (await one(
        tx,
        sql`SELECT timezone FROM tenants WHERE id=${ctx.tenantId}`,
      ))!.timezone;
      if (q.bucket === "completed")
        filters.push(sql`w.status IN ('DONE','COMPLETED')`);
      else {
        filters.push(sql`w.status IN ('TODO','IN_PROGRESS','PLANNED')`);
        if (q.bucket === "today")
          filters.push(
            sql`(${due} AT TIME ZONE ${zone})::date=(now() AT TIME ZONE ${zone})::date`,
          );
        if (q.bucket === "overdue") filters.push(sql`${due}<now()`);
        if (q.bucket === "upcoming")
          filters.push(
            sql`(${due} AT TIME ZONE ${zone})::date>(now() AT TIME ZONE ${zone})::date`,
          );
      }
    }
    const where = sql.join(filters, sql` AND `);
    const t = sql.identifier(table(kind));
    const count = (await one(
      tx,
      sql`SELECT count(*)::int AS total FROM ${t} ${sql.identifier(alias)} WHERE ${where}`,
    ))!.total;
    const items =
      kind === "deals"
        ? await rows(
            tx,
            sql`SELECT ${dealProjection} FROM sales_deals d ${dealJoins} WHERE ${where} ORDER BY d.updated_at DESC,d.id LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`,
          )
        : await rows(
            tx,
            sql`SELECT ${workProjection} FROM sales_work w ${workJoins} WHERE ${where} ORDER BY coalesce(w.due_at,w.scheduled_at) ASC NULLS LAST,w.id LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`,
          );
    return {
      items: items.map(dto),
      total: count,
      page: q.page,
      pageSize: q.pageSize,
    };
  });
}
export async function detail(ctx: Context, kind: string, id: string) {
  return crmTransaction(ctx, perm(kind, "view"), async (tx, ctx) => {
    await locked(tx, ctx, kind, id);
    return { item: await item(tx, ctx, kind, id) };
  });
}
export async function board(ctx: Context, q: Row) {
  return crmTransaction(ctx, "deals.view", async (tx, ctx) => {
    const p = await pipeline(tx, ctx, q.pipelineId);
    const filters = [
      sql`d.tenant_id=${ctx.tenantId}`,
      sql`d.pipeline_id=${p.id}`,
      sql`d.deleted_at IS NULL`,
      sql`d.status=${q.status}`,
    ];
    if (q.assignedTo) filters.push(sql`d.assigned_to=${q.assignedTo}`);
    if (q.q)
      filters.push(sql`d.title ILIKE ${`%${q.q.replace(/[\\%_]/g, "\\$&")}%`}`);
    const where = sql.join(filters, sql` AND `);
    const aggregate = await rows(
      tx,
      sql`SELECT d.stage_id,d.currency,count(*)::int AS total,sum(d.value)::text AS value FROM sales_deals d WHERE ${where} GROUP BY d.stage_id,d.currency`,
    );
    const columns = [];
    for (const s of p.stages) {
      const sums = aggregate.filter((r) => r.stage_id === s.id);
      const items = await rows(
        tx,
        sql`SELECT ${dealProjection} FROM sales_deals d ${dealJoins} WHERE ${where} AND d.stage_id=${s.id} ORDER BY d.stage_entered_at DESC,d.id LIMIT 100`,
      );
      columns.push({
        stage: s,
        items: items.map(dto),
        total: sums.reduce((n, r) => n + r.total, 0),
        totals: sums.map((r) => ({ currency: r.currency, value: r.value })),
      });
    }
    return { pipeline: p, columns };
  });
}
export async function createDealInTransaction(
  tx: Executor,
  ctx: Context,
  input: Row,
  fixtureId?: string,
) {
  await validate(tx, ctx, input);
  const stage = await targetStage(tx, ctx, input.pipelineId, input.stageId);
  const data: Row = {
    ...input,
    probability: input.probability ?? stage.probability,
    temperature: input.temperature ?? "WARM",
    value: input.value ?? "0",
    status: "OPEN",
  };
  delete data.tagIds;
  const fields = Object.keys(data).filter((k) => data[k] !== undefined);
  const id = fixtureId ?? randomUUID();
  await tx.execute(
    sql`INSERT INTO sales_deals(id,tenant_id,${sql.join(
      fields.map((k) => sql.identifier(column(k))),
      sql`,`,
    )}) VALUES(${id},${ctx.tenantId},${sql.join(
      fields.map((k) => sql`${data[k]}`),
      sql`,`,
    )})`,
  );
  if (input.tagIds) await tags(tx, ctx, "deals", id, input.tagIds);
  const result = await item(tx, ctx, "deals", id);
  await event(
    tx,
    ctx,
    "deals",
    id,
    "created",
    { title: result.title, stageName: result.stageName },
    null,
    result,
  );
  await fanout(tx, ctx, result, "deal.created", {
    dealId: id,
    title: result.title,
    stageName: result.stageName,
  });
  return result;
}
export async function createDeal(ctx: Context, input: Row) {
  return mutation(ctx, "deals.create", async (tx, ctx) => ({
    item: await createDealInTransaction(tx, ctx, input),
  }));
}
const dealFields = [
  "title",
  "pipelineId",
  "stageId",
  "contactId",
  "companyId",
  "leadId",
  "value",
  "currency",
  "probability",
  "expectedCloseDate",
  "assignedTo",
  "source",
  "description",
  "temperature",
  "status",
  "lostReason",
];
const workFields = [
  "title",
  "description",
  "assignedTo",
  "contactId",
  "companyId",
  "leadId",
  "dealId",
  "type",
  "scheduledAt",
  "dueAt",
  "priority",
  "status",
  "duration",
  "result",
  "checklist",
];
function changes(before: Row, after: Row, keys: string[]) {
  return keys
    .filter(
      (k) =>
        json(before[k]) !== json(after[k]) &&
        !(k === "value" && moneyEqual(before[k], after[k])),
    )
    .map((k) => ({
      field: k,
      before: before[k] ?? null,
      after: after[k] ?? null,
      ...([
        "stageId",
        "pipelineId",
        "assignedTo",
        "contactId",
        "companyId",
        "leadId",
        "dealId",
      ].includes(k)
        ? {
            beforeLabel:
              before[
                {
                  stageId: "stageName",
                  pipelineId: "pipelineName",
                  assignedTo: "assignedToName",
                  contactId: "contactName",
                  companyId: "companyName",
                  leadId: "leadName",
                  dealId: "dealTitle",
                }[k]!
              ] || "Não informado",
            afterLabel:
              after[
                {
                  stageId: "stageName",
                  pipelineId: "pipelineName",
                  assignedTo: "assignedToName",
                  contactId: "contactName",
                  companyId: "companyName",
                  leadId: "leadName",
                  dealId: "dealTitle",
                }[k]!
              ] || "Não informado",
          }
        : {}),
    }));
}
export async function update(
  ctx: Context,
  kind: string,
  id: string,
  input: Row,
) {
  return mutation(ctx, perm(kind, "update"), async (tx, ctx) => {
    const old = await locked(tx, ctx, kind, id, true, true);
    invariant(
      old.version === input.version,
      409,
      "VERSION_CONFLICT",
      "Este registro foi alterado por outra pessoa. Atualize a página antes de salvar.",
    );
    const before = await item(tx, ctx, kind, id);
    await validate(tx, ctx, input);
    const data: Row = {};
    for (const key of kind === "deals" ? dealFields : workFields)
      if (input[key] !== undefined) data[key] = input[key];
    if (kind === "deals") {
      const moving =
        (input.stageId && input.stageId !== old.stage_id) ||
        (input.pipelineId && input.pipelineId !== old.pipeline_id);
      if (moving) {
        invariant(
          old.status === "OPEN" || input.status === "OPEN",
          409,
          "CLOSED_DEAL",
          "Reabra a oportunidade antes de mover a etapa.",
        );
        const stage = await targetStage(
          tx,
          ctx,
          input.pipelineId ?? old.pipeline_id,
          input.stageId ?? old.stage_id,
        );
        if (stage.requireActivity)
          invariant(
            await one(
              tx,
              sql`SELECT id FROM sales_work WHERE tenant_id=${ctx.tenantId} AND deal_id=${id} AND deleted_at IS NULL AND status IN ('PLANNED','TODO','IN_PROGRESS') AND coalesce(scheduled_at,due_at)>=now() LIMIT 1`,
            ),
            409,
            "ACTIVITY_REQUIRED",
            "Esta etapa exige uma próxima atividade. Agende uma antes de mover.",
          );
        data.stageEnteredAt = new Date();
        data.probability = input.probability ?? stage.probability;
      }
      const status = input.status ?? old.status;
      if (status !== old.status) {
        data.wonAt = status === "WON" ? new Date() : null;
        data.lostAt = status === "LOST" ? new Date() : null;
        if (status !== "LOST") data.lostReason = null;
      }
    } else if (input.status) {
      data.completedAt = ["DONE", "COMPLETED"].includes(input.status)
        ? (old.completed_at ?? new Date())
        : null;
    }
    const assignments = Object.keys(data).map((k) =>
      k === "checklist"
        ? sql`${sql.identifier(column(k))}=${json(data[k])}::jsonb`
        : sql`${sql.identifier(column(k))}=${data[k]}`,
    );
    await tx.execute(
      sql`UPDATE ${sql.identifier(table(kind))} SET ${assignments.length ? sql`${sql.join(assignments, sql`,`)},` : sql``}version=version+1,updated_at=now() WHERE tenant_id=${ctx.tenantId} AND id=${id}`,
    );
    if (input.tagIds) await tags(tx, ctx, kind, id, input.tagIds);
    const after = await item(tx, ctx, kind, id);
    const diff = changes(before, after, [
      ...(kind === "deals" ? dealFields : workFields),
      "tags",
    ]);
    const eventType =
      kind === "deals" && before.stageId !== after.stageId
        ? "stage.changed"
        : before.status !== after.status
          ? `status.${after.status.toLowerCase()}`
          : "updated";
    await event(
      tx,
      ctx,
      kind,
      id,
      eventType,
      { title: after.title, changes: diff },
      before,
      after,
    );
    await fanout(
      tx,
      ctx,
      after,
      `${kind === "deals" ? "deal" : kind === "tasks" ? "task" : "activity"}.${eventType}`,
      {
        dealId: kind === "deals" ? id : after.dealId,
        workId: kind === "deals" ? null : id,
        title: after.title,
        changes: diff,
      },
    );
    if (kind === "activities") await followup(tx, ctx, after, input.followUpAt);
    return { item: after };
  });
}
async function followup(
  tx: Executor,
  ctx: Context,
  activity: Row,
  at?: string | null,
) {
  if (activity.status === "COMPLETED" && activity.leadId)
    await tx.execute(
      sql`UPDATE crm_records SET last_contact_at=greatest(coalesce(last_contact_at,'-infinity'::timestamptz),${activity.completedAt}::timestamptz),updated_at=now(),version=version+1 WHERE tenant_id=${ctx.tenantId} AND id=${activity.leadId} AND deleted_at IS NULL`,
    );
  if (!at) return;
  invariant(
    activity.status === "COMPLETED",
    400,
    "FOLLOWUP_REQUIRES_COMPLETION",
    "Conclua a atividade para criar o follow-up.",
  );
  invariant(
    new Date(at) > new Date(),
    400,
    "FOLLOWUP_IN_PAST",
    "Escolha um prazo futuro para o follow-up.",
  );
  const exists = await one(
    tx,
    sql`SELECT id FROM sales_work WHERE tenant_id=${ctx.tenantId} AND source_activity_id=${activity.id}`,
  );
  if (exists) return;
  authorize(ctx, "tasks.create");
  await insertWork(tx, ctx, "tasks", {
    title: `Follow-up: ${activity.title}`.slice(0, 200),
    assignedTo: activity.assignedTo ?? ctx.userId,
    contactId: activity.contactId,
    companyId: activity.companyId,
    leadId: activity.leadId,
    dealId: activity.dealId,
    dueAt: at,
    priority: "MEDIUM",
    status: "TODO",
    checklist: [],
    sourceActivityId: activity.id,
  });
  if (activity.leadId)
    await tx.execute(
      sql`UPDATE crm_records SET next_contact_at=${at},updated_at=now(),version=version+1 WHERE tenant_id=${ctx.tenantId} AND id=${activity.leadId} AND deleted_at IS NULL`,
    );
}
export async function insertWork(
  tx: Executor,
  ctx: Context,
  kind: WorkKind,
  input: Row,
  fixtureId?: string,
) {
  await validate(tx, ctx, input);
  const data: Row = {
    ...input,
    kind,
    createdBy: ctx.userId,
    completedAt: ["DONE", "COMPLETED"].includes(input.status)
      ? new Date()
      : null,
  };
  delete data.tagIds;
  delete data.followUpAt;
  const fields = Object.keys(data).filter((k) => data[k] !== undefined);
  const id = fixtureId ?? randomUUID();
  await tx.execute(
    sql`INSERT INTO sales_work(id,tenant_id,${sql.join(
      fields.map((k) => sql.identifier(column(k))),
      sql`,`,
    )}) VALUES(${id},${ctx.tenantId},${sql.join(
      fields.map((k) =>
        k === "checklist" ? sql`${json(data[k])}::jsonb` : sql`${data[k]}`,
      ),
      sql`,`,
    )})`,
  );
  if (input.tagIds) await tags(tx, ctx, kind, id, input.tagIds);
  const result = await item(tx, ctx, kind, id);
  await event(
    tx,
    ctx,
    kind,
    id,
    "created",
    { title: result.title },
    null,
    result,
  );
  await fanout(
    tx,
    ctx,
    result,
    `${kind === "tasks" ? "task" : "activity"}.created`,
    {
      workId: id,
      title: result.title,
      scheduledAt: result.scheduledAt ?? result.dueAt,
    },
  );
  return result;
}
export async function createWork(ctx: Context, kind: WorkKind, input: Row) {
  return mutation(ctx, perm(kind, "create"), async (tx, ctx) => {
    const result = await insertWork(tx, ctx, kind, input);
    if (kind === "activities")
      await followup(tx, ctx, result, input.followUpAt);
    return { item: result };
  });
}
export async function remove(ctx: Context, kind: string, id: string) {
  return mutation(ctx, perm(kind, "delete"), async (tx, ctx) => {
    const row = await locked(tx, ctx, kind, id, true);
    if (row.deleted_at) return;
    const before = await item(tx, ctx, kind, id);
    await tx.execute(
      sql`UPDATE ${sql.identifier(table(kind))} SET deleted_at=now(),updated_at=now(),version=version+1 WHERE tenant_id=${ctx.tenantId} AND id=${id}`,
    );
    await event(
      tx,
      ctx,
      kind,
      id,
      "deleted",
      { title: before.title },
      before,
      await item(tx, ctx, kind, id),
    );
    await fanout(
      tx,
      ctx,
      before,
      `${kind === "deals" ? "deal" : kind === "tasks" ? "task" : "activity"}.deleted`,
      {
        title: before.title,
        dealId: kind === "deals" ? id : before.dealId,
        workId: kind === "deals" ? null : id,
      },
    );
  });
}
export async function restore(ctx: Context, kind: string, id: string) {
  return mutation(ctx, perm(kind, "delete"), async (tx, ctx) => {
    const row = await locked(tx, ctx, kind, id, true);
    invariant(
      row.deleted_at,
      409,
      "NOT_DELETED",
      "Este registro não está na lixeira.",
    );
    const before = await item(tx, ctx, kind, id);
    await tx.execute(
      sql`UPDATE ${sql.identifier(table(kind))} SET deleted_at=NULL,updated_at=now(),version=version+1 WHERE tenant_id=${ctx.tenantId} AND id=${id}`,
    );
    const result = await item(tx, ctx, kind, id);
    await event(
      tx,
      ctx,
      kind,
      id,
      "restored",
      { title: result.title },
      before,
      result,
    );
    return { item: result };
  });
}
export async function timeline(ctx: Context, id: string, q: Row) {
  return crmTransaction(ctx, "deals.view", async (tx, ctx) => {
    await locked(tx, ctx, "deals", id);
    const total = (await one(
      tx,
      sql`SELECT count(*)::int AS total FROM sales_events WHERE tenant_id=${ctx.tenantId} AND deal_id=${id}`,
    ))!.total;
    const events = await rows(
      tx,
      sql`SELECT e.id,e.type,e.metadata,e.created_at,u.name AS actor_name FROM sales_events e JOIN users u ON u.id=e.actor_id WHERE e.tenant_id=${ctx.tenantId} AND e.deal_id=${id} ORDER BY e.created_at DESC,e.id DESC LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`,
    );
    return {
      items: events.map(camel),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  });
}
export async function notes(ctx: Context, id: string) {
  return crmTransaction(ctx, "deals.view", async (tx, ctx) => {
    await locked(tx, ctx, "deals", id);
    const items = await rows(
      tx,
      sql`SELECT n.*,u.name AS author_name,coalesce((SELECT jsonb_agg(m.user_id) FROM sales_note_mentions m WHERE m.tenant_id=n.tenant_id AND m.note_id=n.id),'[]'::jsonb) AS mention_ids FROM sales_notes n JOIN users u ON u.id=n.author_id WHERE n.tenant_id=${ctx.tenantId} AND n.deal_id=${id} ORDER BY n.pinned DESC,n.created_at DESC,n.id`,
    );
    return { items: items.map(dto) };
  });
}
export async function saveNote(
  ctx: Context,
  dealId: string,
  input: Row,
  noteId?: string,
) {
  return mutation(ctx, "deals.update", async (tx, ctx) => {
    await locked(tx, ctx, "deals", dealId, false, true);
    let before: Row | undefined;
    if (noteId) {
      before = await one(
        tx,
        sql`SELECT * FROM sales_notes WHERE tenant_id=${ctx.tenantId} AND deal_id=${dealId} AND id=${noteId} FOR UPDATE`,
      );
      invariant(before, 404, "NOT_FOUND", "Nota não encontrada.");
    }
    for (const id of input.mentionIds ?? []) await member(tx, ctx, id);
    const id = noteId ?? randomUUID();
    if (before)
      await tx.execute(
        sql`UPDATE sales_notes SET body=${input.body ?? before.body},pinned=${input.pinned ?? before.pinned},updated_at=now() WHERE tenant_id=${ctx.tenantId} AND id=${id}`,
      );
    else
      await tx.execute(
        sql`INSERT INTO sales_notes(id,tenant_id,deal_id,author_id,body,pinned) VALUES(${id},${ctx.tenantId},${dealId},${ctx.userId},${input.body},${input.pinned ?? false})`,
      );
    if (input.mentionIds) {
      await tx.execute(
        sql`DELETE FROM sales_note_mentions WHERE tenant_id=${ctx.tenantId} AND note_id=${id}`,
      );
      for (const userId of input.mentionIds)
        await tx.execute(
          sql`INSERT INTO sales_note_mentions(tenant_id,note_id,user_id) VALUES(${ctx.tenantId},${id},${userId})`,
        );
    }
    const after = await one(
      tx,
      sql`SELECT n.*,u.name AS author_name,coalesce((SELECT jsonb_agg(m.user_id) FROM sales_note_mentions m WHERE m.tenant_id=n.tenant_id AND m.note_id=n.id),'[]'::jsonb) AS mention_ids FROM sales_notes n JOIN users u ON u.id=n.author_id WHERE n.tenant_id=${ctx.tenantId} AND n.id=${id}`,
    );
    await event(
      tx,
      ctx,
      "deals",
      dealId,
      before ? "note.updated" : "note.created",
      { noteId: id, bodyPreview: after!.body.slice(0, 160) },
      before ?? null,
      after,
    );
    return { item: dto(after!) };
  });
}
export async function deleteNote(ctx: Context, dealId: string, id: string) {
  return mutation(ctx, "deals.update", async (tx, ctx) => {
    await locked(tx, ctx, "deals", dealId, false, true);
    const before = await one(
      tx,
      sql`SELECT * FROM sales_notes WHERE tenant_id=${ctx.tenantId} AND deal_id=${dealId} AND id=${id} FOR UPDATE`,
    );
    invariant(before, 404, "NOT_FOUND", "Nota não encontrada.");
    await tx.execute(
      sql`DELETE FROM sales_notes WHERE tenant_id=${ctx.tenantId} AND id=${id}`,
    );
    await event(
      tx,
      ctx,
      "deals",
      dealId,
      "note.deleted",
      { noteId: id },
      before,
      null,
    );
  });
}
export async function convert(ctx: Context, id: string, input: Row) {
  authorize(ctx, "deals.create");
  return convertCrm(ctx, id, input, async (tx, fresh, result) => {
    authorize(fresh, "deals.create");
    const lead = await one(
      tx,
      sql`SELECT converted_deal_id FROM crm_records WHERE tenant_id=${ctx.tenantId} AND id=${id}`,
    );
    if (lead!.converted_deal_id) {
      await locked(tx, fresh, "deals", lead!.converted_deal_id, false, true);
      return {
        ...result,
        deal: await item(tx, fresh, "deals", lead!.converted_deal_id),
      };
    }
    const tenant = await one(
      tx,
      sql`SELECT currency FROM tenants WHERE id=${ctx.tenantId}`,
    );
    const deal = await createDealInTransaction(tx, fresh, {
      ...input.opportunity,
      contactId: result.contact.id,
      companyId: result.company?.id ?? null,
      leadId: id,
      assignedTo: result.lead.assignedTo,
      source: result.lead.source,
      temperature: result.lead.temperature,
      value: input.opportunity.value ?? result.lead.estimatedValue ?? "0",
      currency: input.opportunity.currency ?? tenant!.currency,
      tagIds: result.lead.tags.map((t: Row) => t.id),
    });
    await tx.execute(
      sql`UPDATE crm_records SET converted_deal_id=${deal.id},version=version+1,updated_at=now() WHERE tenant_id=${ctx.tenantId} AND id=${id}`,
    );
    return {
      ...result,
      lead: {
        ...result.lead,
        convertedDealId: deal.id,
        version: result.lead.version + 1,
      },
      deal,
    };
  });
}
