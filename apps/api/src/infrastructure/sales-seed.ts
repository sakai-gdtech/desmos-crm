import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { one, rows, audit } from "./database.js";
import { config } from "../shared/config.js";
import { withCrmTenant } from "../modules/crm/tenant.js";
import {
  createDealInTransaction,
  insertWork,
} from "../modules/sales/service.js";
import type { Context } from "../modules/iam/application/sessions.js";
const tenantId = "11111111-1111-4111-8111-111111111111";
function demoId(key: string) {
  const h = createHash("sha256")
    .update(`desmos-demo-sales:${key}`)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
export async function seedSalesDemo() {
  if (config.NODE_ENV === "production")
    throw new Error("Demonstração recusada em produção.");
  return withCrmTenant(tenantId, async (tx) => {
    if (!(await one(tx, sql`SELECT to_regclass('sales_deals') AS name`))?.name)
      return;
    const people = await rows(
      tx,
      sql`SELECT m.user_id,m.id,u.name FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.tenant_id=${tenantId} AND m.status='ACTIVE' ORDER BY u.name`,
    );
    const owner = people.find((p) => p.name === "Ana Silva");
    if (!owner) return;
    const ctx: Context = {
      tenantId,
      userId: owner.user_id,
      membershipId: owner.id,
      role: "OWNER",
      sessionId: demoId("session"),
      requestId: "demo-sales-seed",
    };
    const pipelineId = demoId("pipeline");
    const stageNames = [
      "Novo lead",
      "Qualificação",
      "Reunião",
      "Proposta",
      "Negociação",
      "Fechamento",
    ];
    const inserted = await one(
      tx,
      sql`INSERT INTO sales_pipelines(id,tenant_id,name,description) VALUES(${pipelineId},${tenantId},'Vendas','Pipeline fictício de demonstração. Personalize conforme o processo da sua empresa.') ON CONFLICT(id) DO NOTHING RETURNING id`,
    );
    if (inserted) {
      for (const [i, name] of stageNames.entries())
        await tx.execute(
          sql`INSERT INTO sales_stages(id,tenant_id,pipeline_id,name,position,probability,color,stale_days) VALUES(${demoId("stage-" + i)},${tenantId},${pipelineId},${name},${i},${[10, 20, 35, 55, 75, 90][i]},${["#4f46e5", "#0e7490", "#217550", "#8a5b16", "#b63b44", "#646d80"][i]},7)`,
        );
      await audit(tx, ctx, "pipelines.created", pipelineId, null, {
        name: "Vendas",
        demo: true,
      });
    }
    const stages = await rows(
      tx,
      sql`SELECT id,probability FROM sales_stages WHERE tenant_id=${tenantId} AND pipeline_id=${pipelineId} ORDER BY position`,
    );
    if (!stages.length) return;
    const companies = await rows(
      tx,
      sql`SELECT id,name FROM crm_records WHERE tenant_id=${tenantId} AND kind='companies' AND deleted_at IS NULL ORDER BY name LIMIT 20`,
    );
    const tags = await rows(
      tx,
      sql`SELECT id FROM crm_tags WHERE tenant_id=${tenantId} ORDER BY name`,
    );
    for (const [i, company] of companies.entries()) {
      const id = demoId("deal-" + i);
      let deal = await one(
        tx,
        sql`SELECT * FROM sales_deals WHERE tenant_id=${tenantId} AND id=${id}`,
      );
      if (!deal) {
        const contact = await one(
          tx,
          sql`SELECT id FROM crm_records WHERE tenant_id=${tenantId} AND company_id=${company.id} AND kind='contacts' AND deleted_at IS NULL ORDER BY name LIMIT 1`,
        );
        const stage = stages[i % stages.length];
        const responsible = people[i % people.length];
        deal = await createDealInTransaction(
          tx,
          ctx,
          {
            title:
              [
                "Implantação comercial",
                "Projeto de expansão",
                "Contrato de consultoria",
                "Renovação de serviços",
              ][i % 4] + ` · ${company.name}`,
            pipelineId,
            stageId: stage.id,
            companyId: company.id,
            contactId: contact?.id ?? null,
            value: String(4500 + i * 1750) + ".00",
            currency: "BRL",
            assignedTo: responsible.user_id,
            expectedCloseDate: "2026-10-" + String(5 + i).padStart(2, "0"),
            source: ["Indicação", "Site", "LinkedIn", "Evento"][i % 4],
            temperature: ["COLD", "WARM", "HOT"][i % 3],
            tagIds: tags.length ? [tags[i % tags.length].id] : [],
            description:
              "Oportunidade fictícia de demonstração, sem vínculo com negociações reais.",
          },
          id,
        );
        await tx.execute(
          sql`UPDATE sales_deals SET created_at=now()-${i + 3}*interval '1 day',stage_entered_at=now()-${i % 12}*interval '1 day' WHERE tenant_id=${tenantId} AND id=${id}`,
        );
        if (i >= 14) {
          const status = i % 2 === 0 ? "WON" : "LOST";
          await tx.execute(
            sql`UPDATE sales_deals SET status=${status},won_at=${status === "WON" ? new Date() : null},lost_at=${status === "LOST" ? new Date() : null},lost_reason=${status === "LOST" ? ["Preço", "Timing", "Sem orçamento"][i % 3] : null} WHERE tenant_id=${tenantId} AND id=${id}`,
          );
          await tx.execute(
            sql`INSERT INTO sales_events(tenant_id,deal_id,actor_id,type,metadata) VALUES(${tenantId},${id},${ctx.userId},${"status." + status.toLowerCase()},${JSON.stringify({ demo: true, title: deal.title })}::jsonb)`,
          );
        }
      }
      if (i < 12 && deal && !deal.deleted_at) {
        const activityId = demoId("activity-" + i);
        if (
          !(await one(
            tx,
            sql`SELECT id FROM sales_work WHERE tenant_id=${tenantId} AND id=${activityId}`,
          ))
        )
          await insertWork(
            tx,
            ctx,
            "activities",
            {
              title: [
                "Apresentação da solução",
                "Reunião de alinhamento",
                "Retorno sobre a proposta",
              ][i % 3],
              type: ["CALL", "MEETING", "WHATSAPP"][i % 3],
              dealId: id,
              companyId: company.id,
              assignedTo: people[i % people.length].user_id,
              scheduledAt: new Date(
                Date.now() + (i - 2) * 86400000,
              ).toISOString(),
              status: "PLANNED",
              description:
                "Atividade fictícia para explorar a agenda e o histórico.",
            },
            activityId,
          );
        const taskId = demoId("task-" + i);
        if (
          !(await one(
            tx,
            sql`SELECT id FROM sales_work WHERE tenant_id=${tenantId} AND id=${taskId}`,
          ))
        )
          await insertWork(
            tx,
            ctx,
            "tasks",
            {
              title: [
                "Enviar proposta revisada",
                "Confirmar reunião",
                "Fazer follow-up",
              ][i % 3],
              dealId: id,
              companyId: company.id,
              assignedTo: people[i % people.length].user_id,
              dueAt: new Date(Date.now() + (i - 4) * 86400000).toISOString(),
              status: i === 11 ? "DONE" : "TODO",
              priority: ["LOW", "MEDIUM", "HIGH", "URGENT"][i % 4],
              checklist: [
                { title: "Revisar o histórico do cliente", done: false },
                { title: "Registrar o próximo passo", done: false },
              ],
              description: "Tarefa fictícia de demonstração.",
            },
            taskId,
          );
      }
    }
  });
}
