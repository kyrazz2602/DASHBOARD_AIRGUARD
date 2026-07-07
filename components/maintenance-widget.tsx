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
  // Icons added for premium UI/UX:
  AlertOctagon,
  AlertTriangle,
  Calendar,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { FilterStatus, FilterProbabilities } from "@/lib/sensor-data";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  error?: string | null;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  predictedRulHours?: number | null;
  filterIntegrityPercent?: number | null;
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
  error = null,
  selectedModel = "decision_tree",
  onModelChange,
  predictedRulHours = null,
  filterIntegrityPercent = null,
}: MaintenanceWidgetProps) {
  const filterStatus = useMemo(() => {
    if (filterHealth > 70) {
      return {
        icon: <CheckCircle2 className="w-4 h-4" />,
        label: "Filter Optimal",
        sublabel: "Berfungsi dengan baik",
        styles: {
          icon: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-500/20 shadow-sm shadow-emerald-500/5",
          text: "text-emerald-600 dark:text-emerald-400",
          bar: "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
          accentBar: "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400",
        },
      };
    } else if (filterHealth > 30) {
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        label: "Perhatian",
        sublabel: "Efisiensi menurun",
        styles: {
          icon: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-500/20 shadow-sm shadow-amber-500/5",
          text: "text-amber-600 dark:text-amber-400",
          bar: "bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
          accentBar: "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-400",
        },
      };
    } else {
      return {
        icon: <Wrench className="w-4 h-4 animate-bounce" />,
        label: "Ganti Segera",
        sublabel: "Filter sudah tidak efektif",
        styles: {
          icon: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-500/20 shadow-sm shadow-rose-500/5",
          text: "text-rose-600 dark:text-rose-400",
          bar: "bg-gradient-to-r from-red-500 to-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.3)]",
          accentBar: "bg-gradient-to-r from-red-600 via-rose-600 to-red-500",
        },
      };
    }
  }, [filterHealth]);

  const batteryConfig = useMemo(() => {
    if (batteryLevel > 50)
      return {
        icon: <BatteryFull className="w-4 h-4" />,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-500/10",
        critical: false,
      };
    if (batteryLevel > 10)
      return {
        icon: <BatteryMedium className="w-4 h-4" />,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-500/10",
        critical: false,
      };
    return {
      icon: <BatteryLow className="w-4 h-4 animate-bounce" />,
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-500/10",
      critical: true,
    };
  }, [batteryLevel]);

  const mlStatusConfig = useMemo(() => {
    if (!mlStatus) return null;
    switch (mlStatus) {
      case "Aman":
        return {
          label: "Aman",
          styles:
            "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
          text: "text-emerald-600 dark:text-emerald-400",
        };
      case "Perhatian":
        return {
          label: "Perhatian",
          styles:
            "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]",
          text: "text-amber-600 dark:text-amber-400",
        };
      case "Bahaya":
        return {
          label: "Ganti Filter",
          styles:
            "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]",
          text: "text-rose-600 dark:text-rose-400",
        };
    }
  }, [mlStatus]);

  const probabilityBars = useMemo(() => {
    if (!probabilities) return null;
    return [
      {
        label: "Aman",
        value: probabilities.aman,
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />,
        bar: "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
        text: "text-emerald-600 dark:text-emerald-400",
        activeBg: "bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20",
      },
      {
        label: "Perhatian",
        value: probabilities.perhatian,
        icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
        bar: "bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
        text: "text-amber-600 dark:text-amber-400",
        activeBg: "bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/20",
      },
      {
        label: "Ganti Filter",
        value: probabilities.bahaya,
        icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-500 shrink-0" />,
        bar: "bg-gradient-to-r from-red-500 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]",
        text: "text-rose-600 dark:text-rose-400",
        activeBg: "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20",
      },
    ];
  }, [probabilities]);

  const dominantLabel = useMemo(() => {
    if (!probabilities) return null;
    const maxVal = Math.max(probabilities.aman, probabilities.perhatian, probabilities.bahaya);
    if (maxVal === probabilities.aman) return "Aman";
    if (maxVal === probabilities.perhatian) return "Perhatian";
    return "Ganti Filter";
  }, [probabilities]);

  return (
    <div className="space-y-6">
      {/* ── Card 1: Kesehatan & Status Filter ── */}
      <Card className="overflow-hidden border border-white/5 dark:border-white/10 shadow-2xl bg-gradient-to-b from-card/85 via-card/90 to-card/95 backdrop-blur-md relative hover:shadow-[0_0_30px_rgba(59,130,246,0.06)] transition-all duration-300 p-5 sm:p-6 gap-5">
        {/* Top dynamic accent bar */}
        <div className={cn("h-1 w-full absolute top-0 left-0 transition-all duration-500", filterStatus.styles.accentBar)} />

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-xl transition-all duration-500", filterStatus.styles.icon)}>
            {filterStatus.icon}
          </div>
          <div>
            <p
              className={cn(
                "text-sm font-bold leading-tight transition-colors duration-500",
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

        {/* Filter Integrity / Kesehatan */}
        <div className="space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-muted-foreground">
              Kesehatan & Integritas Filter
            </span>
            <span
              className={cn(
                "text-sm font-extrabold tabular-nums transition-colors duration-500",
                filterStatus.styles.text,
              )}
            >
              {filterHealth}%
            </span>
          </div>
          <div className="h-2 w-full bg-slate-200 dark:bg-slate-800/80 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                filterStatus.styles.bar,
              )}
              style={{ width: `${filterHealth}%` }}
            />
          </div>
          <div className="flex justify-between items-center pt-0.5">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Estimasi sisa:</span>
              <span className="font-bold text-foreground ml-0.5">
                {daysRemaining} hari
              </span>
            </span>
            {onResetFilter && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResetFilter}
                disabled={isLoading}
                className="h-auto min-h-[44px] sm:min-h-0 sm:h-7 py-2.5 sm:py-0 text-xs px-3 gap-1.5 rounded-lg flex items-center justify-center border-border/80 hover:bg-accent hover:text-accent-foreground dark:border-white/10 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer font-semibold"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="w-3.5 h-3.5" />
                )}
                Reset
              </Button>
            )}
          </div>
        </div>

        <div className="h-px bg-border/60 dark:bg-white/5 -mx-5 sm:-mx-6" />

        {/* Stats */}
        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
          {/* Temperature Card */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 dark:bg-slate-900/40 border border-border/80 dark:border-white/5 hover:scale-[1.02] hover:shadow-md transition-all duration-300">
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/15 shrink-0 animate-pulse">
              <Thermometer className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-bold leading-tight">
                Suhu
              </p>
              <p className="text-sm font-extrabold text-foreground leading-tight mt-0.5">
                {Number(temperature).toFixed(1)}°C
              </p>
            </div>
          </div>

          {/* Battery Card */}
          <div
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl bg-muted/30 dark:bg-slate-900/40 border border-border/80 dark:border-white/5 hover:scale-[1.02] hover:shadow-md transition-all duration-300",
              batteryConfig.critical && "ring-2 ring-rose-500/30 dark:ring-rose-500/20 bg-rose-500/5 dark:bg-rose-950/10"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-lg shrink-0 border transition-all duration-300",
                batteryConfig.bg,
                batteryConfig.color,
              )}
            >
              {batteryConfig.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground font-bold leading-tight">
                Baterai
              </p>
              <p
                className={cn(
                  "text-sm font-extrabold leading-tight mt-0.5",
                  batteryConfig.color,
                )}
              >
                {batteryLevel}%
              </p>
              {batteryConfig.critical && (
                <p className="text-[8px] font-extrabold text-rose-500 dark:text-rose-400 tracking-wider uppercase animate-pulse mt-0.5">
                  Segera Cas
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Card 2: Analisis & Prediksi AI/ML ── */}
      <Card className="overflow-hidden border border-white/5 dark:border-white/10 shadow-2xl bg-gradient-to-b from-card/85 via-card/90 to-card/95 backdrop-blur-md relative hover:shadow-[0_0_30px_rgba(59,130,246,0.06)] transition-all duration-300 p-5 sm:p-6 gap-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Brain className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-pulse" />
            <span className="text-[11px] font-bold text-foreground tracking-[0.08em]">
              Analisis & Prediksi AI
            </span>
          </div>

          {/* ML badge */}
          {isMLAvailable && mlStatus && mlStatusConfig ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shrink-0 border transition-all duration-500 cursor-help",
                    mlStatusConfig.styles,
                  )}
                >
                  Prediksi: {mlStatusConfig.label}
                  <HelpCircle className="w-3 h-3 ml-0.5 opacity-70" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                Status filter yang diprediksi oleh kecerdasan buatan (Machine Learning) menggunakan algoritma {selectedModel === "decision_tree" ? "Decision Tree (Pohon Keputusan)" : "Random Forest (Hutan Acak)"}.
              </TooltipContent>
            </Tooltip>
          ) : !isMLAvailable ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-muted border border-border/40 text-muted-foreground shrink-0 shadow-sm">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" />
              ML Offline
            </span>
          ) : null}
        </div>

        {/* Content body */}
        <div className="space-y-4">
          {onModelChange && (
            <div className="flex justify-between items-center gap-2 bg-muted/30 dark:bg-slate-900/40 p-2 rounded-xl border border-border/80 dark:border-white/5">
              <span className="text-xs font-semibold text-muted-foreground">Model AI</span>
              <div className="flex bg-muted/60 dark:bg-slate-950 p-0.5 rounded-lg border border-border/40 dark:border-white/5 relative">
                <button
                  type="button"
                  onClick={() => onModelChange("decision_tree")}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-200 cursor-pointer",
                    selectedModel === "decision_tree"
                      ? "bg-background text-foreground shadow-sm shadow-black/10 dark:bg-slate-800"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Decision Tree
                </button>
                <button
                  type="button"
                  onClick={() => onModelChange("random_forest")}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-200 cursor-pointer",
                    selectedModel === "random_forest"
                      ? "bg-background text-foreground shadow-sm shadow-black/10 dark:bg-slate-800"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Random Forest
                </button>
              </div>
            </div>
          )}



          {/* Error notification */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-bold leading-none">
                  Peringatan Sistem
                </p>
                <p className="text-[10px] opacity-90 leading-normal font-medium">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* ML offline info */}
          {!isMLAvailable && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-muted/40 dark:bg-slate-950/40 border border-border/60 dark:border-white/5 shadow-inner">
              <WifiOff className="w-4 h-4 text-muted-foreground shrink-0 animate-pulse" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  Sistem AI Offline
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight font-medium">
                  Menggunakan aturan cadangan sistem
                </p>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {isMLAvailable && isPredicting && (
            <div className="space-y-3.5 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-1.5 p-2 border border-transparent">
                  <div className="flex justify-between">
                    <div className="h-3 bg-muted rounded w-20" />
                    <div className="h-3 bg-muted rounded w-10" />
                  </div>
                  <div className="h-1.5 bg-muted rounded-full w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Probability bars */}
          {isMLAvailable && !isPredicting && probabilityBars && (
            <div className="space-y-2">
              {probabilityBars.map((bar) => {
                const isDominant = dominantLabel === bar.label && bar.value > 0;
                return (
                  <div
                    key={bar.label}
                    className={cn(
                      "p-2.5 rounded-xl transition-all duration-300 border border-transparent space-y-1.5",
                      isDominant && bar.activeBg
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        {bar.icon}
                        <span className={cn("text-xs font-bold", bar.text)}>
                          {bar.label}
                        </span>
                        {isDominant && (
                          <span className="text-[9px] uppercase font-extrabold bg-foreground/10 text-foreground dark:bg-white/10 px-1.5 py-0.5 rounded tracking-wide">
                            Aktif
                          </span>
                        )}
                      </div>
                      <span
                        className={cn("text-xs font-extrabold tabular-nums", bar.text)}
                      >
                        {(bar.value * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800/80 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-1000 ease-out",
                          bar.bar
                        )}
                        style={{ width: `${(bar.value * 100).toFixed(0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recommendation insights box */}
          {isMLAvailable && !isPredicting && recommendation && (
            <div className="flex flex-col gap-1.5 p-3.5 rounded-xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent border border-indigo-500/10 dark:border-indigo-500/20 border-l-4 border-l-indigo-500 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Rekomendasi AI</span>
              </div>
              <p className="text-[11px] text-muted-foreground dark:text-slate-300 leading-relaxed font-medium">
                {recommendation}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
