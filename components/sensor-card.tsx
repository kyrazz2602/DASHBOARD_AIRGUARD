import { Card } from "@/components/ui/card";
import { getStatusLabel } from "@/lib/sensor-data";
import { cn } from "@/lib/utils";

interface SensorCardProps {
  label: string;
  value: number;
  unit: string;
  type: "PM2_5" | "PM10" | "CO" | "VOC";
  icon: React.ReactNode;
  className?: string;
}

const STATUS_STYLES = {
  Safe: {
    dot: "bg-emerald-600 dark:bg-emerald-400",
    text: "text-emerald-700 dark:text-emerald-300",
    value: "text-emerald-700 dark:text-emerald-300",
    glow: "hover:shadow-emerald-500/20 hover:border-emerald-400/60",
    iconBg: "group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30",
    iconColor: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
  },
  Warning: {
    dot: "bg-amber-600 dark:bg-amber-400",
    text: "text-amber-700 dark:text-amber-300",
    value: "text-amber-700 dark:text-amber-300",
    glow: "hover:shadow-amber-500/20 hover:border-amber-400/60",
    iconBg: "group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30",
    iconColor: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
  },
  Danger: {
    dot: "bg-red-600 dark:bg-red-400",
    text: "text-red-700 dark:text-red-300",
    value: "text-red-700 dark:text-red-300",
    glow: "hover:shadow-red-500/20 hover:border-red-400/60",
    iconBg: "group-hover:bg-red-100 dark:group-hover:bg-red-900/30",
    iconColor: "group-hover:text-red-600 dark:group-hover:text-red-400",
  },
};

const STATUS_ID: Record<string, string> = {
  Safe: "Aman",
  Warning: "Perhatian",
  Danger: "Bahaya",
};

export function SensorCard({
  label,
  value,
  unit,
  type,
  icon,
  className,
}: SensorCardProps) {
  const statusLabel = getStatusLabel(value, type) as keyof typeof STATUS_STYLES;
  const styles = STATUS_STYLES[statusLabel] ?? STATUS_STYLES.Safe;

  return (
    <Card
      className={cn(
        // Base
        "group relative overflow-hidden p-4 sm:p-5 bg-card border border-border cursor-default select-none",
        // Transition — semua properti sekaligus
        "transition-all duration-300 ease-out",
        // Hover: angkat + shadow berwarna sesuai status
        "hover:-translate-y-1.5 hover:shadow-xl",
        styles.glow,
        className,
      )}
    >
      {/* Shimmer sweep on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-black/[0.06] to-transparent dark:via-white/10" />

      {/* Top row: label + icon */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider transition-colors duration-300 group-hover:text-foreground">
          {label}
        </span>
        {/* Icon container — scale + color on hover */}
        <div
          className={cn(
            "p-1.5 rounded-lg transition-all duration-300",
            "text-muted-foreground/60",
            styles.iconBg,
            styles.iconColor,
            "group-hover:scale-110",
          )}
        >
          {icon}
        </div>
      </div>

      {/* Value — scale up slightly on hover */}
      <div className="mb-3 transition-transform duration-300 group-hover:scale-[1.03] origin-left">
        <span
          className={cn(
            "text-2xl sm:text-3xl font-bold tabular-nums leading-none",
            styles.value,
          )}
        >
          {value.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground ml-1.5 font-medium">
          {unit}
        </span>
      </div>

      {/* Status dot + label */}
      <div className="flex items-center gap-1.5">
        {/* Dot pulses on hover */}
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300",
            "group-hover:scale-125 group-hover:shadow-sm",
            styles.dot,
          )}
        />
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
