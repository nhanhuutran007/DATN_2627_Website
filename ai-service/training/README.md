# Training (offline)

Pipeline huấn luyện chạy ngoài request/response path. Dữ liệu được chia sẻ qua
`training/datasets.py` (sinh deterministic ra `data/*.csv`) và có thể thay bằng
dữ liệu cào thật theo schema trong [`data/README.md`](../data/README.md).

## Thành phần

| File | Chức năng |
|------|-----------|
| `datasets.py` | Sinh/lười-load 3 dataset: campaigns, fraud, events (seed 42/43/44) |
| `train.py` | Huấn luyện success (LogisticRegression + RandomForest) & fraud (IsolationForest), split theo thời gian, ghi model + metadata vào `models/` |
| `evaluate_recommender.py` | Đánh giá offline recommender: Precision@K, Recall@K, NDCG@K (K=5,10), ghi `artifacts/recommender_metrics.json` |

## Chạy

```powershell
# từ thư mục ai-service
..\scripts\python-ai.cmd -m training.datasets            # tái sinh dataset
..\scripts\python-ai.cmd -m training.evaluate_recommender # metric recommender
..\scripts\python-ai.cmd -m training.train                # huấn luyện 2 model
```

## Lưu ý

- Chỉ thêm thư viện ML khi thực sự cần; pin version trong requirements khi đã
  đánh giá mô hình (`ruff` mặc định không thêm dependency tự động).
- `evaluate_recommender.py` dùng chính `RecommenderService` production nên số
  liệu phản ánh chính xác behaviour API; deterministic (không random ở runtime).

## Đánh giá

- Success: `models/success_metrics.json` (ROC-AUC, F1, Precision, Recall).
- Fraud: `models/fraud_metrics.json` (detection rate, false positive rate).
- Recommender: `artifacts/recommender_metrics.json` (Precision@5/10, Recall@5/10, NDCG@5/10).