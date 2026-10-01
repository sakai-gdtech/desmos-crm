import { sql } from "drizzle-orm";
import { db, one, pool, audit } from "./database.js";
import { config } from "../shared/config.js";
import { hashPassword } from "../shared/crypto.js";
import { seedSalesDemo } from "./sales-seed.js";
import { seedCrmDemo } from "./crm-seed.js";
const password = process.env.DEMO_PASSWORD;
if (config.NODE_ENV === "production")
  throw new Error("Seed de demonstração não é permitido em produção.");
if (!password || password.length < 12)
  throw new Error("Defina DEMO_PASSWORD com ao menos 12 caracteres.");
const passwordHash = await hashPassword(password);
const companyId = "11111111-1111-4111-8111-111111111111";
const secondCompanyId = "22222222-2222-4222-8222-222222222222";
await db.transaction(async (tx) => {
  await tx.execute(
    sql`INSERT INTO tenants(id,name,segment,employee_count,sales_count,objective,sales_motion,onboarding_completed_at,email,website) VALUES(${companyId},'Nexa Tecnologia','Tecnologia',24,8,'Organizar o relacionamento e aumentar conversões','B2B consultivo',now(),'contato@nexa.example','https://nexa.example') ON CONFLICT(id) DO NOTHING`,
  );
  await tx.execute(
    sql`INSERT INTO tenants(id,name,segment) VALUES(${secondCompanyId},'Horizonte Consultoria','Consultoria') ON CONFLICT(id) DO NOTHING`,
  );
  const people = [
    ["Ana Silva", "ana@nexa.com", "OWNER", companyId],
    ["Felipe Sakai", "felipe@nexa.com", "MANAGER", companyId],
    ["Lucas Oliveira", "lucas@nexa.com", "SALES", companyId],
    ["Mariana Costa", "mariana@nexa.com", "SALES", companyId],
    ["Bruno Almeida", "bruno@horizonte.com", "OWNER", secondCompanyId],
  ];
  let ownerId = "";
  let horizonOwnerId = "";
  for (const [name, email, role, tenantId] of people) {
    await tx.execute(
      sql`INSERT INTO users(name,email,password_hash,email_verified_at) VALUES(${name},${email},${passwordHash},now()) ON CONFLICT(email) DO NOTHING`,
    );
    const user = await one(
      tx,
      sql`SELECT id FROM users WHERE email=${email} FOR NO KEY UPDATE`,
    );
    const other = await one(
      tx,
      sql`SELECT tenant_id FROM memberships WHERE user_id=${user!.id} AND tenant_id<>${tenantId} AND NOT (${email}='ana@nexa.com' AND tenant_id=${secondCompanyId}) LIMIT 1`,
    );
    if (other)
      throw new Error(
        `A conta de demonstração ${email} já pertence a outra empresa; nenhum vínculo foi alterado.`,
      );
    await tx.execute(
      sql`INSERT INTO memberships(tenant_id,user_id,role) VALUES(${tenantId},${user!.id},${role}) ON CONFLICT(tenant_id,user_id) DO NOTHING`,
    );
    if (email === "ana@nexa.com") ownerId = user!.id;
    if (email === "bruno@horizonte.com") horizonOwnerId = user!.id;
  }
  // Repair only the legacy fixture created by this seed. All other duplicate
  // memberships are preserved and will block migration 0003 for explicit review.
  const legacy = await one(
    tx,
    sql`SELECT id,role,status FROM memberships WHERE tenant_id=${secondCompanyId} AND user_id=${ownerId} FOR UPDATE`,
  );
  if (legacy) {
    const marker = await one(
      tx,
      sql`SELECT id FROM audit_logs WHERE tenant_id=${companyId} AND actor_id=${ownerId} AND action='demo.created' LIMIT 1`,
    );
    if (!marker)
      throw new Error(
        "O vínculo antigo de Ana não possui a origem de demonstração esperada; revise-o manualmente.",
      );
    await tx.execute(
      sql`UPDATE sessions SET revoked_at=now() WHERE user_id=${ownerId} AND tenant_id=${secondCompanyId} AND revoked_at IS NULL`,
    );
    await tx.execute(
      sql`DELETE FROM memberships WHERE id=${legacy.id} AND user_id=${ownerId} AND tenant_id=${secondCompanyId}`,
    );
    await audit(
      tx,
      { tenantId: secondCompanyId, userId: horizonOwnerId },
      "demo.owner_separated",
      legacy.id,
      { userId: ownerId, ...legacy },
      { userId: horizonOwnerId, email: "bruno@horizonte.com" },
    );
  }
  const existing = await one(
    tx,
    sql`SELECT id FROM audit_logs WHERE tenant_id=${companyId} AND action='demo.created' LIMIT 1`,
  );
  if (!existing)
    await audit(
      tx,
      { tenantId: companyId, userId: ownerId },
      "demo.created",
      companyId,
      null,
      { name: "Nexa Tecnologia" },
    );
});
await seedCrmDemo();
await seedSalesDemo();
console.log(
  "Demonstração disponível: ana@nexa.com, felipe@nexa.com, lucas@nexa.com e mariana@nexa.com (Nexa); bruno@horizonte.com (Horizonte). A senha é o valor configurado em DEMO_PASSWORD.",
);
await pool.end();
