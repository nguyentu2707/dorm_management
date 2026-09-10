# PostgreSQL persistence migration — source audit and implementation plan

Audit baseline: working tree on 2026-09-06, including uncommitted checkout, maintenance, residence history and monthly billing work. Preserve these changes. No database has been reset or cut over.

## Decisions before implementation

- Use PostgreSQL + `pg`, one shared Pool, semantic repository interfaces, manual DI. Replace Mongoose documents with plain domain records (`id: string`).
- UUID keys, generated in PostgreSQL with `gen_random_uuid()`; migration explicitly enables `pgcrypto`. No ObjectId compatibility in runtime.
- Data strategy: prepare a fresh database and repeatable demo seeds (option A), pending the user's answer about existing data. Do not delete or change Mongo, or automatically import/reset any database. Existing data importance cannot be inferred from source. Preserve-data cutover needs a separate verified ObjectId-to-UUID import if requested.
- `TIMESTAMPTZ` preserves all existing JS Date instants, including contract start/end and DOB. Periods stay canonical `YYYY-MM` strings.
- `NUMERIC` for prices/amounts and meters. Billing allocation already rounds VND to integers. Existing facility/maintenance validators accept fractional prices, so retain those with exact NUMERIC storage rather than silently rounding them. Map numeric results to number only within the documented safe range; financial integer amounts must be safe integers.
- RoomType price is **per occupant**, prorated by resident days for each contract segment; never divide by capacity.
- Consistent text + named CHECK constraints for domain enums. Optional source properties remain nullable; mapper omits SQL NULL for optional properties, preserving API serialization. Cursor period remains explicit null.
- Retain contracts.room_id with composite FK `(bed_id, room_id) -> beds(id, room_id)`. Historical references use RESTRICT. Notification recipients and schedule entries belong to their parent; CASCADE is appropriate. Invoice items may CASCADE with invoice, although no invoice hard-delete workflow exists.
- Same PoolClient throughout a transaction; use an opaque transaction context and async context guard so an omitted optional argument cannot escape to the pool. BEGIN/COMMIT/ROLLBACK/release; rollback failure must not mask original error; bounded handling of SQLSTATE 40001/40P01.
- Conditional bed claim; row locks for mutable contract/request reads in a transaction. Serialize room occupancy updates and billing via room/cursor locks. Deadlocks surface as retryable business conflicts rather than infinite retries.
- Create each room's cursor atomically with the room. Lock cursor FOR UPDATE before billing calculation, retain append-only consumed history after cancellation. Utility reading references monthly billing (unique FK), derive reverse utilityReadingId in DTO.
- Error translation uses **SQLSTATE + exact explicit constraint name**, never localized message parsing. Unknown errors get sanitized fallback; never return SQL/constraint/detail to clients.

## Relational mapping

All tables have UUID `id` PK (`pk_<table>`) and timestamps unless noted. Every FK and CHECK is explicitly named (`fk_`, `ck_`); UNIQUE names start `uq_`. Migration 001 creates schema, 002 installs query indexes; separate seed scripts insert parents before children. No business seed data in schema migrations.

| Mongo entity | PostgreSQL table / PK | Foreign keys | UNIQUE / partial indexes | CHECK | Nullable | Delete policy / query indexes | Seed order |
|---|---|---|---|---|---|---|---|
| User | users / id | — | username; email (requested) | role, status | email, phone, avatarUrl | referenced users RESTRICT | 1 |
| Student | students / id | user_id→users | user_id, mssv | gender | all profile fields except mssv/userId | RESTRICT; mssv unique supports search/order | 2 |
| Staff | staff / id | user_id→users | user_id | position | — | RESTRICT | 2 |
| Building | buildings / id | — | — | — | address, description | RESTRICT; name ordering | 3 |
| RoomType | room_types / id | — | — | capacity≥1, price≥0 | description | RESTRICT | 4 |
| Room | rooms / id | building_id, room_type_id | building_id+room_number | floor≥0, status | — | RESTRICT; building/floor/number, room_type | 5 |
| RoomBillingCursor | room_billing_cursors / room_id | room_id→rooms | PK | period format, version≥0 | latest_finalized_billing_period | CASCADE; PK row lock | automatic with room |
| Bed | beds / id | room_id→rooms | room_id+bed_number; id+room_id | status | — | RESTRICT; room/status | 6 |
| EquipmentCategory | equipment_categories / id | — | — | lifespan≥1 | default_lifespan_months | RESTRICT | 7 |
| EquipmentItem | equipment_items / id | category_id, room_id | serial_number (NULL allowed) | condition, price≥0 | serial, purchase date/price | RESTRICT; category, room | 8 |
| Contract | contracts / id | student_id, room_id, bed_id+room_id, approved_by→users | student WHERE PENDING/ACTIVE; bed WHERE ACTIVE | status, end>start | reasons, approval, ended_at | RESTRICT; student/status, bed/status, room/status | 9 |
| RoomChangeRequest | room_change_requests / id | student_id, current_contract_id, target_bed_id, processed_by→users | student WHERE PENDING | status | reason, processing, rejection | RESTRICT; student/status, status/created | 10 |
| CheckoutRequest | checkout_requests / id | student_id, contract_id, room_id, processed_by→users | student WHERE PENDING | status | reason, processing, rejection, cancellation | RESTRICT; contract/status, room/status | 11 |
| MaintenanceRequest | maintenance_requests / id | student_id, room_id, equipment_item_id, assigned_staff_id→staff | — | category/status/resolution enums, cost≥0 | equipment, staff, all processing/resolution/cancellation metadata | RESTRICT; status, room, student, staff | 12 |
| Notification | notifications / id | target_building_id, target_student_id, created_by→users | — | target scope | target IDs | RESTRICT; created_at | 13 |
| NotificationRecipient | notification_recipients / id | notification_id, student_id | notification_id+student_id | — | read_at | notification CASCADE; student RESTRICT; student/read/created | 14 |
| RoomPreference | room_preferences / id | student_id | student_id | preference enums | price, occupancy, hot water | RESTRICT | 15 |
| ClassSchedule | class_schedules / id | student_id | student_id | — | — | RESTRICT | 16 |
| Embedded schedule entry | class_schedule_entries / id | schedule_id | — | day, periods, end≥start | — | schedule CASCADE; schedule_id | 17 |
| MonthlyBilling | monthly_billings / id | room_id, finalized_by/cancelled_by→users | room_id+billing_period ALL statuses | status, period, nonnegative values | finalized snapshot and audit fields | RESTRICT; room/period, period ordering | 18 |
| UtilityReading | utility_readings / id | room_id, monthly_billing_id, recorded_by→users | room_id+period; monthly_billing_id | period, nonnegative meters/prices, current≥previous | — | RESTRICT | 19 |
| Invoice | invoices / id | monthly_billing_id, student_id, contract_id | monthly_billing_id+contract_id | status, period, positive days, nonnegative money | — | RESTRICT; student/period | 20 |
| InvoiceItem | invoice_items / id | invoice_id | invoice_id+type | type, amount≥0 | — | invoice CASCADE | 21 |

Schedule entries use a child table, preserving entry order with an ordinal column. No business relationship arrays are stored as JSONB. SQL JSON projections are read results only.

## Source findings to address during persistence replacement

1. Email currently has no unique index. Add `uq_users_email` explicitly as requested; NULL remains allowed, equality remains case-sensitive to avoid inventing normalization semantics. Existing duplicate email data would require audit before preserve-data import.
2. Repository interfaces expose ClientSession/HydratedDocument/ObjectId. Replace these type leaks with transaction context/plain records while keeping method semantics.
3. Dashboard directly queries Mongoose models from Service. Move its persistence queries into a dashboard repository and inject it.
4. Auth/room creation contain standalone-Mongo nontransactional fallback. PostgreSQL supports transactions; remove that obsolete fallback.
5. UtilityReading service still contains old independent write methods although current routing disables that workflow. Do not re-enable it. Official writes require monthly billing linkage.
6. Source Mongo constraint protects one open contract per student, but no unique ACTIVE bed index. Conditional claim already enforces the intent; add a partial unique index as database protection.
7. READ COMMITTED does not reproduce Mongo snapshot/write-conflict behavior by itself. Transactional mutable reads must lock rows, and room status updates must serialize occupancy changes.
8. Existing integration fixtures deliberately use orphan IDs; replace with real relational parents in a separate PostgreSQL test database. Unit fixtures should use plain IDs and records.
9. No Docker/deployment config or installed PostgreSQL/docker executable was discovered. Supply Docker setup and check whether a local isolated PostgreSQL test instance can be provisioned.
10. Further audit found the same standalone-Mongo fallback in profile updates and a missing checkout repository argument in the existing demo-student seed. Remove the fallback and repair seed DI. Student facility lists issue per-room queries; use existing batch summaries and the room-type catalog to keep query count fixed.
11. Active-contract reads during pending request creation need a transaction row lock so a checkout cannot be inserted after a concurrent contract close has already performed its cleanup. Conditional contract/request transitions must reject stale state rather than overwrite an approval. These are persistence concurrency protections for the existing state machine.

## Validation and cutover

Build backend/frontend, preserve core service tests, exercise real PostgreSQL migrations up/down/reapply and seed idempotency. Test actual constraint diagnostics and HTTP sanitization; registration rollback; contract approval race; room change/checkout; billing finalize rollback/race/cancellation and meter chain; notifications, recommendation, maintenance and authorization.

Before operational cutover: back up Mongo, run PostgreSQL migrations and seed/import, verify FK/occupancy/billing invariants, rotate token secrets and require login. Do not delete Mongo. Runtime uses DATABASE_URL; old JWT IDs are rejected. Document commands, ERD, findings and actual test results, including any unverified items.

References: [PostgreSQL SQLSTATE diagnostics](https://www.postgresql.org/docs/current/errcodes-appendix.html), [pg transactions](https://node-postgres.com/features/transactions).
