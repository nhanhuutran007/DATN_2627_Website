# Models

Các mô hình dùng khi chạy được commit vào git để máy nào clone về cũng chấm bằng AI.
Thiếu file nào thì dịch vụ không lỗi mà lùi về phương án dự phòng (`fallback: true`).

| File | Dùng cho | Nguồn |
|------|----------|-------|
| `success_model.pkl` + `success_features.json` + `success_model.metadata.json` | Dự đoán khả năng thành công (GradientBoosting, 3 đặc trưng) | Kickstarter (Kaggle) |
| `success_metrics.json`, `success_diagnostics.png` | Số liệu đánh giá, biểu đồ hiệu chỉnh | Kickstarter |
| `fraud_classifier.pkl` + `fraud_score_reference.json` | Phát hiện rủi ro (HistGradientBoosting có giám sát, điểm quy về phân vị) | IEEE-CIS Fraud Detection (Kaggle) |
| `fraud_metrics.json` | Số liệu đánh giá mô hình rủi ro | IEEE-CIS |
| `category_similarity.json` + `recommender_metrics.json` | Độ tương đồng giữa lĩnh vực cho gợi ý, số liệu đánh giá | DonorsChoose (Kaggle) |

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
nên giữ nó chỉ làm điểm rủi ro nhiễu hơn so với dùng luật. Tương tự, độ tương đồng lĩnh vực tính
từ CSV tổng hợp không còn được dùng khi chạy.

## Tạo lại

Mô hình thật: chạy `notebooks/train_real_data_colab.ipynb` trên Google Colab (Run all), tải
`gopmam_models.zip` về và giải nén vào thư mục này. Hướng dẫn chi tiết ở `data/README.md`.

`python -m training.train` là pipeline cũ học từ dữ liệu tổng hợp; nó từ chối ghi đè mô hình
thật đang có trong thư mục này trừ khi thêm `--force`.

Cả hai cách đều phải dùng **đúng phiên bản thư viện ghim trong `requirements.txt`** (khác
phiên bản thì `joblib.load` có thể lỗi). Sau khi thay mô hình, khởi động lại AI service (mô hình
được nạp một lần và giữ trong bộ nhớ).

Chỉ nạp mô hình do dự án tạo và kiểm soát. Không dùng `joblib.load` hoặc `pickle.load` với file do người dùng tải lên.
