"""Recommender service: content + collaborative + popularity ranking."""

from __future__ import annotations

import math

from app.schemas.recommend import (
    CampaignFeature,
    RecommendItem,
    RecommendRequest,
    RecommendResponse,
    UserEvent,
)
from app.services.rec_index import RecIndex, get_index

EVENT_WEIGHTS: dict[str, float] = {
    "VIEW": 1.0,
    "SEARCH": 2.0,
    "FOLLOW": 3.0,
    "CONTRIBUTE": 5.0,
}

_TOP_N = 10


def _to_float(value: object, default: float = 0.0) -> float:
    try:
        result = float(value) if value is not None else default
    except (TypeError, ValueError):
        return default
    return result if math.isfinite(result) else default


def _decay(index: int) -> float:
    return 1.0 / (1.0 + 0.05 * index)


class RecommenderService:
    """Ranks campaign candidates against a user interest vector.

    The service never raises: every candidate is guarded individually and any
    missing model/index falls back to popularity ranking.
    """

    def __init__(self, index: RecIndex | None = None) -> None:
        self._index = index if index is not None else get_index()

    def recommend(self, request: RecommendRequest) -> RecommendResponse:
        try:
            return self._recommend(request)
        except Exception as exc:  # pragma: no cover - defensive catch-all
            return self._popular_fallback(request, detail=f"Có lỗi xử lý: {type(exc).__name__}")

    def _recommend(self, request: RecommendRequest) -> RecommendResponse:
        candidates = list(request.candidates)
        exclude = set(request.exclude_ids or [])
        history = list(request.history or [])
        preferences = list(request.preferences or [])

        if not candidates:
            return self._popular_fallback(request, detail="Không có ứng viên để xếp hạng")

        interest = self._build_interest(preferences, history)
        history_categories = {ev.category for ev in history if ev.category}

        max_views = max((_to_float(c.views) for c in candidates), default=0.0)
        max_backers = max((_to_float(c.backers_count) for c in candidates), default=0.0)
        max_days = max((_to_float(c.days_left) for c in candidates), default=0.0)

        items: list[RecommendItem] = []
        collab_used = False

        for candidate in candidates:
            if candidate.campaign_id in exclude:
                continue
            try:
                scored, used_collab = self._score_candidate(
                    candidate,
                    interest=interest,
                    history_categories=history_categories,
                    maxes=(max_views, max_backers, max_days),
                )
                items.append(scored)
                if used_collab:
                    collab_used = True
            except Exception:
                continue

        items.sort(key=lambda item: item.score, reverse=True)
        items = items[:_TOP_N]

        if history and collab_used:
            source = "COLLABORATIVE"
            detail = "Kết hợp lựa chọn người dùng, lịch sử tương tác và độ tương đồng cộng đồng"
        elif preferences:
            source = "CONTENT"
            detail = "Dựa trên lĩnh vực bạn đã chọn"
        else:
            source = "COLD_START"
            detail = "Chưa có dữ liệu người dùng, xếp hạng theo mức độ phổ biến và chất lượng"

        if not items:
            return self._popular_fallback(request, detail="Không có ứng viên sau khi lọc")

        return RecommendResponse(
            source=source,
            fallback=False,
            items=[RecommendItem(campaign_id=i.campaign_id, score=i.score, reason=i.reason) for i in items],
            detail=detail,
        )

    def _build_interest(self, preferences: list[str], history: list[UserEvent]) -> dict[str, float]:
        vec: dict[str, float] = {}
        for category in preferences:
            vec[category] = vec.get(category, 0.0) + 1.0
        for position, event in enumerate(history):
            weight = EVENT_WEIGHTS.get(event.event_type, 1.0) * _decay(position)
            if event.category:
                vec[event.category] = vec.get(event.category, 0.0) + weight
        return vec

    def _score_candidate(
        self,
        candidate: CampaignFeature,
        interest: dict[str, float],
        history_categories: set[str],
        maxes: tuple[float, float, float],
    ) -> tuple[RecommendItem, bool]:
        category = candidate.category or ""
        score = 0.0
        reason = ""

        content_term = interest.get(category, 0.0) * 0.2
        score += content_term

        max_views, max_backers, max_days = maxes
        if max_views > 0:
            score += 0.15 * min(_to_float(candidate.views) / max_views, 1.0)
        if max_backers > 0:
            score += 0.10 * min(_to_float(candidate.backers_count) / max_backers, 1.0)
        if max_days > 0:
            score += 0.05 * min(_to_float(candidate.days_left) / max_days, 1.0)
        score += 0.10 * min(_to_float(candidate.profile_score) / 100.0, 1.0)

        collab = self._collab_boost(category, history_categories)
        score += collab

        if collab > 0.0 and history_categories:
            reason = "Tương tự các dự án bạn đã theo dõi"
        elif content_term > 0.0:
            reason = f"Phù hợp với lĩnh vực {category or 'chung'} bạn quan tâm"
        else:
            reason = "Được cộng đồng đánh giá cao"

        return (
            RecommendItem(
                campaign_id=candidate.campaign_id,
                score=round(float(score), 6),
                reason=reason,
            ),
            collab > 0.0,
        )

    def _collab_boost(self, category: str, history_categories: set[str]) -> float:
        if not category or not history_categories:
            return 0.0
        best = 0.0
        for history_category in history_categories:
            similarity = self._index.similarity(category, history_category)
            if similarity > best:
                best = similarity
        return 0.35 * best

    def _popular_fallback(self, request: RecommendRequest, detail: str) -> RecommendResponse:
        candidates = [c for c in request.candidates if c.campaign_id not in set(request.exclude_ids or [])]
        scored: list[RecommendItem] = []
        for candidate in candidates:
            popularity = _to_float(candidate.views) * 0.7 + _to_float(candidate.backers_count) * 1.5
            scored.append(
                RecommendItem(
                    campaign_id=candidate.campaign_id,
                    score=round(popularity, 6),
                    reason="Được cộng đồng đánh giá cao",
                )
            )
        scored.sort(key=lambda item: item.score, reverse=True)
        return RecommendResponse(
            source="POPULAR_FALLBACK",
            fallback=True,
            items=scored[:_TOP_N],
            detail=detail,
        )