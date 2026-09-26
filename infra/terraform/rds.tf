resource "aws_db_subnet_group" "rds_subnet_group" {
  name       = "${var.project_name}-rds-subnet-group"
  subnet_ids = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  tags = {
    Name = "${var.project_name}-rds-subnet-group"
  }
}

resource "aws_db_instance" "mysql" {
  identifier           = "${var.project_name}-db"
  allocated_storage    = 20
  storage_type         = "gp3"
  engine               = "mysql"
  engine_version       = "8.4"          # 8.0 đã hết hỗ trợ tiêu chuẩn trên RDS (tính phí Extended Support); compose cũng dùng 8.4
  instance_class       = "db.t4g.micro" # Arm-based, rẻ và đủ cho đồ án (Free Tier eligible if applicable)
  db_name              = "crowdfunding"
  username             = "crowdfunding_app"
  password             = var.db_password
  parameter_group_name = "default.mysql8.4"
  skip_final_snapshot  = true  # Bỏ qua snapshot khi xóa để tiện dev/test
  publicly_accessible  = false # Vẫn đặt false dù ở public subnet (được bảo vệ bởi Security Group)

  vpc_security_group_ids = [aws_security_group.rds_sg.id]
  db_subnet_group_name   = aws_db_subnet_group.rds_subnet_group.name

  tags = {
    Name = "${var.project_name}-mysql"
  }
}
