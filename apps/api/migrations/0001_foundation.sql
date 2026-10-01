CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL UNIQUE CHECK(email = lower(email)), password_hash text NOT NULL,
 phone text, email_verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE tenants (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, segment text, employee_count integer CHECK(employee_count >= 1), sales_count integer CHECK(sales_count >= 0),
 objective text, sales_motion text, timezone text NOT NULL DEFAULT 'America/Campo_Grande', currency text NOT NULL DEFAULT 'BRL', locale text NOT NULL DEFAULT 'pt-BR',
 email text, phone text, website text, tax_id text, address text, onboarding_completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), user_id uuid NOT NULL REFERENCES users(id),
 role text NOT NULL CHECK(role IN ('OWNER','ADMIN','MANAGER','SALES','SUPPORT','VIEWER')), status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','SUSPENDED')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,user_id)
);
CREATE INDEX membership_user_idx ON memberships(user_id);
CREATE TABLE sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), tenant_id uuid NOT NULL REFERENCES tenants(id), expires_at timestamptz NOT NULL,
 revoked_at timestamptz, user_agent text, ip text, created_at timestamptz NOT NULL DEFAULT now(), last_used_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE TABLE refresh_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL REFERENCES sessions(id), token_hash text NOT NULL UNIQUE, used_at timestamptz, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_session_idx ON refresh_tokens(session_id);
CREATE TABLE action_tokens (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), type text NOT NULL CHECK(type IN ('VERIFY_EMAIL','RESET_PASSWORD')), token_hash text NOT NULL UNIQUE,
 expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE invitations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), email text NOT NULL, role text NOT NULL CHECK(role IN ('OWNER','ADMIN','MANAGER','SALES','SUPPORT','VIEWER')),
 token_hash text NOT NULL UNIQUE, invited_by uuid NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL, accepted_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invitation_tenant_idx ON invitations(tenant_id);
CREATE TABLE audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id), actor_id uuid REFERENCES users(id), action text NOT NULL, subject_id uuid,
 before jsonb, after jsonb, request_id text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_tenant_created_idx ON audit_logs(tenant_id, created_at DESC, id DESC);
CREATE TABLE outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), recipient text NOT NULL, subject text NOT NULL, body text NOT NULL, attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(), sent_at timestamptz, last_error text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outbox_pending_idx ON outbox(available_at) WHERE sent_at IS NULL;
