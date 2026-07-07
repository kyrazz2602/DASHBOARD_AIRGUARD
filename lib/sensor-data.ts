// Real-time sensor data simulator with WHO air quality standards
export interface SensorReading {
  pm25: number;
  pm10: number;
  co: number;
  voc: number;
  suhu: number;
  battery: number; // Persentase (%)
  tegangan: number; // Tegangan (V)
  arus: number; // Arus (A)
  timestamp: Date;
}

export interface HistoricalData {
  pm25: number;
  pm10: number;
  co: number;
  voc: number;
  suhu: number;
  battery: number;
  tegangan: number;
  arus: number;
  timestamp: Date;
}

// WHO Air Quality Guidelines (μg/m³)
export const WHO_STANDARDS = {
  PM2_5: { safe: 35.4, warning: 125.4, danger: 125.5 },
  PM10: { safe: 154, warning: 354, danger: 355 },
  CO: { safe: 15, warning: 50, danger: 50 },
  VOC: { safe: 0.3, warning: 1.0, danger: 1.0 },
};

export function generateSensorData(): SensorReading {
  // Simulate realistic sensor fluctuations
  const baseValues = {
    pm25: 12 + Math.sin(Date.now() / 5000) * 8 + Math.random() * 4,
    pm10: 18 + Math.cos(Date.now() / 4000) * 10 + Math.random() * 5,
    co: 15 + Math.sin(Date.now() / 6000) * 5 + Math.random() * 3,
    voc: 0.4 + Math.sin(Date.now() / 7000) * 0.5 + Math.random() * 0.2,
    suhu: 25 + Math.sin(Date.now() / 7000) * 3 + Math.random() * 2,
  };

  return {
    pm25: Math.max(0, baseValues.pm25),
    pm10: Math.max(0, baseValues.pm10),
    co: Math.max(0, baseValues.co),
    voc: Math.max(0, baseValues.voc),
    suhu: Math.max(0, baseValues.suhu),
    battery: Math.max(5, 100 - Math.floor(Math.random() * 20)),
    tegangan: Math.max(0, 12 + Math.random() * 4),
    arus: Math.max(0, 0.5 + Math.random() * 1.5),
    timestamp: new Date(),
  };
}

export function generateHistoricalData(days: number): HistoricalData[] {
  const data: HistoricalData[] = [];
  const now = Date.now();

  for (let i = days - 1; i >= 0; i--) {
    for (let h = 0; h < 24; h++) {
      const timestamp = new Date(now - (i * 24 + h) * 3600000);
      const dayOffset = i + h;
      data.push({
        timestamp,
        pm25: Math.max(0, 10 + Math.sin(dayOffset / 2) * 5 + Math.random() * 4),
        pm10: Math.max(
          0,
          18 + Math.cos(dayOffset / 2.5) * 8 + Math.random() * 5,
        ),
        co: Math.max(0, 15 + Math.sin(dayOffset / 3) * 7 + Math.random() * 3),
        voc: Math.max(0, 0.4 + Math.cos(dayOffset / 2.2) * 0.5 + Math.random() * 0.2),
        suhu: Math.max(0, 25 + Math.sin(dayOffset / 4) * 3 + Math.random() * 2),
        battery: Math.max(5, 100 - Math.floor(Math.random() * 20)),
        tegangan: Math.max(0, 12 + Math.random() * 4),
        arus: Math.max(0, 0.5 + Math.random() * 1.5),
      });
    }
  }

  return data;
}

export function getStatusColor(
  value: number,
  type: keyof typeof WHO_STANDARDS,
): string {
  if (type === "VOC") {
    if (value < 0.3) return "bg-green-500";
    if (value <= 1.0) return "bg-yellow-500";
    return "bg-red-500";
  }
  const standard = WHO_STANDARDS[type];
  if (value <= standard.safe) return "bg-green-500";
  if (value <= standard.warning) return "bg-yellow-500";
  return "bg-red-500";
}

export function getStatusLabel(
  value: number,
  type: keyof typeof WHO_STANDARDS,
): string {
  if (type === "VOC") {
    if (value < 0.3) return "Safe";
    if (value <= 1.0) return "Warning";
    return "Danger";
  }
  const standard = WHO_STANDARDS[type];
  if (value <= standard.safe) return "Safe";
  if (value <= standard.warning) return "Warning";
  return "Danger";
}

export type FanSpeed = "off" | "low" | "normal" | "high";

export function detectRecommendedFanSpeed(data: SensorReading): FanSpeed {
  // Get status of each main air quality pollutant
  const pm25Status = getStatusLabel(data.pm25, "PM2_5");
  const pm10Status = getStatusLabel(data.pm10, "PM10");
  const coStatus = getStatusLabel(data.co, "CO");
  const vocStatus = getStatusLabel(data.voc, "VOC");

  const statuses = [pm25Status, pm10Status, coStatus, vocStatus];

  // 1. If any sensor is in Danger (Bahaya) -> High speed
  if (statuses.includes("Danger")) {
    return "high";
  }

  // 2. If any sensor is in Warning (Perhatian) -> Normal speed
  if (statuses.includes("Warning")) {
    return "normal";
  }

  // 3. Otherwise (all sensors are Safe/Aman) -> Low speed
  return "low";
}

// ML Filter Estimation Types

export type FilterStatus = "Aman" | "Perhatian" | "Bahaya";

export interface FilterProbabilities {
  aman: number; // 0-1
  perhatian: number; // 0-1
  bahaya: number; // 0-1
}

export interface SensorFeatures {
  pm25: number; // μg/m³
  pm10: number; // μg/m³
  co: number; // ppm
  voc: number; // ppm
  suhu: number; // °C
}

export interface MLPredictionResult {
  status: FilterStatus;
  probabilities: FilterProbabilities;
  recommendation: string;
  confidence: number; // 0-1, probabilitas kelas tertinggi
  modelUsed: string;
  latencyMs: number;
  predictedAt: Date;
  predictedRulHours: number;
  filterIntegrityPercent: number;
}

