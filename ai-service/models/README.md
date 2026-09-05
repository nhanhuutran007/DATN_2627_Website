# Models

Đặt model đã duyệt tại thư mục này khi triển khai. File `.pkl` và `.joblib` bị bỏ qua mặc định để tránh vô tình commit artifact lớn hoặc không rõ nguồn gốc.

Mỗi model nên có metadata cùng tên, ví dụ `success_model.metadata.json`, chứa tối thiểu:

```json
{
  "model_version": "success-2026-09-05.1",
  "feature_schema_version": "1.0.0",
  "trained_at": "2026-09-05T00:00:00Z"
}
```

Chỉ nạp model do dự án tạo và kiểm soát. Không dùng `joblib.load` hoặc `pickle.load` với file do người dùng tải lên.

Các thư viện `joblib`, `scikit-learn`, `numpy` và `pandas` chưa nằm trong bộ cài mặc định vì scaffold chưa có model. Hãy thêm đúng phiên bản đã dùng khi huấn luyện vào `requirements.txt` trước khi bật `AI_LOAD_MODEL=true`.
