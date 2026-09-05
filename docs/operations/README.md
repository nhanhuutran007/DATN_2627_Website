# Operations

`infra/compose.yaml` cung cấp môi trường tích hợp local/staging cơ bản. Trước khi đưa lên máy chủ cần bổ sung HTTPS, secret store, backup/restore, giám sát log và chính sách lưu tệp.

XAMPP có thể được dùng riêng cho MariaDB trong lúc phát triển local. Khi đó không chạy container MySQL và phải cấu hình `DATABASE_URL` của backend trỏ đến MariaDB trên máy host. Staging chính thức nên dùng đúng database engine và phiên bản dự kiến cho production.
