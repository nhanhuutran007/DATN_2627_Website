"""Offline training pipeline for the crowdfunding AI service.

Trains LogisticRegression / RandomForest success models and an IsolationForest
fraud model, evaluates them on a time-ordered split and writes evaluated
artifacts + metadata into ``models/``. Dataset generation is shared with other
tools via :mod:`training.datasets` (deterministic synthetic CSVs under
``data/``; replace them with scraped data later, see ``data/README.md``).

Run from the ``ai-service`` directory either as:

    python -m training.train
    python training/train.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import UTC, datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.catalog import FRAUD_FEATURES, SUCCESS_FEATURES  # noqa: E402
from training.datasets import (  # noqa: E402
    CAMPAIGNS_CSV,
    FRAUD_CONTAMINATION,
    FRAUD_CSV,
    generate_campaigns,
    generate_fraud_frame,
    write_missing,
)

SEED = 42
MODEL_VERSION = "2026.09.1"
TRAIN_FRACTION = 0.8

MODELS_DIR = ROOT / "models"


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat()


def confusion_numbers(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, int]:
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}


def build_features(frame: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    x = frame[SUCCESS_FEATURES].to_numpy(dtype=float)
    y = frame["success"].to_numpy(dtype=float)
    return x, y


def train_success_models() -> dict:
    frame = generate_campaigns()
    CAMPAIGNS_CSV.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(CAMPAIGNS_CSV, index=False, encoding="utf-8")

    x, y = build_features(frame)
    seq = frame["launch_seq"].to_numpy()
    threshold = seq < int(TRAIN_FRACTION * len(frame))
    x_train, x_test = x[threshold], x[~threshold]
    y_train, y_test = y[threshold], y[~threshold]

    models = {
        "logistic_regression": LogisticRegression(max_iter=1000, random_state=SEED),
        "random_forest": RandomForestClassifier(n_estimators=200, random_state=SEED, n_jobs=1),
    }
    evaluation: dict[str, dict] = {}
    fitted: dict[str, object] = {}
    for name, model in models.items():
        model.fit(x_train, y_train)
        fitted[name] = model
        y_pred = model.predict(x_test)
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(x_test)[:, 1]
            roc_auc = float(roc_auc_score(y_test, proba))
        else:
            roc_auc = float(roc_auc_score(y_test, y_pred))
        evaluation[name] = {
            "roc_auc": roc_auc,
            "f1": float(f1_score(y_test, y_pred)),
            "precision": float(precision_score(y_test, y_pred)),
            "recall": float(recall_score(y_test, y_pred)),
            "confusion_matrix": confusion_numbers(y_test, y_pred),
        }

    best_name = max(evaluation, key=lambda name: evaluation[name]["roc_auc"])
    best = fitted[best_name]
    best_pred = best.predict(x_test)
    if hasattr(best, "predict_proba"):
        best_proba = best.predict_proba(x_test)[:, 1]
        best_auc = float(roc_auc_score(y_test, best_proba))
    else:
        best_auc = float(roc_auc_score(y_test, best_pred))

    chosen_metrics = {
        "roc_auc": best_auc,
        "f1": float(f1_score(y_test, best_pred)),
        "precision": float(precision_score(y_test, best_pred)),
        "recall": float(recall_score(y_test, best_pred)),
        "confusion_matrix": confusion_numbers(y_test, best_pred),
    }

    feature_impact: dict[str, dict[str, float]] = {}
    for idx, name in enumerate(SUCCESS_FEATURES):
        column = x_train[:, idx]
        if np.std(column) == 0.0 or np.std(y_train) == 0.0:
            feature_impact[name] = {"corr": 0.0}
            continue
        corr = float(np.corrcoef(column, y_train)[0, 1])
        feature_impact[name] = {"corr": round(corr, 6)}

    train_pct = round(TRAIN_FRACTION * 100)
    test_pct = round((1 - TRAIN_FRACTION) * 100)
    split_semantics_vn = (
        f"Tập train là {train_pct}% đầu tiên theo thứ tự thời gian tạo dự án "
        f"(những dự án 'trước'), tập test là {test_pct}% xuất hiện sau"
        f" ('sau'), mô phỏng việc dự đoán các dự án trong tương lai."
    )
    metrics = {
        "model_version": MODEL_VERSION,
        "best_model": best_name,
        "chosen_by": "roc_auc",
        "trained_at": now_iso(),
        "dataset": {
            "rows": int(len(frame)),
            "file": str(CAMPAIGNS_CSV.relative_to(ROOT)),
            "sha256": sha256_of(CAMPAIGNS_CSV),
            "size_bytes": CAMPAIGNS_CSV.stat().st_size,
        },
        "features": list(SUCCESS_FEATURES),
        "split": {
            "strategy": "time_order",
            "train_rows": int(threshold.sum()),
            "test_rows": int((~threshold).sum()),
            "threshold": TRAIN_FRACTION,
            "semantics": split_semantics_vn,
        },
        "models": evaluation,
        "chosen": chosen_metrics,
        "feature_impact": feature_impact,
    }

    (MODELS_DIR / "success_lr.pkl").parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(fitted["logistic_regression"], MODELS_DIR / "success_lr.pkl")
    joblib.dump(fitted["random_forest"], MODELS_DIR / "success_rf.pkl")
    joblib.dump(best, MODELS_DIR / "success_model.pkl")
    (MODELS_DIR / "success_metrics.json").write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    (MODELS_DIR / "success_features.json").write_text(
        json.dumps(SUCCESS_FEATURES, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return metrics


def train_fraud_model() -> dict:
    frame = generate_fraud_frame()
    FRAUD_CSV.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(FRAUD_CSV, index=False, encoding="utf-8")
    x = frame[FRAUD_FEATURES].to_numpy(dtype=float)
    labels = frame["is_anomaly"].to_numpy()

    scaler = StandardScaler()
    x_scaled = scaler.fit_transform(x)
    forest = IsolationForest(n_estimators=200, contamination=FRAUD_CONTAMINATION, random_state=SEED)
    forest.fit(x_scaled)
    predictions = forest.predict(x_scaled)

    known_anomalies = labels == 1
    detected = (predictions == -1) & known_anomalies
    normal_rows = ~known_anomalies
    false_positives = (predictions == -1) & normal_rows

    metrics = {
        "model_version": MODEL_VERSION,
        "model": "isolation_forest",
        "trained_at": now_iso(),
        "contamination": FRAUD_CONTAMINATION,
        "n_estimators": forest.n_estimators,
        "scaler": "standard_scaler",
        "rows": int(len(frame)),
        "known_anomalies": int(known_anomalies.sum()),
        "detection_rate": round(float(detected.sum() / max(1, known_anomalies.sum())), 6),
        "false_positive_rate": round(float(false_positives.sum() / max(1, normal_rows.sum())), 6),
        "features": list(FRAUD_FEATURES),
        "generation": "synthetic (2% anomalies: high-volume, many-failed, agent clusters)",
    }

    joblib.dump(forest, MODELS_DIR / "fraud_isolation.pkl")
    joblib.dump(scaler, MODELS_DIR / "fraud_scaler.pkl")
    (MODELS_DIR / "fraud_metrics.json").write_text(
        json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return metrics


def write_success_metadata(metrics: dict) -> None:
    metadata = {
        "model_version": MODEL_VERSION,
        "feature_schema_version": "1.0.0",
        "trained_at": metrics["trained_at"],
        "features": metrics["features"],
        "best_model": metrics["best_model"],
    }
    (MODELS_DIR / "success_model.metadata.json").write_text(
        json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def write_model_readme(metrics: dict, fraud_metrics: dict) -> None:
    payload = {
        "model_version": MODEL_VERSION,
        "trained_at": now_iso(),
        "artifacts": {
            "success_model": "models/success_model.pkl",
            "success_metrics": "models/success_metrics.json",
            "success_features": "models/success_features.json",
            "fraud_model": "models/fraud_isolation.pkl",
            "fraud_scaler": "models/fraud_scaler.pkl",
            "fraud_metrics": "models/fraud_metrics.json",
        },
        "features": metrics["features"],
        "dataset": metrics["dataset"],
        "success_metrics": {
            "best_model": metrics["best_model"],
            "chosen": metrics["chosen"],
            "models": metrics["models"],
        },
        "fraud_metrics": {
            "contamination": fraud_metrics["contamination"],
            "detection_rate": fraud_metrics["detection_rate"],
            "false_positive_rate": fraud_metrics["false_positive_rate"],
        },
    }
    (MODELS_DIR / "README.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def main() -> None:
    write_missing()
    success_metrics = train_success_models()
    fraud_metrics = train_fraud_model()
    write_success_metadata(success_metrics)
    write_model_readme(success_metrics, fraud_metrics)

    lr = success_metrics["models"]["logistic_regression"]
    rf = success_metrics["models"]["random_forest"]
    chosen = success_metrics["chosen"]
    print("== Báo cáo huấn luyện (training report) ==")
    print(f"Nhãn model version: {MODEL_VERSION}")
    print(f"Dữ liệu campaign: {success_metrics['dataset']['rows']} dòng -> {CAMPAIGNS_CSV.name}")
    print(f"Split: {success_metrics['split']['semantics']}")
    print(f"LogisticRegression - ROC-AUC={lr['roc_auc']:.4f} F1={lr['f1']:.4f} "
          f"Precision={lr['precision']:.4f} Recall={lr['recall']:.4f}")
    print(f"RandomForest       - ROC-AUC={rf['roc_auc']:.4f} F1={rf['f1']:.4f} "
          f"Precision={rf['precision']:.4f} Recall={rf['recall']:.4f}")
    print(f"Model được chọn: {success_metrics['best_model']} "
          f"(ROC-AUC={chosen['roc_auc']:.4f}, F1={chosen['f1']:.4f})")
    print(f"Dữ liệu fraud: {fraud_metrics['rows']} dòng, anomaly được phát hiện "
          f"{fraud_metrics['detection_rate'] * 100:.1f}%, "
          f"false positive {fraud_metrics['false_positive_rate'] * 100:.2f}%")
    print("Đã ghi: models/*.pkl, success_metrics.json, success_features.json, "
          "success_model.metadata.json, fraud_metrics.json, README.json")


if __name__ == "__main__":
    main()