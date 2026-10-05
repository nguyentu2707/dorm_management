# Chạy hệ thống bằng Docker

## 1. Chuẩn bị

Cài Docker Desktop và bảo đảm Docker Compose hoạt động:

```powershell
docker --version
docker compose version
```

Tại thư mục gốc dự án, tạo cấu hình môi trường:

```powershell
Copy-Item .env.docker.example .env
```

Đổi tối thiểu `POSTGRES_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET` và
`ADMIN_PASSWORD` trong `.env`. Không commit file `.env`.

## 2. Build và khởi động

```powershell
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Container `app` chờ PostgreSQL sẵn sàng, tự áp dụng migration còn thiếu rồi
khởi động server. Truy cập:

- Giao diện: http://localhost:3000
- API: http://localhost:3000/api/v1
- Health check: http://localhost:3000/health

## 3. Tạo dữ liệu ban đầu (chỉ chạy một lần)

Tạo tài khoản admin theo các biến `ADMIN_*` trong `.env`:

```powershell
docker compose exec app node scripts/seed-admin.mjs
```

Nạp tòa nhà, phòng, giường và thiết bị mẫu:

```powershell
docker compose exec app node dist-scripts/scripts/seed-dormitory-data.js
```

Hai seed bị chặn khi `NODE_ENV=production`. Với máy local, giữ
`NODE_ENV=development`, chạy seed xong rồi mới chuyển cấu hình production nếu
cần.

## 4. Các lệnh vận hành

```powershell
# Xem log
docker compose logs -f app postgres

# Khởi động lại
docker compose restart

# Dừng nhưng giữ dữ liệu PostgreSQL
docker compose down

# Cập nhật code và dựng lại image
docker compose up -d --build
```

Không dùng `docker compose down -v` nếu muốn giữ dữ liệu, vì tùy chọn `-v` sẽ
xóa volume PostgreSQL.

## 5. Đưa lên server

Trên VPS/server, cài Docker, clone repo, tạo `.env`, sau đó chạy cùng lệnh
`docker compose up -d --build`. Đặt Nginx, Caddy hoặc reverse proxy của nhà cung
cấp phía trước cổng 3000 để cấp HTTPS.

Khi dùng HTTPS, đặt:

```dotenv
NODE_ENV=production
APP_ORIGIN=https://ten-mien-cua-ban.example
```

Chỉ mở cổng HTTP/HTTPS của reverse proxy ra Internet. PostgreSQL không được
publish ra host trong `compose.yaml`, vì vậy database chỉ truy cập được qua
mạng nội bộ của Compose.
