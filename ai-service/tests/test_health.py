from fastapi.testclient import TestClient

import app.services.model_status as model_status
from app.core.config import settings
from app.main import app


def test_health_reports_models_actually_used() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    body = response.json()
    assert body["service"] == "ai-service"
    assert body["status"] == "ok"
    assert set(body["models"]) == {"success_prediction", "fraud_detection", "recommendation"}
    # Các mô hình thật được commit trong models/, nên mọi tính năng đều chạy bằng mô hình
    assert body["model_status"] == "ready"
    assert all(state["loaded"] and state["version"] for state in body["models"].values())
    assert body["model_version"] == body["models"]["success_prediction"]["version"]


def test_health_is_degraded_when_a_model_is_missing(monkeypatch) -> None:
    monkeypatch.setattr(
        model_status,
        "settings",
        settings.__class__(
            **{**settings.__dict__, "model_path": settings.model_path.with_name("missing.pkl")}
        ),
    )

    with TestClient(app) as client:
        body = client.get("/api/v1/health").json()

    assert body["model_status"] == "degraded"
    assert body["model_version"] is None
    assert body["models"]["success_prediction"]["loaded"] is False
    assert body["models"]["success_prediction"]["fallback"]
