CREATE TABLE sales_pipelines (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100), description text,
 active boolean NOT NULL DEFAULT true, version integer NOT NULL DEFAULT 1 CHECK(version>0),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,id)
);
CREATE UNIQUE INDEX sales_pipeline_name_idx ON sales_pipelines(tenant_id,lower(name));
CREATE TABLE sales_stages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), pipeline_id uuid NOT NULL,
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100), position integer NOT NULL CHECK(position>=0),
 probability integer NOT NULL DEFAULT 0 CHECK(probability BETWEEN 0 AND 100), color text NOT NULL CHECK(color ~ '^#[0-9a-fA-F]{6}$'),
 stale_days integer NOT NULL DEFAULT 7 CHECK(stale_days BETWEEN 1 AND 365), require_activity boolean NOT NULL DEFAULT false,
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,pipeline_id,id),
 FOREIGN KEY(tenant_id,pipeline_id) REFERENCES sales_pipelines(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX sales_stages_pipeline_idx ON sales_stages(tenant_id,pipeline_id,position,id);
CREATE TABLE sales_deals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200), pipeline_id uuid NOT NULL,stage_id uuid NOT NULL,
 contact_id uuid,company_id uuid,lead_id uuid,
 contact_kind text NOT NULL DEFAULT 'contacts' CHECK(contact_kind='contacts'),
 company_kind text NOT NULL DEFAULT 'companies' CHECK(company_kind='companies'),
 lead_kind text NOT NULL DEFAULT 'leads' CHECK(lead_kind='leads'),
 value numeric(16,2) NOT NULL DEFAULT 0 CHECK(value>=0),currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),
 probability integer NOT NULL CHECK(probability BETWEEN 0 AND 100),expected_close_date date,
 assigned_to uuid,source text,temperature text NOT NULL DEFAULT 'WARM' CHECK(temperature IN ('COLD','WARM','HOT')),
 status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','WON','LOST')),lost_reason text,description text,
 won_at timestamptz,lost_at timestamptz,stage_entered_at timestamptz NOT NULL DEFAULT now(),
 version integer NOT NULL DEFAULT 1 CHECK(version>0),deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,pipeline_id,stage_id) REFERENCES sales_stages(tenant_id,pipeline_id,id),
 FOREIGN KEY(tenant_id,contact_id,contact_kind) REFERENCES crm_records(tenant_id,id,kind),
 FOREIGN KEY(tenant_id,company_id,company_kind) REFERENCES crm_records(tenant_id,id,kind),
 FOREIGN KEY(tenant_id,lead_id,lead_kind) REFERENCES crm_records(tenant_id,id,kind),
 FOREIGN KEY(tenant_id,assigned_to) REFERENCES memberships(tenant_id,user_id),
 CHECK((status='OPEN' AND won_at IS NULL AND lost_at IS NULL) OR (status='WON' AND won_at IS NOT NULL AND lost_at IS NULL) OR (status='LOST' AND lost_at IS NOT NULL AND won_at IS NULL))
);
CREATE INDEX sales_deals_list_idx ON sales_deals(tenant_id,deleted_at,pipeline_id,status,updated_at DESC,id);
CREATE INDEX sales_deals_stage_idx ON sales_deals(tenant_id,stage_id,stage_entered_at);
CREATE INDEX sales_deals_owner_idx ON sales_deals(tenant_id,assigned_to,status);
CREATE INDEX sales_deals_company_idx ON sales_deals(tenant_id,company_id);
CREATE INDEX sales_deals_contact_idx ON sales_deals(tenant_id,contact_id);
ALTER TABLE crm_records ADD COLUMN converted_deal_id uuid;
ALTER TABLE crm_records ADD CONSTRAINT crm_converted_deal_fk FOREIGN KEY(tenant_id,converted_deal_id) REFERENCES sales_deals(tenant_id,id);
CREATE TABLE sales_work (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),kind text NOT NULL CHECK(kind IN ('activities','tasks')),
 title text NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),description text,assigned_to uuid,created_by uuid NOT NULL,
 contact_id uuid,company_id uuid,lead_id uuid,deal_id uuid,
 contact_kind text NOT NULL DEFAULT 'contacts' CHECK(contact_kind='contacts'),company_kind text NOT NULL DEFAULT 'companies' CHECK(company_kind='companies'),lead_kind text NOT NULL DEFAULT 'leads' CHECK(lead_kind='leads'),
 type text CHECK(type IN ('CALL','EMAIL','WHATSAPP','MEETING','NOTE','TASK','VISIT','OTHER')),
 scheduled_at timestamptz,due_at timestamptz,priority text CHECK(priority IN ('LOW','MEDIUM','HIGH','URGENT')),
 status text NOT NULL,completed_at timestamptz,duration integer CHECK(duration BETWEEN 0 AND 100000),result text,
 checklist jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(checklist)='array'),source_activity_id uuid,
 version integer NOT NULL DEFAULT 1 CHECK(version>0),deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id),UNIQUE(tenant_id,source_activity_id),
 FOREIGN KEY(tenant_id,assigned_to) REFERENCES memberships(tenant_id,user_id),
 FOREIGN KEY(tenant_id,created_by) REFERENCES memberships(tenant_id,user_id),
 FOREIGN KEY(tenant_id,contact_id,contact_kind) REFERENCES crm_records(tenant_id,id,kind),
 FOREIGN KEY(tenant_id,company_id,company_kind) REFERENCES crm_records(tenant_id,id,kind),
 FOREIGN KEY(tenant_id,lead_id,lead_kind) REFERENCES crm_records(tenant_id,id,kind),
 FOREIGN KEY(tenant_id,deal_id) REFERENCES sales_deals(tenant_id,id),
 FOREIGN KEY(tenant_id,source_activity_id) REFERENCES sales_work(tenant_id,id),
 CHECK((kind='activities' AND type IS NOT NULL AND status IN ('PLANNED','COMPLETED','CANCELED') AND due_at IS NULL AND priority IS NULL AND source_activity_id IS NULL) OR (kind='tasks' AND type IS NULL AND status IN ('TODO','IN_PROGRESS','DONE','CANCELED') AND priority IS NOT NULL AND scheduled_at IS NULL)),
 CHECK((status IN ('DONE','COMPLETED'))=(completed_at IS NOT NULL))
);
CREATE INDEX sales_work_schedule_idx ON sales_work(tenant_id,kind,deleted_at,status,scheduled_at,due_at);
CREATE INDEX sales_work_owner_idx ON sales_work(tenant_id,assigned_to,kind,status);
CREATE INDEX sales_work_deal_idx ON sales_work(tenant_id,deal_id);
CREATE INDEX sales_work_record_idx ON sales_work(tenant_id,contact_id,company_id,lead_id);
CREATE TABLE sales_deal_tags (
 tenant_id uuid NOT NULL REFERENCES tenants(id),deal_id uuid NOT NULL,tag_id uuid NOT NULL,PRIMARY KEY(tenant_id,deal_id,tag_id),
 FOREIGN KEY(tenant_id,deal_id) REFERENCES sales_deals(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,tag_id) REFERENCES crm_tags(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE sales_work_tags (
 tenant_id uuid NOT NULL REFERENCES tenants(id),work_id uuid NOT NULL,tag_id uuid NOT NULL,PRIMARY KEY(tenant_id,work_id,tag_id),
 FOREIGN KEY(tenant_id,work_id) REFERENCES sales_work(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,tag_id) REFERENCES crm_tags(tenant_id,id) ON DELETE CASCADE
);
CREATE TABLE sales_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),deal_id uuid,work_id uuid,
 actor_id uuid NOT NULL,type text NOT NULL,metadata jsonb NOT NULL DEFAULT '{}'::jsonb,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,deal_id) REFERENCES sales_deals(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,work_id) REFERENCES sales_work(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,actor_id) REFERENCES memberships(tenant_id,user_id),CHECK((deal_id IS NULL)<>(work_id IS NULL))
);
CREATE INDEX sales_events_deal_idx ON sales_events(tenant_id,deal_id,created_at DESC,id DESC);
CREATE TABLE sales_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),deal_id uuid NOT NULL,author_id uuid NOT NULL,
 body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 10000),pinned boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,deal_id) REFERENCES sales_deals(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,author_id) REFERENCES memberships(tenant_id,user_id)
);
CREATE TABLE sales_note_mentions (
 tenant_id uuid NOT NULL REFERENCES tenants(id),note_id uuid NOT NULL,user_id uuid NOT NULL,PRIMARY KEY(tenant_id,note_id,user_id),
 FOREIGN KEY(tenant_id,note_id) REFERENCES sales_notes(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,user_id) REFERENCES memberships(tenant_id,user_id)
);
DO $$ DECLARE relation text; BEGIN
 FOREACH relation IN ARRAY ARRAY['sales_pipelines','sales_stages','sales_deals','sales_work','sales_deal_tags','sales_work_tags','sales_events','sales_notes','sales_note_mentions'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',relation);
 EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',relation);
 EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)',relation);
 END LOOP;
END $$;
