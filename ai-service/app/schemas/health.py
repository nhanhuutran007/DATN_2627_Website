from typing import Literal

from pydantic import BaseModel


class ModelState(BaseModel):
    loaded: bool
    version: str | None
    # Phương án dùng thay khi mô hình không nạp được
    fallback: str


class HealthResponse(BaseModel):
    service: Literal["ai-service"]
    status: Literal["ok"]
    # ready: mọi mô hình đã nạp; degraded: ít nhất một tính năng đang chạy phương án dự phòng
    model_status: Literal["ready", "degraded"]
    model_version: str | None
    models: dict[str, ModelState]
