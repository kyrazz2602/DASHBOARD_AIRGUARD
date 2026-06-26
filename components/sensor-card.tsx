import { Card } from "@/components/ui/card";
import { getStatusLabel } from "@/lib/sensor-data";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, AlertTriangle, AlertCircle } from "lucide-react";

interface SensorCardProps {
  label: string;
  value: number;
  unit: string;
  type: "PM2_5" | "PM10" | "CO" | "VOC";
  icon: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

const STATUS_STYLES = {
  Safe: {
    icon: <Check className="w-3 h-3 stroke-[3px]" />,
    dot: "text-emerald-500 dark:text-emerald-400",
    text: "text-emerald-700 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
    glow: "hover:shadow-emerald-500/15 hover:border-emerald-400/50",
    iconBg: "group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30",
    iconColor: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
  },
  Normal: {
    icon: <Check className="w-3 h-3 stroke-[3px]" />,
    dot: "text-emerald-500 dark:text-emerald-400",
    text: "text-emerald-700 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
    glow: "hover:shadow-emerald-500/15 hover:border-emerald-400/50",
    iconBg: "group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30",
    iconColor: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
  },
  N: {
    icon: <Check className="w-3 h-3 stroke-[3px]" />,
    dot: "text-emerald-500 dark:text-emerald-400",
    text: "text-emerald-700 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
    glow: "hover:shadow-emerald-500/15 hover:border-emerald-400/50",
    iconBg: "group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30",
    iconColor: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
  },
  Warning: {
    icon: <AlertTriangle className="w-3 h-3 stroke-[3px]" />,
    dot: "text-amber-500 dark:text-amber-400",
    text: "text-amber-700 dark:text-amber-300",
    value: "text-amber-700 dark:text-amber-300",
    glow: "hover:shadow-amber-500/15 hover:border-amber-400/50",
    iconBg: "group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30",
    iconColor: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
  },
  Danger: {
    icon: <AlertCircle className="w-3 h-3 stroke-[3px]" />,
    dot: "text-red-500 dark:text-red-400",
    text: "text-red-700 dark:text-red-300",
    value: "text-red-700 dark:text-red-300",
    glow: "hover:shadow-red-500/15 hover:border-red-400/50",
    iconBg: "group-hover:bg-red-100 dark:group-hover:bg-red-900/30",
    iconColor: "group-hover:text-red-600 dark:group-hover:text-red-400",
  },
};

const STATUS_ID: Record<string, string> = {
  Safe: "Aman",
  Warning: "Perhatian",
  Danger: "Bahaya",
  Normal: "Aman",
  N: "Aman",
};

export function SensorCard({
  label,
  value,
  unit,
  type,
  icon,
  className,
  isLoading = false,
}: SensorCardProps) {
  const statusLabel = getStatusLabel(value, type) as keyof typeof STATUS_STYLES;
  const styles = STATUS_STYLES[statusLabel] ?? STATUS_STYLES.Safe;

  if (isLoading) {
    return (
      <Card className={cn("p-5 sm:p-6 bg-card border border-border/60 space-y-3", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-7 w-7 rounded-lg" />
        </div>
        <div className="flex items-baseline gap-1">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-8" />
        </div>
        <div className="flex items-center gap-1.5 pt-0.5">
          <Skeleton className="h-1.5 w-1.5 rounded-full" />
          <Skeleton className="h-3.5 w-10" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group relative overflow-hidden p-5 sm:p-6 bg-card border border-border cursor-default select-none",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-lg",
        styles.glow,
        className,
      )}
    >
      {/* Shimmer sweep */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-black/[0.05] to-transparent dark:via-white/[0.07]" />

      {/* Top row: label + icon */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider transition-colors duration-300 group-hover:text-foreground">
          {label}
        </span>
        <div
          className={cn(
            "p-1.5 rounded-lg transition-all duration-300 text-muted-foreground/60",
            styles.iconBg,
            styles.iconColor,
            "group-hover:scale-110",
          )}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <div className="mb-3 flex items-baseline flex-wrap gap-0.5 transition-transform duration-300 group-hover:scale-[1.02] origin-left">
        <span
          className={cn(
            "text-[28px] font-bold tabular-nums leading-none",
            styles.value,
          )}
        >
          {value.toFixed(1)}
        </span>
        <span className="text-[13px] text-muted-foreground opacity-70 ml-1 font-semibold select-none shrink-0 w-fit">
          {unit}
        </span>
      </div>

      {/* Status dot + label */}
      <div className="flex items-center gap-1.5">
        <span className={cn("shrink-0 transition-transform duration-300 group-hover:scale-110", styles.dot)}>
          {styles.icon}
        </span>
        <span
          className={cn(
            "text-[11px] font-semibold transition-colors duration-300",
            styles.text,
          )}
        >
          {STATUS_ID[statusLabel] ?? statusLabel}
        </span>
      </div>
    </Card>
  );
}
