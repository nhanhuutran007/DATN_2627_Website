from fastapi import APIRouter

from app.api.v1.routes.fraud import router as fraud_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.predict import router as predict_router
from app.api.v1.routes.recommend import router as recommend_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(recommend_router, tags=["recommend"])
api_router.include_router(predict_router, tags=["predict"])
api_router.include_router(fraud_router, tags=["fraud"])