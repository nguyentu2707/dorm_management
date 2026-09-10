# Báo cáo migration PostgreSQL + node-postgres

## Phạm vi và kiến trúc

Thay persistence MongoDB/Mongoose bằng PostgreSQL/pg, giữ Express, TypeScript ESM, Zod, JWT, bcrypt, manual DI, Service, Repository Interface và các state machine. PostgreSQL cung cấp FK, CHECK, UNIQUE, JOIN và row locking cho dữ liệu cư trú/tài chính. `pg` giữ SQL tường minh trong repository và tránh thêm ORM.

Nguồn audit là working tree thực tế, bao gồm các thay đổi chưa commit trước task. [Implementation Plan](IMPLEMENTATION_PLAN_POSTGRES.md) ghi bảng ánh xạ, quyết định và các vấn đề source được phát hiện trước khi sửa. Migration ban đầu có 23 bảng nghiệp vụ (bao gồm class_schedule_entries). [ERD hiện tại](backend/docs/POSTGRES_ERD.md) được cập nhật sau Payment; xem [báo cáo audit mới](POSTGRES_AUDIT_AND_PAYMENT_REPORT.md) cho trạng thái và sự cố/khôi phục ngày 07/09/2026.

## Thiết kế đã triển khai

| Nội dung | Kết quả |
|---|---|
| Schema | 23 bảng; migrations `001_initial`, `002_query_indexes`; runner SQL có checksum, advisory lock, transaction, up/down |
| PK | UUID; `gen_random_uuid()` với pgcrypto được enable tường minh; cursor dùng room_id làm PK |
| FK và delete | FK cho toàn bộ entity references; mặc định RESTRICT; CASCADE cho child sở hữu bởi notification, schedule, invoice và room cursor |
| Contract/Bed/Room | Giữ room_id; composite FK (bed_id,room_id) → beds(id,room_id) |
| Unique | Username, email, MSSV, 1:1 profiles, số phòng trong tòa, số giường trong phòng, serial, room+period, invoice segment và recipient |
| Partial unique | Một open contract/student; một ACTIVE contract/bed; một PENDING room change hoặc checkout/student trong từng bảng |
| CHECK | Status/enums, capacity/floor, nonnegative values, giới hạn số an toàn, định dạng kỳ, ngày hợp đồng, meter chain |
| Tiền | NUMERIC; DTO vẫn number trong safe range. Giữ fractional prices/meters mà validators hiện tại cho phép; VND invoice allocations vẫn số nguyên theo calculator hiện có |
| Giá phòng | Theo mỗi người cư trú; prorate theo resident-days, không chia capacity |
| Ngày | TIMESTAMPTZ giữ instant JS Date; billingPeriod giữ YYYY-MM; lịch tính theo Việt Nam |
| Transaction | Opaque context + một PoolClient; BEGIN/COMMIT/ROLLBACK/release; AsyncLocalStorage chống bỏ sót tham số transaction; rollback lỗi không che lỗi gốc |
| Concurrency | Conditional bed claim; khóa mutable records; serialize room occupancy; cursor FOR UPDATE; stale state transition bị từ chối |
| Billing | DRAFT/Preview/FINALIZE; đọc cursor rồi tính; reading/invoices/items/finalized/cursor cùng transaction; CANCEL không rewind hoặc cho tái tạo kỳ |
| Utility relation | Unique FK từ utility_readings đến monthly_billings; derive utilityReadingId ở chiều ngược |
| SQLSTATE | Tra exact SQLSTATE + tên constraint; không parse message; sanitized fallback; 40001/40P01/55P03 trả conflict một lần |
| DTO/frontend | String UUID, camelCase và response envelopes; không đổi UI; loại ObjectId validators; batch query cho facility lists |
| Seed | Admin, 10 phòng/40 giường/65 thiết bị; demo 34 residents; idempotent theo business keys; không tự chạy production |
| Runtime | Một shared pg.Pool; startup kiểm tra kết nối; shutdown đóng pool; package và lockfile bỏ Mongoose |

Các mapping quan trọng đã được kiểm chứng bằng PostgreSQL thật:

```text
23505 + uq_users_email -> EMAIL_ALREADY_EXISTS (409)
23505 + uq_rooms_building_room_number -> ROOM_NUMBER_ALREADY_EXISTS (409)
23505 + uq_monthly_billings_room_period -> MONTHLY_BILLING_ALREADY_EXISTS (409)
23505 + uq_utility_readings_room_period -> UTILITY_READING_ALREADY_EXISTS (409)
23503 + fk_contracts_bed_room -> CONTRACT_ROOM_MISMATCH (409)
```

Test kiểm tra mọi tên trong catalog có định nghĩa chính xác trong migrations, SQLSTATE sai không chọn mapping, tên gần giống/tên prototype không được chấp nhận và response không lộ SQL/detail/constraint/stack.

## Kết quả kiểm chứng

Môi trường kiểm thử: Node.js 22.22.2, PostgreSQL 18.4 thật chạy riêng tại loopback port 55439; database `dormitory_migration_test` và `dormitory_seed_test` mới tạo trong workspace. Không dùng database Mongo/dev hiện có để reset.

- Backend TypeScript build: PASS.
- Đã áp dụng bản kiểm chứng vào source chính với hash guard và backup; chạy lại core/integration tests sau khi gỡ Mongoose vẫn PASS. `git diff --check` sạch.
- Khởi động `dist/server.js` với PostgreSQL: PASS; `/health` và frontend HTML trả thành công; không có package Mongoose trong dependency runtime.
- TypeScript seed scripts build: PASS.
- Frontend TypeScript/Vite build: PASS (cảnh báo chunk size và annotation từ dependency hiện có).
- Core tests: **41/41 PASS**.
- PostgreSQL integration: **16 scenarios PASS**, Node test runner báo **17/17 entries PASS** khi tính cả suite cha.
- Migration down/up/reapply: PASS, gồm kiểm tra schema_migrations.
- Registration rollback, shared connection và stale-context rejection: PASS.
- Hai approvals cùng giường, hai giường cùng phòng, room change, checkout và race checkout/close: PASS.
- FINALIZE/cancel, rollback khi ghi items thất bại, FINALIZE cùng draft và hai kỳ liên tiếp đồng thời: PASS; meter chain/cursor nhất quán.
- HTTP register/login/email duplicate/UUID validation/authorization/dashboard: PASS.
- Seed từ rỗng: đúng 10 rooms, 40 beds, 65 equipment; lần hai thêm 0 room/0 equipment.
- Demo seed: 34 ACTIVE residents, 85% occupancy; lần hai thêm 0 contract; kiểm tra orphan occupancy/duplicate active beds/full rooms đều 0 lỗi.
- Audit source runtime: không còn Mongoose/ObjectId/MONGO_URI/populate/lean/startSession/E11000. SQL `_id` suffixes là cột relational, không phải Mongo `_id`.

## Dữ liệu và cutover vận hành

Chưa có xác nhận rằng dữ liệu Mongo hiện tại có thể bỏ. Vì vậy code chuẩn bị phương án **fresh database + demo reseed**, đồng thời **không sửa/xóa/import Mongo và không đổi `.env` thật**. Nếu cần giữ dữ liệu, phải bổ sung ETL có ObjectId→UUID mapping, kiểm tra counts/FK/invariants trước khi cutover; ETL đó chưa được triển khai. Không có dual-write.

Sau khi cấu hình `DATABASE_URL`, chạy migration và seed trên DB đã chọn. Khi cutover, backup Mongo trước, rotate JWT secrets và yêu cầu đăng nhập lại. Access/refresh token với ObjectId bị từ chối. Thư mục làm việc tạm và các bản backup cục bộ của đợt migration đã được dọn dẹp ngày 2026-09-08.

## Giới hạn và thay đổi có chủ đích

- Email uniqueness là bổ sung được yêu cầu; vẫn nullable và so sánh case-sensitive, chưa tự normalize. Data import sau này phải xử lý email trùng.
- Bỏ standalone-Mongo fallback trong auth/room/profile. Sửa DI seed cũ thiếu checkout repository. Chặn các utility write methods cũ để không khôi phục workflow độc lập.
- FK sẽ từ chối xóa entity có lịch sử tham chiếu, kể cả một số trường hợp Mongo trước đây để lại orphan; đây là bảo vệ relational đã ghi trong kế hoạch.
- Lỗi deadlock/serialization không tự retry callback; client nhận CONCURRENT_MODIFICATION để tải lại và thử lại có kiểm soát.
- Seed IDs là UUID sinh lần đầu, không giống nhau giữa hai database mới; dữ liệu demo và quy tắc tái sử dụng business keys ổn định.
- Có Compose PostgreSQL 17 nhưng máy hiện tại không có Docker, nên chưa chạy kiểm thử Compose. Integration đã chạy trên PostgreSQL 18.4 thật. Không triển khai production hoặc thay database hiện có.

Tài liệu nền: [PostgreSQL SQLSTATE diagnostics](https://www.postgresql.org/docs/current/errcodes-appendix.html), [pg transaction requirements](https://node-postgres.com/features/transactions).
