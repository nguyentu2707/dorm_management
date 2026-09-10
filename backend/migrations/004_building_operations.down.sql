DROP INDEX ix_buildings_status_name;
ALTER TABLE buildings
  DROP CONSTRAINT ck_buildings_allowed_gender,
  DROP CONSTRAINT ck_buildings_status,
  DROP COLUMN allowed_gender,
  DROP COLUMN status;
