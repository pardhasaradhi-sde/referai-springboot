from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_endpoint_available() -> None:
    response = client.get("/health")
    assert response.status_code == 200

    data = response.json()
    assert "service" in data
    assert "db" in data
    assert "redis" in data
    assert "fallback_used" in data
