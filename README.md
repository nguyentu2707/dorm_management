# Dormitory Management System

Monorepo cho hệ thống quản lý ký túc xá.

```text
backend/   Node.js + Express + TypeScript + PostgreSQL + pg
frontend/  React + TypeScript + Vite + Tailwind CSS
```

Hai ứng dụng giữ dependency và `package.json` riêng. Backend phục vụ bản build frontend để toàn hệ thống sử dụng chung một địa chỉ.

## Cài đặt

```powershell
cd backend
npm install

cd ../frontend
npm install
```

Sao chép `.env.example` thành `.env` trong từng project và cập nhật cấu hình cần thiết.

## PostgreSQL

Backend dùng `DATABASE_URL`, SQL migrations có phiên bản và UUID. Xem [hướng dẫn backend](backend/README.md), [ERD](backend/docs/POSTGRES_ERD.md) và [báo cáo migration](POSTGRES_MIGRATION_REPORT.md).

Trước lần chạy đầu, tạo PostgreSQL và chạy `npm run db:migrate`, `npm run seed:admin`, `npm run seed:dormitory` trong backend. Seed demo không tự chạy khi startup. Khi chuyển từ MongoDB, các phiên đăng nhập cũ phải đăng nhập lại.

## Chạy toàn hệ thống trên một localhost

```powershell
cd backend
npm run dev
```

Lệnh trên build frontend, build backend và khởi động server chung tại `http://localhost:3000`.

- Frontend: `http://localhost:3000`
- API: `http://localhost:3000/api/v1`
- Health check: `http://localhost:3000/health`

## Payment V1 và kiểm chứng PostgreSQL

Sinh viên gửi yêu cầu xác nhận chuyển khoản trong chi tiết hóa đơn. Admin xử lý tại
**Tài chính → Thanh toán**. Chỉ Payment CONFIRMED được tính vào số tiền đã thanh toán;
VOID là sửa bản ghi ghi nhận sai, không phải hoàn tiền ngân hàng.

Chạy `npm run db:migrate` để áp dụng migration `003_payments` trước khi chạy backend
mới. Xem [báo cáo audit, kiểm thử và sự cố/khôi phục database](POSTGRES_AUDIT_AND_PAYMENT_REPORT.md)
và [kế hoạch triển khai](IMPLEMENTATION_PLAN_PAYMENT.md).

## Git

Khởi tạo một Git repository tại thư mục gốc này. `node_modules`, `dist` và `.env` của cả hai project đều được root `.gitignore` loại trừ.
