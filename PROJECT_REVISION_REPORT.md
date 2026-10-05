# Báo cáo revision toàn bộ dự án Dormitory Management System

Ngày rà soát: 03/10/2026

Phạm vi: working tree hiện tại của `dormitory_management_system` (backend, frontend, migrations, scripts, Docker, CI, tài liệu và test).
Lưu ý: repository đang có 126 thay đổi chưa commit, vì vậy báo cáo này phản ánh mã hiện có trên máy tại thời điểm rà soát, không chỉ commit `d8b93b2`.

## 1. Kết luận nhanh

Dự án đã có nền tảng kỹ thuật khá tốt cho một hệ thống quản lý ký túc xá: phân lớp rõ, PostgreSQL có constraint/index, các nghiệp vụ nhạy cảm dùng transaction, refresh token được xoay vòng và lưu dạng hash, API có phân quyền phía server, frontend đã lazy-load route, và CI đã bao phủ lint/typecheck/build/test cùng integration PostgreSQL.

Không phát hiện lỗi P0 có thể làm mất dữ liệu ngay lập tức trong phần đã kiểm tra. Tuy nhiên, chưa nên xem hệ thống là production-ready. Các việc nên xử lý trước khi triển khai thật là:

1. Gia cố authentication: rate limit, chính sách mật khẩu/secrets, thống nhất luồng đăng ký và nơi lưu access token.
2. Đóng gói quy trình migration `008` và backfill giá hợp đồng để không chặn lập hóa đơn cho dữ liệu cũ.
3. Hardening Docker/runtime: production mặc định, non-root container, tách migration khỏi startup và bỏ mật khẩu admin mặc định.
4. Chuẩn hóa validation và mở rộng AuditLog cho toàn bộ thay đổi quan trọng.
5. Quyết định rõ vai trò `STAFF`: triển khai portal/quyền hạn hoặc loại bỏ role đăng nhập đang bị “mồ côi”.

Đánh giá tổng quát:

| Mảng | Nhận xét |
|---|---|
| Kiến trúc backend | Tốt; Service/Repository/Controller rõ, nhưng composition root và một số service đã quá lớn |
| Tính toàn vẹn dữ liệu | Tốt; nhiều constraint, partial unique index, transaction và conditional update |
| Bảo mật | Trung bình; token rotation tốt nhưng thiếu lớp chống brute force và hardening HTTP/runtime |
| Frontend | Khá; route splitting tốt, nhưng data-fetching/error/loading bị lặp nhiều và test còn mỏng |
| Testing | Backend core tốt; integration có thiết kế tốt nhưng chưa chạy được tại máy này; frontend mới 11 test |
| Vận hành | Trung bình; có Docker/CI/healthcheck nhưng healthcheck nông, migration gắn vào startup và thiếu retention job |
| Tài liệu | Có chiều sâu nhưng đang có link gãy và một số báo cáo cũ không còn khớp working tree |

## 2. Những gì đã kiểm chứng

### Kết quả lệnh kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| Backend `npm run typecheck` | PASS |
| Backend `npm run lint` | PASS |
| Backend `npm run build` | PASS |
| Backend `npm run test:core` | PASS, 59/59 test |
| Frontend `npm run typecheck` | PASS |
| Frontend `npm run lint` | PASS |
| Frontend `npm test` | PASS, 11/11 test trong 6 file |
| Frontend `npm run build` | PASS |
| PostgreSQL integration | Chưa chạy: không có `TEST_DATABASE_URL` trong `.env` |
| Kiểm tra link Markdown nội bộ | 3 link gãy trong README gốc |

Frontend production build đã chia route thành nhiều chunk. Hai chunk lớn nhất hiện khoảng 318,62 kB và 111,01 kB trước gzip; không còn cảnh báo chunk vượt 500 kB. Vite vẫn in cảnh báo annotation từ dependency Zod, không phải lỗi mã ứng dụng.

### Điểm mạnh nên giữ

- Backend áp dụng `Controller -> Service -> Repository interface -> PostgreSQL repository` nhất quán.
- Các thao tác hợp đồng, chuyển phòng, trả phòng, thanh toán và billing có transaction; nhiều cập nhật trạng thái dùng điều kiện để chống race condition.
- Database bảo vệ các invariant quan trọng bằng foreign key, check constraint và partial unique index, ví dụ một sinh viên chỉ có một hợp đồng mở và một giường chỉ có một hợp đồng ACTIVE.
- Refresh token có session ID, lưu hash SHA-256, xoay vòng trong transaction, hỗ trợ logout-all và thu hồi sau đổi mật khẩu.
- Error handler không trả SQL, stack hoặc chi tiết nhạy cảm ra client; đã có test cho phần này.
- CI dùng PostgreSQL riêng có hậu tố `_test`; test runner có cơ chế từ chối database không an toàn.
- Frontend phân quyền chỉ là lớp UX; quyền thật vẫn được kiểm tra ở backend bằng `authenticate` và `authorize`.
- Audit log được ghi cùng transaction cho nhiều nghiệp vụ chính, tránh trường hợp dữ liệu đổi nhưng log không được ghi hoặc ngược lại.

## 3. Các vấn đề theo mức ưu tiên

| ID | Mức | Vấn đề | Tác động chính |
|---|---|---|---|
| F-01 | P1 | Login/register/refresh chưa có rate limiting; mật khẩu tối thiểu 6 ký tự, JWT secret chỉ tối thiểu 16 ký tự | Brute force, credential stuffing, secrets yếu |
| F-02 | P1 | Backend đăng ký tạo session nhưng frontend bỏ token rồi chuyển về login | Dư refresh session, UX và trạng thái đăng nhập không nhất quán |
| F-03 | P1 | Migration giá hợp đồng để `NULL`, còn billing từ chối contract legacy; backfill là thao tác thủ công riêng | Có thể chặn finalize hóa đơn sau nâng cấp |
| F-04 | P1 | Docker/runtime chưa harden: Compose mặc định development, admin password mặc định, container chạy root, migration chạy trong app startup | Rủi ro cấu hình sai và quyền production quá rộng |
| F-05 | P2 | Access token lưu trong `localStorage` | XSS có thể lấy access token |
| F-06 | P2 | Validation không đồng nhất ở nhóm CRUD admin | UUID/query sai đi sâu xuống DB, status code và lỗi API không nhất quán |
| F-07 | P2 | AuditLog chưa bao phủ toàn bộ thao tác quản trị quan trọng | Khó truy vết thay đổi thiết bị, danh mục, registry, khóa tài khoản, thông báo |
| F-08 | P2 | Role `STAFF` tồn tại trong JWT/type nhưng không có route hoặc UI dành cho staff | Tài khoản STAFF đăng nhập xong chỉ tới `/unauthorized`; mô hình quyền gây hiểu nhầm |
| F-09 | P2 | Integration DB chưa được xác minh cục bộ và chưa có coverage gate | Regression chỉ lộ trên CI hoặc sau deploy; khó đo vùng chưa test |
| F-10 | P2 | Healthcheck chỉ trả `OK`, không kiểm tra DB; logging/metrics còn tối thiểu | Orchestrator có thể giữ instance mất kết nối DB; khó điều tra sự cố |
| F-11 | P2 | Không có job dọn refresh sessions và chính sách retention AuditLog | Bảng tăng không giới hạn theo thời gian |
| F-12 | P3 | Một số service/page/type file quá lớn; fetch state lặp lại ở nhiều trang | Khó bảo trì, tăng khả năng lỗi khi thêm tính năng |
| F-13 | P3 | Script backend tên `dev` nhưng build cả frontend/backend rồi chạy JS tĩnh | Vòng lặp phát triển chậm, không watch/hot reload backend |
| F-14 | P3 | README có 3 link gãy tới file đang bị xóa | Người mới không thể theo đúng hướng dẫn migration/payment |
| F-15 | P3 | Git line-ending chưa chuẩn hóa | Nhiều cảnh báo LF/CRLF, diff dễ bị nhiễu trên Windows/Linux |

## 4. Phân tích chi tiết và phương án cải thiện

### F-01 — Authentication chưa chống abuse đầy đủ

**Bằng chứng**

- `backend/src/routes/auth.routes.ts` công khai `/login`, `/register`, `/refresh-token` nhưng không có rate-limit middleware.
- `backend/src/app.ts` mới có CORS và JSON parser, chưa có Helmet/security headers.
- `backend/src/validators/auth.validator.ts` và validator đổi mật khẩu cho phép mật khẩu từ 6 ký tự.
- `backend/src/config/env.ts` chỉ yêu cầu JWT secrets dài tối thiểu 16 ký tự và chưa kiểm tra access/refresh secret phải khác nhau.

**Phương án**

1. Dùng rate limit theo cả IP và định danh chuẩn hóa cho login/register; refresh nên có ngưỡng riêng.
2. Trả lỗi đăng nhập đồng nhất để không lộ tài khoản tồn tại; dự án hiện đã làm tốt phần message này, cần giữ nguyên.
3. Nâng mật khẩu tối thiểu lên 10–12 ký tự, cho phép passphrase dài, kiểm tra mật khẩu phổ biến; không bắt buộc các quy tắc ký tự cứng gây phản tác dụng.
4. Yêu cầu secrets production ít nhất 32 byte entropy, access và refresh secret khác nhau; fail-fast nếu dùng giá trị mẫu.
5. Thêm `helmet`, CSP phù hợp với Vite bundle, HSTS khi chạy HTTPS và giới hạn body JSON rõ ràng.
6. Viết test cho rate limit, secret trùng nhau, mật khẩu yếu và reset cửa sổ giới hạn.

### F-02 — Luồng đăng ký tạo phiên nhưng frontend bỏ phiên

**Bằng chứng**

- `AuthController.register` dùng chung `sendAuth`, đặt refresh cookie và trả access token.
- `AuthProvider.register` chỉ `await authApi.register(input)` mà không lưu access token hoặc set user.
- `RegisterPage` sau đó chuyển sang `/login`.

Như vậy một refresh session đã được tạo nhưng UI lại thông báo người dùng đăng nhập lần nữa. Nếu reload trang login trước khi đăng nhập, `AuthProvider` có thể dùng cookie đó để khôi phục phiên và tự chuyển vào student; nếu đăng nhập ngay, hệ thống tạo thêm một session khác.

**Chọn một trong hai thiết kế**

- Khuyến nghị: đăng ký thành công thì đăng nhập luôn. `register()` lưu access token, set user và chuyển thẳng `/student`.
- Hoặc: đăng ký chỉ tạo account, backend không phát token/cookie; sau đó chuyển về login như UI hiện tại.

Không nên giữ mô hình nửa đăng nhập/nửa chưa đăng nhập. Bổ sung test kiểm tra cookie/session count và navigation sau register.

### F-03 — Migration 008 có thể làm billing dừng với dữ liệu cũ

**Bằng chứng**

- `008_contract_room_price_snapshot.up.sql` thêm `room_price_per_month_snapshot` nullable.
- `MonthlyBillingCalculator` chủ động từ chối residence segment có snapshot `null`.
- `backfill-contract-room-price.mjs` chỉ cho apply ngoài production và dùng giá phòng hiện tại theo kiểu best-effort.

Thiết kế không tự bịa giá lịch sử là đúng về mặt kế toán, nhưng quy trình nâng cấp chưa khép kín. Một database thật có hợp đồng legacy có thể migrate thành công rồi không finalize được billing.

**Phương án**

1. Trước deploy, chạy dry-run và xuất danh sách contract thiếu snapshot.
2. Xây migration dữ liệu có kiểm duyệt: lấy giá từ hóa đơn/hợp đồng lịch sử nếu có; phần không suy ra được phải cho admin nhập và xác nhận.
3. Chỉ đặt `NOT NULL` sau khi dữ liệu đã được đối soát.
4. Thêm pre-deploy gate: số contract ACTIVE/ENDED phục vụ billing có snapshot null phải bằng 0.
5. Viết runbook rollback/khôi phục, không chỉ để script demo không chạy ở production.

### F-04 — Docker và quy trình deploy chưa production-safe mặc định

**Bằng chứng**

- Root `compose.yaml` mặc định `NODE_ENV=development`.
- `ADMIN_PASSWORD` có fallback `change-this-password`.
- Runtime image không khai báo `USER`, nên Node chạy bằng root.
- Container command tự chạy migration rồi khởi động server.

**Phương án**

- Đặt production là mặc định cho compose deploy; tạo `compose.dev.yaml` riêng cho phát triển.
- Bắt buộc `ADMIN_PASSWORD` nếu thực sự seed admin, hoặc tốt hơn tách bootstrap admin thành one-shot command và không truyền credentials này cho app runtime.
- Tạo non-root user, dùng `USER node` hoặc UID/GID riêng; đặt filesystem read-only nếu có thể.
- Tách migration thành CI/CD job hoặc one-shot service. App runtime chỉ cần quyền DML, không cần quyền DDL.
- Pin image bằng digest cho môi trường quan trọng, thêm scan image/dependency trong CI.
- Thêm graceful shutdown timeout và kiểm tra process thực sự đóng pool trước khi kết thúc.

### F-05 — Access token trong `localStorage`

Refresh token đã được bảo vệ tốt bằng cookie `HttpOnly`, nhưng access token vẫn nằm trong `localStorage`. Bất kỳ XSS nào cùng origin đều có thể đọc token.

**Phương án ưu tiên**

1. Giữ access token trong memory của `AuthProvider`; khi reload thì gọi refresh bằng cookie để lấy token mới.
2. Nếu chuyển toàn bộ auth sang cookie, phải thêm CSRF token/origin validation phù hợp.
3. Dù chọn cách nào, CSP và kiểm soát XSS vẫn cần thiết; HttpOnly không thay thế CSP.

### F-06 — Validation route admin chưa nhất quán

Nhiều route mới có `validate(...)`, nhưng nhóm CRUD cơ sở vật chất vẫn có endpoint param không qua UUID schema, ví dụ delete building, get/delete room type, list/get/delete room và get/delete equipment. Controller/service/DB cuối cùng vẫn có thể trả lỗi, nhưng contract API trở nên không đều: cùng một UUID sai có nơi trả `400 INVALID_ID`, nơi khác có thể thành lỗi PostgreSQL đã dịch hoặc `500`.

**Phương án**

- Mọi route có `:id` phải dùng một schema UUID chung.
- Dùng wrapper khai báo route để khó quên validation.
- Dùng `.strict()` hoặc chính sách strip thống nhất cho body/query.
- Sinh OpenAPI từ schema hoặc ít nhất có contract test cho toàn bộ route.

### F-07 — AuditLog mới bao phủ một phần thay đổi quản trị

Audit hiện có cho hợp đồng, chuyển/trả phòng, payment, billing, building, room, room type, staff và maintenance. Chưa thấy ghi audit tương ứng cho:

- khóa/mở tài khoản sinh viên;
- tạo/sửa student registry;
- thiết bị và danh mục thiết bị;
- tạo thông báo;
- thay đổi hồ sơ/email và mật khẩu (có thể chỉ ghi sự kiện, tuyệt đối không ghi dữ liệu mật khẩu).

**Phương án**

- Lập ma trận `action -> entity -> old/new data -> actor -> retention` và coi đây là acceptance criterion cho mọi mutation admin.
- Audit phải nằm trong cùng transaction với mutation khi có thể.
- Với đổi mật khẩu chỉ ghi event và metadata tối thiểu; sanitizer hiện tại là lớp phòng vệ tốt nhưng không nên truyền secret vào audit ngay từ đầu.
- Thêm test “mutation rollback thì audit rollback” và “mutation thành công có đúng action/entity”.

### F-08 — Role STAFF đang bị mồ côi

Backend/JWT/frontend type đều chấp nhận `STAFF`, nhưng API chỉ mount nhánh `STUDENT` và `ADMIN`; router frontend cũng chỉ có hai khu vực đó. Tài khoản role STAFF hợp lệ sẽ đăng nhập thành công rồi bị đưa tới `/unauthorized`.

Ngoài ra bảng `staff` hiện thiên về thực thể nhân sự bảo trì và `user_id` đã nullable, nên cần quyết định đây có thật sự là một principal đăng nhập hay chỉ là resource được admin quản lý.

**Phương án**

- Nếu staff không đăng nhập: bỏ `STAFF` khỏi auth role/JWT/frontend, giữ `staff` là domain entity.
- Nếu staff cần đăng nhập: bắt buộc liên kết `staff.user_id`, xây route/UI staff tối thiểu và ma trận quyền cụ thể (xem/nhận/cập nhật yêu cầu bảo trì), không cho dùng nhánh admin chung.

### F-09 — Test tốt ở backend nhưng chưa đủ tín hiệu chất lượng toàn hệ thống

Backend core có 59 test và integration suite lớn; đây là điểm mạnh. Tuy nhiên máy hiện tại không cấu hình `TEST_DATABASE_URL`, nên chưa xác nhận migration/integration thực tế. Frontend chỉ có 11 test, trong khi có gần 30 page/component nghiệp vụ và nhiều mutation.

**Phương án**

1. Tạo database test riêng có tên kết thúc `_test`, chạy `db:migrate:test` và `test:postgres` trước khi merge/release.
2. Thêm coverage report và ngưỡng hợp lý theo nhánh nghiệp vụ, không chạy theo 100% hình thức.
3. Ưu tiên test frontend cho payment, finalize/cancel billing, approve/reject contract, room change, checkout, maintenance và lỗi 401 đồng thời.
4. Thêm E2E smoke bằng browser cho 3 hành trình: đăng ký sinh viên, nhận phòng, lập hóa đơn/thanh toán.
5. Test migration từ snapshot database trước migration 008, không chỉ database trắng.

### F-10 — Healthcheck và observability còn nông

`GET /health` luôn trả OK sau khi process đã lên; nếu PostgreSQL mất kết nối sau startup, container vẫn có thể được xem là healthy. Log hiện chủ yếu là `console.log/error`, chưa có level, timestamp chuẩn, duration hoặc correlation nhất quán dù đã có `X-Request-Id`.

**Phương án**

- Tách `/live` (process sống) và `/ready` (query `SELECT 1` có timeout ngắn).
- Log JSON có request ID, method, path template, status, latency và error code; không log token/body nhạy cảm.
- Thêm metrics tối thiểu: request rate/error/latency, pool saturation, transaction retry, billing/payment failures.
- Cấu hình `trust proxy` theo số hop cụ thể khi chạy sau reverse proxy, nếu không `req.ip` trong AuditLog thường chỉ là IP proxy.

### F-11 — Dữ liệu phiên và audit chưa có vòng đời

Repository đã có `deleteExpiredOrOldRevoked`, nhưng không có nơi gọi. AuditLog cũng chưa có retention/archival. Hai bảng sẽ tăng liên tục.

**Phương án**

- Chạy scheduled job hằng ngày để xóa refresh session hết hạn/revoked cũ theo chính sách, ví dụ giữ 30–90 ngày.
- Xác định AuditLog phải giữ bao lâu theo yêu cầu nghiệp vụ; archive hoặc partition theo tháng nếu cần giữ dài hạn.
- Theo dõi kích thước bảng/index và vacuum.

### F-12 — File lớn và lặp data-fetching

Các điểm nóng hiện tại:

- `monthly-billing.service.ts`: khoảng 535 dòng.
- `contract.service.ts`: khoảng 456 dòng.
- `container.ts`: khoảng 354 dòng và khởi tạo thủ công toàn bộ graph dependency.
- `frontend/src/types/api.ts`: khoảng 603 dòng.
- Các page Payment/Billing/Maintenance khoảng 430–460 dòng.
- Rất nhiều page tự viết lại `loading/error/useEffect/useCallback/reload`.

**Phương án**

- Tách billing thành draft/finalize/query services và giữ calculator thuần.
- Tách contract command/query; gom invariant trạng thái vào domain policy thay vì trải trong service.
- Chia API types theo feature; ưu tiên sinh types từ OpenAPI để tránh backend/frontend drift.
- Dùng TanStack Query hoặc một hook nội bộ chuẩn hóa cache, cancel request, retry, invalidation và loading/error state.
- Tách page thành container + form/table/detail components, đặt mục tiêu file nghiệp vụ khoảng 150–250 dòng khi hợp lý.

### F-13 — `backend npm run dev` không thật sự là dev mode

Script hiện build frontend, build backend rồi chạy `dist/server.js`; không watch backend và mỗi lần sửa phải build lại toàn bộ. Trong khi frontend có Vite dev server riêng.

**Phương án**

- Backend: `tsx watch src/server.ts`.
- Frontend: `vite` với proxy `/api` tới backend.
- Root thêm script chạy song song hai app; giữ script `start:full` cho bản build chung origin.

### F-14 — Tài liệu có link gãy

README gốc đang trỏ tới ba file không tồn tại trong working tree:

- `POSTGRES_MIGRATION_REPORT.md`
- `POSTGRES_AUDIT_AND_PAYMENT_REPORT.md`
- `IMPLEMENTATION_PLAN_PAYMENT.md`

Các file này cũng đang hiện là deleted trong Git. Cần khôi phục, thay link sang tài liệu mới, hoặc xóa tham chiếu. Nên thêm link checker Markdown vào CI.

### F-15 — Line endings gây nhiễu Git

`git diff --check` không phát hiện whitespace error, nhưng Git cảnh báo hàng loạt file LF sẽ đổi thành CRLF. Điều này dễ tạo diff lớn không liên quan khi làm trên Windows và CI Linux.

**Phương án**

Thêm `.gitattributes`, ví dụ mặc định text dùng LF; chỉ để CRLF cho file thật sự cần Windows-specific. Sau đó chuẩn hóa trong một commit riêng để không trộn với thay đổi nghiệp vụ.

## 5. Lộ trình cải thiện đề xuất

### Giai đoạn 1 — Trước khi deploy thật

- Sửa F-01, F-02, F-03 và F-04.
- Chạy đầy đủ PostgreSQL integration trên database `_test`.
- Kiểm tra migration bằng bản sao dữ liệu thật đã khử nhạy cảm.
- Bổ sung readiness check và backup/restore drill.
- Khóa dependency bằng lockfile hiện có và chạy dependency/container scan trong CI.

**Điều kiện hoàn thành**

- Brute-force test bị giới hạn đúng và không khóa nhầm toàn hệ thống.
- Register tạo đúng một trạng thái phiên theo thiết kế đã chọn.
- Không còn contract cần billing có price snapshot null.
- Container chạy non-root, production config không có default credential.
- Migration failure không khiến nhiều replica tranh chấp hoặc restart loop vô hạn.

### Giai đoạn 2 — Chuẩn hóa API và truy vết

- Sửa F-06, F-07, F-08, F-10 và F-11.
- Lập permission matrix cho từng route/action.
- Chuẩn hóa response/error/request-id và sinh OpenAPI.
- Bổ sung retention jobs và dashboard vận hành.

**Điều kiện hoàn thành**

- 100% route có params/query/body được validate theo contract.
- 100% mutation quản trị quan trọng có AuditLog trong cùng transaction.
- Không còn role đăng nhập không có màn hình/quyền hợp lệ.
- Readiness đổi sang unhealthy khi DB không sẵn sàng.

### Giai đoạn 3 — Khả năng bảo trì và UX

- Sửa F-09, F-12, F-13, F-14 và F-15.
- Chuẩn hóa data-fetching frontend và component hóa các page lớn.
- Tách service backend theo command/query/use case.
- Bổ sung E2E và coverage gate.

## 6. Danh sách kiểm tra release ngắn

- [ ] Backend lint, typecheck, build và core tests pass.
- [ ] Frontend lint, typecheck, test và build pass.
- [ ] Migration test trên database trắng pass.
- [ ] Migration test trên snapshot phiên bản trước pass.
- [ ] PostgreSQL integration và smoke UI/API pass.
- [ ] Backup đã tạo và restore đã thử.
- [ ] Không có contract cần billing với price snapshot null.
- [ ] JWT secrets đủ mạnh, khác nhau và không dùng giá trị mẫu.
- [ ] Không có default admin password.
- [ ] Rate limit và security headers đã bật.
- [ ] Container chạy non-root, app runtime không có quyền DDL.
- [ ] `/ready` kiểm tra DB và monitoring nhận được alert thử nghiệm.
- [ ] Link tài liệu nội bộ không gãy.
- [ ] Working tree sạch hoặc mọi thay đổi đã được review/commit có chủ đích.

## 7. Thứ tự xử lý ngắn gọn nhất

Nếu nguồn lực hạn chế, nên làm theo đúng thứ tự sau:

1. Sửa luồng register/session.
2. Thêm rate limit + harden secrets/password/headers.
3. Hoàn thiện migration/backfill snapshot giá.
4. Hardening Docker và tách migration job.
5. Chạy integration DB + migration rehearsal.
6. Chuẩn hóa route validation và AuditLog.
7. Quyết định role STAFF.
8. Sau đó mới refactor file lớn và nâng frontend test coverage.

---

Báo cáo này chỉ thêm tài liệu đánh giá; không tự động sửa mã nguồn hoặc thay đổi dữ liệu/database.
