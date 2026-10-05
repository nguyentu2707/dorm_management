CREATE INDEX ix_contracts_status_end_date ON contracts(status, end_date);
CREATE INDEX ix_invoices_status ON invoices(status);
CREATE INDEX ix_payments_confirmed_processed_at ON payments(processed_at)
  WHERE status='CONFIRMED';
CREATE INDEX ix_utility_readings_billing_period ON utility_readings(billing_period);
