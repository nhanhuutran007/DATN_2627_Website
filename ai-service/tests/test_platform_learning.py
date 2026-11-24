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
    assert [option.days for option in result.options] == [30, 45, 60]
    duration = result.duration
    assert 30 <= duration.low <= duration.days <= duration.high <= 60
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


def _content_history(
    video_success: float, video_fail: float, count: int = 30
) -> list[PlatformOutcome]:
    """Lịch sử cùng lĩnh vực/mục tiêu/thời hạn; tỷ lệ có video khác nhau ở nhóm đạt và không đạt."""
    items: list[PlatformOutcome] = []
    for reached, share in ((True, video_success), (False, video_fail)):
        for index in range(count):
            has_video = index < round(share * count)
            items.append(
                PlatformOutcome(
                    campaign_id=f"c-{reached}-{index}",
                    title=f"Dự án {index}",
                    features=_features().model_copy(
                        update={"has_video": has_video, "image_count": 1, "story_word_count": 300}
                    ),
                    reached=reached,
                    raised=1.0,
                )
            )
    return items


def test_content_effect_is_learned_when_projects_differ() -> None:
    # Dự án đạt phần lớn có video, dự án không đạt phần lớn không có → video được học là có ích.
    history = _content_history(video_success=0.8, video_fail=0.2)
    service = PredictorService()
    video = _features().model_copy(update={"has_video": True})
    no_video = _features().model_copy(update={"has_video": False})
    with_video = service.predict(video, history=history)
    without = service.predict(no_video, history=history)

    assert with_video.probability > without.probability
    effects = {effect.feature: effect for effect in with_video.platform.content}
    assert effects["has_video"].status == "learned" and effects["has_video"].impact > 0
    # Ảnh và câu chuyện giống hệt nhau ở mọi dự án → chưa đủ dữ liệu, không ảnh hưởng.
    assert effects["image_count"].status == "insufficient_data"
    assert effects["image_count"].impact is None
    assert any(f.feature == "has_video" and f.direction == "UP" for f in with_video.factors)


def test_content_is_ignored_when_every_project_looks_the_same() -> None:
    history = _content_history(video_success=0.0, video_fail=0.0)
    video = _features().model_copy(update={"has_video": True})
    result = PredictorService().predict(video, history=history)
    assert all(effect.status == "insufficient_data" for effect in result.platform.content)
    content = {"has_video", "image_count", "story_word_count"}
    assert not any(f.feature in content for f in result.factors)


def test_content_shift_is_bounded() -> None:
    # Video tách tuyệt đối hai nhóm: ridge + chặn giữ điều chỉnh trong giới hạn (≤ 1 log-odds).
    history = _content_history(video_success=1.0, video_fail=0.0)
    service = PredictorService()
    result = service.predict(_features().model_copy(update={"has_video": True}), history=history)
    no_content = service.predict(_features(), history=_content_history(0.0, 0.0))
    import math

    def logit(p: float) -> float:
        return math.log(p / (1 - p))

    # Xác suất trả về đã làm tròn 6 chữ số nên cho sai số nhỏ.
    assert logit(result.probability) - logit(no_content.probability) <= 1.0 + 1e-4


def test_a_few_unusual_projects_are_not_enough_to_learn() -> None:
    # 9/60 dự án có video (đều đạt): dưới 15 dự án mỗi nhóm nên chưa học, tránh học nhầm như khi
    # vài dự án thật nằm giữa nhiều dự án mô phỏng giống hệt nhau.
    history = _content_history(video_success=0.3, video_fail=0.0)
    video = _features().model_copy(update={"has_video": True})
    result = PredictorService().predict(video, history=history)
    effects = {effect.feature: effect for effect in result.platform.content}
    assert effects["has_video"].status == "insufficient_data"
    assert not any(f.feature == "has_video" for f in result.factors)
