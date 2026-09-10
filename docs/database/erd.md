# Database Design

## ERD Overview

```mermaid
erDiagram
    users ||--o{ campaigns : creates
    users ||--o{ donations : makes
    users ||--o{ notifications : receives
    users ||--o{ reports : submits
    campaigns ||--o{ donations : receives
    campaigns ||--o{ milestones : has
    milestones ||--o{ milestone_updates : has

    users {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        enum role
        enum status
        varchar avatar
        text bio
        varchar phone
        varchar organization
        boolean email_verified
        timestamp created_at
        timestamp updated_at
    }

    campaigns {
        uuid id PK
        varchar title
        text description
        varchar category
        uuid owner_id FK
        decimal goal_amount
        decimal current_amount
        datetime start_date
        datetime end_date
        enum status
        varchar image_url
        varchar video_url
        varchar location
        int backer_count
        int view_count
        text rejection_reason
        timestamp created_at
        timestamp updated_at
    }

    donations {
        uuid id PK
        uuid user_id FK
        uuid campaign_id FK
        decimal amount
        varchar currency
        enum status
        varchar payment_method
        varchar transaction_id UK
        varchar idempotency_key UK
        text message
        boolean is_anonymous
        datetime completed_at
        timestamp created_at
        timestamp updated_at
    }

    milestones {
        uuid id PK
        uuid campaign_id FK
        varchar title
        text description
        datetime target_date
        decimal budget
        int sort_order
        boolean is_completed
        datetime completed_at
        timestamp created_at
        timestamp updated_at
    }

    milestone_updates {
        uuid id PK
        uuid milestone_id FK
        text content
        varchar image_url
        decimal expense_amount
        timestamp created_at
        timestamp updated_at
    }

    notifications {
        uuid id PK
        uuid user_id FK
        enum type
        varchar title
        text message
        boolean is_read
        varchar related_id
        timestamp created_at
        timestamp updated_at
    }

    reports {
        uuid id PK
        uuid reporter_id FK
        uuid campaign_id FK
        enum reason
        text description
        enum status
        text admin_notes
        datetime resolved_at
        timestamp created_at
        timestamp updated_at
    }

    audit_logs {
        uuid id PK
        varchar user_id
        varchar action
        varchar entity
        varchar entity_id
        json old_values
        json new_values
        varchar ip_address
        varchar user_agent
        timestamp created_at
        timestamp updated_at
    }
```

## Tables Description

### users
Lưu thông tin tài khoản người dùng. Một tài khoản có thể vừa là người tài trợ vừa là chủ dự án.

### campaigns
Quản lý vòng đời chiến dịch gây quỹ từ nháp đến kết thúc.

### donations
Ghi nhận các giao dịch tài trợ. Sử dụng `idempotency_key` để tránh ghi nhận trùng.

### milestones
Các mốc tiến độ của chiến dịch, giúp minh bạch việc sử dụng quỹ.

### milestone_updates
Cập nhật chi tiết cho từng mốc tiến độ (hình ảnh, chứng từ, chi tiêu).

### notifications
Thông báo cho người dùng về các sự kiện quan trọng.

### reports
Báo cáo vi phạm từ người dùng, được quản trị viên xử lý.

### audit_logs
Nhật ký thay đổi quan trọng trong hệ thống.

## Principles

- UUID cho primary keys
- Soft delete cho dữ liệu quan trọng (có thể bổ sung sau)
- Audit trail cho thay đổi quan trọng
- Webhook phải verify chữ ký
- Idempotency cho giao dịch
