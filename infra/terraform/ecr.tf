resource "aws_ecr_repository" "frontend" {
  name                 = "${var.project_name}-frontend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # cho phép terraform destroy xóa kho còn image

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # cho phép terraform destroy xóa kho còn image

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_repository" "ai_service" {
  name                 = "${var.project_name}-ai-service"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # cho phép terraform destroy xóa kho còn image

  image_scanning_configuration {
    scan_on_push = true
  }
}
