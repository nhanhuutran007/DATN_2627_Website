# Dữ liệu huấn luyện

Các mô hình AI của đồ án được huấn luyện trên **dữ liệu công khai thật** bằng notebook
[`notebooks/train_real_data_colab.ipynb`](../notebooks/train_real_data_colab.ipynb) chạy trên Google
Colab. Notebook tự tải dữ liệu từ Kaggle và xuất đúng các file `models/` mà dịch vụ đang đọc — repo
không lưu dữ liệu thô.

`data/raw/` bị `.gitignore` (chỉ giữ `.gitkeep`): dùng để cất bản sao notebook đã điền token Kaggle
hoặc dữ liệu tải tạm. Không commit dữ liệu thô hay dữ liệu người dùng.

## Mô hình và dữ liệu

| Mô hình | Dữ liệu | Đặc trưng / cách làm |
|---------|---------|----------------------|
| Dự đoán thành công | Kickstarter Projects (`kemical/kickstarter-projects`, `ks-projects-201801.csv`, 15 cột) | 6 đặc trưng có lúc tạo chiến dịch: `category_id`, `goal_amount` (USD → VNĐ), `duration_days`, `name_words`, `launch_month`, `launch_weekday`; so với mốc đoán lớp đa số, Logistic Regression, Random Forest và bộ 3 đặc trưng cũ; kiểm định chéo theo thời gian (chi tiết ở [`models/README.md`](../models/README.md)) |
| Phát hiện bất thường | IEEE-CIS Fraud Detection (cuộc thi `ieee-fraud-detection`, phải chấp nhận luật trên Kaggle) | 5 đặc trưng của `FRAUD_FEATURES` tính từ lịch sử từng khách; HistGradientBoosting có giám sát theo nhãn `isFraud` (Isolation Forest không giám sát đã thử, ROC-AUC 0,491, bị loại) |
| Gợi ý (độ tương đồng lĩnh vực) | DonorsChoose.org (`hanselhansel/donorschoose`, bản sao bộ DonorsChoose.org 2018) | cosine giữa lĩnh vực theo người quyên góp chung → `models/category_similarity.json` (`RecIndex` đọc file này; thiếu file thì chỉ ghép đúng lĩnh vực) |

## Cách huấn luyện lại

1. Tạo token Kaggle (Kaggle → Settings → API) và chấp nhận luật cuộc thi IEEE-CIS.
2. Mở notebook trên Colab, điền token ở mục 1 (hoặc lưu trong *Colab Secrets* tên `KAGGLE_API_TOKEN`),
   chọn *Runtime → Run all*. Lần đầu phiên tự khởi động lại sau khi cài đúng phiên bản thư viện
   trong `requirements.txt` — bấm *Run all* thêm lần nữa.
3. Kiểm tra kết quả in ra (với mô hình thành công: dòng so sánh với bộ 3 đặc trưng cũ). Tải
   `gopmam_models.zip`, chép các file của mô hình muốn thay vào `ai-service/models/`.
4. `docker compose -f infra/compose.yaml restart ai-service` (thư mục `models/` được mount vào
   container, không cần build lại). `GET /api/v1/health` cho biết phiên bản đang nạp.

## Nguyên tắc dữ liệu (dùng khi bảo vệ)

- **Tránh rò rỉ nhãn:** đặc trưng chỉ lấy thông tin có **tại thời điểm tạo chiến dịch / phát sinh
  giao dịch**. Không dùng số tiền đã gây được, số người ủng hộ cuối kỳ (`pledged`, `backers`,
  `usd_pledged*` của Kickstarter).
- **Chia theo thời gian:** 80% dự án/giao dịch cũ hơn để huấn luyện, 20% mới hơn để kiểm tra — mô
  phỏng dự đoán tương lai, không xáo trộn ngẫu nhiên.
- **Luôn so với mốc đơn giản** và báo cáo nhiều chỉ số (ROC-AUC, PR-AUC, Brier…), không chỉ Accuracy.
- **Độ lệch miền:** dữ liệu Mỹ/quốc tế còn nền tảng chạy ở Việt Nam → kết quả AI chỉ để tham khảo,
  con người quyết định.
- **Ẩn danh:** dữ liệu giao dịch chỉ giữ đặc trưng tổng hợp; không có tên, email, số thẻ, IP thô.
  Khi nền tảng có dữ liệu riêng đủ lớn (vài trăm chiến dịch đã kết thúc), có thể huấn luyện mô hình
  riêng theo cùng các nguyên tắc trên.

## Lệnh kiểm tra

```powershell
# từ thư mục ai-service
..\scripts\python-ai.cmd -m ruff check .
..\scripts\python-ai.cmd -m pytest -q
```
