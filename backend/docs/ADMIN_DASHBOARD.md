# Admin Dashboard metrics

The Admin Dashboard is a read-only projection over the existing PostgreSQL business tables. It does not own or cache business state.

## Current-state summary

- `totalUsableBeds`: beds in an `ACTIVE` building and a room whose status is `AVAILABLE` or `FULL`. Rooms in `MAINTENANCE` or `LOCKED` and non-active buildings are excluded from operating capacity.
- `occupiedBeds`: `OCCUPIED` beds inside the same usable capacity. The API checks this count against `ACTIVE` contracts on those beds and reports an integrity error on a mismatch.
- `occupancyRate`: `occupiedBeds / totalUsableBeds * 100`, rounded to one decimal. A zero denominator returns zero.
- Expiring contracts: only `ACTIVE` contracts whose `end_date` is in the next 7 or 30 Vietnam calendar days.
- Open maintenance: actual `PENDING` and `IN_PROGRESS` requests. There is no overdue metric because the schema has no maintenance due date.
- Billed amount: sum of non-cancelled invoice totals.
- Confirmed revenue: sum of `CONFIRMED` payment amounts. Current-month revenue uses `processed_at` and `Asia/Ho_Chi_Minh` month boundaries.
- Outstanding amount: for each non-cancelled invoice, `invoice.total_amount - SUM(CONFIRMED payments)`, then summed. Pending, rejected, cancelled and voided payments are excluded. Any overpaid invoice is surfaced as an integrity error rather than clamped.

## APIs

- `GET /api/v1/admin/dashboard/summary`: small current-state aggregates and occupancy grouped by building.
- `GET /api/v1/admin/dashboard/trends?months=6`: confirmed-payment revenue, utility usage by billing period, and maintenance status distribution. `months` accepts 1–12.

Trend responses contain only periods present in PostgreSQL; missing periods are not synthesized as zero.
