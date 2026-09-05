# Cấu trúc dự án

Repository dùng mô hình monorepo, nhưng mỗi dịch vụ vẫn có vòng đời và ranh giới riêng.

```text
.
├── frontend/                 Next.js, React và TypeScript
│   ├── public/               Tệp tĩnh công khai
│   └── src/
│       ├── app/              App Router, layout và page
│       ├── components/       Thành phần giao diện dùng lại
│       ├── features/         Mã giao diện theo nghiệp vụ
│       ├── hooks/            React hooks dùng chung
│       ├── lib/              API client, cấu hình và tiện ích
│       └── types/            Kiểu dữ liệu phía frontend
├── backend/                  NestJS business API
│   ├── database/             Migration và tài liệu persistence
│   ├── src/
│   │   ├── common/           Guard, filter, interceptor, decorator dùng chung
│   │   ├── config/           Đọc và kiểm tra biến môi trường
│   │   ├── integrations/     AI, thanh toán, email và lưu trữ tệp
│   │   └── modules/          Module nghiệp vụ độc lập
│   └── test/                 Kiểm thử tích hợp/e2e
├── ai-service/               FastAPI inference và huấn luyện ngoại tuyến
│   ├── app/                  API, cấu hình, schema và model registry
│   ├── data/                 Dữ liệu raw/processed không đưa vào Git
│   ├── models/               Model .pkl/.joblib không nạp từ nguồn lạ
│   ├── artifacts/            Metrics, metadata và báo cáo đánh giá
│   ├── training/             Pipeline huấn luyện tái lập được
│   └── tests/                Kiểm thử hợp đồng AI
├── infra/                    Docker Compose và Nginx
└── docs/                     Kiến trúc, API, dữ liệu, vận hành và kiểm thử
```

## Ranh giới trách nhiệm

- `frontend` chỉ hiển thị và thu thập dữ liệu; không quyết định quyền hay số tiền đã gây quỹ.
- `backend` là nguồn quyết định cho tài khoản, phân quyền, vòng đời chiến dịch, giao dịch, audit và tích hợp.
- `ai-service` chỉ nhận feature đã chuẩn hóa; không được truy cập tùy ý toàn bộ cơ sở dữ liệu nghiệp vụ.
- MySQL là nguồn dữ liệu bền vững. Redis chỉ dùng cho cache, rate limit hoặc tác vụ ngắn.

## Module dự kiến

Các module `auth`, `users`, `campaigns`, `donations`, `payments`, `progress`, `notifications`, `moderation`, `admin` và `ai` mới chỉ là vị trí dành sẵn. Mỗi module chỉ được triển khai khi đã có acceptance criteria, migration, DTO, phân quyền và kiểm thử tương ứng.
