ALTER TABLE contracts
  ADD COLUMN room_price_per_month_snapshot NUMERIC(18,0);

ALTER TABLE contracts
  ADD CONSTRAINT ck_contracts_room_price_per_month_snapshot
  CHECK (
    room_price_per_month_snapshot IS NULL
    OR room_price_per_month_snapshot BETWEEN 0 AND 9007199254740991
  );

COMMENT ON COLUMN contracts.room_price_per_month_snapshot IS
  'Agreed integer VND monthly room price captured when the contract is created. NULL means unresolved legacy data.';
