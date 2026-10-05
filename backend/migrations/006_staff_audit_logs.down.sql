DROP TABLE IF EXISTS audit_logs;
DROP INDEX IF EXISTS ix_staff_status_name;
ALTER TABLE staff DROP CONSTRAINT IF EXISTS ck_staff_status;
ALTER TABLE staff DROP CONSTRAINT IF EXISTS ck_staff_full_name_nonempty;
ALTER TABLE staff DROP CONSTRAINT IF EXISTS ck_staff_staff_code_nonempty;
ALTER TABLE staff DROP CONSTRAINT IF EXISTS uq_staff_staff_code;
-- Keep directory columns and rows on rollback: independent Staff cannot be
-- represented safely by the legacy mandatory User relation. Re-applying this
-- migration restores the constraints without manufacturing login accounts.
