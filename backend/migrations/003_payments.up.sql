ALTER TABLE invoices DROP CONSTRAINT ck_invoices_status;
ALTER TABLE invoices ADD CONSTRAINT ck_invoices_status CHECK (status IN ('UNPAID','PARTIALLY_PAID','PAID','CANCELLED'));

CREATE TABLE payments (
  id uuid DEFAULT gen_random_uuid() CONSTRAINT pk_payments PRIMARY KEY,
  invoice_id uuid NOT NULL CONSTRAINT fk_payments_invoice REFERENCES invoices(id) ON DELETE RESTRICT,
  amount numeric NOT NULL CONSTRAINT ck_payments_amount CHECK (amount > 0 AND amount <= 9007199254740991 AND amount = trunc(amount)),
  method text NOT NULL DEFAULT 'BANK_TRANSFER' CONSTRAINT ck_payments_method CHECK (method = 'BANK_TRANSFER'),
  status text NOT NULL DEFAULT 'PENDING' CONSTRAINT ck_payments_status CHECK (status IN ('PENDING','CONFIRMED','REJECTED','CANCELLED','VOIDED')),
  reference_code text CONSTRAINT ck_payments_reference CHECK (length(reference_code) <= 120),
  note text CONSTRAINT ck_payments_note CHECK (length(note) <= 1000),
  submitted_by uuid NOT NULL CONSTRAINT fk_payments_submitted_by REFERENCES users(id) ON DELETE RESTRICT,
  processed_by uuid CONSTRAINT fk_payments_processed_by REFERENCES users(id) ON DELETE RESTRICT,
  processed_at timestamptz,
  reject_reason text,
  cancelled_at timestamptz,
  cancel_reason text,
  voided_by uuid CONSTRAINT fk_payments_voided_by REFERENCES users(id) ON DELETE RESTRICT,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_payments_processed CHECK (status NOT IN ('CONFIRMED','REJECTED','VOIDED') OR (processed_by IS NOT NULL AND processed_at IS NOT NULL)),
  CONSTRAINT ck_payments_rejected CHECK (status <> 'REJECTED' OR (reject_reason IS NOT NULL AND length(btrim(reject_reason)) BETWEEN 1 AND 1000)),
  CONSTRAINT ck_payments_voided CHECK (status <> 'VOIDED' OR (voided_by IS NOT NULL AND voided_at IS NOT NULL AND void_reason IS NOT NULL AND length(btrim(void_reason)) BETWEEN 1 AND 1000)),
  CONSTRAINT ck_payments_cancelled CHECK (status <> 'CANCELLED' OR cancelled_at IS NOT NULL)
);
CREATE UNIQUE INDEX uq_payments_pending_invoice ON payments(invoice_id) WHERE status='PENDING';
CREATE INDEX ix_payments_invoice ON payments(invoice_id);
CREATE INDEX ix_payments_status_created ON payments(status,created_at DESC,id);
CREATE INDEX ix_payments_submitted_created ON payments(submitted_by,created_at DESC,id);
