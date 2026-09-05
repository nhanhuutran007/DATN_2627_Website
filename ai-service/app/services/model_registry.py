import importlib
import json
from pathlib import Path
from typing import Any, Literal


class ModelRegistry:
    """Loads only project-owned artifacts from the configured local path."""

    def __init__(self, model_path: Path) -> None:
        self._model_path = model_path
        self._model: Any | None = None
        self._version: str | None = None
        self._load_failed = False

    @property
    def model(self) -> Any | None:
        return self._model

    @property
    def status(self) -> Literal["not_loaded", "ready", "unavailable"]:
        if self._model is not None:
            return "ready"
        if self._load_failed:
            return "unavailable"
        return "not_loaded"

    @property
    def version(self) -> str | None:
        return self._version

    def load(self) -> None:
        try:
            joblib = importlib.import_module("joblib")
            self._model = joblib.load(self._model_path)
            self._version = self._read_version()
            self._load_failed = False
        except Exception:
            self._model = None
            self._version = None
            self._load_failed = True

    def _read_version(self) -> str | None:
        metadata_path = self._model_path.with_suffix(".metadata.json")
        if not metadata_path.is_file():
            return None

        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        version = metadata.get("model_version")
        return str(version) if version is not None else None
