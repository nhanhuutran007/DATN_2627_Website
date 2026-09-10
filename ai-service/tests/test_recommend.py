from app.schemas.recommend import CampaignFeature, RecommendRequest, UserEvent
from app.services.recommender import RecommenderService


def _candidates() -> list[CampaignFeature]:
    return [
        CampaignFeature(
            campaign_id=101,
            category="Giáo dục",
            title="Sách lập trình cho trẻ",
            views=500,
            backers_count=30,
            profile_score=88,
            days_left=20,
        ),
        CampaignFeature(
            campaign_id=102,
            category="Y tế",
            title="Quỹ hỗ trợ bệnh viện",
            views=900,
            backers_count=60,
            profile_score=70,
            days_left=5,
        ),
        CampaignFeature(
            campaign_id=103,
            category="Công nghệ",
            title="Thiết bị IoT nông nghiệp",
            views=1200,
            backers_count=95,
            profile_score=92,
            days_left=40,
        ),
    ]


def test_cold_start_returns_ranked_items_without_history() -> None:
    service = RecommenderService()
    request = RecommendRequest(user_id=7, preferences=[], history=[], candidates=_candidates())
    response = service.recommend(request)

    assert response.source == "COLD_START"
    assert response.fallback is False
    assert response.items
    scores = [item.score for item in response.items]
    assert scores == sorted(scores, reverse=True)


def test_exclude_ids_are_respected() -> None:
    service = RecommenderService()
    request = RecommendRequest(
        user_id=7,
        preferences=[],
        exclude_ids=[101, 103],
        history=[],
        candidates=_candidates(),
    )
    response = service.recommend(request)

    returned_ids = {item.campaign_id for item in response.items}
    assert 101 not in returned_ids
    assert 103 not in returned_ids


def test_history_drives_collaborative_source() -> None:
    service = RecommenderService()
    request = RecommendRequest(
        user_id=7,
        preferences=[],
        history=[UserEvent(campaign_id=1, event_type="CONTRIBUTE", category="Giáo dục")],
        candidates=_candidates(),
    )
    response = service.recommend(request)

    assert response.source == "COLLABORATIVE"
    assert response.items[0].campaign_id == 101


def test_preferences_drive_content_source() -> None:
    service = RecommenderService()
    request = RecommendRequest(
        user_id=7,
        preferences=["Y tế"],
        history=[],
        candidates=_candidates(),
    )
    response = service.recommend(request)

    assert response.source == "CONTENT"
    assert response.items[0].campaign_id == 102