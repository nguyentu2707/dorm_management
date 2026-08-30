# Dormitory Management System

Monorepo cho hệ thống quản lý ký túc xá.

```text
backend/   Node.js + Express + TypeScript + MongoDB
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

## Chạy toàn hệ thống trên một localhost

```powershell
cd backend
npm run dev
```

Lệnh trên build frontend, build backend và khởi động server chung tại `http://localhost:3000`.

- Frontend: `http://localhost:3000`
- API: `http://localhost:3000/api/v1`
- Health check: `http://localhost:3000/health`

## Git

Khởi tạo một Git repository tại thư mục gốc này. `node_modules`, `dist` và `.env` của cả hai project đều được root `.gitignore` loại trừ.
