// Real-time sensor data simulator with WHO air quality standards
export interface SensorReading {
  pm25: number;
  pm10: number;
  co: number;
  voc: number;
  suhu: number;
  battery: number;
  timestamp: Date;
}

export interface HistoricalData {
  timestamp: Date;
  pm25: number;
  pm10: number;
  co: number;
  voc: number;
  suhu: number;
  battery: number;
}

// WHO Air Quality Guidelines (μg/m³)
export const WHO_STANDARDS = {
  PM2_5: { safe: 15, warning: 35, danger: 55 },
  PM10: { safe: 45, warning: 75, danger: 150 },
  CO: { safe: 10, warning: 20, danger: 50 },
  VOC: { safe: 5, warning: 10, danger: 20 },
};

export function generateSensorData(): SensorReading {
  // Simulate realistic sensor fluctuations
  const baseValues = {
    pm25: 12 + Math.sin(Date.now() / 5000) * 8 + Math.random() * 4,
    pm10: 18 + Math.cos(Date.now() / 4000) * 10 + Math.random() * 5,
    co: 15 + Math.sin(Date.now() / 6000) * 5 + Math.random() * 3,
    voc: 8 + Math.cos(Date.now() / 5500) * 3 + Math.random() * 2,
    suhu: 25 + Math.sin(Date.now() / 7000) * 3 + Math.random() * 2,
  };

  return {
    pm25: Math.max(0, baseValues.pm25),
    pm10: Math.max(0, baseValues.pm10),
    co: Math.max(0, baseValues.co),
    voc: Math.max(0, baseValues.voc),
    suhu: Math.max(0, baseValues.suhu),
    battery: Math.max(5, 100 - Math.floor(Math.random() * 20)),
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
        pm10: Math.max(0, 18 + Math.cos(dayOffset / 2.5) * 8 + Math.random() * 5),
        co: Math.max(0, 15 + Math.sin(dayOffset / 3) * 7 + Math.random() * 3),
        voc: Math.max(0, 8 + Math.cos(dayOffset / 2.2) * 4 + Math.random() * 2),
        suhu: Math.max(0, 25 + Math.sin(dayOffset / 4) * 3 + Math.random() * 2),
        battery: Math.max(5, 100 - Math.floor(Math.random() * 20)),
      });
    }
  }

  return data;
}

export function getStatusColor(
  value: number,
  type: keyof typeof WHO_STANDARDS
): string {
  const standard = WHO_STANDARDS[type];
  if (value <= standard.safe) return "bg-green-500";
  if (value <= standard.warning) return "bg-yellow-500";
  return "bg-red-500";
}

export function getStatusLabel(
  value: number,
  type: keyof typeof WHO_STANDARDS
): string {
  const standard = WHO_STANDARDS[type];
  if (value <= standard.safe) return "Safe";
  if (value <= standard.warning) return "Caution";
  return "Danger";
}

export type FanSpeed = "off" | "low" | "normal" | "high";

export function detectRecommendedFanSpeed(data: SensorReading): FanSpeed {
  // Check if any sensor exceeds danger threshold
  if (
    data.pm25 > WHO_STANDARDS.PM2_5.danger ||
    data.pm10 > WHO_STANDARDS.PM10.danger ||
    data.co > WHO_STANDARDS.CO.danger ||
    data.voc > WHO_STANDARDS.VOC.danger
  ) {
    return "high";
  }

  // Check if any sensor exceeds warning threshold
  if (
    data.pm25 > WHO_STANDARDS.PM2_5.warning ||
    data.pm10 > WHO_STANDARDS.PM10.warning ||
    data.co > WHO_STANDARDS.CO.warning ||
    data.voc > WHO_STANDARDS.VOC.warning
  ) {
    return "normal";
  }

  // All sensors in safe range
  return "low";
}
