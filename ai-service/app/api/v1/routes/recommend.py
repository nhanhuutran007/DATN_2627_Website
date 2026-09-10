from functools import lru_cache

from fastapi import APIRouter

from app.schemas.recommend import RecommendRequest, RecommendResponse
from app.services.recommender import RecommenderService

router = APIRouter()


@lru_cache(maxsize=1)
def _get_service() -> RecommenderService:
    return RecommenderService()


@router.post("/recommend", response_model=RecommendResponse)
def recommend(payload: RecommendRequest) -> RecommendResponse:
    return _get_service().recommend(payload)