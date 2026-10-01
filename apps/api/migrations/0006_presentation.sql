ALTER TABLE sales_pipelines ADD COLUMN demo_fixture boolean NOT NULL DEFAULT false;
ALTER TABLE sales_pipelines ADD COLUMN demo_followup_enabled boolean NOT NULL DEFAULT false;
CREATE TABLE sales_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 200),price numeric(16,2) NOT NULL CHECK(price>=0),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),version integer NOT NULL DEFAULT 1,
 UNIQUE(tenant_id,id)
);
CREATE TABLE sales_proposals (
 tenant_id uuid NOT NULL REFERENCES tenants(id),deal_id uuid NOT NULL,
 client_name text NOT NULL,items jsonb NOT NULL CHECK(jsonb_typeof(items)='array'),
 discount numeric(16,2) NOT NULL DEFAULT 0 CHECK(discount>=0),total numeric(16,2) NOT NULL CHECK(total>=0),
 currency text NOT NULL CHECK(currency ~ '^[A-Z]{3}$'),version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,deal_id),
 FOREIGN KEY(tenant_id,deal_id) REFERENCES sales_deals(tenant_id,id)
);
CREATE TABLE sales_demo_executions (
 tenant_id uuid NOT NULL REFERENCES tenants(id),deal_id uuid NOT NULL,task_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,deal_id),
 FOREIGN KEY(tenant_id,deal_id) REFERENCES sales_deals(tenant_id,id),
 FOREIGN KEY(tenant_id,task_id) REFERENCES sales_work(tenant_id,id)
);
DO $$ DECLARE relation text; BEGIN
 FOREACH relation IN ARRAY ARRAY['sales_products','sales_proposals','sales_demo_executions'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',relation);
 EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',relation);
 EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)',relation);
 END LOOP;
END $$;
