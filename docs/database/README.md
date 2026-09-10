# Database

MySQL là nguồn dữ liệu nghiệp vụ chính. Schema và migration được quản lý bằng TypeORM migration (`.ts`) tại `backend/database/migrations/`. Khi khởi tạo thủ công trên hosting (Vietnix), dùng các file SQL sinh sẵn:

- **Schema:** [`docs/database/schema.sql`](./schema.sql)
- **Seed:** [`docs/database/seed.sql`](./seed.sql)
- **Hướng dẫn hosting:** [`docs/operations/vietnix-database.md`](../operations/vietnix-database.md)

Nguyên tắc bắt buộc:

- Không dùng chế độ tự đồng bộ schema trong staging/production.
- Mọi thay đổi schema phải có migration có thứ tự và có hướng rollback phù hợp.
- Tổng tiền gây quỹ phải được tính từ giao dịch đã xác minh, không từ bộ đếm người dùng chỉnh sửa được.
- Webhook thanh toán cần idempotency key và unique constraint tương ứng.
- Tác vụ quản trị, thay đổi trạng thái và hoàn tiền phải có audit record.
