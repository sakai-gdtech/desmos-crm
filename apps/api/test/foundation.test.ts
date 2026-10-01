import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, scryptSync } from "node:crypto";
import { config as dotenv } from "dotenv";
import { sql } from "drizzle-orm";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import pg from "pg";
dotenv({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});
if (!process.env.TEST_DATABASE_URL)
  throw new Error(
    "TEST_DATABASE_URL é obrigatório e deve apontar para um banco de teste separado.",
  );
const testUrl = new URL(process.env.TEST_DATABASE_URL);
if (!/test/i.test(testUrl.pathname))
  throw new Error("O nome do banco de testes deve conter test.");
// Each run owns a fresh schema in the dedicated test database. Legacy fixtures
// remain untouched, and migrations are verified from scratch on every run.
const schemaName = `foundation_${randomUUID().replaceAll("-", "")}`;
const bootstrap = new pg.Pool({ connectionString: testUrl.toString() });
testUrl.searchParams.set("options", `-c search_path=${schemaName}`);
process.env.DATABASE_URL = testUrl.toString();
process.env.NODE_ENV = "test";
const { buildApp } = await import("../src/app.js");
const { db, pool, one, rows } =
  await import("../src/infrastructure/database.js");
const { migrate } = await import("../src/infrastructure/migrate.js");
const { tokenHash } = await import("../src/shared/crypto.js");
const app = await buildApp({ logger: false });
const origin = process.env.WEB_URL ?? "http://localhost:3017";
const secret = "TestingPassword-123!";
let ipSequence = 1;
const ipRun = Math.floor(Math.random() * 200) + 1;
class Client {
  cookies = new Map<string, string>();
  ip = `10.${ipRun}.0.${ipSequence++}`;
  async request(
    method: any,
    url: string,
    payload?: unknown,
    extra: Record<string, string> = {},
  ) {
    const result = await app.inject({
      method,
      url,
      payload: payload as any,
      remoteAddress: this.ip,
      headers: {
        origin,
        cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
        ...extra,
      },
    });
    for (const cookie of result.cookies) {
      if (cookie.value) this.cookies.set(cookie.name, cookie.value);
      else this.cookies.delete(cookie.name);
    }
    return result;
  }
  clone() {
    const next = new Client();
    next.cookies = new Map(this.cookies);
    return next;
  }
}
const freshEmail = () => `${randomUUID()}@test.orbit.local`;
async function register(company = "Empresa de teste") {
  const client = new Client();
  const email = freshEmail();
  const response = await client.request("POST", "/auth/register", {
    name: "Pessoa de Teste",
    email,
    password: secret,
    companyName: company,
  });
  assert.equal(response.statusCode, 201, response.body);
  const me = (await client.request("GET", "/me")).json();
  return { client, email, ...me };
}
async function mailToken(email: string, path: string) {
  const mail = await one(
    db,
    sql`SELECT body FROM outbox WHERE recipient=${email} AND body LIKE ${`%${path}?token=%`} ORDER BY created_at DESC,id DESC LIMIT 1`,
  );
  assert.ok(mail);
  const token = /\?token=([A-Za-z0-9_-]+)/.exec(mail.body)?.[1];
  assert.ok(token);
  return token;
}
before(async () => {
  await bootstrap.query(`CREATE SCHEMA "${schemaName}"`);
  await migrate();
  await app.ready();
});
test("rate limit retorna 429, separa usuários atrás do proxy e agrega sessões e tokens inválidos", async () => {
  const a = await register("Limite A"),
    b = await register("Limite B");
  b.client.ip = a.client.ip;
  let limited;
  for (let i = 0; i < 201; i++) limited = await a.client.request("GET", "/me");
  assert.equal(limited!.statusCode, 429, limited!.body);
  assert.equal(limited!.json().error.code, "RATE_LIMITED");
  assert.ok(limited!.headers["retry-after"]);
  assert.equal((await b.client.request("GET", "/me")).statusCode, 200);
  assert.equal((await a.client.clone().request("GET", "/me")).statusCode, 429);
  const anonymous = new Client();
  for (let i = 0; i < 201; i++) {
    anonymous.cookies.set("orbit_access", randomUUID());
    limited = await anonymous.request("GET", "/health");
  }
  assert.equal(limited!.statusCode, 429, limited!.body);
  assert.equal(limited!.json().error.code, "RATE_LIMITED");
});
after(async () => {
  await app.close();
  await pool.end();
  await bootstrap.query(`DROP SCHEMA "${schemaName}" CASCADE`);
  await bootstrap.end();
});
test("cadastro transacional, cookies seguros, identidade e dados estritos", async () => {
  const { client, user, tenant, membership } = await register();
  assert.equal(membership.role, "OWNER");
  assert.equal(user.emailVerifiedAt, null);
  assert.equal(tenant.onboardingCompletedAt, null);
  const stored = await one(
    db,
    sql`SELECT password_hash FROM users WHERE id=${user.id}`,
  );
  assert.ok(stored!.password_hash.startsWith("scrypt:"));
  assert.ok(!stored!.password_hash.includes(secret));
  const count = await one(
    db,
    sql`SELECT count(*)::int AS count FROM memberships WHERE tenant_id=${tenant.id}`,
  );
  assert.equal(count!.count, 1);
  const refresh = client.cookies.get("orbit_refresh")!;
  assert.ok(
    await one(
      db,
      sql`SELECT id FROM refresh_tokens WHERE token_hash=${tokenHash(refresh)}`,
    ),
  );
  const invalid = await client.request("PATCH", "/me", {
    name: "Nome Atualizado",
    role: "OWNER",
  });
  assert.equal(invalid.statusCode, 400);
  const withoutOrigin = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: user.email, password: secret },
  });
  assert.equal(withoutOrigin.statusCode, 403);
  const login = await new Client().request("POST", "/auth/login", {
    email: user.email,
    password: secret,
  });
  assert.equal(login.statusCode, 200);
  assert.ok(
    login.cookies.every(
      (cookie) =>
        cookie.httpOnly && cookie.path === "/" && cookie.sameSite === "Lax",
    ),
  );
});
test("refresh é atômico; replay revoga família e o access anterior", async () => {
  const { client } = await register();
  const original = client.clone();
  const rotated = await client.request("POST", "/auth/refresh");
  assert.equal(rotated.statusCode, 200);
  assert.notEqual(
    client.cookies.get("orbit_refresh"),
    original.cookies.get("orbit_refresh"),
  );
  assert.equal(
    (await original.request("POST", "/auth/refresh")).statusCode,
    401,
  );
  assert.equal((await client.request("GET", "/me")).statusCode, 401);
});
test("duas rotações concorrentes: uma vence, replay revoga a família inteira", async () => {
  const { client } = await register();
  const other = client.clone();
  const responses = await Promise.all([
    client.request("POST", "/auth/refresh"),
    other.request("POST", "/auth/refresh"),
  ]);
  assert.deepEqual(responses.map((r) => r.statusCode).sort(), [200, 401]);
  assert.equal((await client.request("GET", "/me")).statusCode, 401);
  assert.equal((await other.request("GET", "/me")).statusCode, 401);
});
test("logout revoga imediatamente; sessões são próprias e revogáveis", async () => {
  const a = await register();
  const b = await register();
  const other = a.client.clone();
  const sessions = (await a.client.request("GET", "/sessions")).json().items;
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].isCurrent, true);
  assert.equal(
    (await b.client.request("DELETE", `/sessions/${sessions[0].id}`))
      .statusCode,
    404,
  );
  assert.equal(
    (await a.client.request("POST", "/auth/logout")).statusCode,
    200,
  );
  assert.equal((await other.request("GET", "/me")).statusCode, 401);
});
test("isolamento entre empresas em leitura, alteração, auditoria e troca", async () => {
  const a = await register("Empresa A");
  const b = await register("Empresa B");
  assert.equal(
    (
      await a.client.request("POST", "/auth/switch-tenant", {
        tenantId: b.tenant.id,
      })
    ).statusCode,
    404,
  );
  assert.equal(
    (
      await a.client.request("PATCH", `/memberships/${b.membership.id}`, {
        status: "SUSPENDED",
      })
    ).statusCode,
    404,
  );
  assert.equal(
    (await a.client.request("GET", "/memberships")).json().items.length,
    1,
  );
  const audits = (await a.client.request("GET", "/audit-logs")).json().items;
  assert.ok(audits.every((audit: any) => audit.entityId !== b.tenant.id));
  assert.equal(
    (
      await a.client.request("PATCH", "/tenants/current", {
        name: "Empresa A alterada",
        tenantId: b.tenant.id,
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await a.client.request(
        "PATCH",
        "/tenants/current",
        { name: "Empresa incorreta" },
        { "x-expected-tenant-id": b.tenant.id },
      )
    ).statusCode,
    409,
  );
  assert.equal(
    (await b.client.request("GET", "/tenants/current")).json().tenant.name,
    "Empresa B",
  );
});
test("invariantes de proprietário e alteração concorrente dos últimos donos", async () => {
  const a = await register();
  assert.equal(
    (
      await a.client.request("PATCH", `/memberships/${a.membership.id}`, {
        status: "SUSPENDED",
      })
    ).statusCode,
    409,
  );
  const email = freshEmail();
  assert.equal(
    (await a.client.request("POST", "/invitations", { email, role: "OWNER" }))
      .statusCode,
    201,
  );
  const member = new Client();
  assert.equal(
    (
      await member.request("POST", "/auth/accept-invitation", {
        token: await mailToken(email, "/accept-invitation"),
        name: "Segundo Dono",
        password: secret,
      })
    ).statusCode,
    201,
  );
  const id = (await member.request("GET", "/me")).json().membership.id;
  const responses = await Promise.all([
    a.client.request("PATCH", `/memberships/${a.membership.id}`, {
      role: "SALES",
    }),
    member.request("PATCH", `/memberships/${id}`, { role: "SALES" }),
  ]);
  assert.deepEqual(responses.map((r) => r.statusCode).sort(), [200, 409]);
  const owners = await one(
    db,
    sql`SELECT count(*)::int AS count FROM memberships WHERE tenant_id=${a.tenant.id} AND role='OWNER' AND status='ACTIVE'`,
  );
  assert.equal(owners!.count, 1);
});
test("RBAC impede escalação de ADMIN e bloqueio tem efeito imediato", async () => {
  const owner = await register();
  const email = freshEmail();
  await owner.client.request("POST", "/invitations", { email, role: "ADMIN" });
  const admin = new Client();
  await admin.request("POST", "/auth/accept-invitation", {
    token: await mailToken(email, "/accept-invitation"),
    name: "Pessoa Admin",
    password: secret,
  });
  const membership = (await admin.request("GET", "/me")).json().membership;
  assert.equal(
    (
      await admin.request("PATCH", `/memberships/${membership.id}`, {
        role: "OWNER",
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await admin.request("PATCH", `/memberships/${owner.membership.id}`, {
        status: "SUSPENDED",
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await admin.request("POST", "/invitations", {
        email: freshEmail(),
        role: "OWNER",
      })
    ).statusCode,
    403,
  );
  await owner.client.request("PATCH", `/memberships/${membership.id}`, {
    role: "SALES",
  });
  assert.equal((await admin.request("GET", "/memberships")).statusCode, 403);
  assert.equal(
    (
      await admin.request("POST", "/tenants/current/onboarding", {
        segment: "Tecnologia",
        employeeCount: 10,
        salesCount: 3,
        objective: "Organizar vendas",
        salesMotion: "B2B",
      })
    ).statusCode,
    403,
  );
  assert.equal((await admin.request("GET", "/sessions")).statusCode, 200);
  await owner.client.request("PATCH", `/memberships/${membership.id}`, {
    status: "SUSPENDED",
  });
  assert.equal((await admin.request("GET", "/me")).statusCode, 401);
  assert.equal((await admin.request("POST", "/auth/refresh")).statusCode, 401);
});
test("convite exige identidade correspondente, nunca sobrescreve senha e é uso único", async () => {
  const owner = await register();
  const email = freshEmail();
  const user = await one(
    db,
    sql`INSERT INTO users(name,email,password_hash) SELECT 'Conta sem vínculo',${email},password_hash FROM users WHERE id=${owner.user.id} RETURNING id`,
  );
  const existing = { email, user: user!, client: new Client() };
  const outsider = await register();
  await owner.client.request("POST", "/invitations", {
    email: existing.email,
    role: "SALES",
  });
  const token = await mailToken(existing.email, "/accept-invitation");
  const before = await one(
    db,
    sql`SELECT password_hash FROM users WHERE id=${existing.user.id}`,
  );
  assert.equal(
    (
      await outsider.client.request("POST", "/auth/accept-invitation", {
        token,
        name: "Intruso",
        password: "NewPassword123!",
      })
    ).statusCode,
    403,
  );
  assert.equal(
    (
      await new Client().request("POST", "/auth/accept-invitation", {
        token,
        name: "Intruso",
        password: "NewPassword123!",
      })
    ).statusCode,
    401,
  );
  assert.equal(
    (
      await existing.client.request("POST", "/auth/accept-invitation", {
        token,
        password: secret,
      })
    ).statusCode,
    201,
  );
  assert.equal(
    (
      await existing.client.request("POST", "/auth/accept-invitation", {
        token,
      })
    ).statusCode,
    400,
  );
  const after = await one(
    db,
    sql`SELECT password_hash FROM users WHERE id=${existing.user.id}`,
  );
  assert.equal(before!.password_hash, after!.password_hash);
  assert.equal(
    (await existing.client.request("GET", "/me")).json().tenant.id,
    owner.tenant.id,
  );
});
test("conta vinculada a outra empresa não recebe convite, inclusive quando suspensa", async () => {
  const owner = await register();
  const existing = await register();
  for (const status of ["ACTIVE", "SUSPENDED"]) {
    await db.execute(
      sql`UPDATE memberships SET status=${status} WHERE id=${existing.membership.id}`,
    );
    const response = await owner.client.request("POST", "/invitations", {
      email: existing.email,
      role: "SUPPORT",
    });
    assert.equal(response.statusCode, 409, response.body);
    assert.equal(response.json().error.code, "ACCOUNT_COMPANY_CONFLICT");
  }
  assert.equal(
    (
      await new Client().request("POST", "/auth/login", {
        email: existing.email,
        password: secret,
      })
    ).statusCode,
    403,
  );
  const membership = await one(
    db,
    sql`SELECT count(*)::int AS count FROM memberships WHERE user_id=${existing.user.id}`,
  );
  assert.equal(membership!.count, 1);
});
test("convite pendente não transfere uma conta criada depois, mesmo suspensa", async () => {
  const owner = await register();
  const email = freshEmail();
  assert.equal(
    (
      await owner.client.request("POST", "/invitations", {
        email,
        role: "SALES",
      })
    ).statusCode,
    201,
  );
  const token = await mailToken(email, "/accept-invitation");
  const existing = new Client();
  assert.equal(
    (
      await existing.request("POST", "/auth/register", {
        name: "Conta com empresa",
        email,
        password: secret,
        companyName: "Empresa própria",
      })
    ).statusCode,
    201,
  );
  const identity = (await existing.request("GET", "/me")).json();
  for (const status of ["ACTIVE", "SUSPENDED"]) {
    await db.execute(
      sql`UPDATE memberships SET status=${status} WHERE id=${identity.membership.id}`,
    );
    const response = await new Client().request(
      "POST",
      "/auth/accept-invitation",
      { token, password: secret },
    );
    assert.equal(response.statusCode, 409, response.body);
    assert.equal(response.json().error.code, "ACCOUNT_COMPANY_CONFLICT");
  }
  const unchanged = await one(
    db,
    sql`SELECT tenant_id,status FROM memberships WHERE user_id=${identity.user.id}`,
  );
  assert.equal(unchanged!.tenant_id, identity.tenant.id);
  assert.equal(unchanged!.status, "SUSPENDED");
  assert.equal(
    (await one(
      db,
      sql`SELECT accepted_at FROM invitations WHERE token_hash=${tokenHash(token)}`,
    ))!.accepted_at,
    null,
  );
});
test("aceites concorrentes em duas empresas vinculam o novo email a somente uma", async () => {
  const a = await register("Convite A");
  const b = await register("Convite B");
  const email = freshEmail();
  await a.client.request("POST", "/invitations", { email, role: "SALES" });
  const tokenA = await mailToken(email, "/accept-invitation");
  await b.client.request("POST", "/invitations", { email, role: "SUPPORT" });
  const tokenB = await mailToken(email, "/accept-invitation");
  const responses = await Promise.all(
    [tokenA, tokenB].map((token) =>
      new Client().request("POST", "/auth/accept-invitation", {
        token,
        name: "Nova pessoa",
        password: secret,
      }),
    ),
  );
  assert.deepEqual(
    responses.map((response) => response.statusCode).sort(),
    [201, 409],
  );
  assert.equal(
    responses.find((response) => response.statusCode === 409)!.json().error
      .code,
    "ACCOUNT_COMPANY_CONFLICT",
  );
  const memberships = await rows(
    db,
    sql`SELECT m.tenant_id FROM memberships m JOIN users u ON u.id=m.user_id WHERE u.email=${email}`,
  );
  assert.equal(memberships.length, 1);
  assert.ok([a.tenant.id, b.tenant.id].includes(memberships[0]!.tenant_id));
  const accepted = await one(
    db,
    sql`SELECT count(*)::int AS count FROM invitations WHERE email=${email} AND accepted_at IS NOT NULL`,
  );
  assert.equal(accepted!.count, 1);
});
test("restrição no banco impede segundo vínculo, inclusive após suspensão", async () => {
  const a = await register();
  const b = await register();
  await db.execute(
    sql`UPDATE memberships SET status='SUSPENDED' WHERE id=${a.membership.id}`,
  );
  await assert.rejects(
    db.execute(
      sql`INSERT INTO memberships(user_id,tenant_id,role) VALUES(${a.user.id},${b.tenant.id},'SALES')`,
    ),
    (error: any) => (error.code ?? error.cause?.code) === "23505",
  );
});
test("migração recusa múltiplos vínculos sem escolher ou apagar dados", async () => {
  const source = await readFile(
    new URL("../migrations/0003_one_company_per_account.sql", import.meta.url),
    "utf8",
  );
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.execute(
        sql`CREATE TEMP TABLE memberships(user_id uuid) ON COMMIT DROP`,
      );
      const id = randomUUID();
      await tx.execute(sql`INSERT INTO memberships VALUES(${id}),(${id})`);
      await tx.execute(sql.raw(source));
    }),
    (error: any) =>
      String(error.cause?.message ?? error.message).includes(
        "One-company migration blocked",
      ),
  );
});
test("verificação e reset usam tokens com hash, expiração e consumo único; reset revoga sessões", async () => {
  const account = await register();
  const verify = await mailToken(account.email, "/verify-email");
  assert.ok(
    await one(
      db,
      sql`SELECT id FROM action_tokens WHERE token_hash=${tokenHash(verify)}`,
    ),
  );
  assert.equal(
    (
      await account.client.request("POST", "/auth/verify-email", {
        token: verify,
      })
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await account.client.request("POST", "/auth/verify-email", {
        token: verify,
      })
    ).statusCode,
    400,
  );
  assert.ok(
    (await account.client.request("GET", "/me")).json().user.emailVerifiedAt,
  );
  const requester = new Client();
  const known = await requester.request("POST", "/auth/forgot-password", {
    email: account.email,
  });
  const unknown = await requester.request("POST", "/auth/forgot-password", {
    email: freshEmail(),
  });
  assert.deepEqual(known.json(), unknown.json());
  const token = await mailToken(account.email, "/reset-password");
  const newer = "DifferentPassword-123!";
  const original = account.client.clone();
  assert.equal(
    (
      await requester.request("POST", "/auth/reset-password", {
        token,
        password: newer,
      })
    ).statusCode,
    200,
  );
  assert.equal(
    (
      await requester.request("POST", "/auth/reset-password", {
        token,
        password: newer,
      })
    ).statusCode,
    400,
  );
  assert.equal((await original.request("GET", "/me")).statusCode, 401);
  assert.equal(
    (await original.request("POST", "/auth/refresh")).statusCode,
    401,
  );
  assert.equal(
    (
      await requester.request("POST", "/auth/login", {
        email: account.email,
        password: secret,
      })
    ).statusCode,
    401,
  );
  assert.equal(
    (
      await requester.request("POST", "/auth/login", {
        email: account.email,
        password: newer,
      })
    ).statusCode,
    200,
  );
  await requester.request("POST", "/auth/forgot-password", {
    email: account.email,
  });
  const expired = await mailToken(account.email, "/reset-password");
  await db.execute(
    sql`UPDATE action_tokens SET expires_at=now()-interval '1 second' WHERE token_hash=${tokenHash(expired)}`,
  );
  assert.equal(
    (
      await requester.request("POST", "/auth/reset-password", {
        token: expired,
        password: secret,
      })
    ).statusCode,
    400,
  );
});
test("cada cadastro possui uma empresa; criação extra é negada e onboarding persiste", async () => {
  const { client, tenant } = await register();
  const separate = await register("Outra conta independente");
  assert.notEqual(tenant.id, separate.tenant.id);
  const countBefore = await one(
    db,
    sql`SELECT count(*)::int AS count FROM tenants`,
  );
  const attempts = await Promise.all(
    [client, client.clone()].map((item) =>
      item.request("POST", "/tenants", { name: "Segunda Empresa" }),
    ),
  );
  for (const response of attempts) {
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().error.code, "ONE_COMPANY_PER_ACCOUNT");
  }
  const countAfter = await one(
    db,
    sql`SELECT count(*)::int AS count FROM tenants`,
  );
  assert.equal(countBefore!.count, countAfter!.count);
  assert.equal(
    (await client.request("GET", "/tenants")).json().items.length,
    1,
  );
  assert.equal(
    (await client.request("GET", "/me")).json().entitlements.limits
      .tenantsPerUser,
    1,
  );
  const onboarding = await client.request(
    "POST",
    "/tenants/current/onboarding",
    {
      segment: "Consultoria",
      employeeCount: 12,
      salesCount: 4,
      objective: "Melhorar vendas",
      salesMotion: "B2B",
    },
  );
  assert.equal(onboarding.statusCode, 200);
  assert.ok(onboarding.json().tenant.onboardingCompletedAt);
  assert.equal(
    (await separate.client.request("GET", "/tenants/current")).json().tenant
      .onboardingCompletedAt,
    null,
  );
  const logs = await rows(
    db,
    sql`SELECT * FROM audit_logs WHERE tenant_id=${tenant.id}`,
  );
  assert.ok(logs.some((row) => row.action === "tenant.onboarded"));
  assert.ok(!JSON.stringify(logs).includes(secret));
});
test("readiness verifica dependências reais", async () => {
  assert.equal((await app.inject("/ready")).statusCode, 200);
});
test("login validado antes de reset concorrente não cria sessão sobrevivente com senha antiga", async () => {
  const account = await register();
  const requester = new Client();
  await requester.request("POST", "/auth/forgot-password", {
    email: account.email,
  });
  const token = await mailToken(account.email, "/reset-password");
  const lock = await pool.connect();
  await lock.query("BEGIN");
  await lock.query("SELECT id FROM users WHERE id=$1 FOR NO KEY UPDATE", [
    account.user.id,
  ]);
  const baseline = Number(
    (
      await pool.query(
        "SELECT count(*) AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'",
      )
    ).rows[0].count,
  );
  async function waitForBlocked(count: number) {
    for (let attempt = 0; attempt < 300; attempt++) {
      const result = await pool.query(
        "SELECT count(*) AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'",
      );
      if (Number(result.rows[0].count) >= baseline + count) return;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    throw new Error("A operação não alcançou o lock de concorrência esperado.");
  }
  let reset: Promise<any> | undefined;
  let login: Promise<any> | undefined;
  try {
    reset = requester.request("POST", "/auth/reset-password", {
      token,
      password: "Changed-during-login-123!",
    });
    await waitForBlocked(1);
    login = new Client().request("POST", "/auth/login", {
      email: account.email,
      password: secret,
    });
    await waitForBlocked(2);
  } finally {
    await lock.query("COMMIT");
    lock.release();
  }
  assert.equal((await reset).statusCode, 200);
  assert.equal((await login).statusCode, 401);
  const live = await one(
    db,
    sql`SELECT count(*)::int AS count FROM sessions WHERE user_id=${account.user.id} AND revoked_at IS NULL`,
  );
  assert.equal(live!.count, 0);
});
test("reset concorrente com reenvio não deadlocka e sempre respeita uso único", async () => {
  const account = await register();
  const requester = new Client();
  await requester.request("POST", "/auth/forgot-password", {
    email: account.email,
  });
  const token = await mailToken(account.email, "/reset-password");
  const [reset, resend] = await Promise.all([
    requester.request("POST", "/auth/reset-password", {
      token,
      password: "Concurrent-new-password-123!",
    }),
    requester.request("POST", "/auth/forgot-password", {
      email: account.email,
    }),
  ]);
  assert.ok([200, 400].includes(reset.statusCode), reset.body);
  assert.equal(resend.statusCode, 200);
  assert.equal(
    (
      await requester.request("POST", "/auth/reset-password", {
        token,
        password: "Another-password-123!",
      })
    ).statusCode,
    400,
  );
});

test("login migra hash legado para scrypt forte sem alterar a senha", async () => {
  const account = await register();
  const salt = "1234".repeat(8);
  const legacy = `scrypt:16384:8:1:${salt}:${scryptSync(secret, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex")}`;
  await db.execute(
    sql`UPDATE users SET password_hash=${legacy} WHERE id=${account.user.id}`,
  );
  const client = new Client();
  assert.equal(
    (
      await client.request("POST", "/auth/login", {
        email: account.email,
        password: secret,
      })
    ).statusCode,
    200,
  );
  const upgraded = await one(
    db,
    sql`SELECT password_hash FROM users WHERE id=${account.user.id}`,
  );
  assert.ok(upgraded!.password_hash.startsWith("scrypt:131072:8:1:"));
  assert.notEqual(upgraded!.password_hash, legacy);
  assert.equal(
    (
      await client.request("POST", "/auth/login", {
        email: account.email,
        password: secret,
      })
    ).statusCode,
    200,
  );
});
