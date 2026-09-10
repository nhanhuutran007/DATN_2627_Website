from app.schemas.predict import PredictFeatures
from app.services.predictor import PredictorService


def _sample_features() -> PredictFeatures:
    return PredictFeatures(
        category_id=2,
        goal_amount=120_000_000,
        duration_days=45,
        profile_score=85,
        content_length=6000,
        image_count=8,
        has_video=True,
        story_word_count=1800,
        owner_campaign_count=2,
        owner_credential_approved=True,
        has_budget_report=True,
        early_views=1200,
        early_backers=18,
    )


def test_predict_returns_valid_range() -> None:
    service = PredictorService()
    response = service.predict(_sample_features())

    assert 0.0 <= response.probability <= 1.0
    assert response.prediction in {"LIKELY", "UNLIKELY"}
    assert 0.0 <= response.confidence <= 1.0
    assert response.factors


def test_predict_fallback_when_model_path_invalid() -> None:
    service = PredictorService(
        model_path="definitely/missing/success_model.pkl",
        features_path="definitely/missing/success_features.json",
        metrics_path="definitely/missing/success_metrics.json",
    )
    response = service.predict(_sample_features())

    assert response.fallback is True
    assert response.model is None
    assert 0.0 <= response.probability <= 1.0
    assert response.prediction in {"LIKELY", "UNLIKELY"}