ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS ck_contracts_room_price_per_month_snapshot;

ALTER TABLE contracts
  DROP COLUMN IF EXISTS room_price_per_month_snapshot;
