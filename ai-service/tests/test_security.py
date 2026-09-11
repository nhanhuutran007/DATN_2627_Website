from pathlib import Path

from fastapi.testclient import TestClient

import app.core.security as security
from app.core.config import Settings
from app.main import app


def _settings_with_key(key: str) -> Settings:
    return Settings(
        environment="test",
        load_model=False,
        model_path=Path("models/success_model.pkl"),
        success_metrics_path=Path("models/success_metrics.json"),
        success_features_path=Path("models/success_features.json"),
        recommender_index_path=Path("data/synthetic_campaigns.csv"),
        fraud_model_path=Path("models/fraud_isolation.pkl"),
        fraud_scaler_path=Path("models/fraud_scaler.pkl"),
        api_key=key,
    )


def test_protected_routes_reject_missing_api_key(monkeypatch) -> None:
    monkeypatch.setattr(security, "settings", _settings_with_key("secret-key"))

    with TestClient(app) as client:
        response = client.post("/api/v1/recommend", json={})

    assert response.status_code == 401


def test_protected_routes_accept_valid_api_key(monkeypatch) -> None:
    monkeypatch.setattr(security, "settings", _settings_with_key("secret-key"))

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/recommend",
            json={"preferences": [], "candidates": [], "history": []},
            headers={"X-AI-Key": "secret-key"},
        )

    assert response.status_code == 200
    assert response.json()["fallback"] is True


def test_health_remains_public_when_api_key_configured(monkeypatch) -> None:
    monkeypatch.setattr(security, "settings", _settings_with_key("secret-key"))

    with TestClient(app) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 200


def test_protected_routes_open_when_api_key_not_configured(monkeypatch) -> None:
    monkeypatch.setattr(security, "settings", _settings_with_key(None))

    with TestClient(app) as client:
        response = client.post(
            "/api/v1/recommend",
            json={"preferences": [], "candidates": [], "history": []},
        )

    assert response.status_code == 200