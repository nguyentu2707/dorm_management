# Dormitory Management Frontend

React + TypeScript + Vite frontend cho Module 1 và Module 2.

```bash
copy .env.example .env
npm install
npm run dev
```

Backend mặc định: `http://localhost:3000/api/v1`.

## Backend API gaps

- Chưa có API list/search Student: form Admin tạo Contract tạm nhập Student ID.
- Các API Building/Room/Bed chỉ dành cho ADMIN: Student tạm nhập Bed ID khi đăng ký ở/chuyển phòng.
- Chưa có endpoint list toàn bộ Equipment: trang thiết bị yêu cầu Room ID.

Frontend không invent endpoint và không hard-code dữ liệu thay thế.
