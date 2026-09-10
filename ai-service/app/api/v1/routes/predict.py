from functools import lru_cache

from fastapi import APIRouter

from app.schemas.predict import PredictRequest, PredictResponse
from app.services.predictor import PredictorService

router = APIRouter()


@lru_cache(maxsize=1)
def _get_service() -> PredictorService:
    return PredictorService()


@router.post("/predict", response_model=PredictResponse)
def predict(payload: PredictRequest) -> PredictResponse:
    return _get_service().predict(payload.features, campaign_id=payload.campaign_id)