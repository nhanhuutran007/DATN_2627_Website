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

# Rule-of-thumb fallback used only when the trained model cannot be loaded. It starts
# from the base success rate of the training data and shifts the log-odds by
# hand-set amounts whose directions agree with the trained model (higher goal and
# longer duration lower the odds) and with common crowdfunding guidance. These are
# assumptions, not learned weights, so responses are marked ``fallback=True``.
DEFAULT_BASE_RATE = 0.4
REFERENCE_GOAL_VND = 100_000_000.0
REFERENCE_DURATION_DAYS = 30.0
HEURISTIC_PROBABILITY_BOUNDS = (0.02, 0.98)


def _read_json_value(path: Path) -> object | None:
    if not path.is_file():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _read_json(path: Path) -> dict | None:
    data = _read_json_value(path)
    return data if isinstance(data, dict) else None


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
    # success_features.json là một mảng tên đặc trưng theo đúng thứ tự lúc huấn luyện
    features_raw = _read_json_value(Path(features_path_str))
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
        base_rate = self._base_rate(metrics)
        terms = self._heuristic_terms(features)
        log_odds = math.log(base_rate / (1.0 - base_rate)) + sum(adj for _, adj, _ in terms)
        low, high = HEURISTIC_PROBABILITY_BOUNDS
        probability = max(low, min(high, 1.0 / (1.0 + math.exp(-log_odds))))

        factors = [
            Factor(
                feature=name,
                label=FEATURE_LABELS.get(name, name),
                direction="UP" if adj > 0 else "DOWN",
                weight=round(adj, 6),
                note=note,
            )
            for name, adj, note in terms
            if adj != 0.0
        ]
        factors.sort(key=lambda factor: abs(factor.weight), reverse=True)
        return self._build_response(
            probability=probability,
            model=None,
            fallback=True,
            metrics=metrics,
            factors=factors[:TOP_FACTORS],
        )

    @staticmethod
    def _base_rate(metrics: dict | None) -> float:
        dataset = metrics.get("dataset") if isinstance(metrics, dict) else None
        rate = dataset.get("success_rate") if isinstance(dataset, dict) else None
        try:
            value = float(rate) if rate is not None else DEFAULT_BASE_RATE
        except (TypeError, ValueError):
            value = DEFAULT_BASE_RATE
        return value if 0.05 <= value <= 0.95 else DEFAULT_BASE_RATE

    @staticmethod
    def _heuristic_terms(features: PredictFeatures) -> list[tuple[str, float, str]]:
        """Log-odds shifts per feature: (feature, shift, note for this campaign)."""

        def finite(value: object) -> float:
            try:
                result = float(value)
            except (TypeError, ValueError):
                return 0.0
            return result if math.isfinite(result) else 0.0

        def clip(value: float, low: float, high: float) -> float:
            return max(low, min(high, value))

        terms: list[tuple[str, float, str]] = []

        goal = finite(features.goal_amount)
        if goal > 0:
            adj = clip(-0.5 * math.log10(goal / REFERENCE_GOAL_VND), -1.0, 0.75)
            note = (
                "Mục tiêu vừa sức so với các dự án tương tự"
                if adj >= 0
                else "Mục tiêu lớn làm giảm khả năng đạt đủ"
            )
            terms.append(("goal_amount", adj, note))

        duration = finite(features.duration_days)
        if duration > 0:
            excess = (duration - REFERENCE_DURATION_DAYS) / REFERENCE_DURATION_DAYS
            adj = clip(-0.4 * excess, -0.8, 0.2)
            note = (
                "Thời gian kêu gọi gọn giúp giữ đà ủng hộ"
                if adj >= 0
                else "Kêu gọi quá dài thường làm giảm động lực ủng hộ"
            )
            terms.append(("duration_days", adj, note))

        profile = clip(finite(features.profile_score), 0.0, 100.0) / 100.0
        terms.append((
            "profile_score",
            0.6 * (profile - 0.5),
            "Hồ sơ đầy đủ giúp tăng uy tín" if profile >= 0.5 else "Hồ sơ còn thiếu thông tin",
        ))

        images = clip(finite(features.image_count), 0.0, 4.0)
        terms.append((
            "image_count",
            0.3 * images / 4.0 - 0.1,
            "Có ảnh thực tế minh họa dự án" if images >= 2 else "Còn ít hình ảnh minh họa",
        ))

        if features.has_video:
            terms.append(("has_video", 0.25, "Có video giới thiệu"))
        terms.append((
            "has_budget_report",
            0.2 if features.has_budget_report else -0.1,
            "Có kế hoạch ngân sách theo mốc"
            if features.has_budget_report
            else "Chưa có kế hoạch ngân sách theo mốc",
        ))
        if features.owner_credential_approved:
            terms.append(("owner_credential_approved", 0.1, "Chủ dự án đã xác minh tài khoản"))

        backers = clip(finite(features.early_backers), 0.0, 10.0)
        if backers > 0:
            terms.append(("early_backers", 0.4 * backers / 10.0, "Đã có người ủng hộ ngay từ đầu"))
        return terms

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