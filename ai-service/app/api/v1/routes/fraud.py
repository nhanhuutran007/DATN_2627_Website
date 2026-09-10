from functools import lru_cache

from fastapi import APIRouter

from app.schemas.fraud import FraudRequest, FraudResponse
from app.services.fraud_detector import FraudDetectorService

router = APIRouter()


@lru_cache(maxsize=1)
def _get_service() -> FraudDetectorService:
    return FraudDetectorService()


@router.post("/fraud/score", response_model=FraudResponse)
def fraud_score(payload: FraudRequest) -> FraudResponse:
    return _get_service().score(payload.entity_type, payload.entity_id, payload.features)