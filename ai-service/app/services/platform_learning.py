"""Tự học từ các dự án Góp Mầm đã kết thúc.

Mô hình gốc học từ ~330 nghìn dự án Kickstarter, nhưng người ủng hộ ở Việt Nam có thể hành xử
khác. Mỗi lần dự đoán, backend gửi kèm các dự án Góp Mầm đã kết thúc (đặc trưng lúc ra mắt +
đạt/không đạt). Không có bước huấn luyện riêng: kết quả được tính lại theo dữ liệu mới nhất mỗi
lần, nên dự án vừa kết thúc có tác dụng ngay ở lần dự đoán sau.

1. **Hiệu chỉnh xác suất**: lấy các dự án đã kết thúc *tương tự* (cùng lĩnh vực, mục tiêu và thời
   hạn gần nhau, có trọng số), so tỷ lệ đạt thực tế với tỷ lệ mô hình gốc dự đoán cho chính các
   dự án đó. Chênh lệch (thang log-odds) được cộng vào dự đoán, nhân với mức tin
   ``n / (n + PRIOR_STRENGTH)``: ít dữ liệu thì gần như giữ nguyên mô hình gốc, càng nhiều dự án
   tương tự thì dữ liệu Góp Mầm càng có tiếng nói.
2. **Gợi ý mục tiêu và thời hạn**: khi đủ dự án cùng lĩnh vực đã đạt mục tiêu, khoảng gợi ý lấy
   từ số tiền các dự án đó thực sự gọi được; chưa đủ thì quét mô hình đã hiệu chỉnh.
"""

from __future__ import annotations

import math
from typing import TYPE_CHECKING, Literal

import numpy as np

from app.schemas.predict import (
    DurationSuggestion,
    EstimateRequest,
    EstimateResponse,
    GoalOption,
    GoalSuggestion,
    PlatformAdjustment,
    PlatformOutcome,
    PredictFeatures,
    PredictResponse,
    SimilarCampaign,
)

if TYPE_CHECKING:
    from app.services.predictor import PredictorService

# Số "dự án tương tự quy đổi" để dữ liệu Góp Mầm được tin ngang mô hình gốc (mức tin 50%).
PRIOR_STRENGTH = 8.0
# Hiệu chỉnh tối đa ±1,5 log-odds (≈ từ 40% lên 75% hoặc xuống 13%): chặn vài dự án cá biệt
# kéo lệch.
SHIFT_LIMIT = 1.5
# Dự án khác lĩnh vực vẫn góp một phần nhỏ (hành vi người ủng hộ trên cùng nền tảng).
OTHER_CATEGORY_WEIGHT = 0.25
# Mục tiêu chênh 3 lần thì trọng số còn e^-0,5 ≈ 0,61; chênh 10 lần còn ≈ 0,07.
GOAL_SCALE = math.log(3.0)
DURATION_SCALE_DAYS = 30.0
# Cần ít nhất bấy nhiêu dự án cùng lĩnh vực đã đạt mục tiêu thì mới gợi ý theo số liệu Góp Mầm.
MIN_PLATFORM_SUCCESSES = 3.0
# Ít hơn số dự án đã kết thúc này thì ghi chú rằng gợi ý chủ yếu dựa vào mô hình gốc.
FEW_SAMPLES = 30

GOAL_GRID: tuple[float, ...] = (
    5e6, 1e7, 2e7, 3e7, 5e7, 7.5e7, 1e8, 1.5e8, 2e8, 3e8, 5e8, 7.5e8, 1e9, 2e9,
)
DURATION_GRID: tuple[int, ...] = (30, 45, 60, 90)
# Chọn thời hạn ngắn hơn nếu khả năng chỉ kém thời hạn tốt nhất không quá 1 điểm phần trăm.
DURATION_TOLERANCE = 0.01
SIMILAR_LIMIT = 5
MIN_SIMILARITY = 0.05
# Số từ điển hình của tên chiến dịch, dùng khi chưa đặt tên.
TYPICAL_NAME_WORDS = 6
# Mức tin vào dữ liệu Góp Mầm từ ngưỡng này trở lên thì ghi nguồn gợi ý thời hạn là "platform".
PLATFORM_BASIS_TRUST = 0.5


def _logit(p: float) -> float:
    p = min(max(p, 1e-4), 1.0 - 1e-4)
    return math.log(p / (1.0 - p))


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def similarity(query: PredictFeatures, other: PredictFeatures, use_goal: bool = True) -> float:
    """Mức giống nhau 0…1 giữa hai chiến dịch theo lĩnh vực, mục tiêu và thời hạn."""
    weight = 1.0 if query.category_id == other.category_id else OTHER_CATEGORY_WEIGHT
    if use_goal and query.goal_amount > 0 and other.goal_amount > 0:
        ratio = math.log(query.goal_amount / other.goal_amount) / GOAL_SCALE
        weight *= math.exp(-0.5 * ratio * ratio)
    if query.duration_days > 0 and other.duration_days > 0:
        gap = (query.duration_days - other.duration_days) / DURATION_SCALE_DAYS
        weight *= math.exp(-0.5 * gap * gap)
    return weight


class PlatformLearner:
    """Dữ liệu Góp Mầm đã kết thúc + xác suất mô hình gốc đã chấm sẵn cho từng dự án."""

    def __init__(
        self, predictor: PredictorService, history: list[PlatformOutcome], use_model: bool
    ) -> None:
        self.predictor = predictor
        self.history = history
        self.use_model = use_model
        self.model_probs = predictor.score_many([item.features for item in history], use_model)
        self.outcomes = np.asarray([1.0 if item.reached else 0.0 for item in history])

    def weights(self, query: PredictFeatures, use_goal: bool = True) -> np.ndarray:
        return np.asarray([similarity(query, item.features, use_goal) for item in self.history])

    def adjust(
        self, query: PredictFeatures, base_probability: float
    ) -> tuple[PlatformAdjustment, float] | None:
        """(chi tiết hiệu chỉnh, xác suất sau hiệu chỉnh), hoặc None nếu không có dự án tương tự."""
        if not self.history:
            return None
        weights = self.weights(query)
        n_similar = float(weights.sum())
        if n_similar <= 1e-6:
            return None
        # Làm trơn Laplace để 1–2 dự án không cho ra tỷ lệ 0% hay 100%.
        observed = (float(weights @ self.outcomes) + 0.5) / (n_similar + 1.0)
        model_rate = float(weights @ self.model_probs) / n_similar
        shift = max(-SHIFT_LIMIT, min(SHIFT_LIMIT, _logit(observed) - _logit(model_rate)))
        trust = n_similar / (n_similar + PRIOR_STRENGTH)
        probability = _sigmoid(_logit(base_probability) + trust * shift)
        detail = PlatformAdjustment(
            samples=len(self.history),
            similar=round(n_similar, 3),
            observed_rate=round(observed, 6),
            model_rate=round(model_rate, 6),
            weight=round(trust, 6),
            base_probability=round(base_probability, 6),
        )
        return detail, probability

    def calibrated(self, rows: list[PredictFeatures]) -> list[float]:
        """Xác suất đã hiệu chỉnh cho nhiều phương án (mục tiêu/thời hạn khác nhau)."""
        base = self.predictor.score_many(rows, self.use_model)
        result: list[float] = []
        for row, probability in zip(rows, base, strict=True):
            adjusted = self.adjust(row, float(probability))
            result.append(adjusted[1] if adjusted else float(probability))
        return result


def apply_platform_learning(
    predictor: PredictorService,
    response: PredictResponse,
    features: PredictFeatures,
    history: list[PlatformOutcome],
) -> PredictResponse:
    """Hiệu chỉnh một dự đoán theo các dự án Góp Mầm đã kết thúc."""
    learner = PlatformLearner(predictor, history, use_model=not response.fallback)
    adjusted = learner.adjust(features, response.probability)
    if adjusted is None:
        return response
    platform, probability = adjusted
    probability = max(0.0, min(1.0, probability))
    return response.model_copy(
        update={
            "probability": round(probability, 6),
            "prediction": "LIKELY" if probability >= 0.5 else "UNLIKELY",
            "confidence": round(2.0 * abs(probability - 0.5), 6),
            "platform": platform,
        }
    )


def _nice(amount: float) -> float:
    """Làm tròn số tiền về 2 chữ số có nghĩa (37.400.000 → 37.000.000), tối thiểu 1 triệu."""
    if amount <= 0:
        return 0.0
    magnitude = 10 ** max(6, math.floor(math.log10(amount)) - 1)
    return float(max(1_000_000, round(amount / magnitude) * magnitude))


def _weighted_quantile(values: np.ndarray, weights: np.ndarray, q: float) -> float:
    order = np.argsort(values)
    values, weights = values[order], weights[order]
    cumulative = np.cumsum(weights) - 0.5 * weights
    return float(np.interp(q * weights.sum(), cumulative, values))


def _goal_from_successes(
    history: list[PlatformOutcome],
    mask: np.ndarray,
    weights: np.ndarray,
    basis: Literal["category", "platform"],
) -> GoalSuggestion:
    """Khoảng 25–75% (trung vị là mức gợi ý) số tiền các dự án đã đạt mục tiêu thực sự gọi được."""
    raised = np.asarray([item.raised for item in history], dtype=float)[mask]
    chosen = np.asarray(weights, dtype=float)[mask]
    return GoalSuggestion(
        low=_nice(_weighted_quantile(raised, chosen, 0.25)),
        high=_nice(_weighted_quantile(raised, chosen, 0.75)),
        recommended=_nice(_weighted_quantile(raised, chosen, 0.5)),
        basis=basis,
    )


def estimate(predictor: PredictorService, request: EstimateRequest) -> EstimateResponse:
    features = request.features
    if features.name_words <= 0:
        # Ở bước đặt mục tiêu thường chưa có tên; tên 0 từ nằm ngoài dữ liệu huấn luyện.
        features = features.model_copy(update={"name_words": TYPICAL_NAME_WORDS})
    history = request.history
    min_days = request.min_duration_days
    durations = sorted(
        {d for d in DURATION_GRID if d >= min_days}
        | {min_days}
        | ({features.duration_days} if features.duration_days >= min_days else set())
    )

    # Dự đoán cho phương án đang nhập (kèm yếu tố giải thích) nếu đã có mục tiêu.
    current = predictor.predict(features, history=history) if features.goal_amount > 0 else None
    use_model = not current.fallback if current else predictor.model_available()
    learner = PlatformLearner(predictor, history, use_model=use_model)
    duration_now = features.duration_days if features.duration_days >= min_days else min_days

    # --- Mục tiêu -------------------------------------------------------------------------
    # Dự án cùng lĩnh vực đã đạt mục tiêu: số tiền họ thật sự gọi được là căn cứ tốt nhất.
    # Căn cứ theo thứ tự: dự án cùng lĩnh vực đã đạt → mọi dự án Góp Mầm đã đạt (dự án khác lĩnh
    # vực tính nửa trọng số) → quét mô hình. Không lọc theo mục tiêu vì đang đi tìm mục tiêu.
    reached = np.asarray([item.reached and item.raised > 0 for item in history], dtype=bool)
    same_category = np.asarray(
        [item.features.category_id == features.category_id for item in history], dtype=bool
    )
    goal: GoalSuggestion | None = None
    if (reached & same_category).sum() >= MIN_PLATFORM_SUCCESSES:
        goal = _goal_from_successes(
            history, reached & same_category, np.ones(len(history)), "category"
        )
    elif reached.sum() >= MIN_PLATFORM_SUCCESSES:
        goal = _goal_from_successes(
            history, reached, np.where(same_category, 1.0, 0.5), "platform"
        )
    if goal is None:
        scan = [features.model_copy(update={"goal_amount": g, "duration_days": duration_now})
                for g in GOAL_GRID]
        scan_probs = learner.calibrated(scan)
        # Mức lớn nhất mà khả năng đạt không thấp hơn mặt bằng chung; gợi ý lùi một nấc cho an toàn.
        base_rate = predictor.base_rate()
        feasible = [g for g, p in zip(GOAL_GRID, scan_probs, strict=True) if p >= base_rate]
        top = max(feasible) if feasible else GOAL_GRID[0]
        index = GOAL_GRID.index(top)
        goal = GoalSuggestion(
            low=GOAL_GRID[max(0, index - 2)],
            high=top,
            recommended=GOAL_GRID[max(0, index - 1)],
            basis="model",
        )
    goal = goal.model_copy(update={"low": min(goal.low, goal.recommended),
                                   "high": max(goal.high, goal.recommended)})

    # --- Thời hạn -------------------------------------------------------------------------
    goal_for_duration = features.goal_amount if features.goal_amount > 0 else goal.recommended
    duration_rows = [
        features.model_copy(update={"goal_amount": goal_for_duration, "duration_days": days})
        for days in durations
    ]
    duration_probs = learner.calibrated(duration_rows)
    best = max(duration_probs)
    best_days = next(
        days for days, p in zip(durations, duration_probs, strict=True)
        if p >= best - DURATION_TOLERANCE
    )
    # Thời hạn luôn lấy từ mô hình đã hiệu chỉnh (để không mâu thuẫn với ước lượng hiện tại);
    # ghi nguồn "platform" khi dữ liệu Góp Mầm đã chiếm phần lớn trong hiệu chỉnh.
    best_row = duration_rows[durations.index(best_days)]
    best_base = float(predictor.score_many([best_row], learner.use_model)[0])
    adjusted = learner.adjust(best_row, best_base)
    trusted = adjusted is not None and adjusted[0].weight >= PLATFORM_BASIS_TRUST
    duration = DurationSuggestion(
        days=best_days,
        probability=round(duration_probs[durations.index(best_days)], 6),
        basis="platform" if trusted else "model",
    )

    # --- Vài mức mục tiêu để so sánh ----------------------------------------------------------
    anchor = min(
        range(len(GOAL_GRID)), key=lambda i: abs(math.log(GOAL_GRID[i] / goal.recommended))
    )
    around = {GOAL_GRID[i] for i in range(max(0, anchor - 2), min(len(GOAL_GRID), anchor + 3))}
    # Kèm đúng mức đang nhập để người dùng so được với các mức khác.
    picks = sorted(around | ({features.goal_amount} if features.goal_amount > 0 else set()))
    # Cùng thời hạn với phương án đang nhập để các mức so sánh khớp với ước lượng hiện tại.
    option_rows = [features.model_copy(update={"goal_amount": g, "duration_days": duration_now})
                   for g in picks]
    options = [
        GoalOption(goal_amount=g, probability=round(p, 6))
        for g, p in zip(picks, learner.calibrated(option_rows), strict=True)
    ]

    # --- Dự án tương tự đã kết thúc ------------------------------------------------------------
    ranked = sorted(
        zip(history, learner.weights(features), strict=True), key=lambda pair: pair[1], reverse=True
    )
    similar = [
        SimilarCampaign(
            campaign_id=item.campaign_id,
            title=item.title,
            goal_amount=item.features.goal_amount,
            raised=item.raised,
            duration_days=item.features.duration_days,
            reached=item.reached,
            similarity=round(float(weight), 4),
        )
        for item, weight in ranked[:SIMILAR_LIMIT]
        if weight >= MIN_SIMILARITY
    ]

    notes: list[str] = []
    if len(history) < FEW_SAMPLES:
        notes.append(
            f"Góp Mầm mới có {len(history)} dự án đã kết thúc nên khả năng đạt vẫn dựa nhiều "
            "vào mô hình học từ dữ liệu Kickstarter; gợi ý sẽ sát thực tế hơn khi có thêm dự án "
            "kết thúc."
        )
    if current and current.fallback:
        notes.append("Mô hình học máy tạm không khả dụng; đang dùng công thức kinh nghiệm.")

    return EstimateResponse(
        current=current,
        goal=goal,
        duration=duration,
        options=options,
        similar=similar,
        samples=len(history),
        similar_reached=sum(1 for item in similar if item.reached),
        notes=notes,
    )
