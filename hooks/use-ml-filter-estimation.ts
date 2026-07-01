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

  selectedModel: string;
  setSelectedModel: (model: string) => void;
  predictedRulHours: number | null;
  filterIntegrityPercent: number | null;
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

  const { data: sensorData } = useSensorData();
  const { healthPct, daysRemaining, resetFilter, isLoading, error: estimationError, filterStartDate } =
    useFilterEstimation();

  const [mlStatus, setMlStatus] = useState<FilterStatus | null>(null);
  const [probabilities, setProbabilities] =
    useState<FilterProbabilities | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isMLAvailable, setIsMLAvailable] = useState<boolean>(true);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // New RUL regression states
  const [selectedModel, setSelectedModel] = useState<string>("random_forest");
  const [predictedRulHours, setPredictedRulHours] = useState<number | null>(null);
  const [filterIntegrityPercent, setFilterIntegrityPercent] = useState<number | null>(null);

  // ── 8.3 Prediction cache ──────────────────────────────────────────────────

  /** Stores the SensorFeatures used in the last successful prediction. */
  const lastFeatures = useRef<SensorFeatures | null>(null);
  /** Stores the model name used in the last successful prediction. */
  const lastModel = useRef<string | null>(null);
  /** Tracks whether ML is currently known to be unavailable (for retry logic). */
  const mlUnavailable = useRef<boolean>(false);

  // ── Health check: retry when ML was previously unavailable ───────────────

  useEffect(() => {
    if (!mlUnavailable.current) return;

    // Poll every 30 seconds to check if ML service recovered
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch("/api/ml/health");
        if (res.ok) {
          // Service recovered — reset state so next sensor change triggers prediction
          mlUnavailable.current = false;
          lastFeatures.current = null;
          lastModel.current = null;
          setIsMLAvailable(true);
        }
      } catch {
        // Still unavailable — keep polling
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [isMLAvailable]);

  // ── 8.2 Debounced ML prediction effect ───────────────────────────────────

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      // Validate: skip jika semua sensor utama bernilai 0 (data belum masuk)
      // atau jika ada nilai yang tidak valid (NaN/Infinity)
      const allZero =
        sensorData.pm25 === 0 &&
        sensorData.pm10 === 0 &&
        sensorData.co === 0 &&
        sensorData.voc === 0;

      const hasInvalidValue = [
        sensorData.pm25,
        sensorData.pm10,
        sensorData.co,
        sensorData.voc,
        sensorData.suhu,
      ].some((v) => !isFinite(v) || isNaN(v));

      if (hasInvalidValue) {
        setError("Nilai pembacaan sensor tidak valid (NaN/Infinity). Silakan periksa koneksi sensor.");
        return;
      }

      if (allZero) {
        return;
      }

      const features = extractFeatures(sensorData);

      // ── Calculate operating hours from filterStartDate
      const operatingHours = filterStartDate
        ? Math.max(0, (Date.now() - filterStartDate) / (1000 * 60 * 60))
        : 0.0;

      // ── 8.3 Cache check ────────────────────────────────────────────────────
      if (
        lastFeatures.current !== null &&
        lastModel.current === selectedModel &&
        isCacheValid(features, lastFeatures.current) &&
        !mlUnavailable.current
      ) {
        // Sensor values and selected model haven't changed significantly — reuse cached prediction
        return;
      }

      setIsPredicting(true);

      try {
        const result = await predictFilterStatus(features, operatingHours, selectedModel);

        setMlStatus(result.status);
        setProbabilities(result.probabilities);
        setRecommendation(result.recommendation);
        setConfidence(result.confidence);
        setPredictedRulHours(result.predictedRulHours);
        setFilterIntegrityPercent(result.filterIntegrityPercent);
        setIsMLAvailable(true);
        mlUnavailable.current = false;
        setError(null);

        // Update cache after a successful prediction
        lastFeatures.current = features;
        lastModel.current = selectedModel;
      } catch (err) {
        if (err instanceof MLServiceError) {
          if (err.code === "SERVICE_UNAVAILABLE" || err.code === "TIMEOUT") {
            // Fallback to rule-based status when ML service is down
            mlUnavailable.current = true;
            setIsMLAvailable(false);
            setMlStatus(getRuleBasedStatus(features));
            setPredictedRulHours(null);
            setFilterIntegrityPercent(null);
          } else if (err.code === "INVALID_INPUT") {
            setError(err.message);
          }
        }
      } finally {
        setIsPredicting(false);
      }
    }, 2000);

    // Clean up the pending timeout when sensorData or selectedModel changes or component unmounts
    return () => {
      clearTimeout(timeoutId);
    };
  }, [sensorData, selectedModel, filterStartDate]);

  // ── 8.4 Override with ML predictions when online
  const finalHealthPct = (isMLAvailable && filterIntegrityPercent !== null)
    ? filterIntegrityPercent
    : healthPct;

  const finalDaysRemaining = (isMLAvailable && predictedRulHours !== null)
    ? Math.round(predictedRulHours / 24)
    : daysRemaining;

  return {
    // ML prediction state
    mlStatus,
    probabilities,
    recommendation,
    confidence,
    isMLAvailable,
    isPredicting,
    error: error || estimationError,

    // Overridden or fallback estimation values
    healthPct: finalHealthPct,
    daysRemaining: finalDaysRemaining,
    isLoading,
    resetFilter,

    // Rule-based fallback — always computed, never null
    ruleBasedStatus: getRuleBasedStatus(extractFeatures(sensorData)),

    selectedModel,
    setSelectedModel,
    predictedRulHours,
    filterIntegrityPercent,
  };
}
