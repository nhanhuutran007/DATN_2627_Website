from functools import lru_cache

from fastapi import APIRouter

from app.schemas.predict import EstimateRequest, EstimateResponse, PredictRequest, PredictResponse
from app.services.platform_learning import estimate as estimate_campaign
from app.services.predictor import PredictorService

router = APIRouter()


@lru_cache(maxsize=1)
def _get_service() -> PredictorService:
    return PredictorService()


@router.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest) -> PredictResponse:
    return _get_service().predict(
        payload.features, campaign_id=payload.campaign_id, history=payload.history
    )


@router.post("/estimate", response_model=EstimateResponse)
def estimate(payload: EstimateRequest) -> EstimateResponse:
    """Gợi ý mục tiêu và thời hạn hợp lý khi tạo chiến dịch, học từ dự án Góp Mầm đã kết thúc."""
    return estimate_campaign(_get_service(), payload)
