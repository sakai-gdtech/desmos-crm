import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  uniqueIndex,
  index,
  boolean,
  date,
  numeric,
  foreignKey,
  primaryKey,
  check,
  pgPolicy,
  type AnyPgColumn,
  type PgTableExtraConfigValue,
} from "drizzle-orm/pg-core";
const id = () => uuid("id").defaultRandom().primaryKey();
const created = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const users = pgTable(
  "users",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    phone: text("phone"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("users_email_unique").on(t.email)],
);
export const tenants = pgTable("tenants", {
  id: id(),
  name: text("name").notNull(),
  segment: text("segment"),
  employeeCount: integer("employee_count"),
  salesCount: integer("sales_count"),
  objective: text("objective"),
  salesMotion: text("sales_motion"),
  timezone: text("timezone").notNull().default("America/Campo_Grande"),
  currency: text("currency").notNull().default("BRL"),
  locale: text("locale").notNull().default("pt-BR"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  taxId: text("tax_id"),
  address: text("address"),
  onboardingCompletedAt: timestamp("onboarding_completed_at", {
    withTimezone: true,
  }),
  createdAt: created(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("membership_tenant_user_unique").on(t.tenantId, t.userId),
    uniqueIndex("membership_user_unique").on(t.userId),
  ],
);
export const sessions = pgTable(
  "sessions",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    ip: text("ip"),
    createdAt: created(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: id(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    tokenHash: text("token_hash").notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: created(),
  },
  (t) => [uniqueIndex("refresh_hash_unique").on(t.tokenHash)],
);
export const actionTokens = pgTable(
  "action_tokens",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    type: text("type").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [uniqueIndex("action_hash_unique").on(t.tokenHash)],
);
export const invitations = pgTable(
  "invitations",
  {
    id: id(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    email: text("email").notNull(),
    role: text("role").notNull(),
    tokenHash: text("token_hash").notNull(),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("invitation_hash_unique").on(t.tokenHash),
    index("invitation_tenant_idx").on(t.tenantId),
  ],
);
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    subjectId: uuid("subject_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    requestId: text("request_id"),
    createdAt: created(),
  },
  (t) => [index("audit_tenant_created_idx").on(t.tenantId, t.createdAt)],
);
export const outbox = pgTable("outbox", {
  id: id(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  attempts: integer("attempts").notNull().default(0),
  availableAt: timestamp("available_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdAt: created(),
});

const tenantPolicy = () =>
  pgPolicy("tenant_isolation", {
    using: sql`tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`,
    withCheck: sql`tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid`,
  });
// FORCE ROW LEVEL SECURITY is applied in SQL migration 0004 (Drizzle exposes ENABLE only).
export const crmRecords = pgTable(
  "crm_records",
  {
    id: id(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    emailNormalized: text("email_normalized"),
    phoneNormalized: text("phone_normalized"),
    assignedTo: uuid("assigned_to"),
    source: text("source"),
    description: text("description"),
    lastName: text("last_name"),
    whatsapp: text("whatsapp"),
    jobTitle: text("job_title"),
    companyId: uuid("company_id"),
    companyName: text("company_name"),
    companyKind: text("company_kind").notNull().default("companies"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    birthday: date("birthday"),
    legalName: text("legal_name"),
    taxId: text("tax_id"),
    website: text("website"),
    segment: text("segment"),
    employeeCount: integer("employee_count"),
    status: text("status"),
    temperature: text("temperature"),
    estimatedValue: numeric("estimated_value", { precision: 16, scale: 2 }),
    discardReason: text("discard_reason"),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    nextContactAt: timestamp("next_contact_at", { withTimezone: true }),
    convertedContactId: uuid("converted_contact_id"),
    convertedCompanyId: uuid("converted_company_id"),
    convertedDealId: uuid("converted_deal_id"),
    contactKind: text("contact_kind").notNull().default("contacts"),
    version: integer("version").notNull().default(1),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t): PgTableExtraConfigValue[] => [
    uniqueIndex("crm_records_tenant_id_key").on(t.tenantId, t.id),
    uniqueIndex("crm_records_tenant_kind_key").on(t.tenantId, t.id, t.kind),
    foreignKey({
      columns: [t.tenantId, t.assignedTo],
      foreignColumns: [memberships.tenantId, memberships.userId],
    }),
    foreignKey({
      columns: [t.tenantId, t.companyId, t.companyKind],
      foreignColumns: [t.tenantId, t.id, t.kind],
    }),
    foreignKey({
      columns: [t.tenantId, t.convertedContactId, t.contactKind],
      foreignColumns: [t.tenantId, t.id, t.kind],
    }),
    foreignKey({
      columns: [t.tenantId, t.convertedCompanyId, t.companyKind],
      foreignColumns: [t.tenantId, t.id, t.kind],
    }),
    foreignKey({
      columns: [t.tenantId, t.convertedDealId],
      foreignColumns: [
        salesDeals.tenantId as AnyPgColumn,
        salesDeals.id as AnyPgColumn,
      ],
    }),
    check(
      "crm_records_kind_check",
      sql`${t.kind} IN ('contacts','companies','leads')`,
    ),
    check(
      "crm_records_name_check",
      sql`length(trim(${t.name})) BETWEEN 1 AND 160`,
    ),
    check("crm_records_company_kind_check", sql`${t.companyKind}='companies'`),
    check("crm_records_contact_kind_check", sql`${t.contactKind}='contacts'`),
    check("crm_records_employee_count_check", sql`${t.employeeCount} >= 0`),
    check("crm_records_estimated_value_check", sql`${t.estimatedValue} >= 0`),
    check("crm_records_version_check", sql`${t.version}>0`),
    check(
      "crm_records_status_check",
      sql`${t.status} IN ('NEW','CONTACTED','QUALIFIED','DISCARDED','ARCHIVED','CONVERTED')`,
    ),
    check(
      "crm_records_temperature_check",
      sql`${t.temperature} IN ('COLD','WARM','HOT')`,
    ),
    check(
      "crm_records_lead_required_check",
      sql`${t.kind}<>'leads' OR (${t.status} IS NOT NULL AND ${t.temperature} IS NOT NULL)`,
    ),
    check(
      "crm_records_discard_reason_check",
      sql`${t.status} IS DISTINCT FROM 'DISCARDED' OR (${t.discardReason} IS NOT NULL AND length(trim(${t.discardReason}))>0)`,
    ),
    check(
      "crm_records_conversion_check",
      sql`${t.status} IS DISTINCT FROM 'CONVERTED' OR ${t.convertedContactId} IS NOT NULL`,
    ),
    check(
      "crm_records_nonlead_check",
      sql`${t.kind}='leads' OR (${t.status} IS NULL AND ${t.temperature} IS NULL AND ${t.convertedContactId} IS NULL AND ${t.convertedCompanyId} IS NULL)`,
    ),
    check(
      "crm_records_company_parent_check",
      sql`${t.kind}<>'companies' OR ${t.companyId} IS NULL`,
    ),
    index("crm_records_list_idx").on(
      t.tenantId,
      t.kind,
      t.deletedAt,
      t.updatedAt.desc(),
      t.id.desc(),
    ),
    index("crm_records_name_idx").on(
      t.tenantId,
      t.kind,
      sql`lower(${t.name})`,
      t.id,
    ),
    index("crm_records_email_idx")
      .on(t.tenantId, t.kind, t.emailNormalized)
      .where(sql`${t.deletedAt} IS NULL`),
    index("crm_records_phone_idx")
      .on(t.tenantId, t.kind, t.phoneNormalized)
      .where(sql`${t.deletedAt} IS NULL`),
    index("crm_records_assignee_idx").on(t.tenantId, t.assignedTo),
    index("crm_records_company_idx").on(t.tenantId, t.companyId),
    index("crm_records_status_idx").on(
      t.tenantId,
      t.kind,
      t.status,
      t.temperature,
    ),
    tenantPolicy(),
  ],
).enableRLS();
export const crmTags = pgTable(
  "crm_tags",
  {
    id: id(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    name: text("name").notNull(),
    color: text("color").notNull(),
    createdAt: created(),
  },
  (t) => [
    uniqueIndex("crm_tags_tenant_id_key").on(t.tenantId, t.id),
    uniqueIndex("crm_tags_name_unique").on(t.tenantId, sql`lower(${t.name})`),
    check("crm_tags_name_check", sql`length(trim(${t.name})) BETWEEN 1 AND 50`),
    check("crm_tags_color_check", sql`${t.color} ~ '^#[0-9a-fA-F]{6}$'`),
    tenantPolicy(),
  ],
).enableRLS();
export const crmRecordTags = pgTable(
  "crm_record_tags",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    recordId: uuid("record_id").notNull(),
    tagId: uuid("tag_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.recordId, t.tagId] }),
    foreignKey({
      columns: [t.tenantId, t.recordId],
      foreignColumns: [crmRecords.tenantId, crmRecords.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.tagId],
      foreignColumns: [crmTags.tenantId, crmTags.id],
    }).onDelete("cascade"),
    index("crm_record_tags_tag_idx").on(t.tenantId, t.tagId),
    tenantPolicy(),
  ],
).enableRLS();
export const crmNotes = pgTable(
  "crm_notes",
  {
    id: id(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    recordId: uuid("record_id").notNull(),
    authorId: uuid("author_id").notNull(),
    body: text("body").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("crm_notes_tenant_id_key").on(t.tenantId, t.id),
    foreignKey({
      columns: [t.tenantId, t.recordId],
      foreignColumns: [crmRecords.tenantId, crmRecords.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.authorId],
      foreignColumns: [memberships.tenantId, memberships.userId],
    }),
    check(
      "crm_notes_body_check",
      sql`length(trim(${t.body})) BETWEEN 1 AND 10000`,
    ),
    index("crm_notes_record_idx").on(
      t.tenantId,
      t.recordId,
      t.pinned.desc(),
      t.createdAt.desc(),
    ),
    tenantPolicy(),
  ],
).enableRLS();
export const crmNoteMentions = pgTable(
  "crm_note_mentions",
  {
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    noteId: uuid("note_id").notNull(),
    userId: uuid("user_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.noteId, t.userId] }),
    foreignKey({
      columns: [t.tenantId, t.noteId],
      foreignColumns: [crmNotes.tenantId, crmNotes.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.userId],
      foreignColumns: [memberships.tenantId, memberships.userId],
    }),
    tenantPolicy(),
  ],
).enableRLS();
export const crmEvents = pgTable(
  "crm_events",
  {
    id: id(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    recordId: uuid("record_id").notNull(),
    type: text("type").notNull(),
    actorId: uuid("actor_id").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: created(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.recordId],
      foreignColumns: [crmRecords.tenantId, crmRecords.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.actorId],
      foreignColumns: [memberships.tenantId, memberships.userId],
    }),
    index("crm_events_record_idx").on(
      t.tenantId,
      t.recordId,
      t.createdAt.desc(),
      t.id.desc(),
    ),
    tenantPolicy(),
  ],
).enableRLS();

// FORCE RLS for the sales module is defined in migration 0005.
const tenantIdColumn = () =>
  uuid("tenant_id")
    .notNull()
    .references(() => tenants.id);
const updated = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
const time = (name: string) => timestamp(name, { withTimezone: true });
export const salesPipelines = pgTable(
  "sales_pipelines",
  {
    id: id(),
    tenantId: tenantIdColumn(),
    name: text("name").notNull(),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    version: integer("version").notNull().default(1),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("sales_pipelines_tenant_id_key").on(t.tenantId, t.id),
    uniqueIndex("sales_pipeline_name_idx").on(
      t.tenantId,
      sql`lower(${t.name})`,
    ),
    check("sales_pipeline_version", sql`${t.version}>0`),
    tenantPolicy(),
  ],
).enableRLS();
export const salesStages = pgTable(
  "sales_stages",
  {
    id: id(),
    tenantId: tenantIdColumn(),
    pipelineId: uuid("pipeline_id").notNull(),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    probability: integer("probability").notNull().default(0),
    color: text("color").notNull(),
    staleDays: integer("stale_days").notNull().default(7),
    requireActivity: boolean("require_activity").notNull().default(false),
  },
  (t) => [
    uniqueIndex("sales_stages_tenant_id_key").on(t.tenantId, t.id),
    uniqueIndex("sales_stages_pipeline_key").on(t.tenantId, t.pipelineId, t.id),
    foreignKey({
      columns: [t.tenantId, t.pipelineId],
      foreignColumns: [salesPipelines.tenantId, salesPipelines.id],
    }).onDelete("cascade"),
    index("sales_stages_pipeline_idx").on(
      t.tenantId,
      t.pipelineId,
      t.position,
      t.id,
    ),
    check("sales_stage_probability", sql`${t.probability} BETWEEN 0 AND 100`),
    check("sales_stage_rules", sql`${t.staleDays} BETWEEN 1 AND 365`),
    tenantPolicy(),
  ],
).enableRLS();
export const salesDeals = pgTable(
  "sales_deals",
  {
    id: id(),
    tenantId: tenantIdColumn(),
    title: text("title").notNull(),
    pipelineId: uuid("pipeline_id").notNull(),
    stageId: uuid("stage_id").notNull(),
    contactId: uuid("contact_id"),
    companyId: uuid("company_id"),
    leadId: uuid("lead_id"),
    contactKind: text("contact_kind").notNull().default("contacts"),
    companyKind: text("company_kind").notNull().default("companies"),
    leadKind: text("lead_kind").notNull().default("leads"),
    value: numeric("value", { precision: 16, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull(),
    probability: integer("probability").notNull(),
    expectedCloseDate: date("expected_close_date"),
    assignedTo: uuid("assigned_to"),
    source: text("source"),
    temperature: text("temperature").notNull().default("WARM"),
    status: text("status").notNull().default("OPEN"),
    lostReason: text("lost_reason"),
    description: text("description"),
    wonAt: time("won_at"),
    lostAt: time("lost_at"),
    stageEnteredAt: time("stage_entered_at").notNull().defaultNow(),
    version: integer("version").notNull().default(1),
    deletedAt: time("deleted_at"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("sales_deals_tenant_id_key").on(t.tenantId, t.id),
    foreignKey({
      columns: [t.tenantId, t.pipelineId, t.stageId],
      foreignColumns: [
        salesStages.tenantId,
        salesStages.pipelineId,
        salesStages.id,
      ],
    }),
    foreignKey({
      columns: [t.tenantId, t.contactId, t.contactKind],
      foreignColumns: [crmRecords.tenantId, crmRecords.id, crmRecords.kind],
    }),
    foreignKey({
      columns: [t.tenantId, t.companyId, t.companyKind],
      foreignColumns: [crmRecords.tenantId, crmRecords.id, crmRecords.kind],
    }),
    foreignKey({
      columns: [t.tenantId, t.leadId, t.leadKind],
      foreignColumns: [crmRecords.tenantId, crmRecords.id, crmRecords.kind],
    }),
    foreignKey({
      columns: [t.tenantId, t.assignedTo],
      foreignColumns: [memberships.tenantId, memberships.userId],
    }),
    index("sales_deals_list_idx").on(
      t.tenantId,
      t.deletedAt,
      t.pipelineId,
      t.status,
      t.updatedAt,
      t.id,
    ),
    index("sales_deals_stage_idx").on(t.tenantId, t.stageId, t.stageEnteredAt),
    check(
      "sales_deal_value",
      sql`${t.value}>=0 AND ${t.probability} BETWEEN 0 AND 100`,
    ),
    tenantPolicy(),
  ],
).enableRLS();
export const salesWork = pgTable(
  "sales_work",
  {
    id: id(),
    tenantId: tenantIdColumn(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    assignedTo: uuid("assigned_to"),
    createdBy: uuid("created_by").notNull(),
    contactId: uuid("contact_id"),
    companyId: uuid("company_id"),
    leadId: uuid("lead_id"),
    dealId: uuid("deal_id"),
    contactKind: text("contact_kind").notNull().default("contacts"),
    companyKind: text("company_kind").notNull().default("companies"),
    leadKind: text("lead_kind").notNull().default("leads"),
    type: text("type"),
    scheduledAt: time("scheduled_at"),
    dueAt: time("due_at"),
    priority: text("priority"),
    status: text("status").notNull(),
    completedAt: time("completed_at"),
    duration: integer("duration"),
    result: text("result"),
    checklist: jsonb("checklist").notNull().default([]),
    sourceActivityId: uuid("source_activity_id"),
    version: integer("version").notNull().default(1),
    deletedAt: time("deleted_at"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("sales_work_tenant_id_key").on(t.tenantId, t.id),
    uniqueIndex("sales_work_source_key").on(t.tenantId, t.sourceActivityId),
    foreignKey({
      columns: [t.tenantId, t.contactId, t.contactKind],
      foreignColumns: [crmRecords.tenantId, crmRecords.id, crmRecords.kind],
    }),
    foreignKey({
      columns: [t.tenantId, t.companyId, t.companyKind],
      foreignColumns: [crmRecords.tenantId, crmRecords.id, crmRecords.kind],
    }),
    foreignKey({
      columns: [t.tenantId, t.leadId, t.leadKind],
      foreignColumns: [crmRecords.tenantId, crmRecords.id, crmRecords.kind],
    }),
    foreignKey({
      columns: [t.tenantId, t.dealId],
      foreignColumns: [salesDeals.tenantId, salesDeals.id],
    }),
    foreignKey({
      columns: [t.tenantId, t.assignedTo],
      foreignColumns: [memberships.tenantId, memberships.userId],
    }),
    foreignKey({
      columns: [t.tenantId, t.createdBy],
      foreignColumns: [memberships.tenantId, memberships.userId],
    }),
    foreignKey({
      columns: [t.tenantId, t.sourceActivityId],
      foreignColumns: [t.tenantId, t.id],
    }),
    index("sales_work_schedule_idx").on(
      t.tenantId,
      t.kind,
      t.deletedAt,
      t.status,
      t.scheduledAt,
      t.dueAt,
    ),
    index("sales_work_deal_idx").on(t.tenantId, t.dealId),
    tenantPolicy(),
  ],
).enableRLS();
export const salesDealTags = pgTable(
  "sales_deal_tags",
  {
    tenantId: tenantIdColumn(),
    dealId: uuid("deal_id").notNull(),
    tagId: uuid("tag_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.dealId, t.tagId] }),
    foreignKey({
      columns: [t.tenantId, t.dealId],
      foreignColumns: [salesDeals.tenantId, salesDeals.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.tagId],
      foreignColumns: [crmTags.tenantId, crmTags.id],
    }).onDelete("cascade"),
    tenantPolicy(),
  ],
).enableRLS();
export const salesWorkTags = pgTable(
  "sales_work_tags",
  {
    tenantId: tenantIdColumn(),
    workId: uuid("work_id").notNull(),
    tagId: uuid("tag_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.workId, t.tagId] }),
    foreignKey({
      columns: [t.tenantId, t.workId],
      foreignColumns: [salesWork.tenantId, salesWork.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.tagId],
      foreignColumns: [crmTags.tenantId, crmTags.id],
    }).onDelete("cascade"),
    tenantPolicy(),
  ],
).enableRLS();
export const salesEvents = pgTable(
  "sales_events",
  {
    id: id(),
    tenantId: tenantIdColumn(),
    dealId: uuid("deal_id"),
    workId: uuid("work_id"),
    actorId: uuid("actor_id").notNull(),
    type: text("type").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    createdAt: created(),
  },
  (t) => [
    foreignKey({
      columns: [t.tenantId, t.dealId],
      foreignColumns: [salesDeals.tenantId, salesDeals.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.workId],
      foreignColumns: [salesWork.tenantId, salesWork.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.actorId],
      foreignColumns: [memberships.tenantId, memberships.userId],
    }),
    index("sales_events_deal_idx").on(t.tenantId, t.dealId, t.createdAt, t.id),
    check(
      "sales_event_subject",
      sql`(${t.dealId} IS NULL)<>(${t.workId} IS NULL)`,
    ),
    tenantPolicy(),
  ],
).enableRLS();
export const salesNotes = pgTable(
  "sales_notes",
  {
    id: id(),
    tenantId: tenantIdColumn(),
    dealId: uuid("deal_id").notNull(),
    authorId: uuid("author_id").notNull(),
    body: text("body").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex("sales_notes_tenant_id_key").on(t.tenantId, t.id),
    foreignKey({
      columns: [t.tenantId, t.dealId],
      foreignColumns: [salesDeals.tenantId, salesDeals.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.authorId],
      foreignColumns: [memberships.tenantId, memberships.userId],
    }),
    tenantPolicy(),
  ],
).enableRLS();
export const salesNoteMentions = pgTable(
  "sales_note_mentions",
  {
    tenantId: tenantIdColumn(),
    noteId: uuid("note_id").notNull(),
    userId: uuid("user_id").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.noteId, t.userId] }),
    foreignKey({
      columns: [t.tenantId, t.noteId],
      foreignColumns: [salesNotes.tenantId, salesNotes.id],
    }).onDelete("cascade"),
    foreignKey({
      columns: [t.tenantId, t.userId],
      foreignColumns: [memberships.tenantId, memberships.userId],
    }),
    tenantPolicy(),
  ],
).enableRLS();
