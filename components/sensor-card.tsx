import { Card } from "@/components/ui/card";
import { getStatusColor, getStatusLabel } from "@/lib/sensor-data";

interface SensorCardProps {
  label: string;
  value: number;
  unit: string;
  type: "PM2_5" | "PM10" | "CO" | "VOC";
  icon: React.ReactNode;
  className?: string;
}

export function SensorCard({
  label,
  value,
  unit,
  type,
  icon,
  className,
}: SensorCardProps) {
  const statusColor = getStatusColor(value, type);
  const statusLabel = getStatusLabel(value, type);

  return (
    <Card
      className={`p-4 sm:p-6 bg-card shadow-sm hover:shadow-md transition-all ${
        className ?? ""
      }`}
    >
      <div className="flex items-start justify-between mb-2 sm:mb-4">
        <div className="text-muted-foreground font-medium text-sm sm:text-base">
          {label}
        </div>
        <div className="text-lg sm:text-2xl text-muted-foreground opacity-60">
          {icon}
        </div>
      </div>
      <div className="mb-2 sm:mb-3">
        <div className="text-2xl sm:text-4xl font-bold text-foreground tracking-tight">
          {value.toFixed(1)}
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 font-medium">
          {unit}
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div
          className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shadow-sm ${statusColor}`}
        />
        <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {statusLabel}
        </span>
      </div>
    </Card>
  );
}
