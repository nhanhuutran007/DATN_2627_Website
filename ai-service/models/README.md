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
| `fraud_isolation.pkl` + `fraud_scaler.pkl` | Dự phòng khi thiếu `fraud_classifier.pkl` (IsolationForest) | Dữ liệu tổng hợp |

## Tạo lại

Mô hình thật: chạy `notebooks/train_real_data_colab.ipynb` trên Google Colab (Run all), tải
`gopmam_models.zip` về và giải nén vào thư mục này. Hướng dẫn chi tiết ở `data/README.md`.

Mô hình dự phòng IsolationForest: từ thư mục `ai-service` chạy `python -m training.train`.
Lệnh này cũng ghi đè `success_model.pkl` và các file số liệu bằng mô hình học từ dữ liệu tổng
hợp, nên chỉ chép lại `fraud_isolation.pkl` + `fraud_scaler.pkl` nếu không muốn mất mô hình thật.

Cả hai cách đều phải dùng **đúng phiên bản thư viện ghim trong `requirements.txt`** (khác
phiên bản thì `joblib.load` có thể lỗi). Sau khi thay mô hình, khởi động lại AI service (mô hình
được nạp một lần và giữ trong bộ nhớ).

Chỉ nạp mô hình do dự án tạo và kiểm soát. Không dùng `joblib.load` hoặc `pickle.load` với file do người dùng tải lên.
