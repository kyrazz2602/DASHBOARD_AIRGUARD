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
    """Test health check returns 200 and available models metadata."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "available_models" in data
    assert "decision_tree" in data["available_models"]
    assert "random_forest" in data["available_models"]


def test_predict_success(client):
    """Test predict endpoint with valid inputs and default model."""
    payload = {
        "pm25": 12.5,
        "pm10": 20.1,
        "co": 3.2,
        "voc": 1.8,
        "suhu": 29.4,
        "operating_hours": 120.0,
        "model_type": "decision_tree"
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "probabilities" in data
    assert "recommendation" in data
    assert "confidence" in data
    assert data["model_used"] == "decision_tree"
    assert "latency_ms" in data
    assert "predicted_rul_hours" in data
    assert "filter_integrity_percent" in data
    assert isinstance(data["predicted_rul_hours"], float)
    assert isinstance(data["filter_integrity_percent"], float)


def test_predict_random_forest(client):
    """Test predict endpoint using random_forest model."""
    payload = {
        "pm25": 12.5,
        "pm10": 20.1,
        "co": 3.2,
        "voc": 1.8,
        "suhu": 29.4,
        "operating_hours": 240.0,
        "model_type": "random_forest"
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["model_used"] == "random_forest"
    assert "predicted_rul_hours" in data
    assert "filter_integrity_percent" in data


def test_predict_default_model(client):
    """Test predict endpoint without specifying model_type fallback."""
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
    assert data["model_used"] == "decision_tree"  # Default should be decision_tree


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
