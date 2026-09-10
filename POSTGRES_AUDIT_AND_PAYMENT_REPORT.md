# PostgreSQL audit và Payment V1 — 07/09/2026

## Kết quả và sự cố cần biết

Đã kiểm tra catalog PostgreSQL thật, bổ sung hardening tài khoản LOCKED và triển khai
Payment V1 từ migration tới API và giao diện. Backend/core 43/43; integration PostgreSQL
29/29 entries (28 kịch bản con + suite cha); frontend build thành công.

**Có sự cố ghi nhầm database trong quá trình bổ sung test.** Static import của file
Payment scenarios đã khởi tạo Pool bằng DATABASE_URL từ `.env` trước khi test gán
TEST_DATABASE_URL. Test đã reset/ghi dữ liệu thử vào `dormitory_management`.
Guard cũ chỉ so sánh biến môi trường nên không bảo vệ được Pool đã tạo trước đó.
Đã thông báo ngay cho người dùng khi xác định được nguyên nhân.

Theo lựa chọn của người dùng, đã tạo database riêng **dormitory_recovered_20260907**
trên server PostgreSQL hiện tại, chạy migration 001–003, seed admin theo `.env` và
seed cơ sở vật chất: **1 admin, 10 phòng, 40 giường, 65 thiết bị**, 0 sinh viên/hợp đồng.
Đây là dữ liệu seed tương đương inventory trước sự cố, **không phải khôi phục nguyên
bản UUID, timestamp hoặc các thuộc tính đã chỉnh sửa**. Không có bản dump dữ liệu gốc
trước sự cố. Database bị ảnh hưởng được giữ nguyên để đối chiếu. Sau khi người dùng
yêu cầu tiếp tục và đã kiểm chứng admin login/tòa nhà/payments API trên database mới,
đã chuyển phần tên database trong DATABASE_URL sang `dormitory_recovered_20260907`,
giữ nguyên user/password/host/port và các cấu hình khác. `npm run db:check` xác nhận
đang kết nối PostgreSQL 18.6 và đúng database khôi phục. Có thể kiểm tra trong pgAdmin.

Phòng ngừa đã triển khai:

- `scripts/run-postgres-tests.mjs` đặt DATABASE_URL=TEST_DATABASE_URL trong môi trường
  tiến trình con **trước mọi static import**.
- Test dùng dynamic import sau khi cấu hình, kiểm tra `pool.options.connectionString`
  bằng chính URL được chọn và `SELECT current_database()` trước bất kỳ migration/reset.
- Tên DB bắt buộc kết thúc `_test`. Lần kiểm chứng cuối chạy trên
  `dormitory_payment_20260907_test`, cluster loopback 55439; không dùng DB khôi phục.

## Bằng chứng schema thật

Snapshot chỉ chứa catalog/counts/invariants, không chứa mật khẩu hoặc nội dung bản ghi:

- [Database development trước Payment/sự cố](backend/docs/POSTGRES_SCHEMA_DEVELOPMENT.json): PostgreSQL 18.6, 23 bảng nghiệp vụ.
- [Fresh seed trước Payment](backend/docs/POSTGRES_SCHEMA_SEED.json): PostgreSQL 18.4, 23 bảng nghiệp vụ.
- [Fresh seed cuối cùng với Payment, chạy hai lần](backend/docs/POSTGRES_SCHEMA_FINAL_SEED.json): PostgreSQL 18.4, 24 bảng nghiệp vụ, 34 ACTIVE contracts.
- [Schema sau Payment trên DB test](backend/docs/POSTGRES_SCHEMA_WITH_PAYMENTS.json): 24 bảng nghiệp vụ.
- [Database khôi phục riêng](backend/docs/POSTGRES_SCHEMA_RECOVERED.json): PostgreSQL 18.6, 24 bảng nghiệp vụ.
- [ERD từ catalog thật](backend/docs/POSTGRES_ERD.md): mọi cột, PK/FK/UK, cardinality,
  toàn bộ FK và ON DELETE, toàn bộ index definitions, gồm partial unique predicates.

|Kiểm tra|Trước Payment|Sau Payment|
|---|---:|---:|
|Bảng nghiệp vụ|23|24|
|Bảng kỹ thuật schema_migrations|1|1|
|PK|24|25|
|FK|42|46|
|UNIQUE constraints (không tính unique indexes riêng)|18|18|
|CHECK (không tính NOT NULL)|111|120|
|Indexes (gồm PK/UNIQUE)|67|72|
|Bảng thiếu PK|0|0|
|FK orphan records|0|0|

PK nghiệp vụ dùng UUID; room_billing_cursors dùng room_id UUID làm PK/FK. Không có
integer/ObjectId PK xen lẫn. schema_migrations dùng version text là bảng kỹ thuật.
PK/UNIQUE thật bảo vệ ID trùng. UUID validators/JWT từ chối ObjectId 24 ký tự cũ.

Inventory đối chiếu domain/repository với database:

|Bảng|Phân loại|
|---|---|
|users, students, staff|CORRECT TABLE|
|buildings, room_types, rooms, beds|CORRECT TABLE|
|equipment_categories, equipment_items|CORRECT TABLE|
|contracts, room_change_requests, checkout_requests|CORRECT TABLE|
|maintenance_requests|CORRECT TABLE|
|notifications, notification_recipients|CORRECT TABLE|
|room_preferences, class_schedules, class_schedule_entries|CORRECT TABLE|
|monthly_billings, room_billing_cursors, utility_readings|CORRECT TABLE|
|invoices, invoice_items|CORRECT TABLE|
|payments|CORRECT TABLE — bổ sung ở giai đoạn Payment|
|schema_migrations|CORRECT TABLE — kỹ thuật, không phải domain|

Không có MISSING/UNUSED/LEGACY table trong snapshot đã audit. Thư mục models vẫn là
domain types/enums đang được sử dụng; repositories/implementations là vị trí thực tế.

## Constraints và relational integrity

Composite FK `fk_contracts_bed_room`: contracts(bed_id,room_id) → beds(id,room_id)
được kiểm thử bằng insert sai phòng và bị từ chối. Quan hệ financial/cư trú dùng
RESTRICT; notification_recipients, invoice_items, class_schedule_entries và cursor
có CASCADE thuộc sở hữu parent. Xóa phòng vẫn kiểm tra giường đang dùng/thiết bị,
FK ngăn xóa lịch sử được tham chiếu. Test kiểm tra xóa phòng rỗng, capacity RoomType
đang dùng và Building có phòng.

Unique business keys thật: username/email/MSSV, room number theo building, bed number
theo room, hồ sơ 1:1, recipient pair, preference/schedule theo student, reading/billing
theo room+period, invoice theo billing+contract, item theo invoice+type. Partial unique
giữ một ACTIVE contract/bed, một PENDING hoặc ACTIVE contract/student, một pending
room-change/checkout/student. Payment thêm một pending/invoice.

CHECK bảo vệ status, capacity, giá/meter/amount không âm, period canonical, date/meter
ordering và numeric safe bounds. Giá/meter gốc cho phép phần lẻ theo validators hiện
có; calculator tạo invoice allocations nguyên VND; Payment chỉ nhận số nguyên VND >0.

SQLSTATE được dịch bằng mã + tên constraint chính xác, không parse message:

|SQLSTATE + constraint|Public code|
|---|---|
|23505 + uq_users_email|EMAIL_ALREADY_EXISTS|
|23505 + uq_rooms_building_room_number|ROOM_NUMBER_ALREADY_EXISTS|
|23505 + uq_payments_pending_invoice|PAYMENT_ALREADY_PENDING|
|23503 + fk_contracts_bed_room|CONTRACT_ROOM_MISMATCH|
|23001 (RESTRICT thực tế trên PG18), FK không có mapping riêng|REFERENCE_CONFLICT|
|23514 CHECK không có mapping riêng|VALIDATION_ERROR|
|40001 / 40P01 / 55P03|CONCURRENT_MODIFICATION|

Client không nhận SQL, detail, constraint name hoặc stack. Core kiểm tra catalog
mapping có tên thật trong SQL migrations và fallback không lộ chi tiết.

## Transaction, concurrency và regression

Runtime có một shared pg.Pool. Startup SELECT 1 trước listen. SIGINT/SIGTERM đóng
HTTP rồi pool. Repositories dùng query helper, ambient transaction giữ cùng PoolClient,
BEGIN/COMMIT/ROLLBACK/finally release. Test kiểm tra cùng backend PID, rollback, stale
context và rollback failure không che lỗi gốc. Không có pool per request/repository.

Audit sửa LOCKED bypass: refresh truy vấn lại user hiện tại; authenticate kiểm tra
user tồn tại/ACTIVE và dùng role hiện tại thay vì role cũ trong JWT. Controller await
refresh. HTTP tests: register, login, refresh-token, /me, role rejection, locked login,
locked refresh và access token cũ bị chặn; ObjectId token yêu cầu đăng nhập lại.

Regression thật bao gồm facility, contract student create/reject/cancel/approve/end,
approver metadata, room-change/checkout thành công và tiêm lỗi rollback, maintenance
assign/resolve/cancel/ownership, notification ALL/BUILDING/SPECIFIC_STUDENT và privacy,
schedule/preferences/candidates. Core recommendation algorithm giữ nguyên và PASS.

Hai approvals cùng bed chỉ có một thắng; hai bed cùng phòng đồng bộ FULL. FINALIZE
khóa billing cursor, kiểm tra append-only, đọc lại draft, tính và ghi reading/invoices/
items/parent/cursor trong một transaction. Test rollback, cùng draft concurrent,
September/October concurrent meter chain, chèn August sau July/September bị từ chối,
CANCEL không rewind cursor. SUM điện/nước/wifi/rác khớp parent; orphan và occupancy
hai chiều đều 0. Cursor so max billingPeriod của FINALIZED/CANCELLED, không dùng createdAt.

## Payment V1

Migration `003_payments` mở rộng ck_invoices_status, không sửa migration 001/002 đã áp
dụng. payments có UUID, invoice FK RESTRICT, amount NUMERIC nguyên dương, BANK_TRANSFER,
reference/note, submitted/processed/voided users, timestamps/reasons. Ownership derive
từ Invoice.student_id. Không lưu student_id trùng; referenceCode không unique toàn cục.

Lifecycle: PENDING → CONFIRMED / REJECTED / CANCELLED; CONFIRMED → VOIDED.
VOIDED/REJECTED/CANCELLED là terminal. Confirmed amount không có edit/delete endpoint.
Void giữ người xác nhận ban đầu và thêm người/lý do/thời gian void, không hoàn tiền ngân hàng.

SUM(amount) WHERE CONFIRMED là nguồn thật; paid/remaining/pending aggregate trong SQL
cho cả invoice và payment lists, không gọi query riêng mỗi row. PENDING không trừ balance.
Invoice UNPAID/PARTIALLY_PAID/PAID được cập nhật cùng transaction confirm/void; CANCELLED
giữ nguyên. Hóa đơn tổng 0 giữ UNPAID theo ưu tiên rule confirmed=0 và không cho submit.

Lock order: lookup immutable invoice_id → Invoice FOR UPDATE → Payment FOR UPDATE.
Parent billing status được đọc sau khi đã lấy invoice lock, không lấy parent lock ở
cuối flow. Hủy billing lấy parent lock bằng conditional UPDATE, sau đó khóa toàn bộ
child invoices ORDER BY id trước khi kiểm tra payment. Có CONFIRMED → rollback với
BILLING_HAS_CONFIRMED_PAYMENTS. Không có → pending payments CANCELLED, invoices và parent
CANCELLED cùng transaction. Test chạy confirm/cancel cạnh tranh cả hai thứ tự gọi.

One PENDING/invoice được bảo vệ bằng partial unique và row lock. Vì vậy hai bản ghi
PENDING riêng trên cùng invoice không phải fixture hợp lệ. Kiểm thử concurrent submit,
same-payment confirm và stale balance fault injection thay vì vô hiệu hóa index để
tạo kịch bản không thể xảy ra. Confirm vẫn kiểm tra remaining ngay trong transaction.

API dưới `/api/v1`:

|Role|Method/path|
|---|---|
|STUDENT|POST /student/invoices/:invoiceId/payments|
|STUDENT|GET /student/payments/me; GET /student/payments/:paymentId|
|STUDENT|PATCH /student/payments/:paymentId/cancel|
|ADMIN|GET /admin/payments; GET /admin/payments/:paymentId|
|ADMIN|PATCH /admin/payments/:paymentId/confirm, /reject, /void|

Student ownership violation trả 404. ADMIN-only vì hiện chưa có finance permission
cho STAFF. Strict Zod không nhận studentId/status tùy ý. List filters: status,
billingPeriod, invoiceId, page/limit. DTO có nhãn sinh viên/phòng và người xử lý.
UI Student nằm trong chi tiết hóa đơn: số đã trả/còn lại/chờ, partial amount, reference,
note, lịch sử và hủy pending. Admin có menu Tài chính → Thanh toán, filter, detail,
confirm/reject/void với xác nhận và lý do. Không có Debt/gateway/upload/dashboard mới.

## Seed, Mongo offline và giới hạn kiểm chứng

Fresh PostgreSQL migrations + admin/facility/demo seeds PASS. Lần đầu 10 phòng,
40 giường, 65 thiết bị, 34 ACTIVE residents (85%); lần hai thêm 0 room/equipment/contract.
Số lượng lấy từ kết quả seed/catalog, không giả định số giường mỗi phòng trong test.

MongoDB Windows service đã Stopped trước và sau kiểm thử; không khởi động Mongo.
Active backend/frontend không còn Mongo dependency/ObjectId assumptions. Các chuỗi
ObjectId trong test/docs dùng để kiểm tra token cũ hoặc mô tả lịch sử. Regex `lean(`
không có word-boundary bắt nhầm `Boolean(` / `boolean(`, không phải Mongo remnant.
Smoke chạy `dist/server.js` với URL test và bỏ MONGO_URI: startup, /health, frontend
HTML tại /admin/payments và protected API đều PASS.

Frontend TypeScript/Vite build PASS, còn cảnh báo annotation của Zod và chunk >500KB.
Browser runtime trả danh sách browser rỗng, nên **chưa kiểm thử tương tác UI/visual
trong trình duyệt**; API/DTO/build đã kiểm chứng. Không tuyên bố UI end-to-end PASS.
Không ETL Mongo → PostgreSQL, không refund/reconciliation. Rollback 003 cố ý từ chối
khi có Payment history để tránh xóa lịch sử tài chính. Backup/cutover thực tế cần
dùng database khôi phục hoặc bản backup do người dùng lựa chọn. Cấu hình local hiện
trỏ database khôi phục; không có triển khai production. Chạy `npm.cmd run dev` trong
backend để mở ứng dụng tại localhost:3000 (hoặc PORT đã cấu hình).

## UI và endpoint audit

Màn hình hóa đơn sinh viên và quản lý thanh toán đã được làm lại theo hướng responsive:
summary tài chính, badge trạng thái, empty/error/success state, bảng desktop, card mobile và
modal chi tiết rộng hơn. Form thanh toán dùng chung style `.field`; class `.input` thiếu style
trước đây cũng đã được bổ sung để tránh control hiển thị thô.

Frontend mặc định gọi `/api/v1` cùng origin thay vì hard-code `localhost`; Vite dev server
proxy `/api` sang backend tại `127.0.0.1:3000`. Việc này tránh lỗi gọi nhầm máy khi mở UI từ
host khác. Đối chiếu source ghi nhận 103 lời gọi frontend và 113 route backend; ba URL động
Payment được kiểm tra thủ công và đều có route tương ứng. Runtime smoke trên bản build mới
đăng nhập admin, đọc 20 API và tải 6 frontend route, không nhận lỗi `NOT_FOUND`.

Xác nhận cuối: frontend build PASS, backend 43/43 core tests PASS, UI/API smoke PASS và
`git diff --check` PASS. Browser runtime vẫn không có browser được kết nối nên chưa có ảnh
chụp hoặc xác nhận pixel-level trong trình duyệt.
