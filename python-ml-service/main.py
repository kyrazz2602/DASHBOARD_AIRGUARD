"""
Python FastAPI microservice for air filter condition estimation.

Loads a trained scikit-learn model (.pkl) and StandardScaler (.pkl) on startup,
then serves predictions via POST /predict.
"""

import logging
import sys
import time
from contextlib import asynccontextmanager
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, Request
from pydantic import BaseModel

from model_loader import ModelLoader

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class PredictRequest(BaseModel):
    pm25: float
    pm10: float
    co: float
    voc: float
    suhu: float


class PredictResponse(BaseModel):
    status: str
    probabilities: dict[str, float]
    recommendation: str
    confidence: float
    model_used: str
    latency_ms: float


# ---------------------------------------------------------------------------
# Recommendation helper
# ---------------------------------------------------------------------------


def get_recommendation(status: str, request: PredictRequest) -> str:
    """Return a human-readable recommendation based on predicted status and sensor values."""
    if status == "Ganti Filter":
        if request.pm25 > 75:
            return (
                f"Segera ganti filter. PM2.5 sangat tinggi ({request.pm25:.1f} \u03bcg/m\u00b3). "
                "Filter tidak lagi efektif menyaring partikel halus."
            )
        elif request.pm10 > 150:
            return (
                f"Segera ganti filter. PM10 melebihi batas aman ({request.pm10:.1f} \u03bcg/m\u00b3)."
            )
        elif request.co > 9:
            return (
                f"Segera ganti filter. Kadar CO berbahaya ({request.co:.1f} ppm). "
                "Pastikan ventilasi ruangan."
            )
        else:
            return "Segera ganti filter. Beberapa parameter melebihi batas aman."

    if status == "Perhatian":
        return (
            "Pantau kondisi filter. Kualitas udara menurun \u2014 "
            "pertimbangkan penggantian filter dalam 2-4 minggu."
        )

    # "Aman"
    return "Filter berfungsi normal. Kualitas udara dalam batas aman."


# ---------------------------------------------------------------------------
# Lifespan: load model once at startup
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[type-arg]
    try:
        loader = ModelLoader()
        app.state.loader = loader
        logger.info("Model and scaler loaded successfully.")
    except FileNotFoundError as exc:
        logger.error("Failed to load model files: %s", exc)
        sys.exit(1)

    yield

    # Cleanup (nothing to do for in-memory models)


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="ML Filter Estimation Service", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest) -> Any:
    start_ms = time.perf_counter() * 1000

    loader: ModelLoader = app.state.loader
    model = loader.model
    scaler = loader.scaler

    # Build feature vector using DataFrame to avoid feature name warnings
    feature_names = ["PM2.5", "PM10", "CO (ppm)", "VOC (ppm)", "Suhu (°C)"]
    feature_df = pd.DataFrame(
        [[request.pm25, request.pm10, request.co, request.voc, request.suhu]],
        columns=feature_names,
    )

    # Scale features using the same scaler used during training
    scaled = scaler.transform(feature_df)

    # Predict class index and per-class probabilities
    predicted_idx: int = int(model.predict(scaled)[0])
    raw_proba: np.ndarray = model.predict_proba(scaled)[0]

    # Decode label using ModelLoader (handles both with/without label_encoder.pkl)
    status = loader.decode_label(predicted_idx)

    # Build probabilities dict keyed by decoded label
    probabilities: dict[str, float] = {
        loader.decode_label(i): float(raw_proba[i]) for i in range(len(raw_proba))
    }

    confidence = float(max(probabilities.values()))

    # Derive model name from class name
    model_used = type(model).__name__.lower()

    recommendation = get_recommendation(status, request)

    latency_ms = time.perf_counter() * 1000 - start_ms

    return PredictResponse(
        status=status,
        probabilities=probabilities,
        recommendation=recommendation,
        confidence=confidence,
        model_used=model_used,
        latency_ms=latency_ms,
    )
