"use client";

import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Wind,
  Zap,
  Lock,
  Wifi,
  WifiOff,
  Loader2,
  Map,
  Radio,
} from "lucide-react";
import { RemoteControlModal } from "./remote-control-modal";
import {
  detectRecommendedFanSpeed,
  FanSpeed,
  SensorReading,
} from "@/lib/sensor-data";
import { useFanControl } from "@/hooks/use-fan-control";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ControlsSectionProps {
  onFanSpeedChange?: (speed: FanSpeed) => void;
  sensorData: SensorReading;
}

const SPEED_CONFIG: Record<
  FanSpeed,
  { label: string; desc: string; color: string; active: string }
> = {
  off: {
    label: "Off",
    desc: "Mati",
    color:
      "border-border text-muted-foreground hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
    active: "border-slate-500 bg-slate-500 text-white shadow-md",
  },
  low: {
    label: "Low",
    desc: "Rendah",
    color:
      "border-border text-muted-foreground hover:border-blue-400 hover:text-blue-700 dark:hover:text-blue-300",
    active:
      "border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-500/25",
  },
  normal: {
    label: "Normal",
    desc: "Sedang",
    color:
      "border-border text-muted-foreground hover:border-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300",
    active:
      "border-cyan-500 bg-cyan-500 text-white shadow-md shadow-cyan-500/25",
  },
  high: {
    label: "High",
    desc: "Tinggi",
    color:
      "border-border text-muted-foreground hover:border-red-400 hover:text-red-700 dark:hover:text-red-300",
    active: "border-red-500 bg-red-500 text-white shadow-md shadow-red-500/25",
  },
};

export function ControlsSection({
  onFanSpeedChange,
  sensorData,
}: ControlsSectionProps) {
  const [isRemoteOpen, setIsRemoteOpen] = useState(false);
  const recommendedSpeed = detectRecommendedFanSpeed(sensorData);

  const {
    fanSpeed,
    isAutoMode,
    isSyncing,
    isFirebaseConnected,
    setManualSpeed,
    setAutoMode,
  } = useFanControl(recommendedSpeed);

  const handleAutoModeChange = async (checked: boolean) => {
    await setAutoMode(checked);
  };

  const handleManualChange = async (speed: FanSpeed) => {
    if (isAutoMode) return;
    await setManualSpeed(speed);
    onFanSpeedChange?.(speed);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group text-left">
            <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <Map className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Map Planning
              </p>
              <p className="text-[11px] text-muted-foreground">
                Lihat peta area
              </p>
            </div>
          </button>

          <button
            onClick={() => setIsRemoteOpen(true)}
            className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group text-left"
          >
            <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <Radio className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Remote Control
              </p>
              <p className="text-[11px] text-muted-foreground">
                Kontrol jarak jauh
              </p>
            </div>
          </button>
        </div>

        {/* Fan Control Card */}
        <Card className="p-5 bg-card border border-border/60 overflow-hidden relative">
          {/* Subtle bg decoration */}
          {isAutoMode && (
            <div className="absolute -top-8 -right-8 opacity-[0.04] pointer-events-none">
              <Zap className="w-36 h-36 text-primary" />
            </div>
          )}

          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-xl transition-colors",
                  fanSpeed === "off"
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary",
                )}
              >
                <Wind className={cn("w-4 h-4")} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-foreground">
                    Fan Control
                  </h3>
                  {isAutoMode && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-[10px] gap-1 px-2 py-0.5">
                      <Zap className="w-2.5 h-2.5 fill-current" />
                      Auto
                    </Badge>
                  )}
                  {isFirebaseConnected ? (
                    <Badge
                      variant="outline"
                      className="text-emerald-700 border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-700/60 text-[10px] gap-1 px-2 py-0.5"
                    >
                      <Wifi className="w-2.5 h-2.5" />
                      Firebase
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-red-700 border-red-400 bg-red-50 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-700/60 text-[10px] gap-1 px-2 py-0.5"
                    >
                      <WifiOff className="w-2.5 h-2.5" />
                      Offline
                    </Badge>
                  )}
                  {isSyncing && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isAutoMode
                    ? `Otomatis · Rekomendasi: ${recommendedSpeed.toUpperCase()}`
                    : "Mode manual aktif"}
                </p>
              </div>
            </div>

            {/* Auto Mode Toggle */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-medium text-muted-foreground hidden sm:block">
                Auto
              </span>
              <Switch
                checked={isAutoMode}
                onCheckedChange={handleAutoModeChange}
                disabled={isSyncing}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>

          {/* Current speed display */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50 mb-4">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                Kecepatan Saat Ini
              </p>
              <p className="text-base font-bold text-foreground">
                {fanSpeed === "off"
                  ? "Mati"
                  : `${SPEED_CONFIG[fanSpeed].desc} (${fanSpeed.toUpperCase()})`}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">
                Rekomendasi
              </p>
              <p className="text-sm font-semibold text-primary">
                {recommendedSpeed.toUpperCase()}
              </p>
            </div>
          </div>

          {/* Speed Buttons */}
          <div className="relative">
            {isAutoMode && (
              <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[2px] flex items-center justify-center rounded-xl border border-dashed border-muted-foreground/20 cursor-not-allowed">
                <div className="flex items-center gap-2 bg-background/90 px-3 py-1.5 rounded-full border shadow-sm text-xs font-medium text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  Dikunci — Mode Auto Aktif
                </div>
              </div>
            )}

            <div className="grid grid-cols-4 gap-2">
              {(["off", "low", "normal", "high"] as FanSpeed[]).map((speed) => {
                const cfg = SPEED_CONFIG[speed];
                const isActive = fanSpeed === speed;
                return (
                  <button
                    key={speed}
                    onClick={() => handleManualChange(speed)}
                    disabled={isAutoMode || isSyncing}
                    className={cn(
                      "flex flex-col items-center justify-center py-3.5 rounded-xl border-2 transition-all duration-200 min-h-[72px] gap-1",
                      isActive ? cfg.active : cn("bg-card", cfg.color),
                    )}
                  >
                    {speed !== "off" && (
                      <Wind
                        className={cn(
                          "w-4 h-4",
                          isActive ? "opacity-90" : "opacity-50",
                        )}
                      />
                    )}
                    <span className="text-[11px] font-bold uppercase tracking-wide">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      <RemoteControlModal
        isOpen={isRemoteOpen}
        onClose={() => setIsRemoteOpen(false)}
      />
    </>
  );
}
