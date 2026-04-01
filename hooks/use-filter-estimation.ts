"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { HistoricalData, WHO_STANDARDS } from "@/lib/sensor-data";
import {
  listenToFilterStartDate,
  resetFilterStartDate as firebaseResetFilter,
  getHistoricalData
} from "@/lib/firebase-data";

export function useFilterEstimation() {
  const [filterStartDate, setFilterStartDate] = useState<number | null>(null);
  const [historicalDatas, setHistoricalDatas] = useState<HistoricalData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Listen to filter start date from Firebase
  useEffect(() => {
    const unsub = listenToFilterStartDate((timestamp) => {
      setFilterStartDate(timestamp);
      setIsLoading(false);
    });
    return unsub;
  }, []);

  // 2. Fetch history on mount (fetch last 7 days for calculating average load)
  useEffect(() => {
    getHistoricalData(7).then((data) => {
      setHistoricalDatas(data);
    });
  }, []);

  // 3. Calculate filter health logic
  const estimation = useMemo(() => {
    // Start date fallback if never set (assume today for first run to display 100%)
    const start = filterStartDate || Date.now();
    const now = Date.now();
    
    // Days elapsed since filter was installed
    const daysElapsed = Math.max(0, (now - start) / (1000 * 60 * 60 * 24));
    
    // Calculate average pollutant load over the fetched historical period
    let avgPm25 = 0;
    let avgPm10 = 0;
    let avgCo = 0;
    let avgVoc = 0;

    if (historicalDatas.length > 0) {
      avgPm25 = historicalDatas.reduce((sum, d) => sum + d.pm25, 0) / historicalDatas.length;
      avgPm10 = historicalDatas.reduce((sum, d) => sum + d.pm10, 0) / historicalDatas.length;
      avgCo = historicalDatas.reduce((sum, d) => sum + d.co, 0) / historicalDatas.length;
      avgVoc = historicalDatas.reduce((sum, d) => sum + d.voc, 0) / historicalDatas.length;
    } else {
      // If no history, assume normal safe conditions
      avgPm25 = WHO_STANDARDS.PM2_5.safe;
      avgPm10 = WHO_STANDARDS.PM10.safe;
      avgCo = WHO_STANDARDS.CO.safe;
      avgVoc = WHO_STANDARDS.VOC.safe;
    }

    // Base lifespan for HEPA filter in 'Safe' conditions is ~6 months (180 days)
    const BASE_LIFESPAN = 180;
    
    // Calculate degradation multiplier:
    // If average PM2.5 is exactly safe (15), ratio is 1. If it's double (30), ratio is 2 (faster degradation).
    // The filter takes the brunt of the worst pollutant, so we take the maximum ratio calculation.
    const ratioPm25 = Math.max(1, avgPm25 / WHO_STANDARDS.PM2_5.safe);
    const ratioPm10 = Math.max(1, avgPm10 / WHO_STANDARDS.PM10.safe);
    const ratioCo = Math.max(1, avgCo / WHO_STANDARDS.CO.safe);
    const ratioVoc = Math.max(1, avgVoc / WHO_STANDARDS.VOC.safe);

    // Using the max ratio ensures that we degrade faster if ANY pollutant is extremely high
    const degradationMultiplier = Math.max(ratioPm25, ratioPm10, ratioCo, ratioVoc);

    // Adjusted estimated total lifespan (in days) given the environmental wear
    const estimatedTotalLifespan = BASE_LIFESPAN / degradationMultiplier;

    // Remaining days before filter is theoretically exhausted
    const daysRemaining = Math.max(0, Math.floor(estimatedTotalLifespan - daysElapsed));
    
    // Health percentage bounded between 0 and 100
    let healthPct = 100 - (daysElapsed / estimatedTotalLifespan) * 100;
    healthPct = Math.max(0, Math.min(100, Math.round(healthPct)));

    // If filter start date is not set in Firebase yet, let's just pretend it's fresh (100%)
    if (!filterStartDate) {
       return {
         healthPct: 100,
         daysRemaining: BASE_LIFESPAN,
         isFallback: true
       };
    }

    return {
      healthPct,
      daysRemaining,
      isFallback: false
    };
  }, [filterStartDate, historicalDatas]);

  const resetFilter = useCallback(async () => {
    setIsLoading(true);
    try {
      await firebaseResetFilter();
      // Optimistic update will be handled by the onValue listener
    } catch (err) {
      console.error("Failed to reset filter:", err);
      setIsLoading(false);
    }
  }, []);

  return {
    healthPct: estimation.healthPct,
    daysRemaining: estimation.daysRemaining,
    resetFilter,
    isLoading
  };
}
