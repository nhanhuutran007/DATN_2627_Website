"""Offline training pipeline for the crowdfunding AI service.

Trains LogisticRegression / RandomForest success models on the deterministic
synthetic campaigns (:mod:`training.datasets`), evaluates them on a time-ordered
split and writes the artifacts + metadata into ``models/``. This is the baseline
from before real data was used; the models served today come from
``notebooks/train_real_data_colab.ipynb``, so the script refuses to overwrite them
unless ``--force`` is given.

Run from the ``ai-service`` directory either as:

    python -m training.train [--force]
    python training/train.py [--force]
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
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.services.catalog import SUCCESS_FEATURES  # noqa: E402
from training.datasets import (  # noqa: E402
    CAMPAIGNS_CSV,
    generate_campaigns,
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


def write_model_readme(metrics: dict) -> None:
    payload = {
        "model_version": MODEL_VERSION,
        "trained_at": now_iso(),
        "artifacts": {
            "success_model": "models/success_model.pkl",
            "success_metrics": "models/success_metrics.json",
            "success_features": "models/success_features.json",
        },
        "features": metrics["features"],
        "dataset": metrics["dataset"],
        "success_metrics": {
            "best_model": metrics["best_model"],
            "chosen": metrics["chosen"],
            "models": metrics["models"],
        },
    }
    (MODELS_DIR / "README.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def served_model_version() -> str | None:
    metadata_path = MODELS_DIR / "success_model.metadata.json"
    if not metadata_path.is_file():
        return None
    version = json.loads(metadata_path.read_text(encoding="utf-8")).get("model_version")
    return str(version) if version is not None else None


def main() -> None:
    current = served_model_version()
    if current and current != MODEL_VERSION and "--force" not in sys.argv[1:]:
        sys.exit(
            f"models/ đang chứa mô hình {current} (huấn luyện trên dữ liệu thật). "
            "Script này sẽ ghi đè bằng mô hình học từ dữ liệu tổng hợp; "
            "thêm --force nếu thật sự muốn."
        )
    write_missing()
    success_metrics = train_success_models()
    write_success_metadata(success_metrics)
    write_model_readme(success_metrics)

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
    print("Đã ghi: models/*.pkl, success_metrics.json, success_features.json, "
          "success_model.metadata.json, README.json")


if __name__ == "__main__":
    main()