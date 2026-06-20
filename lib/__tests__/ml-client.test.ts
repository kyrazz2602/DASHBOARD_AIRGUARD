import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getRuleBasedStatus, extractFeatures } from "../ml-client";
import type { SensorFeatures } from "../ml-client";

// ---------------------------------------------------------------------------
// Arbitrary: generates arbitrary SensorFeatures (unconstrained numeric values)
// Uses fc.double() which accepts regular JS doubles (no 32-bit restriction)
// ---------------------------------------------------------------------------
const anySensorFeatures = fc.record<SensorFeatures>({
  pm25: fc.double({ noNaN: false }),
  pm10: fc.double({ noNaN: false }),
  co: fc.double({ noNaN: false }),
  voc: fc.double({ noNaN: false }),
  suhu: fc.double({ noNaN: false }),
});

// ---------------------------------------------------------------------------
// Arbitrary: generates SensorFeatures that trigger "Bahaya"
// (at least one threshold exceeded: pm25 > 125.4 OR pm10 > 354 OR co > 50 OR voc > 100)
// ---------------------------------------------------------------------------
const gantiFeaturesArb = fc.oneof(
  // pm25 > 125.4
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 125.401, max: 1000, noNaN: true }),
    pm10: fc.double({ min: 0, max: 354, noNaN: true }),
    co: fc.double({ min: 0, max: 50, noNaN: true }),
    voc: fc.double({ min: 0, max: 100, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
  // pm10 > 354
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 0, max: 125.4, noNaN: true }),
    pm10: fc.double({ min: 354.001, max: 2000, noNaN: true }),
    co: fc.double({ min: 0, max: 50, noNaN: true }),
    voc: fc.double({ min: 0, max: 100, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
  // co > 50
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 0, max: 125.4, noNaN: true }),
    pm10: fc.double({ min: 0, max: 354, noNaN: true }),
    co: fc.double({ min: 50.001, max: 1000, noNaN: true }),
    voc: fc.double({ min: 0, max: 100, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
  // voc > 100
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 0, max: 125.4, noNaN: true }),
    pm10: fc.double({ min: 0, max: 354, noNaN: true }),
    co: fc.double({ min: 0, max: 50, noNaN: true }),
    voc: fc.double({ min: 100.001, max: 1000, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
);

// ---------------------------------------------------------------------------
// Arbitrary: generates SensorFeatures that trigger "Perhatian"
// (no "Ganti Filter" threshold met, but at least one "Perhatian" threshold met)
// ---------------------------------------------------------------------------
const perhatianFeaturesArb = fc.oneof(
  // pm25 in (35.4, 125.4]
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 35.401, max: 125.4, noNaN: true }),
    pm10: fc.double({ min: 0, max: 154, noNaN: true }),
    co: fc.double({ min: 0, max: 15, noNaN: true }),
    voc: fc.double({ min: 0, max: 20, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
  // pm10 in (154, 354]
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 0, max: 35.4, noNaN: true }),
    pm10: fc.double({ min: 154.001, max: 354, noNaN: true }),
    co: fc.double({ min: 0, max: 15, noNaN: true }),
    voc: fc.double({ min: 0, max: 20, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
  // co in (15, 50]
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 0, max: 35.4, noNaN: true }),
    pm10: fc.double({ min: 0, max: 154, noNaN: true }),
    co: fc.double({ min: 15.001, max: 50, noNaN: true }),
    voc: fc.double({ min: 0, max: 20, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
  // voc in (20, 100]
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 0, max: 35.4, noNaN: true }),
    pm10: fc.double({ min: 0, max: 154, noNaN: true }),
    co: fc.double({ min: 0, max: 15, noNaN: true }),
    voc: fc.double({ min: 20.001, max: 100, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
);

// ---------------------------------------------------------------------------
// Arbitrary: generates SensorFeatures that should return "Aman"
// (all values at or below "Perhatian" thresholds)
// ---------------------------------------------------------------------------
const amanFeaturesArb = fc.record<SensorFeatures>({
  pm25: fc.double({ min: 0, max: 35.4, noNaN: true }),
  pm10: fc.double({ min: 0, max: 154, noNaN: true }),
  co: fc.double({ min: 0, max: 15, noNaN: true }),
  voc: fc.double({ min: 0, max: 20, noNaN: true }),
  suhu: fc.double({ min: 0, max: 50, noNaN: true }),
});

// ---------------------------------------------------------------------------
// Valid status set
// ---------------------------------------------------------------------------
const VALID_STATUSES = new Set(["Aman", "Perhatian", "Bahaya"]);

// ===========================================================================
// Property 4: Rule-Based Fallback Always Returns Valid Status
// Validates: Requirements 1.6, 7.5
// ===========================================================================
describe("Property 4: Rule-Based Fallback Always Returns Valid Status", () => {
  it("always returns one of the three valid statuses for any input", () => {
    fc.assert(
      fc.property(anySensorFeatures, (features) => {
        const result = getRuleBasedStatus(features);
        expect(VALID_STATUSES.has(result)).toBe(true);
      }),
    );
  });

  it("never throws for any input (including extreme/NaN values)", () => {
    fc.assert(
      fc.property(anySensorFeatures, (features) => {
        expect(() => getRuleBasedStatus(features)).not.toThrow();
      }),
    );
  });

  it("never returns null or undefined for any input", () => {
    fc.assert(
      fc.property(anySensorFeatures, (features) => {
        const result = getRuleBasedStatus(features);
        expect(result).not.toBeNull();
        expect(result).not.toBeUndefined();
      }),
    );
  });
});

// ===========================================================================
// Property 5: Rule-Based Threshold Consistency
// Validates: Requirements 7.2, 7.3, 7.4
// ===========================================================================
describe("Property 5: Rule-Based Threshold Consistency", () => {
  it('returns "Bahaya" when pm25 > 125.4 OR pm10 > 354 OR co > 50 OR voc > 100', () => {
    fc.assert(
      fc.property(gantiFeaturesArb, (features) => {
        expect(getRuleBasedStatus(features)).toBe("Bahaya");
      }),
    );
  });

  it('returns "Perhatian" when Perhatian thresholds met but not Ganti Filter thresholds', () => {
    fc.assert(
      fc.property(perhatianFeaturesArb, (features) => {
        expect(getRuleBasedStatus(features)).toBe("Perhatian");
      }),
    );
  });

  it('returns "Aman" when no threshold is exceeded', () => {
    fc.assert(
      fc.property(amanFeaturesArb, (features) => {
        expect(getRuleBasedStatus(features)).toBe("Aman");
      }),
    );
  });

  // Boundary: exact threshold values should NOT trigger the higher status
  it('returns "Aman" for exact boundary values (pm25=35.4, pm10=154, co=15, voc=20)', () => {
    const boundary: SensorFeatures = {
      pm25: 35.4,
      pm10: 154,
      co: 15,
      voc: 20,
      suhu: 25,
    };
    expect(getRuleBasedStatus(boundary)).toBe("Aman");
  });

  it('returns "Perhatian" for exact Bahaya boundary values (pm25=125.4, pm10=354, co=50, voc=100)', () => {
    const boundary: SensorFeatures = {
      pm25: 125.4,
      pm10: 354,
      co: 50,
      voc: 100,
      suhu: 25,
    };
    expect(getRuleBasedStatus(boundary)).toBe("Perhatian");
  });
});

// ===========================================================================
// Property 11: SensorReading to SensorFeatures Mapping is Identity
// Validates: Requirements 12.1, 12.2
// ===========================================================================

// Arbitrary: generates SensorReading-like objects (all five sensor fields)
const anySensorReading = fc.record({
  pm25: fc.double({ noNaN: true, min: -1e6, max: 1e6 }),
  pm10: fc.double({ noNaN: true, min: -1e6, max: 1e6 }),
  co: fc.double({ noNaN: true, min: -1e6, max: 1e6 }),
  voc: fc.double({ noNaN: true, min: -1e6, max: 1e6 }),
  suhu: fc.double({ noNaN: true, min: -1e6, max: 1e6 }),
});

describe("Property 11: SensorReading to SensorFeatures Mapping is Identity", () => {
  it("preserves pm25 exactly without transformation", () => {
    fc.assert(
      fc.property(anySensorReading, (data) => {
        expect(extractFeatures(data).pm25).toBe(data.pm25);
      }),
    );
  });

  it("preserves pm10 exactly without transformation", () => {
    fc.assert(
      fc.property(anySensorReading, (data) => {
        expect(extractFeatures(data).pm10).toBe(data.pm10);
      }),
    );
  });

  it("preserves co exactly without transformation", () => {
    fc.assert(
      fc.property(anySensorReading, (data) => {
        expect(extractFeatures(data).co).toBe(data.co);
      }),
    );
  });

  it("preserves voc exactly without transformation", () => {
    fc.assert(
      fc.property(anySensorReading, (data) => {
        expect(extractFeatures(data).voc).toBe(data.voc);
      }),
    );
  });

  it("preserves suhu exactly without transformation", () => {
    fc.assert(
      fc.property(anySensorReading, (data) => {
        expect(extractFeatures(data).suhu).toBe(data.suhu);
      }),
    );
  });

  it("preserves all five values simultaneously for any SensorReading-like input", () => {
    fc.assert(
      fc.property(anySensorReading, (data) => {
        const features = extractFeatures(data);
        expect(features.pm25).toBe(data.pm25);
        expect(features.pm10).toBe(data.pm10);
        expect(features.co).toBe(data.co);
        expect(features.voc).toBe(data.voc);
        expect(features.suhu).toBe(data.suhu);
      }),
    );
  });

  it("produces a SensorFeatures object with exactly the five expected keys", () => {
    fc.assert(
      fc.property(anySensorReading, (data) => {
        const features = extractFeatures(data);
        const keys = Object.keys(features).sort();
        expect(keys).toEqual(["co", "pm10", "pm25", "suhu", "voc"]);
      }),
    );
  });
});
