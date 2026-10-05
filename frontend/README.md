# Dormitory Management Frontend

React + TypeScript + Vite frontend cho quản trị ký túc xá và cổng sinh viên.

```bash
copy .env.example .env
npm install
npm run dev
```

Backend mặc định: `http://localhost:3000/api/v1`.

Vite chạy tại `http://localhost:5173` và proxy `/api` tới backend trên cổng 3000.
Để chạy UI và API cùng `http://localhost:3000`, chạy `npm run dev` trong backend
theo [README gốc](../README.md).

## Kiểm tra

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Router hiện dùng dashboard quản trị/sinh viên riêng, trang chọn phòng đăng ký,
quản lý Staff và Audit Logs. Đường dẫn `/student/contracts` chuyển tới
`/student/room` để xem hợp đồng và lịch sử cư trú.
