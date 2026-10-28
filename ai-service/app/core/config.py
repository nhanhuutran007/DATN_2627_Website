import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    environment: str
    model_path: Path
    success_metrics_path: Path
    success_features_path: Path
    category_similarity_path: Path
    fraud_classifier_path: Path
    fraud_reference_path: Path
    api_key: str | None


settings = Settings(
    environment=os.getenv("APP_ENV", "development"),
    model_path=Path(os.getenv("AI_MODEL_PATH", "models/success_model.pkl")),
    success_metrics_path=Path(
        os.getenv("AI_SUCCESS_METRICS_PATH", "models/success_metrics.json")
    ),
    success_features_path=Path(
        os.getenv("AI_SUCCESS_FEATURES_PATH", "models/success_features.json")
    ),
    category_similarity_path=Path(
        os.getenv("AI_CATEGORY_SIMILARITY_PATH", "models/category_similarity.json")
    ),
    fraud_classifier_path=Path(
        os.getenv("AI_FRAUD_CLASSIFIER_PATH", "models/fraud_classifier.pkl")
    ),
    fraud_reference_path=Path(
        os.getenv("AI_FRAUD_REFERENCE_PATH", "models/fraud_score_reference.json")
    ),
    api_key=os.getenv("AI_API_KEY") or None,
)
