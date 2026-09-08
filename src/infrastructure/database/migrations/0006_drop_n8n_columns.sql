-- n8n integration retired. The n8n_user / n8n_password columns on
-- organizations were carried forward from the original Mongo migration
-- (0000_violet_alex_wilder.sql lines 57-58) and are no longer read by any
-- code. Drop both. IF EXISTS so this is idempotent across envs that
-- bootstrapped from different snapshots (some earlier staging deploys
-- never had these columns).
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "n8n_user";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "n8n_password";
