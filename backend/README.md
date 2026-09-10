# Dormitory Management Backend — PostgreSQL + pg

Node.js, Express, TypeScript ESM, Zod, JWT, bcrypt, PostgreSQL and node-postgres. Controller → Service → Repository Interface → PostgresRepository → shared pg.Pool. Domain records and IDs are plain TypeScript values; no ORM or MongoDB runtime is required.

## Development

### Kết nối PostgreSQL trên Windows

Backend kết nối trực tiếp bằng `pg.Pool` trong `src/database/pool.ts`, đọc
`DATABASE_URL` từ `backend/.env`. pgAdmin chỉ là công cụ quản trị database.

Nếu dùng PostgreSQL đã cài trên máy:

1. Mở pgAdmin, kết nối server PostgreSQL của bạn và tạo database
   `dormitory_management` (hoặc chạy `CREATE DATABASE dormitory_management;`).
2. Trong `backend/.env`, thay dòng `MONGO_URI` bằng dòng sau, dùng đúng user,
   mật khẩu và port của server. Giữ các cấu hình JWT và admin hiện có.

   ```dotenv
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5432/dormitory_management
   ```

   Mã hóa ký tự đặc biệt trong mật khẩu theo URL, ví dụ `@` thành `%40`.
   `YOUR_PASSWORD` là giá trị cần thay, không phải mật khẩu được tạo sẵn.

3. Chạy trong PowerShell:

   ```powershell
   cd "E:\DO AN\dormitory_management_system\backend"
   npm.cmd run db:migrate
   npm.cmd run seed:admin
   npm.cmd run seed:dormitory
   npm.cmd run dev
   ```

   Seed dormitory tạo dữ liệu phòng/giường mẫu; có thể bỏ qua nếu tự nhập dữ liệu.
   Để thêm sinh viên demo, chạy `npm.cmd run seed:demo-students` sau seed dormitory.

Nếu dùng Docker, đặt `POSTGRES_PASSWORD` trong `.env`, dùng user `dormitory`
trong `DATABASE_URL` với cùng mật khẩu, rồi chạy `docker compose up -d --wait`
trước các lệnh migration/seed trên. `compose.yaml` tự tạo database
`dormitory_management`. Chỉ cần một trong hai cách chạy PostgreSQL.

Nếu gặp `ECONNREFUSED`, kiểm tra server đã chạy và đúng port; nếu báo
`password authentication failed`, kiểm tra user/mật khẩu; nếu báo database
không tồn tại, tạo database trước khi chạy migration.

### General setup

From `backend`, copy `.env.example` to `.env` and set database credentials and token secrets. The application uses only `DATABASE_URL` for its database connection. The optional Compose service reads `POSTGRES_PASSWORD`; match it to the password in `DATABASE_URL`.

```sh
npm ci
docker compose up -d --wait
npm run db:migrate
npm run seed:admin
npm run seed:dormitory
npm run seed:demo-students
npm --prefix ../frontend run build
npm run dev
```

An existing PostgreSQL server can be used instead of Docker. Startup verifies database connectivity before listening; SIGINT/SIGTERM closes HTTP and the pool. Seeds are explicit commands, disabled for `NODE_ENV=production`, and are never run by startup. Repeating seeds reuses existing business keys; UUIDs are generated on first insert, so IDs differ between newly created databases.

## Migrations

`migrations/001_initial.up.sql` creates relational tables and constraints. `002_query_indexes.up.sql` creates query and partial unique indexes. `scripts/migrate.mjs` applies files in order, records checksums, serializes concurrent runners with an advisory lock, and runs each migration in a transaction.

```sh
npm run db:migrate
# Explicitly undo the latest migration (destructive for the initial schema):
npm run db:rollback
```

Do not edit a migration after it has been applied. Add another version. Initial migration enables `pgcrypto`, so the migration role needs permission to install that extension. Runtime uses UUID strings and does not require extension-management privileges.

## Auth sessions and Student Registry

Access tokens remain short-lived JWTs and are stored by the current frontend in
`localStorage` for compatibility. Refresh tokens are sent only through the
`dormitory_refresh` HttpOnly cookie (Secure in production, SameSite=Lax, path
`/api/v1/auth`) and only their SHA-256 hashes are stored in PostgreSQL. Each refresh
rotates to a new `refresh_sessions` row; logout, password change and account lock
revoke the applicable server-side sessions. Configure `CORS_ORIGIN` as a
comma-separated explicit allow-list; credentialed CORS never uses `*`.

This cookie policy assumes the UI and API are same-site (the Vite development proxy
also presents them as one origin). A future cross-site deployment must reassess
SameSite and add explicit CSRF protection before relaxing it.

Public student registration verifies normalized MSSV + email against an AVAILABLE
`student_registry` row. The registry supplies full name, MSSV, gender and optional
date of birth; registration always assigns STUDENT and atomically marks the identity
CLAIMED. Admin can create/edit/enable/disable unclaimed identities at
`/api/v1/admin/student-registry`; claimed identities cannot be edited, disabled or
returned to AVAILABLE. There is intentionally no public registry lookup endpoint.

No scheduler is installed for session cleanup. An operator may periodically run a
reviewed cleanup such as:

```sql
DELETE FROM refresh_sessions
WHERE expires_at < now() - interval '30 days'
   OR revoked_at < now() - interval '30 days';
```

## Tests

`npm run db:check` kiểm tra kết nối/version; `npm run db:audit` truy vấn chỉ đọc
catalog, FK orphan, occupancy, billing cursor, phân bổ phí và Payment invariants.
Lưu snapshot bằng `node scripts/audit-postgres.mjs docs/schema.json`; sinh ERD từ
snapshot bằng `node scripts/schema-to-erd.mjs docs/schema.json docs/POSTGRES_ERD.md`.

Payment V1 dùng migration `003_payments`: invoice statuses gồm UNPAID,
PARTIALLY_PAID, PAID, CANCELLED. Có Payment history thì rollback 003 sẽ từ chối;
cần sao lưu và xử lý dữ liệu tài chính có chủ đích trước khi gỡ module.

```sh
npm run test:core
```

Create a **separate** database whose name ends in `_test`. The integration suite resets its tables; it refuses to run without explicit `TEST_DATABASE_URL`. Never use a development/production database for it. With Compose, for example:

```sh
docker compose exec postgres createdb -U dormitory dormitory_test
# Set TEST_DATABASE_URL in the shell or .env, then:
npm run test:postgres
```

The PostgreSQL suite verifies migration rollback/reapplication, real SQLSTATE diagnostics, concurrency, transaction rollback, authentication, HTTP authorization, billing allocation, cursor history, room change/checkout, notifications, recommendations and reference integrity. Core tests include sanitized error responses and exact constraint-catalog consistency.

`npm run test:postgres` khởi động tiến trình test với DATABASE_URL đã được đặt bằng
TEST_DATABASE_URL trước khi import. Test kiểm tra cả Pool connectionString lẫn
current_database() trước migration/reset. Không chạy test lên database development.
Suite có Payment partial/full/reject/cancel/void, ownership, duplicate submit/confirm,
rollback và confirm tranh chấp với billing cancel. `node scripts/smoke-postgres.mjs`
kiểm tra startup/HTML/API với cùng TEST_DATABASE_URL (port 3017 phải trống).

`npm run smoke:ui-api` là kiểm tra chỉ đọc trên database đang cấu hình: đăng nhập bằng
admin trong `.env`, gọi các endpoint danh sách mà giao diện quản trị sử dụng và xác
nhận các URL React chính đều phục vụ frontend. Script dùng port 3018 và không seed,
reset hay sửa dữ liệu.

Kiểm tra invariant số giường của tất cả phòng trên database đang cấu hình bằng
`npm run db:audit:room-capacity`. Script chỉ đọc, trả về tòa/phòng/loại phòng,
capacity mong đợi và số Bed thực tế; exit code 2 nếu có mismatch và không tự sửa dữ liệu.

## Constraints and errors

Names are part of the persistence contract: `pk_`, `fk_`, `uq_`, `ck_`, `ix_`. Critical names are explicit in SQL, including partial unique indexes. `src/database/postgres-errors.ts` translates **SQLSTATE + exact constraint name** at the persistence boundary. The global middleware also handles errors raised during connection/commit.

| PostgreSQL diagnostic                   | HTTP | Public code                           |
| --------------------------------------- | ---: | ------------------------------------- |
| 23505 + uq_users_email                  |  409 | EMAIL_ALREADY_EXISTS                  |
| 23505 + uq_rooms_building_room_number   |  409 | ROOM_NUMBER_ALREADY_EXISTS            |
| 23505 + uq_monthly_billings_room_period |  409 | MONTHLY_BILLING_ALREADY_EXISTS        |
| 23505 + uq_utility_readings_room_period |  409 | UTILITY_READING_ALREADY_EXISTS        |
| 23503 + fk_contracts_bed_room           |  409 | CONTRACT_ROOM_MISMATCH                |
| Unknown unique/FK                       |  409 | VALIDATION_ERROR / REFERENCE_CONFLICT |
| Unknown CHECK/NOT NULL                  |  400 | VALIDATION_ERROR                      |
| 40001 / 40P01 / 55P03                   |  409 | CONCURRENT_MODIFICATION               |
| Unexpected DB error                     |  500 | INTERNAL_SERVER_ERROR                 |

No localized message parsing; no SQL text, constraint name, detail, password, URL or stack in client responses. A mismatched SQLSTATE never uses another class's constraint mapping. Deadlocks/serialization conflicts are surfaced once; the API caller can retry the entire operation after reloading current state.

## Transaction and data semantics

- `ITransactionManager` exposes an opaque context. `PostgresTransactionManager` owns BEGIN/COMMIT/ROLLBACK and always releases its PoolClient. Async context routes all repository calls in the callback through that client, even if an optional argument is omitted. A stale/mismatched context is rejected.
- Bed claims use conditional UPDATE. Mutable contract/request/room reads lock rows inside transactions. Existing state transitions and role checks remain in services; conditional writes reject stale transitions.
- Every room gets a billing cursor in the same SQL statement through an insert trigger. FINALIZE locks the cursor `FOR UPDATE`, recalculates, writes the official reading/invoices/items and advances history atomically. CANCEL cancels invoices and never rewinds the cursor or frees the period for regeneration.
- Contracts retain room_id and have `(bed_id,room_id) → beds(id,room_id)` composite FK. Most deletes RESTRICT; recipients, schedule entries, invoice items and room cursors have parent-owned CASCADE policies.
- Utility readings own the unique FK to monthly billings. Monthly billing DTO derives utilityReadingId. Official utility writes are only available through FINALIZE.
- RoomType price is per occupant, prorated by resident days. Shared charges use existing exact allocation rules. Prices/meters use PostgreSQL NUMERIC, never floating-point storage. Source validators permit fractional prices/meters, so storage preserves those fractions; calculated VND invoice components remain integer values. The DB and mapper reject values outside JS's supported safe range. DTO monetary fields stay numbers.
- Existing Date instants remain TIMESTAMPTZ (including start/end and DOB). Billing period remains `YYYY-MM`; billing calculations retain Vietnam calendar rules.
- Optional SQL NULLs become omitted optional properties. Explicit-null fields (billing cursor period, hot-water preference) keep null. Joined history dates are mapped back to Date.
- Schedule entries and invoice items are relational rows. SQL JSON projections are result formatting, not JSON storage for relationships. List queries use parameterized filters, explicit sorting and batched JOINs.

## Cutover and rollback operations

The implementation prepares **fresh database + demo reseed**. Existing Mongo data has not been changed. If data must be preserved, first build and verify an ObjectId→UUID import using reference mappings; there is no automatic ETL or dual-write path in this implementation.

Before switching a real installation: back up Mongo with `mongodump --uri <source-uri> --archive=<backup-file>`, create PostgreSQL, apply migrations and seed/import, verify invariants, set DATABASE_URL, rotate JWT secrets, restart, and require all users to log in. Old ObjectId access/refresh tokens are rejected. Keep the Mongo backup until verification is complete.

PostgreSQL backup/restore examples, with credentials supplied through standard PostgreSQL environment/service configuration:

```sh
pg_dump -Fc -d dormitory_management -f dormitory.dump
createdb dormitory_restored
pg_restore --no-owner -d dormitory_restored dormitory.dump
```

Back up before schema rollback. Never use the integration reset or demo reset as a production migration procedure. See `docs/POSTGRES_ERD.md` and the repository-level migration report for audit decisions and actual validation results.

Reference documentation: [PostgreSQL SQLSTATE](https://www.postgresql.org/docs/current/errcodes-appendix.html), [node-postgres transactions](https://node-postgres.com/features/transactions).
