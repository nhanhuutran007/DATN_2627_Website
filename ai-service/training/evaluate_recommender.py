"""Offline recommender evaluation: Precision@K / Recall@K / NDCG@K.

Uses a chronological split of ``data/recommend_events.csv``: events before the
cut-off form each user's history and preferences, events after it form the
ground truth. Ranking is produced by the production ``RecommenderService`` so
the numbers reflect what the API would return for real users; metrics are
averaged over all users present in both windows and written to
``artifacts/recommender_metrics.json``.

Run from the ``ai-service`` directory either as:

    python -m training.evaluate_recommender
    python training/evaluate_recommender.py
"""

from __future__ import annotations

import json
import math
import sys
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.schemas.recommend import CampaignFeature, RecommendRequest, UserEvent  # noqa: E402
from app.services.rec_index import RecIndex  # noqa: E402
from app.services.recommender import RecommenderService  # noqa: E402
from training.datasets import (  # noqa: E402
    CAMPAIGNS_CSV,
    EVENTS_CSV,
    load_campaigns_csv,
    load_events_csv,
)

SPLIT_FRACTION = 0.8
RANKS = (5, 10)
REPORT = ROOT / "artifacts" / "recommender_metrics.json"

EVENT_WEIGHTS = {"VIEW": 1, "SEARCH": 2, "FOLLOW": 3, "CONTRIBUTE": 5}


def precision_at_k(ranked: list[str], relevant: set[str], k: int) -> float:
    if k <= 0:
        return 0.0
    hits = sum(1 for item in ranked[:k] if item in relevant)
    return hits / k


def recall_at_k(ranked: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 0.0
    hits = sum(1 for item in ranked[:k] if item in relevant)
    return hits / len(relevant)


def ndcg_at_k(ranked: list[str], relevant: set[str], k: int) -> float:
    ranked = ranked[:k]
    dcg = sum(1.0 / math.log2(i + 2) for i, item in enumerate(ranked) if item in relevant)
    ideal = sum(1.0 / math.log2(i + 2) for i in range(min(k, len(relevant))))
    return dcg / ideal if ideal > 0.0 else 0.0


def campaign_features(frame: pd.DataFrame) -> list[CampaignFeature]:
    features: list[CampaignFeature] = []
    for row in frame.itertuples(index=False):
        goal = _float(row, "goal_amount")
        success = bool(getattr(row, "success", 0))
        features.append(
            CampaignFeature(
                campaign_id=str(row.campaign_id),
                category=str(row.category),
                title="",
                keywords=[],
                target=goal,
                duration_days=int(_float(row, "duration_days")),
                profile_score=_float(row, "profile_score"),
                funded_ratio=0.75 if success else 0.35,
                days_left=90 if int(getattr(row, "launch_seq", 0)) % 2 == 0 else 30,
                views=int(_float(row, "early_views")),
                backers_count=int(_float(row, "early_backers")),
                content_length=int(_float(row, "content_length")),
                image_count=int(_float(row, "image_count")),
                has_video=bool(getattr(row, "has_video", 0)),
                status="active",
            )
        )
    return features


def _float(row: object, name: str) -> float:
    try:
        value = getattr(row, name)
    except AttributeError:
        return 0.0
    try:
        result = float(value)
    except (TypeError, ValueError):
        return 0.0
    return result if math.isfinite(result) else 0.0


def split_events(events: pd.DataFrame, fraction: float) -> tuple[pd.DataFrame, pd.DataFrame]:
    occurred = pd.to_datetime(events["occurred_at"], utc=True)
    cutoff = occurred.quantile(fraction)
    train = events[occurred < cutoff].copy()
    test = events[occurred >= cutoff].copy()
    return train, test


def user_history(rows: pd.DataFrame) -> list[UserEvent]:
    return [
        UserEvent(
            campaign_id=str(row.campaign_id),
            event_type=str(row.event_type),
            category=str(row.category),
        )
        for row in rows.itertuples(index=False)
    ]


def user_preferences(rows: pd.DataFrame) -> list[str]:
    weights: dict[str, float] = {}
    for row in rows.itertuples(index=False):
        if not row.category:
            continue
        weight = EVENT_WEIGHTS.get(str(row.event_type), 1)
        weights[str(row.category)] = weights.get(str(row.category), 0.0) + weight
    return sorted(weights, key=weights.get, reverse=True)[:3]


def evaluate_split(
    train: pd.DataFrame,
    test: pd.DataFrame,
    candidates: list[CampaignFeature],
    rec_service: RecommenderService,
    ranks: tuple[int, ...] = RANKS,
) -> dict[str, float | int]:
    totals = {f"precision@{k}": 0.0 for k in ranks}
    totals.update({f"recall@{k}": 0.0 for k in ranks})
    totals.update({f"ndcg@{k}": 0.0 for k in ranks})
    evaluated = 0

    users = sorted(set(train["user_id"]) | set(test["user_id"]))
    for user_id in users:
        user_train = train[train["user_id"] == user_id]
        user_test = test[test["user_id"] == user_id]
        relevant = set(user_test["campaign_id"].astype(str))
        if not relevant:
            continue
        evaluated += 1

        request = RecommendRequest(
            user_id=str(user_id),
            preferences=user_preferences(user_train),
            exclude_ids=[],
            candidates=candidates,
            history=user_history(user_train),
        )
        response = rec_service.recommend(request)
        ranked = [item.campaign_id for item in response.items]

        for k in ranks:
            totals[f"precision@{k}"] += precision_at_k(ranked, relevant, k)
            totals[f"recall@{k}"] += recall_at_k(ranked, relevant, k)
            totals[f"ndcg@{k}"] += ndcg_at_k(ranked, relevant, k)

    if evaluated == 0:
        raise RuntimeError("Không có user nào xuất hiện ở cả 2 cửa sổ để đánh giá")
    result: dict[str, float | int] = {"users_evaluated": evaluated}
    for name, value in totals.items():
        result[name] = round(value / evaluated, 6)
    return result


def main() -> None:
    campaigns = load_campaigns_csv(CAMPAIGNS_CSV)
    events = load_events_csv(EVENTS_CSV)
    train, test = split_events(events, SPLIT_FRACTION)

    candidates = campaign_features(campaigns)
    rec_service = RecommenderService(index=RecIndex.from_csv(CAMPAIGNS_CSV))
    metrics = evaluate_split(train, test, candidates, rec_service)

    report = {
        "generated_at": datetime.now(UTC).replace(microsecond=0).isoformat(),
        "dataset": {
            "campaigns": str(CAMPAIGNS_CSV.relative_to(ROOT)),
            "events": str(EVENTS_CSV.relative_to(ROOT)),
            "events_rows": int(len(events)),
            "train_rows": int(len(train)),
            "test_rows": int(len(test)),
        },
        "split": {"strategy": "chronological", "fraction": SPLIT_FRACTION},
        "ranks": [int(k) for k in RANKS],
    }
    report.update(metrics)

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print("== Đánh giá recommender (offline) ==")
    print(f"Split theo thời gian: train={report['dataset']['train_rows']} "
          f"test={report['dataset']['test_rows']} (fraction={SPLIT_FRACTION})")
    print(f"Người dùng được đánh giá: {metrics['users_evaluated']}")
    for k in RANKS:
        print(f"K={k}: Precision={metrics[f'precision@{k}']:.4f} "
              f"Recall={metrics[f'recall@{k}']:.4f} NDCG={metrics[f'ndcg@{k}']:.4f}")
    print(f"Đã ghi: {REPORT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()