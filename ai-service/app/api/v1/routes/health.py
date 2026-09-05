from fastapi import APIRouter, Request

from app.schemas.health import HealthResponse
from app.services.model_registry import ModelRegistry

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health(request: Request) -> HealthResponse:
    registry: ModelRegistry = request.app.state.model_registry
    return HealthResponse(
        service="ai-service",
        status="ok",
        model_status=registry.status,
        model_version=registry.version,
    )
