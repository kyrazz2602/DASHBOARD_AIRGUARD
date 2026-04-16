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
 * - Returns "Ganti Filter" if pm25 > 75 OR pm10 > 150 OR co > 9 OR voc > 2
 * - Returns "Perhatian" if pm25 > 35 OR pm10 > 75 OR co > 2 OR voc > 0.5
 * - Returns "Aman" for all other conditions
 * - Never throws, never returns null
 */
export function getRuleBasedStatus(features: SensorFeatures): FilterStatus {
  const { pm25, pm10, co, voc } = features;

  // Check "Ganti Filter" threshold (most severe — check first)
  if (pm25 > 75 || pm10 > 150 || co > 9 || voc > 2) {
    return "Ganti Filter";
  }

  // Check "Perhatian" threshold
  if (pm25 > 35 || pm10 > 75 || co > 2 || voc > 0.5) {
    return "Perhatian";
  }

  // Default: safe
  return "Aman";
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
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 422) {
        throw new MLServiceError(
          "Invalid sensor input values",
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
      gantiFilter: data.probabilities["Ganti Filter"] ?? 0,
    };

    const result: MLPredictionResult = {
      status: data.status as FilterStatus,
      probabilities,
      recommendation: data.recommendation,
      confidence: data.confidence,
      modelUsed: data.model_used,
      latencyMs: data.latency_ms,
      predictedAt: new Date(),
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
