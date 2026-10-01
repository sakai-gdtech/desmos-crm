import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { pool, one, audit } from "./database.js";
import { config } from "../shared/config.js";
import { withCrmTenant } from "../modules/crm/tenant.js";
import {
  createDealInTransaction,
  insertWork,
} from "../modules/sales/service.js";
import type { Context } from "../modules/iam/application/sessions.js";
export const presentationTenant = "11111111-1111-4111-8111-111111111111";
export function fixtureId(key: string) {
  const h = createHash("sha256")
    .update(`desmos-presentation:${key}`)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export async function presentationDemo(reset = false) {
  if (config.NODE_ENV === "production")
    throw new Error("Demonstração recusada em produção.");
  return withCrmTenant(presentationTenant, async (tx) => {
    const owner = await one(
      tx,
      sql`SELECT m.*,u.name FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=${presentationTenant} AND u.email='ana@nexa.com' AND m.status='ACTIVE' AND m.role='OWNER'`,
    );
    if (!owner)
      throw new Error("Execute db:seed antes de preparar a apresentação.");
    const ctx: Context = {
      tenantId: presentationTenant,
      userId: owner.user_id,
      membershipId: owner.id,
      role: "OWNER",
      sessionId: fixtureId("session"),
      requestId: "presentation-demo",
    };
    const pipelineId = fixtureId("pipeline");
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`crm-tags:${presentationTenant}`},0))`,
    );
    const inserted = await one(
      tx,
      sql`INSERT INTO sales_pipelines(id,tenant_id,name,description,demo_fixture,demo_followup_enabled) VALUES(${pipelineId},${presentationTenant},'Apresentação Desmos','Dados fictícios para o roteiro de apresentação.',true,true) ON CONFLICT(id) DO NOTHING RETURNING id`,
    );
    if (!inserted && !reset) return { pipelineId };
    if (reset) {
      // Only the dedicated fixture pipeline is restored. Other pipelines/tenants remain intact.
      await tx.execute(
        sql`DELETE FROM sales_demo_executions WHERE tenant_id=${presentationTenant} AND deal_id IN(SELECT id FROM sales_deals WHERE tenant_id=${presentationTenant} AND pipeline_id=${pipelineId})`,
      );
      await tx.execute(
        sql`DELETE FROM sales_proposals WHERE tenant_id=${presentationTenant} AND deal_id IN(SELECT id FROM sales_deals WHERE tenant_id=${presentationTenant} AND pipeline_id=${pipelineId})`,
      );
      await tx.execute(
        sql`UPDATE sales_work SET deleted_at=now(),updated_at=now(),version=version+1 WHERE tenant_id=${presentationTenant} AND deal_id IN(SELECT id FROM sales_deals WHERE tenant_id=${presentationTenant} AND pipeline_id=${pipelineId}) AND deleted_at IS NULL`,
      );
      await tx.execute(
        sql`UPDATE sales_pipelines SET active=true,demo_followup_enabled=true,version=version+1 WHERE tenant_id=${presentationTenant} AND id=${pipelineId}`,
      );
    }
    const stageNames = [
      "Novo lead",
      "Qualificação",
      "Reunião",
      "Proposta",
      "Negociação",
      "Fechamento",
    ];
    for (const [i, name] of stageNames.entries())
      await tx.execute(
        sql`INSERT INTO sales_stages(id,tenant_id,pipeline_id,name,position,probability,color,stale_days) VALUES(${fixtureId("stage-" + i)},${presentationTenant},${pipelineId},${name},${i},${[10, 20, 35, 55, 75, 90][i]},${["#173b68", "#0e7490", "#217550", "#8a5b16", "#b63b44", "#646d80"][i]},7) ON CONFLICT(id) DO UPDATE SET name=excluded.name,position=excluded.position,probability=excluded.probability,stale_days=7,require_activity=false`,
      );
    await tx.execute(
      sql`UPDATE sales_pipelines SET demo_followup_stage_id=${fixtureId("stage-3")} WHERE tenant_id=${presentationTenant} AND id=${pipelineId}`,
    );
    const fixtures = [
      {
        key: "aurora",
        company: "Aurora Digital",
        contact: "Marina Costa",
        title: "Implantação comercial · Aurora Digital",
        value: "25000.00",
        stage: 2,
        days: 2,
      },
      {
        key: "atlas",
        company: "Atlas Logística",
        contact: "Rafael Lima",
        title: "Consultoria comercial · Atlas Logística",
        value: "12000.00",
        stage: 1,
        days: 12,
      },
      {
        key: "vertice",
        company: "Vértice Saúde",
        contact: "Clara Mendes",
        title: "Expansão de atendimento · Vértice Saúde",
        value: "18000.00",
        stage: 5,
        days: 1,
      },
    ];
    for (const f of fixtures) {
      const companyId = fixtureId("company-" + f.key),
        contactId = fixtureId("contact-" + f.key),
        id = fixtureId("deal-" + f.key);
      await tx.execute(
        sql`INSERT INTO crm_records(id,tenant_id,kind,name,assigned_to,description) VALUES(${companyId},${presentationTenant},'companies',${f.company},${ctx.userId},'Empresa fictícia do roteiro de apresentação.') ON CONFLICT(id) DO NOTHING`,
      );
      await tx.execute(
        sql`INSERT INTO crm_records(id,tenant_id,kind,name,email,job_title,company_id,assigned_to) VALUES(${contactId},${presentationTenant},'contacts',${f.contact},${f.key + "@cliente.example"},'Diretoria comercial',${companyId},${ctx.userId}) ON CONFLICT(id) DO NOTHING`,
      );
      const exists = await one(
        tx,
        sql`SELECT id FROM sales_deals WHERE tenant_id=${presentationTenant} AND id=${id}`,
      );
      if (!exists)
        await createDealInTransaction(
          tx,
          ctx,
          {
            title: f.title,
            pipelineId,
            stageId: fixtureId("stage-" + f.stage),
            companyId,
            contactId,
            value: f.value,
            currency: "BRL",
            assignedTo: ctx.userId,
            temperature: f.key === "vertice" ? "HOT" : "WARM",
            source: "Demonstração",
            description: "Negociação fictícia para apresentar o Desmos.",
            probability: [10, 20, 35, 55, 75, 90][f.stage],
          },
          id,
        );
      await tx.execute(
        sql`UPDATE sales_deals SET title=${f.title},value=${f.value},currency='BRL',stage_id=${fixtureId("stage-" + f.stage)},probability=${[10, 20, 35, 55, 75, 90][f.stage]},stage_entered_at=now()-${f.days}*interval '1 day',status='OPEN',won_at=null,lost_at=null,lost_reason=null,deleted_at=null,updated_at=now(),version=version+1 WHERE tenant_id=${presentationTenant} AND id=${id}`,
      );
      await tx.execute(
        sql`DELETE FROM sales_events WHERE tenant_id=${presentationTenant} AND deal_id=${id}`,
      );
      await tx.execute(
        sql`INSERT INTO sales_events(tenant_id,deal_id,actor_id,type,metadata) VALUES(${presentationTenant},${id},${ctx.userId},'created',${JSON.stringify({ title: f.title, stageName: stageNames[f.stage], demo: true })}::jsonb)`,
      );
      if (f.key !== "aurora") {
        const taskId = fixtureId("task-" + f.key);
        const dueAt = new Date(
          Date.now() + (f.key === "atlas" ? -86400000 : 86400000),
        ).toISOString();
        const existing = await one(
          tx,
          sql`SELECT id FROM sales_work WHERE tenant_id=${presentationTenant} AND id=${taskId}`,
        );
        if (!existing)
          await insertWork(
            tx,
            ctx,
            "tasks",
            {
              title:
                f.key === "atlas"
                  ? "Retomar contato com Rafael"
                  : "Confirmar fechamento com Clara",
              dealId: id,
              companyId,
              contactId,
              assignedTo: ctx.userId,
              dueAt,
              priority: "HIGH",
              status: "TODO",
              checklist: [],
            },
            taskId,
          );
        else
          await tx.execute(
            sql`UPDATE sales_work SET status='TODO',completed_at=null,due_at=${dueAt},deleted_at=null,updated_at=now(),version=version+1 WHERE tenant_id=${presentationTenant} AND id=${taskId}`,
          );
      }
    }
    for (const [key, name, price] of [
      ["implantacao", "Implantação comercial", "20000.00"],
      ["treinamento", "Treinamento da equipe", "5000.00"],
    ])
      await tx.execute(
        sql`INSERT INTO sales_products(id,tenant_id,name,price,currency) VALUES(${fixtureId("product-" + key)},${presentationTenant},${name},${price},'BRL') ON CONFLICT(id) DO UPDATE SET price=excluded.price,version=sales_products.version+1`,
      );
    await audit(
      tx,
      ctx,
      reset ? "demo.reset" : "demo.prepared",
      pipelineId,
      null,
      { pipelineId, fixtureCount: 3 },
    );
    return { pipelineId };
  });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    console.log(await presentationDemo(process.argv.includes("--reset")));
  } finally {
    await pool.end();
  }
}
