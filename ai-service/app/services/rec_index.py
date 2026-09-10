"""In-memory collaborative index built from the offline synthetic dataset.

The index exposes a ``similarity`` function between campaign categories that is
trained offline (feature-centroid cosine similarity between category groups).
When the dataset file is missing, requests still work: similarity falls back to
an identity match (a category is 100% similar to itself, 0% to others).
"""

from __future__ import annotations

import math
from functools import lru_cache
from pathlib import Path

import numpy as np

from app.core.config import settings
from app.services.catalog import CATEGORIES

_COSINE_FEATURES = [
    "profile_score",
    "image_count",
    "has_video",
    "has_budget_report",
    "owner_credential_approved",
    "duration_days",
]


class RecIndex:
    """Similarity matrix between categories plus per-category fallback stats."""

    def __init__(self) -> None:
        self._sim: dict[str, dict[str, float]] = {cat: {} for cat in CATEGORIES}
        self.category_stats: dict[str, dict[str, float]] = {}

    @classmethod
    def from_csv(cls, path: Path) -> RecIndex:
        index = cls()
        if not path.is_file():
            return index
        try:
            import pandas as pd

            frame = pd.read_csv(path, encoding="utf-8")
            index._fit(frame)
        except Exception:
            index = cls()
        return index

    def _fit(self, frame: object) -> None:
        import pandas as pd

        df = pd.DataFrame(frame)
        numeric = [c for c in _COSINE_FEATURES if c in df.columns]
        if not numeric:
            self.category_stats = {}
            return

        stats = df.groupby("category").agg({col: "mean" for col in numeric})
        stats = stats.rename(columns={col: f"mean_{col}" for col in numeric})
        self.category_stats = {
            str(cat): {f"mean_{col}": float(stats.loc[cat, f"mean_{col}"]) for col in numeric}
            for cat in stats.index
        }

        base = df[numeric].to_numpy(dtype=float)
        lo = np.nanmin(base, axis=0)
        hi = np.nanmax(base, axis=0)
        span = hi - lo
        span[span == 0.0] = 1.0
        normalized = (base - lo) / span

        centroids: dict[str, np.ndarray] = {}
        grouped = pd.DataFrame(normalized, columns=numeric)
        grouped["category"] = df["category"].astype(str).to_numpy()
        for cat, group in grouped.groupby("category"):
            centroids[cat] = group[numeric].to_numpy(dtype=float).mean(axis=0)

        for cat_a in CATEGORIES:
            for cat_b in CATEGORIES:
                if cat_a == cat_b:
                    self._sim[cat_a][cat_b] = 1.0
                    continue
                a = centroids.get(cat_a)
                b = centroids.get(cat_b)
                if a is None or b is None:
                    self._sim[cat_a][cat_b] = 0.0
                    continue
                denom = float(np.linalg.norm(a) * np.linalg.norm(b))
                if denom == 0.0:
                    self._sim[cat_a][cat_b] = 0.0
                    continue
                value = float(np.dot(a, b) / denom)
                self._sim[cat_a][cat_b] = round(max(0.0, min(1.0, value)), 4)

    def similarity(self, a: str, b: str) -> float:
        if not a or not b:
            return 0.0
        if a == b:
            return 1.0
        row = self._sim.get(a)
        if row is None:
            return 0.0
        value = row.get(b, 0.0)
        if not math.isfinite(value):
            return 0.0
        return max(0.0, min(1.0, value))


@lru_cache(maxsize=1)
def _default_index() -> RecIndex:
    return RecIndex.from_csv(settings.recommender_index_path)


def get_index() -> RecIndex:
    """Return the process-wide cached recommender index (never raises)."""
    try:
        return _default_index()
    except Exception:
        return RecIndex()