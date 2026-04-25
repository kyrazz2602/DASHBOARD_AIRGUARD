"use client";

import { useState, useEffect } from "react";
import { useSensorData } from "@/hooks/use-sensor-data";
import { SensorCard } from "@/components/sensor-card";
import { DevicePanel } from "@/components/device-panel";
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
  const sensorData = useSensorData(3000);

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
      {
        condition: sensorData.pm25 > WHO_STANDARDS.PM2_5.warning,
        message: `PM2.5 ${sensorData.pm25.toFixed(1)} μg/m³ — ${getStatusLabel(sensorData.pm25, "PM2_5")}`,
        type:
          sensorData.pm25 > WHO_STANDARDS.PM2_5.danger
            ? ("danger" as const)
            : ("warning" as const),
      },
      {
        condition: sensorData.co > WHO_STANDARDS.CO.warning,
        message: `CO ${sensorData.co.toFixed(1)} ppm — ${getStatusLabel(sensorData.co, "CO")}`,
        type:
          sensorData.co > WHO_STANDARDS.CO.danger
            ? ("danger" as const)
            : ("warning" as const),
      },
      {
        condition: sensorData.voc > WHO_STANDARDS.VOC.warning,
        message: `VOC ${sensorData.voc.toFixed(1)} ppm — ${getStatusLabel(sensorData.voc, "VOC")}`,
        type:
          sensorData.voc > WHO_STANDARDS.VOC.danger
            ? ("danger" as const)
            : ("warning" as const),
      },
    ];

    if (checks.some((c) => c.type === "danger" && c.condition)) {
      setOverallStatus("Danger");
    } else if (checks.some((c) => c.type === "warning" && c.condition)) {
      setOverallStatus("Warning");
    } else {
      setOverallStatus("Good");
    }

    const activeCheck = checks.find((c) => c.condition);
    if (activeCheck) {
      setNotification({
        message: activeCheck.message,
        type: activeCheck.type,
        visible: true,
      });
    }
  }, [sensorData.pm25, sensorData.co, sensorData.voc]);

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
        <div className="flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-500">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Halo, <span className="text-primary">{firstName}</span> 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{today}</p>
          </div>

          {/* Air Quality Status Pill */}
          <div
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border backdrop-blur-sm shadow-sm shrink-0 transition-colors duration-500",
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
            <span className="sm:hidden text-xs font-bold">{sc.label}</span>
          </div>
        </div>

        {/* ── Sensor Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in slide-in-from-bottom-4 duration-500 delay-100">
          <SensorCard
            label="PM2.5"
            value={sensorData.pm25}
            unit="μg/m³"
            type="PM2_5"
            icon={<Wind className="w-4 h-4" />}
          />
          <SensorCard
            label="PM10"
            value={sensorData.pm10}
            unit="μg/m³"
            type="PM10"
            icon={<Droplets className="w-4 h-4" />}
          />
          <SensorCard
            label="CO"
            value={sensorData.co}
            unit="ppm"
            type="CO"
            icon={<Flame className="w-4 h-4" />}
          />
          <SensorCard
            label="VOC"
            value={sensorData.voc}
            unit="ppm"
            type="VOC"
            icon={<Leaf className="w-4 h-4" />}
          />
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Sidebar — desktop only */}
          <aside className="lg:col-span-3 hidden lg:flex flex-col gap-5">
            <div className="sticky top-24 space-y-5">
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
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-5">
            {/* Device Panel — mobile only */}
            <div className="lg:hidden">
              <DevicePanel name="AIRGUARD" status="Aktif" deviceId="DEV-001" />
            </div>

            {/* Controls */}
            <ControlsSection
              sensorData={sensorData}
              onFanSpeedChange={(speed) => console.log("Speed changed:", speed)}
            />

            {/* Chart */}
            <ChartSection />

            {/* Maintenance — mobile only */}
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

      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onClose={() => setNotification({ ...notification, visible: false })}
      />
    </div>
  );
}
