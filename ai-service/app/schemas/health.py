from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    service: Literal["ai-service"]
    status: Literal["ok"]
    model_status: Literal["not_loaded", "ready", "unavailable"]
    model_version: str | None
