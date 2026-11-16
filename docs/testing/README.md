# Kiểm thử

Tài liệu này mô tả các tầng kiểm thử đang có, cách chạy và những phần chưa tự động hóa.

## Tổng quan

| Tầng | Công cụ | Vị trí | Phạm vi |
| --- | --- | --- | --- |
| Unit test backend | `node --test` (biên dịch bằng `tsc`) | `backend/test/*.test.ts` | Nghiệp vụ của từng service với repository giả lập: xác thực, phân quyền, vòng đời chiến dịch, giao dịch, webhook, hoàn tiền, tiến độ, kiểm duyệt, tổ chức, quản trị, thông báo, liên hệ hỗ trợ, AI proxy |
| Unit test frontend | `node --test` | `frontend/src/features/support/faq.test.mjs` | Khớp câu hỏi của hộp hỗ trợ |
| Test AI service | `pytest` | `ai-service/tests/` | Hợp đồng API gợi ý, dự đoán, phát hiện gian lận, health, bảo mật, phương án dự phòng |
| Kiểm tra tĩnh | TypeScript, ESLint, Ruff | toàn bộ mã nguồn | Kiểu dữ liệu và quy ước mã |
| Smoke test | Docker Compose + Nginx | `infra/compose.yaml` | Sáu dịch vụ chạy cùng nhau, các trang và API chính phản hồi |
| Kiểm thử thủ công | Trình duyệt | [`TESTCASE_GOPMAM.xlsx`](../../TESTCASE_GOPMAM.xlsx) và kịch bản bên dưới | 198 test case theo 14 nhóm module: chức năng, phân quyền, bảo mật, giao diện, tích hợp, phi chức năng |

Kết quả lần chạy ngày 17/11/2026: backend 554 test, frontend 36 test, AI service 34 test, tất cả đều đạt; ESLint, TypeScript và Ruff không báo lỗi.

## Cách chạy

```powershell
.\scripts\npm-local.cmd run check          # typecheck + lint + unit test (backend và frontend)
.\scripts\npm-local.cmd run build          # build backend và frontend
.\scripts\python-ai.cmd -m pytest -q ai-service
.\scripts\python-ai.cmd -m ruff check ai-service
```

Chạy riêng từng phần:

```powershell
cd backend;  ..\scripts\npm-local.cmd run test     # chỉ unit test backend
cd frontend; ..\scripts\npm-local.cmd run test     # chỉ unit test frontend
```

Unit test backend không cần cơ sở dữ liệu: repository, cổng thanh toán, email và dịch vụ AI đều được thay bằng bản giả lập.

## Unit test backend theo module

| Nhóm | File test |
| --- | --- |
| Xác thực và phiên | `auth.service`, `step-up.service`, `password-policy`, `password-reset.service`, `email-verification.service`, `optional-jwt-auth.guard`, `non-admin.guard` |
| Người dùng | `users.service`, `user-profile-dto`, `user-serialization` |
| Chiến dịch | `campaigns.service`, `campaign-expiry.service`, `campaign-stats.service`, `campaign-contact`, `content-management`, `rich-text` |
| Tài trợ và thanh toán | `donations.service`, `donation-lifecycle`, `donation-ledger`, `sepay` |
| Tài chính | `finance.service`, `rewards.service` |
| Tiến độ và minh bạch | `progress.service`, `milestone-overdue.service`, `transparency-score`, `receipt-duplicate` |
| Tương tác | `comments.service`, `follows.service`, `notifications.service`, `notification-grouping` |
| Kiểm duyệt và quản trị | `moderation.service`, `admin.service`, `risk-alert.service`, `audit.service`, `backup.service`, `support.service` |
| Tổ chức | `organizations.service` |
| AI | `ai.service` |
| Hạ tầng | `rate-limiter.service`, `redis.module`, `database-config`, `entity-column-names`, `media.service`, `email.gateway`, `health-controller` |

## Độ phủ mã (backend)

```powershell
cd backend; ..\scripts\npm-local.cmd run test:coverage
```

Lệnh dùng bộ đo có sẵn của Node (`--experimental-test-coverage`), không cần thêm thư viện. Kết quả lần chạy ngày 14/11/2026:

| Chỉ số | Giá trị |
| --- | --- |
| Dòng lệnh | 89,10% |
| Nhánh | 79,26% |
| Hàm | 83,25% |

Cách đọc con số này: bộ đo chỉ tính những file được unit test nạp vào (90 trên 151 file trong `backend/src`), chủ yếu là service, guard, DTO và các hàm nghiệp vụ. Phần lớn controller (20 trên 22) và các file khai báo module không nằm trong phép đo vì unit test gọi thẳng service; các lớp này được kiểm tra qua smoke test và kịch bản đầu-cuối. Những file có độ phủ thấp nhất là phần chạm hạ tầng thật: `backup.service` (33%), `redis.provider` (41%), `storage.gateway` (48%).

## Smoke test trên Docker Compose

```powershell
docker compose -f infra/compose.yaml up -d --build
docker compose -f infra/compose.yaml ps        # cả 6 dịch vụ phải ở trạng thái healthy
```

Sau đó kiểm tra qua Nginx tại `http://localhost:8080`:

- `GET /api/v1/health` trả `status: ok`.
- Các trang `/`, `/du-an`, `/tim-kiem`, `/to-chuc`, `/dang-nhap` trả mã 200; đường dẫn không tồn tại trả 404.
- `GET /api/v1/admin/users` khi chưa đăng nhập trả 401.

## Kịch bản đầu-cuối (thủ công)

Dùng dữ liệu seed (`npm run seed`, mật khẩu chung `Test@123`):

1. Chủ dự án (`owner2@gopmam.com`) tạo chiến dịch qua trình hướng dẫn và gửi duyệt.
2. Quản trị viên (`admin@gopmam.com`) duyệt hồ sơ rồi kích hoạt.
3. Người ủng hộ (`user1@gopmam.com`) ủng hộ bằng ví demo, xem biên nhận.
4. Gửi webhook thanh toán có chữ ký đúng và chữ ký sai bằng `npm run sign-webhook` (backend) để kiểm tra xác minh HMAC và chống gửi lặp.
5. Chủ dự án đăng cập nhật tiến độ kèm khoản chi và chứng từ; người ủng hộ nhận thông báo.
6. Người ủng hộ yêu cầu hoàn tiền (cần mã OTP qua email); quản trị viên duyệt.
7. Quản trị viên xem cảnh báo rủi ro, nhật ký kiểm toán và xuất thống kê.

## Bộ test case thủ công

File [`TESTCASE_GOPMAM.xlsx`](../../TESTCASE_GOPMAM.xlsx) ở gốc repo gồm 198 test case chia 14 sheet theo module, sheet `ThongKe` tự tính số Pass/Fail/Blocked/Not Run và sheet `BaoCaoLoi` để ghi lỗi. Người kiểm thử điền các cột J–Q (kết quả thực tế, trạng thái, mức độ lỗi, người/ngày/môi trường kiểm thử, ghi chú).

Đợt 14–16/11/2026 trên Docker Compose local: đã chạy 171/198 test case (86,4%), 164 Pass, 5 Fail, 2 Blocked; nhóm 09 (bình luận, theo dõi, thông báo) và 10 (kiểm duyệt) chưa chạy. Ngày 17/11/2026 đã sửa cả 5 Fail và các góp ý ghi trong những test case Pass; các test case đó được ghi "(Đã fix 17/11)" ở cột Ghi chú, trạng thái giữ nguyên để người kiểm thử chạy lại:

| Test case | Nội dung sửa |
| --- | --- |
| `TC_NFR_011` | `GET /campaigns/:id` trả 404 cho hồ sơ chưa phát hành nếu người xem không phải chủ dự án/admin |
| `TC_CAMP_011` | Nút Sửa cho hồ sơ cần bổ sung/bị từ chối/bản nháp, mở lại trình tạo chiến dịch với dữ liệu cũ |
| `TC_CAMP_020` | Trang chủ hiện đủ 6 dự án nổi bật |
| `TC_DON_010` | Nút Hủy giao dịch không bị khóa khi đang mở lại trang thanh toán |
| `TC_ORG_002` | Chặn hai hồ sơ tổ chức dùng cùng ảnh giấy phép |
| `TC_DON_007` | Bắt buộc thông tin người nhận quà khi chọn quà |
| `TC_CAMP_016` | Trang Liên hệ hỗ trợ do admin cập nhật |
| `TC_CAMP_010`, `TC_PROG_004`, `TC_AUTH_001`, `TC_ORG_006`, `TC_ADMIN_009`, `TC_AUTH_013` | Lọc CSS khi dán, ô nhiều dòng, bảng quản lý không chồng nhau, nút Đăng ký, giải thích cho admin, ngày CSV theo giờ Việt Nam, ẩn được nút Google |

## Chưa tự động hóa

- Kiểm thử đầu-cuối bằng trình duyệt hiện làm thủ công theo kịch bản trên, chưa có bộ chạy tự động.
- Chưa có integration test chạy với MySQL thật; migration và truy vấn được kiểm tra qua smoke test trên Docker Compose.
- Độ phủ mới đo cho unit test backend (xem mục "Độ phủ mã"); frontend và AI service chưa đo.
- Frontend mới có unit test cho hộp hỗ trợ; các form và trang khác được kiểm tra thủ công.
