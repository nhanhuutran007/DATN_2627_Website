# ĐẶC TẢ ERD — NỀN TẢNG GÂY QUỸ CỘNG ĐỒNG GÓP MẦM

> Bản nháp theo cấu trúc tài liệu đặc tả ERD mẫu của khoa. Nguồn: các file `backend/src/**/entities/*.entity.ts` và migration trong `backend/database/migrations/` (tới `1790000000006`). Hình ERD vật lý vẽ từ [`schema.dbml`](./schema.dbml), sơ đồ tổng quan ở [`erd.md`](./erd.md).

## CHƯƠNG 1. TỔNG QUAN HỆ THỐNG

Góp Mầm là nền tảng gây quỹ cộng đồng cho dự án xã hội và khởi nghiệp. Cơ sở dữ liệu quản lý toàn bộ quy trình: đăng ký tài khoản, tạo và kiểm duyệt chiến dịch, ủng hộ trực tuyến kèm mức quà, cập nhật tiến độ giải ngân kèm chứng từ chi tiêu, theo dõi chậm tiến độ và lịch sử thay đổi kế hoạch, hoàn tiền, tương tác cộng đồng (bình luận, theo dõi), quản trị nội dung (danh mục, dự án nổi bật), thống kê lượt xem, kiểm duyệt vi phạm, phát hiện gian lận bằng AI và thông báo. Hệ thống gồm **22 thực thể**, **33 mối quan hệ có khóa ngoại** và 5 tham chiếu logic không có khóa ngoại.

Hệ quản trị: MySQL 8 (tương thích MariaDB), engine InnoDB. Schema chỉ thay đổi qua migration TypeORM có thứ tự và có rollback.

### 1.1. Sơ đồ ERD

_(Chèn hình xuất từ dbdiagram.io với nội dung `schema.dbml`.)_

### 1.2. Mô hình quan hệ

_(Chèn hình vẽ draw.io theo ký hiệu Chen: thực thể là hình chữ nhật, quan hệ là hình thoi, tên quan hệ là động từ trong cột "Tên quan hệ" ở Chương 3.)_

## CHƯƠNG 2. CÁC THỰC THỂ (ENTITIES)

Quy ước chung cho mọi bảng (không nhắc lại ở từng mục):

- `id` (CHAR(36), PK): UUID do ứng dụng sinh.
- `created_at` (DATETIME(6), NOT NULL): thời điểm tạo, mặc định `CURRENT_TIMESTAMP(6)`.
- `updated_at` (DATETIME(6), NOT NULL): thời điểm cập nhật, mặc định `CURRENT_TIMESTAMP(6)`, tự cập nhật `ON UPDATE CURRENT_TIMESTAMP(6)`.

### 2.1. USERS (Người dùng)

**Mục đích**: Lưu tài khoản đăng nhập và hồ sơ người dùng. Một tài khoản có thể vừa là người ủng hộ vừa là chủ chiến dịch; quyền quản trị phân biệt bằng `role`.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`: theo quy ước chung
- `name` (VARCHAR(100), NOT NULL): Họ tên hiển thị
- `email` (VARCHAR(255), NOT NULL, UNIQUE): Email đăng nhập
- `password_hash` (VARCHAR(255), NOT NULL): Mật khẩu đã băm (không bao giờ trả ra API)
- `role` (ENUM: user / campaign_owner / admin, NOT NULL): Vai trò, mặc định `user`
- `status` (ENUM: active / inactive / banned, NOT NULL): Trạng thái tài khoản, mặc định `active`
- `avatar` (VARCHAR(255)): Đường dẫn ảnh đại diện
- `bio` (VARCHAR(500)): Giới thiệu ngắn
- `phone` (VARCHAR(100)): Số điện thoại (chỉ chính chủ/admin xem được)
- `organization` (VARCHAR(255)): Tổ chức/đơn vị
- `email_verified` (TINYINT(1), NOT NULL): Đã xác minh email, mặc định 0
- `failed_login_count` (INT, NOT NULL): Số lần đăng nhập sai liên tiếp, mặc định 0
- `locked_until` (DATETIME): Khóa đăng nhập tạm thời tới thời điểm này
- `password_changed_at` (DATETIME): JWT phát hành trước thời điểm này bị từ chối
- `sessions_revoked_at` (DATETIME): Thời điểm "đăng xuất khỏi mọi thiết bị"
- `ai_tracking_consent` (TINYINT(1), NOT NULL): Đồng ý ghi nhận hành vi cho gợi ý AI, mặc định 0
- `ai_consent_updated_at` (DATETIME): Lần cuối thay đổi lựa chọn đồng ý; NULL = chưa từng quyết định

**Ràng buộc**: UNIQUE trên `email`.

### 2.2. EMAIL_VERIFICATION_TOKENS (Token xác minh email)

**Mục đích**: Lưu token một lần gửi qua email để xác minh địa chỉ email.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `user_id` (CHAR(36), NOT NULL, FK): Người dùng sở hữu token
- `token_hash` (CHAR(64), NOT NULL, UNIQUE): SHA-256 (hex) của token; token gốc không được lưu
- `expires_at` (DATETIME, NOT NULL): Hạn sử dụng
- `used_at` (DATETIME): Thời điểm đã dùng; NULL = chưa dùng

**Ràng buộc**:

- UNIQUE trên `token_hash`
- INDEX (`user_id`, `created_at`)
- FK `user_id` tham chiếu `users(id)` ON DELETE CASCADE

### 2.3. PASSWORD_RESET_TOKENS (Token đặt lại mật khẩu)

**Mục đích**: Lưu token một lần cho chức năng quên mật khẩu.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `user_id` (CHAR(36), NOT NULL, FK): Người dùng yêu cầu
- `token_hash` (CHAR(64), NOT NULL, UNIQUE): SHA-256 (hex) của token
- `expires_at` (DATETIME, NOT NULL): Hạn sử dụng
- `used_at` (DATETIME): Thời điểm đã dùng
- `requested_ip` (VARCHAR(45)): IP gửi yêu cầu (IPv4/IPv6)

**Ràng buộc**:

- UNIQUE trên `token_hash`
- INDEX (`user_id`, `created_at`)
- FK `user_id` tham chiếu `users(id)` ON DELETE CASCADE

### 2.4. REVOKED_TOKENS (Token đã thu hồi)

**Mục đích**: Danh sách đen JWT đã đăng xuất, giữ tới khi token tự hết hạn.

**Thuộc tính**:

- `jti` (CHAR(36), PK): Mã định danh của JWT
- `user_id` (CHAR(36), NOT NULL, FK): Chủ token
- `expires_at` (DATETIME, NOT NULL): Thời điểm JWT hết hạn (sau đó có thể xóa bản ghi)
- `created_at` (DATETIME(6), NOT NULL): Thời điểm đăng xuất

**Ràng buộc**:

- PK là `jti`, không phải `id`
- INDEX `expires_at` (dọn bản ghi hết hạn)
- FK `user_id` tham chiếu `users(id)` ON DELETE CASCADE

### 2.5. CAMPAIGNS (Chiến dịch)

**Mục đích**: Quản lý chiến dịch gây quỹ và vòng đời từ nháp, kiểm duyệt, gây quỹ đến kết thúc.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `title` (VARCHAR(200), NOT NULL): Tên chiến dịch
- `description` (TEXT, NOT NULL): Nội dung mô tả
- `category` (VARCHAR(100), NOT NULL): Tên danh mục, lấy từ `categories.name` (tham chiếu logic, không có FK)
- `owner_id` (CHAR(36), NOT NULL, FK): Chủ chiến dịch
- `goal_amount` (DECIMAL(15,2), NOT NULL): Mục tiêu gây quỹ
- `current_amount` (DECIMAL(15,2), NOT NULL): Số tiền đã gây được, mặc định 0 (chỉ cộng từ giao dịch đã xác minh)
- `start_date` (DATETIME, NOT NULL): Ngày bắt đầu
- `end_date` (DATETIME, NOT NULL): Ngày kết thúc
- `status` (ENUM, NOT NULL): draft / pending / approved / rejected / needs_info / active / paused / success / failed / cancelled / ended, mặc định `draft`
- `is_featured` (TINYINT(1), NOT NULL): Được quản trị viên chọn làm dự án nổi bật trên trang chủ, mặc định 0
- `featured_at` (DATETIME): Thời điểm được chọn nổi bật (dùng để sắp xếp)
- `image_url` (VARCHAR(500)): Ảnh đại diện
- `video_url` (VARCHAR(500)): Video giới thiệu
- `location` (VARCHAR(255)): Địa điểm
- `backer_count` (INT, NOT NULL): Số người ủng hộ, mặc định 0
- `view_count` (INT, NOT NULL): Tổng lượt xem tích lũy, mặc định 0 (chi tiết theo ngày ở `campaign_view_daily`)
- `rejection_reason` (TEXT): Lý do từ chối/yêu cầu bổ sung khi kiểm duyệt

**Ràng buộc**:

- FK `owner_id` tham chiếu `users(id)`
- INDEX `status`, INDEX `category`, INDEX (`is_featured`, `featured_at`)

### 2.6. CATEGORIES (Danh mục lĩnh vực)

**Mục đích**: Danh mục lĩnh vực chiến dịch do quản trị viên quản lý, thay cho danh sách viết cứng trong giao diện. Migration khởi tạo sẵn 6 danh mục mặc định (Giáo dục, Môi trường, Nông nghiệp, Y tế, Khởi nghiệp, Công nghệ) cùng mọi lĩnh vực chiến dịch đang dùng.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `name` (VARCHAR(100), NOT NULL, UNIQUE): Tên danh mục; đổi tên thì tầng dịch vụ cập nhật luôn `campaigns.category`
- `description` (VARCHAR(300)): Mô tả ngắn
- `sort_order` (INT, NOT NULL): Thứ tự hiển thị, mặc định 0
- `is_active` (TINYINT(1), NOT NULL): Đang dùng, mặc định 1; tắt thì không nhận chiến dịch mới, chiến dịch cũ giữ nguyên

**Ràng buộc**: UNIQUE trên `name`. Không có FK (xem 5.2).

### 2.7. CAMPAIGN_VIEW_DAILY (Lượt xem theo ngày)

**Mục đích**: Bảng đếm tổng hợp lượt xem chiến dịch theo ngày (UTC) để chủ dự án xem diễn biến theo thời gian và tính tỷ lệ chuyển đổi. Mỗi lượt xem hợp lệ cộng 1 vào đúng dòng (chiến dịch, ngày); `campaigns.view_count` vẫn là tổng tích lũy.

**Thuộc tính** (không theo quy ước chung — không có `id`, `created_at`, `updated_at`):

- `campaign_id` (CHAR(36), NOT NULL, PK, FK): Chiến dịch
- `view_date` (DATE, NOT NULL, PK): Ngày thống kê (UTC)
- `views` (INT, NOT NULL): Số lượt xem trong ngày, mặc định 0

**Ràng buộc**:

- PRIMARY KEY (`campaign_id`, `view_date`)
- FK `campaign_id` tham chiếu `campaigns(id)` ON DELETE CASCADE

### 2.8. MILESTONES (Mốc tiến độ)

**Mục đích**: Các mốc sử dụng quỹ của chiến dịch, giúp người ủng hộ theo dõi việc giải ngân.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `campaign_id` (CHAR(36), NOT NULL, FK): Chiến dịch
- `title` (VARCHAR(200), NOT NULL): Tên mốc
- `description` (TEXT): Mô tả
- `target_date` (DATETIME): Ngày dự kiến hoàn thành
- `budget` (DECIMAL(15,2)): Ngân sách dự kiến
- `sort_order` (INT, NOT NULL): Thứ tự hiển thị, mặc định 0
- `is_completed` (TINYINT(1), NOT NULL): Đã hoàn thành, mặc định 0
- `completed_at` (DATETIME): Thời điểm hoàn thành
- `overdue_notified_at` (DATETIME): Lần cuối hệ thống nhắc chủ dự án mốc đã quá `target_date` mà chưa hoàn thành (nhắc lại tối đa 7 ngày/lần); đặt lại NULL khi đổi hạn

**Ràng buộc**: FK `campaign_id` tham chiếu `campaigns(id)`.

### 2.9. MILESTONE_UPDATES (Cập nhật tiến độ)

**Mục đích**: Bài cập nhật cho từng mốc (nội dung, hình ảnh, khoản chi). Chứng từ chi tiêu chi tiết nằm ở `milestone_update_attachments`.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `milestone_id` (CHAR(36), NOT NULL, FK): Mốc tiến độ
- `content` (TEXT, NOT NULL): Nội dung cập nhật
- `image_url` (VARCHAR(500)): Ảnh minh chứng
- `expense_amount` (DECIMAL(15,2)): Số tiền đã chi

**Ràng buộc**: FK `milestone_id` tham chiếu `milestones(id)`.

### 2.10. MILESTONE_UPDATE_ATTACHMENTS (Chứng từ chi tiêu)

**Mục đích**: Gắn ảnh hóa đơn/biên lai (tệp `media_files` có `purpose = expense_receipt`) vào bài cập nhật tiến độ để minh bạch khoản chi với người ủng hộ.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `milestone_update_id` (CHAR(36), NOT NULL, FK): Bài cập nhật chứa chứng từ
- `media_file_id` (CHAR(36), NOT NULL, UNIQUE, FK): Tệp chứng từ đã tải lên
- `url` (VARCHAR(500), NOT NULL): Đường dẫn công khai của chứng từ
- `caption` (VARCHAR(200)): Chú thích khoản chi
- `sort_order` (INT, NOT NULL): Thứ tự hiển thị, mặc định 0

**Ràng buộc**:

- UNIQUE trên `media_file_id`: một chứng từ không được dùng lại cho nhiều khoản chi
- INDEX (`milestone_update_id`, `sort_order`)
- FK `milestone_update_id` → `milestone_updates(id)` ON DELETE CASCADE (xóa bài cập nhật thì xóa liên kết, tệp vẫn còn trong kho)
- FK `media_file_id` → `media_files(id)`

### 2.11. MILESTONE_REVISIONS (Lịch sử thay đổi mốc)

**Mục đích**: Ghi lại mỗi lần chủ dự án sửa mốc tiến độ sau khi chiến dịch đã phát hành (giá trị cũ/mới và lý do bắt buộc), công khai cho người ủng hộ.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `milestone_id` (CHAR(36), NOT NULL, FK): Mốc bị thay đổi
- `changed_by` (CHAR(36), NOT NULL, FK): Người thực hiện thay đổi
- `reason` (VARCHAR(500), NOT NULL): Lý do thay đổi
- `old_values` (TEXT, NOT NULL): Giá trị trước khi sửa (chuỗi JSON: tiêu đề, hạn, ngân sách...)
- `new_values` (TEXT, NOT NULL): Giá trị sau khi sửa (chuỗi JSON)

**Ràng buộc**:

- INDEX (`milestone_id`, `created_at`)
- FK `milestone_id` → `milestones(id)` ON DELETE CASCADE
- FK `changed_by` → `users(id)`

### 2.12. REWARD_TIERS (Mức quà tặng)

**Mục đích**: Các mức ủng hộ kèm phần quà do chủ chiến dịch thiết lập.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `campaign_id` (CHAR(36), NOT NULL, FK): Chiến dịch
- `title` (VARCHAR(120), NOT NULL): Tên mức quà
- `description` (TEXT, NOT NULL): Mô tả phần quà
- `min_amount` (DECIMAL(15,2), NOT NULL): Số tiền ủng hộ tối thiểu
- `quantity_limit` (INT): Số suất tối đa; NULL = không giới hạn
- `claimed_count` (INT, NOT NULL): Số suất đã nhận, mặc định 0 (chỉ tăng khi thanh toán được xác nhận)
- `estimated_delivery` (DATE): Ngày dự kiến giao quà
- `sort_order` (INT, NOT NULL): Thứ tự hiển thị, mặc định 0
- `is_active` (TINYINT(1), NOT NULL): Đang mở, mặc định 1
- `deleted_at` (DATETIME(6)): Xóa mềm

**Ràng buộc**:

- CHECK `min_amount > 0`
- CHECK `quantity_limit IS NULL OR claimed_count <= quantity_limit`
- INDEX (`campaign_id`, `sort_order`)
- FK `campaign_id` tham chiếu `campaigns(id)`

### 2.13. MEDIA_FILES (Tệp đa phương tiện)

**Mục đích**: Quản lý ảnh người dùng tải lên (ảnh chiến dịch, ảnh tiến độ, avatar, ảnh hóa đơn/biên lai chi tiêu).

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `owner_id` (CHAR(36), NOT NULL, FK): Người tải lên
- `storage_key` (VARCHAR(120), NOT NULL, UNIQUE): Khóa trong kho lưu trữ do server sinh, ví dụ `campaigns/<uuid>.webp`
- `mime_type` (VARCHAR(50), NOT NULL): Kiểu MIME
- `size_bytes` (INT, NOT NULL): Dung lượng
- `purpose` (ENUM: campaign_image / progress_image / avatar / expense_receipt, NOT NULL): Mục đích sử dụng; `expense_receipt` lưu trong thư mục `receipts/`
- `original_name` (VARCHAR(255)): Tên file gốc (chỉ để hiển thị)
- `deleted_at` (DATETIME(6)): Xóa mềm

**Ràng buộc**:

- UNIQUE trên `storage_key`
- INDEX (`owner_id`, `created_at`)
- FK `owner_id` tham chiếu `users(id)`

### 2.14. DONATIONS (Khoản ủng hộ)

**Mục đích**: Ghi nhận giao dịch ủng hộ qua cổng thanh toán và trạng thái của giao dịch.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `user_id` (CHAR(36), NOT NULL, FK): Người ủng hộ
- `campaign_id` (CHAR(36), NOT NULL, FK): Chiến dịch được ủng hộ
- `reward_tier_id` (CHAR(36), FK): Mức quà đã chọn; NULL = ủng hộ không nhận quà
- `amount` (DECIMAL(15,2), NOT NULL): Số tiền
- `currency` (VARCHAR(3), NOT NULL): Đơn vị tiền, mặc định `VND`
- `status` (ENUM, NOT NULL): pending / completed / failed / refunded / expired / cancelled, mặc định `pending`
- `payment_method` (VARCHAR(50)): Phương thức thanh toán
- `transaction_id` (VARCHAR(255), UNIQUE): Mã giao dịch của cổng thanh toán
- `idempotency_key` (VARCHAR(255), NOT NULL, UNIQUE): Khóa chống ghi nhận trùng
- `message` (TEXT): Lời nhắn
- `is_anonymous` (TINYINT(1), NOT NULL): Ủng hộ ẩn danh, mặc định 0
- `completed_at` (DATETIME): Thời điểm thanh toán thành công
- `refunded_at` (DATETIME): Thời điểm hoàn tiền
- `refund_reference` (VARCHAR(255)): Mã hoàn tiền từ cổng thanh toán
- `refund_reason` (VARCHAR(500)): Lý do hoàn tiền

**Ràng buộc**:

- UNIQUE trên `transaction_id` (cho phép NULL), UNIQUE trên `idempotency_key`
- INDEX `user_id`, INDEX `campaign_id`, INDEX (`status`, `created_at`)
- FK `user_id` → `users(id)`, FK `campaign_id` → `campaigns(id)`, FK `reward_tier_id` → `reward_tiers(id)`

### 2.15. REFUND_REQUESTS (Yêu cầu hoàn tiền)

**Mục đích**: Người ủng hộ gửi yêu cầu hoàn tiền, quản trị viên duyệt hoặc từ chối.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `donation_id` (CHAR(36), NOT NULL, FK): Khoản ủng hộ cần hoàn
- `user_id` (CHAR(36), NOT NULL, FK): Người yêu cầu
- `reason` (TEXT, NOT NULL): Lý do
- `status` (ENUM: pending / approved / rejected, NOT NULL): Mặc định `pending`
- `admin_notes` (TEXT): Ghi chú của quản trị viên
- `reviewed_by` (CHAR(36), FK): Quản trị viên xử lý
- `reviewed_at` (DATETIME): Thời điểm xử lý

**Ràng buộc**:

- INDEX (`status`, `created_at`), INDEX (`donation_id`, `status`)
- FK `donation_id` → `donations(id)`, FK `user_id` → `users(id)`, FK `reviewed_by` → `users(id)`

### 2.16. CAMPAIGN_COMMENTS (Bình luận chiến dịch)

**Mục đích**: Bình luận và câu hỏi của cộng đồng trên trang chiến dịch, hỗ trợ trả lời một cấp.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `campaign_id` (CHAR(36), NOT NULL, FK): Chiến dịch
- `user_id` (CHAR(36), NOT NULL, FK): Người viết
- `parent_id` (CHAR(36), FK): Bình luận gốc được trả lời; NULL = bình luận gốc
- `kind` (ENUM: comment / question, NOT NULL): Loại, mặc định `comment`
- `content` (TEXT, NOT NULL): Nội dung
- `status` (ENUM: visible / hidden, NOT NULL): Mặc định `visible`
- `hidden_reason` (VARCHAR(500)): Lý do ẩn
- `hidden_by` (CHAR(36), FK): Người ẩn bình luận
- `hidden_at` (DATETIME): Thời điểm ẩn
- `deleted_at` (DATETIME(6)): Xóa mềm

**Ràng buộc**:

- INDEX (`campaign_id`, `parent_id`, `created_at`), INDEX (`status`, `created_at`)
- FK `campaign_id` → `campaigns(id)`, FK `user_id` → `users(id)`, FK `parent_id` → `campaign_comments(id)`, FK `hidden_by` → `users(id)`

### 2.17. CAMPAIGN_FOLLOWS (Theo dõi chiến dịch)

**Mục đích**: Bảng trung gian thể hiện người dùng theo dõi chiến dịch để nhận thông báo cập nhật.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `user_id` (CHAR(36), NOT NULL, FK): Người theo dõi
- `campaign_id` (CHAR(36), NOT NULL, FK): Chiến dịch được theo dõi

**Ràng buộc**:

- UNIQUE (`user_id`, `campaign_id`): mỗi người chỉ theo dõi một chiến dịch một lần
- INDEX `campaign_id`
- FK `user_id` → `users(id)` ON DELETE CASCADE, FK `campaign_id` → `campaigns(id)` ON DELETE CASCADE

### 2.18. REPORTS (Báo cáo vi phạm)

**Mục đích**: Người dùng báo cáo chiến dịch hoặc bình luận vi phạm; quản trị viên xử lý.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `reporter_id` (CHAR(36), NOT NULL, FK): Người báo cáo
- `campaign_id` (CHAR(36), FK): Chiến dịch bị báo cáo
- `comment_id` (CHAR(36), FK): Bình luận bị báo cáo (nếu có)
- `reason` (ENUM: spam / fraud / inappropriate / misinformation / other, NOT NULL): Lý do
- `description` (TEXT, NOT NULL): Mô tả chi tiết
- `status` (ENUM: pending / reviewing / resolved / dismissed, NOT NULL): Mặc định `pending`
- `admin_notes` (TEXT): Ghi chú xử lý
- `resolved_by` (CHAR(36), FK): Quản trị viên xử lý gần nhất
- `resolved_at` (DATETIME): Thời điểm xử lý
- `campaign_paused` (TINYINT(1), NOT NULL): Đã tạm dừng chiến dịch khi xử lý, mặc định 0
- `comment_hidden` (TINYINT(1), NOT NULL): Đã ẩn bình luận khi xử lý, mặc định 0

**Ràng buộc**:

- INDEX (`status`, `created_at`), INDEX (`campaign_id`, `reporter_id`)
- FK `reporter_id` → `users(id)`, FK `campaign_id` → `campaigns(id)`, FK `comment_id` → `campaign_comments(id)`, FK `resolved_by` → `users(id)`

### 2.19. RISK_ALERTS (Cảnh báo rủi ro)

**Mục đích**: Cảnh báo gian lận do mô-đun AI hoặc bộ luật sinh ra cho chiến dịch hoặc người dùng.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `entity_type` (ENUM: campaign / user, NOT NULL): Loại đối tượng
- `entity_id` (CHAR(36), NOT NULL): Id đối tượng (tham chiếu đa hình, không có FK)
- `entity_name` (VARCHAR(255), NOT NULL): Tên đối tượng tại thời điểm cảnh báo
- `risk_level` (ENUM: low / medium / high, NOT NULL): Mặc định `medium`
- `risk_score` (FLOAT, NOT NULL): Điểm rủi ro, mặc định 0
- `method` (ENUM: ai / rule, NOT NULL): Cách phát hiện, mặc định `ai`
- `reasons` (JSON, NOT NULL): Danh sách lý do (nhóm, nhãn, trọng số)
- `evidences` (JSON, NOT NULL): Các chỉ số làm bằng chứng
- `status` (ENUM: open / resolved / dismissed, NOT NULL): Mặc định `open`
- `resolved_by` (CHAR(36), FK): Quản trị viên xử lý
- `resolved_at` (DATETIME(6)): Thời điểm xử lý

**Ràng buộc**:

- INDEX `status`, INDEX (`entity_type`, `entity_id`)
- FK `resolved_by` → `users(id)`

### 2.20. BEHAVIOR_EVENTS (Sự kiện hành vi)

**Mục đích**: Ghi nhận hành vi xem, theo dõi, ủng hộ làm dữ liệu cho gợi ý AI. Chỉ ghi khi người dùng bật `ai_tracking_consent`.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `user_id` (CHAR(36), NOT NULL, FK): Người dùng
- `campaign_id` (CHAR(36), NOT NULL, FK): Chiến dịch
- `event_type` (ENUM: view / follow / contribute, NOT NULL): Loại hành vi
- `category` (VARCHAR(100), NOT NULL): Danh mục chiến dịch tại thời điểm ghi
- `event_data` (JSON): Dữ liệu bổ sung

**Ràng buộc**:

- INDEX (`user_id`, `event_type`), INDEX `campaign_id`
- FK `user_id` → `users(id)`, FK `campaign_id` → `campaigns(id)`

### 2.21. NOTIFICATIONS (Thông báo)

**Mục đích**: Thông báo trong ứng dụng cho người dùng về các sự kiện liên quan.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `user_id` (CHAR(36), NOT NULL, FK): Người nhận
- `type` (ENUM, NOT NULL): campaign_approved, campaign_rejected, campaign_needs_info, campaign_paused, campaign_resumed, campaign_ended, donation_received, donation_confirmed, milestone_completed, progress_update, report_resolved, comment_new, comment_reply, comment_hidden, refund_approved, refund_rejected, donation_refunded, milestone_overdue, milestone_rescheduled, system
- `title` (VARCHAR(200), NOT NULL): Tiêu đề
- `message` (TEXT, NOT NULL): Nội dung
- `link` (VARCHAR(300)): Đường dẫn tương đối để mở khi bấm, ví dụ `/du-an/<id>`
- `is_read` (TINYINT(1), NOT NULL): Đã đọc, mặc định 0
- `related_id` (CHAR(36)): Id đối tượng liên quan (không có FK)

**Ràng buộc**:

- INDEX (`user_id`, `is_read`, `created_at`)
- FK `user_id` → `users(id)`

### 2.22. AUDIT_LOGS (Nhật ký kiểm toán)

**Mục đích**: Ghi lại các thay đổi quan trọng (kiểm duyệt, đổi trạng thái, hoàn tiền...) để truy vết.

**Thuộc tính**:

- `id`, `created_at`, `updated_at`
- `user_id` (VARCHAR(36)): Người thực hiện (không có FK để log vẫn còn khi tài khoản bị xóa)
- `action` (VARCHAR(100), NOT NULL): Hành động
- `entity` (VARCHAR(100), NOT NULL): Tên loại đối tượng
- `entity_id` (VARCHAR(36)): Id đối tượng
- `old_values` (JSON): Giá trị trước khi thay đổi
- `new_values` (JSON): Giá trị sau khi thay đổi
- `ip_address` (VARCHAR(45)): IP
- `user_agent` (VARCHAR(500)): Trình duyệt/thiết bị

**Ràng buộc**: Không có FK (xem 5.2).

## CHƯƠNG 3. MỐI QUAN HỆ (RELATIONSHIPS)

Các quan hệ dưới đây là 1-N (trừ 3.31 là 1-1) và đều có ràng buộc FOREIGN KEY trong CSDL. "Bắt buộc" nghĩa là cột FK là NOT NULL.

| # | Quan hệ | Tên quan hệ | Khóa ngoại | Bắt buộc | Mô tả |
| --- | --- | --- | --- | --- | --- |
| 3.1 | USERS – CAMPAIGNS | tạo | `campaigns.owner_id → users.id` | Có | Một người dùng tạo nhiều chiến dịch |
| 3.2 | USERS – DONATIONS | ủng hộ | `donations.user_id → users.id` | Có | Một người dùng có nhiều khoản ủng hộ |
| 3.3 | CAMPAIGNS – DONATIONS | nhận | `donations.campaign_id → campaigns.id` | Có | Một chiến dịch nhận nhiều khoản ủng hộ |
| 3.4 | REWARD_TIERS – DONATIONS | được chọn | `donations.reward_tier_id → reward_tiers.id` | Không | Một mức quà được nhiều khoản ủng hộ chọn; ủng hộ có thể không nhận quà |
| 3.5 | CAMPAIGNS – REWARD_TIERS | có | `reward_tiers.campaign_id → campaigns.id` | Có | Một chiến dịch có nhiều mức quà |
| 3.6 | CAMPAIGNS – MILESTONES | có | `milestones.campaign_id → campaigns.id` | Có | Một chiến dịch có nhiều mốc tiến độ |
| 3.7 | MILESTONES – MILESTONE_UPDATES | có | `milestone_updates.milestone_id → milestones.id` | Có | Một mốc có nhiều bài cập nhật |
| 3.8 | DONATIONS – REFUND_REQUESTS | yêu cầu hoàn | `refund_requests.donation_id → donations.id` | Có | Một khoản ủng hộ có thể có nhiều yêu cầu hoàn (gửi lại sau khi bị từ chối) |
| 3.9 | USERS – REFUND_REQUESTS (người yêu cầu) | gửi | `refund_requests.user_id → users.id` | Có | Một người dùng gửi nhiều yêu cầu hoàn tiền |
| 3.10 | USERS – REFUND_REQUESTS (người duyệt) | duyệt | `refund_requests.reviewed_by → users.id` | Không | Một quản trị viên duyệt nhiều yêu cầu |
| 3.11 | CAMPAIGNS – CAMPAIGN_COMMENTS | có | `campaign_comments.campaign_id → campaigns.id` | Có | Một chiến dịch có nhiều bình luận |
| 3.12 | USERS – CAMPAIGN_COMMENTS (tác giả) | viết | `campaign_comments.user_id → users.id` | Có | Một người dùng viết nhiều bình luận |
| 3.13 | USERS – CAMPAIGN_COMMENTS (người ẩn) | ẩn | `campaign_comments.hidden_by → users.id` | Không | Chủ chiến dịch/quản trị viên ẩn bình luận |
| 3.14 | CAMPAIGN_COMMENTS – CAMPAIGN_COMMENTS | trả lời | `campaign_comments.parent_id → campaign_comments.id` | Không | Quan hệ đệ quy: một bình luận gốc có nhiều trả lời |
| 3.15 | USERS – CAMPAIGN_FOLLOWS | theo dõi | `campaign_follows.user_id → users.id` (CASCADE) | Có | Cùng 3.16 tạo quan hệ N-N USERS–CAMPAIGNS |
| 3.16 | CAMPAIGNS – CAMPAIGN_FOLLOWS | được theo dõi | `campaign_follows.campaign_id → campaigns.id` (CASCADE) | Có | Một chiến dịch có nhiều người theo dõi |
| 3.17 | USERS – REPORTS (người báo cáo) | báo cáo | `reports.reporter_id → users.id` | Có | Một người dùng gửi nhiều báo cáo |
| 3.18 | USERS – REPORTS (người xử lý) | xử lý | `reports.resolved_by → users.id` | Không | Một quản trị viên xử lý nhiều báo cáo |
| 3.19 | CAMPAIGNS – REPORTS | bị báo cáo | `reports.campaign_id → campaigns.id` | Không | Một chiến dịch có thể bị báo cáo nhiều lần |
| 3.20 | CAMPAIGN_COMMENTS – REPORTS | bị báo cáo | `reports.comment_id → campaign_comments.id` | Không | Một bình luận có thể bị báo cáo nhiều lần |
| 3.21 | USERS – RISK_ALERTS | xử lý | `risk_alerts.resolved_by → users.id` | Không | Một quản trị viên xử lý nhiều cảnh báo |
| 3.22 | USERS – BEHAVIOR_EVENTS | phát sinh | `behavior_events.user_id → users.id` | Có | Một người dùng có nhiều sự kiện hành vi |
| 3.23 | CAMPAIGNS – BEHAVIOR_EVENTS | được tương tác | `behavior_events.campaign_id → campaigns.id` | Có | Một chiến dịch có nhiều sự kiện hành vi |
| 3.24 | USERS – NOTIFICATIONS | nhận | `notifications.user_id → users.id` | Có | Một người dùng nhận nhiều thông báo |
| 3.25 | USERS – MEDIA_FILES | tải lên | `media_files.owner_id → users.id` | Có | Một người dùng tải lên nhiều tệp |
| 3.26 | USERS – EMAIL_VERIFICATION_TOKENS | xác minh | `email_verification_tokens.user_id → users.id` (CASCADE) | Có | Mỗi lần gửi lại email tạo token mới |
| 3.27 | USERS – PASSWORD_RESET_TOKENS | đặt lại mật khẩu | `password_reset_tokens.user_id → users.id` (CASCADE) | Có | Mỗi lần yêu cầu tạo token mới |
| 3.28 | USERS – REVOKED_TOKENS | đăng xuất | `revoked_tokens.user_id → users.id` (CASCADE) | Có | Mỗi lần đăng xuất thu hồi một JWT |
| 3.29 | CAMPAIGNS – CAMPAIGN_VIEW_DAILY | thống kê lượt xem | `campaign_view_daily.campaign_id → campaigns.id` (CASCADE) | Có | Một chiến dịch có một dòng thống kê cho mỗi ngày có lượt xem |
| 3.30 | MILESTONE_UPDATES – MILESTONE_UPDATE_ATTACHMENTS | đính kèm | `milestone_update_attachments.milestone_update_id → milestone_updates.id` (CASCADE) | Có | Một bài cập nhật có nhiều chứng từ chi tiêu |
| 3.31 | MEDIA_FILES – MILESTONE_UPDATE_ATTACHMENTS | là chứng từ | `milestone_update_attachments.media_file_id → media_files.id` (UNIQUE) | Có | Quan hệ **1-1 (tùy chọn phía tệp)**: mỗi tệp chứng từ gắn với tối đa một bài cập nhật |
| 3.32 | MILESTONES – MILESTONE_REVISIONS | có lịch sử | `milestone_revisions.milestone_id → milestones.id` (CASCADE) | Có | Một mốc có nhiều lần sửa sau khi phát hành |
| 3.33 | USERS – MILESTONE_REVISIONS | sửa mốc | `milestone_revisions.changed_by → users.id` | Có | Một chủ dự án thực hiện nhiều lần sửa mốc |

**Quan hệ N-N**: USERS – CAMPAIGNS (theo dõi) được tách thành hai quan hệ 1-N qua bảng trung gian `campaign_follows` (3.15, 3.16) với UNIQUE (`user_id`, `campaign_id`). Tương tự, `donations` có thể xem là bảng liên kết N-N USERS – CAMPAIGNS kèm thuộc tính giao dịch.

**Tham chiếu logic (không có FK)**:

| Cột | Trỏ tới | Lý do không đặt FK |
| --- | --- | --- |
| `risk_alerts.entity_id` | `campaigns.id` hoặc `users.id` theo `entity_type` | Tham chiếu đa hình |
| `audit_logs.entity_id` | Bất kỳ bảng nào theo `entity` | Tham chiếu đa hình |
| `audit_logs.user_id` | `users.id` | Giữ nhật ký kể cả khi tài khoản bị xóa |
| `notifications.related_id` | Chiến dịch/khoản ủng hộ/bình luận... theo `type` | Tham chiếu đa hình |
| `campaigns.category` | `categories.name` | Lưu tên để không đổi schema chiến dịch; đổi tên danh mục thì tầng dịch vụ cập nhật đồng loạt, tắt danh mục không ảnh hưởng chiến dịch cũ |

## CHƯƠNG 4. QUY TRÌNH NGHIỆP VỤ

### 4.1. Quy trình tổng quan

1. **Đăng ký tài khoản** → tạo `USERS`, gửi `EMAIL_VERIFICATION_TOKENS`.
2. **Tạo chiến dịch** → tạo `CAMPAIGNS` (status `draft`, `category` chọn từ `CATEGORIES` đang bật), kèm `MILESTONES`, `REWARD_TIERS`, ảnh trong `MEDIA_FILES`.
3. **Gửi duyệt và kiểm duyệt** → `campaigns.status`: `pending` → `approved`/`rejected`/`needs_info` → `active`; ghi `AUDIT_LOGS`, gửi `NOTIFICATIONS`. Quản trị viên có thể đặt `is_featured` để đưa lên trang chủ.
4. **Xem chiến dịch** → tăng `campaigns.view_count` và cộng `CAMPAIGN_VIEW_DAILY.views` của ngày hiện tại (dùng cho biểu đồ và tỷ lệ chuyển đổi của chủ dự án).
5. **Ủng hộ** → tạo `DONATIONS` (`pending`); webhook cổng thanh toán xác nhận → `completed`, cộng `campaigns.current_amount`, `backer_count`, `reward_tiers.claimed_count`. Đơn quá hạn → `expired`; người dùng hủy → `cancelled`.
6. **Cập nhật tiến độ** → tạo `MILESTONE_UPDATES` kèm chứng từ chi tiêu (`MEDIA_FILES` mục đích `expense_receipt` + `MILESTONE_UPDATE_ATTACHMENTS`), đánh dấu `milestones.is_completed`; thông báo tới người ủng hộ và người theo dõi (`CAMPAIGN_FOLLOWS`).
7. **Theo dõi chậm tiến độ** → tác vụ định kỳ tìm mốc quá `target_date` chưa hoàn thành, gửi `NOTIFICATIONS` loại `milestone_overdue` và ghi `milestones.overdue_notified_at`. Chủ dự án sửa mốc sau khi chiến dịch phát hành → tạo `MILESTONE_REVISIONS` (lý do bắt buộc); nếu đổi hạn hoặc ngân sách thì gửi thông báo `milestone_rescheduled` tới người ủng hộ.
8. **Kết thúc chiến dịch** → `success`/`failed`/`ended`.
9. **Hoàn tiền** → tạo `REFUND_REQUESTS`; quản trị viên duyệt → `donations.status = refunded`, ghi `refunded_at`, `refund_reference`.

### 4.2. Các nghiệp vụ phụ

- Xác thực và bảo mật phiên (`USERS`, `PASSWORD_RESET_TOKENS`, `REVOKED_TOKENS`)
- Tương tác cộng đồng (`CAMPAIGN_COMMENTS`, `CAMPAIGN_FOLLOWS`)
- Kiểm duyệt vi phạm (`REPORTS`; có thể tạm dừng chiến dịch hoặc ẩn bình luận)
- Phát hiện gian lận (`RISK_ALERTS`)
- Gợi ý chiến dịch bằng AI (`BEHAVIOR_EVENTS`, khi người dùng đồng ý)
- Quản trị nội dung (`CATEGORIES`, cờ `campaigns.is_featured`)
- Thống kê cho chủ dự án (`CAMPAIGN_VIEW_DAILY` kết hợp `DONATIONS` để tính tỷ lệ chuyển đổi)

## CHƯƠNG 5. CÁC ĐIỂM LƯU Ý ĐẶC BIỆT

### 5.1. Quan hệ đệ quy (Self-reference)

- `campaign_comments.parent_id → campaign_comments.id`: chỉ cho phép trả lời một cấp (ứng dụng kiểm tra bình luận cha phải là bình luận gốc).

### 5.2. Tham chiếu đa hình và cột không có khóa ngoại

- `risk_alerts.entity_id`, `audit_logs.entity_id`, `notifications.related_id` trỏ tới nhiều bảng tùy cột loại đi kèm nên không đặt FK; tính toàn vẹn do tầng ứng dụng đảm bảo.
- `audit_logs.user_id` cố ý không có FK để nhật ký không bị mất hay chặn khi xóa tài khoản.
- `campaigns.category` lưu tên danh mục thay vì `categories.id`; đổi tên danh mục được đồng bộ ở tầng dịch vụ, tắt danh mục (`is_active = 0`) không làm chiến dịch cũ mất danh mục.

### 5.3. Nhiều khóa ngoại cùng trỏ về USERS

- `refund_requests` (`user_id`, `reviewed_by`), `reports` (`reporter_id`, `resolved_by`), `campaign_comments` (`user_id`, `hidden_by`): cùng một bảng `users` nhưng đóng vai trò khác nhau (người dùng thường và quản trị viên/người xử lý).
- `milestone_revisions.changed_by`: người sửa mốc (chủ dự án), tách khỏi `audit_logs` vì lịch sử này được công khai cho người ủng hộ.

### 5.4. Quan hệ 1-1 và khóa chính ghép

- `milestone_update_attachments.media_file_id` vừa là FK vừa UNIQUE nên mỗi tệp `media_files` chỉ làm chứng từ cho tối đa một khoản chi (quan hệ 1-1, phía tệp tùy chọn), ngăn dùng lại một hóa đơn cho nhiều khoản chi.
- `campaign_view_daily` dùng khóa chính ghép (`campaign_id`, `view_date`) thay cho UUID: đây là bảng đếm tổng hợp, mỗi lượt xem chỉ tăng `views` của đúng một dòng (upsert), không sinh bản ghi mới cho từng lượt.

### 5.5. Khóa chính và giá trị mặc định quan trọng

- Khóa chính là UUID `CHAR(36)`; riêng `revoked_tokens` dùng `jti` của JWT làm khóa chính và `campaign_view_daily` dùng khóa ghép (xem 5.4).
- `created_at`/`updated_at` dùng `CURRENT_TIMESTAMP(6)`; `updated_at` tự cập nhật.
- `campaigns.status` mặc định `draft`; `donations.status`, `refund_requests.status`, `reports.status` mặc định `pending`; `risk_alerts.status` mặc định `open`.
- `users.role` mặc định `user`; `users.ai_tracking_consent` mặc định 0 (opt-in).
- `donations.currency` mặc định `VND`.
- `campaigns.is_featured` mặc định 0; `categories.is_active` mặc định 1.

### 5.6. Toàn vẹn giao dịch

- `donations.idempotency_key` UNIQUE và `transaction_id` UNIQUE chống ghi nhận trùng khi webhook gửi lại.
- `campaigns.current_amount` chỉ cộng từ khoản ủng hộ đã xác minh.
- CHECK trên `reward_tiers` chặn vượt số suất quà.
- Chứng từ chi tiêu là tệp riêng (UNIQUE `media_file_id`) và lịch sử sửa mốc (`milestone_revisions`) chỉ được thêm mới (ứng dụng không có thao tác sửa/xóa), giúp người ủng hộ đối chiếu việc giải ngân.

### 5.7. Xóa mềm và xóa dây chuyền

- Xóa mềm (`deleted_at`): `campaign_comments`, `reward_tiers`, `media_files`.
- ON DELETE CASCADE: các bảng token, `campaign_follows`, `campaign_view_daily` (dữ liệu phụ, không cần giữ khi xóa người dùng/chiến dịch); `milestone_update_attachments` theo bài cập nhật (tệp gốc vẫn còn trong kho); `milestone_revisions` theo mốc. Các bảng nghiệp vụ khác không cascade để tránh mất dữ liệu tài chính.

## TỔNG KẾT

Cơ sở dữ liệu Góp Mầm được thiết kế với:

- **22 thực thể** chia 6 nhóm: tài khoản, chiến dịch và tiến độ, giao dịch, cộng đồng, kiểm duyệt và rủi ro, AI và hệ thống
- **33 mối quan hệ có khóa ngoại** (32 quan hệ 1-N, 1 quan hệ 1-1) và 5 tham chiếu logic, bảo đảm toàn vẹn dữ liệu
- **Minh bạch giải ngân** nhờ chứng từ chi tiêu gắn với từng bài cập nhật, nhắc mốc quá hạn và lịch sử thay đổi kế hoạch công khai
- **An toàn giao dịch** nhờ idempotency key, unique constraint, CHECK constraint và nhật ký kiểm toán
- **Khả năng mở rộng** qua migration có thứ tự và có rollback, cho phép bổ sung loại thông báo, trạng thái và mô-đun AI mà không phá vỡ dữ liệu cũ
