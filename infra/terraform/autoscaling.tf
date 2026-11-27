# Tự co giãn số task frontend/backend sau ALB, trong khoảng [web_min_count, web_max_count].
# Hai chỉ số cùng theo dõi; chỉ số nào đòi nhiều task hơn thì thắng, chỉ co lại khi cả hai cho phép.
locals {
  web_services = {
    frontend = {
      service      = aws_ecs_service.frontend.name
      target_group = aws_lb_target_group.frontend.arn_suffix
    }
    backend = {
      service      = aws_ecs_service.backend.name
      target_group = aws_lb_target_group.backend.arn_suffix
    }
  }
}

resource "aws_appautoscaling_target" "web" {
  for_each           = local.web_services
  service_namespace  = "ecs"
  resource_id        = "service/${aws_ecs_cluster.main.name}/${each.value.service}"
  scalable_dimension = "ecs:service:DesiredCount"
  min_capacity       = var.web_min_count
  max_capacity       = var.web_max_count
}

resource "aws_appautoscaling_policy" "web_cpu" {
  for_each           = local.web_services
  name               = "${var.project_name}-${each.key}-cpu"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.web[each.key].service_namespace
  resource_id        = aws_appautoscaling_target.web[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.web[each.key].scalable_dimension

  target_tracking_scaling_policy_configuration {
    target_value       = var.autoscaling_cpu_target
    scale_out_cooldown = 60
    scale_in_cooldown  = 300

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}

resource "aws_appautoscaling_policy" "web_requests" {
  for_each           = local.web_services
  name               = "${var.project_name}-${each.key}-requests"
  policy_type        = "TargetTrackingScaling"
  service_namespace  = aws_appautoscaling_target.web[each.key].service_namespace
  resource_id        = aws_appautoscaling_target.web[each.key].resource_id
  scalable_dimension = aws_appautoscaling_target.web[each.key].scalable_dimension

  target_tracking_scaling_policy_configuration {
    target_value       = var.autoscaling_requests_per_target
    scale_out_cooldown = 60
    scale_in_cooldown  = 300

    predefined_metric_specification {
      predefined_metric_type = "ALBRequestCountPerTarget"
      resource_label         = "${aws_lb.main.arn_suffix}/${each.value.target_group}"
    }
  }

  # Chỉ số này chỉ có khi nhóm đích đã gắn vào listener của ALB.
  depends_on = [aws_lb_listener.http, aws_lb_listener.https, aws_lb_listener_rule.backend_rule]
}
