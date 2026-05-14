import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu } from "lucide-react";

interface DeviceProps {
  name: string;
  status: "Aktif" | "Nonaktif" | "Maintenance";
  deviceId: string;
}

export function DevicePanel({ name, status, deviceId }: DeviceProps) {
  const statusStyles = {
    Aktif:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-700/40",
    Nonaktif:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/40",
    Maintenance:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700/40",
  };

  return (
    <Card className="p-4 bg-card border border-border/60 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="relative shrink-0">
          <div className="w-12 h-12 bg-gradient-to-br from-slate-400 to-slate-600 rounded-xl flex items-center justify-center shadow-sm">
            <Cpu className="text-white/60 w-5 h-5" />
          </div>
          {status === "Aktif" && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm text-foreground leading-tight">
              {name}
            </h3>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 font-medium ${statusStyles[status]}`}
            >
              {status}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
            ID: {deviceId}
          </p>
        </div>
      </div>
    </Card>
  );
}
