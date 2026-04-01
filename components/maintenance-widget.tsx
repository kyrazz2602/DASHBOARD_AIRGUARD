"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle2,
  Wrench,
  Activity,
  Thermometer,
  Battery,
  RefreshCcw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MaintenanceWidgetProps {
  filterHealth?: number; // 0 - 100
  daysRemaining?: number;
  onResetFilter?: () => void;
  isLoading?: boolean;
  currentPm25?: number; // Untuk menghitung beban kerja
  temperature?: number; // Celcius
  batteryLevel?: number; // 0 - 100
}

export function MaintenanceWidget({
  filterHealth = 100,
  daysRemaining = 180,
  onResetFilter,
  isLoading = false,
  currentPm25 = 0,
  temperature = 28,
  batteryLevel = 100,
}: MaintenanceWidgetProps) {
  // 1. Status Config (Memoized)
  const status = useMemo(() => {
    if (filterHealth > 70) {
      return {
        theme: "emerald",
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />,
        title: "System Healthy",
        message: "Filter is optimal",
        styles: {
          bg: "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-800/50",
          text: "text-emerald-700 dark:text-emerald-300",
          bar: "bg-emerald-500 dark:bg-emerald-600",
        },
      };
    } else if (filterHealth > 30) {
      return {
        theme: "orange",
        icon: <AlertCircle className="w-5 h-5 text-orange-500 dark:text-orange-400" />,
        title: "Maintenance Soon",
        message: "Efficiency dropping",
        styles: {
          bg: "bg-orange-50/50 dark:bg-orange-950/30 border-orange-100 dark:border-orange-800/50",
          text: "text-orange-700 dark:text-orange-300",
          bar: "bg-orange-500 dark:bg-orange-600",
        },
      };
    } else {
      return {
        theme: "red",
        icon: <Wrench className="w-5 h-5 text-red-500 dark:text-red-400" />,
        title: "Action Required",
        message: "Replace filter now",
        styles: {
          bg: "bg-red-50/50 dark:bg-red-950/30 border-red-100 dark:border-red-800/50",
          text: "text-red-700 dark:text-red-300",
          bar: "bg-red-500 dark:bg-red-600",
        },
      };
    }
  }, [filterHealth]);

  // 3. Load Status (Memoized)
  const loadStatus = useMemo(() => {
    if (currentPm25 > 50)
      return { text: "Danger", color: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30" };
    if (currentPm25 > 20)
      return { text: "Moderate", color: "text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30" };
    return { text: "Normal", color: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30" };
  }, [currentPm25]);

  // 4. Battery Status (Memoized - Baru)
  const batteryStatus = useMemo(() => {
    if (batteryLevel > 50)
      return { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/30" };
    if (batteryLevel > 20)
      return { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" };
    return { color: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" };
  }, [batteryLevel]);

  return (
    <Card
      className={cn(
        "p-5 border shadow-sm transition-all duration-300 hover:shadow-md",
        status.styles.bg
      )}>
      {/* --- Bagian Atas: Filter Status --- */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-3">
          <div className="p-2 bg-white dark:bg-card rounded-full shadow-sm ring-1 ring-inset ring-black/5 dark:ring-white/10">
            {status.icon}
          </div>
          <div>
            <h3 className={cn("font-bold text-sm", status.styles.text)}>
              {status.title}
            </h3>
            <p className="text-xs text-muted-foreground dark:text-muted-foreground/80">{status.message}</p>
          </div>
        </div>

        {/* Load Badge */}
        <div
          className={cn(
            "px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border border-black/5 dark:border-white/10",
            loadStatus.color
          )}>
          <Activity className="w-3 h-3" />
          {loadStatus.text}
        </div>
      </div>

      <div className="space-y-1.5 mb-5">
        <div className="flex justify-between text-xs font-medium">
          <span className="text-muted-foreground dark:text-muted-foreground/80">Filter Integrity</span>
          <span className={status.styles.text}>{filterHealth}%</span>
        </div>

        <div className="h-2.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-700 ease-out rounded-full",
              status.styles.bar
            )}
            style={{ width: `${filterHealth}%` }}
          />
        </div>

        <div className="flex justify-between items-center pt-1">
          <p className="text-[10px] text-muted-foreground dark:text-muted-foreground/70 font-medium pt-1">
            Est. lifespan: {daysRemaining} days
          </p>
          {onResetFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilter}
              disabled={isLoading}
              className="h-6 text-[10px] px-2 gap-1"
            >
              {isLoading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCcw className="w-3 h-3" />
              )}
              Reset Filter
            </Button>
          )}
        </div>
      </div>

      {/* --- Bagian Bawah: Sensor Stats (Baru) --- */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-black/5 dark:border-white/10">
        {/* Suhu */}
        <div className="flex items-center gap-3 bg-white/50 dark:bg-card/50 p-2 rounded-lg border border-black/5 dark:border-white/10">
          <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
            <Thermometer className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground dark:text-muted-foreground/80 font-medium">
              Temp
            </p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{temperature}°C</p>
          </div>
        </div>

        {/* Baterai */}
        <div className="flex items-center gap-3 bg-white/50 dark:bg-card/50 p-2 rounded-lg border border-black/5 dark:border-white/10">
          <div
            className={cn(
              "p-1.5 rounded-md transition-colors",
              batteryStatus.bg,
              batteryStatus.color
            )}>
            <Battery className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground dark:text-muted-foreground/80 font-medium">
              Battery
            </p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{batteryLevel}%</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
