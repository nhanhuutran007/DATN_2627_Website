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

Bây giờ bạn không cần phải lên web AWS để tạo gì cả, hãy để Terraform làm việc đó!
Mở Terminal, trỏ vào thư mục chứa code Terraform của dự án:

```powershell
cd infra/terraform
```

### Lệnh 1: Khởi tạo Terraform
```powershell
terraform init
```
*(Lệnh này sẽ tải các thư viện AWS về máy của bạn. Chạy thành công sẽ hiện chữ màu xanh lá cây).*

### Lệnh 2: Chỉ tạo kho chứa Docker (ECR) trước
Vì các dịch vụ (Frontend, Backend) cần phải tải Docker image từ AWS về để chạy, nên ta phải tạo cái Kho (ECR) trên AWS trước.
```powershell
terraform apply -target="aws_ecr_repository.frontend" -target="aws_ecr_repository.backend" -target="aws_ecr_repository.ai_service"
```
Gõ `yes` và bấm Enter khi được hỏi. Chạy xong nó sẽ in ra 3 cái URL kho chứa.

### Lệnh 3: Build và đẩy code của bạn lên Kho AWS (ECR)
Bật Docker Desktop lên. 
(Thay `123456789012` bên dưới bằng mã tài khoản AWS của bạn, mã này nằm trong cái URL mà Lệnh 2 vừa in ra).

```powershell
# 1. Đăng nhập Docker vào AWS
aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com

# 2. Build Frontend và đẩy lên
docker build -t gopmam-frontend ../../frontend
docker tag gopmam-frontend:latest 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/gopmam-frontend:latest
docker push 123456789012.dkr.ecr.ap-southeast-1.amazonaws.com/gopmam-frontend:latest

# 3. Lặp lại tương tự cho Backend và AI Service
```

### Lệnh 4: Tạo toàn bộ phần còn lại (Load Balancer, RDS, Container)
```powershell
terraform apply
```
Gõ `yes` và bấm Enter. Quá trình này sẽ mất khoảng 5 - 7 phút. Nó sẽ tự động đi tạo Load Balancer, tạo Database MySQL, tạo mạng, thiết lập bảo mật và chạy các container. 

Khi chạy xong, dòng cuối cùng sẽ in ra biến **`alb_dns_name`** (VD: `gopmam-alb-xxx.ap-southeast-1.elb.amazonaws.com`).
=> **Copy link đó dán vào trình duyệt Chrome, website của bạn đã online trên AWS!**

---

> [!WARNING]
> **DỌN DẸP KHI KHÔNG SỬ DỤNG ĐỂ KHÔNG MẤT TIỀN:**
> Vì AWS sẽ tính phí Load Balancer và RDS theo giờ, khi bạn làm xong, báo cáo xong hoặc đi ngủ, hãy chạy lệnh sau:
> ```powershell
> terraform destroy
> ```
> Gõ `yes`. AWS sẽ tự động xóa sạch bong mọi thứ nó đã tạo ở lệnh 4, và bạn sẽ không bị trừ xu nào lúc đi ngủ cả. Hôm sau muốn bật lại chỉ cần gõ lại `terraform apply`.
