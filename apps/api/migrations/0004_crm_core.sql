-- A shared record identity makes notes, tags and events referentially complete.
-- The kind is part of relationship keys, so a company reference cannot point at a lead.
CREATE TABLE crm_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 kind text NOT NULL CHECK(kind IN ('contacts','companies','leads')),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 160), email text, phone text,
 email_normalized text, phone_normalized text, assigned_to uuid, source text, description text,
 last_name text, whatsapp text, job_title text, company_id uuid, company_name text,
 company_kind text NOT NULL DEFAULT 'companies' CHECK(company_kind='companies'),
 address text, city text, state text, country text, birthday date,
 legal_name text, tax_id text, website text, segment text, employee_count integer CHECK(employee_count >= 0),
 status text CHECK(status IN ('NEW','CONTACTED','QUALIFIED','DISCARDED','ARCHIVED','CONVERTED')),
 temperature text CHECK(temperature IN ('COLD','WARM','HOT')), estimated_value numeric(16,2) CHECK(estimated_value >= 0),
 discard_reason text, last_contact_at timestamptz, next_contact_at timestamptz,
 converted_contact_id uuid, converted_company_id uuid,
 contact_kind text NOT NULL DEFAULT 'contacts' CHECK(contact_kind='contacts'),
 version integer NOT NULL DEFAULT 1 CHECK(version>0), deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,id), UNIQUE(tenant_id,id,kind),
 FOREIGN KEY(tenant_id,assigned_to) REFERENCES memberships(tenant_id,user_id),
 FOREIGN KEY(tenant_id,company_id,company_kind) REFERENCES crm_records(tenant_id,id,kind),
 FOREIGN KEY(tenant_id,converted_contact_id,contact_kind) REFERENCES crm_records(tenant_id,id,kind),
 FOREIGN KEY(tenant_id,converted_company_id,company_kind) REFERENCES crm_records(tenant_id,id,kind),
 CHECK(kind<>'leads' OR (status IS NOT NULL AND temperature IS NOT NULL)),
 CHECK(status IS DISTINCT FROM 'DISCARDED' OR (discard_reason IS NOT NULL AND length(trim(discard_reason))>0)),
 CHECK(status IS DISTINCT FROM 'CONVERTED' OR converted_contact_id IS NOT NULL),
 CHECK(kind='leads' OR (status IS NULL AND temperature IS NULL AND converted_contact_id IS NULL AND converted_company_id IS NULL)),
 CHECK(kind<>'companies' OR company_id IS NULL)
);
CREATE INDEX crm_records_list_idx ON crm_records(tenant_id,kind,deleted_at,updated_at DESC,id DESC);
CREATE INDEX crm_records_name_idx ON crm_records(tenant_id,kind,lower(name),id);
CREATE INDEX crm_records_email_idx ON crm_records(tenant_id,kind,email_normalized) WHERE deleted_at IS NULL;
CREATE INDEX crm_records_phone_idx ON crm_records(tenant_id,kind,phone_normalized) WHERE deleted_at IS NULL;
CREATE INDEX crm_records_assignee_idx ON crm_records(tenant_id,assigned_to);
CREATE INDEX crm_records_company_idx ON crm_records(tenant_id,company_id);
CREATE INDEX crm_records_status_idx ON crm_records(tenant_id,kind,status,temperature);
CREATE TABLE crm_tags (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),
 name text NOT NULL CHECK(length(trim(name)) BETWEEN 1 AND 50),color text NOT NULL CHECK(color ~ '^#[0-9a-fA-F]{6}$'),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,id)
);
CREATE UNIQUE INDEX crm_tags_name_unique ON crm_tags(tenant_id,lower(name));
CREATE TABLE crm_record_tags (
 tenant_id uuid NOT NULL REFERENCES tenants(id),record_id uuid NOT NULL,tag_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,record_id,tag_id),
 FOREIGN KEY(tenant_id,record_id) REFERENCES crm_records(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,tag_id) REFERENCES crm_tags(tenant_id,id) ON DELETE CASCADE
);
CREATE INDEX crm_record_tags_tag_idx ON crm_record_tags(tenant_id,tag_id);
CREATE TABLE crm_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),record_id uuid NOT NULL,
 author_id uuid NOT NULL,body text NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 10000),pinned boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,id),
 FOREIGN KEY(tenant_id,record_id) REFERENCES crm_records(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,author_id) REFERENCES memberships(tenant_id,user_id)
);
CREATE INDEX crm_notes_record_idx ON crm_notes(tenant_id,record_id,pinned DESC,created_at DESC);
CREATE TABLE crm_note_mentions (
 tenant_id uuid NOT NULL REFERENCES tenants(id),note_id uuid NOT NULL,user_id uuid NOT NULL,
 PRIMARY KEY(tenant_id,note_id,user_id),
 FOREIGN KEY(tenant_id,note_id) REFERENCES crm_notes(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,user_id) REFERENCES memberships(tenant_id,user_id)
);
CREATE TABLE crm_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id),record_id uuid NOT NULL,
 type text NOT NULL,actor_id uuid NOT NULL,metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(tenant_id,record_id) REFERENCES crm_records(tenant_id,id) ON DELETE CASCADE,
 FOREIGN KEY(tenant_id,actor_id) REFERENCES memberships(tenant_id,user_id)
);
CREATE INDEX crm_events_record_idx ON crm_events(tenant_id,record_id,created_at DESC,id DESC);
DO $$ DECLARE relation text; BEGIN
 FOREACH relation IN ARRAY ARRAY['crm_records','crm_tags','crm_record_tags','crm_notes','crm_note_mentions','crm_events'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',relation);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',relation);
  EXECUTE format('CREATE POLICY tenant_isolation ON %I USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)',relation);
 END LOOP;
END $$;
