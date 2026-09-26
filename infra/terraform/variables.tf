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
