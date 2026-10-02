-- Additive commercial capabilities; no existing fixture or history is rewritten.
ALTER TABLE crm_records ADD COLUMN custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(custom_fields)='object');
ALTER TABLE sales_deals ADD COLUMN custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(custom_fields)='object');
CREATE TABLE crm_fields (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 kind text NOT NULL CHECK(kind IN ('contacts','companies','leads','deals')),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 100),
 type text NOT NULL CHECK(type IN ('text','number','date','boolean','choice')),
 options jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(options)='array'),active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1,UNIQUE(tenant_id,id),UNIQUE(tenant_id,kind,name)
);
CREATE TABLE crm_imports (
 tenant_id uuid NOT NULL REFERENCES tenants(id),id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES users(id),
 content_hash text NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,id)
);
CREATE TABLE crm_intake_forms (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 token_hash text NOT NULL UNIQUE,name text NOT NULL,source text NOT NULL,owner_ids jsonb NOT NULL CHECK(jsonb_array_length(owner_ids)>0),
 cursor integer NOT NULL DEFAULT 0,active boolean NOT NULL DEFAULT true,created_by uuid NOT NULL REFERENCES users(id),version integer NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,id)
);
CREATE TABLE crm_intake_entries (
 tenant_id uuid NOT NULL REFERENCES tenants(id),form_id uuid NOT NULL,request_id uuid NOT NULL,record_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,form_id,request_id),FOREIGN KEY(tenant_id,form_id) REFERENCES crm_intake_forms(tenant_id,id),FOREIGN KEY(tenant_id,record_id) REFERENCES crm_records(tenant_id,id)
);
CREATE TABLE sales_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),pipeline_id uuid NOT NULL,stage_id uuid,
 name text NOT NULL,trigger text NOT NULL CHECK(trigger IN ('STAGE','INACTIVITY','OVERDUE')),days integer NOT NULL DEFAULT 1 CHECK(days BETWEEN 1 AND 365),
 task_title text NOT NULL,enabled boolean NOT NULL DEFAULT false,created_by uuid NOT NULL REFERENCES users(id),version integer NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,id),FOREIGN KEY(tenant_id,pipeline_id) REFERENCES sales_pipelines(tenant_id,id),FOREIGN KEY(tenant_id,stage_id) REFERENCES sales_stages(tenant_id,id),
 CHECK(trigger<>'STAGE' OR stage_id IS NOT NULL)
);
CREATE TABLE sales_rule_runs (
 tenant_id uuid NOT NULL REFERENCES tenants(id),rule_id uuid NOT NULL,deal_id uuid NOT NULL,task_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,rule_id,deal_id),
 FOREIGN KEY(tenant_id,rule_id) REFERENCES sales_rules(tenant_id,id),FOREIGN KEY(tenant_id,deal_id) REFERENCES sales_deals(tenant_id,id),FOREIGN KEY(tenant_id,task_id) REFERENCES sales_work(tenant_id,id)
);
CREATE TABLE internal_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),user_id uuid NOT NULL REFERENCES users(id),
 work_id uuid,deal_id uuid,title text NOT NULL,reason text NOT NULL,dedupe_key text NOT NULL,read_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,user_id,dedupe_key),FOREIGN KEY(tenant_id,work_id) REFERENCES sales_work(tenant_id,id),FOREIGN KEY(tenant_id,deal_id) REFERENCES sales_deals(tenant_id,id)
);
CREATE INDEX internal_notifications_inbox ON internal_notifications(tenant_id,user_id,created_at DESC);
DO $$ DECLARE relation text; BEGIN
 FOREACH relation IN ARRAY ARRAY['crm_fields','crm_imports','crm_intake_forms','crm_intake_entries','sales_rules','sales_rule_runs','internal_notifications'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',relation);
 EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',relation);
 EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)',relation);
 END LOOP;
END $$;
