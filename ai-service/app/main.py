from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.services.model_status import collect_model_states


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Nạp sẵn mọi mô hình lúc khởi động để yêu cầu đầu tiên không phải chờ
    collect_model_states()
    yield


app = FastAPI(
    title="Crowdfunding AI Service",
    version="0.1.0",
    description="Inference boundary for versioned crowdfunding models.",
    lifespan=lifespan,
)
app.include_router(api_router, prefix="/api/v1")
