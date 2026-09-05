# Infrastructure

## Khởi động môi trường tích hợp

Từ thư mục gốc:

```powershell
Copy-Item .env.example .env
docker compose --env-file .env -f infra/compose.yaml up --build
```

Các địa chỉ mặc định:

- Reverse proxy: `http://localhost:8080`
- Frontend trực tiếp: `http://localhost:3000`
- Backend health: `http://localhost:4000/api/v1/health`
- AI health/docs: `http://localhost:8000/api/v1/health` và `http://localhost:8000/docs`
- MySQL từ máy host: `localhost:3307`

Port MySQL phía host mặc định là `3307` để giảm xung đột với XAMPP thường dùng `3306`. Không chạy đồng thời container MySQL và XAMPP nếu bạn cấu hình chúng dùng cùng port.

## Giới hạn hiện tại

Đây là cấu hình local/integration ban đầu, chưa phải staging công khai hoàn chỉnh. Trước khi triển khai lên VPS cần thay toàn bộ secret mẫu, bổ sung TLS/HTTPS, backup, log aggregation, giới hạn mạng và quy trình migration/rollback.
