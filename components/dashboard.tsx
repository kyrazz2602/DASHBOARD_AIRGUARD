"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  AlertOctagon,
  BatteryLow,
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
    selectedModel,
    setSelectedModel,
    predictedRulHours,
    filterIntegrityPercent,
  } = useMLFilterEstimation();

  const [notification, setNotification] = useState<{
    message: string;
    type: "warning" | "danger";
    visible: boolean;
  }>({ message: "", type: "warning", visible: false });

  const [overallStatus, setOverallStatus] = useState<
    "Good" | "Warning" | "Danger"
  >("Good");

  const [isDangerAcknowledged, setIsDangerAcknowledged] = useState(false);
  const [isBatteryAlertDismissed, setIsBatteryAlertDismissed] = useState(false);

  const prevAlertsRef = useRef<string>("");

  const sensorAlerts = useMemo(() => {
    return [
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
    }).filter((c) => c.isAlert);
  }, [sensorData.pm25, sensorData.pm10, sensorData.co, sensorData.voc]);

  const firstName = useMemo(() => {
    const rawName = user.displayName || user.email?.split("@")[0] || "User";
    // Standardize separators to spaces or underscores
    const cleanName = rawName.replace(/[-]/g, "_");
    if (cleanName.includes("_")) {
      const parts = cleanName.split("_");
      // Find the first part that is purely alphabetical
      const namePart = parts.find((p) => /^[a-zA-Z]+$/.test(p));
      if (namePart) return namePart;
      // Fallback to the last part
      return parts[parts.length - 1];
    }
    return rawName.split(" ")[0];
  }, [user.displayName, user.email]);

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

    // Create a unique key to detect alert status changes (we only toast warnings now)
    const warningAlerts = activeAlerts.filter((c) => c.status === "Warning");
    const alertsKey = warningAlerts
      .map((c) => `${c.name}:${c.status}`)
      .join(",");

    if (alertsKey !== prevAlertsRef.current) {
      if (warningAlerts.length > 0) {
        const message = warningAlerts
          .map((alert) => {
            return `${alert.name} dalam kondisi perhatian (${alert.value.toFixed(1)} ${alert.unit})`;
          })
          .join("\n");

        setNotification({
          message,
          type: "warning",
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

  useEffect(() => {
    if (overallStatus !== "Danger") {
      setIsDangerAcknowledged(false);
    }
  }, [overallStatus]);

  useEffect(() => {
    if (sensorData.battery > 0) {
      setIsBatteryAlertDismissed(false);
    }
  }, [sensorData.battery]);

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
    <div className={cn(
      "min-h-screen transition-colors duration-500",
      overallStatus === "Danger" ? "bg-[#1a0000] dark text-red-50" : "bg-background"
    )}>
      {/* Ambient background blobs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-primary/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[140px]" />
      </div>

      <Navbar alerts={sensorAlerts} />
      <MobileNav />

      {overallStatus === "Danger" && !isDangerAcknowledged && (
        <div className="w-full bg-gradient-to-r from-red-950 via-red-800 to-rose-900 text-white py-4 px-4 md:px-8 border-b border-red-500/30 shadow-lg animate-in slide-in-from-top duration-300 sticky top-16 z-40">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center animate-pulse shrink-0">
                <AlertOctagon className="w-6 h-6 text-red-100 animate-[bounce_2s_infinite]" />
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-sm md:text-base tracking-wider uppercase text-red-200 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping inline-block" />
                  PERINGATAN DARURAT KUALITAS UDARA!
                </p>
                <div className="text-xs md:text-sm text-red-100 mt-1 leading-relaxed">
                  {sensorData.pm25 > WHO_STANDARDS.PM2_5.danger ? (
                    <p className="mb-1.5">
                      Kondisi <span className="font-bold text-white uppercase underline decoration-red-500 decoration-2">BERBAHAYA</span>: PM2.5 mencapai <span className="font-bold text-white bg-red-950/60 px-1.5 py-0.5 rounded border border-red-500/30">{sensorData.pm25.toFixed(1)} µg/m³</span> (<span className="font-bold text-white">{(sensorData.pm25 / 15).toFixed(1)}x lipat</span> di atas batas aman harian WHO 15 µg/m³).
                    </p>
                  ) : (
                    <p className="mb-1.5">
                      Kondisi <span className="font-bold text-white uppercase underline decoration-red-500 decoration-2">BERBAHAYA</span>: Parameter sensor melebihi batas aman kritis.
                    </p>
                  )}
                  <p className="font-semibold text-white bg-white/10 px-2.5 py-1 rounded inline-block">
                    Rekomendasi: Gunakan masker N95, hindari aktivitas outdoor, dan atur kecepatan kipas Air Purifier ke tingkat tinggi (HIGH).
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsDangerAcknowledged(true)}
              className="w-full md:w-auto px-6 py-3 rounded-xl bg-white text-red-900 hover:bg-red-50 hover:shadow-lg transition-all duration-200 active:scale-95 font-bold text-sm shrink-0 shadow-md border border-white/20 cursor-pointer min-h-[44px] flex items-center justify-center"
            >
              Saya Paham & Patuhi
            </button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 pb-24 md:pb-10 space-y-12">
        {/* ── Header & Banner Block ── */}
        <div className="space-y-6">
          {/* Critical Battery Alert Banner */}
          {sensorData.battery === 0 && !isBatteryAlertDismissed && (
            <div className="w-full bg-gradient-to-br from-red-950/90 via-rose-950/95 to-slate-900/90 border border-rose-500/30 text-white rounded-2xl p-5 shadow-xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative overflow-hidden">
              {/* Ambient indicator glow */}
              <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center shrink-0">
                  <BatteryLow className="w-6 h-6 text-rose-400 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-sm md:text-base tracking-wide text-rose-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                    Daya Baterai Sensor Kritis (0%)
                  </h3>
                  <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-semibold">
                    Perangkat sensor akan segera mati. Hubungkan ke pengisi daya atau ganti baterai untuk menjaga kelangsungan pemantauan kualitas udara.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
                <button
                  onClick={() => {
                    setNotification({
                      message: "Silakan sambungkan perangkat sensor ke port daya USB Type-C 5V.",
                      type: "warning",
                      visible: true
                    });
                  }}
                  className="flex-1 md:flex-none px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white active:scale-95 transition-all duration-200 font-bold text-xs shadow-md shadow-rose-500/20 cursor-pointer min-h-[44px] flex items-center justify-center gap-1.5"
                >
                  Cara Isi Daya
                </button>
                <button
                  onClick={() => setIsBatteryAlertDismissed(true)}
                  className="flex-1 md:flex-none px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 active:scale-95 transition-all duration-200 font-bold text-xs text-slate-300 hover:text-white cursor-pointer min-h-[44px] flex items-center justify-center"
                >
                  Abaikan
                </button>
              </div>
            </div>
          )}

          {/* ── Welcome Header ── */}
          <div className="flex items-center justify-between gap-4 sm:gap-6 animate-in slide-in-from-top-4 duration-500 relative z-20">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                Halo, <span className="text-primary">{firstName}</span> 👋
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 md:mt-1.5">
                <p className="text-xs sm:text-sm text-muted-foreground">{today}</p>
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
          </div>
        </div>

        {/* ── Sensor Cards ── */}
        <section className="animate-in slide-in-from-bottom-4 duration-500 delay-100 space-y-4">
          <h2 className="text-[11px] font-bold text-foreground/80 tracking-[0.08em] flex items-center gap-2">
            <span className="w-1.5 h-3 bg-primary rounded-full inline-block" />
            Kualitas Udara Real-time
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
        </section>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Left Sidebar — desktop only */}
          <aside className="lg:col-span-4 hidden lg:flex flex-col gap-6">
            <div className="sticky top-24 space-y-6">
              <h2 className="text-[11px] font-bold text-foreground/80 tracking-[0.08em] flex items-center gap-2">
                <span className="w-1.5 h-3 bg-primary rounded-full inline-block" />
                Pemeliharaan Filter
              </h2>
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
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                predictedRulHours={predictedRulHours}
                filterIntegrityPercent={filterIntegrityPercent}
              />
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-8 flex flex-col gap-10 lg:gap-12">
            {/* Controls */}
            <section className="order-2 lg:order-none space-y-6">
              <h2 className="text-[11px] font-bold text-foreground/80 tracking-[0.08em] flex items-center gap-2">
                <span className="w-1.5 h-3 bg-primary rounded-full inline-block" />
                Kontrol Perangkat
              </h2>
              <ControlsSection
                sensorData={sensorData}
                onFanSpeedChange={(speed) =>
                  console.log("Speed changed:", speed)
                }
              />
            </section>

            {/* Chart */}
            <section className="order-3 lg:order-none space-y-6">
              <h2 className="text-[11px] font-bold text-foreground/80 tracking-[0.08em] flex items-center gap-2">
                <span className="w-1.5 h-3 bg-primary rounded-full inline-block" />
                Grafik Sensor
              </h2>
              <ChartSection />
            </section>

            {/* Maintenance — mobile only */}
            <section className="order-1 lg:order-none lg:hidden space-y-6">
              <h2 className="text-[11px] font-bold text-foreground/80 tracking-[0.08em] flex items-center gap-2">
                <span className="w-1.5 h-3 bg-primary rounded-full inline-block" />
                Pemeliharaan Filter
              </h2>
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
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                predictedRulHours={predictedRulHours}
                filterIntegrityPercent={filterIntegrityPercent}
              />
            </section>
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
