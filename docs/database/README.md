# Database

MySQL là nguồn dữ liệu nghiệp vụ chính. Schema và migration được quản lý bằng TypeORM migration (`.ts`) tại `backend/database/migrations/`; dữ liệu mẫu sinh bằng `backend/scripts/seed.ts` (`npm run migration:run` rồi `npm run seed` trong `backend/`). Sơ đồ quan hệ: [`erd.md`](./erd.md) · DBML cho dbdiagram.io: [`schema.dbml`](./schema.dbml) · Đặc tả thực thể/quan hệ: [`dac-ta-erd.md`](./dac-ta-erd.md).

Nguyên tắc bắt buộc:

- Không dùng chế độ tự đồng bộ schema trong staging/production.
- Mọi thay đổi schema phải có migration có thứ tự và có hướng rollback phù hợp.
- Tổng tiền gây quỹ phải được tính từ giao dịch đã xác minh, không từ bộ đếm người dùng chỉnh sửa được.
- Webhook thanh toán cần idempotency key và unique constraint tương ứng.
- Tác vụ quản trị, thay đổi trạng thái và hoàn tiền phải có audit record.
