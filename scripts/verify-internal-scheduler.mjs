import { request, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const origin = "http://localhost:3017";
const client = await request.newContext({ baseURL: origin });
const stamp = Date.now(),
  headers = { Origin: origin };
async function post(path, data, status = 201) {
  const result = await client.post(`/api${path}`, { headers, data });
  expect(result.status()).toBe(status);
  return result.json();
}
try {
  await post("/auth/register", {
    name: "Ensaio scheduler",
    companyName: `Scheduler fictício ${stamp}`,
    email: `scheduler-${stamp}@example.test`,
    password: `Desmos-Scheduler-${stamp}!`,
  });
  const me = await (await client.get("/api/me")).json();
  const pipeline = (
    await post("/sales/pipelines", {
      name: "Scheduler automático",
      stages: [{ name: "Em conversa", probability: 30, color: "#405670" }],
    })
  ).item;
  const deal = (
    await post("/sales/deals", {
      title: "Negócio fictício com prazo vencido",
      pipelineId: pipeline.id,
      stageId: pipeline.stages[0].id,
      currency: "BRL",
      assignedTo: me.user.id,
    })
  ).item;
  const work = (
    await post("/sales/tasks", {
      title: "Compromisso fictício vencido",
      dealId: deal.id,
      assignedTo: me.user.id,
      dueAt: new Date(Date.now() - 60000).toISOString(),
    })
  ).item;
  const rule = (
    await post("/sales/rules", {
      name: "Aviso automático de atraso",
      pipelineId: pipeline.id,
      stageId: null,
      trigger: "OVERDUE",
      days: 1,
      taskTitle: "Reagendar compromisso fictício",
      enabled: true,
    })
  ).item;
  const startedAt = new Date().toISOString();
  let result, notices;
  await expect
    .poll(
      async () => {
        result = await (
          await client.get(`/api/sales/rules?pipelineId=${pipeline.id}`)
        ).json();
        notices = await (await client.get("/api/notifications")).json();
        return (
          result.runs.some((run) => run.ruleId === rule.id) &&
          notices.items.some((item) => item.workId === work.id)
        );
      },
      { timeout: 100000, intervals: [1000] },
    )
    .toBeTruthy();
  await writeFile(
    "docs/evidence/pdf-completion/scheduler.json",
    JSON.stringify(
      {
        startedAt,
        observedAt: new Date().toISOString(),
        method:
          "New fictional tenant, real pending task with past due date, persisted OVERDUE rule. Poll read-only rules/notifications until automatic API scheduler creates run and overdue reminder; NEVER call manual scan endpoint. No external messages.",
        tenantId: me.tenant.id,
        pipelineId: pipeline.id,
        dealId: deal.id,
        workId: work.id,
        ruleId: rule.id,
        runs: result.runs,
        notifications: notices.items,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      automatic: true,
      runs: result.runs.length,
      notifications: notices.items.length,
      startedAt,
      observedAt: new Date().toISOString(),
    }),
  );
} finally {
  await client.dispose();
}
