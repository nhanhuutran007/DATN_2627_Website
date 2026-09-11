"""Success-prediction service with model explainability and heuristic fallback."""

from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from app.core.config import settings
from app.schemas.predict import Factor, PredictFeatures, PredictResponse
from app.services.catalog import SUCCESS_FEATURES

TOP_FACTORS = 6

FEATURE_LABELS: dict[str, str] = {
    "category_id": "Lĩnh vực dự án",
    "goal_amount": "Mục tiêu gây quỹ",
    "duration_days": "Thời gian kêu gọi",
    "profile_score": "Mức độ hoàn thiện hồ sơ",
    "content_length": "Độ dài nội dung mô tả",
    "image_count": "Số lượng hình ảnh",
    "has_video": "Có video giới thiệu",
    "story_word_count": "Số từ câu chuyện",
    "owner_campaign_count": "Số dự án từng tạo",
    "owner_credential_approved": "Xác thực danh tính chủ dự án",
    "has_budget_report": "Có báo cáo ngân sách",
    "early_views": "Lượt xem ban đầu",
    "early_backers": "Ủng hộ viên ban đầu",
}

# Reference "high" value per feature used for RF directional attribution when the
# stored correlation from training is unavailable.
REFERENCE_HIGH: dict[str, float] = {
    "category_id": 5.0,
    "goal_amount": 1_000_000_000.0,
    "duration_days": 90.0,
    "profile_score": 100.0,
    "content_length": 20000.0,
    "image_count": 8.0,
    "has_video": 1.0,
    "story_word_count": 5000.0,
    "owner_campaign_count": 5.0,
    "owner_credential_approved": 1.0,
    "has_budget_report": 1.0,
    "early_views": 5000.0,
    "early_backers": 50.0,
}

# Heuristic fallback terms: (feature, coefficient, high_scale, note_if_up).
# The raw feature value is normalized to 0..1 with high_scale; for goal_amount
# the normalized "distance from huge goal" is used (1 - x / scale).
HEURISTIC_TERMS: list[tuple[str, float, float, str]] = [
    ("goal_amount", -0.10, 1_000_000_000.0, "Mục tiêu gây quỹ hợp lý hơn"),
    ("duration_days", 0.10, 90.0, "Thời gian kêu gọi hợp lý giúp tăng khả năng thành công"),
    ("profile_score", 0.30, 100.0, "Hồ sơ đầy đủ giúp tăng uy tín"),
    ("image_count", 0.20, 8.0, "Nhiều hình ảnh giúp dự án hấp dẫn hơn"),
    ("has_budget_report", 0.10, 1.0, "Báo cáo ngân sách giúp tăng niềm tin nhà đầu tư"),
    ("has_video", 0.10, 1.0, "Video giới thiệu giúp tăng khả năng thành công"),
    ("owner_campaign_count", 0.05, 5.0, "Kinh nghiệm tạo dự án giúp tăng khả năng thành công"),
    ("early_backers", 0.05, 20.0, "Ủng hộ ban đầu tích cực dự báo thành công"),
]


def _read_json(path: Path) -> dict | None:
    if not path.is_file():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


@lru_cache(maxsize=8)
def _load_metrics(path_str: str) -> dict | None:
    return _read_json(Path(path_str))


@lru_cache(maxsize=8)
def _load_model_artifacts(
    model_path_str: str, features_path_str: str
) -> tuple[Any | None, list[str] | None, str | None]:
    model_path = Path(model_path_str)
    try:
        model = joblib.load(model_path)
    except Exception:
        return None, None, None

    features: list[str] | None = None
    features_raw = _read_json(Path(features_path_str))
    if isinstance(features_raw, list):
        features = [str(item) for item in features_raw if isinstance(item, str)]

    version: str | None = None
    metadata = _read_json(model_path.with_suffix(".metadata.json"))
    if metadata and metadata.get("model_version"):
        version = str(metadata["model_version"])
    return model, features, version


class PredictorService:
    """Predicts crowdfunding success probability with per-feature explanations."""

    def __init__(
        self,
        model_path: Path | str | None = None,
        metrics_path: Path | str | None = None,
        features_path: Path | str | None = None,
    ) -> None:
        self._model_path = Path(model_path) if model_path else settings.model_path
        self._metrics_path = Path(metrics_path) if metrics_path else settings.success_metrics_path
        self._features_path = (
            Path(features_path) if features_path else settings.success_features_path
        )

    def predict(self, features: PredictFeatures, campaign_id: str | None = None) -> PredictResponse:
        model, trained_features, version = _load_model_artifacts(
            str(self._model_path), str(self._features_path)
        )
        metrics = _load_metrics(str(self._metrics_path))

        vector = self._feature_vector(features, trained_features)

        if model is not None:
            try:
                probabilities = np.asarray(model.predict_proba(np.asarray([vector], dtype=float)))
                probability = float(probabilities[0][1])
                if not math.isfinite(probability):
                    raise ValueError("non-finite probability")
                probability = max(0.0, min(1.0, probability))
                factors = self._explain(model, vector, trained_features, metrics)
                return self._build_response(
                    probability=probability,
                    model=version or type(model).__name__,
                    fallback=False,
                    metrics=metrics,
                    factors=factors,
                )
            except Exception:
                pass

        return self._heuristic_response(features, metrics)

    def _feature_vector(
        self, features: PredictFeatures, trained_features: list[str] | None
    ) -> list[float]:
        source = {
            "category_id": float(features.category_id),
            "goal_amount": max(float(features.goal_amount), 0.0),
            "duration_days": float(features.duration_days),
            "profile_score": float(features.profile_score),
            "content_length": float(features.content_length),
            "image_count": float(features.image_count),
            "has_video": float(features.has_video),
            "story_word_count": float(features.story_word_count),
            "owner_campaign_count": float(features.owner_campaign_count),
            "owner_credential_approved": float(features.owner_credential_approved),
            "has_budget_report": float(features.has_budget_report),
            "early_views": float(features.early_views),
            "early_backers": float(features.early_backers),
        }
        names = trained_features if trained_features else SUCCESS_FEATURES
        return [source.get(name, 0.0) for name in names]

    def _explain(
        self,
        model: Any,
        vector: list[float],
        trained_features: list[str] | None,
        metrics: dict | None,
    ) -> list[Factor]:
        names = trained_features if trained_features else SUCCESS_FEATURES
        if hasattr(model, "coef_"):
            weights = [float(value) for value in np.asarray(model.coef_).reshape(-1)]
        elif hasattr(model, "feature_importances_"):
            weights = [float(value) for value in np.asarray(model.feature_importances_).reshape(-1)]
        else:
            weights = [0.0] * len(names)

        stored_corr = metrics.get("feature_impact") if isinstance(metrics, dict) else None
        model_name = type(model).__name__
        factors: list[Factor] = []
        for name, weight in zip(names, weights, strict=False):
            if not math.isfinite(weight):
                continue
            direction = self._direction(model, vector, names, name, weight, stored_corr, model_name)
            note = (
                "Giá trị cao làm tăng xác suất thành công"
                if direction == "UP"
                else "Giá trị cao làm giảm xác suất thành công"
            )
            factors.append(
                Factor(
                    feature=name,
                    label=FEATURE_LABELS.get(name, name),
                    direction=direction,
                    weight=round(float(weight), 6),
                    note=note,
                )
            )

        factors.sort(key=lambda factor: abs(factor.weight), reverse=True)
        return factors[:TOP_FACTORS]

    def _direction(
        self,
        model: Any,
        vector: list[float],
        names: list[str],
        name: str,
        weight: float,
        stored_corr: dict | None,
        model_name: str,
    ) -> str:
        if model_name.startswith("LogisticRegression"):
            return "UP" if weight >= 0 else "DOWN"
        if isinstance(stored_corr, dict) and name in stored_corr:
            entry = stored_corr[name]
            if isinstance(entry, dict) and entry.get("corr") is not None:
                try:
                    corr = float(entry["corr"])
                    if math.isfinite(corr) and corr != 0.0:
                        return "UP" if corr > 0 else "DOWN"
                except (TypeError, ValueError):
                    pass
        return self._perturb_direction(model, vector, names, name)

    def _perturb_direction(
        self, model: Any, vector: list[float], names: list[str], name: str
    ) -> str:
        try:
            index = names.index(name)
            lo = np.asarray(vector, dtype=float).copy()
            hi = np.asarray(vector, dtype=float).copy()
            lo[index] = 0.0
            hi[index] = REFERENCE_HIGH.get(name, float(vector[index]) + 1.0)
            base = float(np.asarray(model.predict_proba(lo.reshape(1, -1)))[0][1])
            high_pred = float(np.asarray(model.predict_proba(hi.reshape(1, -1)))[0][1])
            delta = high_pred - base
            if math.isfinite(delta) and delta != 0.0:
                return "UP" if delta > 0 else "DOWN"
        except Exception:
            pass
        return "UP"

    def _heuristic_response(
        self, features: PredictFeatures, metrics: dict | None
    ) -> PredictResponse:
        total = 0.0
        contributions: list[tuple[str, float, str]] = []
        for name, coefficient, scale, note_up in HEURISTIC_TERMS:
            try:
                raw = float(getattr(features, name, 0.0))
            except (TypeError, ValueError):
                raw = 0.0
            if not math.isfinite(raw):
                raw = 0.0
            if name == "goal_amount":
                term = 1.0 - max(0.0, min(raw / scale, 1.0))
            else:
                term = max(0.0, min(raw / scale, 1.0))
            contribution = coefficient * term
            total += contribution
            direction = "UP" if contribution >= 0 else "DOWN"
            note = note_up if direction == "UP" else "Giá trị thấp hơn làm giảm xác suất thành công"
            contributions.append((name, contribution, note))

        probability = max(0.0, min(1.0, total))
        factors = [
            Factor(
                feature=name,
                label=FEATURE_LABELS.get(name, name),
                direction="UP" if weight >= 0 else "DOWN",
                weight=round(weight, 6),
                note=note,
            )
            for name, weight, note in contributions
            if weight != 0.0
        ]
        factors.sort(key=lambda factor: abs(factor.weight), reverse=True)
        return self._build_response(
            probability=probability,
            model=None,
            fallback=True,
            metrics=metrics,
            factors=factors[:TOP_FACTORS],
        )

    def _build_response(
        self,
        probability: float,
        model: str | None,
        fallback: bool,
        metrics: dict | None,
        factors: list[Factor],
    ) -> PredictResponse:
        prediction = "LIKELY" if probability >= 0.5 else "UNLIKELY"
        confidence = round(2.0 * abs(probability - 0.5), 6)
        return PredictResponse(
            probability=round(probability, 6),
            prediction=prediction,
            confidence=confidence,
            model=model,
            fallback=fallback,
            metrics=metrics,
            factors=factors,
        )