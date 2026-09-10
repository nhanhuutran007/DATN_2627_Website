# Triển khai Database lên Hosting MySQL (Vietnix)

Hướng dẫn đẩy schema + seed lên database MySQL trên hosting Vietnix.

## Tài nguyên

- **Schema:** [`docs/database/schema.sql`](./schema.sql) — tạo toàn bộ bảng.
- **Seed:** [`docs/database/seed.sql`](./seed.sql) — dữ liệu mẫu (quan trọng: phải chạy **sau** schema).

> Các file này được sinh từ migration TypeORM và seed script, dùng cho việc khởi tạo **thủ công** trên hosting. Khi phát triển local, vẫn dùng `migration:run` và `seed` của TypeORM.

## Cách 1: phpMyAdmin (đơn giản nhất)

1. Đăng nhập **cPanel/VestaCP/DirectAdmin** của Vietnix → mở **phpMyAdmin**.
2. Chọn database đã tạo (vd: `userdb_crowdfunding`).
3. Vào tab **Import**.
4. Chọn file `schema.sql` → Import.
5. Lặp lại với file `seed.sql`.

## Cách 2: mysql CLI qua SSH

```bash
mysql -u USERNAME -p DATABASE_NAME < docs/database/schema.sql
mysql -u USERNAME -p DATABASE_NAME < docs/database/seed.sql
```

## Cách 3: MySQL Workbench (kết nối remote)

1. Cấu hình kết nối: host, port, username, password của Vietnix MySQL.
2. Mở `schema.sql` → Run SQL Script.
3. Mở `seed.sql` → Run SQL Script.

## Sau khi đẩy lên hosting

Cập nhật biến môi trường backend để trỏ tới database hosting:

```env
# backend/.env  hoặc biến môi trường trên hosting
DB_HOST=<host-mysql-vietnix>
DB_PORT=3306
DB_USERNAME=<user>
DB_PASSWORD=<password>
DB_DATABASE=<tên-database>
```

Lưu ý:
- Cổng 3306 trên Vietnix thường bị firewall chặn; cần **bật "Remote MySQL"** trong cPanel hoặc trắng IP máy chủ backend.
- Kiểm tra charset đã là `utf8mb4` để hiển thị tiếng Việt đúng.
