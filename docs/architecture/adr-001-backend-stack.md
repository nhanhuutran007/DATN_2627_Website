# ADR-001: Chọn backend Node.js với NestJS

- Trạng thái: accepted for scaffold
- Ngày: 2026-09-05

## Bối cảnh

Tài liệu đề tài ban đầu mô tả backend Spring Boot. Sau khi cân nhắc khối lượng đồ án và việc frontend đã dùng TypeScript, scaffold hiện tại chọn NestJS để frontend và backend dùng chung hệ sinh thái Node.js/TypeScript. Python/FastAPI vẫn là dịch vụ riêng cho AI.

## Quyết định

- Frontend: Next.js + React + TypeScript.
- Business API: NestJS + TypeScript.
- AI service: FastAPI + Python.
- Cơ sở dữ liệu: MySQL; công cụ migration/ORM sẽ được chốt sau khi hoàn thành thiết kế schema.
- Các dịch vụ giao tiếp bằng REST có version.

## Hệ quả

- Giảm số ngôn ngữ phải dùng cho phần web.
- Vẫn giữ ranh giới nghiệp vụ, phân quyền và giao dịch ở backend.
- `main.pdf` là bản mô tả đề tài gốc và chưa được sửa theo quyết định kỹ thuật này.
- Nếu nhà trường bắt buộc Spring Boot, cần thay scaffold `backend/` trước khi phát triển các vertical slice.
