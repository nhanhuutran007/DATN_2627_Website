# Dataset & Hướng dẫn cào dữ liệu thật

Thư mục này chứa dataset cho 3 mô hình AI của đồ án. Mặc định dùng dữ liệu
**synthetic (sinh ngẫu nhiên có seed)** để pipeline chạy được ngay; để cải thiện
chất lượng, bạn có thể thay bằng dữ liệu **cào từ các nền tảng gây quỹ** theo
đúng schema contract bên dưới — không cần sửa code, chỉ cần thay file CSV.

## 1. Các file dữ liệu

| File | Mô hình | Dòng | Mô tả |
|------|---------|------|-------|
| `synthetic_campaigns.csv` | success (LogisticRegression/RandomForest) + RecIndex | 1000 | Features lúc tạo + nhãn `success` |
| `synthetic_fraud.csv` | fraud (IsolationForest) | 2040 (2% bất thường) | Feature matrix giao dịch + nhãn `is_anomaly` |
| `recommend_events.csv` | recommender (đánh giá Precision@K...) | 6000 (300 users) | Log tương tác user ↔ campaign theo thời gian |

Tất cả được tái sinh xác định bằng `training/datasets.py` (3 seed riêng:
campaigns=42, fraud=43, events=44). Lệnh tái sinh:

```powershell
# từ thư mục ai-service
..\scripts\python-ai.cmd -m training.datasets
```

> `data/raw/` và `data/processed/` bị `.gitignore` — không commit dữ liệu thô
> hay dữ liệu người dùng. Chỉ commit các file `*.csv` tổng hợp/anonymized.

## 2. Schema contract (bắt buộc khi thay dữ liệu thật)

### 2.1. Campaigns (success model + RecIndex)

Cột chuẩn (`CAMPAIGN_COLUMNS` trong `tools/scrape_campaigns.py`):

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| `campaign_id` | str | id duy nhất |
| `category` | str | 1 trong 6: Môi trường, Khởi nghiệp, Giáo dục, Y tế, Văn hóa, Công nghệ |
| `category_id` | int | 0–5 theo `app/services/catalog.py` |
| `goal_amount` | float | mục tiêu gây quỹ (VNĐ) |
| `duration_days` | int | số ngày mở gây quỹ |
| `profile_score` | float | 0–100, độ hoàn thiện hồ sơ chủ chiến dịch |
| `content_length` | int | độ dài nội dung giới thiệu (ký tự) |
| `image_count` | int | số ảnh |
| `has_video` | int | 0/1 có video hay không |
| `story_word_count` | int | số từ phần "câu chuyện" |
| `owner_campaign_count` | int | số chiến dịch trước đó của chủ dự án |
| `owner_credential_approved` | int | 0/1 định danh được kiểm duyệt |
| `has_budget_report` | int | 0/1 có công khai dự toán ngân sách |
| `early_views` | int | lượt xem trong 48h đầu |
| `early_backers` | int | người ủng hộ trong 48h đầu |
| `success` | int | **nhãn**: 0/1 đạt 100% mục tiêu lúc kết thúc |
| `launch_seq` | int | thứ tự thời gian tạo (dùng để split train/test) |

### 2.2. Fraud (IsolationForest)

Cột: `contribution_count_1h, failed_payment_count, total_payment_count,
device_shared_accounts, amount_z_score, ip_country_changes, new_account_days,
profile_change_frequency, is_anomaly`.

Dữ liệu thật phải **anonymized**: không chứa tên, email, số thẻ, IP thô (che hoặc
thay bằng giá trị gom cụm/quốc gia), chỉ giữ đặc trưng giao dịch.

### 2.3. Events (recommender)

Cột: `user_id, campaign_id, category, event_type, occurred_at` với
`event_type ∈ {VIEW, SEARCH, FOLLOW, CONTRIBUTE}` và `occurred_at` là ISO-8601
(sử dụng để split theo thời gian). User id nên giữ **giả danh** (hash).

## 3. Hướng dẫn cào dữ liệu thật

### 3.1. Nguyên tắc đạo đức & pháp lý (bắt buộc)

- Chỉ cào dữ liệu **công khai**, tuân thủ `robots.txt`, `terms of service`
  của nền tảng; gửi `User-Agent` rõ ràng và chờ 1–2s giữa các request.
- **Không cào dữ liệu thẻ, tài khoản riêng tư, thông tin y tế cá nhân**.
- Nếu nền tảng có API chính thức → dùng API đó (luôn tốt hơn HTML scraping).
- Chỉ dùng cho mục đích học thuật (đồ án); cam kết xoá khi nghiệm thu xong nếu
  điều khoản yêu cầu.

### 3.2. Nguồn gợi ý

- Quốc tế: Kickstarter (*API chính thức*, profile về dự án + câu chuyện rất
  giống schema), Indiegogo, GoFundMe (chỉ trang công khai), CrowdFunder.
- Việt Nam: ComOn, Vì Ngày Mai Tươi Sáng, Momo / MoMoStartup, Vững Việt Nam,
  hay sàn gây quỹ cộng đồng của các trường/đoàn hội (nếu có dữ liệu công khai).
- Lưu ý tiền tệ: quy đổi đơn vị (VNĐ / USD) về **một đơn vị** để `goal_amount`
  nhất quán.

### 3.3. Quy trình 5 bước

1. **Cào** JSON về `data/raw/` bằng tool tích hợp:

   ```powershell
   # từ thư mục ai-service
   ..\scripts\python-ai.cmd tools\scrape_campaigns.py fetch `
       --url "https://api.example.com/v1/campaigns" `
       --items-path "data.campaigns" --max-pages 20 --delay 1.5 `
       --out data/raw/source.json
   ```

2. **Chuẩn hoá** sang schema (nếu API khác cấu trúc → tạo file `--mapping`
   JSON `{"target_col": {"path": "a.b.c"}}`):

   ```powershell
   ..\scripts\python-ai.cmd tools\scrape_campaigns.py normalize `
       --in data/raw/source.json --items-path "data.campaigns" `
       --out data/processed/campaigns.csv

   # sự kiện tương tác (food cho recommender)
   ..\scripts\python-ai.cmd tools\scrape_campaigns.py normalize `
       --in data/raw/events.json --items-path "items" --events `
       --out data/processed/recommend_events.csv
   ```

   `--mapping` ví dụ cho API kiểu Kickstarter:
   `{"goal_amount": {"path": "goal"}, "raised_amount": {"path": "pledged"},
    "early_views": {"path": "stats.views"}, "has_video": {"path": "video"},
    "end_date": {"path": "deadline"}, "start_date": {"path": "launched_at"}}`

3. **Validate** cột đủ, không NaN, category nằm trong 6 nhãn:
   `profile_score`/`duration_days` thiếu sẽ bị điền nguồy giả; cân nhắc drop
   dòng thiếu label.

4. **Huấn luyện**:

   ```powershell
   ..\scripts\python-ai.cmd -m training.train
   ..\scripts\python-ai.cmd -m training.evaluate_recommender
   ```

5. **Đánh giá & lặp**: xem `models/success_metrics.json`,
   `models/fraud_metrics.json`, `artifacts/recommender_metrics.json`; nếu chỉ
   số tệ hơn synthetic là dấu hiệu dữ liệu nhiễu/lệch — tăng số mẫu, lọc, gán
   nhãn lại, hoặc huấn luyện lại với biến thể đặc trưng.

### 3.4. ⚠️ Tránh data leakage khi gán nhãn `success`

1. Chỉ **"features"** dùng dữ liệu có **tại thời điểm khởi tạo** chiến dịch
   (48h đầu). `early_views`/`early_backers` phải là giá trị đo *ngay sau khi
   launch*, không phải tổng cuối kỳ.
2. **Nhãn `success`** phải đo ở **thời điểm kết thúc** (kết quả *trong tương
   lai* so với features). Tốt nhất: cào 2 snapshot — snapshot A lúc tạo, snapshot
   B lúc kết thúc — rồi ghép cột features (A) + label (B).
3. Nếu cào các dự án **đã đóng**, `success` lấy từ tổng quyên góp cuối ≥ mục
   tiêu. Không được dùng thông tin kết thúc để điền vào features.
4. `launch_seq` phải theo thời gian **tạo thật** (không phải thứ tự cào) vì
   `train.py` split theo thứ tự này.

### 3.5. Gợi ý cho module 4.1 (demo nghiệm thu)

- Gây quỹ ~100–300 dự án/người ủng hộ đã **hoàn tất** đủ đẹp cho success model.
- Log sự kiện (VIEW/SEARCH/FOLLOW/CONTRIBUTE) với timestamp để chạy
  `evaluate_recommender.py` — kịch bản demo cần số liệu Precision@K in ra bảng.

## 4. Lệnh liên quan

```powershell
# tái sinh toàn bộ dataset synthetic
..\scripts\python-ai.cmd -m training.datasets
# đánh giá recommender offline (ghi artifacts/recommender_metrics.json)
..\scripts\python-ai.cmd -m training.evaluate_recommender
# huấn luyện lại success + fraud model (sử dụng CSV trong thư mục data/)
..\scripts\python-ai.cmd -m training.train
# kiểm tra lint + test
..\scripts\python-ai.cmd -m ruff check . 
..\scripts\python-ai.cmd -m pytest -q
```