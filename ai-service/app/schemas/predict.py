from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


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


class ContentEffect(BaseModel):
    """Thông tin nội dung mô hình gốc (Kickstarter) không có, học riêng từ dữ liệu Góp Mầm."""

    feature: str
    label: str
    # "learned": đủ dự án khác nhau để học; "insufficient_data": các dự án gần như giống nhau
    status: Literal["learned", "insufficient_data"]
    # Hệ số trên thang log-odds cho mỗi độ lệch chuẩn (đã co về 0 khi ít dữ liệu)
    coefficient: float = 0.0
    # Chênh lệch xác suất của chính chiến dịch này do thông tin đó (−1…1), None nếu chưa học được
    impact: float | None = None


class PlatformAdjustment(BaseModel):
    """Phần hiệu chỉnh học từ dự án Góp Mầm đã kết thúc (cộng thêm vào dự đoán của mô hình gốc)."""

    samples: int  # số dự án đã kết thúc gửi kèm
    similar: float  # số dự án tương tự quy đổi (tổng trọng số)
    observed_rate: float  # tỷ lệ đạt mục tiêu thực tế của các dự án tương tự (đã làm trơn)
    model_rate: float  # tỷ lệ mô hình gốc dự đoán cho chính các dự án đó
    weight: float  # 0…1: mức tin vào dữ liệu Góp Mầm, tăng dần theo số dự án tương tự
    base_probability: float  # dự đoán của mô hình gốc trước khi hiệu chỉnh
    # Ảnh hưởng của nội dung (video, ảnh, câu chuyện) học từ chính các dự án Góp Mầm đã kết thúc
    content: list[ContentEffect] = Field(default_factory=list)


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
    # Số tiền do người tạo tự đặt (bắt buộc); duration_days = 0 khi chưa chọn ngày kết thúc
    features: PredictFeatures = Field(default_factory=PredictFeatures)
    history: list[PlatformOutcome] = Field(default_factory=list, max_length=MAX_HISTORY)
    # Thời hạn ngắn nhất được phép chọn (nền tảng yêu cầu ≥ 1 tháng)
    min_duration_days: int = Field(30, ge=1, le=365)

    @field_validator("features")
    @classmethod
    def _goal_required(cls, value: PredictFeatures) -> PredictFeatures:
        if value.goal_amount <= 0:
            raise ValueError("goal_amount phải lớn hơn 0: AI chỉ gợi ý thời hạn cho số tiền đã đặt")
        return value


class DurationOption(BaseModel):
    days: int
    probability: float


class DurationSuggestion(BaseModel):
    days: int  # thời hạn ngắn nhất có khả năng đạt gần bằng mức tốt nhất (đường đã làm mượt)
    # Khoảng thời hạn có khả năng đạt gần bằng mức tốt nhất (dữ liệu không phân biệt được
    # chênh lệch trong khoảng này)
    low: int
    high: int
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
    current: PredictResponse | None  # ước lượng cho thời hạn đang chọn (nếu đã chọn ngày kết thúc)
    duration: DurationSuggestion
    options: list[DurationOption]  # khả năng đạt ở từng thời hạn, cùng số tiền đã đặt
    chosen_days: int | None = None  # thời hạn của ngày kết thúc đang chọn (có trong options)
    similar: list[SimilarCampaign]
    samples: int  # số dự án Góp Mầm đã kết thúc dùng để học
    similar_reached: int  # trong các dự án tương tự hiển thị, bao nhiêu dự án đạt
    notes: list[str] = Field(default_factory=list)
