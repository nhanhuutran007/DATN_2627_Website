resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
}

locals {
  service_domain = "${var.project_name}.local"
  alb_url        = "http://${aws_lb.main.dns_name}"

  # Cloud Map: các task gọi nhau bằng DNS nội bộ, không vòng ra ALB/Internet
  redis_url       = "redis://redis.${local.service_domain}:6379"
  ai_service_url  = "http://ai.${local.service_domain}:8000" # gốc service; ai.gateway.ts tự nối "/api/v1/..."
  backend_api_url = "http://backend.${local.service_domain}:4000/api/v1"

  backend_environment = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = "4000" },
    { name = "CORS_ORIGINS", value = local.alb_url },
    # ALB là 1 hop proxy phía trước backend (IP thật của client cho rate limit/audit)
    { name = "TRUST_PROXY_HOPS", value = "1" },
    # Backend đọc DB_* (backend/src/config/database.config.ts), không đọc DATABASE_URL
    { name = "DB_HOST", value = aws_db_instance.mysql.address },
    { name = "DB_PORT", value = tostring(aws_db_instance.mysql.port) },
    { name = "DB_USERNAME", value = aws_db_instance.mysql.username },
    { name = "DB_PASSWORD", value = var.db_password },
    { name = "DB_DATABASE", value = aws_db_instance.mysql.db_name },
    # RDS MySQL 8.4 bắt buộc TLS; CA bundle được đóng sẵn trong image backend
    { name = "DB_SSL", value = "true" },
    { name = "DB_SSL_CA_PATH", value = "/app/certs/rds-global-bundle.pem" },
    { name = "REDIS_URL", value = local.redis_url },
    { name = "AI_SERVICE_URL", value = local.ai_service_url },
    { name = "AI_API_KEY", value = var.ai_api_key },
    { name = "JWT_ACCESS_SECRET", value = var.jwt_access_secret },
    { name = "JWT_REFRESH_SECRET", value = var.jwt_refresh_secret },
    { name = "PAYMENT_WEBHOOK_SECRET", value = var.payment_webhook_secret },
    # Chỉ dùng khi chạy migration/seed bằng ts-node (one-off task), bỏ bước typecheck cho nhanh
    { name = "TS_NODE_TRANSPILE_ONLY", value = "true" },
  ]
}

# --- IAM Roles for ECS ---
data "aws_iam_policy_document" "ecs_task_execution_role_assume_policy" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_task_execution_role" {
  name               = "${var.project_name}-ecs-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_execution_role_assume_policy.json
}

# Gồm quyền pull ECR và ghi CloudWatch Logs
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# --- CloudWatch Logs ---
resource "aws_cloudwatch_log_group" "service" {
  for_each          = toset(["redis", "ai-service", "backend", "frontend"])
  name              = "/ecs/${var.project_name}/${each.key}"
  retention_in_days = 7
}

# --- Service discovery (Cloud Map, DNS private trong VPC) ---
resource "aws_service_discovery_private_dns_namespace" "internal" {
  name = local.service_domain
  vpc  = aws_vpc.main.id
}

resource "aws_service_discovery_service" "internal" {
  for_each = toset(["redis", "ai", "backend"])
  name     = each.key

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.internal.id
    routing_policy = "MULTIVALUE"

    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }
}

# --- Redis Task (Fargate) ---
resource "aws_ecs_task_definition" "redis" {
  family                   = "${var.project_name}-redis"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([{
    name      = "redis"
    image     = "redis:7-alpine"
    command   = ["redis-server", "--appendonly", "yes"]
    essential = true
    portMappings = [{
      containerPort = 6379
      hostPort      = 6379
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.service["redis"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "redis"
      }
    }
  }])
}

resource "aws_ecs_service" "redis" {
  name            = "${var.project_name}-redis-svc"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.redis.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = true # Quan trọng để pull image mà không cần NAT Gateway
  }

  service_registries {
    registry_arn = aws_service_discovery_service.internal["redis"].arn
  }
}

# --- AI Service Task (chỉ nội bộ, backend gọi qua Cloud Map + X-AI-Key) ---
resource "aws_ecs_task_definition" "ai_service" {
  family                   = "${var.project_name}-ai-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024 # AI cần nhiều RAM
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([{
    name      = "ai-service"
    image     = "${aws_ecr_repository.ai_service.repository_url}:${var.image_tag}"
    essential = true
    environment = [
      { name = "APP_ENV", value = "production" },
      { name = "AI_LOAD_MODEL", value = "true" },
      { name = "AI_API_KEY", value = var.ai_api_key },
    ]
    portMappings = [{
      containerPort = 8000
      hostPort      = 8000
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.service["ai-service"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "ai-service"
      }
    }
  }])
}

resource "aws_ecs_service" "ai_service" {
  name            = "${var.project_name}-ai-svc"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.ai_service.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = true
  }

  service_registries {
    registry_arn = aws_service_discovery_service.internal["ai"].arn
  }
}

# --- Backend Task ---
resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project_name}-backend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([{
    name        = "backend"
    image       = "${aws_ecr_repository.backend.repository_url}:${var.image_tag}"
    essential   = true
    environment = local.backend_environment
    portMappings = [{
      containerPort = 4000
      hostPort      = 4000
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.service["backend"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "backend"
      }
    }
  }])
}

resource "aws_ecs_service" "backend" {
  name                              = "${var.project_name}-backend-svc"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.backend.arn
  desired_count                     = 1
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 4000
  }

  service_registries {
    registry_arn = aws_service_discovery_service.internal["backend"].arn
  }

  # Backend gọi Redis/AI lúc khởi động (có fallback, nhưng khởi động sau thì log sạch hơn)
  depends_on = [aws_ecs_service.redis, aws_ecs_service.ai_service]
}

# --- Frontend Task ---
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([{
    name      = "frontend"
    image     = "${aws_ecr_repository.frontend.repository_url}:${var.image_tag}"
    essential = true
    # Trình duyệt gọi /api/v1 tương đối (NEXT_PUBLIC_API_URL đóng vào bundle lúc build image, xem frontend/Dockerfile);
    # SSR gọi thẳng backend qua Cloud Map.
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "API_INTERNAL_URL", value = local.backend_api_url },
      { name = "SITE_URL", value = local.alb_url },
    ]
    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
    }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        awslogs-group         = aws_cloudwatch_log_group.service["frontend"].name
        awslogs-region        = var.aws_region
        awslogs-stream-prefix = "frontend"
      }
    }
  }])
}

resource "aws_ecs_service" "frontend" {
  name                              = "${var.project_name}-frontend-svc"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.frontend.arn
  desired_count                     = 1
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = [aws_subnet.public_1.id, aws_subnet.public_2.id]
    security_groups  = [aws_security_group.ecs_tasks_sg.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 3000
  }

  depends_on = [aws_ecs_service.backend]
}
