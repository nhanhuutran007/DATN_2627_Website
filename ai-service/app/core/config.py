import os
from dataclasses import dataclass
from pathlib import Path


def _read_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    environment: str
    load_model: bool
    model_path: Path


settings = Settings(
    environment=os.getenv("APP_ENV", "development"),
    load_model=_read_bool("AI_LOAD_MODEL"),
    model_path=Path(os.getenv("AI_MODEL_PATH", "models/success_model.pkl")),
)
