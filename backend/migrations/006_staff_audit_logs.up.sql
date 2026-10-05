ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_code text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS specialty text;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status text;

UPDATE staff s
SET staff_code = 'LEGACY-' || s.id::text,
    full_name = u.full_name,
    phone = u.phone,
    specialty = CASE s.position
      WHEN 'MAINTENANCE' THEN 'Bảo trì'
      ELSE s.position
    END,
    status = CASE WHEN u.status = 'ACTIVE' THEN 'ACTIVE' ELSE 'INACTIVE' END
FROM users u
WHERE u.id = s.user_id AND (s.staff_code IS NULL OR s.full_name IS NULL OR s.status IS NULL);

ALTER TABLE staff ALTER COLUMN staff_code SET NOT NULL;
ALTER TABLE staff ALTER COLUMN full_name SET NOT NULL;
ALTER TABLE staff ALTER COLUMN status SET NOT NULL;
ALTER TABLE staff ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE staff ALTER COLUMN position DROP NOT NULL;
ALTER TABLE staff ADD CONSTRAINT uq_staff_staff_code UNIQUE (staff_code);
ALTER TABLE staff ADD CONSTRAINT ck_staff_staff_code_nonempty CHECK (length(btrim(staff_code)) > 0);
ALTER TABLE staff ADD CONSTRAINT ck_staff_full_name_nonempty CHECK (length(btrim(full_name)) > 0);
ALTER TABLE staff ADD CONSTRAINT ck_staff_status CHECK (status IN ('ACTIVE', 'INACTIVE'));

CREATE INDEX ix_staff_status_name ON staff (status, full_name, id);

CREATE TABLE audit_logs (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_audit_logs PRIMARY KEY,
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb,
  request_id text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT ck_audit_logs_action_nonempty CHECK (length(btrim(action)) > 0),
  CONSTRAINT ck_audit_logs_entity_type_nonempty CHECK (length(btrim(entity_type)) > 0),
  CONSTRAINT ck_audit_logs_entity_id_nonempty CHECK (length(btrim(entity_id)) > 0)
);

CREATE INDEX ix_audit_logs_created_at ON audit_logs (created_at DESC, id DESC);
CREATE INDEX ix_audit_logs_action_created_at ON audit_logs (action, created_at DESC);
CREATE INDEX ix_audit_logs_entity_created_at ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX ix_audit_logs_actor_created_at ON audit_logs (actor_user_id, created_at DESC);
