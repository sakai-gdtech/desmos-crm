import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  one,
  rows,
  camel,
  audit,
  type Executor,
  type Row,
} from "../../infrastructure/database.js";
import { invariant } from "../../shared/errors.js";
import type { Context } from "../iam/application/sessions.js";
import { hasPermission } from "../iam/domain/permissions.js";
import { crmTransaction, withCrmTenant } from "../crm/tenant.js";
import { insertWork } from "./service.js";
export const ruleInput = z
  .object({
    pipelineId: z.uuid(),
    stageId: z.uuid().nullable(),
    name: z.string().trim().min(1).max(100),
    trigger: z.enum(["STAGE", "INACTIVITY", "OVERDUE"]),
    days: z.number().int().min(1).max(365),
    taskTitle: z.string().trim().min(1).max(160),
    enabled: z.boolean(),
    version: z.number().int().positive().optional(),
  })
  .strict()
  .refine((v) => v.trigger !== "STAGE" || !!v.stageId, "Selecione uma etapa.");
export async function rules(ctx: Context, pipelineId: string) {
  return crmTransaction(ctx, "pipelines.manage", async (tx) => ({
    items: (
      await rows(
        tx,
        sql`SELECT r.*,(SELECT count(*)::int FROM sales_rule_runs x WHERE x.tenant_id=r.tenant_id AND x.rule_id=r.id) AS executions FROM sales_rules r WHERE tenant_id=${ctx.tenantId} AND pipeline_id=${pipelineId} ORDER BY name,id`,
      )
    ).map(camel),
    runs: (
      await rows(
        tx,
        sql`SELECT x.*,d.title AS deal_title,w.title AS task_title FROM sales_rule_runs x JOIN sales_rules r ON r.tenant_id=x.tenant_id AND r.id=x.rule_id JOIN sales_deals d ON d.tenant_id=x.tenant_id AND d.id=x.deal_id JOIN sales_work w ON w.tenant_id=x.tenant_id AND w.id=x.task_id WHERE x.tenant_id=${ctx.tenantId} AND r.pipeline_id=${pipelineId} ORDER BY x.created_at DESC LIMIT 20`,
      )
    ).map(camel),
  }));
}
export async function saveRule(
  ctx: Context,
  input: z.infer<typeof ruleInput>,
  id?: string,
) {
  return crmTransaction(ctx, "pipelines.manage", async (tx, ctx) => {
    invariant(
      hasPermission(ctx.role, "tasks.create"),
      403,
      "FORBIDDEN",
      "Seu acesso não permite criar tarefas.",
    );
    invariant(
      await one(
        tx,
        sql`SELECT id FROM sales_pipelines WHERE tenant_id=${ctx.tenantId} AND id=${input.pipelineId} AND active FOR SHARE`,
      ),
      404,
      "NOT_FOUND",
      "Funil não encontrado.",
    );
    if (input.stageId)
      invariant(
        await one(
          tx,
          sql`SELECT id FROM sales_stages WHERE tenant_id=${ctx.tenantId} AND pipeline_id=${input.pipelineId} AND id=${input.stageId} FOR SHARE`,
        ),
        400,
        "INVALID_STAGE",
        "Escolha uma etapa deste funil.",
      );
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${"sales-rules:" + ctx.tenantId},0))`,
    );
    if (!id)
      invariant(
        (await one(
          tx,
          sql`SELECT count(*)::int AS total FROM sales_rules WHERE tenant_id=${ctx.tenantId}`,
        ))!.total < 100,
        400,
        "RULE_LIMIT",
        "Limite de 100 automações.",
      );
    const old = id
      ? await one(
          tx,
          sql`SELECT * FROM sales_rules WHERE tenant_id=${ctx.tenantId} AND id=${id} FOR UPDATE`,
        )
      : null;
    if (id)
      invariant(
        old &&
          old.version === input.version &&
          old.pipeline_id === input.pipelineId,
        409,
        "VERSION_CONFLICT",
        "A regra mudou. Recarregue antes de salvar.",
      );
    const saved = id
      ? await one(
          tx,
          sql`UPDATE sales_rules SET name=${input.name},stage_id=${input.stageId},trigger=${input.trigger},days=${input.days},task_title=${input.taskTitle},enabled=${input.enabled},created_by=${ctx.userId},version=version+1 WHERE tenant_id=${ctx.tenantId} AND id=${id} RETURNING *`,
        )
      : await one(
          tx,
          sql`INSERT INTO sales_rules(tenant_id,pipeline_id,stage_id,name,trigger,days,task_title,enabled,created_by) VALUES(${ctx.tenantId},${input.pipelineId},${input.stageId},${input.name},${input.trigger},${input.days},${input.taskTitle},${input.enabled},${ctx.userId}) RETURNING *`,
        );
    await audit(tx, ctx, "automation.saved", saved!.id, old, saved);
    return { item: camel(saved!) };
  });
}
async function ruleActor(tx: Executor, tenantId: string, rule: Row) {
  const actor = await one(
    tx,
    sql`SELECT role FROM memberships WHERE tenant_id=${tenantId} AND user_id=${rule.created_by} AND status='ACTIVE' FOR SHARE`,
  );
  return actor &&
    hasPermission(actor.role, "pipelines.manage") &&
    hasPermission(actor.role, "tasks.create")
    ? ({ tenantId, userId: rule.created_by, role: actor.role } as Context)
    : null;
}
async function notify(
  tx: Executor,
  ctx: Context,
  userId: string,
  title: string,
  reason: string,
  key: string,
  workId: string | null,
  dealId: string | null,
) {
  const member = await one(
    tx,
    sql`SELECT role FROM memberships WHERE tenant_id=${ctx.tenantId} AND user_id=${userId} AND status='ACTIVE' FOR SHARE`,
  );
  if (!member || !hasPermission(member.role, "tasks.view")) return;
  await tx.execute(
    sql`INSERT INTO internal_notifications(tenant_id,user_id,title,reason,dedupe_key,work_id,deal_id) VALUES(${ctx.tenantId},${userId},${title},${reason},${key},${workId},${dealId}) ON CONFLICT(tenant_id,user_id,dedupe_key) DO NOTHING`,
  );
}
async function execute(tx: Executor, tenantId: string, rule: Row, deal: Row) {
  const actor = await ruleActor(tx, tenantId, rule);
  if (!actor) return;
  if (
    await one(
      tx,
      sql`SELECT task_id FROM sales_rule_runs WHERE tenant_id=${tenantId} AND rule_id=${rule.id} AND deal_id=${deal.id}`,
    )
  )
    return;
  const member = deal.assigned_to
    ? await one(
        tx,
        sql`SELECT role FROM memberships WHERE tenant_id=${tenantId} AND user_id=${deal.assigned_to} AND status='ACTIVE' FOR SHARE`,
      )
    : null;
  const owner =
    member && hasPermission(member.role, "tasks.view")
      ? deal.assigned_to
      : actor.userId;
  const task = await insertWork(tx, actor, "tasks", {
    title: rule.task_title,
    description: `Criada pela automação “${rule.name}”. Gatilho: ${rule.trigger}. Executa uma vez por negócio; nenhum envio externo.`,
    assignedTo: owner,
    dealId: deal.id,
    dueAt: new Date(Date.now() + rule.days * 86400000).toISOString(),
    priority: "MEDIUM",
    status: "TODO",
    checklist: [],
  });
  await tx.execute(
    sql`INSERT INTO sales_rule_runs(tenant_id,rule_id,deal_id,task_id,rule_snapshot) VALUES(${tenantId},${rule.id},${deal.id},${task.id},${JSON.stringify({ id: rule.id, version: rule.version, name: rule.name, trigger: rule.trigger, stageId: rule.stage_id, days: rule.days, taskTitle: rule.task_title, actorId: rule.created_by })}::jsonb)`,
  );
  await notify(
    tx,
    actor,
    owner,
    rule.task_title,
    `Automação: ${rule.name}`,
    "rule:" + rule.id + ":" + deal.id,
    task.id,
    deal.id,
  );
  await audit(tx, actor, "automation.executed", rule.id, null, {
    dealId: deal.id,
    taskId: task.id,
  });
}
export async function stageRules(
  tx: Executor,
  ctx: Context,
  before: Row,
  after: Row,
) {
  if (before.stageId === after.stageId || after.status !== "OPEN") return;
  const found = await rows(
    tx,
    sql`SELECT r.* FROM sales_rules r JOIN sales_pipelines p ON p.tenant_id=r.tenant_id AND p.id=r.pipeline_id AND p.active WHERE r.tenant_id=${ctx.tenantId} AND r.enabled AND r.pipeline_id=${after.pipelineId} AND r.stage_id=${after.stageId} AND r.trigger='STAGE' ORDER BY r.id FOR SHARE OF r,p`,
  );
  for (const rule of found)
    await execute(tx, ctx.tenantId, rule, {
      ...after,
      assigned_to: after.assignedTo,
      contact_id: after.contactId,
      company_id: after.companyId,
      lead_id: after.leadId,
    });
}
/** Called by a dedicated internal scheduler and explicit admin scan, never by a conversation. */
export async function scanTenant(tenantId: string, pipelineId?: string) {
  return withCrmTenant(tenantId, async (tx) => {
    const acquired = await one(
      tx,
      sql`SELECT pg_try_advisory_xact_lock(hashtextextended(${"commercial-scan:" + tenantId},0)) AS acquired`,
    );
    if (!acquired?.acquired) return;
    const found = await rows(
      tx,
      sql`SELECT r.* FROM sales_rules r JOIN sales_pipelines p ON p.tenant_id=r.tenant_id AND p.id=r.pipeline_id AND p.active WHERE r.tenant_id=${tenantId} AND r.enabled AND r.trigger<>'STAGE' ${pipelineId ? sql`AND r.pipeline_id=${pipelineId}` : sql``} ORDER BY r.id FOR SHARE OF r,p`,
    );
    for (const rule of found) {
      const deals = await rows(
        tx,
        sql`SELECT d.* FROM sales_deals d WHERE d.tenant_id=${tenantId} AND d.pipeline_id=${rule.pipeline_id} AND d.deleted_at IS NULL AND d.status='OPEN' AND NOT EXISTS(SELECT 1 FROM sales_rule_runs x WHERE x.tenant_id=d.tenant_id AND x.rule_id=${rule.id} AND x.deal_id=d.id) AND ${rule.trigger === "INACTIVITY" ? sql`d.updated_at<now()-${rule.days}*interval '1 day'` : sql`EXISTS(SELECT 1 FROM sales_work w WHERE w.tenant_id=d.tenant_id AND w.deal_id=d.id AND w.deleted_at IS NULL AND w.status IN ('TODO','IN_PROGRESS','PLANNED') AND coalesce(w.due_at,w.scheduled_at)<now())`} ORDER BY d.id LIMIT 100 FOR UPDATE OF d SKIP LOCKED`,
      );
      for (const deal of deals) await execute(tx, tenantId, rule, deal);
    }
    const work = await rows(
      tx,
      sql`SELECT w.*,m.role FROM sales_work w JOIN memberships m ON m.tenant_id=w.tenant_id AND m.user_id=w.assigned_to AND m.status='ACTIVE' WHERE w.tenant_id=${tenantId} AND w.deleted_at IS NULL AND w.status IN ('TODO','IN_PROGRESS','PLANNED') AND coalesce(w.due_at,w.scheduled_at)<=now()+interval '1 day' AND NOT EXISTS(SELECT 1 FROM internal_notifications n WHERE n.tenant_id=w.tenant_id AND n.user_id=w.assigned_to AND n.dedupe_key=(CASE WHEN coalesce(w.due_at,w.scheduled_at)<now() THEN 'overdue:' ELSE 'reminder:' END)||w.id::text||':'||to_char(coalesce(w.due_at,w.scheduled_at) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')) ${pipelineId ? sql`AND EXISTS(SELECT 1 FROM sales_deals d WHERE d.tenant_id=w.tenant_id AND d.id=w.deal_id AND d.pipeline_id=${pipelineId} AND d.deleted_at IS NULL)` : sql``} ORDER BY coalesce(w.due_at,w.scheduled_at),w.id LIMIT 500 FOR SHARE OF w SKIP LOCKED`,
    );
    for (const w of work) {
      if (
        !hasPermission(
          w.role,
          w.kind === "tasks" ? "tasks.view" : "activities.view",
        )
      )
        continue;
      const date = new Date(w.due_at ?? w.scheduled_at),
        overdue = date.getTime() < Date.now();
      const ctx = { tenantId, userId: w.assigned_to, role: w.role } as Context;
      await notify(
        tx,
        ctx,
        w.assigned_to,
        w.title,
        overdue ? "Prazo vencido" : "Lembrete: prazo nas próximas 24 horas",
        `${overdue ? "overdue" : "reminder"}:${w.id}:${date.toISOString()}`,
        w.id,
        w.deal_id,
      );
    }
  });
}
export async function scan(ctx: Context, pipelineId: string) {
  await crmTransaction(ctx, "pipelines.manage", async () => null);
  await scanTenant(ctx.tenantId, pipelineId);
  return { checked: true };
}
export async function notifications(ctx: Context) {
  return crmTransaction(ctx, "workspace.view", async (tx, ctx) => ({
    items: (
      await rows(
        tx,
        sql`SELECT n.*,w.kind AS work_kind FROM internal_notifications n LEFT JOIN sales_work w ON w.tenant_id=n.tenant_id AND w.id=n.work_id WHERE n.tenant_id=${ctx.tenantId} AND n.user_id=${ctx.userId} AND (n.work_id IS NULL OR (w.deleted_at IS NULL AND w.assigned_to=n.user_id AND w.status IN ('TODO','IN_PROGRESS','PLANNED') AND (n.dedupe_key LIKE 'rule:%' OR n.dedupe_key=(CASE WHEN coalesce(w.due_at,w.scheduled_at)<now() THEN 'overdue:' ELSE 'reminder:' END)||w.id::text||':'||to_char(coalesce(w.due_at,w.scheduled_at) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')))) ORDER BY n.created_at DESC,n.id LIMIT 100`,
      )
    )
      .filter((n) =>
        hasPermission(
          ctx.role,
          n.work_id
            ? n.work_kind === "tasks"
              ? "tasks.view"
              : "activities.view"
            : "deals.view",
        ),
      )
      .map(camel),
  }));
}
export async function readNotification(ctx: Context, id: string) {
  return crmTransaction(ctx, "workspace.view", async (tx) => {
    const item = await one(
      tx,
      sql`UPDATE internal_notifications SET read_at=now() WHERE tenant_id=${ctx.tenantId} AND user_id=${ctx.userId} AND id=${id} RETURNING id`,
    );
    invariant(item, 404, "NOT_FOUND", "Aviso não encontrado.");
    return { read: true };
  });
}
