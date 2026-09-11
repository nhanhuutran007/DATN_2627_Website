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
    success_metrics_path: Path
    success_features_path: Path
    recommender_index_path: Path
    fraud_model_path: Path
    fraud_scaler_path: Path
    api_key: str | None


settings = Settings(
    environment=os.getenv("APP_ENV", "development"),
    load_model=_read_bool("AI_LOAD_MODEL"),
    model_path=Path(os.getenv("AI_MODEL_PATH", "models/success_model.pkl")),
    success_metrics_path=Path(
        os.getenv("AI_SUCCESS_METRICS_PATH", "models/success_metrics.json")
    ),
    success_features_path=Path(
        os.getenv("AI_SUCCESS_FEATURES_PATH", "models/success_features.json")
    ),
    recommender_index_path=Path(
        os.getenv("AI_RECOMMENDER_INDEX_PATH", "data/synthetic_campaigns.csv")
    ),
    fraud_model_path=Path(os.getenv("AI_FRAUD_MODEL_PATH", "models/fraud_isolation.pkl")),
    fraud_scaler_path=Path(os.getenv("AI_FRAUD_SCALER_PATH", "models/fraud_scaler.pkl")),
    api_key=os.getenv("AI_API_KEY") or None,
)