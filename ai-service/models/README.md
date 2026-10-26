# Models

Ba mô hình dùng khi chạy được commit vào git để máy nào clone về cũng chấm bằng AI:

| File | Dùng cho |
|------|----------|
| `fraud_isolation.pkl` + `fraud_scaler.pkl` | Phát hiện rủi ro (IsolationForest + StandardScaler) |
| `success_model.pkl` | Dự đoán khả năng thành công (mô hình có ROC-AUC tốt nhất) |

Các `.pkl` khác (vd. `success_lr.pkl`, `success_rf.pkl`) là sản phẩm phụ khi huấn luyện và vẫn bị bỏ qua.
Thiếu file mô hình thì dịch vụ không lỗi mà lùi về luật/công thức dự phòng (`fallback: true`).

## Tạo lại

Từ thư mục `ai-service`, trong môi trường có **đúng phiên bản thư viện ghim trong `requirements.txt`**
(khác phiên bản thì `joblib.load` có thể lỗi):

```bash
python -m training.train
```

Dữ liệu tổng hợp sinh với seed cố định nên kết quả lặp lại được. Số liệu đánh giá được ghi vào
`fraud_metrics.json`, `success_metrics.json` và `README.json`. Sau khi thay mô hình, khởi động lại
AI service (mô hình được nạp một lần và giữ trong bộ nhớ).

Chỉ nạp mô hình do dự án tạo và kiểm soát. Không dùng `joblib.load` hoặc `pickle.load` với file do người dùng tải lên.
