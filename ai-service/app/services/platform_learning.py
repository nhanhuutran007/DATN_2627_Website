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
2. **Học thêm từ nội dung**: có video, có từ 3 ảnh, câu chuyện từ 300 từ — Kickstarter không có
   các thông tin này nên mô hình gốc không biết. Hồi quy logistic có phạt trên phần chênh lệch
   giữa kết quả thật và mô hình gốc ước lượng mỗi thông tin đi cùng khả năng đạt cao hay thấp
   hơn; thông tin chưa đủ dự án ở cả hai nhóm có/không (vd. chưa ai có video) được báo "chưa đủ
   dữ liệu" và không ảnh hưởng.
3. **Gợi ý thời hạn**: với số tiền người tạo tự đặt (AI không gợi ý số tiền), tính khả năng đạt
   đã hiệu chỉnh cho từng ngày, làm mượt, rồi gợi ý khoảng thời hạn tốt gần như nhau.
"""

from __future__ import annotations

import math
from typing import TYPE_CHECKING

import numpy as np

from app.schemas.predict import (
    ContentEffect,
    DurationOption,
    DurationSuggestion,
    EstimateRequest,
    EstimateResponse,
    Factor,
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
# Ít hơn số dự án đã kết thúc này thì ghi chú rằng gợi ý chủ yếu dựa vào mô hình gốc.
FEW_SAMPLES = 30

# Các mốc hiển thị để so sánh; đường khả năng đạt được tính theo từng ngày rồi làm mượt.
DURATION_GRID: tuple[int, ...] = (30, 45, 60)
# Góp Mầm cho gây quỹ tối đa 60 ngày (như Kickstarter), nên chỉ gợi ý trong khoảng này.
MAX_DURATION_DAYS = 60
# Làm mượt theo thời hạn (Gauss, độ lệch chuẩn 7 ngày): mô hình học từ Kickstarter có "đáy giả" ở
# đúng 30 và 60 ngày (mặc định và mức tối đa cũ của Kickstarter, hay được người tạo qua loa giữ
# nguyên) khiến 30 ngày thấp hơn 31 ngày cả chục điểm — đó là thói quen chọn số tròn, không phải
# quy luật thật của thời hạn.
SMOOTHING_DAYS = 7.0
# Thời hạn có khả năng đạt kém mức tốt nhất không quá 2 điểm phần trăm được coi là tốt như nhau.
DURATION_RANGE_TOLERANCE = 0.02
SIMILAR_LIMIT = 5
MIN_SIMILARITY = 0.05
# Số từ điển hình của tên chiến dịch, dùng khi chưa đặt tên.
TYPICAL_NAME_WORDS = 6
# Mức tin vào dữ liệu Góp Mầm từ ngưỡng này trở lên thì ghi nguồn gợi ý thời hạn là "platform".
PLATFORM_BASIS_TRUST = 0.5


# --- Học thêm ảnh hưởng của nội dung (mô hình gốc không có các thông tin này) -----------------
# Kickstarter không có ảnh, video, độ dài câu chuyện lúc ra mắt, nên phần này chỉ học được từ dự
# án Góp Mầm đã kết thúc: hồi quy logistic có phạt (ridge) trên phần dư so với mô hình gốc
# (offset = log-odds mô hình gốc). Mỗi thông tin là CÓ/KHÔNG theo một mức có ý nghĩa (có video,
# từ 3 ảnh, câu chuyện từ 300 từ): dễ giải thích, và vài dự án có giá trị lệch hẳn (vd. mô tả rất
# ngắn) không chi phối được kết quả như khi dùng giá trị liên tục.
CONTENT_FEATURES: tuple[tuple[str, str, float], ...] = (
    ("has_video", "Video giới thiệu", 1.0),
    ("image_count", "Từ 3 ảnh trở lên", 3.0),
    ("story_word_count", "Câu chuyện từ 300 từ trở lên", 300.0),
)
# Ít hơn số dự án này thì chưa học phần nội dung.
CONTENT_MIN_SAMPLES = 20
# Mỗi thông tin cần ít nhất ngần này dự án ở MỖI nhóm (có / không) mới học được.
CONTENT_MIN_GROUP = 15
# Mức phạt ridge: tương đương "thêm" vài dự án không có ảnh hưởng, kéo hệ số về 0 khi ít dữ liệu.
CONTENT_RIDGE = 4.0
# Tổng điều chỉnh do nội dung tối đa ±0,75 log-odds (≈ ±18 điểm quanh mức 50%).
CONTENT_SHIFT_LIMIT = 0.75
CONTENT_NOTE_UP = "Học từ dự án Góp Mầm đã kết thúc: đi cùng khả năng đạt cao hơn"
CONTENT_NOTE_DOWN = "Học từ dự án Góp Mầm đã kết thúc: đi cùng khả năng đạt thấp hơn"
# Chênh lệch dưới nửa điểm phần trăm không nêu thành yếu tố (như mô hình gốc).
CONTENT_MIN_IMPACT = 0.005


def _content_flags(features: PredictFeatures) -> np.ndarray:
    """1/0 cho từng thông tin nội dung (đạt mức có ý nghĩa hay không)."""
    return np.asarray(
        [
            1.0 if float(getattr(features, name)) >= level else 0.0
            for name, _, level in CONTENT_FEATURES
        ]
    )


class ContentModel:
    """Hệ số nội dung học từ lịch sử; thông tin không đủ dự án ở cả hai nhóm thì để 0."""

    def __init__(self, history: list[PlatformOutcome], model_probs: np.ndarray) -> None:
        self.samples = len(history)
        k = len(CONTENT_FEATURES)
        self.mean = np.zeros(k)
        self.std = np.ones(k)
        self.coef = np.zeros(k)
        self.learned = np.zeros(k, dtype=bool)
        if self.samples < CONTENT_MIN_SAMPLES:
            return
        values = np.asarray([_content_flags(item.features) for item in history])
        for j in range(k):
            column = values[:, j]
            with_flag = int(column.sum())
            if min(with_flag, self.samples - with_flag) >= CONTENT_MIN_GROUP:
                self.mean[j], self.std[j], self.learned[j] = column.mean(), column.std(), True
        if not self.learned.any():
            return
        outcomes = np.asarray([1.0 if item.reached else 0.0 for item in history])
        clipped = np.clip(model_probs, 1e-4, 1 - 1e-4)
        offset = np.log(clipped / (1 - clipped))
        columns = np.flatnonzero(self.learned)
        z = (values[:, columns] - self.mean[columns]) / self.std[columns]
        self.coef[columns] = _ridge_logistic(z, outcomes, offset)

    def shift_terms(self, features: PredictFeatures) -> np.ndarray:
        """Phần log-odds mỗi thông tin đóng góp cho chiến dịch này (0 nếu chưa học được)."""
        z = (_content_flags(features) - self.mean) / self.std
        return np.where(self.learned, self.coef * z, 0.0)

    def trust(self) -> float:
        return self.samples / (self.samples + PRIOR_STRENGTH) if self.samples else 0.0


def _ridge_logistic(z: np.ndarray, y: np.ndarray, offset: np.ndarray) -> np.ndarray:
    """Hồi quy logistic có offset + hệ số chặn (không phạt) + phạt ridge cho hệ số (Newton/IRLS)."""
    n, k = z.shape
    design = np.hstack([np.ones((n, 1)), z])
    penalty = np.diag([0.0] + [CONTENT_RIDGE] * k)
    beta = np.zeros(k + 1)
    for _ in range(50):
        p = 1.0 / (1.0 + np.exp(-(offset + design @ beta)))
        weights = p * (1.0 - p)
        gradient = design.T @ (y - p) - penalty @ beta
        hessian = design.T @ (design * weights[:, None]) + penalty + 1e-9 * np.eye(k + 1)
        step = np.linalg.solve(hessian, gradient)
        beta += step
        if float(np.max(np.abs(step))) < 1e-8:
            break
    return beta[1:]


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
        self.content = ContentModel(history, self.model_probs)

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
        calibrated_logit = _logit(base_probability) + trust * shift

        # Nội dung: cộng phần học từ Góp Mầm (có chặn), rồi tính ảnh hưởng của từng thông tin.
        terms = self.content.trust() * self.content.shift_terms(query)
        total = float(terms.sum())
        if abs(total) > CONTENT_SHIFT_LIMIT:
            terms = terms * (CONTENT_SHIFT_LIMIT / abs(total))
            total = float(terms.sum())
        probability = _sigmoid(calibrated_logit + total)
        content = [
            ContentEffect(
                feature=name,
                label=label,
                status="learned" if self.content.learned[j] else "insufficient_data",
                coefficient=round(float(self.content.coef[j]), 6),
                impact=(
                    round(probability - _sigmoid(calibrated_logit + total - float(terms[j])), 6)
                    if self.content.learned[j]
                    else None
                ),
            )
            for j, (name, label, _) in enumerate(CONTENT_FEATURES)
        ]
        detail = PlatformAdjustment(
            samples=len(self.history),
            similar=round(n_similar, 3),
            observed_rate=round(observed, 6),
            model_rate=round(model_rate, 6),
            weight=round(trust, 6),
            base_probability=round(base_probability, 6),
            content=content,
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
    # Thông tin nội dung học được và có ảnh hưởng đáng kể thì thêm vào danh sách yếu tố giải thích.
    content_factors = [
        Factor(
            feature=effect.feature,
            label=effect.label,
            direction="UP" if effect.impact > 0 else "DOWN",
            weight=effect.impact,
            note=CONTENT_NOTE_UP if effect.impact > 0 else CONTENT_NOTE_DOWN,
        )
        for effect in platform.content
        if effect.impact is not None and abs(effect.impact) >= CONTENT_MIN_IMPACT
    ]
    factors = sorted(
        [*response.factors, *content_factors], key=lambda f: abs(f.weight), reverse=True
    )
    return response.model_copy(
        update={
            "probability": round(probability, 6),
            "prediction": "LIKELY" if probability >= 0.5 else "UNLIKELY",
            "confidence": round(2.0 * abs(probability - 0.5), 6),
            "platform": platform,
            "factors": factors,
        }
    )


def _smooth(values: np.ndarray, sigma: float) -> np.ndarray:
    """Làm mượt Gauss; ở hai đầu chỉ lấy trung bình các điểm có thật (không kéo về 0)."""
    if len(values) < 2 or sigma <= 0:
        return values
    offsets = np.arange(len(values))
    weights = np.exp(-0.5 * ((offsets[:, None] - offsets[None, :]) / sigma) ** 2)
    return (weights @ values) / weights.sum(axis=1)


def estimate(predictor: PredictorService, request: EstimateRequest) -> EstimateResponse:
    """Gợi ý thời hạn gây quỹ cho số tiền người dùng tự đặt (AI không gợi ý số tiền)."""
    features = request.features
    if features.name_words <= 0:
        # Ở bước đặt mục tiêu thường chưa có tên; tên 0 từ nằm ngoài dữ liệu huấn luyện.
        features = features.model_copy(update={"name_words": TYPICAL_NAME_WORDS})
    history = request.history
    min_days = request.min_duration_days
    chosen_days = features.duration_days if features.duration_days >= min_days else None
    # Ngày đã chọn vượt 60 ngày (hồ sơ cũ) vẫn được vẽ tới đó để so sánh, nhưng gợi ý chỉ ≤ 60.
    max_days = max(MAX_DURATION_DAYS, chosen_days or 0, min_days)

    # Ước lượng (kèm yếu tố giải thích) cho thời hạn đang chọn, nếu đã chọn ngày kết thúc.
    current = predictor.predict(features, history=history) if chosen_days else None
    use_model = not current.fallback if current else predictor.model_available()
    learner = PlatformLearner(predictor, history, use_model=use_model)

    # --- Đường khả năng đạt theo từng ngày (cùng số tiền đã đặt), đã hiệu chỉnh rồi làm mượt ---
    days_axis = np.arange(min_days, max_days + 1)
    rows = [features.model_copy(update={"duration_days": int(days)}) for days in days_axis]
    curve = _smooth(np.asarray(learner.calibrated(rows)), SMOOTHING_DAYS)

    def at(days: int) -> float:
        return float(curve[days - min_days])

    # Chỉ gợi ý trong thời hạn cho phép (trục ngày tăng dần nên phần cho phép nằm ở đầu).
    allowed = max(1, int(np.count_nonzero(days_axis <= MAX_DURATION_DAYS)))
    best = float(curve[:allowed].max())
    # Thời hạn ngắn nhất mà khả năng đạt gần bằng mức tốt nhất: kéo dài thêm không đáng nếu chỉ
    # hơn vài điểm (và dữ liệu không phân biệt được chênh lệch nhỏ như vậy).
    best_index = int(np.argmax(curve[:allowed] >= best - DURATION_RANGE_TOLERANCE))
    # Khoảng liền nhau từ đó mà khả năng đạt không kém quá DURATION_RANGE_TOLERANCE.
    low = high = best_index
    while low > 0 and curve[low - 1] >= best - DURATION_RANGE_TOLERANCE:
        low -= 1
    while high < allowed - 1 and curve[high + 1] >= best - DURATION_RANGE_TOLERANCE:
        high += 1
    best_days = int(days_axis[best_index])

    base = float(predictor.score_many([rows[best_index]], learner.use_model)[0])
    adjusted = learner.adjust(rows[best_index], base)
    trusted = adjusted is not None and adjusted[0].weight >= PLATFORM_BASIS_TRUST
    duration = DurationSuggestion(
        days=best_days,
        low=int(days_axis[low]),
        high=int(days_axis[high]),
        probability=round(float(curve[best_index]), 6),
        basis="platform" if trusted else "model",
    )
    shown = sorted(
        {d for d in DURATION_GRID if min_days <= d <= max_days}
        | {min_days}
        | ({chosen_days} if chosen_days else set())
    )
    options = [DurationOption(days=d, probability=round(at(d), 6)) for d in shown]
    if current:
        # Cùng số với bảng so sánh (đường đã làm mượt), giữ nguyên phần giải thích của mô hình.
        current = current.model_copy(update={"probability": round(at(chosen_days), 6)})

    # --- Dự án tương tự đã kết thúc (cùng lĩnh vực, số tiền gần nhau; không xét thời hạn) ---------
    query = features.model_copy(update={"duration_days": 0})
    ranked = sorted(
        zip(history, learner.weights(query), strict=True), key=lambda pair: pair[1], reverse=True
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
        duration=duration,
        options=options,
        chosen_days=chosen_days,
        similar=similar,
        samples=len(history),
        similar_reached=sum(1 for item in similar if item.reached),
        notes=notes,
    )
