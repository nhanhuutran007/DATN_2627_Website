from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1.router import api_router
from app.core.config import settings
from app.services.model_registry import ModelRegistry


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    registry = ModelRegistry(settings.model_path)
    if settings.load_model:
        registry.load()
    app.state.model_registry = registry
    yield


app = FastAPI(
    title="Crowdfunding AI Service",
    version="0.1.0",
    description="Inference boundary for versioned crowdfunding models.",
    lifespan=lifespan,
)
app.include_router(api_router, prefix="/api/v1")
