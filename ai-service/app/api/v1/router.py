from fastapi import APIRouter, Depends

from app.api.v1.routes.fraud import router as fraud_router
from app.api.v1.routes.health import router as health_router
from app.api.v1.routes.predict import router as predict_router
from app.api.v1.routes.recommend import router as recommend_router
from app.core.security import require_api_key

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])

protected_router = APIRouter(dependencies=[Depends(require_api_key)])
protected_router.include_router(recommend_router, tags=["recommend"])
protected_router.include_router(predict_router, tags=["predict"])
protected_router.include_router(fraud_router, tags=["fraud"])
api_router.include_router(protected_router)