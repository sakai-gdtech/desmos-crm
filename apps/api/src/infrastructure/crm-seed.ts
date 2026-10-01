import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { config } from "../shared/config.js";
import { withCrmTenant } from "../modules/crm/tenant.js";
import { audit, one, rows, type Executor } from "./database.js";

const tenantId = "11111111-1111-4111-8111-111111111111";
const demoId = (key: string) => {
  const hex = createHash("sha256")
    .update(`desmos-demo-crm:${key}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const companies = [
  ["Aurora Digital", "Tecnologia"],
  ["Vale Azul Engenharia", "Engenharia"],
  ["Ponto Norte Consultoria", "Consultoria"],
  ["Alameda Imóveis", "Imobiliário"],
  ["Cedro Soluções", "Serviços"],
  ["Vértice Comunicação", "Marketing"],
  ["Senda Logística", "Logística"],
  ["Estação Criativa", "Design"],
  ["Ipê Gestão", "Consultoria"],
  ["Cais Distribuição", "Distribuição"],
  ["Vereda Educação", "Educação"],
  ["Prisma Projetos", "Arquitetura"],
  ["Nascente Serviços", "Serviços"],
  ["Trilha Software", "Tecnologia"],
  ["Arco Comercial", "Comércio"],
  ["Casa do Horizonte", "Imobiliário"],
  ["Lume Eventos", "Eventos"],
  ["Jardim Sistemas", "Tecnologia"],
  ["Raiz Ambiental", "Consultoria"],
  ["Porto Oficina", "Serviços"],
];
const firstNames = [
  "Camila",
  "Rafael",
  "Beatriz",
  "Diego",
  "Larissa",
  "Eduardo",
  "Juliana",
  "Gustavo",
  "Renata",
  "Thiago",
  "Isabela",
  "André",
  "Patrícia",
  "Vinícius",
  "Fernanda",
  "Gabriel",
  "Tatiana",
  "Henrique",
  "Daniela",
  "Pedro",
];
const lastNames = [
  "Mendes",
  "Rocha",
  "Azevedo",
  "Campos",
  "Duarte",
  "Lima",
  "Ribeiro",
  "Barros",
  "Martins",
  "Teixeira",
  "Freitas",
  "Cardoso",
  "Pereira",
  "Gomes",
  "Nogueira",
  "Vieira",
  "Dias",
  "Alves",
  "Costa",
  "Pinto",
];
const sources = [
  "Indicação",
  "Site",
  "LinkedIn",
  "Evento",
  "WhatsApp",
  "Manual",
];
const tagNames = [
  ["VIP", "#4f46e5"],
  ["Indicação", "#217550"],
  ["Enterprise", "#8a5b16"],
  ["Evento 2026", "#176b87"],
  ["Acompanhar", "#b63b44"],
];

async function created(
  tx: Executor,
  recordId: string,
  actorId: string,
  name: string,
  kind: string,
  date: string,
) {
  await tx.execute(
    sql`INSERT INTO crm_events(id,tenant_id,record_id,type,actor_id,metadata,created_at) VALUES(${demoId(`event:${recordId}`)},${tenantId},${recordId},'created',${actorId},${JSON.stringify({ name, kind, source: "Demonstração", demo: true })}::jsonb,${date})`,
  );
  await audit(
    tx,
    { tenantId, userId: actorId },
    `crm.${kind}.created`,
    recordId,
    null,
    { name, demo: true },
  );
}

/** Fictional local demonstration records. Existing records are never overwritten. */
export async function seedCrmDemo() {
  if (config.NODE_ENV === "production")
    throw new Error("Seed comercial não é permitido em produção.");
  await withCrmTenant(tenantId, async (tx) => {
    // The foundation seed also supports upgrading pre-CRM installations.
    const installed = await one(
      tx,
      sql`SELECT to_regclass('crm_records') AS name`,
    );
    if (!installed?.name) return;
    const people = await rows(
      tx,
      sql`SELECT u.id,u.email FROM users u JOIN memberships m ON m.user_id=u.id WHERE m.tenant_id=${tenantId} AND m.status='ACTIVE' AND u.email IN ('ana@nexa.com','felipe@nexa.com','lucas@nexa.com','mariana@nexa.com') ORDER BY u.email`,
    );
    const owner = people.find((p) => p.email === "ana@nexa.com");
    if (!owner) return;
    const assignees = people.map((p) => p.id as string);
    for (const [name, color] of tagNames) {
      await tx.execute(
        sql`INSERT INTO crm_tags(id,tenant_id,name,color) VALUES(${demoId(`tag:${name}`)},${tenantId},${name},${color}) ON CONFLICT DO NOTHING`,
      );
    }
    const availableTags = await rows(
      tx,
      sql`SELECT id FROM crm_tags WHERE tenant_id=${tenantId} ORDER BY name`,
    );
    const addTag = async (id: string, index: number) => {
      if (availableTags.length)
        await tx.execute(
          sql`INSERT INTO crm_record_tags(tenant_id,record_id,tag_id) VALUES(${tenantId},${id},${availableTags[index % availableTags.length]!.id}) ON CONFLICT DO NOTHING`,
        );
    };
    for (let i = 0; i < companies.length; i++) {
      const [name, segment] = companies[i]!;
      const id = demoId(`company:${i}`);
      const email = `contato@empresa-${i + 1}.example`;
      const date = new Date(Date.UTC(2026, 8, 1 + i, 13)).toISOString();
      const inserted = await one(
        tx,
        sql`INSERT INTO crm_records(id,tenant_id,kind,name,legal_name,email,email_normalized,phone,phone_normalized,website,segment,employee_count,assigned_to,source,description,city,state,country,created_at,updated_at) VALUES(${id},${tenantId},'companies',${name},${`${name} Ltda.`},${email},${email},${`+55 67 3000-${String(i + 1).padStart(4, "0")}`},${`55673000${String(i + 1).padStart(4, "0")}`},${`https://empresa-${i + 1}.example`},${segment},${12 + i * 7},${assignees[i % assignees.length]},'Manual','Organização fictícia para demonstração do CRM.','Campo Grande','MS','Brasil',${date},${date}) ON CONFLICT(id) DO NOTHING RETURNING id`,
      );
      if (inserted) {
        await created(tx, id, owner.id, name!, "companies", date);
        await addTag(id, i);
      }
    }
    for (let i = 0; i < 60; i++) {
      const id = demoId(`contact:${i}`),
        companyIndex = Math.floor(i / 3);
      const name = firstNames[i % firstNames.length]!,
        lastName = lastNames[(i * 7 + Math.floor(i / 20)) % lastNames.length]!;
      const email = `pessoa.${i + 1}@empresa-${companyIndex + 1}.example`;
      const phone = `55679910${String(i + 1).padStart(4, "0")}`;
      const date = new Date(Date.UTC(2026, 8, 5 + (i % 22), 14)).toISOString();
      const inserted = await one(
        tx,
        sql`INSERT INTO crm_records(id,tenant_id,kind,name,last_name,email,email_normalized,phone,phone_normalized,whatsapp,job_title,company_id,company_name,assigned_to,source,description,city,state,country,created_at,updated_at) VALUES(${id},${tenantId},'contacts',${name},${lastName},${email},${email},${phone},${phone},${phone},${["Diretoria", "Comercial", "Financeiro"][i % 3]},${demoId(`company:${companyIndex}`)},${companies[companyIndex]![0]},${assignees[i % assignees.length]},${sources[i % sources.length]},'Contato fictício para explorar os fluxos de relacionamento.','Campo Grande','MS','Brasil',${date},${date}) ON CONFLICT(id) DO NOTHING RETURNING id`,
      );
      if (inserted) {
        await created(
          tx,
          id,
          owner.id,
          `${name} ${lastName}`,
          "contacts",
          date,
        );
        await addTag(id, i);
      }
    }
    for (let i = 0; i < 30; i++) {
      const id = demoId(`lead:${i}`);
      const name = `${firstNames[(i + 5) % firstNames.length]} ${lastNames[(i + 9) % lastNames.length]}`;
      const email = `lead.${i + 1}@prospect-${i + 1}.example`,
        phone = `55679920${String(i + 1).padStart(4, "0")}`;
      const status = ["NEW", "CONTACTED", "QUALIFIED", "DISCARDED", "ARCHIVED"][
        i % 5
      ]!;
      const date = new Date(Date.UTC(2026, 8, 10 + (i % 20), 15)).toISOString();
      const inserted = await one(
        tx,
        sql`INSERT INTO crm_records(id,tenant_id,kind,name,email,email_normalized,phone,phone_normalized,company_name,job_title,assigned_to,source,description,status,temperature,estimated_value,discard_reason,last_contact_at,next_contact_at,created_at,updated_at) VALUES(${id},${tenantId},'leads',${name},${email},${email},${phone},${phone},${`Prospecto ${String(i + 1).padStart(2, "0")}`},'Gestão comercial',${assignees[i % assignees.length]},${sources[i % sources.length]},'Lead fictício de demonstração; informações sem vínculo com pessoas reais.',${status},${["HOT", "WARM", "COLD"][i % 3]},${String(3500 + i * 1250)},${status === "DISCARDED" ? "Sem aderência à solução neste momento." : null},${status === "NEW" ? null : date},${["NEW", "CONTACTED", "QUALIFIED"].includes(status) ? new Date(Date.UTC(2026, 9, 2 + (i % 10), 14)).toISOString() : null},${date},${date}) ON CONFLICT(id) DO NOTHING RETURNING id`,
      );
      if (inserted) {
        await created(tx, id, owner.id, name, "leads", date);
        await addTag(id, i);
        if (i < 8) {
          const noteId = demoId(`note:${id}`);
          const body = [
            "Primeira conversa sobre organização do atendimento. Levantar o processo atual da equipe.",
            "Demonstrou interesse em centralizar contatos. Confirmar responsáveis pela avaliação.",
            "Indicação recebida no evento. Apresentar a solução em uma próxima conversa.",
          ][i % 3]!;
          await tx.execute(
            sql`INSERT INTO crm_notes(id,tenant_id,record_id,author_id,body,pinned,created_at,updated_at) VALUES(${noteId},${tenantId},${id},${assignees[i % assignees.length]},${body},${i % 3 === 0},${date},${date})`,
          );
          await tx.execute(
            sql`INSERT INTO crm_events(id,tenant_id,record_id,type,actor_id,metadata,created_at) VALUES(${demoId(`note-event:${id}`)},${tenantId},${id},'note.created',${assignees[i % assignees.length]},${JSON.stringify({ noteId, body, pinned: i % 3 === 0, demo: true })}::jsonb,${date})`,
          );
        }
      }
    }
  });
}
