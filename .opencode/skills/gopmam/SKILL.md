---
name: gopmam
description: >-
  Dùng khi làm việc với dự án đồ án tốt nghiệp Góp Mầm (DATN_2627_Website) — nền
  tảng gây quỹ cộng đồng cho dự án xã hội và khởi nghiệp, tích hợp AI. Skill này
  chứa yêu cầu đồ án trích từ main.pdf (tác nhân, chức năng theo module, 3 mô-đun
  AI, yêu cầu phi chức năng/an toàn, kịch bản demo nghiệm thu), trạng thái tiến độ
  hiện tại của backend/frontend/AI-service và roadmap các mục tiêu cần thực hiện
  tiếp theo. Kích hoạt khi phát triển module mới, nối frontend–backend, xây tính
  năng AI, viết kiểm thử, hoặc rà soát checklist trước khi bảo vệ đồ án.
  Chỉ dùng cho công việc trong phạm vi dự án này.
---

# Góp Mầm — Skill đồ án tốt nghiệp (DATN_2627)

## 1. Tổng quan đồ án (trích từ `main.pdf`)

- **Đề tài:** Xây dựng nền tảng gây quỹ cộng đồng cho các dự án xã hội và khởi nghiệp, hỗ trợ toàn bộ vòng đời chiến dịch: tạo và xét duyệt → kêu gọi tài trợ → thanh toán → cập nhật tiến độ → tương tác cộng đồng → báo cáo.
- **Điểm nổi bật:** tích hợp AI — cá nhân hóa danh sách dự án, dự đoán khả năng thành công, phát hiện hành vi gian lận/bất thường.
- **Phạm vi:** website responsive (desktop + mobile); thanh toán mô phỏng/sandbox (không tiền thật); định danh ở mức thu thập/kiểm tra hồ sơ minh chứng; **AI chỉ hỗ trợ quyết định, luôn có con người trong vòng kiểm soát (human-in-the-loop)**.

### 4 tác nhân
| Actor | Quyền/nhu cầu |
|-------|--------------|
| Khách truy cập | Xem d/s + chi tiết, tìm kiếm/lọc, xem số liệu, đăng ký. Không được tài trợ/bình luận/tạo dự án khi chưa đăng nhập. |
| Người tài trợ | Hồ sơ + sở thích, gợi ý cá nhân hóa, tài trợ 1 lần/theo mức, theo dõi, thông báo, lịch sử giao dịch + biên nhận + tiến độ quỹ, bình luận/báo cáo/khiếu nại. |
| Chủ dự án | Tạo/sửa chiến dịch, khai mục tiêu–thời hạn–câu chuyện–kế hoạch quỹ–mốc, minh chứng, gửi xét duyệt, dashboard số liệu, phản hồi cộng đồng, cập nhật + báo cáo. 1 tài khoản có thể vừa tài trợ vừa làm chủ dự án. |
| Quản trị viên | Xét duyệt hồ sơ người dùng + chiến dịch, cấu hình danh mục, giám sát giao dịch, xử lý vi phạm/báo cáo/hoàn tiền, xem cảnh báo AI, khóa tài khoản, báo cáo tổng hợp, audit log. |
| Tác nhân ngoài | Cổng thanh toán, email/thông báo, lưu trữ tệp (đóng gói qua interface dịch vụ). |

## 2. Yêu cầu chức năng (mục 3 của đề cương) — bảng đối chiếu tiến độ

Mỗi hàng dưới đây là một phần mục tiêu bắt buộc; cột **Repo** ghi trạng thái triển khai thực tế.

### 3.1 Quản lý tài khoản và phân quyền
| Yêu cầu (main.pdf) | Repo |
|--------------------|------|
| Đăng ký email, xác minh, đăng nhập, đăng xuất, đặt lại mật khẩu | 🔶 login/register có; **xác minh email + đặt lại mật khẩu chưa có** |
| Phân quyền vai trò + quyền cụ thể | ✅ RolesGuard (admin/owner/donor) |
| Xác thực lại/xác thực 2 bước cho thao tác nhạy cảm | ❌ chưa |
| Hồ sơ chủ dự án: thông tin, giấy tờ minh chứng, trạng thái xét duyệt | 🔶 users CRUD + profile; **hồ sơ KYC/minh chứng chưa** |
| Mật khẩu băm, audit login/access/nhật ký quản trị | ✅ bcrypt hash, entity audit_logs (sẵn sàng) |

### 3.2 Quản lý chiến dịch gây quỹ
| Yêu cầu | Repo |
|---------|------|
| Tạo theo từng bước (cơ bản, danh mục, ảnh/video, câu chuyện, mục tiêu, thời gian, kế hoạch, dự toán, rủi ro, mức tài trợ) | 🔶 wizard đầy đủ bước; **upload ảnh/video, mức tài trợ (tiers) chưa** |
| Trạng thái: nháp, chờ duyệt, **cần bổ sung**, đã duyệt, đang gây quỹ, thành công, không đạt, tạm dừng, kết thúc | ✅ draft/pending/needs_info/approved/rejected/active/ended (2026-09-11); **thiếu paused/success/failed UI** |
| Kiểm tra dữ liệu bắt buộc → gửi quản trị viên | ✅ create + submit, tự động PENDING |
| Duyệt/từ chối kèm lý do/yêu cầu chỉnh sửa | ✅ moderate (approved/active/rejected/needs_info + reason bắt buộc cho rejected/needs_info) |
| Sau phát hành: thay đổi mục tiêu/thời hạn bị hạn chế hoặc xét duyệt lại | ❌ chưa |
| Dashboard chủ dự án: tổng tiền, tỷ lệ, số người ủng hộ, lượt xem, chuyển đổi, diễn biến theo thời gian | ✅ `/dashboard` nối `fetchMyCampaigns` + tổng hợp stats (2026-09-11); fallback mock khi API lỗi |

### 3.3 Khám phá, tìm kiếm, tương tác
| Yêu cầu | Repo |
|---------|------|
| Trang chủ: nổi bật, sắp kết thúc, mới phát hành, cá nhân hóa | 🔶 home nối API thật (nổi bật/sắp kết thúc/mới, 2026-09-11) + fallback mock; **cá nhân hóa AI chưa** |
| Tìm kiếm toàn văn + lọc danh mục/địa điểm/khoảng vốn/tỷ lệ hoàn thành/thời gian/trạng thái + sắp xếp | 🔶 API hỗ trợ q/category/status/sort/offset/limit; **lọc client-side ở FE; thiếu sort "phổ biến" theo dữ liệu** |
| Chi tiết: story, chủ dự án, số liệu, mốc, minh chứng, cập nhật, bình luận, dự án liên quan | 🔶 detail nối API (số liệu từ API, story mock, mốc từ API); **minh chứng/bình luận chưa** |
| Theo dõi, chia sẻ, bình luận, đặt câu hỏi, thông báo (yêu cầu đăng nhập) | ❌ chưa |
| Báo cáo vi phạm + kiểm duyệt nội dung UGC | ❌ chưa |
| Ghi sự kiện hành vi (xem/nhấp/theo dõi/tìm kiếm/tài trợ) phục vụ gợi ý | ❌ chưa; cần cơ chế đồng ý dữ liệu |

### 3.4 Tài trợ và quản lý giao dịch
| Yêu cầu | Repo |
|---------|------|
| Chọn tiền/mức/phương thức → tạo đơn → chuyển cổng thanh toán → chỉ cập nhật sau khi xác minh chữ ký/webhook | 🔶 tạo đơn + ví demo (`DemoWalletGateway`) + `POST /webhook` cập nhật (2026-09-11); **signature để demo trả true, mức tài trợ (tiers) chưa** |
| Xử lý: thành công, thất bại, hết hạn, hủy, thanh toán lặp, hoàn tiền; idempotency bằng mã giao dịch duy nhất | 🔶 completed/failed qua webhook + idempotency key (duplicate trả đơn cũ); **expired/cancel/refund chưa** |
| Biên nhận + lịch sử; chủ dự án không thấy thông tin thanh toán nhạy cảm · **không lưu thẻ** | 🔶 `GET /donations/mine` (lịch sử); **biên nhận xuất file chưa** |
| Admin: đối soát, lọc trạng thái, xuất báo cáo, giao dịch bị cảnh báo | ❌ chưa |

### 3.5 Theo dõi tiến độ và minh bạch quỹ
| Yêu cầu | Repo |
|---------|------|
| Kế hoạch mốc: mốc, thời hạn, ngân sách, đầu ra | ✅ ProgressModule: CRUD mốc, hoàn thành mốc, cập nhật bài viết (2026-09-11), hiển thị trong detail |
| Cập nhật tỷ lệ hoàn thành, bài viết, ảnh, chứng từ/báo cáo chi tiêu | 🔶 mốc + bài viết có; **ảnh/chứng từ chưa** |
| Timeline cho tài trợ + thông báo khi đạt mốc/thay đổi lịch/báo cáo mới | ❌ chưa |
| Chậm tiến độ → nhắc giải trình + hiển thị trạng thái minh bạch | ❌ chưa |
| Số liệu quan trọng **sinh từ giao dịch**, không nhập tay; mọi thay đổi có time/user/version | 🔶 progress summary tính từ giao dịch (raised/backers/percent) (2026-09-11); **audit/versioned mốc chưa** |

### 3.6 Quản trị và báo cáo
| Yêu cầu | Repo |
|---------|------|
| Tổng hợp: tài khoản, chiến dịch, số tiền, tỷ lệ thành công, giao dịch lỗi, khiếu nại, cảnh báo rủi ro | ❌ admin mock |
| Quản lý danh mục, nội dung trang, chiến dịch nổi bật, mẫu thông báo | ❌ chưa |
| Xem chi tiết hồ sơ, ghi chú xét duyệt, xử lý báo cáo, tạm dừng chiến dịch/tài khoản | ❌ chưa |
| Xuất thống kê theo thời gian/danh mục, che dữ liệu cá nhân | ❌ chưa |

## 3. Mô-đun trí tuệ nhân tạo (mục 4) — trạng thái repo

| Mô-đun | Yêu cầu cốt lõi | Repo (`ai-service/`) |
|--------|-----------------|-----------------------|
| 4.1 Gợi ý dự án | Xếp hạng theo sở thích/lịch sử xem–theo dõi–tài trợ; fallback danh sách phổ biến khi AI gián đoạn; trả lý do ngắn; đánh giá Precision@K/Recall@K/NDCG@K | 🔶 `services/recommender.py`, `app/api/v1/routes/recommend.py`, schema + test có; **chưa gắn với dữ liệu hành vi thật, chưa có trường feature/embedding từ BE** |
| 4.2 Dự đoán thành công | Phân loại/xác suất đạt mục tiêu từ danh mục, mục tiêu vốn, thời lượng, độ hoàn thiện hồ sơ, chất lượng nội dung, ảnh, lịch sử chủ dự án, tương tác đầu; so sánh Logistic Regression vs Random Forest/Gradient Boosting; hiển thị yếu tố ảnh hưởng; ROC-AUC/F1/precision/recall; chia dữ liệu theo thời gian chống rò rỉ | 🔶 `predictor.py`, route `predict.py`, schema, test, `training/train.py` + `model_registry.py` có; **model demo, chưa huấn luyện thật, chưa trả đặc trưng ảnh hưởng đầy đủ ra FE** |
| 4.3 Phát hiện gian lận | Tầng luật (đa giao dịch ngắn hạn, chung thiết bị, biến động hồ sơ, tài trợ đột biến, thất bại cao) + tầng ML (Isolation Forest khi thiếu nhãn); cảnh báo: điểm rủi ro + nhóm nguyên nhân + dữ liệu liên quan + trạng thái xử lý; admin xác nhận/bác bỏ → dữ liệu cải thiện; human-in-the-loop, không công khai cáo buộc | 🔶 `fraud_detector.py`, route `fraud.py`, schema, test có; **chưa kết nối dữ liệu giao dịch thật, chưa có vòng phản hồi admin→retrain** |

Nguyên tắc AI bắt buộc: **AI không tự động quyết định** · kết quả có giải thích · mọi chiến dịch/giao dịch bị đánh dấu do admin xử lý · không dùng một con số AI làm căn cứ duy nhất từ chối.

## 4. Kiến trúc & công nghệ

- **Stack đang triển khai:** Next.js 16 (frontend) + **NestJS 12** (backend) + FastAPI/scikit-learn (AI) + MySQL 8 + Redis 7 + Nginx + Docker Compose.
- **Lệch chuẩn quan trọng (cần trình bày khi bảo vệ):** đề cương ghi backend Spring Boot; repo chọn **NestJS** theo `docs/architecture/adr-001-backend-stack.md` (dùng chung TypeScript với FE, giữ ranh giới nghiệp vụ). `main.pdf` chưa cập nhật — nếu nhà trường bắt buộc Spring Boot, phải thay backend trước khi phát triển các vertical slice.
- **Luồng:** Next.js → REST `/api/v1` → NestJS → gọi AI service (FastAPI `/api/v1`) khi cần chấm điểm; tác vụ nặng tách khỏi luồng yêu cầu (Redis làm cache/hàng đợi); AI chỉ nhận dữ liệu đã chuẩn hóa/ẩn danh.
- **Infra (`infra/compose.yaml`):** nginx (80/8080) → frontend:3000, backend:4000, ai-service:8000, mysql:3306, redis:6379; healthcheck mỗi service; AI model gắn qua volume `models/` (tắt load nếu `AI_LOAD_MODEL=false`).
- **Docs tham chiếu:** `docs/architecture/project-structure.md`, `docs/database/erd.md`, `docs/api/openapi.yaml` (nếu có), `docs/testing/README.md`.

## 5. Yêu cầu phi chức năng & an toàn (mục 6) — checklist trạng thái

| Yêu cầu | Trạng thái |
|---------|-----------|
| Hiệu năng: API phân trang d/s lớn, cache dữ liệu ít đổi, stateless để mở rộng ngang | 🔶 phân trang có; cache Redis chưa dùng |
| Bảo mật: quyền tối thiểu, validate đầu vào, chống XSS/CSRF/SQLi, rate limit, secret ngoài mã nguồn, HTTPS, audit log | 🔶 validate bằng class-validator, secret ngoài code (.env), guards, **rate limit (register 3/min, login 5/min, refresh 10/min, webhook 30/min) + chống brute-force login (lock 5 lần/15p)** (2026-09-11); **CSRF/HTTPS chưa** |
| Tin cậy: webhook verify chữ ký + idempotent, retry tác vụ nền, backup MySQL, phục hồi | 🔶 webhook idempotent (idempotency key) + chặn campaign hết hạn; **signature demo trả true, retry/backup chưa** |
| Riêng tư/đạo đức AI: dữ liệu tối thiểu, công bố mục đích, xóa/ẩn dữ liệu, hạn chế đặc trưng nhạy cảm, giải thích + giám sát độ lệch + can thiệp người | 🔶 nguyên tắc trong hồ sơ; cơ chế consent/xóa dữ liệu chưa |
| Khả dụng/bảo trì: responsive, lỗi dễ hiểu, module rõ, tài liệu API, migration, kiểm thử tự động | ✅ responsive, Swagger `/docs`; migration có; test có |

## 6. Tiến độ hiện tại (cập nhật lần cuối: 2026-09-11)

Legend: ✅ xong cơ bản · 🔶 một phần/mock · ❌ chưa.

### Backend (`backend/`, NestJS + TypeORM) — typecheck ✓ · **68 test pass** ✓ · build ✓
- ✅ `database`: entities (users, campaigns, milestones, milestone_updates, donations, notifications, reports, audit_logs) + migration + seed.
- ✅ `auth` (**hoàn thiện 2026-09-11**): JWT access 15m/refresh 7d, login/register/refresh, JwtAuthGuard + RolesGuard, **rate limit** (register 3/min, login 5/min, refresh 10/min), **chống brute-force login** (lock 5 sai/15 min, reset khi đăng nhập thành công; chặn banned cả ở login và refresh).
- ✅ `users`: CRUD, profile, roles, ownership check, theo dõi `failedLoginCount`/`lockedUntil`.
- ✅ `campaigns` (**hoàn thiện 2026-09-11**): CRUD + `POST /:id/submit` + `PATCH /:id/moderate` (admin, reason bắt buộc khi rejected/needs_info), vòng đời đầy đủ `draft → pending → needs_info → approved/active → ended` (+ rejected), lọc `q/category/status/sort(popular|ending|newest|progress|latest)/offset/limit`, relations owner+milestones, migration thêm enum `needs_info`/`ended`, test service.
- ✅ `donations` (**2026-09-11**): tạo đơn tài trợ (idempotency key), `POST /webhook` cập nhật completed/failed (rate limit 30/min), `GET /mine`, **chặn tài trợ campaign hết hạn `endDate`**, test service.
- ✅ `payments` (**2026-09-11**): `DemoWalletGateway` (Ví demo sandbox) qua interface `PaymentGateway` (createTransaction + verifyWebhookSignature — demo trả true).
- ✅ `progress` (**2026-09-11**): milestones + updates (CRUD mốc, hoàn thành mốc, thêm bài viết, chỉnh sửa bị khóa khi campaign kết thúc), progress summary **sinh từ giao dịch**, test service.
- ✅ `health`.
- 🔶 `notifications`/`moderation`: entity only. ❌ `admin`, `ai`(backend caller): chưa.

### Frontend (`frontend/`, Next.js 16 + React 19) — typecheck ✓ · lint ✓ · build ✓
- ✅ Đăng nhập/đăng ký nối API thật (`/dang-nhap`, `/dang-ky`) — tích hợp token/refresh qua `src/lib/api.ts`, hooks `src/lib/auth.ts`.
- ✅ `/du-an` (khám phá): fetch API (`src/lib/api/campaigns.ts`) + fallback mock.
- ✅ `/du-an/[slug]`: fetch API + fallback, `force-dynamic`.
- ✅ `/tao-chien-dich`: wizard đa bước → `createCampaign` + `submitCampaign`, yêu cầu đăng nhập (`?next=`), lưu nháp thật.
- ✅ Trang chủ `/` (**2026-09-11**): nối `fetchCampaigns({sort})` — nổi bật / **sắp kết thúc** / mới phát hành; `force-dynamic` + fallback mock khi API lỗi.
- ✅ `/dashboard` (**2026-09-11**): `OwnerDashboard` client component, login gate (`?next=`), fetch `fetchMyCampaigns` → thống kê tổng tiền/người ủng hộ/lượt xem/chiến dịch đang chạy + danh sách chiến dịch + status pill; fallback mock kèm badge "Dữ liệu mẫu".
- ✅ Mapper campaign `src/lib/api/campaigns.ts`: hỗ trợ status `needs_info`→"Cần bổ sung", `ended`→"Kết thúc".
- ✅ Header auth-aware (tên user + logout).
- 🔶 `/admin`: vẫn **mock** (chưa nối API).

### AI service (`ai-service/`, FastAPI + scikit-learn) — pytest ✓ 10 test pass
- ✅ Khung 4 route `/api/v1`: `health`, `recommend`, `predict`, `fraud`; schemas Pydantic; registry model (`model_registry.py`), catalog, training script, tests.
- 🔶 Chưa huấn luyện dữ liệu thật; chưa kết nối dữ liệu từ backend (campaign/donation) khiến output vẫn demo/mock-rule.

### Hạ tầng
- ✅ `infra/compose.yaml` đầy đủ 6 service + healthcheck; ✅ wrapper scripts (`npm-local.cmd`, `python-ai.cmd`).
- ⚠️ Môi trường dev hiện tại (máy này) **không có MySQL/Docker** → không chạy được E2E thật; chỉ verify typecheck/test/build.

## 7. Mục tiêu tiếp theo (roadmap ưu tiên)

### Phase A — hoàn thành vòng đời nghiệp vụ lõi (✅ xong 2026-09-11)
1. ✅ Donations + Payments sandbox: tạo đơn tài trợ, idempotency key, ví demo sandbox, webhook cập nhật (completed/failed), chặn campaign hết hạn.
2. ✅ Progress module: API milestones + updates, ràng buộc khi campaign kết thúc, "số liệu sinh từ giao dịch".
3. ✅ Dashboard chủ dự án thật + trang chủ nối `fetchCampaigns({sort})` — bỏ mock.
4. ✅ Bảo mật: rate limit các endpoint nhạy cảm, chống brute-force login (lock 5 lần/15p); hoàn thiện trạng thái campaign (`needs_info`, `ended`).

### Sau đó (Phase B — AI kết nối dữ liệu thật)
5. Backend module `ai`: gọi AI service (recommend/predict/fraud) với dữ liệu chuẩn hóa + fallback khi AI gián đoạn; ghi sự kiện hành vi (xem/theo dõi/tài trợ).
6. AI: feature pipeline từ bảng thật → huấn luyện model (baseline Logistic Regression so với RF/GB), lưu version + metrics; fraud cập nhật 2 tầng (rule + Isolation Forest) và vòng phản hồi admin → retrain.
7. Trang gợi ý cá nhân hóa + "lý do gợi ý" trên FE từ AI.

### Trước bảo vệ (Phase C — nghiệm thu & demo)
8. Admin dashboard thật (thống kê tổng hợp, xét duyệt, giao dịch cảnh báo, export báo cáo ẩn trường nhạy cảm).
9. Kịch bản demo E2E đầy đủ (mục 9); cài Docker Compose + VPS/tên miền + HTTPS.
10. Kiểm thử: unit ≥80% mỗi module, integration test thanh toán/webhook/gọi AI; đánh giá mô hình (ROC-AUC, confusion matrix, case dự đoán sai).
11. Bổ sung docs: OpenAPI, hướng dẫn cài đặt, hướng dẫn sử dụng, video trình diễn; slides bảo vệ (ghi rõ lệch chuẩn NestJS vs Spring Boot).

## 8. Quy trình làm việc & lệnh kiểm tra bắt buộc

```powershell
# Cài & env (one-time)
.\scripts\npm-local.cmd install
cd ai-service && ..\scripts\python-ai.cmd -m pip install -r requirements-dev.txt
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item backend/.env.example backend/.env
# MySQL chạy trước khi migration
cd backend && ..\scripts\npm-local.cmd run migration:run
cd backend && ..\scripts\npm-local.cmd run seed

# Dev (3 terminal)
.\scripts\npm-local.cmd run dev:frontend
.\scripts\npm-local.cmd run dev:backend
cd ai-service && ..\scripts\python-ai.cmd -m uvicorn app.main:app --reload

# Kiểm tra TRƯỚC mỗi commit
.\scripts\npm-local.cmd run typecheck --workspace frontend
.\scripts\npm-local.cmd run lint --workspace frontend
.\scripts\npm-local.cmd run build --workspace frontend
cd backend && ..\scripts\npm-local.cmd run lint
cd backend && ..\scripts\npm-local.cmd run test        # node --test -> .test-dist
cd backend && ..\scripts\npm-local.cmd run build
.\scripts\python-ai.cmd -m pytest -q ai-service
.\scripts\python-ai.cmd -m ruff check ai-service

# Docker (môi trường có Docker)
docker compose -f infra/compose.yaml up --build
docker compose logs -f [service]
```

## 9. Kịch bản demo nghiệm thu (theo mục 7 đề cương)

1. Đăng ký chủ dự án → 2. Nộp hồ sơ (wizard) → 3. Xét duyệt (admin, có lý do) → 4. Phát hành → 5. Nhận tài trợ (sandbox + webhook) → 6. Cập nhật tiến độ + báo cáo → 7. Xem gợi ý/dự đoán/cảnh báo AI (có giải thích) → 8. Báo cáo tổng hợp admin.
Luôn chuẩn bị: dữ liệu thử làm sạch/ẩn danh, ma trận nhầm lẫn, các case mô hình dự đoán chưa tốt, số liệu hiệu năng, kịch bản webhook sai chữ ký.

## 10. Nguyên tắc bất biến (chống trượt checklist bảo vệ)

1. **AI hỗ trợ, không tự quyết định** — human-in-the-loop cho xét duyệt + cảnh báo.
2. **Không lưu thẻ** ngân hàng trong hệ thống.
3. **Webhook phải verify chữ ký + idempotent** (mã giao dịch duy nhất).
4. **Số liệu quỹ sinh từ giao dịch**, không nhập tay; thay đổi quan trọng phải audit log + versioned.
5. **DTO validate** bằng class-validator (backend) / Pydantic (AI); không dùng `any`.
6. Mỗi module phải: entity+migration, DTO, service, controller+guards, module, test ≥80%, tài liệu OpenAPI.
7. Commit theo `type(scope): mô tả`; branch `feature/…`, `fix/…`, `docs/…; luôn chạy check+build trước commit.
8. `main.pdf` là bản đề cương gốc (Spring Boot). Mọi lệch chuẩn kỹ thuật phải được ghi lại rõ ràng khi báo cáo.