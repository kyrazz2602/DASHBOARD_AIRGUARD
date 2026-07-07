import type {
  FilterStatus,
  SensorFeatures,
  FilterProbabilities,
  MLPredictionResult,
} from "@/lib/sensor-data";

/**
 * Custom error class for ML service failures.
 *
 * Codes:
 * - "SERVICE_UNAVAILABLE": Python service is down or returned a non-422 error
 * - "INVALID_INPUT": Sensor values failed validation (HTTP 422)
 * - "TIMEOUT": Request exceeded the 5-second timeout
 */
export class MLServiceError extends Error {
  code: "SERVICE_UNAVAILABLE" | "INVALID_INPUT" | "TIMEOUT";

  constructor(message: string, code: MLServiceError["code"]) {
    super(message);
    this.name = "MLServiceError";
    this.code = code;
  }
}

/**
 * Rule-based fallback for filter status classification.
 *
 * Postconditions:
 * - Returns "Bahaya" if pm25 > 125.4 OR pm10 > 354 OR co > 50 OR voc > 100
 * - Returns "Perhatian" if pm25 > 35.4 OR pm10 > 154 OR co > 15 OR voc > 20
 * - Returns "Aman" for all other conditions
 * - Never throws, never returns null
 */
export function getRuleBasedStatus(features: SensorFeatures): FilterStatus {
  const { pm25, pm10, co, voc } = features;

  // Check "Bahaya" threshold (most severe — check first)
  if (pm25 > 125.4 || pm10 > 354 || co > 50 || voc > 1.0) {
    return "Bahaya";
  }

  // Check "Perhatian" threshold
  if (pm25 > 35.4 || pm10 > 154 || co > 15 || voc >= 0.3) {
    return "Perhatian";
  }

  // Default: safe
  return "Aman";
}

const MAX_RUL_HOURS = 4320;

/**
 * Maps filter integrity percentage to status label.
 * Mirrors the same thresholds used by the Python ML service.
 */
export function getFilterStatusFromIntegrity(integrityPercent: number): FilterStatus {
  if (integrityPercent >= 70) return "Aman";
  if (integrityPercent >= 30) return "Perhatian";
  return "Bahaya";
}

/**
 * Derives pseudo-probabilities from predicted RUL hours.
 * Ported from python-ml-service/main.py calculate_pseudo_probabilities().
 */
export function getProbabilitiesFromRul(rulHours: number): FilterProbabilities {
  const rul = Math.max(0, Math.min(rulHours, MAX_RUL_HOURS));
  let pAman: number;
  let pPerhatian: number;
  let pBahaya: number;

  if (rul >= 3024) {
    const ratio = (rul - 3024) / (4320 - 3024);
    pAman = 0.7 + 0.3 * ratio;
    pPerhatian = 1.0 - pAman;
    pBahaya = 0.0;
  } else if (rul >= 1296) {
    if (rul >= 2160) {
      const ratio = (rul - 2160) / (3024 - 2160);
      pAman = 0.1 + 0.6 * ratio;
      pPerhatian = 0.8 - 0.5 * ratio;
      pBahaya = 0.1 - 0.1 * ratio;
    } else {
      const ratio = (rul - 1296) / (2160 - 1296);
      pAman = 0.1 * ratio;
      pBahaya = 0.7 - 0.6 * ratio;
      pPerhatian = 1.0 - pAman - pBahaya;
    }
  } else {
    const ratio = rul / 1296;
    pBahaya = 1.0 - 0.3 * ratio;
    pPerhatian = 1.0 - pBahaya;
    pAman = 0.0;
  }

  return {
    aman: Math.round(pAman * 10000) / 10000,
    perhatian: Math.round(pPerhatian * 10000) / 10000,
    bahaya: Math.round(pBahaya * 10000) / 10000,
  };
}

/**
 * Builds a complete fallback prediction from rule-based filter estimation
 * when the ML service is unavailable.
 */
export function buildFallbackFilterPrediction(
  healthPct: number,
  daysRemaining: number,
): Pick<
  MLPredictionResult,
  "status" | "probabilities" | "recommendation" | "confidence" | "predictedRulHours" | "filterIntegrityPercent"
> {
  const integrity = Math.max(0, Math.min(100, healthPct));
  const rulHours = Math.max(0, daysRemaining * 24);
  const status = getFilterStatusFromIntegrity(integrity);
  const probabilities = getProbabilitiesFromRul(rulHours);

  let recommendation: string;
  if (status === "Bahaya") {
    recommendation = `Kondisi Ganti Filter: Sisa umur pakai filter kritis (${integrity.toFixed(0)}%). Rekomendasi: Segera ganti filter HEPA baru.`;
  } else if (status === "Perhatian") {
    recommendation = `Perhatian: Kesehatan filter mulai menurun (${integrity.toFixed(0)}%). Rekomendasi: Bersihkan pra-filter dan jadwalkan penggantian HEPA dalam waktu dekat.`;
  } else {
    recommendation = "Filter berfungsi optimal berdasarkan estimasi umur pakai dan beban polutan.";
  }

  return {
    status,
    probabilities,
    recommendation,
    confidence: Math.max(probabilities.aman, probabilities.perhatian, probabilities.bahaya),
    predictedRulHours: rulHours,
    filterIntegrityPercent: integrity,
  };
}

/**
 * Identity mapping from a SensorReading-like object to SensorFeatures.
 * Preserves all five values exactly without any transformation.
 * The order [pm25, pm10, co, voc, suhu] matches the training data ordering.
 */
export function extractFeatures(sensorData: {
  pm25: number;
  pm10: number;
  co: number;
  voc: number;
  suhu: number;
}): SensorFeatures {
  return {
    pm25: sensorData.pm25,
    pm10: sensorData.pm10,
    co: sensorData.co,
    voc: sensorData.voc,
    suhu: sensorData.suhu,
  };
}

/**
 * Sends a prediction request to the Next.js API Route proxy.
 *
 * Preconditions:
 * - features contains valid numeric values for all five sensor fields
 *
 * Postconditions:
 * - On success: returns MLPredictionResult with predictedAt set to current time
 * - On HTTP 503: throws MLServiceError with code "SERVICE_UNAVAILABLE"
 * - On HTTP 422: throws MLServiceError with code "INVALID_INPUT"
 * - On any other non-2xx: throws MLServiceError with code "SERVICE_UNAVAILABLE"
 * - On timeout (>5s): throws MLServiceError with code "TIMEOUT"
 */
export async function predictFilterStatus(
  features: SensorFeatures,
  operatingHours: number = 0,
  modelType: string = "random_forest",
): Promise<MLPredictionResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch("/api/ml/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pm25: features.pm25,
        pm10: features.pm10,
        co: features.co,
        voc: features.voc,
        suhu: features.suhu,
        operating_hours: operatingHours,
        model_type: modelType,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 422) {
        let errMsg = "Nilai sensor tidak valid";
        try {
          const errData = await response.json();
          if (errData.details && Array.isArray(errData.details)) {
            const detailMsgs = errData.details.map((d: any) => d.message).join(", ");
            errMsg = `Nilai sensor tidak valid: ${detailMsgs}`;
          } else if (errData.error) {
            errMsg = errData.error;
          }
        } catch {
          // ignore
        }
        throw new MLServiceError(
          errMsg,
          "INVALID_INPUT",
        );
      }
      if (response.status === 503) {
        throw new MLServiceError(
          "ML service is unavailable",
          "SERVICE_UNAVAILABLE",
        );
      }
      throw new MLServiceError(
        `Unexpected error from ML service (HTTP ${response.status})`,
        "SERVICE_UNAVAILABLE",
      );
    }

    const data = await response.json();

    // Map Python service response keys to MLPredictionResult shape
    const probabilities: FilterProbabilities = {
      aman: data.probabilities["Aman"] ?? 0,
      perhatian: data.probabilities["Perhatian"] ?? 0,
      bahaya: data.probabilities["Bahaya"] ?? 0,
    };

    const result: MLPredictionResult = {
      status: data.status as FilterStatus,
      probabilities,
      recommendation: data.recommendation,
      confidence: data.confidence,
      modelUsed: data.model_used,
      latencyMs: data.latency_ms,
      predictedAt: new Date(),
      predictedRulHours: data.predicted_rul_hours,
      filterIntegrityPercent: data.filter_integrity_percent,
    };

    return result;
  } catch (error) {
    if (error instanceof MLServiceError) {
      throw error;
    }
    // AbortController fires a DOMException with name "AbortError"
    if (
      error instanceof Error &&
      (error.name === "AbortError" || controller.signal.aborted)
    ) {
      throw new MLServiceError(
        "ML prediction request timed out after 5 seconds",
        "TIMEOUT",
      );
    }
    throw new MLServiceError(
      "Failed to reach ML service",
      "SERVICE_UNAVAILABLE",
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// Re-export types used by consumers of this module
export type {
  FilterStatus,
  SensorFeatures,
  FilterProbabilities,
  MLPredictionResult,
};
