"""
Python FastAPI microservice for air filter condition estimation.

Loads trained regression models (Decision Tree & Random Forest) and scaler on startup,
then serves predictions via POST /predict.
"""

import logging
import os
import sys
import time
from contextlib import asynccontextmanager
from typing import Any, List, Dict

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from model_loader import ModelLoader

try:
    import psycopg2
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class HistoryItem(BaseModel):
    pm25: float
    pm10: float
    co: float
    voc: float
    suhu: float
    timestamp: str | None = None


class PredictRequest(BaseModel):
    pm25: float
    pm10: float
    co: float
    voc: float
    suhu: float
    timestamp: str | None = None
    history: list[HistoryItem] | None = None
    operating_hours: float = 0.0
    model_type: str = "random_forest"


class PredictResponse(BaseModel):
    status: str
    probabilities: dict[str, float]
    recommendation: str
    confidence: float
    model_used: str
    latency_ms: float
    predicted_rul_hours: float
    filter_integrity_percent: float


# ---------------------------------------------------------------------------
# Sliding history and feature engineering
# ---------------------------------------------------------------------------
from collections import deque
import threading

# Thread-safe in-memory sliding history of recent sensor readings (max 10 items)
history_lock = threading.Lock()
sensor_history_queue = deque(maxlen=10)

FEATURE_COLS = [
    "PM25", "PM10", "CO", "VOC", "Suhu", "Hour", "TimeMin",
    "PM25_roll_mean", "PM25_roll_std", "PM25_roll_max",
    "PM10_roll_mean", "PM10_roll_std", "PM10_roll_max",
    "CO_roll_mean", "CO_roll_std", "CO_roll_max",
    "VOC_roll_mean", "VOC_roll_std", "VOC_roll_max",
    "PM25_PM10_ratio", "CO_VOC_ratio",
    "PM25_exceed", "PM10_exceed", "CO_exceed", "VOC_exceed", "Total_exceed",
    "CPI", "Cumulative_Exposure", "Operating_Hours"
]


def compute_features(history_df: pd.DataFrame, operating_hours: float) -> pd.DataFrame:
    df = history_df.copy()
    
    # Ensure correct column naming (handle potential lowercase / uppercase discrepancies)
    name_mapping = {
        "pm25": "PM25",
        "pm10": "PM10",
        "co": "CO",
        "voc": "VOC",
        "suhu": "Suhu"
    }
    df = df.rename(columns=lambda x: name_mapping.get(x.lower(), x))
    
    # Fill in default values if columns are missing
    for col in ["PM25", "PM10", "CO", "VOC", "Suhu"]:
        if col not in df.columns:
            df[col] = 0.0
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
        
    # Process Datetime
    if "timestamp" in df.columns:
        df["Datetime"] = pd.to_datetime(df["timestamp"], errors="coerce")
    else:
        df["Datetime"] = pd.NaT
        
    now = pd.Timestamp.now()
    df["Datetime"] = df["Datetime"].fillna(now)
    
    df["Hour"] = df["Datetime"].dt.hour
    df["Minute"] = df["Datetime"].dt.minute
    df["TimeMin"] = df["Hour"] * 60 + df["Minute"]
    
    # WHO Standards
    WHO = {
        "PM25" : {"safe": 35.4,  "warning": 125.4, "danger": 125.5},
        "PM10" : {"safe": 154.0, "warning": 354.0, "danger": 355.0},
        "CO"   : {"safe": 15.0,  "warning": 50.0,  "danger": 50.0},
        "VOC"  : {"safe": 20.0,  "warning": 100.0, "danger": 100.0},
    }
    
    # Rolling Statistics
    for col in ["PM25", "PM10", "CO", "VOC"]:
        df[f"{col}_roll_mean"] = df[col].rolling(10, min_periods=1).mean()
        df[f"{col}_roll_std"]  = df[col].rolling(10, min_periods=1).std().fillna(0.0)
        df[f"{col}_roll_max"]  = df[col].rolling(10, min_periods=1).max()
        
    # Ratios
    df["PM25_PM10_ratio"] = df["PM25"] / (df["PM10"] + 1e-6)
    df["CO_VOC_ratio"]    = df["CO"]   / (df["VOC"]  + 1e-6)
    
    # Exceedances
    df["PM25_exceed"]  = (df["PM25"] > WHO["PM25"]["safe"]).astype(int)
    df["PM10_exceed"]  = (df["PM10"] > WHO["PM10"]["safe"]).astype(int)
    df["CO_exceed"]    = (df["CO"]   > WHO["CO"]["safe"]).astype(int)
    df["VOC_exceed"]   = (df["VOC"]  > WHO["VOC"]["safe"]).astype(int)
    df["Total_exceed"] = df[["PM25_exceed","PM10_exceed","CO_exceed","VOC_exceed"]].sum(axis=1)
    
    # Composite Pollution Index (CPI)
    df["CPI"] = (
        df["PM25"] / WHO["PM25"]["warning"] * 0.35 +
        df["PM10"] / WHO["PM10"]["warning"] * 0.30 +
        df["CO"]   / WHO["CO"]["warning"]   * 0.20 +
        df["VOC"]  / WHO["VOC"]["warning"]  * 0.15
    )
    
    # Cumulative Exposure
    df["Cumulative_Exposure"] = (df["PM25"].expanding().mean() +
                                  df["PM10"].expanding().mean()) / 2
    
    df["Operating_Hours"] = float(operating_hours)
                                  
    return df[FEATURE_COLS]


# ---------------------------------------------------------------------------
# Recommendation helper
# ---------------------------------------------------------------------------

def get_recommendation(status: str, request: PredictRequest, integrity: float) -> str:
    """Return a human-readable recommendation based on predicted status, integrity, and sensor values."""
    if status == "Bahaya":
        if request.pm25 > 75.0:
            exceed = request.pm25 / 15.0
            return (
                f"Kondisi BERBAHAYA: PM2.5 mencapai {request.pm25:.2f} \u03bcg/m\u00b3 "
                f"({exceed:.2f}x lipat di atas batas aman harian WHO 15 \u03bcg/m\u00b3). "
                "Rekomendasi: Gunakan masker N95, hindari aktivitas outdoor, dan atur kecepatan kipas Air Purifier ke tingkat tinggi (HIGH)."
            )
        elif request.pm10 > 150.0:
            exceed = request.pm10 / 45.0
            return (
                f"Kondisi BERBAHAYA: PM10 mencapai {request.pm10:.2f} \u03bcg/m\u00b3 "
                f"({exceed:.2f}x lipat di atas batas aman harian WHO 45 \u03bcg/m\u00b3). "
                "Rekomendasi: Gunakan masker, kurangi aktivitas luar ruangan, dan nyalakan Air Purifier pada tingkat maksimum."
            )
        elif request.co > 9.0:
            exceed = request.co / 9.0
            return (
                f"Kondisi BERBAHAYA: Kadar CO mencapai {request.co:.2f} ppm "
                f"({exceed:.2f}x lipat di atas batas aman harian WHO 9 ppm). "
                "Rekomendasi: Segera buka ventilasi ruangan, matikan sumber gas, dan gunakan masker jika diperlukan."
            )
        elif request.voc > 1.0:
            exceed = request.voc / 1.0
            return (
                f"Kondisi BERBAHAYA: Kadar VOC mencapai {request.voc:.2f} mg/m\u00b3 "
                f"({exceed:.2f}x lipat di atas batas aman harian 1.0 mg/m\u00b3). "
                "Rekomendasi: Pastikan sirkulasi udara luar lancar dan gunakan pembersih udara dengan karbon aktif."
            )
        if integrity < 30.0:
            return f"Kondisi BERBAHAYA: Sisa umur pakai filter habis ({integrity:.2f}%). Rekomendasi: Segera ganti filter HEPA baru."
        return "Kondisi BERBAHAYA: Beberapa parameter kualitas udara melebihi ambang batas keselamatan kritis."

    if status == "Perhatian":
        if 30.0 <= integrity < 70.0:
            return f"Perhatian: Kesehatan filter mulai menurun ({integrity:.2f}%). Rekomendasi: Bersihkan pra-filter dan jadwalkan penggantian unit filter HEPA dalam waktu dekat."
        return "Perhatian: Kualitas udara menurun. Rekomendasi: Tutup jendela dan nyalakan Air Purifier pada mode otomatis."

    # "Aman"
    return "Filter berfungsi optimal dan kualitas udara berada dalam kondisi aman."


def calculate_pseudo_probabilities(rul: float) -> dict[str, float]:
    """Menghitung pseudo-probabilities berbasis RUL untuk transisi UI yang halus."""
    rul = max(0.0, min(rul, 4320.0))
    if rul >= 3024:
        ratio = (rul - 3024) / (4320 - 3024)
        p_aman = 0.7 + 0.3 * ratio
        p_perhatian = 1.0 - p_aman
        p_bahaya = 0.0
    elif rul >= 1296:
        if rul >= 2160:
            ratio = (rul - 2160) / (3024 - 2160)
            p_aman = 0.1 + 0.6 * ratio
            p_perhatian = 0.8 - 0.5 * ratio
            p_bahaya = 0.1 - 0.1 * ratio
        else:
            ratio = (rul - 1296) / (2160 - 1296)
            p_aman = 0.1 * ratio
            p_bahaya = 0.7 - 0.6 * ratio
            p_perhatian = 1.0 - p_aman - p_bahaya
    else:
        ratio = rul / 1296
        p_bahaya = 1.0 - 0.3 * ratio
        p_perhatian = 1.0 - p_bahaya
        p_aman = 0.0
        
    return {
        "Aman": round(p_aman, 4),
        "Perhatian": round(p_perhatian, 4),
        "Bahaya": round(p_bahaya, 4)
    }


# ---------------------------------------------------------------------------
# Lifespan: load model once at startup
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):  # type: ignore[type-arg]
    try:
        loader = ModelLoader()
        app.state.loader = loader
        logger.info("Models and scaler loaded successfully.")
    except FileNotFoundError as exc:
        logger.error("Failed to load model files: %s", exc)
        sys.exit(1)

    # Initialize TimescaleDB connection status
    app.state.db_connected = False
    db_url = os.getenv("DATABASE_URL") or os.getenv("TIMESCALE_URL")
    if db_url:
        if PSYCOPG2_AVAILABLE:
            try:
                logger.info("Attempting connection to TimescaleDB...")
                conn = psycopg2.connect(db_url, connect_timeout=3)
                conn.close()
                app.state.db_connected = True
                logger.info("Successfully verified connection to TimescaleDB.")
            except Exception as exc:
                logger.error("TimescaleDB connection failed on startup: %s", exc)
        else:
            logger.warning("psycopg2 is not available; skipping database connection verification.")
    else:
        logger.info("No database connection configured (DATABASE_URL / TIMESCALE_URL is empty).")

    yield


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="ML Filter Estimation Service", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, Any]:
    db_status = "not configured"
    db_url = os.getenv("DATABASE_URL") or os.getenv("TIMESCALE_URL")
    if db_url:
        if PSYCOPG2_AVAILABLE:
            try:
                conn = psycopg2.connect(db_url, connect_timeout=2)
                conn.close()
                db_status = "connected"
            except Exception as exc:
                logger.error("Database health check ping failed: %s", exc)
                db_status = "disconnected"
        else:
            db_status = "driver_missing"

    loader: ModelLoader = app.state.loader
    return {
        "status": "ok", 
        "database": db_status, 
        "available_models": loader.AVAILABLE_MODELS, 
        "default_model": loader.DEFAULT_MODEL
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest) -> Any:
    start_ms = time.perf_counter() * 1000

    loader: ModelLoader = app.state.loader
    
    # 1. Select active model
    model = loader.get_model(request.model_type)
    model_used = request.model_type.lower()
    if model_used not in loader.AVAILABLE_MODELS:
        model_used = loader.DEFAULT_MODEL

    # 2. Construct history data
    raw_history = []
    
    if request.history and len(request.history) > 0:
        # Client passed history list
        for item in request.history:
            raw_history.append({
                "pm25": item.pm25,
                "pm10": item.pm10,
                "co": item.co,
                "voc": item.voc,
                "suhu": item.suhu,
                "timestamp": item.timestamp
            })
        # Check if current reading is in history, otherwise append it
        last_item = raw_history[-1]
        if not (
            abs(last_item["pm25"] - request.pm25) < 1e-5 and
            abs(last_item["pm10"] - request.pm10) < 1e-5 and
            abs(last_item["co"] - request.co) < 1e-5 and
            abs(last_item["voc"] - request.voc) < 1e-5 and
            abs(last_item["suhu"] - request.suhu) < 1e-5
        ):
            raw_history.append({
                "pm25": request.pm25,
                "pm10": request.pm10,
                "co": request.co,
                "voc": request.voc,
                "suhu": request.suhu,
                "timestamp": request.timestamp
            })
    else:
        # Use our local in-memory sliding queue
        current_item = {
            "pm25": request.pm25,
            "pm10": request.pm10,
            "co": request.co,
            "voc": request.voc,
            "suhu": request.suhu,
            "timestamp": request.timestamp
        }
        with history_lock:
            if len(sensor_history_queue) == 0 or not (
                abs(sensor_history_queue[-1]["pm25"] - current_item["pm25"]) < 1e-5 and
                abs(sensor_history_queue[-1]["pm10"] - current_item["pm10"]) < 1e-5 and
                abs(sensor_history_queue[-1]["co"] - current_item["co"]) < 1e-5 and
                abs(sensor_history_queue[-1]["voc"] - current_item["voc"]) < 1e-5 and
                abs(sensor_history_queue[-1]["suhu"] - current_item["suhu"]) < 1e-5
            ):
                sensor_history_queue.append(current_item)
            raw_history = list(sensor_history_queue)

    # Build DataFrame
    history_df = pd.DataFrame(raw_history)

    # Compute 29 features
    features_df = compute_features(history_df, request.operating_hours)

    # We want to predict for the last item (the current state)
    current_features = features_df.iloc[[-1]]

    # Scaler is NOT needed for tree models (DT / RF). We do direct prediction.
    predicted_rul = float(model.predict(current_features.values)[0])

    # Rule-Based New Filter Override (Approach 2)
    # If the filter was recently reset (operating hours < 1 hour), force predicted RUL to maximum 4320.0 hours
    if request.operating_hours < 1.0:
        predicted_rul = 4320.0

    # Clamp RUL to physical limits
    predicted_rul = max(0.0, min(predicted_rul, 4320.0))
    integrity = (predicted_rul / 4320.0) * 100.0

    # Determine status label
    if integrity >= 70.0:
        status = "Aman"
    elif integrity >= 30.0:
        status = "Perhatian"
    else:
        status = "Bahaya"

    # Calculate probabilities from RUL
    probabilities = calculate_pseudo_probabilities(predicted_rul)

    # Calculate rule-based safety override
    pm25_val = float(current_features["PM25"].iloc[0])
    pm10_val = float(current_features["PM10"].iloc[0])
    co_val = float(current_features["CO"].iloc[0])
    voc_val = float(current_features["VOC"].iloc[0])
    cpi_val = float(current_features["CPI"].iloc[0])
    total_exceed_val = int(current_features["Total_exceed"].iloc[0])

    if pm25_val > 125.4 or pm10_val > 354.0 or co_val > 50.0 or voc_val > 100.0:
        rule_status = "Bahaya"
    elif pm25_val > 35.4 or pm10_val > 154.0 or co_val > 15.0 or voc_val > 20.0:
        rule_status = "Perhatian"
    else:
        rule_status = "Aman"

    # AI Guardrail override
    severity = {"Aman": 0, "Perhatian": 1, "Bahaya": 2}
    if severity[rule_status] > severity[status]:
        logger.info(f"Guardrail trigger: overriding status '{status}' with '{rule_status}' due to active parameters.")
        status = rule_status
        probabilities = {
            "Aman": 1.0 if status == "Aman" else 0.0,
            "Perhatian": 1.0 if status == "Perhatian" else 0.0,
            "Bahaya": 1.0 if status == "Bahaya" else 0.0
        }

    confidence = float(max(probabilities.values()))
    recommendation = get_recommendation(status, request, integrity)
    latency_ms = time.perf_counter() * 1000 - start_ms

    return PredictResponse(
        status=status,
        probabilities=probabilities,
        recommendation=recommendation,
        confidence=confidence,
        model_used=model_used,
        latency_ms=latency_ms,
        predicted_rul_hours=round(predicted_rul, 2),
        filter_integrity_percent=round(integrity, 2)
    )
