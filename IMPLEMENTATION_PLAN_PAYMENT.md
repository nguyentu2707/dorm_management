# PostgreSQL hardening → Payment V1

## Source audit and sequence

Audit first, then Payment. Existing source uses 23 domain tables, UUID PKs, named
CHECKs (not PostgreSQL enums), shared pg.Pool, AsyncLocalStorage transaction context,
manual DI and repositories/implementations. Preserve this structure.
Invoice currently has UNPAID/CANCELLED, numeric total_amount, student_id,
contract_id and monthly_billing_id. No direct invoice cancellation endpoint.
MonthlyBilling cancellation currently cancels UNPAID children in its transaction.
No payment records or fine-grained finance staff permissions exist: V1 is ADMIN-only.

Read-only audit script captures actual PostgreSQL catalogs, all columns/nullability,
constraints/delete actions/indexes, counts, all FK orphan counts, occupancy and billing
invariants. Local development PostgreSQL service was stopped when audit started;
test cluster is isolated on loopback 55439. MongoDB service is already stopped.
Integration/seed tests use dedicated databases, never reset DATABASE_URL from .env.
Hardening finding: refresh and existing access tokens bypass LOCKED accounts;
recheck current user status/role for both, with real HTTP regression tests.

## Payment schema and invariants

Add version 003 (never edit applied 001/002): payments with UUID id, invoice_id,
amount NUMERIC integer VND >0 and <= JS safe integer, BANK_TRANSFER method,
PENDING/CONFIRMED/REJECTED/CANCELLED/VOIDED status; reference_code and note optional;
submitted_by, processed_by, voided_by reference users; timestamps/reasons retained.
No redundant student_id: derive ownership from invoice. No file upload or gateway.
FK to invoice/users RESTRICT. Named CHECKs and partial unique
uq_payments_pending_invoice map 23505 to PAYMENT_ALREADY_PENDING.
Reference codes are not globally unique. No payment edit/delete API.
Extend existing ck_invoices_status in migration to include PARTIALLY_PAID/PAID.

CONFIRMED total is the source of truth; aggregate in SQL for invoice/payment lists,
not per-row repository calls. PENDING does not reduce remaining balance. At most one
PENDING per invoice; submission checks amount <= total - confirmed under row lock.
For zero-total invoices, keep UNPAID when confirmed=0 (precedence from specification),
remaining=0 and prohibit submission. CANCELLED remains CANCELLED.
VOID corrects an erroneous accounting record, never moves money/refunds a bank.
VOIDED is terminal. Confirm/void recalculate invoice status in the same transaction.

## Lock order and cancellation

Payment mutation: immutable lookup for invoice ID → Invoice FOR UPDATE → Payment
FOR UPDATE → recheck ownership/state/confirmed sum → mutate → recompute invoice.
Read MonthlyBilling status without acquiring a later parent lock. Its cancellation
must lock every child invoice first before checking or changing financial state.
Billing cancel: MonthlyBilling FOR UPDATE → all child Invoices ORDER BY id FOR UPDATE
→ related payments (in that invoice order). Reject any confirmed money with
BILLING_HAS_CONFIRMED_PAYMENTS; otherwise cancel pending submissions, invoices,
parent atomically. No payment path later takes the parent billing lock, avoiding
lock-order inversion. Concurrent confirm/cancel must yield one coherent outcome.

## APIs and UI

Student: submit under /invoices/:invoiceId/payments; list own /payments/me,
get own /payments/:paymentId, cancel own pending. Invoice detail shows derived paid,
remaining, pending amount, form and payment history. Student ownership failures use 404.
Admin: payment list/detail/confirm/reject/void. Filters status, billingPeriod, page/limit.
Required reject/void reason and confirmation modal. Vietnamese status labels.
No new Debt, Payment gateway, Dashboard analytics or permission framework.

## Validation

Real PG catalog audit before/after. Core and expanded PostgreSQL regressions;
fresh migration/rollback and twice-run seeds; auth/facility/maintenance/notification;
rollback room change/checkout/finalize; bed and billing concurrency; occupancy both
directions; integer financial allocation. Payment partial/full/pending/overpay,
ownership/admin routes, rejection/cancellation/terminal void, injected rollback,
duplicate pending/confirm, billing cancel race and SQLSTATE diagnostics.
One-pending policy makes two distinct simultaneous pending payments impossible;
test same-payment confirmation races and stale amount recheck explicitly rather
than disable production constraints to fabricate an impossible fixture.
Build backend/frontend, generate ERD from queried schema, publish evidence/limitations.
