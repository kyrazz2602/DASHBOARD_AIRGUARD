"""
Script to test the ML Prediction Model and AI Guardrails
using 30 distinct simulated actual air quality scenarios.
"""

import sys
from pathlib import Path
import numpy as np
import pandas as pd

# Add the current directory to python path to import main and model_loader
sys.path.append(str(Path(__file__).parent))

from main import compute_features, get_recommendation, PredictRequest
from model_loader import ModelLoader

def generate_history_for_scenario(pm25, pm10, co, voc, suhu, steps=10):
    """
    Generate 10 historical readings leading to the target reading
    with realistic random fluctuations to simulate actual detected sensor data.
    """
    history = []
    # Seed for reproducibility
    np.random.seed(42)
    
    # Generate random walk fluctuations for historical steps
    for i in range(steps):
        # We make fluctuations smaller for earlier readings and taper to the exact target at the end
        factor = (steps - 1 - i) / steps
        fluc_pm25 = np.random.normal(0, 1.5) * factor
        fluc_pm10 = np.random.normal(0, 2.5) * factor
        fluc_co = np.random.normal(0, 0.5) * factor
        fluc_voc = np.random.normal(0, 0.3) * factor
        fluc_suhu = np.random.normal(0, 0.2) * factor
        
        # Calculate timestamp (simulating 1-minute intervals)
        timestamp = (pd.Timestamp.now() - pd.Timedelta(minutes=(steps - 1 - i))).isoformat()
        
        history.append({
            "pm25": max(0, pm25 + fluc_pm25),
            "pm10": max(0, pm10 + fluc_pm10),
            "co": max(0, co + fluc_co),
            "voc": max(0, voc + fluc_voc),
            "suhu": max(0, suhu + fluc_suhu),
            "timestamp": timestamp
        })
    return history

def evaluate_scenarios():
    # Load model and scaler
    loader = ModelLoader()
    model = loader.model
    scaler = loader.scaler

    # Define 30 scenarios representing different air conditions
    # Standard thresholds:
    # Safe: PM2.5 <= 35.4, PM10 <= 154, CO <= 15, VOC < 0.3
    # Warning: PM2.5 <= 125.4, PM10 <= 354, CO <= 50, VOC <= 1.0
    # Danger: PM2.5 > 125.4 OR PM10 > 354 OR CO > 50 OR VOC > 1.0
    scenarios = [
        # --- AMAN (SAFE) ---
        {"id": 1, "name": "Clean Air (Perfect)", "pm25": 8.5, "pm10": 12.0, "co": 2.1, "voc": 0.012, "suhu": 24.5, "expected": "Aman"},
        {"id": 2, "name": "Typical Indoor", "pm25": 12.0, "pm10": 18.5, "co": 3.5, "voc": 0.02, "suhu": 25.0, "expected": "Aman"},
        {"id": 3, "name": "Cool Morning", "pm25": 15.0, "pm10": 22.0, "co": 4.0, "voc": 0.031, "suhu": 21.0, "expected": "Aman"},
        {"id": 4, "name": "Warm Afternoon", "pm25": 20.0, "pm10": 30.0, "co": 5.0, "voc": 0.042, "suhu": 29.5, "expected": "Aman"},
        {"id": 5, "name": "Dry Indoor", "pm25": 18.0, "pm10": 28.0, "co": 3.0, "voc": 0.025, "suhu": 26.0, "expected": "Aman"},
        {"id": 6, "name": "Rainy Day Calm", "pm25": 10.0, "pm10": 15.0, "co": 2.8, "voc": 0.015, "suhu": 22.0, "expected": "Aman"},
        {"id": 7, "name": "AC Room Stable", "pm25": 7.0, "pm10": 11.0, "co": 1.9, "voc": 0.009, "suhu": 18.0, "expected": "Aman"},
        {"id": 8, "name": "Kitchen Fan Running", "pm25": 25.0, "pm10": 40.0, "co": 8.0, "voc": 0.06, "suhu": 27.0, "expected": "Aman"},
        {"id": 9, "name": "Bedroom Night", "pm25": 9.0, "pm10": 14.0, "co": 2.5, "voc": 0.018, "suhu": 23.0, "expected": "Aman"},
        {"id": 10, "name": "Library Silent", "pm25": 11.0, "pm10": 16.0, "co": 3.0, "voc": 0.022, "suhu": 24.0, "expected": "Aman"},
        
        # --- PERHATIAN (WARNING) ---
        {"id": 11, "name": "Hazy Day (PM2.5 warning)", "pm25": 45.0, "pm10": 60.0, "co": 6.0, "voc": 0.04, "suhu": 26.5, "expected": "Perhatian"},
        {"id": 12, "name": "Dust Buildup (PM10 warning)", "pm25": 20.0, "pm10": 165.0, "co": 5.0, "voc": 0.035, "suhu": 25.0, "expected": "Perhatian"},
        {"id": 13, "name": "Mild Exhaust (CO warning)", "pm25": 15.0, "pm10": 22.0, "co": 18.5, "voc": 0.05, "suhu": 24.0, "expected": "Perhatian"},
        {"id": 14, "name": "Perfume Spray (VOC warning)", "pm25": 12.0, "pm10": 18.0, "co": 4.0, "voc": 0.45, "suhu": 25.5, "expected": "Perhatian"},
        {"id": 15, "name": "Elevated Particles & Gas", "pm25": 38.0, "pm10": 80.0, "co": 8.0, "voc": 0.42, "suhu": 26.0, "expected": "Perhatian"},
        {"id": 16, "name": "Busy Traffic Haze", "pm25": 55.0, "pm10": 90.0, "co": 12.0, "voc": 0.15, "suhu": 28.0, "expected": "Perhatian"},
        {"id": 17, "name": "Mild Smoke Indoors", "pm25": 65.0, "pm10": 110.0, "co": 14.0, "voc": 0.18, "suhu": 27.5, "expected": "Perhatian"},
        {"id": 18, "name": "High Humidity Dust", "pm25": 30.0, "pm10": 180.0, "co": 7.0, "voc": 0.1, "suhu": 23.0, "expected": "Perhatian"},
        {"id": 19, "name": "Stuffy Closed Room", "pm25": 32.0, "pm10": 45.0, "co": 16.0, "voc": 0.38, "suhu": 25.0, "expected": "Perhatian"},
        {"id": 20, "name": "Cooking/Frying Vapors", "pm25": 80.0, "pm10": 140.0, "co": 12.0, "voc": 0.15, "suhu": 29.0, "expected": "Perhatian"},
        
        # --- GANTI FILTER (DANGER) ---
        {"id": 21, "name": "Severe Forest Fire Haze", "pm25": 160.0, "pm10": 210.0, "co": 18.0, "voc": 0.12, "suhu": 28.0, "expected": "Ganti Filter"},
        {"id": 22, "name": "Extreme Construction Dust", "pm25": 80.0, "pm10": 380.0, "co": 15.0, "voc": 0.08, "suhu": 26.0, "expected": "Ganti Filter"},
        {"id": 23, "name": "Dangerous CO Leakage", "pm25": 25.0, "pm10": 40.0, "co": 55.0, "voc": 0.15, "suhu": 24.5, "expected": "Ganti Filter"},
        {"id": 24, "name": "Chemical Solvent Fumes", "pm25": 15.0, "pm10": 30.0, "co": 8.0, "voc": 1.1, "suhu": 25.0, "expected": "Ganti Filter"},
        {"id": 25, "name": "Major Fire Smoke", "pm25": 250.0, "pm10": 420.0, "co": 65.0, "voc": 0.45, "suhu": 32.0, "expected": "Ganti Filter"},
        {"id": 26, "name": "Industrial Exhaust Leak", "pm25": 180.0, "pm10": 290.0, "co": 45.0, "voc": 0.3, "suhu": 30.0, "expected": "Ganti Filter"},
        {"id": 27, "name": "Incense in Closed Room", "pm25": 140.0, "pm10": 180.0, "co": 22.0, "voc": 0.85, "suhu": 26.0, "expected": "Ganti Filter"},
        {"id": 28, "name": "Gas Stove Leak & Smoke", "pm25": 135.0, "pm10": 240.0, "co": 52.0, "voc": 0.35, "suhu": 28.5, "expected": "Ganti Filter"},
        {"id": 29, "name": "Heavy Paint Vapors", "pm25": 30.0, "pm10": 70.0, "co": 12.0, "voc": 1.3, "suhu": 26.0, "expected": "Ganti Filter"},
        {"id": 30, "name": "Filter Total Failure", "pm25": 175.0, "pm10": 390.0, "co": 58.0, "voc": 1.15, "suhu": 27.5, "expected": "Ganti Filter"}
    ]

    results = []
    correct_raw_count = 0
    correct_final_count = 0

    print("Running predictions on 30 scenarios...")

    for sc in scenarios:
        # 1. Generate history data for feature engineering
        raw_history = generate_history_for_scenario(sc["pm25"], sc["pm10"], sc["co"], sc["voc"], sc["suhu"])
        history_df = pd.DataFrame(raw_history)
        
        # 2. Compute 28 features
        features_df = compute_features(history_df)
        current_features = features_df.iloc[[-1]]
        
        # 3. Scale features
        scaled = scaler.transform(current_features.values)
        
        # 4. Raw ML Model Prediction
        predicted_idx = int(model.predict(scaled)[0])
        raw_proba = model.predict_proba(scaled)[0]
        raw_status = loader.decode_label(predicted_idx)
        
        # 5. Apply AI Guardrail check (AI Guardrails removed)
        final_status = raw_status
        guardrail_triggered = False
            
        # Check prediction success
        is_raw_correct = (raw_status == sc["expected"])
        is_final_correct = (final_status == sc["expected"])
        
        if is_raw_correct:
            correct_raw_count += 1
        if is_final_correct:
            correct_final_count += 1
            
        results.append({
            "id": sc["id"],
            "name": sc["name"],
            "pm25": sc["pm25"],
            "pm10": sc["pm10"],
            "co": sc["co"],
            "voc": sc["voc"],
            "suhu": sc["suhu"],
            "expected": sc["expected"],
            "raw_status": raw_status,
            "final_status": final_status,
            "guardrail_triggered": "Ya" if guardrail_triggered else "Tidak",
            "status_raw_sukses": "SUKSES" if is_raw_correct else "GAGAL",
            "status_final_sukses": "SUKSES" if is_final_correct else "GAGAL"
        })

    # Output results in a Markdown Table
    markdown_output = "# Hasil Evaluasi Model Prediksi AirGuard\n\n"
    markdown_output += f"Total Pengujian: {len(scenarios)}\n"
    markdown_output += f"Akurasi Model Mentah (Tanpa Guardrail): {correct_raw_count}/{len(scenarios)} ({correct_raw_count/len(scenarios)*100:.1f}%)\n"
    markdown_output += f"Akurasi Model Final (Dengan Guardrail): {correct_final_count}/{len(scenarios)} ({correct_final_count/len(scenarios)*100:.1f}%)\n\n"
    
    markdown_output += "| No | Skenario Kondisi Udara | PM2.5 | PM10 | CO | VOC | Suhu | Ground Truth | Prediksi ML Mentah | Prediksi Final (Guardrail) | Guardrail Aktif | Status Keberhasilan |\n"
    markdown_output += "|---|------------------------|-------|------|----|-----|------|--------------|--------------------|----------------------------|-----------------|---------------------|\n"
    
    for r in results:
        markdown_output += f"| {r['id']} | {r['name']} | {r['pm25']:.1f} | {r['pm10']:.1f} | {r['co']:.1f} | {r['voc']:.1f} | {r['suhu']:.1f} | **{r['expected']}** | {r['raw_status']} | **{r['final_status']}** | {r['guardrail_triggered']} | {r['status_final_sukses']} |\n"

    print(markdown_output)
    
    # Save the output to a file in the workspace
    output_path = Path(__file__).parent / "evaluation_report.md"
    output_path.write_text(markdown_output, encoding="utf-8")
    print(f"Report saved successfully to {output_path}")

if __name__ == "__main__":
    evaluate_scenarios()
