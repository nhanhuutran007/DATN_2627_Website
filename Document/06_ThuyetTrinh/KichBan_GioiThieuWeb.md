# KỊCH BẢN GIỚI THIỆU WEBSITE GÓP MẦM

> Đề tài: **Xây dựng nền tảng gây quỹ cộng đồng cho các dự án xã hội và khởi nghiệp** (DATN_2627)
> SV: Trần Hữu Nhân, Nguyễn Nhật Hào · GVHD: ThS. Dương Hữu Phước
> Thời lượng dự kiến: **20–25 phút** (nói + demo) + phần hỏi đáp

**Quy ước trong kịch bản:**
- Đoạn in nghiêng trong ngoặc kép là **lời nói** — đọc tự nhiên, không cần thuộc từng chữ.
- `[DEMO]` là **thao tác trên màn hình** song song khi nói.
- `[Mẹo]` là lưu ý riêng cho người trình bày, không nói ra.

---

## 0. Chuẩn bị trước buổi giới thiệu (làm tối nay / sáng mai)

- [ ] Bật Docker, chạy đủ 6 dịch vụ (nginx, frontend, backend, ai-service, mysql, redis). Mở `http://localhost:8080`.
- [ ] **Seed lại dữ liệu sát giờ trình bày** (ngày trong seed tính theo lúc chạy — để các chiến dịch "sắp hết hạn", "mốc quá hạn" hiện đúng).
- [ ] Kiểm tra AI: `http://localhost:8000/health` báo `ready`, mô hình dự đoán `2026.11-real.2`.
- [ ] Chuẩn bị **3 trình duyệt / 3 cửa sổ ẩn danh** đã đăng nhập sẵn, đỡ mất thời gian gõ:
  | Cửa sổ | Tài khoản | Vai trò |
  |---|---|---|
  | 1 | (chưa đăng nhập) → sau đó `user1@gopmam.com` | Khách → Người ủng hộ |
  | 2 | `owner2@gopmam.com` (Trần Thị Bích) | Chủ dự án — có chiến dịch demo "Hỗ trợ nông dân trồng rau sạch hữu cơ" |
  | 3 | `admin@gopmam.com` | Quản trị viên |
  Mật khẩu chung: `Test@123`.
- [ ] Mở sẵn hộp thư (hoặc log backend) để lấy **mã OTP** khi demo thao tác nhạy cảm của admin.
- [ ] Nếu Docker đang cấu hình SePay production thì **ví demo bị tắt** → hoặc đổi về sandbox để demo ủng hộ bằng ví demo, hoặc chuẩn bị sẵn 1 khoản nhỏ quét QR SePay thật.
- [ ] Mở sẵn: README, file `TESTCASE_GOPMAM.xlsx` (sheet `ThongKe`), sơ đồ kiến trúc, notebook Colab (phòng khi thầy hỏi AI).
- [ ] Zoom trình duyệt hợp lý cho máy chiếu (web đã tự hiển thị 90% trên laptop).

---

## 1. Mở đầu (≈ 1 phút)

> *"Em chào thầy. Hôm nay nhóm em xin giới thiệu đồ án tốt nghiệp **Góp Mầm** — nền tảng gây quỹ cộng đồng cho các dự án xã hội và khởi nghiệp, có tích hợp trí tuệ nhân tạo."*
>
> *"Phần trình bày gồm 6 nội dung: bài toán đặt ra, các tác nhân và vai trò trong hệ thống, kiến trúc và công nghệ, sau đó là demo trực tiếp theo từng vai trò, phần AI, và cuối cùng là kiểm thử, hạn chế, hướng phát triển."*

---

## 2. Bài toán và hướng giải quyết (≈ 2 phút)

> *"Gây quỹ cộng đồng giúp các nhóm khởi nghiệp, câu lạc bộ, tổ chức xã hội huy động vốn từ nhiều người thay vì phụ thuộc một nhà đầu tư lớn. Tuy nhiên các nền tảng hiện nay còn 4 vấn đề:"*
>
> 1. *"**Người ủng hộ** khó tìm được dự án phù hợp khi số chiến dịch ngày càng nhiều."*
> 2. *"**Chủ dự án** không biết hồ sơ của mình có khả năng đạt mục tiêu hay không trước khi phát hành."*
> 3. *"**Ban quản trị** phải tự xử lý thông tin sai lệch, giao dịch bất thường, nguy cơ gian lận."*
> 4. *"Và quan trọng nhất là **tiền sau khi gây quỹ được dùng thế nào thì thiếu minh bạch**, làm giảm niềm tin."*
>
> *"Góp Mầm giải quyết bằng cách hỗ trợ **trọn vòng đời chiến dịch**: tạo hồ sơ → xét duyệt → kêu gọi ủng hộ → thanh toán → cập nhật tiến độ kèm chứng từ chi tiêu → kết thúc. Ngoài cá nhân, hệ thống còn cho phép **tổ chức xã hội đã xác minh** nhận gây quỹ. Điểm nhấn là **3 mô-đun AI**: gợi ý dự án, dự đoán khả năng thành công và phát hiện gian lận — với nguyên tắc **AI chỉ hỗ trợ, quyết định cuối cùng luôn do con người**."*

---

## 3. Tác nhân và vai trò trong hệ thống (≈ 3 phút)

> *"Trước khi demo, em xin trình bày các tác nhân. Hệ thống có **6 tác nhân**, nhưng về mặt phân quyền chỉ có **3 vai trò** lưu trong cơ sở dữ liệu: `user` – người ủng hộ, `campaign_owner` – chủ dự án và `admin` – quản trị viên."*

| # | Tác nhân | Là ai | Làm được gì |
|---|---|---|---|
| 1 | **Khách truy cập** | Chưa đăng nhập | Xem trang chủ, khám phá theo lĩnh vực, tìm kiếm + lọc dự án, xem chi tiết dự án, sổ cái giao dịch công khai, nhật ký chi tiêu, danh bạ tổ chức; đăng ký tài khoản |
| 2 | **Người ủng hộ** (`user`) | Tài khoản đã đăng nhập | Ủng hộ (ví demo / SePay), chọn quà, gửi lời động viên, theo dõi dự án, bình luận – hỏi đáp, báo cáo vi phạm, nhận gợi ý AI cá nhân hóa (khi đồng ý), xem biên nhận, lịch sử ủng hộ, yêu cầu hoàn tiền |
| 3 | **Chủ dự án** (`campaign_owner`) | Người tạo chiến dịch | Tạo chiến dịch 8 bước, gửi duyệt, sửa khi bị yêu cầu bổ sung, quản lý mốc tiến độ, mức quà, đăng cập nhật + khai chi kèm chứng từ, xem số liệu (lượt xem, chuyển đổi, người theo dõi), xem ước lượng AI kèm gợi ý cải thiện. **Một chủ dự án vẫn có thể ủng hộ dự án khác** |
| 4 | **Người đại diện tổ chức** | Là tài khoản thường, **không phải vai trò riêng** | Đăng ký hồ sơ tổ chức kèm ảnh giấy phép, bổ sung khi được yêu cầu, cập nhật logo/sứ mệnh/liên hệ, theo dõi các chiến dịch gây quỹ cho tổ chức |
| 5 | **Quản trị viên** (`admin`) | Ban vận hành nền tảng | Duyệt – kích hoạt – tạm dừng – kết thúc chiến dịch; xác minh tổ chức; quản lý người dùng; xử lý báo cáo vi phạm, bình luận; xem cảnh báo rủi ro AI; duyệt hoàn tiền, đối soát; quản lý lĩnh vực, dự án nổi bật, liên hệ hỗ trợ; nhật ký kiểm toán; sao lưu/khôi phục |
| 6 | **Hệ thống ngoài** | Dịch vụ bên thứ ba | Cổng thanh toán (ví demo sandbox, **SePay** QR chuyển khoản), dịch vụ email, lưu trữ tệp (local/Amazon S3), đăng nhập Google, và **AI service** |

> *"Có hai điểm em muốn nhấn mạnh về phân quyền:"*
> - *"Người dùng **không thể tự đăng ký làm admin** — vai trò admin chỉ do admin khác cấp, và phải xác thực bằng mã OTP."*
> - *"Phân quyền kiểm tra ở server theo **cả vai trò lẫn quyền sở hữu**: ví dụ chủ dự án A không sửa được chiến dịch của chủ dự án B, hồ sơ chưa phát hành thì người ngoài nhận lỗi 404."*

---

## 4. Kiến trúc và công nghệ (≈ 2 phút)

`[DEMO]` Mở sơ đồ kiến trúc trong README (mục 8.1).

> *"Hệ thống gồm 3 ứng dụng độc lập đặt sau **Nginx** làm reverse proxy:"*
> - *"**Frontend** Next.js 16, React 19 – render phía server để tối ưu SEO."*
> - *"**Backend** NestJS 12 với TypeORM – chia theo mô-đun nghiệp vụ: auth, users, campaigns, donations, payments, progress, organizations, finance, moderation, admin, ai…; mỗi mô-đun theo lớp Controller → Service → Repository → Entity."*
> - *"**AI service** viết bằng FastAPI + scikit-learn, tách riêng để nếu AI lỗi thì nghiệp vụ chính, nhất là thanh toán, vẫn chạy."*
> - *"Dữ liệu lưu ở **MySQL 8**, **Redis 7** dùng giới hạn tần suất truy cập."*
>
> *"Toàn bộ chạy bằng **Docker Compose** 6 dịch vụ; ngoài ra nhóm đã viết **Terraform** triển khai lên AWS (ECS Fargate, ALB, RDS) và đã deploy thử thành công."*
>
> *"Cơ sở dữ liệu có 26 bảng, khóa chính UUID, xóa mềm cho dữ liệu quan trọng, thay đổi schema chỉ qua migration có rollback, và mọi thay đổi quan trọng đều ghi **nhật ký kiểm toán**."*

`[Mẹo]` Nếu thầy hỏi vì sao không dùng Spring Boot như đề cương: chuyển sang NestJS để dùng chung TypeScript với frontend, giữ nguyên kiến trúc nhiều lớp (ADR-001).

---

## 5. DEMO THEO TỪNG VAI TRÒ (≈ 12–14 phút)

> *"Sau đây em demo theo đúng hành trình của một chiến dịch, lần lượt qua từng vai trò."*

### 5.1. Khách truy cập (≈ 2 phút) — Cửa sổ 1, chưa đăng nhập

`[DEMO]` Trang chủ `/`
> *"Đây là trang chủ. Phần đầu là dải ảnh các dự án đang gây quỹ tự trôi, có thể kéo bằng chuột. Bên dưới là **6 dự án nổi bật** do quản trị viên chọn, và các dự án theo lĩnh vực."*

`[DEMO]` Vào **Khám phá** `/du-an` → chọn một lĩnh vực → vào **Tìm kiếm** `/tim-kiem`, lọc theo lĩnh vực, địa điểm, tỷ lệ hoàn thành, sắp xếp.
> *"Tìm kiếm và lọc được xử lý **phía server**: theo lĩnh vực, trạng thái, địa điểm, khoảng mục tiêu, tỷ lệ hoàn thành, thời gian còn lại, có phân trang 'Xem thêm'."*

`[DEMO]` Mở chiến dịch **"Hỗ trợ nông dân trồng rau sạch hữu cơ"**.
> *"Trang chi tiết dự án có thẻ gây quỹ dính bên phải: vòng tiến độ, số đã nhận, người ủng hộ gần nhất / lớn nhất. Bấm vào đây sẽ mở **sổ cái giao dịch công khai** — mọi con số ở đây đều **tính từ giao dịch đã xác nhận**, không ai nhập tay được."*
>
> *"Kéo xuống có **Kế hoạch và ngân sách** theo từng mốc, **Nhật ký tiến độ & chi tiêu** — mỗi khoản chi đều kèm ảnh hóa đơn, chứng từ — và **điểm minh bạch** 0–100 của chiến dịch. Tiếp theo là Cập nhật, Chia sẻ, Người tổ chức, Lời động viên và Hỏi đáp."*

`[DEMO]` Bấm **Chia sẻ** (sao chép link, Facebook, X, …), mở hộp **hỏi đáp nhanh** góc phải dưới, gõ thử "làm sao hoàn tiền".
> *"Khách có thể chia sẻ dự án và hỏi nhanh trong hộp hỗ trợ — gõ câu hỏi tự do, hệ thống khớp với các câu hỏi thường gặp."*

`[DEMO]` Mở `/to-chuc` (danh bạ tổ chức) → một trang tổ chức.
> *"Đây là danh bạ các **tổ chức đã xác minh**. Mỗi tổ chức có trang riêng: sứ mệnh, thông tin pháp lý, tổng tiền đã huy động và các chiến dịch gây quỹ cho tổ chức."*

### 5.2. Đăng ký / đăng nhập và bảo mật tài khoản (≈ 1 phút)

`[DEMO]` Bấm Ủng hộ → bị chuyển sang `/dang-nhap`. Nhập email → mật khẩu.
> *"Muốn ủng hộ phải đăng nhập. Trang đăng nhập hỏi email trước: email đã có tài khoản thì nhập mật khẩu, chưa có thì tạo tài khoản ngay. Mật khẩu phải đủ 8 ký tự, có hoa, thường, số và ký tự đặc biệt — kiểm tra ở cả trình duyệt và server. Có hỗ trợ **đăng nhập Google**."*
>
> *"Về bảo mật: đăng nhập sai 5 lần trong 15 phút sẽ bị khóa tạm; dùng JWT với **refresh token xoay vòng** — nếu ai đó dùng lại token cũ thì toàn bộ phiên bị thu hồi; có đăng xuất khỏi mọi thiết bị. Đăng nhập xong, hệ thống đưa người dùng **quay về đúng trang đang xem**."*

### 5.3. Người ủng hộ (≈ 3 phút) — Cửa sổ 1, `user1@gopmam.com`

`[DEMO]` Trên trang dự án bấm **Ủng hộ** → trang `/du-an/[slug]/ung-ho`: chọn số tiền, chọn mức quà (nhập người nhận quà), viết lời động viên, chọn phương thức thanh toán → thanh toán.
> *"Trang ủng hộ là trang riêng toàn màn hình. Người ủng hộ chọn số tiền, có thể chọn **mức quà** — khi chọn quà phải nhập họ tên, điện thoại, địa chỉ nhận, và thông tin này chỉ chủ dự án và admin xem được. Có thể gửi **lời động viên công khai**."*
>
> *"Thanh toán có 2 kênh: **ví demo** để thử nghiệm và **cổng SePay** quét QR chuyển khoản — nhóm đã thử với **tiền thật**. Trạng thái giao dịch chỉ đổi khi server **xác minh** phản hồi từ cổng: chữ ký HMAC với ví demo, khóa bí mật và đối chiếu số tiền với SePay. Nếu lỡ mất thông báo IPN, hệ thống tự **đối soát** bằng API tra cứu của SePay. Mỗi giao dịch có idempotency key nên bấm 2 lần không bị trừ tiền 2 lần. Đơn chờ quá 30 phút tự hết hạn, và người dùng có thể hủy."*

`[DEMO]` Màn hình thành công → **Biên nhận** `/bien-nhan/[id]` → quay lại trang dự án thấy sổ cái + lời động viên vừa gửi.

`[DEMO]` Bấm **Theo dõi** dự án; viết một câu **hỏi đáp**; mở menu **Báo cáo chiến dịch** (chỉ cho xem form, có thể không gửi).
> *"Người ủng hộ có thể theo dõi dự án để nhận thông báo cập nhật, đặt câu hỏi cho chủ dự án, và **báo cáo vi phạm** nếu thấy dấu hiệu bất thường — hệ thống chặn tự báo cáo dự án của mình và báo cáo trùng."*

`[DEMO]` Mở **Trang của tôi** `/dashboard`: tổng đã ủng hộ, khoản ủng hộ của tôi, dự án đang theo dõi, **gợi ý AI**.
> *"Ở Trang của tôi, người ủng hộ thấy tổng số đã đóng góp, lịch sử ủng hộ, các dự án đang theo dõi, và **dự án được AI gợi ý** kèm lý do gợi ý. Lưu ý: hệ thống chỉ ghi nhận hành vi để cá nhân hóa khi người dùng **chủ động đồng ý**; rút lại đồng ý thì lịch sử hành vi bị xóa."*

`[DEMO]` Ở một khoản ủng hộ → **Yêu cầu hoàn tiền** (cho thấy hộp nhập OTP, không cần gửi thật).
> *"Người ủng hộ có thể yêu cầu hoàn tiền trong 7 ngày, hoặc **bất cứ lúc nào nếu chiến dịch kết thúc mà không đạt mục tiêu**. Đây là thao tác nhạy cảm nên phải nhập **mã OTP gửi qua email**. Với khoản qua SePay, người dùng khai thêm tài khoản nhận hoàn."*

`[DEMO]` Chuông thông báo + `/thong-bao`, trang **Cài đặt** `/ho-so` (hồ sơ, ảnh đại diện, thông tin liên hệ công khai, tùy chọn thông báo, đồng ý AI).

### 5.4. Chủ dự án (≈ 3 phút) — Cửa sổ 2, `owner2@gopmam.com`

`[DEMO]` Bấm **Tạo chiến dịch** → wizard 8 bước (chỉ lướt qua các bước, không cần tạo hết).
> *"Chủ dự án tạo chiến dịch qua **8 bước toàn màn hình**: gây quỹ cho mình hay cho một tổ chức đã xác minh, lĩnh vực, địa điểm, mục tiêu tiền và thời gian, câu chuyện soạn bằng trình soạn thảo định dạng — HTML được làm sạch ở server để chống XSS —, ảnh bìa, kế hoạch theo mốc với ngân sách từng mốc, mức quà tặng, rồi xem lại và gửi duyệt."*

`[DEMO]` Vào `/dashboard` → mục chiến dịch của tôi: chỉ ra các trạng thái (nháp, chờ duyệt, cần bổ sung, đang gây quỹ…), nút **Sửa** ở hồ sơ cần bổ sung.
> *"Vòng đời chiến dịch: **Bản nháp → Chờ duyệt → (Cần bổ sung ⇄ Chờ duyệt) → Đã duyệt → Đang gây quỹ → Tạm dừng / Thành công / Không đạt → Kết thúc**. Mọi chuyển trạng thái đều kiểm tra theo ma trận ở server. Khi admin yêu cầu bổ sung, chủ dự án bấm Sửa, xem lý do của admin rồi gửi lại. Khi hết hạn, một **job tự động** chốt chiến dịch thành công hoặc không đạt và gửi thông báo."*

`[DEMO]` Chiến dịch "rau sạch" → panel **Số liệu**: lượt xem, tỷ lệ chuyển đổi, người theo dõi, biểu đồ theo ngày + **thẻ dự đoán AI**.
> *"Chủ dự án xem số liệu thật: lượt xem có chống đếm trùng, tỷ lệ chuyển đổi, biểu đồ tiền và lượt xem theo ngày. Đây là **ước lượng khả năng thành công** của AI, kèm so sánh với mặt bằng chung và yếu tố nào đang cộng / trừ điểm cho riêng chiến dịch này, cùng gợi ý cải thiện. Ước lượng này **không công khai** cho người ủng hộ để tránh ảnh hưởng quyết định của họ."*

`[DEMO]` Panel **Tiến độ**: đánh dấu mốc, đăng cập nhật kèm khoản chi + tải ảnh chứng từ. Panel **Mức quà** (danh sách người nhận quà).
> *"Đây là phần minh bạch: chủ dự án đăng cập nhật, mỗi khoản chi **bắt buộc kèm ảnh chứng từ**, tổng chi không được vượt số đã huy động, một ảnh không dùng lại được cho khoản khác. Nếu mốc trễ hạn, hệ thống tự nhắc chủ dự án và hiển thị 'chậm tiến độ' công khai. Sau khi phát hành, muốn đổi hạn hay ngân sách mốc phải ghi lý do — lưu thành **lịch sử thay đổi kế hoạch** công khai và thông báo cho người ủng hộ."*

`[Mẹo]` Có thể mở thêm chiến dịch "Phòng khám lưu động cho người cao tuổi" để chỉ ví dụ mốc **quá hạn**.

### 5.5. Người đại diện tổ chức (≈ 1,5 phút)

`[DEMO]` Trang `/danh-cho-to-chuc` → `/to-chuc/dang-ky` (lướt form) → `/to-chuc/cua-toi`.
> *"Một tài khoản bình thường có thể đăng ký làm **người đại diện tổ chức** — quỹ, tổ chức phi lợi nhuận, doanh nghiệp xã hội. Họ nộp hồ sơ: tên, loại hình, số giấy phép, ảnh giấy phép, sứ mệnh, liên hệ. Mỗi tài khoản tối đa 3 hồ sơ, không trùng số giấy phép và không trùng ảnh giấy phép."*
>
> *"Trạng thái hồ sơ: **Chờ xác minh → Cần bổ sung / Đã xác minh / Bị từ chối**, tổ chức đã xác minh có thể bị **tạm ngưng**. Sau khi xác minh, thông tin pháp lý bị khóa, và ảnh giấy phép **không bao giờ lộ ra API công khai**."*

`[DEMO]` `/gay-quy-cho-to-chuc` → trang một tổ chức → nút **Gây quỹ cho tổ chức** (mở wizard với tổ chức chọn sẵn).
> *"Khi tổ chức đã xác minh, **bất kỳ ai** cũng có thể mở chiến dịch gây quỹ cho tổ chức đó — dịp sinh nhật, sự kiện, tưởng nhớ. Chiến dịch vẫn đi qua đúng quy trình duyệt, và trang dự án ghi rõ **đơn vị thụ hưởng**."*

### 5.6. Quản trị viên (≈ 3 phút) — Cửa sổ 3, `admin@gopmam.com`

`[DEMO]` `/admin` → **Tổng quan**.
> *"Trang quản trị chia 3 nhóm: **Kiểm duyệt**, **Tài chính**, **Hệ thống**. Số việc đang chờ hiển thị ngay trên thanh điều hướng."*

**Nhóm Kiểm duyệt**

`[DEMO]` **Duyệt chiến dịch**: mở một hồ sơ chờ duyệt → xem thông tin, mốc, mức quà, **ước lượng AI (nhãn "Chỉ tham khảo")** → Phê duyệt / Yêu cầu bổ sung / Từ chối (có lý do). Với chiến dịch đã duyệt → **Kích hoạt**; đang gây quỹ → **Tạm dừng / Kết thúc**.
> *"Admin xét duyệt theo đúng ma trận trạng thái. Ước lượng AI chỉ là tham khảo, **không phải căn cứ duy nhất để từ chối**. Từ chối, tạm dừng đều bắt buộc ghi lý do và gửi thông báo, email cho chủ dự án."*

`[DEMO]` **Xác minh tổ chức** → xem ảnh giấy phép → Xác minh / Yêu cầu bổ sung (ghi chú ≥ 10 ký tự).
> *"Admin đối chiếu giấy phép bằng mắt. Admin không được tự xét tổ chức mà chính mình đại diện — tránh xung đột lợi ích."*

`[DEMO]` **Cảnh báo rủi ro** → mở một cảnh báo, xếp theo điểm, xem lý do + giao dịch liên quan.
> *"Đây là đầu ra của **mô-đun phát hiện gian lận**. Mỗi cảnh báo có điểm rủi ro, nhóm nguyên nhân và cho biết chấm bằng luật kết hợp mô hình hay chỉ bằng luật dự phòng. AI **không tự khóa ai** — admin xem bằng chứng rồi mới quyết định."*

`[DEMO]` **Báo cáo vi phạm** và **Bình luận**: xử lý một báo cáo (pending → reviewing → resolved/dismissed), tùy chọn tạm dừng chiến dịch hoặc ẩn bình luận.

**Nhóm Tài chính**

`[DEMO]` **Giao dịch** (lọc giao dịch bị gắn cờ), **Hoàn tiền** (duyệt → nhập OTP; với SePay nhập mã chuyển khoản thật), **Đối soát** (chọn 7 ngày / 30 ngày / tháng này, xuất CSV).
> *"SePay không có API hoàn tiền, nên khoản qua SePay được hoàn **thủ công**: admin xuất danh sách kèm tài khoản nhận, chuyển khoản trả lại rồi nhập mã giao dịch thật làm bằng chứng. Báo cáo đối soát tính ranh giới ngày theo giờ Việt Nam."*

**Nhóm Hệ thống**

`[DEMO]` **Người dùng** (khóa/mở; đổi vai trò, xóa tài khoản cần OTP), **Lĩnh vực** (thêm, đổi tên, ngừng nhận), chọn **dự án nổi bật**, **xuất thống kê CSV** ẩn danh, **Liên hệ hỗ trợ** (hiện ở `/lien-he`), **Sao lưu dữ liệu**, **Nhật ký kiểm toán** (lọc theo đối tượng, hành động, người thực hiện).
> *"Admin không tự đổi vai trò hay xóa chính mình; tài khoản đã có giao dịch chỉ được khóa chứ không xóa để giữ lịch sử. Mọi thao tác quan trọng — duyệt, khóa, hoàn tiền, đổi vai trò — đều nằm trong **nhật ký kiểm toán** với thời điểm, người thực hiện, giá trị trước và sau."*

`[DEMO]` Mở nhật ký kiểm toán, lọc theo chiến dịch vừa duyệt để thấy đúng thao tác vừa làm.

---

## 6. Ba mô-đun AI (≈ 3 phút)

> *"Phần AI chạy trong dịch vụ riêng. Cả 3 mô-đun đều được **huấn luyện trên dữ liệu công khai thật** bằng notebook Google Colab, mọi kết quả đều có **giải thích**, **phiên bản mô hình** và **phương án dự phòng** khi AI lỗi."*

| Mô-đun | Dữ liệu huấn luyện | Phương pháp | Kết quả | Ai dùng | Dự phòng |
|---|---|---|---|---|---|
| **Dự đoán khả năng thành công** | ~332.000 dự án Kickstarter | Gradient Boosting, 6 đặc trưng có sẵn lúc tạo chiến dịch (lĩnh vực, mục tiêu, thời gian, số từ trong tên, tháng & thứ bắt đầu) | ROC-AUC **0,708** (Logistic Regression 0,679; Random Forest 0,701) | Chủ dự án, admin | Không hiện điểm, không chặn nghiệp vụ |
| **Phát hiện gian lận** | ~590.000 giao dịch có nhãn (IEEE-CIS) | 2 tầng: luật nghiệp vụ + HistGradientBoosting (25% điểm) | ROC-AUC **0,718**; top 1% rủi ro có tỷ lệ gian lận **gấp 2,6 lần** ngẫu nhiên | Admin | Chỉ dùng luật |
| **Gợi ý dự án** | 3,55 triệu lượt quyên góp (DonorsChoose) | Lọc nội dung + tín hiệu hành vi (xem, theo dõi, ủng hộ), độ tương đồng lĩnh vực học từ dữ liệu thật | Hit@2 **0,722** | Người ủng hộ | Danh sách phổ biến |

> *"Nhóm em muốn trình bày trung thực về giới hạn: dữ liệu đến từ các nền tảng nước ngoài nên cần đánh giá lại khi có dữ liệu Việt Nam; với gợi ý, kết quả cá nhân hóa chỉ **ngang mốc 'phổ biến'** nên thuật toán luôn kết hợp độ phổ biến. Nhóm cũng đã thử Isolation Forest cho gian lận nhưng ROC-AUC chỉ 0,491 — không hơn ngẫu nhiên — nên **đã loại bỏ**."*
>
> *"Nguyên tắc **AI có trách nhiệm**: AI không tự khóa, từ chối hay tạm dừng; dự đoán không công khai; hệ thống không công khai cáo buộc gian lận; hành vi chỉ thu thập khi người dùng đồng ý."*

---

## 7. Bảo mật — tóm tắt (≈ 1 phút)

> *"Tóm lại các biện pháp bảo mật đã làm:"*
> - *"Mật khẩu băm bcrypt, API không bao giờ trả về hash mật khẩu; email, số điện thoại chỉ trả ở API cá nhân và quản trị."*
> - *"JWT + refresh token xoay vòng, khóa tạm khi đăng nhập sai, OTP qua email cho thao tác nhạy cảm."*
> - *"Phân quyền theo vai trò và quyền sở hữu ở server; hồ sơ chưa phát hành người ngoài không xem được."*
> - *"Webhook thanh toán xác minh chữ ký, chống phát lại, idempotent, cập nhật có điều kiện chống xử lý trùng."*
> - *"Rate limit bằng Redis, helmet, CORS giới hạn, validate DTO, ORM chống SQL injection, làm sạch HTML chống XSS; **không lưu thông tin thẻ**."*

---

## 8. Kiểm thử và kết quả (≈ 1,5 phút)

`[DEMO]` Mở `TESTCASE_GOPMAM.xlsx` sheet `ThongKe`.

> *"Về kiểm thử:"*
> - *"Unit test tự động: **backend 554 test, frontend 36 test, AI service 34 test**, tất cả đều đạt. Độ phủ backend đạt **89% dòng lệnh** trên các file nghiệp vụ được test."*
> - *"Bộ **198 test case thủ công** chia 14 nhóm module: chức năng, phân quyền, bảo mật, giao diện, tích hợp, phi chức năng. Đợt 14–16/11 đã chạy 171 test case, **164 Pass, 5 Fail, 2 Blocked**. Ngày 17/11 nhóm đã sửa toàn bộ 5 lỗi Fail — ví dụ lỗi người ngoài xem được hồ sơ chưa phát hành, thiếu nút Sửa cho hồ sơ cần bổ sung — cùng các góp ý trong test case đạt, và đang chạy lại."*
> - *"Ngoài ra đã kiểm thử ma trận phân quyền 38 endpoint × 4 vai trò."*

---

## 9. Hạn chế và hướng phát triển (≈ 1 phút)

> *"Hạn chế hiện tại:"*
> - *"Mô hình AI học trên dữ liệu nước ngoài, cần huấn luyện lại khi có dữ liệu thật của nền tảng — notebook đã sẵn sàng để huấn luyện lại không cần sửa code."*
> - *"Chưa có giải ngân thực tế cho chủ dự án hay chuyển tiền trực tiếp cho tổ chức; hoàn tiền SePay phải làm thủ công."*
> - *"Xác minh tổ chức vẫn đối chiếu giấy phép bằng mắt, chưa tra cứu cơ sở dữ liệu nhà nước."*
> - *"Chưa có kiểm thử đầu-cuối tự động; còn một số test case nhóm tương tác cộng đồng chưa chạy."*
>
> *"Hướng phát triển: thêm cổng thẻ/ví điện tử và eKYC; **ký quỹ và giải ngân theo mốc tiến độ**; thông báo đẩy; cập nhật mô hình AI định kỳ, giám sát trôi dữ liệu và phát hiện nhóm tài khoản thông đồng; ứng dụng di động, đa ngôn ngữ."*

---

## 10. Kết thúc (≈ 30 giây)

> *"Tóm lại, Góp Mầm đã hoàn thiện quy trình gây quỹ khép kín từ tạo chiến dịch đến kết thúc, minh bạch dòng tiền bằng sổ cái và chứng từ chi tiêu, có đủ 5 nhóm người dùng với phân quyền chặt chẽ, và 3 mô-đun AI hỗ trợ ra quyết định có giải thích. Phần trình bày của nhóm em đến đây là hết, em cảm ơn thầy đã lắng nghe, nhóm em rất mong nhận được góp ý của thầy."*

---

## PHỤ LỤC A — Câu hỏi có thể được hỏi & gợi ý trả lời

| Câu hỏi | Gợi ý trả lời |
|---|---|
| **Làm sao đảm bảo tiền được dùng đúng mục đích?** | Số liệu quỹ sinh từ giao dịch đã xác minh (không nhập tay); mỗi khoản chi bắt buộc ảnh chứng từ, tổng chi ≤ số đã huy động, chặn dùng lại ảnh; mốc quá hạn bị đánh dấu công khai; đổi kế hoạch phải ghi lý do và lưu lịch sử; điểm minh bạch 0–100; người ủng hộ có thể báo cáo vi phạm, admin có thể tạm dừng. Giới hạn: chưa có ký quỹ/giải ngân theo mốc — là hướng phát triển. |
| **Làm sao tránh xử lý giao dịch 2 lần?** | Idempotency key khi tạo giao dịch; webhook kiểm tra chữ ký + timestamp chống phát lại; cập nhật có điều kiện (chỉ đổi khi đang `pending`) nên 2 webhook đến cùng lúc chỉ một cái thành công. |
| **Nếu mất IPN của SePay?** | Màn hình chờ tự gọi đối soát định kỳ, admin có nút "Đối soát SePay" gọi API tra cứu đơn; chỉ ghi nhận khi trạng thái CAPTURED và đúng số tiền. |
| **ROC-AUC 0,708 có thấp không?** | Chỉ dùng thông tin có lúc tạo chiến dịch (không dùng dữ liệu sau khi phát hành để tránh rò rỉ nhãn); so với các mốc LR 0,679, RF 0,701 thì tốt hơn; thử 21 đặc trưng đạt 0,725 nhưng cần quốc gia — không áp dụng được ở VN nên không triển khai. Kết quả là xác suất tham khảo, không phải ngưỡng đậu/rớt. |
| **Tại sao AI không tự khóa tài khoản gian lận?** | Nguyên tắc human-in-the-loop: mô hình có cảnh báo sai; cáo buộc gian lận ảnh hưởng uy tín người thật → AI chỉ tạo cảnh báo có bằng chứng, admin quyết định, mọi quyết định ghi nhật ký kiểm toán. |
| **Lĩnh vực Y tế / Môi trường không có trong Kickstarter thì sao?** | Chấm bằng trung bình các lĩnh vực đã học và hiển thị ghi chú rõ (`caveats`). |
| **Vì sao chủ dự án và người ủng hộ là 2 vai trò mà một người vẫn làm được cả hai?** | Vai trò quy định quyền tạo/quản lý chiến dịch; mọi tài khoản đăng nhập đều ủng hộ được. Người đại diện tổ chức không phải vai trò riêng mà là quan hệ tài khoản ↔ tổ chức. |
| **Admin có thể lạm quyền không?** | Thao tác nhạy cảm cần OTP; không tự đổi vai trò/xóa mình; không tự xét tổ chức mình đại diện; mọi thao tác ghi nhật ký kiểm toán trước/sau. |
| **Dữ liệu cá nhân được bảo vệ thế nào?** | Ẩn hash/email/SĐT khỏi API công khai; thông tin người nhận quà và tài khoản nhận hoàn chỉ chủ dự án/admin xem; audit che số tài khoản còn 4 số cuối; xuất CSV ẩn danh (`CDA-…`); hành vi AI chỉ ghi khi opt-in; có trang chính sách bảo mật. |
| **Triển khai thực tế thế nào?** | Docker Compose 6 dịch vụ; Terraform lên AWS (ECS Fargate, ALB, RDS, ECR) đã deploy và kiểm thử qua ALB, sau đó destroy để tránh chi phí; bật lại được bằng script. |

## PHỤ LỤC B — Phương án dự phòng khi demo trục trặc

- **Trang trắng / 502** sau khi build lại backend → `docker compose restart nginx`.
- **Không nhận được OTP** → xem log backend / hộp thư cấu hình SMTP; nếu không kịp, chỉ trình bày hộp nhập OTP rồi chuyển phần.
- **AI service tắt** → nói luôn: *"Đây chính là phương án dự phòng — gợi ý chuyển sang danh sách phổ biến, dự đoán không hiển thị, thanh toán vẫn chạy bình thường."*
- **Thanh toán SePay chậm** → chuyển sang ví demo, hoặc mở một biên nhận có sẵn trong seed.
- Luôn có sẵn ảnh chụp màn hình các trang chính (từ báo cáo giữa kỳ) để trình bày nếu mạng/Docker lỗi.
