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


class PredictRequest(BaseModel):
    campaign_id: str | None = None
    features: PredictFeatures = Field(default_factory=PredictFeatures)


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