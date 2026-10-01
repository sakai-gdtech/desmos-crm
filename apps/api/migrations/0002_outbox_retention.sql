ALTER TABLE outbox ADD COLUMN expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days');
CREATE INDEX outbox_expiry_idx ON outbox(expires_at) WHERE body <> '';
