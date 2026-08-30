# Module 2 — Contract & Room Change Management

## Endpoints

Student (`Bearer <student-token>`):

- `POST /api/v1/student/contracts`
- `GET /api/v1/student/contracts/me`
- `GET /api/v1/student/contracts/me/active`
- `PATCH /api/v1/student/contracts/:contractId/cancel`
- `POST /api/v1/student/room-change-requests`
- `GET /api/v1/student/room-change-requests/me`
- `PATCH /api/v1/student/room-change-requests/:requestId/cancel`

Admin (`Bearer <admin-token>`):

- `GET /api/v1/admin/contracts`
- `GET /api/v1/admin/contracts/:contractId`
- `POST /api/v1/admin/contracts`
- `PATCH /api/v1/admin/contracts/:contractId/approve`
- `PATCH /api/v1/admin/contracts/:contractId/reject`
- `PATCH /api/v1/admin/contracts/:contractId/end`
- `PATCH /api/v1/admin/contracts/:contractId/cancel`
- `GET /api/v1/admin/room-change-requests`
- `GET /api/v1/admin/room-change-requests/:requestId`
- `PATCH /api/v1/admin/room-change-requests/:requestId/approve`
- `PATCH /api/v1/admin/room-change-requests/:requestId/reject`

## Postman requests

Student đăng ký ở:

```http
POST /api/v1/student/contracts
Authorization: Bearer <student-token>
Content-Type: application/json

{"bedId":"<bedId>","startDate":"2026-09-01","endDate":"2027-06-30"}
```

Admin duyệt đăng ký:

```http
PATCH /api/v1/admin/contracts/<contractId>/approve
Authorization: Bearer <admin-token>
```

Admin tạo hợp đồng trực tiếp:

```http
POST /api/v1/admin/contracts
Authorization: Bearer <admin-token>
Content-Type: application/json

{"studentId":"<studentId>","bedId":"<bedId>","startDate":"2026-09-01","endDate":"2027-06-30"}
```

Admin kết thúc hợp đồng:

```http
PATCH /api/v1/admin/contracts/<contractId>/end
Authorization: Bearer <admin-token>
```

Student yêu cầu chuyển phòng:

```http
POST /api/v1/student/room-change-requests
Authorization: Bearer <student-token>
Content-Type: application/json

{"targetBedId":"<bedId>","reason":"Muốn chuyển sang phòng khác"}
```

Admin duyệt chuyển phòng:

```http
PATCH /api/v1/admin/room-change-requests/<requestId>/approve
Authorization: Bearer <admin-token>
```

Response thành công giữ convention:

```json
{
  "success": true,
  "message": "...",
  "data": { "id": "...", "status": "ACTIVE" }
}
```

## State và transaction

- Contract chỉ đi `PENDING → ACTIVE|REJECTED|CANCELLED` và `ACTIVE → ENDED|CANCELLED`.
- RoomChangeRequest chỉ đi từ `PENDING` tới một trạng thái terminal.
- Approve/create/end/cancel ACTIVE và approve chuyển phòng chạy trong transaction tại Service.
- Bed được claim/release bằng conditional atomic update, không dùng read-then-write.
- Partial unique index bảo vệ một Student không có nhiều Contract PENDING/ACTIVE và không có nhiều room-change request PENDING khi request chạy đồng thời.
- Module chỉ tự đổi Room giữa `AVAILABLE` và `FULL`; không ghi đè `MAINTENANCE`/`LOCKED`.

## Test cases

1. Student tạo hợp đồng hợp lệ: 201, PENDING, Bed vẫn EMPTY.
2. Date range sai, Bed OCCUPIED, Room MAINTENANCE và Student đã có PENDING/ACTIVE trả đúng error code.
3. Hai PENDING cùng Bed: chỉ approve một; request còn lại bị auto-reject hoặc không thể claim Bed.
4. Approve Bed cuối: Contract ACTIVE, Bed OCCUPIED, Room FULL.
5. Reject/student cancel PENDING không đổi Bed/Room; không cho hủy contract của người khác.
6. End/admin cancel ACTIVE: Bed EMPTY; Room FULL thành AVAILABLE; MAINTENANCE/LOCKED được giữ nguyên.
7. Hai admin create cùng Bed: chỉ một transaction claim thành công.
8. Room change kiểm tra active contract, same Bed, target Bed/Room và pending request duy nhất.
9. Approve room change thành công: old Contract ENDED/Bed EMPTY, new Contract ACTIVE/Bed OCCUPIED, request APPROVED.
10. Ép lỗi giữa approve room change: transaction rollback, old Contract/Bed và request giữ nguyên.
