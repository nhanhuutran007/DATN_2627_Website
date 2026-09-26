# Hướng dẫn từng bước cấu hình AWS và chạy Terraform từ số 0

Bạn chưa có gì trên AWS là hoàn toàn bình thường! Điểm mạnh của **Terraform (Infrastructure as Code)** là nó sẽ *tự động hóa* việc tạo ra tất cả các "instance", Load Balancer, và Database trên AWS thay vì bạn phải vào trang web của AWS và bấm tạo bằng tay từng cái một.

Để Terraform có thể "điều khiển" được tài khoản AWS của bạn, bạn chỉ cần làm theo **3 bước chuẩn bị** cực kỳ đơn giản dưới đây.

---

## Bước 1: Chuẩn bị tài khoản AWS & Lấy "Chìa khóa" (Access Key)

Đầu tiên, bạn cần cấp cho máy tính của mình một chiếc "chìa khóa" để nó có quyền ra lệnh cho AWS tạo tài nguyên.

1. **Tạo tài khoản AWS:** Truy cập [aws.amazon.com](https://aws.amazon.com/) và đăng ký một tài khoản (Bạn sẽ cần thẻ VISA/Mastercard để đăng ký, AWS sẽ trừ thử 1$ và hoàn lại để xác minh thẻ).
2. **Tạo Access Key:**
   - Đăng nhập vào **AWS Management Console**.
   - Ở thanh tìm kiếm trên cùng, gõ **IAM** và chọn dịch vụ IAM.
   - Ở menu bên trái, chọn **Users** -> Bấm nút **Create user**.
   - Đặt tên cho user (VD: `terraform-admin`). Bấm *Next*.
   - Ở mục Permissions, chọn **Attach policies directly**. Tìm và tick vào ô **AdministratorAccess** (quyền cao nhất để tạo tài nguyên). Bấm *Next* -> *Create user*.
   - Sau khi tạo xong, bấm vào tên User `terraform-admin` vừa tạo. Chuyển sang tab **Security credentials**.
   - Cuộn xuống phần **Access keys**, bấm **Create access key**. Chọn mục *Command Line Interface (CLI)*, check vào ô xác nhận rồi bấm *Next* -> *Create access key*.
   - **QUAN TRỌNG:** Màn hình sẽ hiện ra **Access key ID** và **Secret access key**. Bạn hãy *Copy và Lưu lại* hai mã này ở một nơi an toàn (Secret key chỉ hiện đúng 1 lần này).

---

## Bước 2: Cài đặt các công cụ cần thiết lên máy tính (Windows)

Bạn cần 3 công cụ sau cài đặt trên máy tính cá nhân của mình:

1. **AWS CLI:** Công cụ giao tiếp với AWS.
   - Tải về và cài đặt: [AWS CLI for Windows](https://awscli.amazonaws.com/AWSCLIV2.msi)
2. **Terraform:** Công cụ chạy mã nguồn hạ tầng.
   - Tải file `.zip` dành cho Windows tại: [Terraform Downloads](https://developer.hashicorp.com/terraform/install).
   - Giải nén file `.zip` (bạn sẽ được 1 file `terraform.exe`). Copy file này vào một thư mục (VD: `C:\terraform`), sau đó [thêm đường dẫn `C:\terraform` vào biến môi trường PATH của Windows](https://www.architectryan.com/2018/03/17/add-to-the-path-on-windows-10/).
3. **Docker Desktop:** Để build các image Frontend/Backend chuẩn bị đưa lên AWS.
   - Tải và cài đặt: [Docker Desktop](https://www.docker.com/products/docker-desktop/).

---

## Bước 3: Đăng nhập AWS trên máy tính của bạn

Mở **PowerShell** hoặc **Terminal** trên máy tính lên và gõ:

```bash
aws configure
```

Hệ thống sẽ hỏi bạn 4 thông tin, hãy điền như sau:
1. `AWS Access Key ID`: Dán cái Access Key ID bạn lấy ở Bước 1 vào.
2. `AWS Secret Access Key`: Dán Secret Key vào.
3. `Default region name`: Gõ `ap-southeast-1` (Đây là máy chủ ở Singapore, gần VN nhất).
4. `Default output format`: Bấm Enter bỏ qua (để mặc định).

Vậy là máy tính của bạn đã được kết nối với tài khoản AWS!

---

## Bước 4: Chạy Terraform để tự động tạo hệ thống

Mở PowerShell tại thư mục Terraform của dự án:

```powershell
cd infra/terraform
```

### Lệnh 1: Khởi tạo Terraform và khai báo secret
```powershell
terraform init
Copy-Item terraform.tfvars.example terraform.tfvars   # rồi thay bằng giá trị ngẫu nhiên
```
`terraform.tfvars` chứa mật khẩu DB, JWT secret, webhook secret và `ai_api_key`; file này đã được `.gitignore`, **không commit**. Sinh giá trị ngẫu nhiên bằng `python -c "import secrets; print(secrets.token_hex(32))"`.

### Lệnh 2: Tạo kho chứa Docker (ECR) trước
Các ECS service kéo image từ ECR, nên phải có kho và image trước khi tạo service:
```powershell
terraform apply -target="aws_ecr_repository.frontend" -target="aws_ecr_repository.backend" -target="aws_ecr_repository.ai_service"
```

### Lệnh 3: Build và đẩy image (cần Docker Desktop đang chạy)
```powershell
.\deploy.ps1 push
```
Script tự đăng nhập ECR, build 3 image `linux/amd64` (frontend, backend, ai-service) và đẩy tag `latest`.
Lưu ý: image AI đóng gói các file mô hình `.pkl` trong `ai-service/models/` (không có trên Git), cần train/copy sẵn trên máy build.

### Lệnh 4: Tạo toàn bộ phần còn lại
```powershell
terraform apply
```
Mất khoảng 10 phút (RDS lâu nhất). Terraform tạo VPC, ALB, RDS MySQL 8.4, Cloud Map, CloudWatch Logs và 4 ECS service. Dòng cuối in ra **`alb_dns_name`**.

### Lệnh 5: Tạo bảng và dữ liệu mẫu trên RDS
RDS không mở ra Internet nên migration/seed chạy bằng *one-off ECS task* trong VPC (dùng lại image backend):
```powershell
.\deploy.ps1 migrate
.\deploy.ps1 seed       # tùy chọn: tài khoản + chiến dịch mẫu (bỏ qua nếu DB đã có user)
.\deploy.ps1 status     # trạng thái service + URL website
```
Mở `http://<alb_dns_name>` trên trình duyệt.

### Cập nhật code sau này
```powershell
.\deploy.ps1 push
.\deploy.ps1 migrate    # nếu có migration mới
.\deploy.ps1 redeploy   # buộc ECS kéo image mới
```

### Kiến trúc triển khai
- **ALB (HTTP :80)**: `/api/v1/*` → backend, còn lại → frontend. AI service **không** mở ra ALB.
- **Cloud Map (`gopmam.local`)**: backend gọi `ai.gopmam.local:8000` (kèm header `X-AI-Key`) và `redis.gopmam.local:6379`; SSR của frontend gọi `backend.gopmam.local:4000`.
- **RDS MySQL 8.4** private, bắt buộc TLS; backend xác minh chứng chỉ bằng CA bundle của RDS đóng sẵn trong image (`DB_SSL=true`).
- **Log**: CloudWatch `/ecs/gopmam/<service>`, giữ 7 ngày. Xem nhanh: `aws logs tail /ecs/gopmam/backend --follow`.
- Giới hạn cho bản demo: chỉ HTTP (chưa có domain/HTTPS); secret truyền qua biến môi trường của task definition (chưa dùng Secrets Manager); Redis không có volume bền vững.

---

> [!WARNING]
> **TẮT KHI KHÔNG SỬ DỤNG ĐỂ KHÔNG MẤT TIỀN:**
> ALB, RDS, Fargate và IPv4 công khai tính phí theo giờ (ước tính khoảng 4 USD/ngày khi bật đủ 4 service).

### Tắt hệ thống nhưng giữ image (khuyến nghị giữa các đợt phát triển)
Xóa mọi thứ trừ 3 kho ECR (image ~0,3 GB, khoảng vài cent/tháng) để lần sau bật lại không phải build lại:
```powershell
terraform plan -destroy -out=destroy.tfplan -target="aws_vpc.main" -target="aws_ecs_cluster.main" `
  -target="aws_iam_role.ecs_task_execution_role" -target="aws_cloudwatch_log_group.service" -target="aws_db_instance.mysql"
terraform apply destroy.tfplan    # kiểm tra plan không có aws_ecr_repository rồi mới apply
Remove-Item destroy.tfplan        # plan chứa secret
```
Dữ liệu RDS bị xóa (không giữ snapshot).

### Bật lại để test
```powershell
.\deploy.ps1 push        # build lại image nếu code đã thay đổi
terraform apply
.\deploy.ps1 migrate
.\deploy.ps1 seed
.\deploy.ps1 status
```

### Xóa sạch hoàn toàn (kể cả ECR)
```powershell
terraform destroy
```
Kho ECR có `force_delete = true` nên bị xóa kèm image.
