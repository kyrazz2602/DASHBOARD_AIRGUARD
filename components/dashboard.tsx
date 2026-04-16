"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSensorData } from "@/hooks/use-sensor-data";
import { SensorCard } from "@/components/sensor-card";
import { DevicePanel } from "@/components/device-panel";
import { ControlsSection } from "@/components/controls-section";
import { ChartSection } from "@/components/chart-section";
import { MaintenanceWidget } from "@/components/maintenance-widget";
import { NotificationToast } from "@/components/notification-toast";
import { WHO_STANDARDS, getStatusLabel } from "@/lib/sensor-data";
import { useMLFilterEstimation } from "@/hooks/use-ml-filter-estimation";
import { useAuth } from "@/context/auth-context";
import { User } from "firebase/auth";
import {
  Wind,
  Droplets,
  Flame,
  Leaf,
  Calendar,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { MobileNav } from "@/components/mobile-nav";

export default function Dashboard({ user }: { user: User }) {
  const sensorData = useSensorData(3000);

  // --- DEVICE MAINTENANCE DATA ---
  const {
    healthPct,
    daysRemaining,
    resetFilter,
    isLoading,
    mlStatus,
    probabilities,
    recommendation,
    confidence,
    isMLAvailable,
    isPredicting,
  } = useMLFilterEstimation();

  const [notification, setNotification] = useState<{
    message: string;
    type: "warning" | "danger";
    visible: boolean;
  }>({ message: "", type: "warning", visible: false });

  const [overallStatus, setOverallStatus] = useState<
    "Good" | "Warning" | "Danger"
  >("Good");

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    const checks = [
      {
        condition: sensorData.pm25 > WHO_STANDARDS.PM2_5.warning,
        message: `PM2.5 level is at ${sensorData.pm25.toFixed(
          1,
        )} μg/m³ - ${getStatusLabel(sensorData.pm25, "PM2_5")}!`,
        type:
          sensorData.pm25 > WHO_STANDARDS.PM2_5.danger
            ? ("danger" as const)
            : ("warning" as const),
      },
      {
        condition: sensorData.co > WHO_STANDARDS.CO.warning,
        message: `CO level is at ${sensorData.co.toFixed(
          1,
        )} ppm - ${getStatusLabel(sensorData.co, "CO")}!`,
        type:
          sensorData.co > WHO_STANDARDS.CO.danger
            ? ("danger" as const)
            : ("warning" as const),
      },
      {
        condition: sensorData.voc > WHO_STANDARDS.VOC.warning,
        message: `VOC level is at ${sensorData.voc.toFixed(
          1,
        )} ppm - ${getStatusLabel(sensorData.voc, "VOC")}!`,
        type:
          sensorData.voc > WHO_STANDARDS.VOC.danger
            ? ("danger" as const)
            : ("warning" as const),
      },
    ];

    const activeCheck = checks.find((check) => check.condition);

    if (checks.some((c) => c.type === "danger" && c.condition)) {
      setOverallStatus("Danger");
    } else if (checks.some((c) => c.type === "warning" && c.condition)) {
      setOverallStatus("Warning");
    } else {
      setOverallStatus("Good");
    }

    if (activeCheck) {
      setNotification({
        message: activeCheck.message,
        type: activeCheck.type,
        visible: true,
      });
    }
  }, [sensorData.pm25, sensorData.co, sensorData.voc]);

  return (
    <div className="min-h-screen bg-background selection:bg-primary/30">
      <Navbar />
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <MobileNav />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-8 pb-20 md:pb-12 space-y-4 md:space-y-8">
        {/* --- WELCOME HEADER SECTION --- */}
        <div className="flex items-center justify-between gap-3 animate-in slide-in-from-top-5 duration-500">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Hi,{" "}
              <span className="text-primary">
                {
                  (
                    user.displayName ||
                    user.email?.split("@")[0] ||
                    "User"
                  ).split(" ")[0]
                }
              </span>
            </h1>
            <div className="flex items-center gap-1.5 text-muted-foreground mt-0.5">
              <Calendar className="w-3.5 h-3.5" />
              <p className="text-xs font-medium">{today}</p>
            </div>
          </div>

          {/* Overall Status Badge — compact on mobile */}
          <div
            className={`px-3 py-1.5 sm:px-5 sm:py-2 rounded-xl border backdrop-blur-md flex items-center gap-2 shadow-lg transition-colors shrink-0 ${
              overallStatus === "Good"
                ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                : overallStatus === "Warning"
                  ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                  : "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400"
            }`}
          >
            {overallStatus === "Good" ? (
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            )}
            <div>
              <p className="text-[9px] sm:text-xs font-semibold uppercase opacity-70 leading-none">
                Air Quality
              </p>
              <p className="font-bold text-xs sm:text-sm leading-tight">
                {overallStatus === "Good"
                  ? "Excellent"
                  : overallStatus === "Warning"
                    ? "Warning"
                    : "Dangerous"}
              </p>
            </div>
          </div>
        </div>

        {/* --- SENSOR CARDS — 2x2 grid on mobile --- */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <SensorCard
            label="PM2.5"
            value={sensorData.pm25}
            unit="μg/m³"
            type="PM2_5"
            icon={<Wind className="w-4 h-4 sm:w-5 sm:h-5" />}
            className="transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 hover:shadow-lg hover:shadow-indigo-500/10"
          />
          <SensorCard
            label="PM10"
            value={sensorData.pm10}
            unit="μg/m³"
            type="PM10"
            icon={<Droplets className="w-4 h-4 sm:w-5 sm:h-5" />}
            className="transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30 hover:shadow-lg hover:shadow-cyan-500/10"
          />
          <SensorCard
            label="CO"
            value={sensorData.co}
            unit="ppm"
            type="CO"
            icon={<Flame className="w-4 h-4 sm:w-5 sm:h-5" />}
            className="transition-all duration-300 hover:-translate-y-1 hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 hover:shadow-lg hover:shadow-rose-500/10"
          />
          <SensorCard
            label="VOC"
            value={sensorData.voc}
            unit="ppm"
            type="VOC"
            icon={<Leaf className="w-4 h-4 sm:w-5 sm:h-5" />}
            className="transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 hover:shadow-lg hover:shadow-emerald-500/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* --- LEFT SIDEBAR (Desktop only) --- */}
          <div className="lg:col-span-3 order-2 lg:order-1 hidden lg:block">
            <div className="sticky top-24 space-y-6">
              <DevicePanel name="AIRGUARD" status="Aktif" deviceId="DEV-001" />
              <MaintenanceWidget
                filterHealth={healthPct}
                daysRemaining={daysRemaining}
                onResetFilter={resetFilter}
                isLoading={isLoading}
                currentPm25={sensorData.pm25}
                temperature={sensorData.suhu}
                batteryLevel={sensorData.battery}
                mlStatus={mlStatus}
                probabilities={probabilities}
                recommendation={recommendation}
                confidence={confidence}
                isMLAvailable={isMLAvailable}
                isPredicting={isPredicting}
              />
            </div>
          </div>

          {/* --- MAIN CONTENT AREA --- */}
          <div className="lg:col-span-9 space-y-4 md:space-y-6 order-1 lg:order-2">
            {/* Device Panel — mobile only, compact */}
            <div className="lg:hidden">
              <DevicePanel name="AIRGUARD" status="Aktif" deviceId="DEV-001" />
            </div>

            {/* Controls Section */}
            <ControlsSection
              sensorData={sensorData}
              onFanSpeedChange={(speed) => {
                console.log("Speed changed:", speed);
              }}
            />

            {/* Chart Section */}
            <div className="min-h-[300px] md:min-h-[400px]">
              <ChartSection />
            </div>

            {/* Maintenance Widget — mobile only */}
            <div className="lg:hidden">
              <MaintenanceWidget
                filterHealth={healthPct}
                daysRemaining={daysRemaining}
                onResetFilter={resetFilter}
                isLoading={isLoading}
                currentPm25={sensorData.pm25}
                temperature={sensorData.suhu}
                batteryLevel={sensorData.battery}
                mlStatus={mlStatus}
                probabilities={probabilities}
                recommendation={recommendation}
                confidence={confidence}
                isMLAvailable={isMLAvailable}
                isPredicting={isPredicting}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Notifications */}
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onClose={() => setNotification({ ...notification, visible: false })}
      />
    </div>
  );
}
