# Chứng chỉ SSL miễn phí của AWS cho tên miền riêng (gốc + www), xác minh qua DNS.
# DNS do Cloudflare quản lý nên Terraform không tự tạo bản ghi xác minh: lấy
# output `acm_validation_records`, thêm vào Cloudflare (DNS only), rồi mới bật enable_https.
resource "aws_acm_certificate" "site" {
  count                     = var.domain_name == "" ? 0 : 1
  domain_name               = var.domain_name
  subject_alternative_names = ["www.${var.domain_name}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-site"
  }
}

# Chờ ACM chuyển sang ISSUED (chỉ khi bật HTTPS, tránh apply bị treo lúc chưa có bản ghi DNS)
resource "aws_acm_certificate_validation" "site" {
  count           = var.enable_https ? 1 : 0
  certificate_arn = aws_acm_certificate.site[0].arn

  timeouts {
    create = "15m"
  }
}
