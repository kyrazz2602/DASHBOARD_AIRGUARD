import { describe, it, expect } from "vitest";
import { WHO_STANDARDS } from "../sensor-data";

// Simple calculation engine replicating the logic in use-filter-estimation
function calculateFilterHealth(
  filterStartDate: number | null,
  historicalDatas: any[],
  now: number = Date.now()
) {
  const start = filterStartDate || now;
  
  if (filterStartDate !== null && filterStartDate > now) {
    throw new Error("Tanggal instalasi filter berada di masa depan");
  }

  const daysElapsed = Math.max(0, (now - start) / (1000 * 60 * 60 * 24));
  
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
    avgPm25 = WHO_STANDARDS.PM2_5.safe;
    avgPm10 = WHO_STANDARDS.PM10.safe;
    avgCo = WHO_STANDARDS.CO.safe;
    avgVoc = WHO_STANDARDS.VOC.safe;
  }

  const BASE_LIFESPAN = 180;
  
  const ratioPm25 = Math.max(1, avgPm25 / WHO_STANDARDS.PM2_5.safe);
  const ratioPm10 = Math.max(1, avgPm10 / WHO_STANDARDS.PM10.safe);
  const ratioCo = Math.max(1, avgCo / WHO_STANDARDS.CO.safe);
  const ratioVoc = Math.max(1, avgVoc / WHO_STANDARDS.VOC.safe);

  const degradationMultiplier = Math.max(ratioPm25, ratioPm10, ratioCo, ratioVoc);
  const estimatedTotalLifespan = BASE_LIFESPAN / degradationMultiplier;

  const daysRemaining = Math.max(0, Math.floor(estimatedTotalLifespan - daysElapsed));
  
  let healthPct = 100 - (daysElapsed / estimatedTotalLifespan) * 100;
  healthPct = Math.max(0, Math.min(100, Math.round(healthPct)));

  return {
    healthPct,
    daysRemaining,
  };
}

describe("Filter Health Estimation Logic", () => {
  it("calculates 100% health for fresh filter resets", () => {
    const now = Date.now();
    const result = calculateFilterHealth(now, [], now);
    expect(result.healthPct).toBe(100);
    expect(result.daysRemaining).toBe(180);
  });

  it("calculates degradation over time correctly under normal conditions", () => {
    const now = Date.now();
    const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000;
    const result = calculateFilterHealth(tenDaysAgo, [], now);
    expect(result.healthPct).toBe(94); // 170 / 180 = ~94%
    expect(result.daysRemaining).toBe(170);
  });

  it("accelerates degradation with high average PM2.5 levels", () => {
    const now = Date.now();
    const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000;
    // PM2.5 is double the safe threshold (safe = 35.4, double = 70.8)
    const history = [{ pm25: 70.8, pm10: 0, co: 0, voc: 0 }];
    
    const result = calculateFilterHealth(tenDaysAgo, history, now);
    // Degradation multiplier = 2x, lifespan = 90 days, daysElapsed = 10, remaining = 80 days
    expect(result.daysRemaining).toBe(80);
    expect(result.healthPct).toBe(89); // (90 - 10)/90 = ~88.88% -> 89%
  });

  it("throws a validation error if installation date is in the future", () => {
    const now = Date.now();
    const oneDayInFuture = now + 24 * 60 * 60 * 1000;
    expect(() => calculateFilterHealth(oneDayInFuture, [], now)).toThrow(
      "Tanggal instalasi filter berada di masa depan"
    );
  });
});
