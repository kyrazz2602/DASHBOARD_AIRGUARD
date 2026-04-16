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
// Arbitrary: generates SensorFeatures that trigger "Ganti Filter"
// (at least one threshold exceeded: pm25 > 75 OR pm10 > 150 OR co > 9 OR voc > 2)
// ---------------------------------------------------------------------------
const gantiFeaturesArb = fc.oneof(
  // pm25 > 75
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 75.001, max: 1000, noNaN: true }),
    pm10: fc.double({ min: 0, max: 150, noNaN: true }),
    co: fc.double({ min: 0, max: 9, noNaN: true }),
    voc: fc.double({ min: 0, max: 2, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
  // pm10 > 150
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 0, max: 75, noNaN: true }),
    pm10: fc.double({ min: 150.001, max: 2000, noNaN: true }),
    co: fc.double({ min: 0, max: 9, noNaN: true }),
    voc: fc.double({ min: 0, max: 2, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
  // co > 9
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 0, max: 75, noNaN: true }),
    pm10: fc.double({ min: 0, max: 150, noNaN: true }),
    co: fc.double({ min: 9.001, max: 100, noNaN: true }),
    voc: fc.double({ min: 0, max: 2, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
  // voc > 2
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 0, max: 75, noNaN: true }),
    pm10: fc.double({ min: 0, max: 150, noNaN: true }),
    co: fc.double({ min: 0, max: 9, noNaN: true }),
    voc: fc.double({ min: 2.001, max: 50, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
);

// ---------------------------------------------------------------------------
// Arbitrary: generates SensorFeatures that trigger "Perhatian"
// (no "Ganti Filter" threshold met, but at least one "Perhatian" threshold met)
// ---------------------------------------------------------------------------
const perhatianFeaturesArb = fc.oneof(
  // pm25 in (35, 75]
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 35.001, max: 75, noNaN: true }),
    pm10: fc.double({ min: 0, max: 75, noNaN: true }),
    co: fc.double({ min: 0, max: 2, noNaN: true }),
    voc: fc.double({ min: 0, max: 0.5, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
  // pm10 in (75, 150]
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 0, max: 35, noNaN: true }),
    pm10: fc.double({ min: 75.001, max: 150, noNaN: true }),
    co: fc.double({ min: 0, max: 2, noNaN: true }),
    voc: fc.double({ min: 0, max: 0.5, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
  // co in (2, 9]
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 0, max: 35, noNaN: true }),
    pm10: fc.double({ min: 0, max: 75, noNaN: true }),
    co: fc.double({ min: 2.001, max: 9, noNaN: true }),
    voc: fc.double({ min: 0, max: 0.5, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
  // voc in (0.5, 2]
  fc.record<SensorFeatures>({
    pm25: fc.double({ min: 0, max: 35, noNaN: true }),
    pm10: fc.double({ min: 0, max: 75, noNaN: true }),
    co: fc.double({ min: 0, max: 2, noNaN: true }),
    voc: fc.double({ min: 0.501, max: 2, noNaN: true }),
    suhu: fc.double({ min: 0, max: 50, noNaN: true }),
  }),
);

// ---------------------------------------------------------------------------
// Arbitrary: generates SensorFeatures that should return "Aman"
// (all values at or below "Perhatian" thresholds)
// ---------------------------------------------------------------------------
const amanFeaturesArb = fc.record<SensorFeatures>({
  pm25: fc.double({ min: 0, max: 35, noNaN: true }),
  pm10: fc.double({ min: 0, max: 75, noNaN: true }),
  co: fc.double({ min: 0, max: 2, noNaN: true }),
  voc: fc.double({ min: 0, max: 0.5, noNaN: true }),
  suhu: fc.double({ min: 0, max: 50, noNaN: true }),
});

// ---------------------------------------------------------------------------
// Valid status set
// ---------------------------------------------------------------------------
const VALID_STATUSES = new Set(["Aman", "Perhatian", "Ganti Filter"]);

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
  it('returns "Ganti Filter" when pm25 > 75 OR pm10 > 150 OR co > 9 OR voc > 2', () => {
    fc.assert(
      fc.property(gantiFeaturesArb, (features) => {
        expect(getRuleBasedStatus(features)).toBe("Ganti Filter");
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
  it('returns "Aman" for exact boundary values (pm25=35, pm10=75, co=2, voc=0.5)', () => {
    const boundary: SensorFeatures = {
      pm25: 35,
      pm10: 75,
      co: 2,
      voc: 0.5,
      suhu: 25,
    };
    expect(getRuleBasedStatus(boundary)).toBe("Aman");
  });

  it('returns "Perhatian" for exact Ganti Filter boundary values (pm25=75, pm10=150, co=9, voc=2)', () => {
    // pm25=75 is NOT > 75, pm10=150 is NOT > 150, co=9 is NOT > 9, voc=2 is NOT > 2
    // But pm25=75 > 35, so "Perhatian"
    const boundary: SensorFeatures = {
      pm25: 75,
      pm10: 150,
      co: 9,
      voc: 2,
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
