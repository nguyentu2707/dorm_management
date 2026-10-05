# Building Gender Integrity — audit, changes, and verification

Ngày: 2026-10-05. Kết luận: **PARTIAL** — phần sửa và kiểm tra không cần DB đã hoàn tất; integration/concurrency và seed trên PostgreSQL thật còn BLOCKED vì chưa có TEST_DATABASE_URL hợp lệ. Không coi các test này là PASS.

## 1. Trạng thái trước khi sửa: PARTIAL

Không tìm thấy AGENTS.md trong repository hoặc thư mục workspace/cha đã kiểm tra. Đã đọc README.md, backend/README.md và source liên quan. Workspace có nhiều thay đổi có sẵn; báo cáo này chỉ mô tả thay đổi của lần audit này, không nhận các thay đổi có sẵn là công việc mới.

| Thành phần | Bằng chứng source và hành vi trước sửa | Đánh giá |
| --- | --- | --- |
| Building update HTTP | backend/src/routes/admin/admin.routes.ts: PATCH /buildings/:buildingId → buildingUpdate validator → BuildingController.update → BuildingService.update. Validator giới hạn allowedGender theo enum; controller chuyển lỗi cho middleware. | Có implementation |
| Building / Student gender | backend/src/models/building.model.ts: MALE/FEMALE/MIXED. backend/src/models/student.model.ts: MALE/FEMALE/OTHER hoặc thiếu. assertPlacementAllowed trong backend/src/services/building-placement.ts yêu cầu gender, chỉ cho OTHER vào MIXED. | Có implementation |
| Đổi policy | backend/src/services/admin/building.service.ts, update: runInTransaction → findByIdForUpdate → hasIncompatibleActiveResidents → update. Đổi sang MIXED hoặc giữ nguyên gender không cần truy vấn incompatibility. Conflict 409 BUILDING_GENDER_CONFLICT_WITH_RESIDENTS xảy ra trước mọi write của request. | Có implementation và unit test |
| Truy vấn cư dân | backend/src/repositories/implementations/building.repository.ts, hasIncompatibleActiveResidents: contracts JOIN rooms JOIN students, chỉ c.status='ACTIVE'; gender NULL hoặc khác policy bị tính incompatible. Không dựa vào Bed/Room.status. | SQL phù hợp; PostgreSQL verification bị chặn |
| Contract approval | backend/src/services/contract.service.ts, approveContract: khóa Contract, khóa Room, placementAllowed(..., true) khóa và đọc lại Building trong cùng transaction rồi mới occupy Bed và đổi ACTIVE. | Có implementation |
| Admin direct ACTIVE | Cùng file, adminCreateContract: kiểm tra lại open contract trong transaction, khóa Room, khóa Building và đọc lại policy, conditional claim Bed, INSERT ACTIVE. Demo seed tạo ACTIVE qua service này. | Có implementation |
| RoomChange approval | backend/src/services/room-change-request.service.ts, approveRequest: khóa Request, Contract cũ, Room đích, Building đích; sau đó mới khóa Room cũ. Có khả năng vòng chờ Room → Building → Room khi một placement khác giữ Room cũ và chờ cùng Building. | Thiếu bảo vệ lock order |
| Building của Room | RoomService.update nhận Partial<Omit<RoomData,'buildingId'>>; roomUpdate validator không chứa buildingId; PostgresRoomRepository.update không viết building_id. Không có đường chuyển Building của Room hiện hữu trong API đã audit. | Không có đường ghi này |
| Các đường ACTIVE khác | Tìm status ACTIVE, updateStatus và INSERT contracts trong src/scripts: ba đường service ở trên; seed-demo dùng adminCreateContract. Checkout/end/cancel chỉ loại cư dân ACTIVE; student create chỉ tạo PENDING. | Đã audit source |
| Student gender khác | StudentProfileService.updateProfile chỉ chuyển dob/contact/address, không chuyển gender. Seed-demo-students từng gọi students.updateProfile({gender}) trên identity hiện hữu, có thể làm sai policy của cư dân. | Thiếu bảo vệ seed |
| Seed Building | backend/scripts/seed-dormitory-data.ts gọi BuildingService.update thay vì UPDATE trực tiếp; conflict giữ nguyên Building. Guard production và tái sử dụng business keys đã có. | Có implementation; chưa có seed test hành vi |
| Tests | backend/tests/building-gender-integrity.test.mjs có unit tests policy và rollback. postgres.integration.mjs có ACTIVE/non-ACTIVE test, nhưng race ba placement chỉ chạy placement-first; không xác nhận waiter bằng pg_blocking_pids. | Thiếu coverage hai chiều |

## 2. Implementation Plan

Kế hoạch đã trình bày trước khi sửa source; bản lưu tại [BUILDING_GENDER_IMPLEMENTATION_PLAN.md](BUILDING_GENDER_IMPLEMENTATION_PLAN.md).

Giữ logic Building/Contract hiện có; sửa lock order RoomChange; ngừng sửa giới tính identity hiện hữu trong seed; thêm regression tests, race hai chiều và seed conflict; chạy kiểm tra theo scripts repository, giữ nguyên safety guard DB test.

## 3. Thay đổi thực tế

- backend/src/services/room-change-request.service.ts: khóa hai Room nguồn/đích theo ID tăng dần trước khóa Building đích; giữ các Room trong Map có type, dùng lại Room nguồn ở đoạn kết thúc hợp đồng cũ. Không thay đổi quy tắc Room status.
- backend/scripts/seed-demo-students.ts: ensureStudent báo lỗi nếu gender hiện hữu khác gender dự kiến; ensureRecommendationStudent báo lỗi nếu gender thiếu. Không sửa Student.gender. Identity mới vẫn nhận gender từ registry như trước; guard production và reuse business keys giữ nguyên.
- backend/tests/room-change-request.test.mjs: thêm hai regression tests thứ tự khóa, bao gồm source ID lớn hơn target ID; xác nhận không đọc/khóa Room lại sau Building.
- backend/tests/postgres.integration.mjs: mỗi race approval/direct creation/room change chạy placement-first và mutation-first. Ghi backend PID trong transaction, xác nhận PID khác nhau và pg_blocking_pids chứng minh waiter bị chặn. Deferred gates điều khiển release; polling chỉ quan sát khóa, không dùng sleep để đoán interleaving. Thêm lock_timeout và deadline quan sát.
- Cùng integration file: placement-first phải thành công, mutation conflict; mutation-first đổi FEMALE thành công, placement của nam conflict. So sánh snapshot Contract/Request/Student/Bed khi placement bị từ chối; kiểm tra không có ACTIVE resident trái policy trong trạng thái cuối.
- Cùng integration file: chạy seed-dormitory thực tế khi Tòa A MIXED có nữ ACTIVE, xác nhận policy MALE bị từ chối và Building/Student/Contract/Bed không đổi. Chạy seed-demo với demom001 đang có gender FEMALE và ACTIVE, xác nhận seed không sửa gender. Child seed chỉ nhận URL của dedicated test DB đã được guard, không dùng development DB.
- Thêm hai tài liệu plan/report. Không sửa schema, framework, Maintenance, Billing, Payment, Auth hoặc Staff.

## 4. Transaction, lock order và race

PostgresTransactionManager dùng BEGIN/COMMIT/ROLLBACK và AsyncLocalStorage để gắn callback với một PoolClient. database/query.ts dùng client đó và từ chối TransactionContext stale/mismatch. Khóa được giữ tới commit/rollback. Resident query là statement sau khi lấy Building lock, nhìn trạng thái vừa commit của placement trước trong READ COMMITTED mặc định.

| Flow | Thứ tự khóa liên quan sau sửa |
| --- | --- |
| Building policy update / dormitory seed update | Building → truy vấn ACTIVE residents không khóa Room/Contract → UPDATE cùng Building |
| Contract approve | Contract → Room → Building → Bed và các write còn lại |
| Admin direct ACTIVE / demo placement | Room → Building → Bed → Contract mới / reject PENDING |
| RoomChange approve | Request → Contract nguồn → Room nguồn/đích theo ID tăng dần → Building đích → Bed và các write còn lại |

Building update không lấy khóa Room sau Building. RoomChange nay cũng không lấy khóa Room sau Building; loại vòng Room → Building → Room được phát hiện. Các flow placement chỉ khóa một Building đích, không khóa cả Building nguồn. Chuyển đi chỉ loại ACTIVE residence khỏi nguồn nên không cần khóa policy nguồn để bảo vệ invariant; source-policy update có thể từ chối bảo thủ khi vẫn thấy cư dân chưa rời đi. Nếu sau này thêm flow khóa nhiều Building, phải sắp ID nhất quán trước triển khai.

Nếu placement giữ Building trước, policy update đợi và kiểm tra ACTIVE vừa commit nên từ chối policy không tương thích. Nếu policy update giữ trước, placement đợi rồi đọc policy mới và từ chối trước write cư trú. Application precheck ngoài transaction không phải cơ chế bảo vệ race.

Không tuyên bố đã chứng minh không có deadlock trên PostgreSQL: regression unit tests và source audit xác nhận lock order; sáu race DB đã được viết nhưng chưa chạy. Không mở rộng audit thành bảo đảm toàn hệ thống không có deadlock.

## 5. Kết quả kiểm thử

| Kiểm tra | Kết quả | Bằng chứng |
| --- | --- | --- |
| Backend build | PASS | npm.cmd run test:core và test:room-change chạy npm run build / tsc thành công |
| Backend core | PASS | Lần đầu 60/60; sau test cuối, node --test --test-reporter=dot tests/*.test.mjs chạy 61 tests không lỗi |
| RoomChange regression | PASS | npm.cmd run test:room-change: 7/7, gồm cả hai thứ tự ID |
| Backend lint | PASS | npm.cmd run lint / eslint src/**/*.ts, chạy lại sau sửa cuối |
| Script seed typecheck | PASS | npx.cmd tsc -p tsconfig.scripts.json --noEmit |
| Frontend build | PASS | npm.cmd run build / tsc -b && vite build; có warning annotation của dependency Zod, không làm build fail |
| Frontend lint | PASS | npm.cmd run lint |
| Integration JS syntax | PASS | node --check tests/postgres.integration.mjs |
| PostgreSQL integration / concurrency / seed | BLOCKED | npm.cmd run test:postgres build thành công, runner trả exit 1: Set TEST_DATABASE_URL to a dedicated database ending in _test. Không chạy migrations/reset hoặc test business trên DB thật |
| Frontend unit suite | NOT RUN | Không thay đổi frontend; đã chạy build/lint |
| Database production/development audit | NOT RUN | Không dùng DATABASE_URL để thay thế TEST_DATABASE_URL |

Scripts/test-database-url.mjs, run-postgres-tests.mjs và các guard Pool/current_database() của suite được giữ nguyên. Các test BLOCKED không được tính là PASS.

## 6. Remaining risks / ngoài scope

- Cần cung cấp TEST_DATABASE_URL riêng, database name kết thúc _test, rồi chạy npm.cmd run test:postgres để xác minh sáu race và seed conflicts trên PostgreSQL thật. Test DB phải là dữ liệu dành riêng cho suite vì suite có reset bảng được guard.
- PostgreSQL test mới hiện chỉ được kiểm tra syntax; runtime SQL/seed fixture và hành vi interleaving vẫn chưa được xác minh.
- Invariant được bảo vệ bởi các service đã audit. SQL thủ công hoặc consumer mới gọi trực tiếp repository để sửa policy/Student.gender/tạo ACTIVE phải tự tuân thủ protocol; chưa có database trigger bảo vệ mọi writer.
- Dữ liệu trái policy đã tồn tại không được tự sửa. Seed giờ dừng khi identity hiện hữu thiếu/sai gender; cần sửa dữ liệu có chủ đích, không tự chuyển phòng hoặc sửa giới tính để chạy seed thành công.
- Seed không có transaction bao trùm toàn bộ kịch bản. Các business keys khác có thể đã được tạo trước khi conflict; Building và residence đang conflict được giữ nguyên. Không thêm reset/truncate để né conflict; idempotency trên dữ liệu hợp lệ giữ nguyên.
- Các deadlock/race không liên quan đến Building gender, validator UUID của PATCH Building, và hành vi module ngoài scope không được refactor trong lần này.

## 7. Kết luận

**PARTIAL**. Phần implementation thiếu đã được sửa và build/lint/core tests PASS. Chưa đủ bằng chứng PostgreSQL để kết luận COMPLETE; integration/concurrency và seed verification còn BLOCKED bởi cấu hình test DB.
