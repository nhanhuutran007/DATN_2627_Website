from fastapi.testclient import TestClient

from app.main import app


def test_health_reports_service_and_model_state() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json() == {
        "service": "ai-service",
        "status": "ok",
        "model_status": "not_loaded",
        "model_version": None,
    }
