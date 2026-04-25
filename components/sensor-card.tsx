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
  },
  Warning: {
    dot: "bg-amber-600 dark:bg-amber-400",
    text: "text-amber-700 dark:text-amber-300",
    value: "text-amber-700 dark:text-amber-300",
  },
  Danger: {
    dot: "bg-red-600 dark:bg-red-400",
    text: "text-red-700 dark:text-red-300",
    value: "text-red-700 dark:text-red-300",
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
        "relative overflow-hidden p-4 sm:p-5 bg-card border border-border",
        "hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5",
        className,
      )}
    >
      {/* Label + icon */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        <div className="text-muted-foreground/70">{icon}</div>
      </div>

      {/* Value */}
      <div className="mb-3">
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

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", styles.dot)} />
        <span className={cn("text-[11px] font-semibold", styles.text)}>
          {STATUS_ID[statusLabel] ?? statusLabel}
        </span>
      </div>
    </Card>
  );
}
