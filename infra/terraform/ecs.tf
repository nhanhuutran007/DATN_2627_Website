resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
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

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
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
}

# --- AI Service Task ---
resource "aws_ecs_task_definition" "ai_service" {
  family                   = "${var.project_name}-ai-service"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024 # AI cần nhiều RAM
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([{
    name      = "ai-service"
    image     = "${aws_ecr_repository.ai_service.repository_url}:latest"
    essential = true
    environment = [
      { name = "APP_ENV", value = "production" },
      { name = "AI_LOAD_MODEL", value = "true" }
    ]
    portMappings = [{
      containerPort = 8000
      hostPort      = 8000
    }]
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

  load_balancer {
    target_group_arn = aws_lb_target_group.ai_service.arn
    container_name   = "ai-service"
    container_port   = 8000
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
    name      = "backend"
    image     = "${aws_ecr_repository.backend.repository_url}:latest"
    essential = true
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "PORT", value = "4000" },
      { name = "CORS_ORIGINS", value = "http://${aws_lb.main.dns_name}" },
      { name = "DATABASE_URL", value = "mysql://crowdfunding_app:${var.db_password}@${aws_db_instance.mysql.endpoint}/crowdfunding" },
      { name = "REDIS_URL", value = "redis://redis.local:6379" }, # Sẽ cần Cloud Map/Service Discovery cho tên miền nội bộ, tạm thời giả định có Service Discovery hoặc IP
      { name = "AI_SERVICE_URL", value = "http://${aws_lb.main.dns_name}/api/v1" }, # Gọi vòng ra ALB
      { name = "JWT_ACCESS_SECRET", value = var.jwt_access_secret },
      { name = "JWT_REFRESH_SECRET", value = var.jwt_refresh_secret },
      { name = "PAYMENT_WEBHOOK_SECRET", value = var.payment_webhook_secret }
    ]
    portMappings = [{
      containerPort = 4000
      hostPort      = 4000
    }]
  }])
}

resource "aws_ecs_service" "backend" {
  name            = "${var.project_name}-backend-svc"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

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
    image     = "${aws_ecr_repository.frontend.repository_url}:latest"
    essential = true
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "NEXT_PUBLIC_API_URL", value = "http://${aws_lb.main.dns_name}/api/v1" }
    ]
    portMappings = [{
      containerPort = 3000
      hostPort      = 3000
    }]
  }])
}

resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-frontend-svc"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

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
}
