// hooks/use-air-quality-alerts.ts
import { useMemo } from "react";
import { WHO_STANDARDS, getStatusLabel } from "@/lib/sensor-data";

export function useAirQualityAlerts(sensorData: any) {
  return useMemo(() => {
    const checks = [
      {
        key: "pm25",
        val: sensorData.pm25,
        std: WHO_STANDARDS.PM2_5,
        unit: "μg/m³",
      },
      { key: "co", val: sensorData.co, std: WHO_STANDARDS.CO, unit: "ppm" },
      { key: "voc", val: sensorData.voc, std: WHO_STANDARDS.VOC, unit: "ppm" },
    ];

    const activeAlert = checks.find((c) => c.val > c.std.warning);

    let status: "Good" | "Warning" | "Danger" = "Good";
    if (checks.some((c) => c.val > c.std.danger)) status = "Danger";
    else if (activeAlert) status = "Warning";

    return {
      overallStatus: status,
      alert: activeAlert
        ? {
            message: `${activeAlert.key.toUpperCase()} is at ${activeAlert.val.toFixed(1)} ${activeAlert.unit} - ${getStatusLabel(activeAlert.val, activeAlert.key.toUpperCase() as any)}!`,
            type:
              activeAlert.val > activeAlert.std.danger ? "danger" : "warning",
          }
        : null,
    };
  }, [sensorData]);
}
