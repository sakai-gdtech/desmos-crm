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
const schemaName = `crm_${randomUUID().replaceAll("-", "")}`;
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
const email = () => `${randomUUID()}@crm.test.local`;
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

for (const kind of kinds) {
  test(`CRM ${kind}: tenant A não lista, conta, consulta, altera, exclui, restaura ou purga B`, async () => {
    const a = await register("Tenant A");
    const b = await register("Tenant B");
    const own = await create(a.client, kind, { name: "Visível A" });
    const foreign = await create(b.client, kind, { name: "Segredo B" });
    const initial = await list(a.client, kind);
    assert.equal(initial.total, 1);
    assert.deepEqual(
      initial.items.map((item: any) => item.id),
      [own.id],
    );
    assert.equal((await list(a.client, kind, "?q=Segredo")).total, 0);
    for (const [method, suffix, payload] of [
      ["GET", "", undefined],
      ["PATCH", "", { version: foreign.version, name: "Invadido" }],
      ["DELETE", "", undefined],
      ["POST", "/restore", {}],
      ["DELETE", "/permanent", undefined],
      ["GET", "/notes", undefined],
      ["POST", "/notes", { body: "Nota invasora" }],
      ["GET", "/timeline", undefined],
    ] as const)
      errorCode(
        await a.client.request(
          method,
          `/crm/${kind}/${foreign.id}${suffix}`,
          payload,
        ),
        404,
        "NOT_FOUND",
      );
    status(
      await a.client.request("POST", `/crm/${kind}`, {
        name: "Tenant forjado",
        tenantId: b.tenant.id,
      }),
      400,
    );
    status(
      await a.client.request("GET", `/crm/${kind}/${own.id}`, undefined, {
        "x-tenant-id": b.tenant.id,
      }),
      200,
    );
    errorCode(
      await a.client.request(
        "PATCH",
        `/crm/${kind}/${own.id}`,
        { version: own.version, name: "Errado" },
        { "x-expected-tenant-id": b.tenant.id },
      ),
      409,
      "TENANT_CONTEXT_CHANGED",
    );
    status(await b.client.request("DELETE", `/crm/${kind}/${foreign.id}`), 204);
    assert.equal((await list(a.client, kind, "?deleted=true")).total, 0);
    errorCode(
      await a.client.request("POST", `/crm/${kind}/${foreign.id}/restore`, {}),
      404,
      "NOT_FOUND",
    );
    errorCode(
      await a.client.request("DELETE", `/crm/${kind}/${foreign.id}/permanent`),
      404,
      "NOT_FOUND",
    );
    assert.equal((await get(a.client, kind, own.id)).name, "Visível A");
    assert.equal(
      (await list(b.client, kind, "?deleted=true")).items[0].id,
      foreign.id,
    );
    status(await new Client().request("GET", `/crm/${kind}`), 401);
  });
}

test("CRM paginação, filtros e ordenação preservam total e fronteiras do tenant", async () => {
  const a = await register();
  const b = await register();
  const company = await create(a.client, "companies");
  const label = await tag(a.client);
  for (const name of ["Gamma", "Alpha", "Beta"])
    await create(a.client, "leads", {
      name,
      status: "QUALIFIED",
      temperature: "HOT",
      source: "Evento próprio",
      companyId: company.id,
      assignedTo: a.user.id,
      tagIds: [label.id],
    });
  await create(a.client, "leads", {
    name: "Outra origem",
    status: "NEW",
    temperature: "COLD",
    source: "Site",
  });
  await create(b.client, "leads", {
    name: "Segredo",
    status: "QUALIFIED",
    temperature: "HOT",
    source: "Evento próprio",
  });
  const filters = `status=QUALIFIED&temperature=HOT&source=${encodeURIComponent("Evento próprio")}&assignedTo=${a.user.id}&tagId=${label.id}&companyId=${company.id}&sort=name&order=asc&pageSize=2`;
  const first = await list(a.client, "leads", `?${filters}&page=1`);
  const second = await list(a.client, "leads", `?${filters}&page=2`);
  assert.equal(first.total, 3);
  assert.equal(first.page, 1);
  assert.equal(first.pageSize, 2);
  assert.equal(second.total, 3);
  assert.deepEqual(
    first.items.map((item: any) => item.name),
    ["Alpha", "Beta"],
  );
  assert.deepEqual(
    second.items.map((item: any) => item.name),
    ["Gamma"],
  );
  assert.equal((await list(a.client, "leads", "?q=Alpha")).total, 1);
  status(await a.client.request("GET", "/crm/leads?pageSize=101"), 400);
  status(await a.client.request("GET", "/crm/leads?sort=password_hash"), 400);
});

test("CRM referências recusam empresas, responsáveis e tags estrangeiros ou inativos sem gravação parcial", async () => {
  const a = await register();
  const b = await register();
  const foreignCompany = await create(b.client, "companies");
  const foreignTag = await tag(b.client);
  const localCompany = await create(a.client, "companies");
  const localTag = await tag(a.client);
  const record = await create(a.client, "contacts", {
    companyId: localCompany.id,
    assignedTo: a.user.id,
    tagIds: [localTag.id],
  });
  const baseline = await timeline(a.client, "contacts", record.id);
  for (const payload of [
    { companyId: foreignCompany.id },
    { assignedTo: b.user.id },
    { tagIds: [localTag.id, foreignTag.id] },
    { companyId: record.id },
  ]) {
    errorCode(
      await a.client.request("POST", "/crm/contacts", {
        name: "Referência recusada",
        ...payload,
      }),
      404,
      "NOT_FOUND",
    );
    errorCode(
      await a.client.request("PATCH", `/crm/contacts/${record.id}`, {
        version: record.version,
        name: "Não persistir",
        ...payload,
      }),
      404,
      "NOT_FOUND",
    );
  }
  const inactive = await member(a, "SALES");
  status(
    await a.client.request("PATCH", `/memberships/${inactive.membership.id}`, {
      status: "SUSPENDED",
    }),
    200,
  );
  errorCode(
    await a.client.request("POST", "/crm/leads", {
      name: "Responsável suspenso",
      assignedTo: inactive.user.id,
    }),
    404,
    "NOT_FOUND",
  );
  const assignees = await a.client.request("GET", "/crm/assignees");
  status(assignees, 200);
  assert.deepEqual(
    assignees.json().items.map((item: any) => item.id),
    [a.user.id],
  );
  assert.equal((await list(a.client, "contacts")).total, 1);
  const unchanged = await get(a.client, "contacts", record.id);
  assert.equal(unchanged.version, record.version);
  assert.equal(unchanged.name, record.name);
  assert.equal(
    (await timeline(a.client, "contacts", record.id)).total,
    baseline.total,
  );
  status(
    await a.client.request("DELETE", `/crm/companies/${localCompany.id}`),
    204,
  );
  errorCode(
    await a.client.request("POST", "/crm/contacts", {
      name: "Empresa na lixeira",
      companyId: localCompany.id,
    }),
    404,
    "NOT_FOUND",
  );
});

test("CRM alertas de duplicidade normalizam email/telefone, permanecem no tenant e não sobrescrevem", async () => {
  const a = await register();
  const b = await register();
  const address = "pessoa@example.test";
  const phone = "+55 (67) 99999-1234";
  const original = await create(a.client, "contacts", {
    name: "Original",
    email: address,
    phone,
  });
  const foreign = await b.client.request("POST", "/crm/contacts", {
    name: "Outra empresa",
    email: address,
    phone,
  });
  status(foreign, 201);
  assert.deepEqual(foreign.json().duplicates, []);
  const duplicate = await a.client.request("POST", "/crm/contacts", {
    name: "Possível duplicado",
    email: "PESSOA@example.test",
    phone: "+5567999991234",
  });
  status(duplicate, 201);
  assert.ok(
    duplicate.json().duplicates.some((item: any) => item.id === original.id),
  );
  assert.ok(
    duplicate
      .json()
      .duplicates.every((item: any) => item.id !== foreign.json().item.id),
  );
  const phoneOnly = await a.client.request("POST", "/crm/contacts", {
    name: "Apenas telefone",
    email: "outra-pessoa@example.test",
    phone: "55 67 99999 1234",
  });
  status(phoneOnly, 201);
  const phoneMatch = phoneOnly
    .json()
    .duplicates.find((item: any) => item.id === original.id);
  assert.ok(
    phoneMatch,
    "Telefone normalizado deve detectar duplicidade mesmo com email diferente.",
  );
  assert.deepEqual(phoneMatch.matchedBy, ["phone"]);
  const third = await create(a.client, "contacts", { name: "Alterado depois" });
  const patched = await a.client.request("PATCH", `/crm/contacts/${third.id}`, {
    version: third.version,
    email: address,
  });
  status(patched, 200);
  assert.ok(
    patched.json().duplicates.some((item: any) => item.id === original.id),
  );
  assert.equal((await get(a.client, "contacts", original.id)).name, "Original");
  assert.equal((await list(a.client, "contacts")).total, 4);
});

test("CRM tags são tenant-scoped e exclusão limpa associações sem excluir registros", async () => {
  const a = await register();
  const b = await register();
  const own = await tag(a.client, "VIP");
  const foreign = await tag(b.client, "VIP");
  const record = await create(a.client, "contacts", { tagIds: [own.id] });
  assert.equal(record.tags[0].id, own.id);
  const beforeEvents = await timeline(a.client, "contacts", record.id);
  const listTags = await a.client.request("GET", "/crm/tags");
  status(listTags, 200);
  assert.deepEqual(
    listTags.json().items.map((item: any) => item.id),
    [own.id],
  );
  errorCode(
    await a.client.request("PATCH", `/crm/tags/${foreign.id}`, {
      name: "Intruso",
      color: "#16A34A",
    }),
    404,
    "NOT_FOUND",
  );
  errorCode(
    await a.client.request("DELETE", `/crm/tags/${foreign.id}`),
    404,
    "NOT_FOUND",
  );
  status(
    await a.client.request("POST", "/crm/tags", {
      name: "Cor inválida",
      color: "javascript:alert(1)",
    }),
    400,
  );
  status(
    await a.client.request("PATCH", `/crm/tags/${own.id}`, {
      name: "Preferencial",
      color: "#16A34A",
    }),
    200,
  );
  assert.equal(
    (await get(a.client, "contacts", record.id)).tags[0].name,
    "Preferencial",
  );
  const renameEvents = await timeline(a.client, "contacts", record.id);
  const renamedRecord = await get(a.client, "contacts", record.id);
  assert.equal(renamedRecord.version, record.version + 1);
  assert.equal(
    renameEvents.total,
    beforeEvents.total + 1,
    "Renomear tag deve registrar a mudança na timeline dos registros associados.",
  );
  assert.ok(
    renameEvents.items.some((item: any) =>
      JSON.stringify(item.metadata).includes(own.id),
    ),
  );
  status(await a.client.request("DELETE", `/crm/tags/${own.id}`), 204);
  const untaggedRecord = await get(a.client, "contacts", record.id);
  assert.deepEqual(untaggedRecord.tags, []);
  assert.equal(untaggedRecord.version, renamedRecord.version + 1);
  assert.equal(
    (await timeline(a.client, "contacts", record.id)).total,
    renameEvents.total + 1,
    "Excluir tag deve registrar a remoção da associação na timeline.",
  );
  const audit = await rows(
    db,
    sql`SELECT action,before,after FROM audit_logs WHERE tenant_id=${a.tenant.id} AND subject_id=${own.id}`,
  );
  assert.deepEqual(audit.map((item: any) => item.action).sort(), [
    "tag.created",
    "tag.deleted",
    "tag.updated",
  ]);
  const renameAudit = audit.find((item: any) => item.action === "tag.updated");
  assert.equal(renameAudit!.before.name, "VIP");
  assert.equal(renameAudit!.after.name, "Preferencial");
});

test("CRM edição simultânea de tag e registro não deadlocka nem perde a versão", async () => {
  const a = await register();
  const label = await tag(a.client);
  const record = await create(a.client, "contacts", { tagIds: [label.id] });
  const [rename, edit] = await Promise.all([
    a.client.request("PATCH", `/crm/tags/${label.id}`, {
      name: "Tag revisada",
    }),
    a.client.clone().request("PATCH", `/crm/contacts/${record.id}`, {
      version: record.version,
      description: "Edição concorrente",
      tagIds: [label.id],
    }),
  ]);
  status(rename, 200);
  assert.ok([200, 409].includes(edit.statusCode), edit.body);
  if (edit.statusCode === 409) errorCode(edit, 409, "VERSION_CONFLICT");
  const current = await get(a.client, "contacts", record.id);
  assert.equal(current.tags[0].name, "Tag revisada");
  assert.equal(
    current.version,
    record.version + (edit.statusCode === 200 ? 2 : 1),
  );
  assert.equal(
    (await timeline(a.client, "contacts", record.id)).total,
    current.version,
  );
});

test("CRM notas validam autor/menções e vínculo do registro, com timeline estruturada e atômica", async () => {
  const a = await register();
  const b = await register();
  const own = await create(a.client, "contacts");
  const sibling = await create(a.client, "contacts");
  const foreign = await create(b.client, "contacts");
  const response = await a.client.request(
    "POST",
    `/crm/contacts/${own.id}/notes`,
    {
      body: "Combinamos uma nova reunião.",
      pinned: true,
      mentionIds: [a.user.id],
    },
  );
  status(response, 201);
  const note = response.json().item;
  assert.equal(note.body, "Combinamos uma nova reunião.");
  assert.equal(note.pinned, true);
  assert.deepEqual(note.mentionIds, [a.user.id]);
  assert.equal(note.authorName, a.user.name);
  const before = await timeline(a.client, "contacts", own.id);
  errorCode(
    await a.client.request("POST", `/crm/contacts/${own.id}/notes`, {
      body: "Não persistir",
      mentionIds: [b.user.id],
    }),
    404,
    "NOT_FOUND",
  );
  errorCode(
    await a.client.request(
      "PATCH",
      `/crm/contacts/${own.id}/notes/${note.id}`,
      { body: "Não persistir", mentionIds: [b.user.id] },
    ),
    404,
    "NOT_FOUND",
  );
  for (const method of ["PATCH", "DELETE"]) {
    errorCode(
      await a.client.request(
        method,
        `/crm/contacts/${sibling.id}/notes/${note.id}`,
        method === "PATCH" ? { body: "Outra pessoa" } : undefined,
      ),
      404,
      "NOT_FOUND",
    );
    errorCode(
      await b.client.request(
        method,
        `/crm/contacts/${foreign.id}/notes/${note.id}`,
        method === "PATCH" ? { body: "Outro tenant" } : undefined,
      ),
      404,
      "NOT_FOUND",
    );
  }
  assert.equal(
    (await timeline(a.client, "contacts", own.id)).total,
    before.total,
  );
  const updated = await a.client.request(
    "PATCH",
    `/crm/contacts/${own.id}/notes/${note.id}`,
    { body: "Reunião confirmada", pinned: false, mentionIds: [] },
  );
  status(updated, 200);
  assert.deepEqual(updated.json().item.mentionIds, []);
  status(
    await a.client.request(
      "DELETE",
      `/crm/contacts/${own.id}/notes/${note.id}`,
    ),
    204,
  );
  const notes = await a.client.request("GET", `/crm/contacts/${own.id}/notes`);
  status(notes, 200);
  assert.equal(notes.json().items.length, 0);
  const events = await timeline(a.client, "contacts", own.id);
  for (const type of [
    "created",
    "note.created",
    "note.updated",
    "note.deleted",
  ])
    assert.ok(
      events.items.some((item: any) => item.type === type),
      type,
    );
  for (const event of events.items) {
    assert.equal(event.actorName, a.user.name);
    assert.ok(event.createdAt);
    assert.equal(typeof event.metadata, "object");
  }
  const audit = await one(
    db,
    sql`SELECT count(*)::int AS count FROM audit_logs WHERE tenant_id=${a.tenant.id} AND action LIKE '%note%'`,
  );
  assert.ok(audit!.count >= 3);
  const noteHistory = await one(
    db,
    sql`SELECT before,after FROM audit_logs WHERE tenant_id=${a.tenant.id} AND subject_id=${own.id} AND action='contacts.note.updated'`,
  );
  assert.equal(noteHistory!.before.body, "Combinamos uma nova reunião.");
  assert.equal(noteHistory!.after.body, "Reunião confirmada");
});

test("CRM RBAC: VIEWER só lê, SALES atualiza sem excluir, SUPPORT respeita cada entidade", async () => {
  const owner = await register();
  const viewer = await member(owner, "VIEWER");
  const sales = await member(owner, "SALES");
  const support = await member(owner, "SUPPORT");
  const manager = await member(owner, "MANAGER");
  for (const kind of kinds) {
    const record = await create(owner.client, kind);
    status(await viewer.client.request("GET", `/crm/${kind}`), 200);
    status(
      await viewer.client.request("GET", `/crm/${kind}/${record.id}/timeline`),
      200,
    );
    for (const [method, route, body] of [
      ["POST", `/crm/${kind}`, { name: "Negado" }],
      [
        "PATCH",
        `/crm/${kind}/${record.id}`,
        { version: record.version, name: "Negado" },
      ],
      ["DELETE", `/crm/${kind}/${record.id}`, undefined],
      ["POST", `/crm/${kind}/${record.id}/notes`, { body: "Negado" }],
    ] as const)
      errorCode(
        await viewer.client.request(method, route, body),
        403,
        "FORBIDDEN",
      );
    errorCode(
      await viewer.client.request("GET", `/crm/${kind}?deleted=true`),
      403,
      "FORBIDDEN",
    );
    const changed = await sales.client.request(
      "PATCH",
      `/crm/${kind}/${record.id}`,
      { version: record.version, description: "Atualizado pelo comercial" },
    );
    status(changed, 200);
    errorCode(
      await sales.client.request("DELETE", `/crm/${kind}/${record.id}`),
      403,
      "FORBIDDEN",
    );
    errorCode(
      await sales.client.request(
        "DELETE",
        `/crm/${kind}/${record.id}/permanent`,
      ),
      403,
      "FORBIDDEN",
    );
    const supportPatch = await support.client.request(
      "PATCH",
      `/crm/${kind}/${record.id}`,
      { version: changed.json().item.version, description: "Atendimento" },
    );
    status(supportPatch, kind === "leads" ? 403 : 200);
    status(
      await manager.client.request("DELETE", `/crm/${kind}/${record.id}`),
      204,
    );
    status(
      await viewer.client.request("GET", `/crm/${kind}/${record.id}`),
      404,
    );
    errorCode(
      await manager.client.request(
        "DELETE",
        `/crm/${kind}/${record.id}/permanent`,
      ),
      403,
      "FORBIDDEN",
    );
    status(
      await manager.client.request(
        "POST",
        `/crm/${kind}/${record.id}/restore`,
        {},
      ),
      200,
    );
  }
  status(await viewer.client.request("GET", "/crm/assignees"), 200);
  errorCode(
    await viewer.client.request("POST", "/crm/tags", {
      name: "Negado",
      color: "#4F46E5",
    }),
    403,
    "FORBIDDEN",
  );
  await tag(sales.client);
  const lead = await create(sales.client, "leads");
  errorCode(
    await support.client.request("POST", `/crm/leads/${lead.id}/convert`, {}),
    403,
    "FORBIDDEN",
  );
  status(
    await sales.client.request("POST", `/crm/leads/${lead.id}/convert`, {}),
    200,
  );
});

test("CRM optimistic locking permite uma única atualização concorrente e um único evento", async () => {
  const a = await register();
  const record = await create(a.client, "contacts");
  const before = await timeline(a.client, "contacts", record.id);
  const responses = await Promise.all(
    ["Atualização A", "Atualização B"].map((name) =>
      a.client.clone().request("PATCH", `/crm/contacts/${record.id}`, {
        name,
        version: record.version,
      }),
    ),
  );
  assert.deepEqual(
    responses.map((response) => response.statusCode).sort(),
    [200, 409],
  );
  errorCode(
    responses.find((response) => response.statusCode === 409),
    409,
    "VERSION_CONFLICT",
  );
  const current = await get(a.client, "contacts", record.id);
  assert.equal(current.version, record.version + 1);
  assert.ok(["Atualização A", "Atualização B"].includes(current.name));
  assert.equal(
    (await timeline(a.client, "contacts", record.id)).total,
    before.total + 1,
  );
  status(
    await a.client.request("PATCH", `/crm/contacts/${record.id}`, {
      name: "Sem versão",
    }),
    400,
  );
});

test("CRM timeline inclui apenas campos alterados e rótulos legíveis, com snapshot completo na auditoria", async () => {
  const a = await register();
  const sales = await member(a, "SALES");
  const firstCompany = await create(a.client, "companies", {
    name: "Empresa anterior",
  });
  const secondCompany = await create(a.client, "companies", {
    name: "Empresa seguinte",
  });
  const firstTag = await tag(a.client, "Alfa");
  const secondTag = await tag(a.client, "Beta");
  const lead = await create(a.client, "leads", {
    name: "Lead sem mudança de nome",
    companyId: firstCompany.id,
    assignedTo: a.user.id,
    tagIds: [firstTag.id, secondTag.id],
    estimatedValue: "123.40",
    nextContactAt: "2026-10-02T12:00:00Z",
  });
  const response = await a.client.request("PATCH", `/crm/leads/${lead.id}`, {
    version: lead.version,
    name: lead.name,
    tagIds: [secondTag.id, firstTag.id],
    estimatedValue: "00123.4",
    nextContactAt: "2026-10-02T08:00:00-04:00",
    description: "Única mudança real",
  });
  status(response, 200);
  const firstUpdate = (await timeline(a.client, "leads", lead.id)).items.find(
    (item: any) => item.type === "updated",
  );
  assert.deepEqual(
    firstUpdate.metadata.changes.map((change: any) => change.field),
    ["description"],
  );
  const reassigned = await a.client.request("PATCH", `/crm/leads/${lead.id}`, {
    version: response.json().item.version,
    assignedTo: sales.user.id,
    companyId: secondCompany.id,
    tagIds: [secondTag.id],
    name: lead.name,
  });
  status(reassigned, 200);
  const update = (await timeline(a.client, "leads", lead.id)).items.find(
    (item: any) => item.type === "updated",
  );
  const changes = new Map<string, any>(
    update.metadata.changes.map((change: any) => [change.field, change]),
  );
  assert.deepEqual([...changes.keys()].sort(), [
    "assignedTo",
    "companyId",
    "tagIds",
  ]);
  assert.equal(changes.get("assignedTo").beforeLabel, a.user.name);
  assert.equal(changes.get("assignedTo").afterLabel, sales.user.name);
  assert.equal(changes.get("companyId").beforeLabel, firstCompany.name);
  assert.equal(changes.get("companyId").afterLabel, secondCompany.name);
  assert.ok(changes.get("tagIds").beforeLabel.includes(firstTag.name));
  assert.ok(changes.get("tagIds").beforeLabel.includes(secondTag.name));
  assert.equal(changes.get("tagIds").afterLabel, secondTag.name);
  const audit = await one(
    db,
    sql`SELECT before,after FROM audit_logs WHERE tenant_id=${a.tenant.id} AND subject_id=${lead.id} AND action='leads.updated' ORDER BY created_at DESC,id DESC LIMIT 1`,
  );
  assert.deepEqual(
    audit!.before.tags.map((item: any) => item.id).sort(),
    [firstTag.id, secondTag.id].sort(),
  );
  assert.equal(audit!.before.assignedToName, a.user.name);
  assert.equal(audit!.after.assignedToName, sales.user.name);
});

test("CRM conversão concorrente é transacional e idempotente, sem contatos ou empresas duplicados", async () => {
  const a = await register();
  const lead = await create(a.client, "leads", {
    name: "Lead de conversão",
    email: "conversao@example.test",
    companyName: "Empresa a criar",
    estimatedValue: "12345.67",
    assignedTo: a.user.id,
  });
  assert.equal(lead.estimatedValue, "12345.67");
  const responses = await Promise.all(
    [a.client, a.client.clone()].map((client) =>
      client.request("POST", `/crm/leads/${lead.id}/convert`, {
        createCompany: true,
      }),
    ),
  );
  responses.forEach((response) => status(response, 200));
  const result = responses[0]!.json();
  const concurrent = responses[1]!.json();
  assert.equal(result.lead.status, "CONVERTED");
  assert.equal(result.lead.convertedContactId, result.contact.id);
  assert.equal(result.lead.convertedCompanyId, result.company.id);
  assert.equal(concurrent.contact.id, result.contact.id);
  assert.equal(concurrent.company.id, result.company.id);
  assert.equal(result.contact.companyId, result.company.id);
  assert.equal(result.company.name, "Empresa a criar");
  const repeated = await a.client.request(
    "POST",
    `/crm/leads/${lead.id}/convert`,
    { createCompany: true },
  );
  status(repeated, 200);
  assert.equal(repeated.json().contact.id, result.contact.id);
  assert.equal((await list(a.client, "contacts")).total, 1);
  assert.equal((await list(a.client, "companies")).total, 1);
  assert.equal(
    (await timeline(a.client, "leads", lead.id)).items.filter(
      (item: any) => item.type === "converted",
    ).length,
    1,
  );
  const changed = await a.client.request("PATCH", `/crm/leads/${lead.id}`, {
    version: result.lead.version,
    status: "NEW",
  });
  errorCode(changed, 409, "CONVERTED_LEAD");
});

test("CRM conversão associa referências existentes e recusa referências de outro tenant ou excluídas", async () => {
  const a = await register();
  const b = await register();
  const contact = await create(a.client, "contacts");
  const company = await create(a.client, "companies");
  const foreignContact = await create(b.client, "contacts");
  const foreignCompany = await create(b.client, "companies");
  const lead = await create(a.client, "leads", {
    companyName: "Não criar parcialmente",
  });
  const auditBefore = await one(
    db,
    sql`SELECT count(*)::int AS count FROM audit_logs WHERE tenant_id=${a.tenant.id}`,
  );
  for (const payload of [
    { contactId: foreignContact.id },
    { contactId: foreignContact.id, createCompany: true },
    { companyId: foreignCompany.id, createCompany: false },
    { contactId: company.id },
  ]) {
    errorCode(
      await a.client.request("POST", `/crm/leads/${lead.id}/convert`, payload),
      404,
      "NOT_FOUND",
    );
    assert.equal((await get(a.client, "leads", lead.id)).status, "NEW");
    assert.equal((await list(a.client, "contacts")).total, 1);
    assert.equal(
      (await list(a.client, "companies")).total,
      1,
      "Uma empresa criada antes de validar contato estrangeiro deve sofrer rollback.",
    );
    const auditAfter = await one(
      db,
      sql`SELECT count(*)::int AS count FROM audit_logs WHERE tenant_id=${a.tenant.id}`,
    );
    assert.equal(
      auditAfter!.count,
      auditBefore!.count,
      "Conversão abortada não pode deixar auditoria de operação não confirmada.",
    );
  }
  for (const [kind, item] of [
    ["contacts", contact],
    ["companies", company],
  ] as const) {
    status(await a.client.request("DELETE", `/crm/${kind}/${item.id}`), 204);
    errorCode(
      await a.client.request(
        "POST",
        `/crm/leads/${lead.id}/convert`,
        kind === "contacts" ? { contactId: item.id } : { companyId: item.id },
      ),
      404,
      "NOT_FOUND",
    );
    status(
      await a.client.request("POST", `/crm/${kind}/${item.id}/restore`, {}),
      200,
    );
  }
  const response = await a.client.request(
    "POST",
    `/crm/leads/${lead.id}/convert`,
    { contactId: contact.id, companyId: company.id },
  );
  status(response, 200);
  assert.equal(response.json().contact.id, contact.id);
  assert.equal(response.json().company.id, company.id);
  assert.equal((await list(a.client, "contacts")).total, 1);
  assert.equal((await list(a.client, "companies")).total, 1);
  errorCode(
    await b.client.request("POST", `/crm/leads/${lead.id}/convert`, {}),
    404,
    "NOT_FOUND",
  );
});

test("CRM lixeira mantém histórico, restaura com nova versão e purge remove dependências preservando auditoria", async () => {
  const a = await register();
  const label = await tag(a.client);
  const contact = await create(a.client, "contacts", { tagIds: [label.id] });
  const note = await a.client.request(
    "POST",
    `/crm/contacts/${contact.id}/notes`,
    { body: "Histórico preservado", mentionIds: [a.user.id] },
  );
  status(note, 201);
  status(
    await a.client.request("DELETE", `/crm/contacts/${contact.id}/permanent`),
    409,
  );
  status(await a.client.request("DELETE", `/crm/contacts/${contact.id}`), 204);
  assert.equal((await list(a.client, "contacts")).total, 0);
  assert.equal(
    (await list(a.client, "contacts", "?deleted=true")).items[0].id,
    contact.id,
  );
  errorCode(
    await a.client.request("PATCH", `/crm/contacts/${contact.id}`, {
      version: contact.version,
      name: "Não alterar lixeira",
    }),
    409,
    "DELETED_RECORD",
  );
  errorCode(
    await a.client.request("POST", `/crm/contacts/${contact.id}/notes`, {
      body: "Não adicionar",
    }),
    409,
    "DELETED_RECORD",
  );
  const deletedNotes = await a.client.request(
    "GET",
    `/crm/contacts/${contact.id}/notes`,
  );
  status(deletedNotes, 200);
  assert.equal(deletedNotes.json().items.length, 1);
  const restored = await a.client.request(
    "POST",
    `/crm/contacts/${contact.id}/restore`,
    {},
  );
  status(restored, 200);
  assert.equal(restored.json().item.deletedAt, null);
  assert.ok(restored.json().item.version > contact.version);
  errorCode(
    await a.client.request("PATCH", `/crm/contacts/${contact.id}`, {
      version: contact.version,
      name: "Versão anterior",
    }),
    409,
    "VERSION_CONFLICT",
  );
  const events = await timeline(a.client, "contacts", contact.id);
  assert.ok(events.items.some((item: any) => item.type === "deleted"));
  assert.ok(events.items.some((item: any) => item.type === "restored"));
  status(await a.client.request("DELETE", `/crm/contacts/${contact.id}`), 204);
  status(
    await a.client.request("DELETE", `/crm/contacts/${contact.id}/permanent`),
    204,
  );
  status(await a.client.request("GET", `/crm/contacts/${contact.id}`), 404);
  assert.equal((await list(a.client, "contacts", "?deleted=true")).total, 0);
  for (const [table, field, id] of [
    ["crm_records", "id", contact.id],
    ["crm_notes", "record_id", contact.id],
    ["crm_events", "record_id", contact.id],
    ["crm_record_tags", "record_id", contact.id],
    ["crm_note_mentions", "note_id", note.json().item.id],
  ]) {
    const result = await tenantQuery(
      a.tenant.id,
      sql`SELECT count(*)::int AS count FROM ${sql.identifier(table!)} WHERE ${sql.identifier(field!)}=${id}`,
    );
    assert.equal(result[0]!.count, 0, table);
  }
  const audits = await one(
    db,
    sql`SELECT count(*)::int AS count FROM audit_logs WHERE tenant_id=${a.tenant.id} AND subject_id=${contact.id}`,
  );
  assert.ok(audits!.count >= 4);
});

test("CRM purge impede referências comerciais penduradas, inclusive referências de conversão", async () => {
  const a = await register();
  const company = await create(a.client, "companies");
  const contact = await create(a.client, "contacts", { companyId: company.id });
  status(await a.client.request("DELETE", `/crm/companies/${company.id}`), 204);
  errorCode(
    await a.client.request("DELETE", `/crm/companies/${company.id}/permanent`),
    409,
    "REFERENCED_RECORD",
  );
  status(await a.client.request("DELETE", `/crm/contacts/${contact.id}`), 204);
  errorCode(
    await a.client.request("DELETE", `/crm/companies/${company.id}/permanent`),
    409,
    "REFERENCED_RECORD",
  );
  status(
    await a.client.request("DELETE", `/crm/contacts/${contact.id}/permanent`),
    204,
  );
  status(
    await a.client.request("DELETE", `/crm/companies/${company.id}/permanent`),
    204,
  );
  const lead = await create(a.client, "leads");
  const conversion = await a.client.request(
    "POST",
    `/crm/leads/${lead.id}/convert`,
    {},
  );
  status(conversion, 200);
  const target = conversion.json().contact;
  status(await a.client.request("DELETE", `/crm/contacts/${target.id}`), 204);
  errorCode(
    await a.client.request("DELETE", `/crm/contacts/${target.id}/permanent`),
    409,
    "REFERENCED_RECORD",
  );
});

test("CRM RLS forçada falha fechada sem contexto e não reutiliza tenant após a transação", async () => {
  const a = await register();
  const b = await register();
  const record = await create(a.client, "contacts");
  const label = await tag(a.client);
  const withTag = await a.client.request(
    "PATCH",
    `/crm/contacts/${record.id}`,
    { version: record.version, tagIds: [label.id] },
  );
  status(withTag, 200);
  status(
    await a.client.request("POST", `/crm/contacts/${record.id}/notes`, {
      body: "Registro com dependências",
      mentionIds: [a.user.id],
    }),
    201,
  );
  const role = await one(
    db,
    sql`SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user`,
  );
  assert.equal(role!.rolsuper, false);
  assert.equal(role!.rolbypassrls, false);
  const tables = [
    "crm_records",
    "crm_tags",
    "crm_record_tags",
    "crm_notes",
    "crm_note_mentions",
    "crm_events",
  ];
  for (const table of tables) {
    const policy = await one(
      db,
      sql`SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE relnamespace=current_schema()::regnamespace AND relname=${table}`,
    );
    assert.equal(policy!.relrowsecurity, true, table);
    assert.equal(policy!.relforcerowsecurity, true, table);
    assert.equal(
      (await rows(db, sql`SELECT * FROM ${sql.identifier(table)}`)).length,
      0,
      `${table} sem contexto`,
    );
    assert.ok(
      (
        await tenantQuery(
          a.tenant.id,
          sql`SELECT * FROM ${sql.identifier(table)}`,
        )
      ).length > 0,
      `${table} tenant A`,
    );
    assert.equal(
      (
        await tenantQuery(
          b.tenant.id,
          sql`SELECT * FROM ${sql.identifier(table)}`,
        )
      ).length,
      0,
      `${table} tenant B`,
    );
  }
  await assert.rejects(
    db.execute(
      sql`INSERT INTO crm_records(tenant_id,kind,name) VALUES(${a.tenant.id},'contacts','Sem contexto')`,
    ),
    (error: any) => (error.code ?? error.cause?.code) === "42501",
  );
  await assert.rejects(
    tenantQuery(
      a.tenant.id,
      sql`INSERT INTO crm_records(tenant_id,kind,name) VALUES(${b.tenant.id},'contacts','Outro tenant')`,
    ),
    (error: any) => (error.code ?? error.cause?.code) === "42501",
  );
  assert.equal(
    (
      await tenantQuery(
        b.tenant.id,
        sql`UPDATE crm_records SET name='Negado' WHERE id=${record.id} RETURNING id`,
      )
    ).length,
    0,
  );
  assert.equal((await rows(db, sql`SELECT * FROM crm_records`)).length, 0);
});

test("CRM FKs compostas bloqueiam associações entre tenants e referências ao tipo incorreto no próprio banco", async () => {
  const a = await register();
  const b = await register();
  const ca = await create(a.client, "contacts");
  const cb = await create(b.client, "contacts");
  const companyB = await create(b.client, "companies");
  const ta = await tag(a.client);
  const tb = await tag(b.client);
  const na = await a.client.request("POST", `/crm/contacts/${ca.id}/notes`, {
    body: "Nota A",
  });
  status(na, 201);
  const nb = await b.client.request("POST", `/crm/contacts/${cb.id}/notes`, {
    body: "Nota B",
  });
  status(nb, 201);
  const statements = [
    sql`INSERT INTO crm_records(tenant_id,kind,name,company_id) VALUES(${a.tenant.id},'contacts','Empresa estrangeira',${companyB.id})`,
    sql`INSERT INTO crm_records(tenant_id,kind,name,company_id) VALUES(${a.tenant.id},'contacts','Tipo incorreto',${ca.id})`,
    sql`INSERT INTO crm_records(tenant_id,kind,name,assigned_to) VALUES(${a.tenant.id},'contacts','Responsável estrangeiro',${b.user.id})`,
    sql`INSERT INTO crm_records(tenant_id,kind,name,status,temperature,converted_contact_id) VALUES(${a.tenant.id},'leads','Conversão estrangeira','CONVERTED','WARM',${cb.id})`,
    sql`INSERT INTO crm_record_tags(tenant_id,record_id,tag_id) VALUES(${a.tenant.id},${ca.id},${tb.id})`,
    sql`INSERT INTO crm_record_tags(tenant_id,record_id,tag_id) VALUES(${a.tenant.id},${cb.id},${ta.id})`,
    sql`INSERT INTO crm_notes(tenant_id,record_id,author_id,body) VALUES(${a.tenant.id},${cb.id},${a.user.id},'Registro estrangeiro')`,
    sql`INSERT INTO crm_notes(tenant_id,record_id,author_id,body) VALUES(${a.tenant.id},${ca.id},${b.user.id},'Autor estrangeiro')`,
    sql`INSERT INTO crm_note_mentions(tenant_id,note_id,user_id) VALUES(${a.tenant.id},${na.json().item.id},${b.user.id})`,
    sql`INSERT INTO crm_note_mentions(tenant_id,note_id,user_id) VALUES(${a.tenant.id},${nb.json().item.id},${a.user.id})`,
    sql`INSERT INTO crm_events(tenant_id,record_id,actor_id,type) VALUES(${a.tenant.id},${cb.id},${a.user.id},'created')`,
    sql`INSERT INTO crm_events(tenant_id,record_id,actor_id,type) VALUES(${a.tenant.id},${ca.id},${b.user.id},'created')`,
  ];
  for (const statement of statements)
    await assert.rejects(
      tenantQuery(a.tenant.id, statement),
      (error: any) => (error.code ?? error.cause?.code) === "23503",
    );
});

test("CRM valida estados de leads e campos de sistema na API sem aceitar conversão forjada", async () => {
  const a = await register();
  for (const input of [
    { status: "DISCARDED" },
    { status: "CONVERTED" },
    { estimatedValue: "-1.00" },
    { convertedContactId: randomUUID() },
    { version: 20 },
    { deletedAt: new Date().toISOString() },
  ])
    status(
      await a.client.request("POST", "/crm/leads", {
        name: "Entrada inválida",
        ...input,
      }),
      400,
    );
  status(
    await a.client.request("POST", "/crm/contacts", {
      name: "Data inválida",
      birthday: "2026-02-31",
    }),
    400,
  );
  const discarded = await create(a.client, "leads", {
    status: "DISCARDED",
    discardReason: "Fora do perfil",
  });
  assert.equal(discarded.discardReason, "Fora do perfil");
  await assert.rejects(
    tenantQuery(
      a.tenant.id,
      sql`INSERT INTO crm_records(tenant_id,kind,name,status,temperature) VALUES(${a.tenant.id},'leads','Descarte sem motivo','DISCARDED','COLD')`,
    ),
    (error: any) => (error.code ?? error.cause?.code) === "23514",
  );
});
