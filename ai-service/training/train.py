"""Offline training pipeline for the crowdfunding AI service.

Generates a deterministic synthetic campaign dataset plus a synthetic fraud
feature matrix, trains LogisticRegression / RandomForest success models and an
IsolationForest fraud model, evaluates them on a time-ordered split and writes
evaluated artifacts + metadata into ``models/``.

Run from the ``ai-service`` directory either as:

    python -m training.train
    python training/train.py
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
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

from app.services.catalog import CATEGORIES, FRAUD_FEATURES, SUCCESS_FEATURES

SEED = 42
MODEL_VERSION = "2026.09.1"
ROWS = 1000
FRAUD_ROWS = 2000
FRAUD_CONTAMINATION = 0.02
TRAIN_FRACTION = 0.8

MODELS_DIR = ROOT / "models"
DATA_DIR = ROOT / "data"
CAMPAIGN_CSV = DATA_DIR / "synthetic_campaigns.csv"


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def confusion_numbers(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, int]:
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred, labels=[0, 1]).ravel()
    return {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}


def generate_campaigns() -> pd.DataFrame:
    rng = np.random.default_rng(SEED)
    n = ROWS

    profile_score = np.clip(rng.normal(62.0, 20.0, n), 0.0, 100.0)
    image_count = np.clip(np.round(rng.normal(5.0, 3.0, n)), 0.0, 15.0).astype(int)
    goal_amount = np.clip(np.exp(rng.normal(18.6, 0.95, n)), 1e6, 5e8)
    duration_days = rng.integers(7, 121, size=n)
    owner_credential_approved = rng.binomial(1, 0.5, size=n).astype(float)
    has_budget_report = rng.binomial(1, 0.4, size=n).astype(float)
    has_video = rng.binomial(1, 0.35, size=n).astype(float)
    owner_campaign_count = np.clip(np.round(rng.normal(1.2, 1.6, n)), 0, 8).astype(int)
    early_backers = rng.poisson(8, size=n)

    logit = (
        -3.8
        + 0.03 * profile_score
        + 0.12 * np.minimum(image_count, 8)
        + 0.8 * owner_credential_approved
        + 0.6 * has_budget_report
        + 0.2 * np.minimum(owner_campaign_count, 4)
        + 0.3 * has_video
        + 0.008 * np.minimum(duration_days, 90)
        - 0.9 * np.clip((goal_amount - 2e7) / 4e8, 0.0, 1.0)
        + 0.3 * np.minimum(early_backers, 15) / 15.0
    )
    success_prob = 1.0 / (1.0 + np.exp(-logit))
    success = rng.binomial(1, success_prob, size=n)

    frame = pd.DataFrame(
        {
            "campaign_id": np.arange(1, n + 1),
            "category": rng.choice(CATEGORIES, size=n, replace=True),
            "category_id": None,
            "goal_amount": goal_amount,
            "duration_days": duration_days,
            "profile_score": profile_score,
            "content_length": rng.integers(500, 20000, size=n),
            "image_count": image_count,
            "has_video": has_video,
            "story_word_count": rng.integers(200, 5000, size=n),
            "owner_campaign_count": owner_campaign_count,
            "owner_credential_approved": owner_credential_approved,
            "has_budget_report": has_budget_report,
            "early_views": rng.poisson(300, size=n),
            "early_backers": early_backers,
            "success": success,
            "launch_seq": np.arange(n),
        }
    )
    frame["category_id"] = frame["category"].map({cat: idx for idx, cat in enumerate(CATEGORIES)})
    return frame


def build_features(frame: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
    x = frame[SUCCESS_FEATURES].to_numpy(dtype=float)
    y = frame["success"].to_numpy(dtype=float)
    return x, y


def train_success_models() -> dict:
    frame = generate_campaigns()
    CAMPAIGN_CSV.parent.mkdir(parents=True, exist_ok=True)
    frame.to_csv(CAMPAIGN_CSV, index=False, encoding="utf-8")

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
            "file": str(CAMPAIGN_CSV.relative_to(ROOT)),
            "sha256": sha256_of(CAMPAIGN_CSV),
            "size_bytes": CAMPAIGN_CSV.stat().st_size,
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


def generate_fraud_frame() -> pd.DataFrame:
    rng = np.random.default_rng(SEED + 1)
    n = FRAUD_ROWS
    n_anomaly = int(FRAUD_CONTAMINATION * n)

    normal = pd.DataFrame(
        {
            "contribution_count_1h": rng.poisson(0.5, n),
            "failed_payment_count": rng.poisson(0.08, n),
            "total_payment_count": rng.poisson(2, n),
            "device_shared_accounts": rng.poisson(0.2, n),
            "amount_z_score": rng.normal(0.0, 0.8, n),
            "ip_country_changes": rng.poisson(0.2, n),
            "new_account_days": rng.uniform(20.0, 400.0, n),
            "profile_change_frequency": rng.poisson(0.3, n),
            "is_anomaly": 0,
        }
    )
    pattern = rng.integers(0, 3, size=n_anomaly)
    cluster_a = pattern == 0
    cluster_b = pattern == 1
    cluster_c = pattern == 2
    anomaly = pd.DataFrame(
        {
            "contribution_count_1h": np.where(cluster_a, rng.uniform(15, 60, n_anomaly), rng.poisson(0.5, n_anomaly)),
            "failed_payment_count": np.where(
                cluster_b, rng.integers(4, 20, n_anomaly), rng.poisson(0.08, n_anomaly)
            ),
            "total_payment_count": np.where(
                cluster_b, rng.integers(3, 25, n_anomaly), rng.poisson(2, n_anomaly)
            ),
            "device_shared_accounts": np.where(
                cluster_c, rng.integers(5, 20, n_anomaly), rng.poisson(0.2, n_anomaly)
            ),
            "amount_z_score": rng.normal(3.5, 1.5, n_anomaly),
            "ip_country_changes": np.where(
                cluster_c, rng.integers(3, 8, n_anomaly), rng.poisson(0.2, n_anomaly)
            ),
            "new_account_days": rng.uniform(0.0, 2.0, n_anomaly),
            "profile_change_frequency": rng.poisson(0.3, n_anomaly),
            "is_anomaly": 1,
        }
    )
    frame = pd.concat([normal, anomaly], ignore_index=True)
    return frame.sample(frac=1.0, random_state=SEED).reset_index(drop=True)


def train_fraud_model() -> dict:
    frame = generate_fraud_frame()
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
    success_metrics = train_success_models()
    fraud_metrics = train_fraud_model()
    write_success_metadata(success_metrics)
    write_model_readme(success_metrics, fraud_metrics)

    lr = success_metrics["models"]["logistic_regression"]
    rf = success_metrics["models"]["random_forest"]
    chosen = success_metrics["chosen"]
    print("== Báo cáo huấn luyện (training report) ==")
    print(f"Nhãn model version: {MODEL_VERSION}")
    print(f"Dữ liệu campaign: {success_metrics['dataset']['rows']} dòng -> {CAMPAIGN_CSV.name}")
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