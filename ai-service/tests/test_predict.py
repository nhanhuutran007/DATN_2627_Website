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

def test_predict_uses_trained_feature_subset(tmp_path) -> None:
    # Mô hình huấn luyện trên tập đặc trưng nhỏ hơn (vd. notebook Kickstarter) phải được dùng thật,
    # không rơi về heuristic vì lệch số cột.
    import json

    import joblib
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier

    names = ["category_id", "goal_amount", "duration_days"]
    rng = np.random.default_rng(0)
    x = np.column_stack(
        [rng.integers(0, 6, 200), rng.uniform(1e6, 5e8, 200), rng.integers(7, 90, 200)]
    )
    y = (x[:, 1] < 2e8).astype(int)
    model = RandomForestClassifier(n_estimators=10, random_state=0).fit(x, y)
    joblib.dump(model, tmp_path / "success_model.pkl")
    (tmp_path / "success_features.json").write_text(json.dumps(names), encoding="utf-8")

    service = PredictorService(
        model_path=tmp_path / "success_model.pkl",
        features_path=tmp_path / "success_features.json",
        metrics_path=tmp_path / "missing_metrics.json",
    )
    response = service.predict(_sample_features())

    assert response.fallback is False
    assert {factor.feature for factor in response.factors} <= set(names)


CALENDAR_FEATURES = [
    "category_id",
    "goal_amount",
    "duration_days",
    "name_words",
    "launch_month",
    "launch_weekday",
]


def _calendar_model_service(tmp_path) -> PredictorService:
    """Mô hình 6 đặc trưng (như notebook 2026.11): thành công khi bắt đầu tháng 11–12."""
    import json

    import joblib
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier

    rng = np.random.default_rng(1)
    n = 600
    x = np.column_stack(
        [
            rng.integers(0, 6, n),
            rng.uniform(1e6, 5e8, n),
            rng.integers(7, 90, n),
            rng.integers(1, 15, n),
            rng.integers(1, 13, n),
            rng.integers(0, 7, n),
        ]
    )
    y = (x[:, 4] >= 11).astype(int)
    model = RandomForestClassifier(n_estimators=20, random_state=0).fit(x, y)
    joblib.dump(model, tmp_path / "success_model.pkl")
    (tmp_path / "success_features.json").write_text(json.dumps(CALENDAR_FEATURES), encoding="utf-8")
    return PredictorService(
        model_path=tmp_path / "success_model.pkl",
        features_path=tmp_path / "success_features.json",
        metrics_path=tmp_path / "missing_metrics.json",
    )


def test_vector_follows_trained_order_with_calendar_features() -> None:
    service = PredictorService()
    features = PredictFeatures(
        category_id=4, goal_amount=10_000_000, duration_days=20,
        name_words=7, launch_month=11, launch_weekday=1,
    )

    vector = service._feature_vector(features, CALENDAR_FEATURES)

    assert vector == [4.0, 10_000_000.0, 20.0, 7.0, 11.0, 1.0]


def test_missing_launch_date_defaults_to_today() -> None:
    service = PredictorService()

    vector = service._feature_vector(PredictFeatures(), ["launch_month", "launch_weekday"])

    assert 1 <= vector[0] <= 12
    assert 0 <= vector[1] <= 6


def test_cyclic_feature_direction_compares_with_average(tmp_path) -> None:
    service = _calendar_model_service(tmp_path)
    base = {"category_id": 2, "goal_amount": 50_000_000, "duration_days": 30, "name_words": 6}

    good = service.predict(PredictFeatures(launch_month=12, launch_weekday=2, **base))
    bad = service.predict(PredictFeatures(launch_month=3, launch_weekday=2, **base))

    assert good.fallback is False
    assert good.probability > bad.probability
    month_good = next(f for f in good.factors if f.feature == "launch_month")
    month_bad = next(f for f in bad.factors if f.feature == "launch_month")
    assert month_good.direction == "UP"
    assert month_bad.direction == "DOWN"
    assert "thuận lợi" in month_good.note


def _fallback_service() -> PredictorService:
    return PredictorService(
        model_path="definitely/missing/success_model.pkl",
        features_path="definitely/missing/success_features.json",
    )


def test_fallback_directions_match_trained_model() -> None:
    service = _fallback_service()
    base = {"category_id": 2, "profile_score": 50, "image_count": 2}

    small = service.predict(PredictFeatures(goal_amount=20_000_000, duration_days=30, **base))
    large = service.predict(PredictFeatures(goal_amount=2_000_000_000, duration_days=30, **base))
    short = service.predict(PredictFeatures(goal_amount=100_000_000, duration_days=30, **base))
    long = service.predict(PredictFeatures(goal_amount=100_000_000, duration_days=90, **base))

    # Mục tiêu lớn hơn và kêu gọi dài hơn đều làm giảm khả năng, như mô hình thật
    assert small.probability > large.probability
    assert short.probability > long.probability
    goal_factor = next(f for f in small.factors if f.feature == "goal_amount")
    assert goal_factor.direction == "UP"


def test_fallback_starts_from_base_success_rate() -> None:
    service = _fallback_service()
    neutral = PredictFeatures(
        category_id=2, goal_amount=100_000_000, duration_days=30, profile_score=50, image_count=1
    )

    response = service.predict(neutral)

    # Không có tín hiệu nào lệch khỏi mốc: xác suất gần tỷ lệ thành công nền (40%)
    assert abs(response.probability - 0.4) < 0.05
    assert response.fallback is True
