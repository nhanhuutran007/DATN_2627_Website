# Ảnh người dùng tải lên (ảnh chiến dịch, ảnh bài cập nhật). Container Fargate không có
# ổ đĩa bền vững nên backend ghi vào S3; bucket private, chỉ backend đọc/ghi qua task role
# và trả ảnh ra ngoài qua GET /api/v1/media/... (không mở bucket ra Internet).
data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "media" {
  bucket        = "${var.project_name}-media-${data.aws_caller_identity.current.account_id}"
  force_destroy = true # cho phép terraform destroy xóa bucket còn file (bản demo)

  tags = {
    Name = "${var.project_name}-media"
  }
}

resource "aws_s3_bucket_public_access_block" "media" {
  bucket                  = aws_s3_bucket.media.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_ownership_controls" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# --- Task role của backend: quyền tối thiểu trên đúng bucket ảnh ---
resource "aws_iam_role" "backend_task_role" {
  name               = "${var.project_name}-backend-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_execution_role_assume_policy.json
}

data "aws_iam_policy_document" "backend_media_access" {
  statement {
    actions   = ["s3:PutObject", "s3:GetObject"]
    resources = ["${aws_s3_bucket.media.arn}/*"]
  }
}

resource "aws_iam_role_policy" "backend_media_access" {
  name   = "${var.project_name}-backend-media-access"
  role   = aws_iam_role.backend_task_role.id
  policy = data.aws_iam_policy_document.backend_media_access.json
}
