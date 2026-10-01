output "alb_dns_name" {
  description = "The DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "rds_endpoint" {
  description = "The connection endpoint for the RDS database"
  value       = aws_db_instance.mysql.endpoint
}

output "ecr_frontend_url" {
  description = "The URL of the Frontend ECR Repository"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecr_backend_url" {
  description = "The URL of the Backend ECR Repository"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_ai_url" {
  description = "The URL of the AI Service ECR Repository"
  value       = aws_ecr_repository.ai_service.repository_url
}

# Dùng cho deploy.ps1 (chạy migration/seed bằng one-off ECS task)
output "ecs_cluster_name" {
  description = "Tên ECS cluster"
  value       = aws_ecs_cluster.main.name
}

output "backend_task_definition" {
  description = "Task definition của backend (family:revision)"
  value       = "${aws_ecs_task_definition.backend.family}:${aws_ecs_task_definition.backend.revision}"
}

output "public_subnet_ids" {
  description = "Subnet public cho ECS task"
  value       = [aws_subnet.public_1.id, aws_subnet.public_2.id]
}

output "ecs_tasks_security_group_id" {
  description = "Security group của ECS task"
  value       = aws_security_group.ecs_tasks_sg.id
}

output "public_url" {
  description = "URL website người dùng truy cập"
  value       = local.public_url
}

# Thêm các bản ghi này vào Cloudflare (Type CNAME, Proxy: DNS only) để ACM cấp chứng chỉ
output "acm_validation_records" {
  description = "Bản ghi DNS xác minh chứng chỉ ACM cho tên miền riêng"
  value = var.domain_name == "" ? [] : [
    for o in aws_acm_certificate.site[0].domain_validation_options : {
      domain = o.domain_name
      type   = o.resource_record_type
      name   = o.resource_record_name
      value  = o.resource_record_value
    }
  ]
}

output "acm_certificate_status" {
  description = "PENDING_VALIDATION -> ISSUED sau khi DNS có bản ghi xác minh"
  value       = var.domain_name == "" ? "" : aws_acm_certificate.site[0].status
}

output "media_bucket" {
  description = "Bucket S3 chứa ảnh người dùng tải lên"
  value       = aws_s3_bucket.media.bucket
}
