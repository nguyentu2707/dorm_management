ALTER TABLE buildings
  ADD COLUMN status text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN allowed_gender text NOT NULL DEFAULT 'MIXED';

ALTER TABLE buildings
  ADD CONSTRAINT ck_buildings_status
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE')),
  ADD CONSTRAINT ck_buildings_allowed_gender
    CHECK (allowed_gender IN ('MALE', 'FEMALE', 'MIXED'));

CREATE INDEX ix_buildings_status_name ON buildings(status, name, id);
