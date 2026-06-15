"use client";

import { useState, useEffect, useRef } from "react";
import { useSensorData } from "@/hooks/use-sensor-data";
import { SensorCard } from "@/components/sensor-card";
import { ControlsSection } from "@/components/controls-section";
import { ChartSection } from "@/components/chart-section";
import { MaintenanceWidget } from "@/components/maintenance-widget";
import { NotificationToast } from "@/components/notification-toast";
import { WHO_STANDARDS, getStatusLabel } from "@/lib/sensor-data";
import { useMLFilterEstimation } from "@/hooks/use-ml-filter-estimation";
import { User } from "firebase/auth";
import {
  Wind,
  Droplets,
  Flame,
  Leaf,
  ShieldCheck,
  AlertTriangle,
  TriangleAlert,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { MobileNav } from "@/components/mobile-nav";
import { cn } from "@/lib/utils";

export default function Dashboard({ user }: { user: User }) {
  const { data: sensorData, isLoading: isSensorLoading } = useSensorData(3000);

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
    error,
  } = useMLFilterEstimation();

  const [notification, setNotification] = useState<{
    message: string;
    type: "warning" | "danger";
    visible: boolean;
  }>({ message: "", type: "warning", visible: false });

  const [overallStatus, setOverallStatus] = useState<
    "Good" | "Warning" | "Danger"
  >("Good");

  const prevAlertsRef = useRef<string>("");

  const firstName = (
    user.displayName ||
    user.email?.split("@")[0] ||
    "User"
  ).split(" ")[0];

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    const checks = [
      { name: "PM2.5", value: sensorData.pm25, type: "PM2_5" as const, unit: "μg/m³" },
      { name: "PM10", value: sensorData.pm10, type: "PM10" as const, unit: "μg/m³" },
      { name: "CO", value: sensorData.co, type: "CO" as const, unit: "ppm" },
      { name: "VOC", value: sensorData.voc, type: "VOC" as const, unit: "ppm" },
    ].map((param) => {
      const status = getStatusLabel(param.value, param.type);
      return {
        ...param,
        status,
        isAlert: status !== "Safe",
      };
    });

    const activeAlerts = checks.filter((c) => c.isAlert);
    const hasDanger = activeAlerts.some((c) => c.status === "Danger");
    const hasWarning = activeAlerts.some((c) => c.status === "Warning");

    if (hasDanger) {
      setOverallStatus("Danger");
    } else if (hasWarning) {
      setOverallStatus("Warning");
    } else {
      setOverallStatus("Good");
    }

    // Create a unique key to detect alert status changes
    const alertsKey = activeAlerts
      .map((c) => `${c.name}:${c.status}`)
      .join(",");

    if (alertsKey !== prevAlertsRef.current) {
      if (activeAlerts.length > 0) {
        const message = activeAlerts
          .map((alert) => {
            const statusIndo = alert.status === "Danger" ? "bahaya" : "warning";
            return `${alert.name} dalam kondisi ${statusIndo} (${alert.value.toFixed(1)} ${alert.unit})`;
          })
          .join("\n");

        setNotification({
          message,
          type: hasDanger ? "danger" : "warning",
          visible: true,
        });
      } else {
        setNotification((prev) => ({ ...prev, visible: false }));
      }
      prevAlertsRef.current = alertsKey;
    }
  }, [
    sensorData.pm25,
    sensorData.pm10,
    sensorData.co,
    sensorData.voc,
  ]);

  const statusConfig = {
    Good: {
      icon: <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />,
      label: "Udara Bersih",
      sublabel: "Semua parameter aman",
      classes:
        "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300",
    },
    Warning: {
      icon: <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />,
      label: "Perhatian",
      sublabel: "Ada parameter tinggi",
      classes:
        "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-300",
    },
    Danger: {
      icon: <TriangleAlert className="w-4 h-4 sm:w-5 sm:h-5" />,
      label: "Berbahaya",
      sublabel: "Kualitas udara buruk",
      classes:
        "bg-red-100 border-red-300 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-300",
    },
  };

  const sc = statusConfig[overallStatus];

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background blobs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-primary/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[140px]" />
      </div>

      <Navbar />
      <MobileNav />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 pb-24 md:pb-10 space-y-6">
        {/* ── Welcome Header ── */}
        <div className="flex items-center justify-between gap-2 sm:gap-4 animate-in slide-in-from-top-4 duration-500">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground tracking-tight truncate">
              Halo, <span className="text-primary">{firstName}</span> 👋
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-0.5 sm:mt-1 flex-wrap">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{today}</p>
              {(sensorData.battery === 0 || sensorData.suhu >= 33.0) && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {sensorData.battery === 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-red-500/20 bg-red-500/10 text-[10px] font-bold text-red-600 dark:text-red-400 animate-pulse">
                      ⚠ Baterai kritis (0%)
                    </span>
                  )}
                  {sensorData.suhu >= 33.0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-amber-500/20 bg-amber-500/10 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      ⚠ Suhu sensor tinggi ({sensorData.suhu.toFixed(1)}°C)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right side: air quality status */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Air Quality Status Pill */}
            <div
              className={cn(
                "flex items-center gap-1.5 sm:gap-2.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl border backdrop-blur-sm shadow-sm transition-colors duration-500",
                sc.classes,
              )}
            >
              {sc.icon}
              <div className="hidden sm:block">
                <p className="text-xs font-bold leading-tight">{sc.label}</p>
                <p className="text-[10px] opacity-70 leading-tight">
                  {sc.sublabel}
                </p>
              </div>
              <span className="sm:hidden text-[10px] sm:text-xs font-bold">{sc.label}</span>
            </div>
          </div>
        </div>

        {/* ── Sensor Cards ── */}
        <div className="animate-in slide-in-from-bottom-4 duration-500 delay-100">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Kualitas Udara Real-time
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SensorCard
              label="PM2.5"
              value={sensorData.pm25}
              unit="μg/m³"
              type="PM2_5"
              icon={<Wind className="w-4 h-4" />}
              isLoading={isSensorLoading}
            />
            <SensorCard
              label="PM10"
              value={sensorData.pm10}
              unit="μg/m³"
              type="PM10"
              icon={<Droplets className="w-4 h-4" />}
              isLoading={isSensorLoading}
            />
            <SensorCard
              label="CO"
              value={sensorData.co}
              unit="ppm"
              type="CO"
              icon={<Flame className="w-4 h-4" />}
              isLoading={isSensorLoading}
            />
            <SensorCard
              label="VOC"
              value={sensorData.voc}
              unit="ppm"
              type="VOC"
              icon={<Leaf className="w-4 h-4" />}
              isLoading={isSensorLoading}
            />
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Sidebar — desktop only */}
          <aside className="lg:col-span-3 hidden lg:flex flex-col gap-5">
            <div className="sticky top-24 space-y-5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Pemeliharaan Filter
              </p>
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
                error={error}
              />
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-5">
            {/* Controls */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Kontrol Perangkat
              </p>
              <ControlsSection
                sensorData={sensorData}
                onFanSpeedChange={(speed) =>
                  console.log("Speed changed:", speed)
                }
              />
            </div>

            {/* Chart */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Grafik Sensor
              </p>
              <ChartSection />
            </div>

            {/* Maintenance — mobile only */}
            <div className="lg:hidden">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                Pemeliharaan Filter
              </p>
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
                error={error}
              />
            </div>
          </div>
        </div>
      </main>

      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onClose={() => setNotification({ ...notification, visible: false })}
      />
    </div>
  );
}
