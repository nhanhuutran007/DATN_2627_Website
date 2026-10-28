from fastapi import APIRouter

from app.schemas.health import HealthResponse
from app.services.model_status import collect_model_states

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    models = collect_model_states()
    return HealthResponse(
        service="ai-service",
        status="ok",
        model_status="ready" if all(state.loaded for state in models.values()) else "degraded",
        model_version=models["success_prediction"].version,
        models=models,
    )
