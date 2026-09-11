from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class FraudRequest(BaseModel):
    entity_type: Literal["USER", "CAMPAIGN", "CONTRIBUTION", "TRANSACTION"] = "USER"
    entity_id: str | None = None
    features: dict[str, float] = Field(default_factory=dict)


class FraudReason(BaseModel):
    group: str
    label: str
    weight: float


class FraudResponse(BaseModel):
    risk_score: float
    level: Literal["HIGH", "MEDIUM", "LOW"]
    method: Literal["ENSEMBLE", "RULE"]
    reasons: list[FraudReason] = Field(default_factory=list)
    evidences: dict[str, float] = Field(default_factory=dict)
    fallback: bool