-- A suspended membership still belongs to its company. Never silently delete
-- memberships or choose one company when upgrading an existing installation.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM memberships GROUP BY user_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'One-company migration blocked: resolve accounts with multiple memberships before retrying. No membership was removed.';
  END IF;
END $$;

CREATE UNIQUE INDEX membership_user_unique ON memberships(user_id);
DROP INDEX membership_user_idx;
