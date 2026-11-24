# Models

Các mô hình dùng khi chạy được commit vào git để máy nào clone về cũng chấm bằng AI.
Thiếu file nào thì dịch vụ không lỗi mà lùi về phương án dự phòng (`fallback: true`).

| File | Dùng cho | Nguồn |
|------|----------|-------|
| `success_model.pkl` + `success_features.json` + `success_model.metadata.json` | Dự đoán khả năng thành công (`2026.11-real.2`, 05/11/2026: GradientBoosting, 6 đặc trưng — xem dưới) | Kickstarter (Kaggle) |
| `success_metrics.json`, `success_diagnostics.png` | Số liệu đánh giá, biểu đồ hiệu chỉnh | Kickstarter |
| `fraud_classifier.pkl` + `fraud_score_reference.json` | Phát hiện rủi ro (`2026.10-real.1`; HistGradientBoosting có giám sát, điểm quy về phân vị) | IEEE-CIS Fraud Detection (Kaggle) |
| `fraud_metrics.json` | Số liệu đánh giá mô hình rủi ro | IEEE-CIS |
| `category_similarity.json` + `recommender_metrics.json` | Độ tương đồng giữa lĩnh vực cho gợi ý, số liệu đánh giá | DonorsChoose (Kaggle) |

## Đặc trưng của mô hình dự đoán thành công

| Đặc trưng | Từ Kickstarter (`ks-projects-201801.csv`, 15 cột) | Ở Góp Mầm | Từ bản |
|---|---|---|---|
| `category_id` | `main_category` gộp về 6 lĩnh vực | lĩnh vực (`aiCategoryId`) | `2026.10-real.1` |
| `goal_amount` | `usd_goal_real` × 25.000 | mục tiêu (VNĐ) | `2026.10-real.1` |
| `duration_days` | `deadline` − `launched` | ngày kết thúc − ngày bắt đầu | `2026.10-real.1` |
| `name_words` | số từ trong `name` | số từ trong tên (`countWords`) | `2026.11-real.2` |
| `launch_month` | tháng của `launched` | tháng bắt đầu, giờ Việt Nam (`launchCalendar`) | `2026.11-real.2` |
| `launch_weekday` | thứ của `launched` (0 = thứ Hai) | thứ bắt đầu, giờ Việt Nam | `2026.11-real.2` |

Không dùng `pledged`, `backers`, `usd_pledged*` (kết quả cuối kỳ, rò rỉ nhãn) và `country`/`is_us`
(Góp Mầm luôn ở Việt Nam). Backend luôn gửi đủ 6 trường; `ai-service` đọc thứ tự cột từ
`success_features.json` và tra theo tên, nên chạy được với cả mô hình 3 lẫn 6 đặc trưng — thay file
là xong, không cần sửa code.

**Giải thích theo từng chiến dịch** (`_explain` trong `app/services/predictor.py`): với mỗi đặc
trưng, so xác suất ở giá trị của chính chiến dịch với xác suất trung bình khi thay giá trị đó bằng
các mức thường gặp (`REFERENCE_GRIDS`), phần còn lại giữ nguyên. Chênh lệch dương = giá trị hiện
tại đang giúp, âm = đang kéo xuống; `weight` của mỗi yếu tố chính là chênh lệch xác suất đó (giao
diện hiện thành "+5 điểm" / "−8 điểm") và yếu tố lệch dưới 0,5 điểm không được nêu. Cách cũ lấy
hướng từ tương quan chung với nhãn nên báo y hệt cho mọi chiến dịch (mục tiêu luôn "giảm", tên
luôn "tăng") — sai với đặc trưng không đơn điệu như lĩnh vực, độ dài tên, tháng/thứ.

**Kết quả `2026.11-real.2`** (tập test 66.335 dự án ra mắt sau cùng): ROC-AUC **0,708** (bộ 3 đặc trưng
cũ, cùng thuật toán và cách chia: 0,685 → **+0,023**), PR-AUC 0,605, Brier 0,213 (cũ 0,219), kiểm
định chéo theo thời gian 0,689 ± 0,018. Tương quan với nhãn: `name_words` +0,107 (mạnh ngang
`duration_days` −0,109), `launch_month` −0,014, `launch_weekday` −0,011 — tên chiến dịch đủ ý đóng
góp chính, tháng/thứ chỉ phụ.

Khi huấn luyện lại, xem `previous_feature_set.roc_auc_gain` trong `success_metrics.json`: nếu không
dương (đặc trưng mới không cải thiện trên tập test) thì giữ bộ file cũ. Bản `2026.11-real.2` chỉ thay
5 file `success_*`; file gian lận/gợi ý trong zip của lần chạy đó giống bản cũ (chỉ khác nhãn phiên
bản/thời điểm) nên giữ nguyên `2026.10-real.1`.

## Cách đọc xác suất dự đoán thành công

Xác suất tuyệt đối của mô hình thường nằm khoảng 20–65% và hiếm khi vượt 70%. Đó là đặc điểm của
dữ liệu, không phải lỗi:

- Chỉ ~40% dự án Kickstarter trong dữ liệu đạt mục tiêu (`dataset.success_rate` trong
  `success_metrics.json`), nên điểm xuất phát của mọi dự án đã dưới 50%.
- Mô hình chỉ có 6 đặc trưng biết được lúc tạo chiến dịch, ROC-AUC 0,708: phân biệt được xu hướng
  nhưng xác suất dồn về gần tỷ lệ nền.
- Mục tiêu lớn và thời gian kêu gọi dài đều kéo xác suất xuống; tên quá ngắn cũng vậy. Quét thử
  `2026.11-real.2` (tên 7 từ, bắt đầu thứ Hai tháng 11): ~70% chỉ đạt khi lĩnh vực Văn hóa/Công nghệ,
  mục tiêu ≤ 10 triệu ₫ và kêu gọi ~15 ngày; mục tiêu 100 triệu ₫ trong 60 ngày cho khoảng 24–44%
  tùy lĩnh vực. Cùng chiến dịch Giáo dục 50 triệu/30 ngày: tên 2 từ 28%, 4 từ 32%, 7–10 từ 39–41%;
  theo tháng 34–40% (tháng 7–8 thấp nhất); thứ trong tuần gần như không đổi (38–41%).

Vì vậy giao diện hiển thị kèm **mức tương đối** so với tỷ lệ nền (lệch ≥ +15 điểm: "Thuộc nhóm tốt",
≥ +5: "Cao hơn mặt bằng", trong ±5: "Ngang mặt bằng", còn lại: "Thấp hơn mặt bằng"), thay vì đọc
như ngưỡng đậu/rớt 50%.

Lĩnh vực của nền tảng được quy về 6 mã của mô hình theo từ khóa không dấu (`aiCategoryId` trong
`backend/src/modules/ai/ai.service.ts`): "Văn hóa nghệ thuật" → Văn hóa, "Nông nghiệp" → Khởi nghiệp
(lúc huấn luyện Food/Crafts/Fashion được gộp vào nhóm này). Bộ gợi ý dùng cùng bảng từ khóa
(`canonical_category` trong `app/services/catalog.py`) để tra độ tương đồng lĩnh vực.

Môi trường và Y tế không có mẫu trong Kickstarter. Vì `category_id` là mã số nguyên, mô hình cây
sẽ âm thầm chấm hai lĩnh vực này như lĩnh vực có mã kề bên (Môi trường như Khởi nghiệp — nhóm
thấp nhất, Y tế như Giáo dục). Để tránh sai lệch đó, `ai-service` chấm chúng bằng **trung bình
trên các lĩnh vực mô hình đã học** (đọc từ `dataset.category_mapping`), không nêu lĩnh vực thành
yếu tố ảnh hưởng và trả kèm `caveats` để giao diện ghi rõ.

## Tự học từ dự án Góp Mầm đã kết thúc

Mỗi lần dự đoán, backend gửi kèm các dự án đã kết thúc (`app/services/platform_learning.py`, không
cần huấn luyện lại):

1. **Hiệu chỉnh mức chung** theo các dự án tương tự (lĩnh vực, mục tiêu, thời hạn gần nhau).
2. **Học thêm từ nội dung** mà Kickstarter không có: *có video*, *từ 3 ảnh trở lên*, *câu chuyện
   từ 300 từ trở lên*. Hồi quy logistic có phạt (ridge) trên phần chênh lệch giữa kết quả thật và
   mô hình gốc; mỗi thông tin cần **≥ 15 dự án ở mỗi nhóm có/không** mới được học (ít hơn thì báo
   `insufficient_data`, không ảnh hưởng), tổng điều chỉnh tối đa ±0,75 log-odds. Thông tin học được
   hiện thành yếu tố giải thích như các đặc trưng khác.

   **Thử nghiệm bằng dữ liệu mô phỏng** (`backend/scripts/seed-ai-history.ts`): 150 dự án có nội
   dung ngẫu nhiên với ảnh hưởng **tự đặt** (log-odds) video +0,8, từ 3 ảnh +0,5, câu chuyện ≥300
   từ +0,6. Trên bộ đang nạp (150 mô phỏng + 9 dự án thật), AI học được ≈ +0,96 / +0,23 / −0,26 —
   video đúng, câu chuyện sai chiều vì trong mẫu này dự án câu chuyện dài tình cờ đạt ít hơn
   (57,8% so với 64,0%). Lặp 20 lần với dữ liệu sinh cùng quy luật: 150 dự án học trung bình
   +0,66 / +0,36 / +0,45 (dao động ±0,3, sai chiều 0 / 4 / 3 lần trên 20); 1.500 dự án
   +0,72 / +0,39 / +0,54 (±0,1, không lần nào sai chiều). Kết luận: cơ chế học lại đúng quy luật
   khi đủ dữ liệu; 150 dự án mới cho xu hướng, chưa đủ để tin từng con số.

Thời hạn gây quỹ tối đa **60 ngày** (như Kickstarter): gợi ý thời hạn chỉ trong 30–60 ngày, dự án
cũ vượt 60 ngày được trả kèm `caveats` vì ít có trong dữ liệu huấn luyện.

## Dữ liệu chấm rủi ro ở cấp chiến dịch

Mô hình gian lận học trên đặc trưng của **một khách hàng** (IEEE-CIS). Khi quét một chiến dịch,
backend (`buildCampaignFraudFeatures`) giữ đúng nghĩa đó ở những chỗ quan trọng:

- `contribution_count_1h` = số giao dịch nhiều nhất của **cùng một tài khoản** vào chiến dịch
  trong 1 giờ. Đếm cả chiến dịch thì chiến dịch được chia sẻ rộng (6 người ủng hộ trong một giờ)
  sẽ bị gắn cờ rủi ro cao.
- `amount_z_score` = độ lệch của khoản lớn nhất tính trên **log số tiền**. Số tiền ủng hộ lệch
  phải mạnh nên tính trên số tiền thô sẽ gắn cờ oan các khoản hào phóng hợp lệ.
- `total_payment_count`, `failed_payment_count` là tổng của chiến dịch (phục vụ luật tỷ lệ thất
  bại); đây là điểm còn lệch so với lúc huấn luyện, nên mô hình chỉ chiếm 25% điểm.

## Phương án dự phòng

Mỗi tính năng tự chuyển sang phương án không dùng học máy khi file mô hình thiếu hoặc nạp lỗi
(vd. lệch phiên bản scikit-learn). `GET /api/v1/health` cho biết tính năng nào đang chạy bằng
mô hình (`models.*.loaded`, `model_status: ready | degraded`).

| Tính năng | Khi thiếu mô hình | Phản hồi |
|-----------|-------------------|----------|
| Dự đoán thành công | Công thức kinh nghiệm: xuất phát từ tỷ lệ thành công nền của dữ liệu huấn luyện (≈ 40%), cộng/trừ log-odds theo mục tiêu, thời gian, hồ sơ, ảnh, video, ngân sách, xác minh, người ủng hộ sớm. Chiều tác động khớp mô hình thật (mục tiêu lớn hơn, kêu gọi dài hơn → giảm) | `fallback: true`, `model: null`; giao diện ghi "ước lượng sơ bộ" |
| Phát hiện gian lận | Chỉ luật nghiệp vụ | `method: "RULE"`, `fallback: true` |
| Gợi ý | Chỉ ghép đúng lĩnh vực người dùng đã chọn/tương tác, kèm độ phổ biến | `source: "CONTENT"` thay vì `"COLLABORATIVE"` |

Khi cả dịch vụ AI không phản hồi, backend tự xử lý: gợi ý xếp theo độ phổ biến
(`POPULAR_FALLBACK`), ước lượng trả `available: false`, quét rủi ro dùng luật trong
`risk-alert.service.ts`.

Isolation Forest (không giám sát) từng là tầng dự phòng cho phát hiện gian lận nhưng đã bỏ:
trên dữ liệu thật nó chỉ đạt ROC-AUC 0,491 (ngang đoán ngẫu nhiên), lại học từ dữ liệu tổng hợp,
nên giữ nó chỉ làm điểm rủi ro nhiễu hơn so với dùng luật. Pipeline cũ học từ dữ liệu tổng hợp
(`training/`, CSV tổng hợp, độ tương đồng lĩnh vực tính từ CSV) đã gỡ khỏi repo ngày 05/11/2026.

## Tạo lại

Chạy `notebooks/train_real_data_colab.ipynb` trên Google Colab (Run all), tải `gopmam_models.zip`
về và chép các file cần thay vào thư mục này. Hướng dẫn chi tiết ở `data/README.md`.

Notebook phải dùng **đúng phiên bản thư viện ghim trong `requirements.txt`** (khác phiên bản thì
`joblib.load` có thể lỗi). Sau khi thay mô hình, khởi động lại AI service (mô hình
được nạp một lần và giữ trong bộ nhớ).

Chỉ nạp mô hình do dự án tạo và kiểm soát. Không dùng `joblib.load` hoặc `pickle.load` với file do người dùng tải lên.
