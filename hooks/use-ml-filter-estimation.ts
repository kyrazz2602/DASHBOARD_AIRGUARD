"use client";

import { useState, useEffect, useRef } from "react";
import { useSensorData } from "@/hooks/use-sensor-data";
import { useFilterEstimation } from "@/hooks/use-filter-estimation";
import {
  predictFilterStatus,
  getRuleBasedStatus,
  extractFeatures,
  MLServiceError,
} from "@/lib/ml-client";
import type {
  FilterStatus,
  FilterProbabilities,
  SensorFeatures,
} from "@/lib/sensor-data";

// ─── Return type ────────────────────────────────────────────────────────────

export interface MLFilterEstimationResult {
  // From ML model
  mlStatus: FilterStatus | null;
  probabilities: FilterProbabilities | null;
  recommendation: string | null;
  confidence: number | null;
  isMLAvailable: boolean;
  isPredicting: boolean;
  error: string | null;

  // From useFilterEstimation (never null)
  healthPct: number;
  daysRemaining: number;
  isLoading: boolean;
  resetFilter: () => Promise<void>;

  // Rule-based fallback (always available)
  ruleBasedStatus: FilterStatus;
}

// ─── Cache helper ────────────────────────────────────────────────────────────

/**
 * Returns true when |a - b| <= |b| * pct, or when both are zero.
 * Used to decide whether sensor values changed significantly enough to
 * warrant a new ML prediction request.
 */
function isWithinDelta(a: number, b: number, pct = 0.05): boolean {
  if (a === 0 && b === 0) return true;
  return Math.abs(a - b) <= Math.abs(b) * pct;
}

/**
 * Returns true when all five sensor values are within `pct` (default 5%) of
 * the cached features — meaning the prediction result is still fresh enough
 * to reuse without sending a new request.
 */
function isCacheValid(
  current: SensorFeatures,
  cached: SensorFeatures,
  pct = 0.05,
): boolean {
  return (
    isWithinDelta(current.pm25, cached.pm25, pct) &&
    isWithinDelta(current.pm10, cached.pm10, pct) &&
    isWithinDelta(current.co, cached.co, pct) &&
    isWithinDelta(current.voc, cached.voc, pct) &&
    isWithinDelta(current.suhu, cached.suhu, pct)
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMLFilterEstimation(): MLFilterEstimationResult {
  // ── 8.1 State initialization ──────────────────────────────────────────────

  const sensorData = useSensorData();
  const { healthPct, daysRemaining, resetFilter, isLoading } =
    useFilterEstimation();

  const [mlStatus, setMlStatus] = useState<FilterStatus | null>(null);
  const [probabilities, setProbabilities] =
    useState<FilterProbabilities | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isMLAvailable, setIsMLAvailable] = useState<boolean>(true);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ── 8.3 Prediction cache ──────────────────────────────────────────────────

  /** Stores the SensorFeatures used in the last successful prediction. */
  const lastFeatures = useRef<SensorFeatures | null>(null);

  // ── 8.2 Debounced ML prediction effect ───────────────────────────────────

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      // Validate: skip if all primary pollutant values are zero
      if (
        sensorData.pm25 === 0 &&
        sensorData.pm10 === 0 &&
        sensorData.co === 0 &&
        sensorData.voc === 0
      ) {
        return;
      }

      const features = extractFeatures(sensorData);

      // ── 8.3 Cache check ────────────────────────────────────────────────────
      if (
        lastFeatures.current !== null &&
        isCacheValid(features, lastFeatures.current)
      ) {
        // Sensor values haven't changed significantly — reuse cached prediction
        return;
      }

      setIsPredicting(true);

      try {
        const result = await predictFilterStatus(features);

        setMlStatus(result.status);
        setProbabilities(result.probabilities);
        setRecommendation(result.recommendation);
        setConfidence(result.confidence);
        setIsMLAvailable(true);
        setError(null);

        // Update cache after a successful prediction
        lastFeatures.current = features;
      } catch (err) {
        if (err instanceof MLServiceError) {
          if (err.code === "SERVICE_UNAVAILABLE" || err.code === "TIMEOUT") {
            // Fallback to rule-based status when ML service is down
            setIsMLAvailable(false);
            setMlStatus(getRuleBasedStatus(features));
          } else if (err.code === "INVALID_INPUT") {
            setError(err.message);
          }
        }
      } finally {
        setIsPredicting(false);
      }
    }, 2000);

    // Clean up the pending timeout when sensorData changes or component unmounts
    return () => {
      clearTimeout(timeoutId);
    };
  }, [sensorData]);

  // ── 8.4 Return shape ──────────────────────────────────────────────────────

  return {
    // ML prediction state
    mlStatus,
    probabilities,
    recommendation,
    confidence,
    isMLAvailable,
    isPredicting,
    error,

    // From useFilterEstimation (never null)
    healthPct,
    daysRemaining,
    isLoading,
    resetFilter,

    // Rule-based fallback — always computed, never null
    ruleBasedStatus: getRuleBasedStatus(extractFeatures(sensorData)),
  };
}
