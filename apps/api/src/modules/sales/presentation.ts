import { sql } from "drizzle-orm";
import { z } from "zod";
import {
  audit,
  camel,
  one,
  rows,
  type Executor,
  type Row,
} from "../../infrastructure/database.js";
import { invariant } from "../../shared/errors.js";
import { config } from "../../shared/config.js";
import { type Context, authorize } from "../iam/application/sessions.js";
import { hasPermission } from "../iam/domain/permissions.js";
import { crmTransaction } from "../crm/tenant.js";
import { money } from "./schemas.js";

export const productInput = z
  .object({
    name: z.string().trim().min(1).max(200),
    price: money,
    currency: z.string().regex(/^[A-Z]{3}$/),
    version: z.number().int().positive().optional(),
  })
  .strict();
export const proposalInput = z
  .object({
    items: z
      .array(
        z
          .object({
            productId: z.uuid().nullable().optional(),
            name: z.string().trim().min(1).max(200),
            quantity: z.number().int().min(1).max(100000),
            unitPrice: money,
          })
          .strict(),
      )
      .min(1)
      .max(30),
    discount: money.default("0"),
    version: z.number().int().min(0),
  })
  .strict();
export function cents(value: string) {
  const [whole, part = ""] = value.split(".");
  return BigInt(whole!) * 100n + BigInt(part.padEnd(2, "0"));
}
export function decimal(value: bigint) {
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}
export function proposalTotal(
  items: { quantity: number; unitPrice: string }[],
  discount: string,
) {
  const subtotal = items.reduce(
    (n, i) => n + BigInt(i.quantity) * cents(i.unitPrice),
    0n,
  );
  const off = cents(discount);
  invariant(
    off <= subtotal,
    400,
    "INVALID_DISCOUNT",
    "O desconto não pode superar o subtotal.",
  );
  invariant(
    subtotal - off <= 9999999999999999n,
    400,
    "VALUE_TOO_LARGE",
    "O total ultrapassa o limite permitido.",
  );
  return decimal(subtotal - off);
}
async function deal(tx: Executor, ctx: Context, id: string, write = false) {
  const d = await one(
    tx,
    sql`SELECT * FROM sales_deals WHERE tenant_id=${ctx.tenantId} AND id=${id} AND deleted_at IS NULL ${write ? sql`FOR UPDATE` : sql`FOR SHARE`}`,
  );
  invariant(d, 404, "NOT_FOUND", "Negócio não encontrado.");
  return d;
}
export async function proposal(ctx: Context, id: string) {
  return crmTransaction(ctx, "deals.view", async (tx, ctx) => {
    await deal(tx, ctx, id);
    const p = await one(
      tx,
      sql`SELECT * FROM sales_proposals WHERE tenant_id=${ctx.tenantId} AND deal_id=${id}`,
    );
    return { item: p ? camel(p) : null };
  });
}
export async function saveProposal(
  ctx: Context,
  id: string,
  input: z.infer<typeof proposalInput>,
) {
  return crmTransaction(ctx, "deals.update", async (tx, ctx) => {
    const d = await deal(tx, ctx, id, true);
    invariant(
      d.status === "OPEN",
      409,
      "CLOSED_DEAL",
      "Reabra o negócio antes de alterar a proposta.",
    );
    const old = await one(
      tx,
      sql`SELECT * FROM sales_proposals WHERE tenant_id=${ctx.tenantId} AND deal_id=${id}`,
    );
    invariant(
      (old?.version ?? 0) === input.version,
      409,
      "VERSION_CONFLICT",
      "A proposta mudou. Recarregue antes de salvar.",
    );
    for (const item of input.items)
      if (item.productId)
        invariant(
          await one(
            tx,
            sql`SELECT id FROM sales_products WHERE tenant_id=${ctx.tenantId} AND id=${item.productId} AND currency=${d.currency}`,
          ),
          404,
          "NOT_FOUND",
          "Produto não encontrado nesta moeda.",
        );
    const client = await one(
      tx,
      sql`SELECT name FROM crm_records WHERE tenant_id=${ctx.tenantId} AND id=coalesce(${d.company_id}::uuid,${d.contact_id}::uuid,${d.lead_id}::uuid) AND deleted_at IS NULL`,
    );
    const total = proposalTotal(input.items, input.discount);
    const saved = await one(
      tx,
      sql`INSERT INTO sales_proposals(tenant_id,deal_id,client_name,items,discount,total,currency) VALUES(${ctx.tenantId},${id},${client?.name ?? "Cliente não informado"},${JSON.stringify(input.items)}::jsonb,${input.discount},${total},${d.currency}) ON CONFLICT(tenant_id,deal_id) DO UPDATE SET client_name=excluded.client_name,items=excluded.items,discount=excluded.discount,total=excluded.total,currency=excluded.currency,version=sales_proposals.version+1,updated_at=now() RETURNING *`,
    );
    // The deal and proposal always use the same explicit final value after saving.
    await tx.execute(
      sql`UPDATE sales_deals SET value=${total},updated_at=now(),version=version+1 WHERE tenant_id=${ctx.tenantId} AND id=${id}`,
    );
    await tx.execute(
      sql`INSERT INTO sales_events(tenant_id,deal_id,actor_id,type,metadata) VALUES(${ctx.tenantId},${id},${ctx.userId},'proposal.saved',${JSON.stringify({ total, currency: d.currency })}::jsonb)`,
    );
    await audit(tx, ctx, "proposal.saved", id, old, saved);
    return { item: camel(saved!) };
  });
}
export async function products(ctx: Context) {
  return crmTransaction(ctx, "deals.view", async (tx) => ({
    items: (
      await rows(
        tx,
        sql`SELECT * FROM sales_products WHERE tenant_id=${ctx.tenantId} ORDER BY name,id`,
      )
    ).map(camel),
  }));
}
export async function saveProduct(
  ctx: Context,
  input: z.infer<typeof productInput>,
  id?: string,
) {
  return crmTransaction(ctx, "pipelines.manage", async (tx, ctx) => {
    const p = id
      ? await one(
          tx,
          sql`UPDATE sales_products SET name=${input.name},price=${input.price},currency=${input.currency},version=version+1 WHERE tenant_id=${ctx.tenantId} AND id=${id} AND version=${input.version ?? 0} RETURNING *`,
        )
      : await one(
          tx,
          sql`INSERT INTO sales_products(tenant_id,name,price,currency) VALUES(${ctx.tenantId},${input.name},${input.price},${input.currency}) RETURNING *`,
        );
    invariant(
      p,
      409,
      "VERSION_CONFLICT",
      "Produto alterado ou indisponível. Recarregue o catálogo.",
    );
    await audit(tx, ctx, "product.saved", p.id, null, p);
    return { item: camel(p) };
  });
}
export async function dashboard(ctx: Context, pipelineId?: string) {
  return crmTransaction(ctx, "deals.view", async (tx, ctx) => {
    const filter = pipelineId ? sql` AND d.pipeline_id=${pipelineId}` : sql``;
    const workFilter = pipelineId
      ? sql` AND EXISTS(SELECT 1 FROM sales_deals d WHERE d.tenant_id=w.tenant_id AND d.id=w.deal_id AND d.pipeline_id=${pipelineId} AND d.deleted_at IS NULL)`
      : sql``;
    const totals = await rows(
      tx,
      sql`SELECT currency,coalesce(sum(value) FILTER(WHERE status='OPEN'),0)::text AS open_value,coalesce(sum(value) FILTER(WHERE status='WON'),0)::text AS won_value,count(*) FILTER(WHERE status='WON')::int AS won_count,count(*) FILTER(WHERE status='OPEN')::int AS open_count FROM sales_deals d WHERE d.tenant_id=${ctx.tenantId} AND d.deleted_at IS NULL ${filter} GROUP BY currency ORDER BY currency`,
    );
    const noAction = sql`NOT EXISTS(SELECT 1 FROM sales_work w WHERE w.tenant_id=d.tenant_id AND w.deal_id=d.id AND w.deleted_at IS NULL AND w.status IN ('TODO','IN_PROGRESS','PLANNED') AND coalesce(w.due_at,w.scheduled_at)>=now())`;
    const counts = await one(
      tx,
      sql`SELECT count(*) FILTER(WHERE ${noAction})::int AS no_action_count FROM sales_deals d WHERE d.tenant_id=${ctx.tenantId} AND d.deleted_at IS NULL AND d.status='OPEN' ${filter}`,
    );
    const deals = await rows(
      tx,
      sql`SELECT d.id,d.title,d.value::text,d.currency,s.name AS stage_name,coalesce(c.name,ct.name,l.name,'Cliente não informado') AS client_name,u.name AS owner_name,${noAction} AS no_action,floor(extract(epoch FROM now()-d.stage_entered_at)/86400)::int AS days_in_stage,s.stale_days FROM sales_deals d JOIN sales_stages s ON s.tenant_id=d.tenant_id AND s.id=d.stage_id LEFT JOIN crm_records c ON c.tenant_id=d.tenant_id AND c.id=d.company_id LEFT JOIN crm_records ct ON ct.tenant_id=d.tenant_id AND ct.id=d.contact_id LEFT JOIN crm_records l ON l.tenant_id=d.tenant_id AND l.id=d.lead_id LEFT JOIN users u ON u.id=d.assigned_to WHERE d.tenant_id=${ctx.tenantId} AND d.deleted_at IS NULL AND d.status='OPEN' ${filter} AND (${noAction} OR d.stage_entered_at<now()-s.stale_days*interval '1 day') ORDER BY d.stage_entered_at,d.id LIMIT 20`,
    );
    const canTasks = hasPermission(ctx.role, "tasks.view");
    const overdue = canTasks
      ? (await one(
          tx,
          sql`SELECT count(*)::int AS total FROM sales_work w WHERE w.tenant_id=${ctx.tenantId} AND w.kind='tasks' AND w.deleted_at IS NULL AND w.status IN ('TODO','IN_PROGRESS') AND w.due_at<now() ${workFilter}`,
        ))!.total
      : null;
    const tasks = canTasks
      ? await rows(
          tx,
          sql`SELECT w.id,w.title,w.due_at,w.deal_id,d.title AS deal_title FROM sales_work w LEFT JOIN sales_deals d ON d.tenant_id=w.tenant_id AND d.id=w.deal_id AND d.deleted_at IS NULL WHERE w.tenant_id=${ctx.tenantId} AND w.kind='tasks' AND w.deleted_at IS NULL AND w.status IN ('TODO','IN_PROGRESS') AND w.due_at<now() ${workFilter} ORDER BY w.due_at,w.id LIMIT 10`,
        )
      : [];
    return {
      totals: totals.map(camel),
      noActionCount: counts!.no_action_count,
      overdueCount: overdue,
      deals: deals.map(camel),
      tasks: tasks.map(camel),
    };
  });
}
export async function demoAutomation(
  ctx: Context,
  id: string,
  enabled?: boolean,
) {
  return crmTransaction(ctx, "pipelines.manage", async (tx, ctx) => {
    const p = await one(
      tx,
      sql`SELECT * FROM sales_pipelines WHERE tenant_id=${ctx.tenantId} AND id=${id} FOR UPDATE`,
    );
    invariant(p, 404, "NOT_FOUND", "Funil não encontrado.");
    invariant(
      config.NODE_ENV !== "production" && p.demo_fixture,
      409,
      "DEMO_ONLY",
      "Esta ação funciona apenas no funil de apresentação fora de produção.",
    );
    if (enabled !== undefined)
      await tx.execute(
        sql`UPDATE sales_pipelines SET demo_followup_enabled=${enabled},version=version+1,updated_at=now() WHERE tenant_id=${ctx.tenantId} AND id=${id}`,
      );
    const executions = await rows(
      tx,
      sql`SELECT e.*,d.title AS deal_title,w.title AS task_title FROM sales_demo_executions e JOIN sales_deals d ON d.tenant_id=e.tenant_id AND d.id=e.deal_id JOIN sales_work w ON w.tenant_id=e.tenant_id AND w.id=e.task_id WHERE e.tenant_id=${ctx.tenantId} AND d.pipeline_id=${id} ORDER BY e.created_at DESC LIMIT 10`,
    );
    return {
      enabled: enabled ?? p.demo_followup_enabled,
      executions: executions.map(camel),
    };
  });
}
export async function maybeDemoFollowup(
  tx: Executor,
  ctx: Context,
  before: Row,
  after: Row,
  insert: (
    tx: Executor,
    ctx: Context,
    kind: "tasks",
    input: Row,
  ) => Promise<Row>,
) {
  if (
    config.NODE_ENV === "production" ||
    before.stageId === after.stageId ||
    after.status !== "OPEN"
  )
    return;
  const p = await one(
    tx,
    sql`SELECT demo_fixture,demo_followup_enabled FROM sales_pipelines WHERE tenant_id=${ctx.tenantId} AND id=${after.pipelineId}`,
  );
  if (
    !p?.demo_fixture ||
    !p.demo_followup_enabled ||
    after.stageName !== "Proposta"
  )
    return;
  authorize(ctx, "tasks.create");
  if (
    await one(
      tx,
      sql`SELECT task_id FROM sales_demo_executions WHERE tenant_id=${ctx.tenantId} AND deal_id=${after.id}`,
    )
  )
    return;
  const task = await insert(tx, ctx, "tasks", {
    title: `Acompanhar proposta · ${after.title}`.slice(0, 200),
    description:
      "Tarefa real criada pela automação do funil de demonstração. Nenhum email ou WhatsApp foi enviado.",
    assignedTo: after.assignedTo ?? ctx.userId,
    dealId: after.id,
    companyId: after.companyId,
    contactId: after.contactId,
    leadId: after.leadId,
    dueAt: new Date(Date.now() + 86400000).toISOString(),
    priority: "MEDIUM",
    status: "TODO",
    checklist: [],
  });
  await tx.execute(
    sql`INSERT INTO sales_demo_executions(tenant_id,deal_id,task_id) VALUES(${ctx.tenantId},${after.id},${task.id})`,
  );
}
