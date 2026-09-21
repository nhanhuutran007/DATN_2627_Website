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

variable "db_password" {
  description = "Password for the RDS MySQL database"
  type        = string
  sensitive   = true
  default     = "gopmam_db_password_123!" # Thay đổi khi apply thực tế
}

variable "jwt_access_secret" {
  description = "JWT Access Secret for Backend"
  type        = string
  sensitive   = true
  default     = "prod-access-secret-change-me"
}

variable "jwt_refresh_secret" {
  description = "JWT Refresh Secret for Backend"
  type        = string
  sensitive   = true
  default     = "prod-refresh-secret-change-me"
}

variable "payment_webhook_secret" {
  description = "HMAC secret dùng để verify webhook thanh toán (X-Signature)"
  type        = string
  sensitive   = true
  default     = "prod-webhook-secret-change-me"
}
