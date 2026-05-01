"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle2,
  Wrench,
  Thermometer,
  Battery,
  RefreshCcw,
  Loader2,
  WifiOff,
  Brain,
  Sparkles,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FilterStatus, FilterProbabilities } from "@/lib/sensor-data";

interface MaintenanceWidgetProps {
  filterHealth?: number;
  daysRemaining?: number;
  onResetFilter?: () => void;
  isLoading?: boolean;
  currentPm25?: number;
  temperature?: number;
  batteryLevel?: number;
  mlStatus?: FilterStatus | null;
  probabilities?: FilterProbabilities | null;
  recommendation?: string | null;
  confidence?: number | null;
  isMLAvailable?: boolean;
  isPredicting?: boolean;
}

export function MaintenanceWidget({
  filterHealth = 100,
  daysRemaining = 180,
  onResetFilter,
  isLoading = false,
  currentPm25 = 0,
  temperature = 28,
  batteryLevel = 100,
  mlStatus = null,
  probabilities = null,
  recommendation = null,
  confidence = null,
  isMLAvailable = false,
  isPredicting = false,
}: MaintenanceWidgetProps) {
  const filterStatus = useMemo(() => {
    if (filterHealth > 70) {
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        label: "Filter Optimal",
        sublabel: "Berfungsi dengan baik",
        styles: {
          icon: "text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40",
          text: "text-emerald-700 dark:text-emerald-300",
          bar: "bg-gradient-to-r from-emerald-500 to-emerald-600",
        },
      };
    } else if (filterHealth > 30) {
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        label: "Perlu Perhatian",
        sublabel: "Efisiensi menurun",
        styles: {
          icon: "text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/40",
          text: "text-orange-700 dark:text-orange-300",
          bar: "bg-gradient-to-r from-orange-500 to-orange-600",
        },
      };
    } else {
      return {
        icon: <Wrench className="w-4 h-4" />,
        label: "Ganti Segera",
        sublabel: "Filter sudah tidak efektif",
        styles: {
          icon: "text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40",
          text: "text-red-700 dark:text-red-300",
          bar: "bg-gradient-to-r from-red-500 to-red-600",
        },
      };
    }
  }, [filterHealth]);

  const batteryConfig = useMemo(() => {
    if (batteryLevel > 60)
      return {
        icon: <BatteryFull className="w-4 h-4" />,
        color: "text-emerald-700 dark:text-emerald-300",
        bg: "bg-emerald-100 dark:bg-emerald-900/40",
      };
    if (batteryLevel > 20)
      return {
        icon: <BatteryMedium className="w-4 h-4" />,
        color: "text-orange-700 dark:text-orange-300",
        bg: "bg-orange-100 dark:bg-orange-900/40",
      };
    return {
      icon: <BatteryLow className="w-4 h-4" />,
      color: "text-red-700 dark:text-red-300",
      bg: "bg-red-100 dark:bg-red-900/40",
    };
  }, [batteryLevel]);

  const mlStatusConfig = useMemo(() => {
    if (!mlStatus) return null;
    switch (mlStatus) {
      case "Aman":
        return {
          label: "Aman",
          styles:
            "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
          text: "text-emerald-700 dark:text-emerald-300",
        };
      case "Perhatian":
        return {
          label: "Perhatian",
          styles:
            "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
          text: "text-orange-700 dark:text-orange-300",
        };
      case "Ganti Filter":
        return {
          label: "Ganti Filter",
          styles:
            "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
          text: "text-red-700 dark:text-red-300",
        };
    }
  }, [mlStatus]);

  const probabilityBars = useMemo(() => {
    if (!probabilities) return null;
    return [
      {
        label: "Aman",
        value: probabilities.aman,
        bar: "bg-emerald-600 dark:bg-emerald-400",
        text: "text-emerald-700 dark:text-emerald-300",
      },
      {
        label: "Perhatian",
        value: probabilities.perhatian,
        bar: "bg-orange-600 dark:bg-orange-400",
        text: "text-orange-700 dark:text-orange-300",
      },
      {
        label: "Ganti Filter",
        value: probabilities.gantiFilter,
        bar: "bg-red-600 dark:bg-red-400",
        text: "text-red-700 dark:text-red-300",
      },
    ];
  }, [probabilities]);

  return (
    <Card className="overflow-hidden border border-border shadow-sm bg-card">
      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl", filterStatus.styles.icon)}>
              {filterStatus.icon}
            </div>
            <div>
              <p
                className={cn(
                  "text-sm font-semibold leading-tight",
                  filterStatus.styles.text,
                )}
              >
                {filterStatus.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {filterStatus.sublabel}
              </p>
            </div>
          </div>

          {/* ML badge */}
          {isMLAvailable && mlStatus && mlStatusConfig ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0",
                mlStatusConfig.styles,
              )}
            >
              <Brain className="w-3 h-3" />
              {mlStatusConfig.label}
            </span>
          ) : !isMLAvailable ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground shrink-0">
              <WifiOff className="w-3 h-3" />
              ML Offline
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Filter Integrity ── */}
      <div className="px-5 pb-4 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium text-muted-foreground">
            Filter Integrity
          </span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              filterStatus.styles.text,
            )}
          >
            {filterHealth}%
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-700 ease-out",
              filterStatus.styles.bar,
            )}
            style={{ width: `${filterHealth}%` }}
          />
        </div>
        <div className="flex justify-between items-center pt-0.5">
          <span className="text-[11px] text-muted-foreground">
            Estimasi sisa:{" "}
            <span className="font-semibold text-foreground">
              {daysRemaining} hari
            </span>
          </span>
          {onResetFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilter}
              disabled={isLoading}
              className="h-7 text-xs px-3 gap-1.5 rounded-lg"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCcw className="w-3 h-3" />
              )}
              Reset
            </Button>
          )}
        </div>
      </div>

      <div className="h-px bg-border mx-5" />

      {/* ── ML Prediction ── */}
      <div className="px-5 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Prediksi ML
            </span>
          </div>
          {isMLAvailable && confidence !== null && (
            <span className="text-[11px] text-muted-foreground">
              Akurasi{" "}
              <span className="font-semibold text-foreground">
                {(confidence * 100).toFixed(0)}%
              </span>
            </span>
          )}
        </div>

        {/* ML offline */}
        {!isMLAvailable && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/60 border border-border">
            <WifiOff className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs font-semibold text-foreground">
                ML Service Offline
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Menggunakan analisis berbasis aturan
              </p>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {isMLAvailable && isPredicting && (
          <div className="space-y-2.5 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <div className="h-3 bg-muted rounded w-16" />
                  <div className="h-3 bg-muted rounded w-8" />
                </div>
                <div className="h-1.5 bg-muted rounded-full w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Probability bars */}
        {isMLAvailable && !isPredicting && probabilityBars && (
          <div className="space-y-2.5">
            {probabilityBars.map((bar) => (
              <div key={bar.label} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className={cn("text-xs font-medium", bar.text)}>
                    {bar.label}
                  </span>
                  <span
                    className={cn("text-xs font-bold tabular-nums", bar.text)}
                  >
                    {(bar.value * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      bar.bar,
                    )}
                    style={{ width: `${(bar.value * 100).toFixed(0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommendation */}
        {isMLAvailable && !isPredicting && recommendation && (
          <div className="flex gap-2.5 p-3 rounded-xl bg-muted/60 border border-border">
            <Sparkles className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {recommendation}
            </p>
          </div>
        )}
      </div>

      <div className="h-px bg-border mx-5" />

      {/* ── Stats ── */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
          <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shrink-0">
            <Thermometer className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium">
              Suhu
            </p>
            <p className="text-sm font-bold text-foreground leading-tight">
              {Number(temperature).toFixed(1)}°C
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
          <div
            className={cn(
              "p-1.5 rounded-lg shrink-0",
              batteryConfig.bg,
              batteryConfig.color,
            )}
          >
            {batteryConfig.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground font-medium">
              Baterai
            </p>
            <p
              className={cn(
                "text-sm font-bold leading-tight",
                batteryConfig.color,
              )}
            >
              {batteryLevel}%
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
