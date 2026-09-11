from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class CampaignFeature(BaseModel):
    campaign_id: str
    category: str = ""
    title: str = ""
    keywords: list[str] = Field(default_factory=list)
    target: float = 0.0
    duration_days: int = 0
    profile_score: float = 0.0
    funded_ratio: float = 0.0
    days_left: int = 0
    views: int = 0
    backers_count: int = 0
    content_length: int = 0
    image_count: int = 0
    has_video: bool = False
    status: str = ""


class UserEvent(BaseModel):
    campaign_id: str
    event_type: str
    category: str = ""


class RecommendRequest(BaseModel):
    user_id: str | None = None
    preferences: list[str] = Field(default_factory=list)
    exclude_ids: list[str] = Field(default_factory=list)
    candidates: list[CampaignFeature] = Field(default_factory=list)
    history: list[UserEvent] = Field(default_factory=list)


class RecommendItem(BaseModel):
    campaign_id: str
    score: float
    reason: str


class RecommendResponse(BaseModel):
    source: Literal["COLLABORATIVE", "CONTENT", "COLD_START", "POPULAR_FALLBACK"] = "COLD_START"
    fallback: bool = False
    items: list[RecommendItem] = Field(default_factory=list)
    detail: str = ""