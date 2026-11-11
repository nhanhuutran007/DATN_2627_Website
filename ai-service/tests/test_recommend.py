from app.schemas.recommend import CampaignFeature, RecommendRequest, UserEvent
from app.services.recommender import RecommenderService


def _candidates() -> list[CampaignFeature]:
    return [
        CampaignFeature(
            campaign_id="camp-101",
            category="Giáo dục",
            title="Sách lập trình cho trẻ",
            views=500,
            backers_count=30,
            profile_score=88,
            days_left=20,
        ),
        CampaignFeature(
            campaign_id="camp-102",
            category="Y tế",
            title="Quỹ hỗ trợ bệnh viện",
            views=900,
            backers_count=60,
            profile_score=70,
            days_left=5,
        ),
        CampaignFeature(
            campaign_id="camp-103",
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
    request = RecommendRequest(
        user_id="user-7", preferences=[], history=[], candidates=_candidates()
    )
    response = service.recommend(request)

    assert response.source == "COLD_START"
    assert response.fallback is False
    assert response.items
    scores = [item.score for item in response.items]
    assert scores == sorted(scores, reverse=True)


def test_exclude_ids_are_respected() -> None:
    service = RecommenderService()
    request = RecommendRequest(
        user_id="user-7",
        preferences=[],
        exclude_ids=["camp-101", "camp-103"],
        history=[],
        candidates=_candidates(),
    )
    response = service.recommend(request)

    returned_ids = {item.campaign_id for item in response.items}
    assert "camp-101" not in returned_ids
    assert "camp-103" not in returned_ids


def test_history_drives_collaborative_source() -> None:
    service = RecommenderService()
    request = RecommendRequest(
        user_id="user-7",
        preferences=[],
        history=[UserEvent(campaign_id="camp-1", event_type="CONTRIBUTE", category="Giáo dục")],
        candidates=_candidates(),
    )
    response = service.recommend(request)

    assert response.source == "COLLABORATIVE"
    assert response.items[0].campaign_id == "camp-101"


def test_preferences_drive_content_source() -> None:
    service = RecommenderService()
    request = RecommendRequest(
        user_id="user-7",
        preferences=["Y tế"],
        history=[],
        candidates=_candidates(),
    )
    response = service.recommend(request)

    assert response.source == "CONTENT"
    assert response.items[0].campaign_id == "camp-102"

def test_learned_similarity_file_is_loaded(tmp_path) -> None:
    import json

    from app.services.catalog import CATEGORIES
    from app.services.rec_index import RecIndex

    pair = {"Giáo dục", "Y tế"}
    matrix = {a: {b: (0.8 if {a, b} == pair else 0.0) for b in CATEGORIES} for a in CATEGORIES}
    path = tmp_path / "category_similarity.json"
    path.write_text(json.dumps({"similarity": matrix}), encoding="utf-8")

    index = RecIndex.from_json(path)

    assert index is not None
    assert index.similarity("Giáo dục", "Y tế") == 0.8
    assert index.similarity("Giáo dục", "Giáo dục") == 1.0
    assert index.similarity("Giáo dục", "Công nghệ") == 0.0
    assert RecIndex.from_json(tmp_path / "missing.json") is None


def test_without_learned_similarity_history_stays_content_based() -> None:
    from app.services.rec_index import RecIndex

    service = RecommenderService(index=RecIndex())
    request = RecommendRequest(
        user_id="user-7",
        history=[UserEvent(campaign_id="camp-1", event_type="VIEW", category="Giáo dục")],
        candidates=_candidates(),
    )

    response = service.recommend(request)

    assert response.source == "CONTENT"
    assert response.fallback is False
    assert response.items[0].campaign_id == "camp-101"
    assert response.items[0].reason == "Cùng lĩnh vực Giáo dục với dự án bạn đã xem hoặc ủng hộ"


def test_learned_similarity_explains_cross_category_items() -> None:
    service = RecommenderService()
    request = RecommendRequest(
        user_id="user-7",
        history=[UserEvent(campaign_id="camp-1", event_type="CONTRIBUTE", category="Giáo dục")],
        candidates=_candidates(),
    )

    response = service.recommend(request)

    reasons = {item.campaign_id: item.reason for item in response.items}
    assert reasons["camp-103"] == (
        "Người ủng hộ lĩnh vực Giáo dục cũng thường ủng hộ lĩnh vực Công nghệ"
    )


def test_free_form_category_names_use_learned_similarity() -> None:
    # Quản trị viên đặt tên lĩnh vực tự do: vẫn phải tra được độ tương đồng của nhóm chuẩn.
    from app.services.catalog import canonical_category
    from app.services.rec_index import get_index

    assert canonical_category("Văn hóa nghệ thuật") == "Văn hóa"
    assert canonical_category("Nông nghiệp sạch") == "Khởi nghiệp"
    assert canonical_category("Y tế cộng đồng") == "Y tế"
    assert canonical_category("Thể thao") is None

    index = get_index()
    assert index.similarity("Giáo dục & học bổng", "Công nghệ số") == index.similarity(
        "Giáo dục", "Công nghệ"
    )
    assert index.similarity("Giáo dục & học bổng", "Giáo dục") == 1.0
    assert index.similarity("Thể thao", "Giáo dục") == 0.0


def test_long_history_does_not_drown_out_other_signals() -> None:
    # 40 lượt ủng hộ cùng lĩnh vực: điểm vẫn nằm trong thang 0–1, không tăng theo số sự kiện.
    service = RecommenderService()
    history = [
        UserEvent(campaign_id=f"camp-{n}", event_type="CONTRIBUTE", category="Giáo dục")
        for n in range(40)
    ]
    response = service.recommend(
        RecommendRequest(user_id="user-7", history=history, candidates=_candidates())
    )

    assert response.items[0].campaign_id == "camp-101"
    assert all(0.0 <= item.score <= 1.0 for item in response.items)
