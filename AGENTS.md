# AGENTS.md - Hướng dẫn làm việc với dự án Góp Mầm

## 📌 Tổng quan dự án

**Tên:** Nền tảng gây quỹ cộng đồng cho dự án xã hội và khởi nghiệp
**Mã số:** DATN_2627
**Stack:** Next.js 16 + NestJS 12 + FastAPI + MySQL 8 + Redis 7

## 🎯 Mục tiêu hoàn thành

Xây dựng website responsive hỗ trợ toàn bộ vòng đời gây quỹ, từ khởi tạo, xét duyệt, tài trợ đến minh bạch quỹ, tích hợp AI gợi ý/dự đoán/phát hiện bất thường.

## 📂 Cấu trúc dự án

```
DATN_2627_Website/
├── frontend/          # Next.js 16, React 19, TypeScript
├── backend/           # NestJS 12, TypeScript, TypeORM
├── ai-service/        # FastAPI, scikit-learn, Python 3.12
├── infra/             # Docker Compose, Nginx
├── docs/              # Kiến trúc, API, database
└── scripts/           # Wrapper scripts (node-local, npm-local, python-ai)
```

## 🔧 Quy trình làm việc

### 1. Khởi động môi trường

```powershell
# Cài dependencies
.\scripts\npm-local.cmd install
cd ai-service && ..\scripts\python-ai.cmd -m pip install -r requirements-dev.txt

# Copy env files
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item backend/.env.example backend/.env

# Chạy migration + seed (cần MySQL chạy trước)
cd backend && ..\scripts\npm-local.cmd run migration:run
cd backend && ..\scripts\npm-local.cmd run seed

# Chạy development
.\scripts\npm-local.cmd run dev:frontend   # Terminal 1
.\scripts\npm-local.cmd run dev:backend    # Terminal 2
cd ai-service && ..\scripts\python-ai.cmd -m uvicorn app.main:app --reload  # Terminal 3
```

### 2. Kiểm tra code

```powershell
# Frontend
.\scripts\npm-local.cmd run check
.\scripts\npm-local.cmd run build

# Backend (không có script lint; dùng typecheck)
cd backend && ..\scripts\npm-local.cmd run typecheck
cd backend && ..\scripts\npm-local.cmd run test
cd backend && ..\scripts\npm-local.cmd run build

# AI Service
.\scripts\python-ai.cmd -m pytest -q ai-service
.\scripts\python-ai.cmd -m ruff check ai-service
```

### 3. Quy tắc Git

- Branch naming: `feature/TEN-FEATURE`, `fix/TEN-BUG`, `docs/TEN-DOC`
- Commit message: `type(scope): mô tả` (vd: `feat(campaigns): add campaign CRUD`)
- Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Luôn chạy `check` và `build` trước khi commit

## 📋 Coding Standards

### TypeScript (Frontend/Backend)

- Strict TypeScript, không dùng `any`
- Sử dụng ESLint config có sẵn
- Component React: functional component + hooks
- NestJS: theo模版 có sẵn (Module → Controller → Service)
- DTO validation: sử dụng `class-validator` + `class-transformer`

### Python (AI Service)

- Type hints đầy đủ
- Docstring cho public functions
- Ruff format + lint
- Pydantic schema cho request/response

### Database

- Migration có thứ tự, có rollback
- Không dùng auto-sync schema
- UUID cho primary keys
- Soft delete cho dữ liệu quan trọng
- Audit trail cho thay đổi quan trọng

## 🏗️ Kiến trúc layers

### Backend Modules (theo thứ tự triển khai)

```
1. auth          # JWT, refresh token, guards
2. users         # CRUD tài khoản, profiles
3. campaigns     # Vòng đời chiến dịch
4. donations     # Giao dịch tài trợ
5. payments      # Tích hợp cổng thanh toán
6. progress      # Tiến độ, minh bạch
7. notifications # Email, in-app
8. moderation    # Kiểm duyệt, báo cáo
9. admin         # Dashboard, thống kê
10. ai           # Gọi AI service
```

### Common Patterns

```typescript
// NestJS Module pattern
@Module({
  imports: [TypeOrmModule.forFeature([Entity])],
  controllers: [Controller],
  providers: [Service],
  exports: [Service],
})
export class FeatureModule {}

// Service pattern
@Injectable()
export class Service {
  constructor(
    @InjectRepository(Entity)
    private readonly repo: Repository<Entity>,
  ) {}
}

// Controller pattern
@Controller('feature')
@UseGuards(AuthGuard, RolesGuard)
export class Controller {
  constructor(private readonly service: Service) {}
}
```

## 📊 Tiến độ hiện tại (cập nhật 11/09/2026)

| Module | Status | Priorities |
|--------|--------|------------|
| `database` | ✅ Cơ bản | ERD, entities (users/campaigns/donations/milestones/notifications/reports/audit_logs), migration, seed |
| `auth` | ✅ Lõi | JWT, login, register, refresh, JwtAuthGuard, RolesGuard, rate limit, chống brute-force (lock 5 lần/15p) |
| `users` | ✅ Lõi | CRUD, profiles, roles, ownership check, theo dõi đăng nhập thất bại |
| `campaigns` | ✅ Lõi | CRUD, vòng đời (draft→pending→needs_info→approved/active→ended), submit, moderate, lọc/sort |
| `donations` | ✅ Cơ bản | Transactions, idempotency key, webhook cập nhật, chặn campaign hết hạn |
| `payments` | 🔶 Cơ bản | DemoWalletGateway sandbox (Ví demo) |
| `progress` | ✅ Cơ bản | Milestones, updates, progress summary sinh từ giao dịch |
| `notifications` | 🔶 Entities only | Email, in-app |
| `moderation` | 🔶 Entities only | Reports, flags |
| `admin` | ✅ Cơ bản | Dashboard tổng quan, danh sách quản trị, khóa/mở người dùng, tạo và xử lý risk alerts |
| `ai` | ✅ Cơ bản | NestJS proxy, FastAPI recommend/predict/fraud, explainability, fallback, metrics và tests |

## ✅ Checklist trước khi hoàn thành

### Mỗi Module

- [ ] Entity + Migration
- [ ] DTO (Create, Update, Response)
- [ ] Service (CRUD + business logic)
- [ ] Controller (endpoints + guards)
- [ ] Module (imports/exports)
- [ ] Unit tests (≥80% coverage)
- [ ] Integration tests
- [ ] API documentation (OpenAPI)

### Mỗi Feature Frontend

- [ ] Component (reusable)
- [ ] API integration (thay mock data)
- [ ] Loading/Error states
- [ ] Responsive design
- [ ] Accessibility

### Trước khi bảo vệ

- [ ] Tất cả modules hoạt động
- [ ] E2E test passes
- [ ] Docker Compose chạy ổn định
- [ ] Demo trực tuyến khả dụng
- [ ] Tài liệu đầy đủ
- [ ] presentation slides

## 🐛 Debug workflow

1. Kiểm tra logs: `docker compose logs -f [service]`
2. Test API: sử dụng `/docs` endpoint (Swagger)
3. Database: MySQL Workbench hoặc CLI
4. AI service: `http://localhost:8000/docs`

## 📚 Tài liệu tham khảo

- [README.md](./README.md) - Tổng quan dự án
- [docs/architecture/](./docs/architecture/) - Kiến trúc
- [docs/api/openapi.yaml](./docs/api/openapi.yaml) - API spec
- [docs/database/](./docs/database/) - Database design

## ⚠️ Lưu ý quan trọng

1. **AI chỉ hỗ trợ**, không tự động quyết định
2. **Không lưu thẻ** trong hệ thống
3. **Webhook phải verify** chữ ký
4. **Idempotency** cho giao dịch
5. **Audit log** cho thay đổi quan trọng
6. **Human-in-the-loop** cho moderation
