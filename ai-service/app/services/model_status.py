"""Reports which trained artifacts the inference services actually use.

Each service loads its own artifacts lazily (and caches them); this module calls the
same loaders, so ``/health`` reflects what predictions really run on instead of a
separate flag.
"""

from __future__ import annotations

import json
from pathlib import Path

from app.core.config import settings
from app.schemas.health import ModelState
from app.services.fraud_detector import _load_classifier_artifacts
from app.services.predictor import _load_model_artifacts
from app.services.rec_index import get_index


def _json_version(path: Path) -> str | None:
    try:
        version = json.loads(path.read_text(encoding="utf-8")).get("model_version")
    except Exception:
        return None
    return str(version) if version is not None else None


def collect_model_states() -> dict[str, ModelState]:
    """Load (or reuse the cached) artifacts of every model and describe their state."""
    success_model, _, success_version = _load_model_artifacts(
        str(settings.model_path), str(settings.success_features_path)
    )
    fraud_model, _ = _load_classifier_artifacts(
        str(settings.fraud_classifier_path), str(settings.fraud_reference_path)
    )
    index = get_index()

    return {
        "success_prediction": ModelState(
            loaded=success_model is not None,
            version=success_version if success_model is not None else None,
            fallback="Công thức kinh nghiệm từ tỷ lệ thành công nền",
        ),
        "fraud_detection": ModelState(
            loaded=fraud_model is not None,
            version=(
                _json_version(settings.fraud_reference_path) if fraud_model is not None else None
            ),
            fallback="Chỉ chấm bằng luật nghiệp vụ",
        ),
        "recommendation": ModelState(
            loaded=index.learned,
            version=index.version,
            fallback="Chỉ ghép đúng lĩnh vực đã quan tâm, kèm độ phổ biến",
        ),
    }
