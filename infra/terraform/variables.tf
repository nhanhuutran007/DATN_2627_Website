variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "ap-southeast-1" # Singapore
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "gopmam"
}

variable "image_tag" {
  description = "Tag Docker image trên ECR mà các ECS service chạy"
  type        = string
  default     = "latest"
}

# Secret không có giá trị mặc định: khai báo trong terraform.tfvars (đã .gitignore),
# xem terraform.tfvars.example.
variable "db_password" {
  description = "Password for the RDS MySQL database (RDS không nhận ký tự / @ \" và khoảng trắng)"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 12 && can(regex("^[^/@\" ]+$", var.db_password))
    error_message = "db_password cần ít nhất 12 ký tự và không chứa / @ \" hoặc khoảng trắng."
  }
}

variable "jwt_access_secret" {
  description = "JWT Access Secret for Backend"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.jwt_access_secret) >= 32
    error_message = "jwt_access_secret cần ít nhất 32 ký tự."
  }
}

variable "jwt_refresh_secret" {
  description = "JWT Refresh Secret for Backend"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.jwt_refresh_secret) >= 32
    error_message = "jwt_refresh_secret cần ít nhất 32 ký tự."
  }
}

variable "payment_webhook_secret" {
  description = "HMAC secret dùng để verify webhook thanh toán (X-Signature)"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.payment_webhook_secret) >= 32
    error_message = "payment_webhook_secret cần ít nhất 32 ký tự."
  }
}

variable "ai_api_key" {
  description = "Khóa nội bộ backend gửi sang AI service qua header X-AI-Key"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.ai_api_key) >= 32
    error_message = "ai_api_key cần ít nhất 32 ký tự."
  }
}

# --- Tên miền riêng + HTTPS (xem README.md, mục "Dùng tên miền riêng") ---
variable "domain_name" {
  description = "Tên miền gốc trỏ về ALB (vd. gopmam.com). Để trống thì chỉ dùng DNS tự động của ALB."
  type        = string
  default     = ""
}

variable "enable_https" {
  description = "Bật listener HTTPS 443 + chuyển HTTP sang HTTPS. Chỉ bật SAU KHI đã thêm bản ghi xác minh ACM vào DNS."
  type        = bool
  default     = false
}

variable "trust_proxy_hops" {
  description = "Số proxy phía trước backend: 1 = chỉ ALB, 2 = Cloudflare (proxy bật) + ALB"
  type        = number
  default     = 1
}

# --- Gửi email qua SMTP (để trống smtp_host thì email chỉ ghi vào log) ---
variable "smtp_host" {
  description = "SMTP server, vd. smtp.resend.com"
  type        = string
  default     = ""
}

variable "smtp_port" {
  description = "Cổng SMTP (465 = TLS ngay từ đầu, 587 = STARTTLS)"
  type        = number
  default     = 465
}

variable "smtp_secure" {
  description = "\"true\" khi dùng cổng 465"
  type        = string
  default     = "true"
}

variable "smtp_user" {
  description = "Tài khoản SMTP"
  type        = string
  default     = ""
}

variable "smtp_pass" {
  description = "Mật khẩu/API key SMTP"
  type        = string
  default     = ""
  sensitive   = true
}

variable "mail_from" {
  description = "Người gửi, vd. \"Góp Mầm <no-reply@gopmam.com>\""
  type        = string
  default     = ""
}
