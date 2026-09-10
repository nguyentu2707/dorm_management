CREATE TABLE refresh_sessions (
  id uuid CONSTRAINT pk_refresh_sessions PRIMARY KEY,
  user_id uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_refresh_sessions_token_hash UNIQUE (token_hash),
  CONSTRAINT ck_refresh_sessions_token_hash CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT ck_refresh_sessions_expiry CHECK (expires_at > created_at),
  CONSTRAINT fk_refresh_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX ix_refresh_sessions_user ON refresh_sessions(user_id);
CREATE INDEX ix_refresh_sessions_expires_at ON refresh_sessions(expires_at);
CREATE INDEX ix_refresh_sessions_active_user ON refresh_sessions(user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE student_registry (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_student_registry PRIMARY KEY,
  student_code text NOT NULL,
  full_name text NOT NULL,
  email text,
  gender text,
  date_of_birth date,
  status text NOT NULL DEFAULT 'AVAILABLE',
  claimed_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_student_registry_student_code UNIQUE (student_code),
  CONSTRAINT uq_student_registry_email UNIQUE (email),
  CONSTRAINT uq_student_registry_claimed_user UNIQUE (claimed_user_id),
  CONSTRAINT ck_student_registry_student_code CHECK (student_code = upper(btrim(student_code)) AND length(student_code) > 0),
  CONSTRAINT ck_student_registry_full_name CHECK (length(btrim(full_name)) > 0),
  CONSTRAINT ck_student_registry_email CHECK (email IS NULL OR (email = lower(btrim(email)) AND length(email) > 0)),
  CONSTRAINT ck_student_registry_gender CHECK (gender IS NULL OR gender IN ('MALE','FEMALE','OTHER')),
  CONSTRAINT ck_student_registry_status CHECK (status IN ('AVAILABLE','CLAIMED','DISABLED')),
  CONSTRAINT ck_student_registry_claim_state CHECK ((status = 'CLAIMED') = (claimed_user_id IS NOT NULL)),
  CONSTRAINT fk_student_registry_claimed_user FOREIGN KEY (claimed_user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX ix_student_registry_status_code ON student_registry(status, student_code, id);
CREATE INDEX ix_student_registry_name ON student_registry(full_name, id);

INSERT INTO student_registry(student_code, full_name, email, gender, date_of_birth, status, claimed_user_id)
SELECT upper(btrim(s.mssv)), u.full_name, lower(btrim(u.email)), s.gender, s.dob, 'CLAIMED', u.id
FROM students s
JOIN users u ON u.id=s.user_id;
