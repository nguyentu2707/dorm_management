-- Financial history must be exported/handled explicitly before removing this module.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM payments) THEN
    RAISE EXCEPTION 'Cannot roll back payments while financial history exists';
  END IF;
END $$;
DROP TABLE payments;
ALTER TABLE invoices DROP CONSTRAINT ck_invoices_status;
ALTER TABLE invoices ADD CONSTRAINT ck_invoices_status CHECK (status IN ('UNPAID','CANCELLED'));
