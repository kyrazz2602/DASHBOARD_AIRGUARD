import os
from unittest.mock import patch
from fastapi.testclient import TestClient
import pytest

# Set env var mock before importing main to avoid missing config issues
os.environ["PYTHON_ML_SERVICE_URL"] = "http://localhost:8000"
os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost:5432/dbname"

from main import app, PSYCOPG2_AVAILABLE


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_health_success(client):
    """Test health check returns 200 when database connection is mock-successful."""
    with patch("psycopg2.connect") as mock_connect:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        if PSYCOPG2_AVAILABLE:
            assert data["database"] == "connected"
        else:
            assert data["database"] == "driver_missing"


def test_health_db_failure(client):
    """Test health check continues to report status ok (but with database: disconnected) if DB connection fails."""
    if not PSYCOPG2_AVAILABLE:
        pytest.skip("psycopg2 is not installed, skipping DB failure test")

    with patch("psycopg2.connect", side_effect=Exception("Connection refused")):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["database"] == "disconnected"


def test_predict_success(client):
    """Test predict endpoint with valid inputs."""
    payload = {
        "pm25": 12.5,
        "pm10": 20.1,
        "co": 3.2,
        "voc": 1.8,
        "suhu": 29.4
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "probabilities" in data
    assert "recommendation" in data
    assert "confidence" in data
    assert "model_used" in data
    assert "latency_ms" in data


def test_predict_invalid_input(client):
    """Test predict validation checks. Pydantic should catch type mismatches or missing values."""
    payload = {
        "pm25": "not-a-number",  # Invalid type
        "pm10": 20.1,
        "co": 3.2,
        "voc": 1.8,
        # missing "suhu"
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422  # Unprocessable Entity
