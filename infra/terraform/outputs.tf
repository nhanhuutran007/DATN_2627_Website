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
