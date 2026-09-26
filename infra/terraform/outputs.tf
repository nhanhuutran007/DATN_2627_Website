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
