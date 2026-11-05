"""In-memory collaborative index of category-to-category similarity.

The service reads ``models/category_similarity.json``, learned offline from real
donation behaviour (categories often funded by the same donors are similar; see
``notebooks/train_real_data_colab.ipynb``). Without that file similarity is an identity
match (a category is 100% similar to itself, 0% to others), so recommendations stay
content-based instead of borrowing similarities from synthetic data.
"""

from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path

from app.core.config import settings
from app.services.catalog import CATEGORIES


class RecIndex:
    """Similarity matrix between categories."""

    def __init__(self) -> None:
        self._sim: dict[str, dict[str, float]] = {cat: {} for cat in CATEGORIES}
        # True only when similarities were learned from real donation behaviour
        self.learned = False
        self.version: str | None = None

    @classmethod
    def from_json(cls, path: Path) -> RecIndex | None:
        """Load a learned similarity matrix; ``None`` when the file is missing or invalid."""
        if not path.is_file():
            return None
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
            matrix = payload["similarity"]
            index = cls()
            for cat_a in CATEGORIES:
                row = matrix.get(cat_a, {})
                for cat_b in CATEGORIES:
                    value = 1.0 if cat_a == cat_b else float(row.get(cat_b, 0.0))
                    if not math.isfinite(value):
                        value = 0.0
                    index._sim[cat_a][cat_b] = max(0.0, min(1.0, value))
            index.learned = True
            version = payload.get("model_version")
            index.version = str(version) if version is not None else None
            return index
        except Exception:
            return None

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
    learned = RecIndex.from_json(settings.category_similarity_path)
    return learned if learned is not None else RecIndex()


def get_index() -> RecIndex:
    """Return the process-wide cached recommender index (never raises)."""
    try:
        return _default_index()
    except Exception:
        return RecIndex()