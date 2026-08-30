# Dormitory Management Backend — Module 1

Backend Node.js/Express/TypeScript/MongoDB cho Authentication và quản lý tòa nhà, loại phòng, phòng, giường, loại thiết bị, thiết bị.

Module 2 (Contract và Room Change Management) đã được bổ sung. Xem `docs/MODULE_2.md` để có endpoint, request Postman, state machine và test cases.

## Chạy dự án

```bash
copy .env.example .env
npm install
npm run dev
```

MongoDB replica set được khuyến nghị để dùng transaction. Khi MongoDB standalone từ chối transaction tạo Room+Bed, service tự chạy fallback và xóa Room/Bed đã tạo nếu sinh Bed thất bại.

## Endpoints

Auth:

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh-token`
- `GET /api/v1/auth/me` — Bearer token

Tất cả endpoint dưới đây cần access token role `ADMIN`:

- Buildings: `GET/POST /api/v1/admin/buildings`, `GET/PATCH/DELETE /api/v1/admin/buildings/:buildingId`
- Room types: `GET/POST /api/v1/admin/room-types`, `GET/PATCH/DELETE /api/v1/admin/room-types/:roomTypeId`
- Rooms: `GET/POST /api/v1/admin/buildings/:buildingId/rooms`, `GET/PATCH/DELETE /api/v1/admin/rooms/:roomId`, `PATCH /api/v1/admin/rooms/:roomId/status`
- Beds: `GET /api/v1/admin/rooms/:roomId/beds`
- Equipment categories: `GET/POST /api/v1/admin/equipment-categories`, `PATCH/DELETE /api/v1/admin/equipment-categories/:categoryId`
- Equipment: `GET/POST /api/v1/admin/rooms/:roomId/equipment`, `GET/PATCH/DELETE /api/v1/admin/equipment/:equipmentId`, `PATCH /api/v1/admin/equipment/:equipmentId/condition`

Room list hỗ trợ `page`, `limit`, `search`, `status`, `roomTypeId`, `floor`; equipment list hỗ trợ `page`, `limit`. `limit` tối đa 100.

## Request mẫu (Postman)

```http
POST /api/v1/auth/register
Content-Type: application/json

{"username":"sv0001","password":"secret123","fullName":"Nguyễn Văn A","mssv":"SV0001","email":"sv0001@example.com"}
```

`role` không nằm trong schema đăng ký và bị Zod loại bỏ. Backend luôn tạo role `STUDENT`.

```http
POST /api/v1/auth/login
Content-Type: application/json

{"username":"sv0001","password":"secret123"}
```

```http
POST /api/v1/auth/refresh-token
Content-Type: application/json

{"refreshToken":"<refresh-token>"}
```

```http
POST /api/v1/admin/buildings
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{"name":"Tòa A","address":"Khu A"}
```

```http
POST /api/v1/admin/room-types
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{"name":"Phòng 4 người","capacity":4,"pricePerMonth":750000}
```

```http
POST /api/v1/admin/buildings/<buildingId>/rooms
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{"roomTypeId":"<roomTypeId>","roomNumber":"A101","floor":1}
```

```http
POST /api/v1/admin/equipment-categories
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{"name":"Quạt","unit":"cái","defaultLifespanMonths":60}
```

```http
POST /api/v1/admin/rooms/<roomId>/equipment
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{"categoryId":"<categoryId>","serialNumber":"FAN-001","condition":"NEW","purchasePrice":500000}
```

Success dùng `{ "success": true, "message": "...", "data": ... }`; lỗi dùng `{ "success": false, "message": "...", "code": "..." }`.

## Test cases tối thiểu

- Auth: register thành công; username/MSSV trùng; login sai/đúng; refresh; admin API thiếu token và dùng token STUDENT; rollback User khi Student lỗi.
- Race condition: hai register cùng username và hai EquipmentItem cùng serial chỉ một request thành công, request còn lại nhận đúng domain error 409.
- Building/RoomType: chặn xóa khi còn Room; khóa capacity khi đã được dùng nhưng vẫn cho sửa tên/giá.
- Room/Bed: tạo đúng số Bed; unique room number; đổi status; rollback khi sinh Bed lỗi; chặn xóa khi có occupied Bed/equipment; cascade Bed khi đủ điều kiện.
- Equipment: kiểm tra Room/Category tồn tại; sparse unique serial; đổi condition; chặn xóa category đang dùng.

## Kiến trúc và SOLID

Controller chỉ chuyển đổi HTTP, Service giữ business rule/transaction, Repository chỉ truy cập Mongoose, Mapper tạo DTO an toàn. Service phụ thuộc interface repository và adapter token/password/transaction được inject thủ công. EquipmentCategory và EquipmentItem dùng service riêng; không có base repository tổng quát hay pattern ngoài phạm vi Module 1.
