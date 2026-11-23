"""Tự học từ dự án Góp Mầm đã kết thúc: hiệu chỉnh xác suất và gợi ý mục tiêu/thời hạn."""

from dataclasses import replace

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

import app.core.security as security
from app.main import app
from app.schemas.predict import EstimateRequest, PlatformOutcome, PredictFeatures
from app.services.platform_learning import estimate, similarity
from app.services.predictor import PredictorService


def _features(category: int = 2, goal: float = 50_000_000, days: int = 30) -> PredictFeatures:
    return PredictFeatures(
        category_id=category, goal_amount=goal, duration_days=days, name_words=6,
        launch_month=6, launch_weekday=1,
    )


def _outcomes(category: int, reached: bool, count: int, goal: float = 50_000_000):
    return [
        PlatformOutcome(
            campaign_id=f"{category}-{reached}-{index}",
            title=f"Dự án {index}",
            features=_features(category, goal),
            reached=reached,
            raised=goal * (1.1 if reached else 0.3),
        )
        for index in range(count)
    ]


def test_no_history_keeps_base_prediction() -> None:
    service = PredictorService()
    base = service.predict(_features())
    same = service.predict(_features(), history=[])
    assert same.probability == base.probability
    assert same.platform is None


def test_successful_history_raises_probability_and_failures_lower_it() -> None:
    service = PredictorService()
    base = service.predict(_features()).probability
    up = service.predict(_features(), history=_outcomes(2, True, 20))
    down = service.predict(_features(), history=_outcomes(2, False, 20))

    assert up.probability > base > down.probability
    assert up.platform is not None and up.platform.samples == 20
    assert up.platform.base_probability == round(base, 6)


def test_trust_grows_with_more_similar_projects() -> None:
    service = PredictorService()
    few = service.predict(_features(), history=_outcomes(2, True, 2)).platform
    many = service.predict(_features(), history=_outcomes(2, True, 40)).platform
    assert few is not None and many is not None
    assert 0 < few.weight < many.weight < 1


def test_similarity_prefers_same_category_and_close_goal() -> None:
    query = _features(2, 50_000_000)
    assert similarity(query, _features(2, 50_000_000)) > similarity(query, _features(3, 50_000_000))
    assert similarity(query, _features(2, 60_000_000)) > similarity(query, _features(2, 1e9))


def test_estimate_requires_goal_amount() -> None:
    # Số tiền do người tạo tự quyết; AI không gợi ý số tiền nên không nhận yêu cầu thiếu số tiền.
    with pytest.raises(ValidationError):
        EstimateRequest(features=_features(2, 0, 0))


def test_estimate_suggests_duration_for_the_given_goal() -> None:
    history = _outcomes(2, True, 4) + _outcomes(2, False, 3)
    result = estimate(
        PredictorService(), EstimateRequest(features=_features(2, 50_000_000, 0), history=history)
    )

    assert result.current is None and result.chosen_days is None  # chưa chọn ngày kết thúc
    assert [option.days for option in result.options] == [30, 45, 60, 90]
    duration = result.duration
    assert 30 <= duration.low <= duration.days <= duration.high <= 90
    # Mức gợi ý không kém mức tốt nhất trong bảng quá 2 điểm.
    assert duration.probability >= max(o.probability for o in result.options) - 0.02 - 1e-9
    assert result.samples == 7
    assert not hasattr(result, "goal")


def test_duration_curve_has_no_round_number_dip() -> None:
    # Mô hình gốc có "đáy giả" ở đúng 30 ngày (mặc định Kickstarter): sau khi làm mượt, 30 và 31
    # ngày phải gần như bằng nhau.
    result = estimate(
        PredictorService(), EstimateRequest(features=_features(2, 50_000_000, 31))
    )
    by_days = {option.days: option.probability for option in result.options}
    assert abs(by_days[30] - by_days[31]) < 0.02


def test_estimate_includes_chosen_duration_and_matches_current() -> None:
    history = _outcomes(2, True, 5) + _outcomes(2, False, 2)
    result = estimate(
        PredictorService(),
        EstimateRequest(features=_features(2, 50_000_000, 40), history=history),
    )
    assert result.chosen_days == 40
    assert result.current is not None
    option = next(o for o in result.options if o.days == 40)
    assert abs(option.probability - result.current.probability) < 1e-6
    assert result.similar and result.similar[0].similarity >= result.similar[-1].similarity


def test_estimate_without_history_notes_few_samples() -> None:
    result = estimate(PredictorService(), EstimateRequest(features=_features(2, 50_000_000, 0)))
    assert result.similar == []
    assert result.notes


def test_estimate_respects_minimum_duration() -> None:
    result = estimate(
        PredictorService(),
        EstimateRequest(features=_features(2, 50_000_000, 10), min_duration_days=30),
    )
    assert result.duration.days >= 30
    assert all(option.days >= 30 for option in result.options)


def test_estimate_endpoint(monkeypatch) -> None:
    monkeypatch.setattr(security, "settings", replace(security.settings, api_key=None))
    client = TestClient(app)
    payload = {
        "features": {"category_id": 2, "goal_amount": 50_000_000, "duration_days": 30},
        "history": [
            {
                "campaign_id": "a",
                "title": "Thư viện",
                "features": {"category_id": 2, "goal_amount": 40_000_000, "duration_days": 30},
                "reached": True,
                "raised": 42_000_000,
            }
        ],
    }
    response = client.post("/api/v1/estimate", json=payload)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["samples"] == 1
    assert body["current"]["platform"]["samples"] == 1
    assert body["similar"][0]["campaign_id"] == "a"
    assert "goal" not in body

    payload["features"]["goal_amount"] = 0
    assert client.post("/api/v1/estimate", json=payload).status_code == 422
