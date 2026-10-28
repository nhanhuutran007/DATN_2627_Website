"""Deterministic dataset builders shared by offline training and evaluation.

Generates two reproducible CSV datasets under ``data/`` mirroring the feature
contracts used at inference time:

* ``synthetic_campaigns.csv`` -> success-model features + outcome label
* ``recommend_events.csv``    -> user-item interaction log for recommender eval

The fraud model is trained only on real labelled data (IEEE-CIS, see
``notebooks/train_real_data_colab.ipynb``), so there is no synthetic fraud set.

Each generator uses its own NumPy ``default_rng`` seed so whole runs are
reproducible. Real scraped data can later replace the CSVs (see
``data/README.md``) without code changes, as long as the column contracts match.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

from app.services.catalog import CATEGORIES, SUCCESS_FEATURES

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"

CAMPAIGNS_CSV = DATA_DIR / "synthetic_campaigns.csv"
EVENTS_CSV = DATA_DIR / "recommend_events.csv"

SEED_CAMPAIGNS = 42
SEED_EVENTS = 44

CAMPAIGN_ROWS = 1000

EVENT_ROWS = 6000
USERS = 300
EVENT_TYPES = ["VIEW", "SEARCH", "FOLLOW", "CONTRIBUTE"]
EVENT_FREQUENCIES = np.asarray([5.0, 3.0, 1.5, 0.6])
EVENT_EPOCH = datetime(2025, 1, 1, tzinfo=UTC)

CATEGORY_IDS = {name: idx for idx, name in enumerate(CATEGORIES)}


def generate_campaigns() -> pd.DataFrame:
    """Reproduces the legacy train.py generator byte-for-byte.

    Keep the exact draw order (locals then DataFrame construction) so the
    committed ``data/synthetic_campaigns.csv`` stays stable across runs.
    """
    rng = np.random.default_rng(SEED_CAMPAIGNS)
    n = CAMPAIGN_ROWS

    profile_score = np.clip(rng.normal(62.0, 20.0, n), 0.0, 100.0)
    image_count = np.clip(np.round(rng.normal(5.0, 3.0, n)), 0.0, 15.0).astype(int)
    goal_amount = np.clip(np.exp(rng.normal(18.6, 0.95, n)), 1e6, 5e8)
    duration_days = rng.integers(7, 121, size=n)
    owner_credential_approved = rng.binomial(1, 0.5, size=n).astype(float)
    has_budget_report = rng.binomial(1, 0.4, size=n).astype(float)
    has_video = rng.binomial(1, 0.35, size=n).astype(float)
    owner_campaign_count = np.clip(np.round(rng.normal(1.2, 1.6, n)), 0, 8).astype(int)
    early_backers = rng.poisson(8, size=n)

    logit = (
        -3.8
        + 0.03 * profile_score
        + 0.12 * np.minimum(image_count, 8)
        + 0.8 * owner_credential_approved
        + 0.6 * has_budget_report
        + 0.2 * np.minimum(owner_campaign_count, 4)
        + 0.3 * has_video
        + 0.008 * np.minimum(duration_days, 90)
        - 0.9 * np.clip((goal_amount - 2e7) / 4e8, 0.0, 1.0)
        + 0.3 * np.minimum(early_backers, 15) / 15.0
    )
    success_prob = 1.0 / (1.0 + np.exp(-logit))
    success = rng.binomial(1, success_prob, size=n)

    frame = pd.DataFrame(
        {
            "campaign_id": np.arange(1, n + 1),
            "category": rng.choice(CATEGORIES, size=n, replace=True),
            "category_id": None,
            "goal_amount": goal_amount,
            "duration_days": duration_days,
            "profile_score": profile_score,
            "content_length": rng.integers(500, 20000, size=n),
            "image_count": image_count,
            "has_video": has_video,
            "story_word_count": rng.integers(200, 5000, size=n),
            "owner_campaign_count": owner_campaign_count,
            "owner_credential_approved": owner_credential_approved,
            "has_budget_report": has_budget_report,
            "early_views": rng.poisson(300, size=n),
            "early_backers": early_backers,
            "success": success,
            "launch_seq": np.arange(n),
        }
    )
    frame["category_id"] = frame["category"].map(CATEGORY_IDS)
    return frame


def generate_events(campaigns: pd.DataFrame) -> pd.DataFrame:
    """Build a deterministic user-item interaction log.

    Each user favours one primary and one secondary category; roughly 75% of
    their events involve campaigns from those categories (so the recommender
    has a learnable signal) and the rest are exploratory picks.
    """
    rng = np.random.default_rng(SEED_EVENTS)
    columns = ["user_id", "campaign_id", "category", "event_type", "occurred_at"]
    if len(campaigns) == 0:
        return pd.DataFrame(columns=columns)

    campaign_ids = campaigns["campaign_id"].to_numpy(dtype=object)
    campaign_categories = campaigns["category"].to_numpy(dtype=object)
    n_campaigns = len(campaigns)

    primary = rng.choice(CATEGORIES, size=USERS)
    secondary = rng.choice(CATEGORIES, size=USERS)
    by_category = {
        category: np.flatnonzero(campaign_categories == category).tolist()
        for category in CATEGORIES
    }

    probabilities = EVENT_FREQUENCIES / EVENT_FREQUENCIES.sum()
    records: list[tuple[str, str, str, str, str]] = []
    for i in range(int(EVENT_ROWS)):
        user = int(rng.integers(0, USERS))
        favourites = {primary[user], secondary[user]}
        if rng.random() < 0.75:
            category = str(rng.choice(list(favourites)))
            pool = by_category.get(category, [])
        else:
            category = ""
            pool = []
        if pool:
            index = int(pool[rng.integers(0, len(pool))])
        else:
            index = int(rng.integers(0, n_campaigns))
        event_type = str(rng.choice(EVENT_TYPES, p=probabilities))
        occurred_at = EVENT_EPOCH + timedelta(hours=int(i * 2))
        records.append(
            (
                f"user-{user + 1:04d}",
                str(campaign_ids[index]),
                str(campaign_categories[index]),
                event_type,
                occurred_at.isoformat(timespec="seconds"),
            )
        )
    return pd.DataFrame(records, columns=columns)


def load_campaigns_csv(path: Path | None = None) -> pd.DataFrame:
    file = path or CAMPAIGNS_CSV
    if file.is_file():
        return pd.read_csv(file, encoding="utf-8")
    frame = generate_campaigns()
    frame.to_csv(file, index=False, encoding="utf-8")
    return frame


def load_events_csv(path: Path | None = None) -> pd.DataFrame:
    file = path or EVENTS_CSV
    if file.is_file():
        return pd.read_csv(file, encoding="utf-8")
    frame = generate_events(load_campaigns_csv())
    frame.to_csv(file, index=False, encoding="utf-8")
    return frame


def write_missing() -> dict[str, str]:
    """Persist any dataset file that does not exist yet."""
    load_campaigns_csv()
    load_events_csv()
    return {
        "campaigns": str(CAMPAIGNS_CSV),
        "events": str(EVENTS_CSV),
    }


def main() -> None:
    write_missing()
    campaigns = load_campaigns_csv()
    events = load_events_csv()
    print("== Datasets ==")
    print(f"Campaigns : {len(campaigns)} rows -> {CAMPAIGNS_CSV.name}")
    print(f"Events    : {len(events)} rows, "
          f"{events['user_id'].nunique()} users -> {EVENTS_CSV.name}")
    print("Contracts: success features", SUCCESS_FEATURES)


if __name__ == "__main__":
    main()