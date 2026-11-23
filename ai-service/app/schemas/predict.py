from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class PredictFeatures(BaseModel):
    category_id: int = 0
    goal_amount: float = 0.0
    duration_days: int = 0
    profile_score: float = 0.0
    content_length: int = 0
    image_count: int = 0
    has_video: bool = False
    story_word_count: int = 0
    owner_campaign_count: int = 0
    owner_credential_approved: bool = False
    has_budget_report: bool = False
    early_views: int = 0
    early_backers: int = 0
    # Có cả trong Kickstarter lẫn nền tảng ngay khi tạo chiến dịch (mô hình 2026.11 trở đi dùng):
    name_words: int = Field(0, ge=0, description="Số từ trong tên chiến dịch")
    launch_month: int | None = Field(
        None, ge=1, le=12, description="Tháng bắt đầu gây quỹ (1–12); thiếu thì lấy tháng hiện tại"
    )
    launch_weekday: int | None = Field(
        None, ge=0, le=6, description="Thứ bắt đầu (0 = thứ Hai … 6 = Chủ nhật); thiếu: hôm nay"
    )


class PlatformOutcome(BaseModel):
    """Một dự án đã kết thúc trên Góp Mầm: đặc trưng lúc ra mắt + kết quả thật (mẫu để tự học)."""

    campaign_id: str | None = None
    title: str | None = Field(None, max_length=200)
    features: PredictFeatures = Field(default_factory=PredictFeatures)
    reached: bool
    raised: float = Field(0.0, ge=0)


# Giới hạn số mẫu mỗi yêu cầu: backend gửi các dự án kết thúc gần nhất.
MAX_HISTORY = 2000


class PredictRequest(BaseModel):
    campaign_id: str | None = None
    features: PredictFeatures = Field(default_factory=PredictFeatures)
    history: list[PlatformOutcome] = Field(default_factory=list, max_length=MAX_HISTORY)


class PlatformAdjustment(BaseModel):
    """Phần hiệu chỉnh học từ dự án Góp Mầm đã kết thúc (cộng thêm vào dự đoán của mô hình gốc)."""

    samples: int  # số dự án đã kết thúc gửi kèm
    similar: float  # số dự án tương tự quy đổi (tổng trọng số)
    observed_rate: float  # tỷ lệ đạt mục tiêu thực tế của các dự án tương tự (đã làm trơn)
    model_rate: float  # tỷ lệ mô hình gốc dự đoán cho chính các dự án đó
    weight: float  # 0…1: mức tin vào dữ liệu Góp Mầm, tăng dần theo số dự án tương tự
    base_probability: float  # dự đoán của mô hình gốc trước khi hiệu chỉnh


class Factor(BaseModel):
    feature: str
    label: str
    direction: Literal["UP", "DOWN"]
    weight: float
    note: str


class PredictResponse(BaseModel):
    probability: float
    prediction: Literal["LIKELY", "UNLIKELY"]
    confidence: float
    model: str | None
    fallback: bool
    metrics: dict | None
    factors: list[Factor] = Field(default_factory=list)
    # Lưu ý riêng cho lần ước lượng này (vd. lĩnh vực không có trong dữ liệu huấn luyện)
    caveats: list[str] = Field(default_factory=list)
    # Có khi yêu cầu gửi kèm lịch sử dự án Góp Mầm đã kết thúc
    platform: PlatformAdjustment | None = None


# --- Gợi ý mục tiêu và thời gian khi tạo chiến dịch -------------------------------------------


class EstimateRequest(BaseModel):
    # goal_amount = 0: chưa nhập mục tiêu, chỉ cần gợi ý
    features: PredictFeatures = Field(default_factory=PredictFeatures)
    history: list[PlatformOutcome] = Field(default_factory=list, max_length=MAX_HISTORY)
    # Thời hạn ngắn nhất được phép chọn (nền tảng yêu cầu ≥ 1 tháng)
    min_duration_days: int = Field(30, ge=1, le=365)


class GoalOption(BaseModel):
    goal_amount: float
    probability: float


class GoalSuggestion(BaseModel):
    low: float
    high: float
    recommended: float
    # Số tiền các dự án đã đạt mục tiêu trên Góp Mầm thực sự gọi được — "category": cùng lĩnh vực,
    # "platform": mọi lĩnh vực (chưa đủ dự án cùng lĩnh vực); "model": quét mô hình đã hiệu chỉnh.
    basis: Literal["category", "platform", "model"]


class DurationSuggestion(BaseModel):
    days: int
    probability: float
    basis: Literal["platform", "model"]


class SimilarCampaign(BaseModel):
    campaign_id: str | None
    title: str | None
    goal_amount: float
    raised: float
    duration_days: int
    reached: bool
    similarity: float


class EstimateResponse(BaseModel):
    current: PredictResponse | None  # ước lượng cho mục tiêu/thời hạn đang nhập (nếu đã nhập)
    goal: GoalSuggestion
    duration: DurationSuggestion
    options: list[GoalOption]  # khả năng đạt ở vài mức mục tiêu quanh mức gợi ý
    similar: list[SimilarCampaign]
    samples: int  # số dự án Góp Mầm đã kết thúc dùng để học
    similar_reached: int  # trong các dự án tương tự hiển thị, bao nhiêu dự án đạt
    notes: list[str] = Field(default_factory=list)
