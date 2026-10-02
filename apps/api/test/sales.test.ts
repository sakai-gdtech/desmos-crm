import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config as dotenv } from "dotenv";
import { sql, type SQL } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import pg from "pg";

dotenv({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});
if (!process.env.TEST_DATABASE_URL)
  throw new Error(
    "TEST_DATABASE_URL deve apontar para um banco de teste separado.",
  );
const testUrl = new URL(process.env.TEST_DATABASE_URL);
if (!/test/i.test(testUrl.pathname))
  throw new Error("O nome do banco de testes deve conter test.");
const schemaName = `sales_${randomUUID().replaceAll("-", "")}`;
const bootstrap = new pg.Pool({ connectionString: testUrl.toString() });
testUrl.searchParams.set("options", `-c search_path=${schemaName}`);
process.env.DATABASE_URL = testUrl.toString();
process.env.NODE_ENV = "test";
const { buildApp } = await import("../src/app.js");
const { db, pool, one, rows } =
  await import("../src/infrastructure/database.js");
const { migrate } = await import("../src/infrastructure/migrate.js");
const app = await buildApp({ logger: false });
const origin = process.env.WEB_URL ?? "http://localhost:3017";
const password = "Crm-Integration-Password-2026!";
type Kind = "contacts" | "companies" | "leads";
type Role = "OWNER" | "ADMIN" | "MANAGER" | "SALES" | "SUPPORT" | "VIEWER";
const kinds: Kind[] = ["contacts", "companies", "leads"];
let ipSequence = 1;
const ipRun = Math.floor(Math.random() * 200) + 1;

class Client {
  cookies = new Map<string, string>();
  ip = `172.${ipRun}.${Math.floor(ipSequence / 250)}.${(ipSequence++ % 250) + 1}`;
  async request(
    method: any,
    url: string,
    payload?: unknown,
    headers: Record<string, string> = {},
  ) {
    const result = await app.inject({
      method,
      url,
      payload: payload as any,
      remoteAddress: this.ip,
      headers: {
        origin,
        cookie: [...this.cookies]
          .map(([key, value]) => `${key}=${value}`)
          .join("; "),
        ...headers,
      },
    });
    for (const cookie of result.cookies) {
      if (cookie.value) this.cookies.set(cookie.name, cookie.value);
      else this.cookies.delete(cookie.name);
    }
    return result;
  }
  clone() {
    const result = new Client();
    result.cookies = new Map(this.cookies);
    return result;
  }
}
type Account = {
  client: Client;
  user: { id: string; name: string };
  tenant: { id: string };
  membership: { id: string };
  email: string;
};
const email = () => `${randomUUID()}@sales.test.local`;
function status(
  response: { statusCode: number; body: string },
  expected: number,
) {
  assert.equal(response.statusCode, expected, response.body);
}
function errorCode(response: any, expectedStatus: number, code: string) {
  status(response, expectedStatus);
  assert.equal(response.json().error.code, code, response.body);
}
async function register(name = "Empresa CRM"): Promise<Account> {
  const client = new Client();
  const address = email();
  status(
    await client.request("POST", "/auth/register", {
      name: "Pessoa CRM",
      companyName: name,
      email: address,
      password,
    }),
    201,
  );
  const response = await client.request("GET", "/me");
  status(response, 200);
  return { client, email: address, ...response.json() };
}
async function member(owner: Account, role: Role) {
  const address = email();
  status(
    await owner.client.request("POST", "/invitations", {
      email: address,
      role,
    }),
    201,
  );
  const invitation = await one(
    db,
    sql`SELECT body FROM outbox WHERE recipient=${address} ORDER BY created_at DESC,id DESC LIMIT 1`,
  );
  const token = /\?token=([A-Za-z0-9_-]+)/.exec(invitation!.body)?.[1];
  assert.ok(token);
  const client = new Client();
  status(
    await client.request("POST", "/auth/accept-invitation", {
      token,
      name: `Pessoa ${role}`,
      password,
    }),
    201,
  );
  return {
    client,
    email: address,
    ...(await client.request("GET", "/me")).json(),
  } as Account;
}
async function create(
  client: Client,
  kind: Kind,
  data: Record<string, unknown> = {},
) {
  const response = await client.request("POST", `/crm/${kind}`, {
    name: `Registro ${randomUUID()}`,
    ...data,
  });
  status(response, 201);
  const body = response.json();
  assert.ok(body.item.id);
  assert.ok(Array.isArray(body.duplicates));
  return body.item;
}
async function tag(client: Client, name = `Tag ${randomUUID().slice(0, 8)}`) {
  const response = await client.request("POST", "/crm/tags", {
    name,
    color: "#4F46E5",
  });
  status(response, 201);
  return response.json().item;
}
async function get(client: Client, kind: Kind, id: string) {
  const response = await client.request("GET", `/crm/${kind}/${id}`);
  status(response, 200);
  return response.json().item;
}
async function list(client: Client, kind: Kind, query = "") {
  const response = await client.request("GET", `/crm/${kind}${query}`);
  status(response, 200);
  return response.json();
}
async function timeline(client: Client, kind: Kind, id: string) {
  const response = await client.request(
    "GET",
    `/crm/${kind}/${id}/timeline?pageSize=100`,
  );
  status(response, 200);
  return response.json();
}
async function tenantQuery(tenantId: string, query: SQL) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.tenant_id',${tenantId},true)`);
    return rows(tx, query);
  });
}

before(async () => {
  await bootstrap.query(`CREATE SCHEMA "${schemaName}"`);
  await migrate();
  await app.ready();
});
after(async () => {
  await app.close();
  await pool.end();
  await bootstrap.query(`DROP SCHEMA "${schemaName}" CASCADE`);
  await bootstrap.end();
});

const stageData = (name: string, probability: number, extra = {}) => ({
  name,
  probability,
  color: "#4F46E5",
  staleDays: 7,
  requireActivity: false,
  ...extra,
});
async function pipelineFor(
  client: Client,
  name = `Vendas ${randomUUID()}`,
  stages = [stageData("Entrada", 10), stageData("Proposta", 70)],
) {
  const r = await client.request("POST", "/sales/pipelines", { name, stages });
  status(r, 201);
  return r.json().item;
}
async function sale(
  client: Client,
  kind: string,
  input: Record<string, unknown>,
) {
  const r = await client.request("POST", `/sales/${kind}`, {
    title: `Venda ${randomUUID()}`,
    ...input,
  });
  status(r, 201);
  return r.json().item;
}
async function saleGet(client: Client, kind: string, id: string) {
  const r = await client.request("GET", `/sales/${kind}/${id}`);
  status(r, 200);
  return r.json().item;
}
async function saleList(client: Client, kind: string, query = "") {
  const r = await client.request("GET", `/sales/${kind}${query}`);
  status(r, 200);
  return r.json();
}
const dealInput = (p: any, extra = {}) => ({
  pipelineId: p.id,
  stageId: p.stages[0].id,
  currency: "BRL",
  value: "5000.25",
  ...extra,
});
const stagesInput = (p: any) =>
  p.stages.map(
    ({ id, name, probability, color, staleDays, requireActivity }: any) => ({
      id,
      name,
      probability,
      color,
      staleDays,
      requireActivity,
    }),
  );

test("Vendas: pipelines, colunas, contagens, referências e notas isolados por empresa", async () => {
  const a = await register(),
    b = await register();
  const pa = await pipelineFor(a.client),
    pb = await pipelineFor(b.client);
  const cb = await create(b.client, "companies");
  const dbDeal = await sale(
    b.client,
    "deals",
    dealInput(pb, { title: "Segredo empresa B" }),
  );
  status(await a.client.request("GET", `/sales/pipelines/${pb.id}`), 404);
  status(
    await a.client.request("PATCH", `/sales/pipelines/${pb.id}`, {
      version: pb.version,
      name: "Invadido",
    }),
    404,
  );
  status(await a.client.request("DELETE", `/sales/pipelines/${pb.id}`), 404);
  status(
    await a.client.request("GET", `/sales/board?pipelineId=${pb.id}`),
    404,
  );
  const ps = (await a.client.request("GET", "/sales/pipelines")).json().items;
  assert.deepEqual(
    ps.map((p: any) => p.id),
    [pa.id],
  );
  const da = await sale(a.client, "deals", dealInput(pa));
  for (const [key, value] of [
    ["pipelineId", pb.id],
    ["stageId", pb.stages[0].id],
    ["companyId", cb.id],
    ["assignedTo", b.user.id],
  ])
    status(
      await a.client.request("POST", "/sales/deals", {
        title: "Tentativa",
        ...dealInput(pa),
        [key!]: value,
      }),
      404,
    );
  for (const [kind, own, foreign] of [
    ["deals", da, dbDeal],
    [
      "activities",
      await sale(a.client, "activities", { type: "CALL" }),
      await sale(b.client, "activities", { type: "CALL", dealId: dbDeal.id }),
    ],
    [
      "tasks",
      await sale(a.client, "tasks", {}),
      await sale(b.client, "tasks", { dealId: dbDeal.id }),
    ],
  ] as const) {
    assert.equal((await saleList(a.client, kind)).total, 1);
    assert.equal((await saleList(a.client, kind, "?q=Segredo")).total, 0);
    for (const [method, suffix, data] of [
      ["GET", "", undefined],
      ["PATCH", "", { version: foreign.version, title: "Invadido" }],
      ["DELETE", "", undefined],
      ["POST", "/restore", {}],
    ] as const)
      status(
        await a.client.request(
          method,
          `/sales/${kind}/${foreign.id}${suffix}`,
          data,
        ),
        404,
      );
    status(
      await a.client.request("POST", `/sales/${kind}`, {
        title: "Forjado",
        tenantId: b.tenant.id,
        ...(kind === "deals"
          ? dealInput(pa)
          : kind === "activities"
            ? { type: "CALL" }
            : {}),
      }),
      400,
    );
    status(
      await a.client.request("GET", `/sales/${kind}/${own.id}`, undefined, {
        "x-tenant-id": b.tenant.id,
      }),
      200,
    );
  }
  status(
    await a.client.request("POST", "/sales/tasks", {
      title: "Referência B",
      dealId: dbDeal.id,
    }),
    404,
  );
  for (const [method, suffix, data] of [
    ["GET", "notes", undefined],
    ["POST", "notes", { body: "Invadido" }],
    ["GET", "timeline", undefined],
  ] as const)
    status(
      await a.client.request(
        method,
        `/sales/deals/${dbDeal.id}/${suffix}`,
        data,
      ),
      404,
    );
  const board = (
    await a.client.request("GET", `/sales/board?pipelineId=${pa.id}`)
  ).json();
  assert.equal(board.columns[0].total, 1);
  assert.equal(board.columns[0].totals[0].value, "5000.25");
  status(
    await a.client.request("POST", `/sales/deals/${da.id}/notes`, {
      body: "Nota",
      mentionIds: [b.user.id],
    }),
    404,
  );
});

test("Pipelines: regras, ordem, remoção de etapa ocupada e versões preservam histórico", async () => {
  const a = await register(),
    p = await pipelineFor(a.client);
  const d = await sale(a.client, "deals", dealInput(p));
  errorCode(
    await a.client.request("PATCH", `/sales/pipelines/${p.id}`, {
      version: p.version,
      stages: stagesInput(p).slice(1),
    }),
    409,
    "REFERENCED_STAGE",
  );
  errorCode(
    await a.client.request("DELETE", `/sales/pipelines/${p.id}`),
    409,
    "REFERENCED_PIPELINE",
  );
  const reversed = stagesInput(p).reverse();
  reversed[0].requireActivity = true;
  const r = await a.client.request("PATCH", `/sales/pipelines/${p.id}`, {
    version: p.version,
    stages: reversed,
  });
  status(r, 200);
  const updated = r.json().item;
  assert.equal(updated.stages[0].id, p.stages[1].id);
  errorCode(
    await a.client.request("PATCH", `/sales/pipelines/${p.id}`, {
      version: p.version,
      name: "Conflito",
    }),
    409,
    "VERSION_CONFLICT",
  );
  errorCode(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: d.version,
      stageId: p.stages[1].id,
    }),
    409,
    "ACTIVITY_REQUIRED",
  );
  await sale(a.client, "tasks", {
    dealId: d.id,
    dueAt: new Date(Date.now() + 86400000).toISOString(),
  });
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: d.version,
      stageId: p.stages[1].id,
    }),
    200,
  );
  const moved = await saleGet(a.client, "deals", d.id);
  assert.equal(moved.probability, 70);
  const events = (
    await a.client.request("GET", `/sales/deals/${d.id}/timeline`)
  ).json().items;
  const stage = events
    .find((e: any) => e.type === "stage.changed")
    .metadata.changes.find((c: any) => c.field === "stageId");
  assert.equal(stage.beforeLabel, "Entrada");
  assert.equal(stage.afterLabel, "Proposta");
  status(
    await a.client.request("PATCH", `/sales/pipelines/${p.id}`, {
      version: updated.version,
      active: false,
    }),
    200,
  );
  errorCode(
    await a.client.request("POST", "/sales/deals", {
      title: "Novo",
      ...dealInput(p),
    }),
    409,
    "INACTIVE_PIPELINE",
  );
  assert.equal((await saleGet(a.client, "deals", d.id)).pipelineName, p.name);
});

test("Oportunidade: edição concorrente, valores exatos, ganho, perda, reabertura e lixeira", async () => {
  const a = await register(),
    p = await pipelineFor(a.client);
  const d = await sale(
    a.client,
    "deals",
    dealInput(p, { value: "99999999999999.98", temperature: "HOT" }),
  );
  const responses = await Promise.all(
    [a.client.clone(), a.client.clone()].map((c, i) =>
      c.request("PATCH", `/sales/deals/${d.id}`, {
        version: d.version,
        title: `Versão ${i}`,
      }),
    ),
  );
  assert.deepEqual(responses.map((r) => r.statusCode).sort(), [200, 409]);
  let current = await saleGet(a.client, "deals", d.id);
  assert.equal(current.value, d.value);
  assert.equal(current.temperature, "HOT");
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: current.version,
      value: "99999999999999.99",
    }),
    200,
  );
  const events = (
    await a.client.request("GET", `/sales/deals/${d.id}/timeline`)
  ).json().items;
  assert.ok(
    events.some((e: any) =>
      e.metadata.changes?.some(
        (c: any) => c.field === "value" && c.after === "99999999999999.99",
      ),
    ),
  );
  current = await saleGet(a.client, "deals", d.id);
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: current.version,
      status: "WON",
    }),
    200,
  );
  current = await saleGet(a.client, "deals", d.id);
  assert.ok(current.wonAt);
  assert.equal(current.lostAt, null);
  errorCode(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: current.version,
      stageId: p.stages[1].id,
    }),
    409,
    "CLOSED_DEAL",
  );
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: current.version,
      status: "OPEN",
    }),
    200,
  );
  current = await saleGet(a.client, "deals", d.id);
  assert.equal(current.wonAt, null);
  errorCode(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: current.version,
      status: "LOST",
      lostReason: "   ",
    }),
    400,
    "LOSS_REASON_REQUIRED",
  );
  assert.equal((await saleGet(a.client, "deals", d.id)).status, "OPEN");
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: current.version,
      status: "LOST",
      lostReason: "Preço",
    }),
    200,
  );
  current = await saleGet(a.client, "deals", d.id);
  assert.ok(current.lostAt);
  assert.equal(current.lostReason, "Preço");
  errorCode(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: current.version,
      lostReason: null,
    }),
    400,
    "LOSS_REASON_REQUIRED",
  );
  assert.equal((await saleGet(a.client, "deals", d.id)).lostReason, "Preço");
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: current.version,
      status: "OPEN",
    }),
    200,
  );
  current = await saleGet(a.client, "deals", d.id);
  assert.equal(current.lostAt, null);
  assert.equal(current.lostReason, null);
  status(await a.client.request("DELETE", `/sales/deals/${d.id}`), 204);
  assert.equal((await saleList(a.client, "deals")).total, 0);
  assert.equal((await saleList(a.client, "deals", "?deleted=true")).total, 1);
  status(
    await a.client.request("POST", `/sales/deals/${d.id}/restore`, {}),
    200,
  );
  assert.equal(
    (await saleGet(a.client, "deals", d.id)).value,
    "99999999999999.99",
  );
});

test("Kanban: totais separam moedas, filtros e paginação incluem somente registros próprios", async () => {
  const a = await register(),
    p = await pipelineFor(a.client);
  await sale(
    a.client,
    "deals",
    dealInput(p, {
      value: "120.50",
      assignedTo: a.user.id,
      title: "Projeto Alfa",
    }),
  );
  await sale(
    a.client,
    "deals",
    dealInput(p, { value: "30.25", currency: "USD", title: "Projeto Beta" }),
  );
  const gone = await sale(a.client, "deals", dealInput(p, { value: "500" }));
  await a.client.request("DELETE", `/sales/deals/${gone.id}`);
  let r = (
    await a.client.request("GET", `/sales/board?pipelineId=${p.id}`)
  ).json();
  assert.equal(r.columns[0].total, 2);
  assert.deepEqual(
    r.columns[0].totals.sort((x: any, y: any) =>
      x.currency.localeCompare(y.currency),
    ),
    [
      { currency: "BRL", value: "120.50" },
      { currency: "USD", value: "30.25" },
    ],
  );
  r = (
    await a.client.request(
      "GET",
      `/sales/board?pipelineId=${p.id}&assignedTo=${a.user.id}&q=Alfa`,
    )
  ).json();
  assert.equal(r.columns[0].total, 1);
  const page1 = await saleList(a.client, "deals", "?pageSize=1"),
    page2 = await saleList(a.client, "deals", "?pageSize=1&page=2");
  assert.equal(page1.total, 2);
  assert.notEqual(page1.items[0].id, page2.items[0].id);
});

test("Tarefas: checklist e prioridade preservados, vencidos e concluídos filtrados e reabertura", async () => {
  const a = await register();
  const t = await sale(a.client, "tasks", {
    priority: "URGENT",
    dueAt: new Date(Date.now() - 86400000).toISOString(),
    checklist: [{ title: "Enviar proposta", done: false }],
  });
  const soon = await sale(a.client, "tasks", {
    dueAt: new Date(Date.now() + 172800000).toISOString(),
  });
  const today = await sale(a.client, "tasks", {
    dueAt: new Date().toISOString(),
  });
  assert.deepEqual(
    (await saleList(a.client, "tasks", "?bucket=upcoming")).items.map(
      (x: any) => x.id,
    ),
    [soon.id],
  );
  assert.ok(
    (await saleList(a.client, "tasks", "?bucket=today")).items.some(
      (x: any) => x.id === today.id,
    ),
  );
  assert.ok(
    (await saleList(a.client, "tasks", "?bucket=overdue")).items.some(
      (x: any) => x.id === t.id,
    ),
  );
  status(
    await a.client.request("PATCH", `/sales/tasks/${t.id}`, {
      version: t.version,
      status: "DONE",
    }),
    200,
  );
  let current = await saleGet(a.client, "tasks", t.id);
  assert.ok(current.completedAt);
  assert.equal(current.priority, "URGENT");
  assert.equal(current.checklist.length, 1);
  assert.ok(
    !(await saleList(a.client, "tasks", "?bucket=overdue")).items.some(
      (x: any) => x.id === t.id,
    ),
  );
  assert.equal(
    (await saleList(a.client, "tasks", "?bucket=completed")).total,
    1,
  );
  status(
    await a.client.request("PATCH", `/sales/tasks/${t.id}`, {
      version: current.version,
      title: "Revisado",
    }),
    200,
  );
  current = await saleGet(a.client, "tasks", t.id);
  assert.equal(current.status, "DONE");
  status(
    await a.client.request("PATCH", `/sales/tasks/${t.id}`, {
      version: current.version,
      status: "TODO",
      checklist: [{ title: "Enviar proposta", done: true }],
    }),
    200,
  );
  current = await saleGet(a.client, "tasks", t.id);
  assert.equal(current.completedAt, null);
  assert.equal(current.checklist[0].done, true);
  status(
    await a.client.request("PATCH", `/sales/tasks/${t.id}`, {
      version: current.version,
      checklist: [{ title: "", done: false }],
    }),
    400,
  );
});

test("Atividade concluída: follow-up único, contato recente e próximo contato do lead, rollback inválido", async () => {
  const a = await register(),
    lead = await create(a.client, "leads"),
    p = await pipelineFor(a.client),
    d = await sale(a.client, "deals", dealInput(p, { leadId: lead.id }));
  const at = new Date(Date.now() + 86400000).toISOString();
  const activity = await sale(a.client, "activities", {
    type: "CALL",
    leadId: lead.id,
    dealId: d.id,
    scheduledAt: new Date().toISOString(),
  });
  status(
    await a.client.request("PATCH", `/sales/activities/${activity.id}`, {
      version: activity.version,
      status: "COMPLETED",
      result: "Confirmado",
      followUpAt: at,
    }),
    200,
  );
  const completed = await saleGet(a.client, "activities", activity.id);
  assert.ok(completed.completedAt);
  assert.equal((await saleList(a.client, "tasks", `?dealId=${d.id}`)).total, 1);
  const contact = await get(a.client, "leads", lead.id);
  assert.ok(contact.lastContactAt);
  assert.equal(new Date(contact.nextContactAt).toISOString(), at);
  status(
    await a.client.request("PATCH", `/sales/activities/${activity.id}`, {
      version: completed.version,
      result: "Atualizado",
      followUpAt: at,
    }),
    200,
  );
  assert.equal((await saleList(a.client, "tasks", `?dealId=${d.id}`)).total, 1);
  const timelineEvents = (
    await a.client.request("GET", `/sales/deals/${d.id}/timeline`)
  ).json().items;
  assert.ok(
    timelineEvents.some((e: any) => e.type === "activity.status.completed"),
  );
  assert.ok(timelineEvents.some((e: any) => e.type === "task.created"));
  const count = (await saleList(a.client, "activities")).total;
  errorCode(
    await a.client.request("POST", "/sales/activities", {
      title: "Inválida",
      type: "CALL",
      leadId: lead.id,
      status: "COMPLETED",
      followUpAt: new Date(Date.now() - 86400000).toISOString(),
    }),
    400,
    "FOLLOWUP_IN_PAST",
  );
  assert.equal((await saleList(a.client, "activities")).total, count);
  errorCode(
    await a.client.request("POST", "/sales/activities", {
      title: "Não concluída",
      type: "CALL",
      followUpAt: at,
    }),
    400,
    "FOLLOWUP_REQUIRES_COMPLETION",
  );
});

test("Conversão: contato, empresa e negócio atômicos, repetição concorrente retorna a mesma oportunidade", async () => {
  const a = await register(),
    p = await pipelineFor(a.client),
    other = await pipelineFor(a.client);
  const lead = await create(a.client, "leads", {
    name: "Pessoa venda",
    companyName: "Empresa convertida",
    estimatedValue: "8900.50",
  });
  status(
    await a.client.request("POST", `/sales/leads/${lead.id}/convert`, {
      createCompany: true,
      opportunity: {
        title: "Nova venda",
        ...dealInput(p, { stageId: other.stages[0].id }),
      },
    }),
    404,
  );
  assert.equal((await list(a.client, "contacts")).total, 0);
  assert.equal((await list(a.client, "companies")).total, 0);
  assert.notEqual((await get(a.client, "leads", lead.id)).status, "CONVERTED");
  const responses = await Promise.all(
    [a.client.clone(), a.client.clone()].map((c) =>
      c.request("POST", `/sales/leads/${lead.id}/convert`, {
        createCompany: true,
        opportunity: {
          title: "Nova venda",
          pipelineId: p.id,
          stageId: p.stages[0].id,
        },
      }),
    ),
  );
  for (const r of responses) status(r, 200);
  assert.equal(responses[0]!.json().deal.id, responses[1]!.json().deal.id);
  const converted = await get(a.client, "leads", lead.id);
  assert.equal(converted.convertedDealId, responses[0]!.json().deal.id);
  assert.equal(
    responses[0]!.json().lead.convertedDealId,
    converted.convertedDealId,
  );
  assert.equal((await list(a.client, "contacts")).total, 1);
  assert.equal((await list(a.client, "companies")).total, 1);
  assert.equal((await saleList(a.client, "deals")).total, 1);
  assert.equal(responses[0]!.json().deal.value, "8900.50");
});

test("Tags: renomear e remover incrementam versão de vendas, registram snapshots e impedem sobrescrita", async () => {
  const a = await register(),
    p = await pipelineFor(a.client),
    t = await tag(a.client, "Prioritário"),
    d = await sale(a.client, "deals", dealInput(p, { tagIds: [t.id] })),
    work = await sale(a.client, "tasks", { tagIds: [t.id] });
  status(
    await a.client.request("PATCH", `/crm/tags/${t.id}`, {
      name: "Estratégico",
      color: "#2563EB",
    }),
    200,
  );
  const next = await saleGet(a.client, "deals", d.id);
  assert.equal(next.version, d.version + 1);
  assert.equal(next.tags[0].name, "Estratégico");
  errorCode(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: d.version,
      title: "Obsoleto",
    }),
    409,
    "VERSION_CONFLICT",
  );
  assert.equal(
    (await saleGet(a.client, "tasks", work.id)).version,
    work.version + 1,
  );
  status(await a.client.request("DELETE", `/crm/tags/${t.id}`), 204);
  const after = await saleGet(a.client, "deals", d.id);
  assert.equal(after.tags.length, 0);
  assert.equal(after.version, d.version + 2);
  const events = (
    await a.client.request("GET", `/sales/deals/${d.id}/timeline`)
  ).json().items;
  assert.ok(events.some((e: any) => e.metadata.tagAction === "deleted"));
  assert.ok(
    events.some((e: any) =>
      e.metadata.changes?.some(
        (c: any) => c.beforeLabel === "Prioritário (#4F46E5)",
      ),
    ),
  );
});

test("Papéis atuais: seis níveis respeitam gerenciamento, escrita, consulta e lixeira", async () => {
  const a = await register(),
    p = await pipelineFor(a.client),
    d = await sale(a.client, "deals", dealInput(p));
  for (const role of [
    "OWNER",
    "ADMIN",
    "MANAGER",
    "SALES",
    "SUPPORT",
    "VIEWER",
  ] as Role[]) {
    const m = role === "OWNER" ? a : await member(a, role);
    status(await m.client.request("GET", "/sales/pipelines"), 200);
    status(
      await m.client.request("GET", `/sales/board?pipelineId=${p.id}`),
      200,
    );
    status(await m.client.request("GET", `/sales/deals/${d.id}`), 200);
    status(
      await m.client.request("POST", "/sales/pipelines", {
        name: `Pipeline ${role}`,
        stages: [stageData("Inicial", 10)],
      }),
      ["OWNER", "ADMIN", "MANAGER"].includes(role) ? 201 : 403,
    );
    status(
      await m.client.request("POST", "/sales/deals", {
        title: `Venda ${role}`,
        ...dealInput(p),
      }),
      ["SUPPORT", "VIEWER"].includes(role) ? 403 : 201,
    );
    status(
      await m.client.request("POST", "/sales/tasks", {
        title: `Tarefa ${role}`,
      }),
      role === "VIEWER" ? 403 : 201,
    );
    status(
      await m.client.request("POST", "/sales/activities", {
        title: `Atividade ${role}`,
        type: "EMAIL",
      }),
      role === "VIEWER" ? 403 : 201,
    );
    status(
      await m.client.request("GET", "/sales/deals?deleted=true"),
      ["OWNER", "ADMIN", "MANAGER"].includes(role) ? 200 : 403,
    );
  }
  const sales = await member(a, "SALES");
  await db.execute(
    sql`UPDATE memberships SET role='VIEWER' WHERE id=${sales.membership.id}`,
  );
  status(
    await sales.client.request("POST", "/sales/tasks", {
      title: "Permissão obsoleta",
    }),
    403,
  );
  const admin = await member(a, "ADMIN");
  const session = await one(
    db,
    sql`SELECT id FROM sessions WHERE user_id=${admin.user.id} AND revoked_at IS NULL LIMIT 1`,
  );
  const stale = {
    userId: admin.user.id,
    tenantId: a.tenant.id,
    membershipId: admin.membership.id,
    sessionId: session!.id,
    requestId: randomUUID(),
    role: "ADMIN" as const,
  };
  await db.execute(
    sql`UPDATE memberships SET role='VIEWER' WHERE id=${admin.membership.id}`,
  );
  await a.client.request("DELETE", `/sales/deals/${d.id}`);
  const service = await import("../src/modules/sales/service.js");
  await assert.rejects(
    service.list(stale, "deals", {
      page: 1,
      pageSize: 20,
      deleted: "true",
      bucket: "all",
    }),
    (error: any) => error.code === "FORBIDDEN",
  );
  await assert.rejects(
    service.detail(stale, "deals", d.id),
    (error: any) => error.code === "NOT_FOUND",
  );
});

test("Notas de oportunidades: autor, fixação, menções locais e trilha de alterações", async () => {
  const a = await register(),
    p = await pipelineFor(a.client),
    d = await sale(a.client, "deals", dealInput(p));
  const r = await a.client.request("POST", `/sales/deals/${d.id}/notes`, {
    body: "Próxima reunião",
    pinned: true,
    mentionIds: [a.user.id],
  });
  status(r, 201);
  const note = r.json().item;
  assert.deepEqual(note.mentionIds, [a.user.id]);
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}/notes/${note.id}`, {
      body: "Reunião confirmada",
    }),
    200,
  );
  let notes = (
    await a.client.request("GET", `/sales/deals/${d.id}/notes`)
  ).json().items;
  assert.equal(notes[0].body, "Reunião confirmada");
  assert.equal(notes[0].pinned, true);
  status(
    await a.client.request("DELETE", `/sales/deals/${d.id}/notes/${note.id}`),
    204,
  );
  notes = (await a.client.request("GET", `/sales/deals/${d.id}/notes`)).json()
    .items;
  assert.equal(notes.length, 0);
  const events = (
    await a.client.request("GET", `/sales/deals/${d.id}/timeline`)
  ).json().items;
  assert.ok(events.some((e: any) => e.type === "note.deleted"));
});

test("RLS forçada nas nove tabelas, FKs compostas e referências de vendas protegem purga CRM", async () => {
  const a = await register(),
    b = await register(),
    p = await pipelineFor(a.client),
    pb = await pipelineFor(b.client),
    c = await create(a.client, "companies"),
    cb = await create(b.client, "companies");
  await sale(a.client, "deals", dealInput(p, { companyId: c.id }));
  const tables = [
    "sales_pipelines",
    "sales_stages",
    "sales_deals",
    "sales_work",
    "sales_deal_tags",
    "sales_work_tags",
    "sales_events",
    "sales_notes",
    "sales_note_mentions",
  ];
  const catalog = await rows(
    db,
    sql`SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace=${schemaName}::regnamespace AND relname IN (${sql.join(
      tables.map((t) => sql`${t}`),
      sql`,`,
    )})`,
  );
  assert.equal(catalog.length, 9);
  for (const row of catalog) {
    assert.equal(row.relrowsecurity, true);
    assert.equal(row.relforcerowsecurity, true);
  }
  assert.equal((await rows(db, sql`SELECT * FROM sales_deals`)).length, 0);
  await assert.rejects(
    tenantQuery(
      a.tenant.id,
      sql`INSERT INTO sales_deals(tenant_id,title,pipeline_id,stage_id,currency,company_id,probability) VALUES(${a.tenant.id},'FK inválida',${p.id},${p.stages[0].id},'BRL',${cb.id},10)`,
    ),
    (error: any) => error.cause?.code === "23503",
  );
  await assert.rejects(
    tenantQuery(
      a.tenant.id,
      sql`INSERT INTO sales_deals(tenant_id,title,pipeline_id,stage_id,currency,probability) VALUES(${a.tenant.id},'Etapa inválida',${p.id},${pb.stages[0].id},'BRL',10)`,
    ),
    (error: any) => error.cause?.code === "23503",
  );
  status(await a.client.request("DELETE", `/crm/companies/${c.id}`), 204);
  errorCode(
    await a.client.request("DELETE", `/crm/companies/${c.id}/permanent`),
    409,
    "REFERENCED_RECORD",
  );
  const contact = await create(a.client, "contacts");
  await sale(a.client, "tasks", { contactId: contact.id });
  await a.client.request("DELETE", `/crm/contacts/${contact.id}`);
  errorCode(
    await a.client.request("DELETE", `/crm/contacts/${contact.id}/permanent`),
    409,
    "REFERENCED_RECORD",
  );
});

test("Apresentação: proposta usa centavos exatos, preserva catálogo, versão, moeda e isolamento", async () => {
  const a = await register(),
    b = await register(),
    p = await pipelineFor(a.client);
  const d = await sale(a.client, "deals", dealInput(p));
  let response = await a.client.request("POST", "/sales/products", {
    name: "Implantação",
    price: "0.10",
    currency: "BRL",
  });
  status(response, 201);
  const product = response.json().item;
  response = await a.client.request("PUT", `/sales/deals/${d.id}/proposal`, {
    items: [
      {
        productId: product.id,
        name: product.name,
        quantity: 3,
        unitPrice: "0.10",
      },
    ],
    discount: "0.01",
    version: 0,
  });
  status(response, 200);
  assert.equal(response.json().item.total, "0.29");
  assert.equal((await saleGet(a.client, "deals", d.id)).value, "0.29");
  status(
    await a.client.request("PATCH", `/sales/products/${product.id}`, {
      name: product.name,
      price: "10.00",
      currency: "BRL",
      version: product.version,
    }),
    200,
  );
  const saved = (
    await a.client.request("GET", `/sales/deals/${d.id}/proposal`)
  ).json().item;
  assert.equal(saved.items[0].unitPrice, "0.10");
  assert.equal(saved.total, "0.29");
  errorCode(
    await a.client.request("PUT", `/sales/deals/${d.id}/proposal`, {
      items: saved.items,
      discount: "0",
      version: 0,
    }),
    409,
    "VERSION_CONFLICT",
  );
  errorCode(
    await a.client.request("PUT", `/sales/deals/${d.id}/proposal`, {
      items: saved.items,
      discount: "1.00",
      version: saved.version,
    }),
    400,
    "INVALID_DISCOUNT",
  );
  errorCode(
    await b.client.request("GET", `/sales/deals/${d.id}/proposal`),
    404,
    "NOT_FOUND",
  );
  assert.equal(
    (await b.client.request("GET", "/sales/products")).json().items.length,
    0,
  );
  const pb = await pipelineFor(b.client),
    db = await sale(b.client, "deals", dealInput(pb));
  errorCode(
    await b.client.request("PUT", `/sales/deals/${db.id}/proposal`, {
      items: saved.items,
      discount: "0",
      version: 0,
    }),
    404,
    "NOT_FOUND",
  );
  const viewer = await member(a, "VIEWER");
  errorCode(
    await viewer.client.request("PUT", `/sales/deals/${d.id}/proposal`, {
      items: saved.items,
      discount: "0",
      version: saved.version,
    }),
    403,
    "FORBIDDEN",
  );
  const fresh = await saleGet(a.client, "deals", d.id);
  errorCode(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: fresh.version,
      value: "100.00",
      status: "WON",
    }),
    409,
    "PROPOSAL_VALUE_MISMATCH",
  );
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: fresh.version,
      status: "WON",
    }),
    200,
  );
  errorCode(
    await a.client.request("PUT", `/sales/deals/${d.id}/proposal`, {
      items: saved.items,
      discount: "0",
      version: saved.version,
    }),
    409,
    "CLOSED_DEAL",
  );
});

test("Radar: próxima ação futura remove alerta, tarefa atrasada e ganho atualizam indicadores", async () => {
  const a = await register(),
    p = await pipelineFor(a.client),
    p2 = await pipelineFor(a.client);
  const d = await sale(a.client, "deals", dealInput(p, { value: "12500.50" }));
  await sale(a.client, "deals", dealInput(p2, { value: "100.00" }));
  const dashboard = async () => {
    const r = await a.client.request(
      "GET",
      `/sales/dashboard?pipelineId=${p.id}`,
    );
    status(r, 200);
    return r.json();
  };
  let data = await dashboard();
  assert.equal(data.totals[0].openValue, "12500.50");
  assert.equal(data.noActionCount, 1);
  assert.equal(data.deals[0].id, d.id);
  const overdue = await sale(a.client, "tasks", {
    dealId: d.id,
    title: "Atrasada",
    priority: "HIGH",
    dueAt: new Date(Date.now() - 86400000).toISOString(),
  });
  data = await dashboard();
  assert.equal(data.overdueCount, 1);
  assert.equal(data.noActionCount, 1);
  assert.equal(data.tasks[0].id, overdue.id);
  await sale(a.client, "tasks", {
    dealId: d.id,
    title: "Próximo contato",
    priority: "MEDIUM",
    dueAt: new Date(Date.now() + 86400000).toISOString(),
  });
  data = await dashboard();
  assert.equal(data.noActionCount, 0);
  assert.equal(data.deals.length, 0);
  status(
    await a.client.request("PATCH", `/sales/tasks/${overdue.id}`, {
      status: "DONE",
      version: overdue.version,
    }),
    200,
  );
  assert.equal((await dashboard()).overdueCount, 0);
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      status: "WON",
      version: d.version,
    }),
    200,
  );
  data = await dashboard();
  assert.equal(data.totals[0].openValue, "0");
  assert.equal(data.totals[0].wonValue, "12500.50");
  assert.equal(data.totals[0].wonCount, 1);
});

test("Automação demo: só funil dedicado, tarefa real única após reentrada e concorrência", async () => {
  const a = await register(),
    p = await pipelineFor(a.client),
    d = await sale(a.client, "deals", dealInput(p));
  errorCode(
    await a.client.request(
      "PATCH",
      `/sales/pipelines/${p.id}/demo-automation`,
      { enabled: true },
    ),
    409,
    "DEMO_ONLY",
  );
  await tenantQuery(
    a.tenant.id,
    sql`UPDATE sales_pipelines SET demo_fixture=true,demo_followup_enabled=true,demo_followup_stage_id=${p.stages[1].id} WHERE tenant_id=${a.tenant.id} AND id=${p.id}`,
  );
  const same = await Promise.all([
    a.client.request("PATCH", `/sales/deals/${d.id}`, {
      stageId: p.stages[1].id,
      version: d.version,
    }),
    a.client.request("PATCH", `/sales/deals/${d.id}`, {
      stageId: p.stages[1].id,
      version: d.version,
    }),
  ]);
  assert.deepEqual(same.map((r) => r.statusCode).sort(), [200, 409]);
  let tasks = await saleList(a.client, "tasks", `?dealId=${d.id}`);
  assert.equal(tasks.total, 1);
  assert.match(tasks.items[0].description, /Nenhum email/);
  let updated = await saleGet(a.client, "deals", d.id);
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      stageId: p.stages[0].id,
      version: updated.version,
    }),
    200,
  );
  updated = await saleGet(a.client, "deals", d.id);
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      stageId: p.stages[1].id,
      version: updated.version,
    }),
    200,
  );
  tasks = await saleList(a.client, "tasks", `?dealId=${d.id}`);
  assert.equal(tasks.total, 1);
  const executions = (
    await a.client.request("GET", `/sales/pipelines/${p.id}/demo-automation`)
  ).json();
  assert.equal(executions.executions.length, 1);
  assert.equal(executions.executions[0].taskId, tasks.items[0].id);
});

test("Apresentação: RLS forçada nas propostas, catálogo e execuções", async () => {
  const tables = ["sales_products", "sales_proposals", "sales_demo_executions"];
  const catalog = await rows(
    db,
    sql`SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace=${schemaName}::regnamespace AND relname IN (${sql.join(
      tables.map((t) => sql`${t}`),
      sql`,`,
    )})`,
  );
  assert.equal(catalog.length, 3);
  for (const t of catalog) {
    assert.equal(t.relrowsecurity, true);
    assert.equal(t.relforcerowsecurity, true);
  }
  for (const t of tables)
    assert.equal(
      (await rows(db, sql`SELECT * FROM ${sql.identifier(t)}`)).length,
      0,
    );
});

test("Automação demo: referência estável, configuração concorrente e etapas de outra empresa", async () => {
  const a = await register(),
    b = await register();
  const p = await pipelineFor(
    a.client,
    "Cinco etapas",
    ["Entrada", "Reunião", "Proposta", "Negociação", "Fechamento"].map((n, i) =>
      stageData(n, i * 20),
    ),
  );
  const other = await pipelineFor(b.client);
  await tenantQuery(
    a.tenant.id,
    sql`UPDATE sales_pipelines SET demo_fixture=true,demo_followup_enabled=true,demo_followup_stage_id=${p.stages[2].id} WHERE tenant_id=${a.tenant.id} AND id=${p.id}`,
  );
  const route = `/sales/pipelines/${p.id}/demo-automation`;
  errorCode(await b.client.request("GET", route), 404, "NOT_FOUND");
  const viewer = await member(a, "VIEWER");
  errorCode(
    await viewer.client.request("PATCH", route, {
      enabled: true,
      stageId: p.stages[1].id,
      version: p.version,
    }),
    403,
    "FORBIDDEN",
  );
  errorCode(
    await a.client.request("PATCH", route, {
      enabled: true,
      stageId: other.stages[0].id,
      version: p.version,
    }),
    400,
    "INVALID_STAGE",
  );
  const changes = await Promise.all([
    a.client.request("PATCH", route, {
      enabled: true,
      stageId: p.stages[2].id,
      version: p.version,
    }),
    a.client.request("PATCH", route, {
      enabled: true,
      stageId: p.stages[2].id,
      version: p.version,
    }),
  ]);
  assert.deepEqual(changes.map((r) => r.statusCode).sort(), [200, 409]);
  const configured = (await a.client.request("GET", route)).json();
  const savedInputs = stagesInput(p);
  const reordered = [
    savedInputs[4],
    savedInputs[0],
    stageData("Validação", 45),
    savedInputs[1],
    { ...savedInputs[2], name: "Proposta revisada" },
    savedInputs[3],
  ];
  const changed = await a.client.request("PATCH", `/sales/pipelines/${p.id}`, {
    version: configured.version,
    stages: reordered,
  });
  status(changed, 200);
  const updated = changed.json().item;
  assert.deepEqual(
    updated.stages.map((s: any) => s.position),
    [0, 1, 2, 3, 4, 5],
  );
  assert.equal(updated.stages[4].id, p.stages[2].id);
  assert.equal(
    (await a.client.request("GET", route)).json().stageId,
    p.stages[2].id,
  );
  errorCode(
    await a.client.request("PATCH", `/sales/pipelines/${p.id}`, {
      version: updated.version,
      stages: stagesInput(updated).filter((s: any) => s.id !== p.stages[2].id),
    }),
    409,
    "AUTOMATION_STAGE",
  );
  const d = await sale(
    a.client,
    "deals",
    dealInput(updated, { stageId: p.stages[0].id }),
  );
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      stageId: p.stages[2].id,
      version: d.version,
    }),
    200,
  );
  assert.equal((await saleList(a.client, "tasks", `?dealId=${d.id}`)).total, 1);
  const cfg = (await a.client.request("GET", route)).json();
  status(
    await a.client.request("PATCH", route, {
      enabled: false,
      stageId: cfg.stageId,
      version: cfg.version,
    }),
    200,
  );
  const paused = await sale(
    a.client,
    "deals",
    dealInput(updated, { stageId: p.stages[0].id }),
  );
  status(
    await a.client.request("PATCH", `/sales/deals/${paused.id}`, {
      stageId: p.stages[2].id,
      version: paused.version,
    }),
    200,
  );
  assert.equal(
    (await saleList(a.client, "tasks", `?dealId=${paused.id}`)).total,
    0,
  );
});

test("agenda window includes start, excludes end, pages >100, filters pipeline/type and retains tenant boundaries", async () => {
  const a = await register("Agenda"),
    b = await register("Outra agenda");
  const p = await pipelineFor(a.client),
    other = await pipelineFor(a.client);
  const d = await sale(a.client, "deals", dealInput(p));
  const d2 = await sale(a.client, "deals", dealInput(other));
  const from = "2026-10-05T04:00:00.000Z",
    to = "2026-10-06T04:00:00.000Z";
  await tenantQuery(
    a.tenant.id,
    sql`INSERT INTO sales_work(tenant_id,kind,title,deal_id,assigned_to,due_at,status,created_by,priority) SELECT ${a.tenant.id},'tasks','Agenda '||n,${d.id},${a.user.id},${from}::timestamptz + (n-1)*interval '1 minute','TODO',${a.user.id},'MEDIUM' FROM generate_series(1,105) n`,
  );
  await sale(a.client, "tasks", { dealId: d.id, dueAt: to });
  await sale(a.client, "tasks", {
    dealId: d.id,
    dueAt: "2026-10-05T03:59:59.000Z",
  });
  await sale(a.client, "tasks", { dealId: d2.id, dueAt: from });
  await sale(a.client, "tasks", { dealId: d.id });
  const q = `?from=${from}&to=${to}&pipelineId=${p.id}&pageSize=100&type=TASK`;
  const first = await saleList(a.client, "tasks", q),
    second = await saleList(a.client, "tasks", q + "&page=2");
  assert.equal(first.total, 105);
  assert.equal(first.items.length, 100);
  assert.equal(second.items.length, 5);
  assert.equal(
    new Set([...first.items, ...second.items].map((i) => i.id)).size,
    105,
  );
  assert.ok(first.items.some((i) => new Date(i.dueAt).toISOString() === from));
  assert.equal((await saleList(b.client, "tasks", q)).total, 0);
  assert.equal(
    (await saleList(a.client, "tasks", `?pipelineId=${other.id}`)).total,
    1,
  );
  assert.equal(
    (await saleList(a.client, "tasks", `?bucket=undated&pipelineId=${p.id}`))
      .total,
    1,
  );
  assert.equal(
    (await saleList(a.client, "tasks", `?type=MEETING&pipelineId=${p.id}`))
      .total,
    0,
  );
  status(
    await a.client.request("GET", `/sales/tasks?from=${to}&to=${from}`),
    400,
  );
  const meeting = await sale(a.client, "activities", {
    type: "MEETING",
    dealId: d.id,
    scheduledAt: from,
    duration: 45,
  });
  assert.equal(
    (
      await saleList(
        a.client,
        "activities",
        q.replace("type=TASK", "type=MEETING"),
      )
    ).items[0].id,
    meeting.id,
  );
});

test("PDF: campos tipados persistem, arquivamento preserva valores, versão e tenant são obrigatórios", async () => {
  const a = await register(),
    b = await register(),
    viewer = await member(a, "VIEWER"),
    manager = await member(a, "MANAGER"),
    lead = await create(a.client, "leads");
  const input = {
    kind: "leads",
    name: "Área de interesse",
    type: "choice",
    options: ["Serviços", "Software"],
  };
  status(await viewer.client.request("POST", "/crm/fields", input), 403);
  status(await manager.client.request("POST", "/crm/fields", input), 403);
  const res = await a.client.request("POST", "/crm/fields", input);
  status(res, 201);
  const f = res.json().item;
  status(
    await a.client.request("POST", "/crm/fields", {
      ...input,
      name: "área de interesse",
    }),
    409,
  );
  status(
    await a.client.request("PUT", `/crm/leads/${lead.id}/fields`, {
      version: lead.version,
      values: { [f.id]: "Inexistente" },
    }),
    400,
  );
  status(
    await a.client.request("PUT", `/crm/leads/${lead.id}/fields`, {
      version: lead.version,
      values: { [f.id]: "Software" },
    }),
    200,
  );
  status(
    await a.client.request("PUT", `/crm/leads/${lead.id}/fields`, {
      version: lead.version,
      values: { [f.id]: "Serviços" },
    }),
    409,
  );
  status(await b.client.request("GET", `/crm/leads/${lead.id}/fields`), 404);
  status(
    await viewer.client.request("PUT", `/crm/leads/${lead.id}/fields`, {
      version: 2,
      values: { [f.id]: "Serviços" },
    }),
    403,
  );
  status(
    await a.client.request("PATCH", `/crm/fields/${f.id}`, {
      active: false,
      version: f.version,
    }),
    200,
  );
  const saved = await a.client.request("GET", `/crm/leads/${lead.id}/fields`);
  status(saved, 200);
  assert.equal(saved.json().values[f.id], "Software");
  status(
    await a.client.request("PUT", `/crm/leads/${lead.id}/fields`, {
      version: saved.json().version,
      values: { [f.id]: null },
    }),
    400,
  );
  const foreign = (
    await b.client.request("POST", "/crm/fields", { ...input, name: "Outro" })
  ).json().item;
  status(
    await a.client.request("PUT", `/crm/leads/${lead.id}/fields`, {
      version: saved.json().version,
      values: { [foreign.id]: "Software" },
    }),
    400,
  );
});

test("PDF: CSV prévia, validação, duplicados, rollback, idempotência e exportação filtrada segura", async () => {
  const a = await register(),
    viewer = await member(a, "VIEWER");
  await create(a.client, "leads", {
    name: "Original",
    email: "same@example.test",
    source: "Evento",
  });
  const csv =
    'nome,email,telefone,origem\r\nDuplicado,SAME@example.test,,Evento\r\n"Pessoa, Nova",new@example.test,5511999990000,Evento\r\nRepetido,new@example.test,,Evento';
  const base = { kind: "leads", csv, duplicatePolicy: "skip" };
  let response = await a.client.request("POST", "/crm/import", {
    ...base,
    mode: "preview",
  });
  status(response, 200);
  assert.equal(response.json().duplicates, 2);
  assert.equal(response.json().invalid, 0);
  const requestId = randomUUID();
  const imports = await Promise.all(
    [1, 2].map(() =>
      a.client.request("POST", "/crm/import", {
        ...base,
        mode: "import",
        requestId,
      }),
    ),
  );
  imports.forEach((r) => status(r, 200));
  assert.deepEqual(imports[0].json(), { created: 1, skipped: 2, total: 3 });
  assert.deepEqual(imports[1].json(), imports[0].json());
  assert.equal((await list(a.client, "leads")).total, 2);
  status(
    await a.client.request("POST", "/crm/import", {
      ...base,
      csv: csv + "\nOutro,outro@example.test,,",
      mode: "import",
      requestId,
    }),
    409,
  );
  const bad = "nome,email\nVálido,valid@example.test\nInválido,wrong";
  response = await a.client.request("POST", "/crm/import", {
    kind: "leads",
    csv: bad,
    mode: "preview",
  });
  status(response, 200);
  assert.equal(response.json().invalid, 1);
  status(
    await a.client.request("POST", "/crm/import", {
      kind: "leads",
      csv: bad,
      mode: "import",
      requestId: randomUUID(),
    }),
    400,
  );
  assert.equal((await list(a.client, "leads")).total, 2);
  status(
    await viewer.client.request("POST", "/crm/import", {
      ...base,
      mode: "preview",
    }),
    403,
  );
  response = await a.client.request("POST", "/crm/import", {
    kind: "leads",
    csv: "nome,email\n=HYPERLINK(),x@example.test",
    mode: "preview",
  });
  assert.ok(response.json().invalid);
  await create(a.client, "leads", { name: "＝FÓRMULA", source: "Protegido" });
  response = await a.client.request(
    "GET",
    "/crm/export?kind=leads&source=Protegido",
  );
  status(response, 200);
  assert.equal(response.json().total, 1);
  assert.match(response.json().csv, /\[texto\]/);
  assert.doesNotMatch(response.json().csv, /Original/);
  const { parseCsv, safeCsvCell } = await import("../src/modules/crm/csv.js");
  assert.equal(
    parseCsv('\uFEFF"nome","email"\r\nAna,ana@example.test')[0]!.raw!.name,
    "Ana",
  );
  assert.equal(
    parseCsv('nome;email\n"Pessoa\nNova";n@example.test')[0]!.raw!.name,
    "Pessoa\nNova",
  );
  assert.throws(() => parseCsv('nome,email\n"ab"x,a@example.test'));
  assert.throws(() => parseCsv("nome\n" + "á".repeat(150001)));
  assert.match(safeCsvCell("\t+cmd"), /\[texto\]/);
});

test("PDF: captura anônima preserva origem, round robin, retry e duplicados sem expor CRM", async () => {
  const a = await register(),
    sales = await member(a, "SALES"),
    b = await register();
  const res = await a.client.request("POST", "/crm/intake", {
    name: "Evento fictício",
    source: "Formulário · Evento",
    ownerIds: [a.user.id, sales.user.id],
  });
  status(res, 201);
  const form = res.json(),
    anonymous = new Client();
  status(await anonymous.request("GET", form.path), 200);
  assert.deepEqual((await anonymous.request("GET", form.path)).json(), {
    name: "Evento fictício",
  });
  const first = {
    name: "Pessoa captura",
    email: "capture1@example.test",
    requestId: randomUUID(),
  };
  for (const data of [
    first,
    first,
    { ...first, requestId: randomUUID() },
    {
      name: "Segunda captura",
      email: "capture2@example.test",
      requestId: randomUUID(),
    },
  ]) {
    const response = await anonymous.request("POST", form.path, data);
    status(response, 200);
    assert.deepEqual(response.json(), { received: true });
  }
  const items = (await list(a.client, "leads")).items;
  assert.equal(items.length, 2);
  assert.equal(
    items.find((r: any) => r.email === first.email).assignedTo,
    a.user.id,
  );
  assert.equal(
    items.find((r: any) => r.email === "capture2@example.test").assignedTo,
    sales.user.id,
  );
  items.forEach((r: any) => assert.equal(r.source, "Formulário · Evento"));
  status(
    await anonymous.request("GET", form.path.replace(a.tenant.id, b.tenant.id)),
    404,
  );
  status(
    await sales.client.request("POST", "/crm/intake", {
      name: "Outro",
      source: "Outro",
      ownerIds: [sales.user.id],
    }),
    403,
  );
  status(
    await a.client.request("PATCH", `/crm/intake/${form.item.id}`, {
      active: false,
      version: form.item.version,
    }),
    200,
  );
  status(
    await anonymous.request("POST", form.path, {
      ...first,
      requestId: randomUUID(),
    }),
    404,
  );
});

test("PDF: regra real em qualquer funil cria tarefa+aviso uma vez, pausa/versão/permissões e etapa protegida", async () => {
  const a = await register(),
    b = await register(),
    viewer = await member(a, "VIEWER"),
    p = await pipelineFor(a.client),
    d = await sale(a.client, "deals", {
      ...dealInput(p),
      assignedTo: a.user.id,
    });
  const input = {
    pipelineId: p.id,
    stageId: p.stages[1].id,
    name: "Acompanhar entrada",
    trigger: "STAGE",
    days: 1,
    taskTitle: "Verificar proposta",
    enabled: true,
  };
  status(await viewer.client.request("POST", "/sales/rules", input), 403);
  status(await b.client.request("POST", "/sales/rules", input), 404);
  const response = await a.client.request("POST", "/sales/rules", input);
  status(response, 201);
  const rule = response.json().item;
  const move = () =>
    a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: d.version,
      stageId: p.stages[1].id,
    });
  const results = await Promise.all([move(), move()]);
  assert.deepEqual(results.map((r) => r.statusCode).sort(), [200, 409]);
  let directory = (
    await a.client.request("GET", `/sales/rules?pipelineId=${p.id}`)
  ).json();
  assert.equal(directory.runs.length, 1);
  assert.equal(directory.items[0].executions, 1);
  let current = await saleGet(a.client, "deals", d.id);
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: current.version,
      stageId: p.stages[0].id,
    }),
    200,
  );
  current = await saleGet(a.client, "deals", d.id);
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: current.version,
      stageId: p.stages[1].id,
    }),
    200,
  );
  directory = (
    await a.client.request("GET", `/sales/rules?pipelineId=${p.id}`)
  ).json();
  assert.equal(directory.runs.length, 1);
  const notices = (await a.client.request("GET", "/notifications")).json()
    .items;
  assert.ok(notices.some((n: any) => n.workId === directory.runs[0].taskId));
  assert.equal(
    (await b.client.request("GET", "/notifications")).json().items.length,
    0,
  );
  assert.equal(
    (await viewer.client.request("GET", "/notifications")).json().items.length,
    0,
  );
  status(
    await a.client.request("PATCH", `/sales/rules/${rule.id}`, {
      ...input,
      enabled: false,
      version: rule.version,
    }),
    200,
  );
  status(
    await a.client.request("PATCH", `/sales/rules/${rule.id}`, {
      ...input,
      version: rule.version,
    }),
    409,
  );
});

test("PDF: lembretes e atrasos não duplicam nem sobrevivem reagendamento, conclusão ou troca de responsável", async () => {
  const a = await register(),
    sales = await member(a, "SALES"),
    p = await pipelineFor(a.client),
    d = await sale(a.client, "deals", dealInput(p)),
    task = await sale(a.client, "tasks", {
      dealId: d.id,
      assignedTo: a.user.id,
      dueAt: new Date(Date.now() + 3600000).toISOString(),
    });
  const { scanTenant } = await import("../src/modules/sales/rules.js");
  await scanTenant(a.tenant.id);
  await scanTenant(a.tenant.id);
  let notices = (await a.client.request("GET", "/notifications")).json().items;
  assert.equal(notices.filter((n: any) => n.workId === task.id).length, 1);
  let current = await saleGet(a.client, "tasks", task.id);
  status(
    await a.client.request("PATCH", `/sales/tasks/${task.id}`, {
      version: current.version,
      dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    }),
    200,
  );
  assert.equal(
    (await a.client.request("GET", "/notifications"))
      .json()
      .items.filter((n: any) => n.workId === task.id).length,
    0,
  );
  current = await saleGet(a.client, "tasks", task.id);
  status(
    await a.client.request("PATCH", `/sales/tasks/${task.id}`, {
      version: current.version,
      assignedTo: sales.user.id,
      dueAt: new Date(Date.now() - 60000).toISOString(),
    }),
    200,
  );
  await scanTenant(a.tenant.id);
  assert.equal(
    (await a.client.request("GET", "/notifications"))
      .json()
      .items.filter((n: any) => n.workId === task.id).length,
    0,
  );
  notices = (await sales.client.request("GET", "/notifications")).json().items;
  const notification = notices.find((n: any) => n.workId === task.id);
  assert.ok(notification);
  assert.equal(notification.reason, "Prazo vencido");
  status(
    await a.client.request(
      "POST",
      `/notifications/${notification.id}/read`,
      {},
    ),
    404,
  );
  status(
    await sales.client.request(
      "POST",
      `/notifications/${notification.id}/read`,
      {},
    ),
    200,
  );
  current = await saleGet(a.client, "tasks", task.id);
  status(
    await sales.client.request("PATCH", `/sales/tasks/${task.id}`, {
      version: current.version,
      status: "DONE",
    }),
    200,
  );
  assert.equal(
    (await sales.client.request("GET", "/notifications"))
      .json()
      .items.filter((n: any) => n.workId === task.id).length,
    0,
  );
});

test("PDF: métricas reais filtradas, moeda, perdas e proposta na timeline cliente", async () => {
  const a = await register(),
    p = await pipelineFor(a.client),
    contact = await create(a.client, "contacts");
  const d = await sale(a.client, "deals", {
    ...dealInput(p),
    contactId: contact.id,
    assignedTo: a.user.id,
    source: "Evento",
  });
  status(
    await a.client.request("PUT", `/sales/deals/${d.id}/proposal`, {
      items: [{ name: "Serviço", quantity: 2, unitPrice: "100.10" }],
      discount: "0.01",
      version: 0,
    }),
    200,
  );
  const history = await timeline(a.client, "contacts", contact.id);
  const e = history.items.find((e: any) => e.type === "proposal.saved");
  assert.ok(e);
  assert.equal(e.actorName, a.user.name);
  assert.equal(e.metadata.total, "200.19");
  assert.ok(e.createdAt);
  let current = await saleGet(a.client, "deals", d.id);
  status(
    await a.client.request("PATCH", `/sales/deals/${d.id}`, {
      version: current.version,
      status: "WON",
    }),
    200,
  );
  const lost = await sale(a.client, "deals", {
    ...dealInput(p),
    assignedTo: a.user.id,
    source: "Evento",
  });
  status(
    await a.client.request("PATCH", `/sales/deals/${lost.id}`, {
      version: lost.version,
      status: "LOST",
      lostReason: "Sem orçamento",
    }),
    200,
  );
  const dashboard = (
    await a.client.request(
      "GET",
      `/sales/dashboard?pipelineId=${p.id}&source=Evento&assignedTo=${a.user.id}`,
    )
  ).json();
  assert.equal(dashboard.conversion, 50);
  assert.equal(dashboard.totals[0].averageTicket, "200.19");
  assert.equal(dashboard.totals[0].wonCount, 1);
  assert.equal(dashboard.totals[0].lostCount, 1);
  assert.equal(dashboard.lossReasons[0].reason, "Sem orçamento");
  assert.equal(dashboard.periodBasis, "createdAt");
  const empty = (
    await a.client.request(
      "GET",
      `/sales/dashboard?pipelineId=${p.id}&from=2100-01-01T00:00:00Z`,
    )
  ).json();
  assert.equal(empty.totals.length, 0);
  assert.equal(empty.conversion, null);
  const board = (
    await a.client.request(
      "GET",
      `/sales/board?pipelineId=${p.id}&source=Outro&status=WON`,
    )
  ).json();
  assert.equal(
    board.columns.reduce((n: number, c: any) => n + c.total, 0),
    0,
  );
});

test("PDF: campos compartilhados seguem a conversão sem sobrescrever contato existente", async () => {
  const a = await register();
  const field = (
    await a.client.request("POST", "/crm/fields", {
      kind: "leads",
      name: "Interesse",
      type: "text",
      shareOnConversion: true,
    })
  ).json().item;
  assert.ok(field.id);
  const lead = await create(a.client, "leads");
  status(
    await a.client.request("PUT", `/crm/leads/${lead.id}/fields`, {
      version: lead.version,
      values: { [field.id]: "Consultoria" },
    }),
    200,
  );
  const response = await a.client.request(
    "POST",
    `/crm/leads/${lead.id}/convert`,
    {},
  );
  status(response, 200);
  const contact = response.json().contact;
  const values = (
    await a.client.request("GET", `/crm/contacts/${contact.id}/fields`)
  ).json();
  assert.equal(values.values[field.id], "Consultoria");
  const definitions = (
    await a.client.request("GET", "/crm/fields?kind=contacts")
  ).json().items;
  assert.ok(definitions.some((f: any) => f.id === field.id));
  status(
    await a.client.request("PUT", `/crm/contacts/${contact.id}/fields`, {
      version: values.version,
      values: { [field.id]: "Treinamento" },
    }),
    200,
  );
  const second = await create(a.client, "leads");
  status(
    await a.client.request("PUT", `/crm/leads/${second.id}/fields`, {
      version: second.version,
      values: { [field.id]: "Outro" },
    }),
    200,
  );
  status(
    await a.client.request("POST", `/crm/leads/${second.id}/convert`, {
      contactId: contact.id,
    }),
    200,
  );
  assert.equal(
    (await a.client.request("GET", `/crm/contacts/${contact.id}/fields`)).json()
      .values[field.id],
    "Treinamento",
  );
});

test("PDF: varredura de inatividade/atraso registra snapshot, deduplica e para após revogação", async () => {
  const a = await register(),
    p = await pipelineFor(a.client),
    d = await sale(a.client, "deals", {
      ...dealInput(p),
      assignedTo: a.user.id,
    });
  await tenantQuery(
    a.tenant.id,
    sql`UPDATE sales_deals SET updated_at=now()-interval '4 days' WHERE tenant_id=${a.tenant.id} AND id=${d.id}`,
  );
  const inactivity = (
    await a.client.request("POST", "/sales/rules", {
      pipelineId: p.id,
      stageId: null,
      name: "Sem atualização",
      trigger: "INACTIVITY",
      days: 3,
      taskTitle: "Retomar conversa",
      enabled: true,
    })
  ).json().item;
  assert.ok(inactivity.id);
  status(
    await a.client.request("POST", "/sales/rules/scan", { pipelineId: p.id }),
    200,
  );
  status(
    await a.client.request("POST", "/sales/rules/scan", { pipelineId: p.id }),
    200,
  );
  let directory = (
    await a.client.request("GET", `/sales/rules?pipelineId=${p.id}`)
  ).json();
  assert.equal(directory.runs.length, 1);
  assert.equal(directory.runs[0].ruleSnapshot.version, 1);
  assert.equal(directory.runs[0].ruleSnapshot.name, "Sem atualização");
  status(
    await a.client.request("PATCH", `/sales/rules/${inactivity.id}`, {
      pipelineId: p.id,
      stageId: null,
      name: "Outro nome",
      trigger: "INACTIVITY",
      days: 3,
      taskTitle: "Outra tarefa",
      enabled: false,
      version: 1,
    }),
    200,
  );
  directory = (
    await a.client.request("GET", `/sales/rules?pipelineId=${p.id}`)
  ).json();
  assert.equal(directory.runs[0].ruleSnapshot.name, "Sem atualização");
  await sale(a.client, "tasks", {
    dealId: d.id,
    assignedTo: a.user.id,
    dueAt: new Date(Date.now() - 3600000).toISOString(),
  });
  const overdue = (
    await a.client.request("POST", "/sales/rules", {
      pipelineId: p.id,
      stageId: null,
      name: "Em atraso",
      trigger: "OVERDUE",
      days: 1,
      taskTitle: "Resolver atraso",
      enabled: true,
    })
  ).json().item;
  status(
    await a.client.request("POST", "/sales/rules/scan", { pipelineId: p.id }),
    200,
  );
  directory = (
    await a.client.request("GET", `/sales/rules?pipelineId=${p.id}`)
  ).json();
  assert.equal(directory.runs.length, 2);
  assert.ok(directory.runs.some((r: any) => r.ruleId === overdue.id));
  const another = await sale(a.client, "deals", dealInput(p));
  await sale(a.client, "tasks", {
    dealId: another.id,
    assignedTo: a.user.id,
    dueAt: new Date(Date.now() - 3600000).toISOString(),
  });
  await tenantQuery(
    a.tenant.id,
    sql`UPDATE memberships SET role='VIEWER' WHERE tenant_id=${a.tenant.id} AND user_id=${a.user.id}`,
  );
  const { scanTenant } = await import("../src/modules/sales/rules.js");
  await scanTenant(a.tenant.id);
  const runs = await tenantQuery(
    a.tenant.id,
    sql`SELECT * FROM sales_rule_runs WHERE tenant_id=${a.tenant.id}`,
  );
  assert.equal(runs.length, 2);
});

test("PDF: RLS forçada e FKs compostas nas novas tabelas comerciais", async () => {
  const names = [
    "crm_fields",
    "crm_imports",
    "crm_intake_forms",
    "crm_intake_entries",
    "sales_rules",
    "sales_rule_runs",
    "internal_notifications",
  ];
  const checks = await rows(
    db,
    sql`SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace=${schemaName}::regnamespace AND relname IN (${sql.join(
      names.map((n) => sql`${n}`),
      sql`,`,
    )})`,
  );
  assert.equal(checks.length, names.length);
  checks.forEach((c) => {
    assert.ok(c.relrowsecurity);
    assert.ok(c.relforcerowsecurity);
  });
  const a = await register(),
    b = await register();
  const f = (
    await a.client.request("POST", "/crm/fields", {
      kind: "leads",
      name: "Privado",
      type: "text",
    })
  ).json().item;
  const hidden = await tenantQuery(
    b.tenant.id,
    sql`SELECT * FROM crm_fields WHERE id=${f.id}`,
  );
  assert.equal(hidden.length, 0);
});
