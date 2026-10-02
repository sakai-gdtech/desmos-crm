ALTER TABLE crm_fields ADD COLUMN share_on_conversion boolean NOT NULL DEFAULT false;
ALTER TABLE crm_fields ADD CONSTRAINT crm_field_share_kind CHECK(NOT share_on_conversion OR kind='leads');
-- Historical executions have no fabricated configuration snapshot.
ALTER TABLE sales_rule_runs ADD COLUMN rule_snapshot jsonb;
