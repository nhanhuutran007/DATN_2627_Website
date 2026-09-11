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