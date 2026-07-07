"use client";

import { useState, useEffect, useRef } from "react";
import { useSensorData } from "@/hooks/use-sensor-data";
import { useFilterEstimation } from "@/hooks/use-filter-estimation";
import {
  predictFilterStatus,
  getRuleBasedStatus,
  extractFeatures,
  buildFallbackFilterPrediction,
  MLServiceError,
  getProbabilitiesFromRul,
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
  isMLAvailable: boolean;
  isPredicting: boolean;

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

// ─── Constants ───────────────────────────────────────────────────────────────

const ML_MODEL = "random_forest";

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMLFilterEstimation(): MLFilterEstimationResult {
  // ── 8.1 State initialization ──────────────────────────────────────────────

  const { data: sensorData } = useSensorData();
  const { healthPct, daysRemaining, resetFilter, isLoading, filterStartDate } =
    useFilterEstimation();

  const [mlStatus, setMlStatus] = useState<FilterStatus | null>(null);
  const [probabilities, setProbabilities] =
    useState<FilterProbabilities | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isMLAvailable, setIsMLAvailable] = useState<boolean>(true);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);

  // Internal ML outputs used to override filter health estimation
  const [predictedRulHours, setPredictedRulHours] = useState<number | null>(null);
  const [filterIntegrityPercent, setFilterIntegrityPercent] = useState<number | null>(null);

  // ── 8.3 Prediction cache ──────────────────────────────────────────────────

  /** Stores the SensorFeatures used in the last successful prediction. */
  const lastFeatures = useRef<SensorFeatures | null>(null);
  /** Tracks whether ML is currently known to be unavailable (for retry logic). */
  const mlUnavailable = useRef<boolean>(false);

  const applyFallbackPrediction = (
    fallbackHealthPct: number,
    fallbackDaysRemaining: number,
  ) => {
    const fallback = buildFallbackFilterPrediction(
      fallbackHealthPct,
      fallbackDaysRemaining,
    );
    setMlStatus(fallback.status);
    setProbabilities(fallback.probabilities);
    setRecommendation(fallback.recommendation);
    setPredictedRulHours(fallback.predictedRulHours);
    setFilterIntegrityPercent(fallback.filterIntegrityPercent);
  };

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
        setIsPredicting(false);
        return;
      }

      if (allZero) {
        setIsPredicting(false);
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
        isCacheValid(features, lastFeatures.current) &&
        !mlUnavailable.current
      ) {
        return;
      }

      // When ML is offline, refresh fallback from latest filter health data
      if (mlUnavailable.current) {
        applyFallbackPrediction(healthPct, daysRemaining);
        lastFeatures.current = features;
        return;
      }

      setIsPredicting(true);

      try {
        const result = await predictFilterStatus(features, operatingHours, ML_MODEL);

        const finalIntegrity = result.filterIntegrityPercent;
        const finalRulHours = result.predictedRulHours;

        // Calculate status locally to bypass any outdated remote server-side guardrail overrides
        let localStatus: FilterStatus = "Aman";
        if (finalIntegrity >= 70) {
          localStatus = "Aman";
        } else if (finalIntegrity >= 30) {
          localStatus = "Perhatian";
        } else {
          localStatus = "Bahaya";
        }

        // Calculate probabilities locally
        const localProbabilities = getProbabilitiesFromRul(finalRulHours);

        // Calculate recommendation locally
        let localRecommendation = "";
        if (localStatus === "Bahaya") {
          localRecommendation = `Kondisi Ganti Filter: Sisa umur pakai filter kritis (${finalIntegrity.toFixed(0)}%). Rekomendasi: Segera ganti filter HEPA baru.`;
        } else if (localStatus === "Perhatian") {
          localRecommendation = `Perhatian: Kesehatan filter mulai menurun (${finalIntegrity.toFixed(0)}%). Rekomendasi: Bersihkan pra-filter dan jadwalkan penggantian HEPA dalam waktu dekat.`;
        } else {
          localRecommendation = "Filter berfungsi optimal berdasarkan estimasi umur pakai dan beban polutan.";
        }

        setMlStatus(localStatus);
        setProbabilities(localProbabilities);
        setRecommendation(localRecommendation);
        setPredictedRulHours(finalRulHours);
        setFilterIntegrityPercent(finalIntegrity);
        setIsMLAvailable(true);
        mlUnavailable.current = false;

        // Update cache after a successful prediction
        lastFeatures.current = features;
      } catch (err) {
        if (err instanceof MLServiceError) {
          if (err.code === "SERVICE_UNAVAILABLE" || err.code === "TIMEOUT") {
            mlUnavailable.current = true;
            setIsMLAvailable(false);
            applyFallbackPrediction(healthPct, daysRemaining);
          } else if (err.code === "INVALID_INPUT") {
            console.warn("[useMLFilterEstimation]", err.message);
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
  }, [sensorData, filterStartDate, healthPct, daysRemaining]);

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
    isMLAvailable,
    isPredicting,

    // Overridden or fallback estimation values
    healthPct: finalHealthPct,
    daysRemaining: finalDaysRemaining,
    isLoading,
    resetFilter,

    // Rule-based fallback — always computed, never null
    ruleBasedStatus: getRuleBasedStatus(extractFeatures(sensorData)),
  };
}
