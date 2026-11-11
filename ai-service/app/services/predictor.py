"""Success-prediction service with model explainability and heuristic fallback."""

from __future__ import annotations

import json
import math
from datetime import UTC, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from app.core.config import settings
from app.schemas.predict import Factor, PredictFeatures, PredictResponse
from app.services.catalog import CATEGORIES, CATEGORY_IDS, SUCCESS_FEATURES

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
    "name_words": "Độ dài tên chiến dịch",
    "launch_month": "Tháng bắt đầu gây quỹ",
    "launch_weekday": "Ngày trong tuần bắt đầu",
}

# Giải thích theo từng chiến dịch ("what-if"): với mỗi đặc trưng, so xác suất ở giá trị của chiến
# dịch với xác suất trung bình khi thay giá trị đó bằng các mức thường gặp dưới đây (phần còn lại
# giữ nguyên). Chênh lệch dương = giá trị hiện tại đang giúp, âm = đang kéo xuống. Cách này đúng
# cả với đặc trưng không đơn điệu (lĩnh vực, tháng, độ dài tên) — hướng "tương quan chung" trước
# đây báo y hệt cho mọi chiến dịch, kể cả khi mục tiêu rất nhỏ hay tên chỉ có 2 từ.
REFERENCE_GRIDS: dict[str, tuple[float, ...]] = {
    "category_id": tuple(float(index) for index in range(len(CATEGORIES))),
    "goal_amount": (5e6, 1e7, 2e7, 5e7, 1e8, 2e8, 5e8, 1e9),
    "duration_days": (7.0, 14.0, 21.0, 30.0, 45.0, 60.0, 90.0),
    "profile_score": (20.0, 40.0, 60.0, 80.0, 100.0),
    "content_length": (500.0, 2000.0, 5000.0, 10000.0),
    "image_count": (0.0, 1.0, 2.0, 4.0, 8.0),
    "has_video": (0.0, 1.0),
    "story_word_count": (100.0, 400.0, 1000.0, 2000.0),
    "owner_campaign_count": (1.0, 2.0, 3.0, 5.0),
    "owner_credential_approved": (0.0, 1.0),
    "has_budget_report": (0.0, 1.0),
    "early_views": (0.0, 100.0, 500.0, 2000.0),
    "early_backers": (0.0, 5.0, 20.0, 50.0),
    "name_words": tuple(float(count) for count in range(1, 13)),
    "launch_month": tuple(float(month) for month in range(1, 13)),
    "launch_weekday": tuple(float(day) for day in range(7)),
}

# Ghi chú (giúp, kéo xuống) cho từng đặc trưng; đặc trưng khác dùng DEFAULT_FACTOR_NOTES.
FACTOR_NOTES: dict[str, tuple[str, str]] = {
    "category_id": (
        "Lĩnh vực này có tỷ lệ đạt mục tiêu cao hơn các lĩnh vực khác",
        "Lĩnh vực này có tỷ lệ đạt mục tiêu thấp hơn các lĩnh vực khác",
    ),
    "goal_amount": (
        "Mức mục tiêu này dễ đạt hơn mặt bằng chung",
        "Mức mục tiêu này khó đạt hơn mặt bằng chung",
    ),
    "duration_days": (
        "Thời gian kêu gọi này thuận lợi hơn mặt bằng chung",
        "Thời gian kêu gọi này kém thuận lợi hơn mặt bằng chung",
    ),
    "name_words": (
        "Độ dài tên chiến dịch đang hợp lý",
        "Tên chiến dịch quá ngắn hoặc quá dài so với các dự án đạt mục tiêu",
    ),
    "launch_month": (
        "Thời điểm bắt đầu này thuận lợi hơn trung bình",
        "Thời điểm bắt đầu này kém thuận lợi hơn trung bình",
    ),
    "launch_weekday": (
        "Thời điểm bắt đầu này thuận lợi hơn trung bình",
        "Thời điểm bắt đầu này kém thuận lợi hơn trung bình",
    ),
}
DEFAULT_FACTOR_NOTES = (
    "Giá trị hiện tại làm tăng khả năng đạt mục tiêu",
    "Giá trị hiện tại làm giảm khả năng đạt mục tiêu",
)
# Chênh lệch nhỏ hơn nửa điểm phần trăm coi như không ảnh hưởng, không nêu thành yếu tố.
MIN_FACTOR_IMPACT = 0.005

UNTRAINED_CATEGORY_CAVEAT = (
    "Dữ liệu huấn luyện không có lĩnh vực này nên ước lượng lấy trung bình trên các lĩnh vực "
    "mô hình đã học."
)

# Ngày bắt đầu mặc định khi không gửi kèm (chiến dịch chưa chọn ngày): hôm nay theo giờ Việt Nam.
VIETNAM_UTC_OFFSET = timedelta(hours=7)

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

        names = trained_features if trained_features else SUCCESS_FEATURES
        vector = self._feature_vector(features, trained_features)

        if model is not None:
            try:
                trained_ids = self._trained_category_ids(metrics)
                probability = float(self._probabilities(model, [vector], names, trained_ids)[0])
                if not math.isfinite(probability):
                    raise ValueError("non-finite probability")
                probability = max(0.0, min(1.0, probability))
                factors = self._explain(model, vector, names, trained_ids, probability)
                untrained = (
                    bool(trained_ids)
                    and "category_id" in names
                    and vector[names.index("category_id")] not in trained_ids
                )
                return self._build_response(
                    probability=probability,
                    model=version or type(model).__name__,
                    fallback=False,
                    metrics=metrics,
                    factors=factors,
                    caveats=[UNTRAINED_CATEGORY_CAVEAT] if untrained else [],
                )
            except Exception:
                pass

        return self._heuristic_response(features, metrics)

    @staticmethod
    def _trained_category_ids(metrics: dict | None) -> tuple[float, ...]:
        """Category ids that had training samples (empty = unknown, treat every id as trained)."""
        dataset = metrics.get("dataset") if isinstance(metrics, dict) else None
        mapping = dataset.get("category_mapping") if isinstance(dataset, dict) else None
        if not isinstance(mapping, dict):
            return ()
        ids = {CATEGORY_IDS[name] for name in mapping.values() if name in CATEGORY_IDS}
        return tuple(float(index) for index in sorted(ids))

    @staticmethod
    def _probabilities(
        model: Any, rows: Any, names: list[str], trained_ids: tuple[float, ...]
    ) -> np.ndarray:
        """Success probability per row.

        ``category_id`` is an integer code, so a tree model silently scores a category it never
        saw (Môi trường, Y tế in the Kickstarter data) like its numeric neighbour. Such rows are
        scored as the average over the categories the model did learn instead.
        """
        matrix = np.asarray(rows, dtype=float)

        def positive(batch: np.ndarray) -> np.ndarray:
            return np.asarray(model.predict_proba(batch), dtype=float)[:, 1]

        if not trained_ids or "category_id" not in names:
            return positive(matrix)
        column = names.index("category_id")
        unseen = ~np.isin(matrix[:, column], trained_ids)
        if not unseen.any():
            return positive(matrix)

        result = np.empty(len(matrix), dtype=float)
        if (~unseen).any():
            result[~unseen] = positive(matrix[~unseen])
        expanded = np.repeat(matrix[unseen], len(trained_ids), axis=0)
        expanded[:, column] = np.tile(trained_ids, int(unseen.sum()))
        result[unseen] = positive(expanded).reshape(-1, len(trained_ids)).mean(axis=1)
        return result

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
            "name_words": float(features.name_words),
            **self._launch_calendar(features),
        }
        names = trained_features if trained_features else SUCCESS_FEATURES
        return [source.get(name, 0.0) for name in names]

    @staticmethod
    def _launch_calendar(features: PredictFeatures) -> dict[str, float]:
        """Tháng/thứ bắt đầu; thiếu thì lấy hôm nay theo giờ Việt Nam (0 = thứ Hai, như pandas)."""
        today = datetime.now(UTC) + VIETNAM_UTC_OFFSET
        month = features.launch_month if features.launch_month is not None else today.month
        weekday = (
            features.launch_weekday if features.launch_weekday is not None else today.weekday()
        )
        return {"launch_month": float(month), "launch_weekday": float(weekday)}

    def _explain(
        self,
        model: Any,
        vector: list[float],
        names: list[str],
        trained_ids: tuple[float, ...],
        probability: float,
    ) -> list[Factor]:
        """Per-campaign factors: how much each feature's *current value* moves the probability.

        ``weight`` is the change in probability (−1…1) against the average over the feature's
        reference values, everything else unchanged; the list is ordered by absolute impact.
        """
        actual = np.asarray(vector, dtype=float)
        factors: list[Factor] = []
        for index, name in enumerate(names):
            grid = REFERENCE_GRIDS.get(name)
            if name == "category_id" and trained_ids:
                grid = trained_ids
            if not grid:
                continue
            try:
                rows = np.tile(actual, (len(grid), 1))
                rows[:, index] = grid
                reference = float(np.mean(self._probabilities(model, rows, names, trained_ids)))
            except Exception:
                continue
            impact = probability - reference
            if not math.isfinite(impact) or abs(impact) < MIN_FACTOR_IMPACT:
                continue
            helps, hurts = FACTOR_NOTES.get(name, DEFAULT_FACTOR_NOTES)
            factors.append(
                Factor(
                    feature=name,
                    label=FEATURE_LABELS.get(name, name),
                    direction="UP" if impact > 0 else "DOWN",
                    weight=round(impact, 6),
                    note=helps if impact > 0 else hurts,
                )
            )

        factors.sort(key=lambda factor: abs(factor.weight), reverse=True)
        return factors[:TOP_FACTORS]

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
        caveats: list[str] | None = None,
    ) -> PredictResponse:
        prediction = "LIKELY" if probability >= 0.5 else "UNLIKELY"
        confidence = round(2.0 * abs(probability - 0.5), 6)
        return PredictResponse(
            caveats=caveats or [],
            probability=round(probability, 6),
            prediction=prediction,
            confidence=confidence,
            model=model,
            fallback=fallback,
            metrics=metrics,
            factors=factors,
        )