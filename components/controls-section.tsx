"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  Wind,
  Zap,
  Lock,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { RemoteControlModal } from "./remote-control-modal";
import {
  detectRecommendedFanSpeed,
  FanSpeed,
  SensorReading,
} from "@/lib/sensor-data";
import { useFanControl } from "@/hooks/use-fan-control";
import { useState } from "react";

interface ControlsSectionProps {
  onFanSpeedChange?: (speed: FanSpeed) => void;
  sensorData: SensorReading;
}

export function ControlsSection({
  onFanSpeedChange,
  sensorData,
}: ControlsSectionProps) {
  const [isRemoteOpen, setIsRemoteOpen] = useState(false);

  // Rekomendasi kecepatan berdasarkan data sensor
  const recommendedSpeed = detectRecommendedFanSpeed(sensorData);

  // State fan & auto mode disinkronkan dengan Firebase
  const {
    fanSpeed,
    isAutoMode,
    isSyncing,
    isFirebaseConnected,
    setManualSpeed,
    setAutoMode,
  } = useFanControl(recommendedSpeed);

  // Handler switch auto mode
  const handleAutoModeChange = async (checked: boolean) => {
    await setAutoMode(checked);
  };

  // Handler tombol manual
  const handleManualChange = async (speed: FanSpeed) => {
    if (isAutoMode) return;
    await setManualSpeed(speed);
    onFanSpeedChange?.(speed);
  };

  // Helper warna tombol speed
  const getStatusColor = (speed: FanSpeed, isActive: boolean) => {
    if (!isActive)
      return "bg-muted text-muted-foreground border-transparent hover:bg-muted/80";

    const colors: Record<FanSpeed, string> = {
      off: "bg-slate-500 text-white border-slate-600 shadow-sm",
      low: "bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-500/20",
      normal: "bg-cyan-500 text-white border-cyan-600 shadow-md shadow-cyan-500/20",
      high: "bg-red-500 text-white border-red-600 shadow-md shadow-red-500/20",
    };
    return colors[speed];
  };

  return (
    <>
      <div className="space-y-4">
        {/* Bagian Map & Remote */}
        <Card className="p-6 bg-card border-0 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">CONTROLS</h3>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex gap-3">
            <Button className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6">
              MAP PLANNING
            </Button>
            <Button
              onClick={() => setIsRemoteOpen(true)}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6"
            >
              REMOTE CONTROL
            </Button>
          </div>
        </Card>

        {/* Fan Speed Control */}
        <Card className="p-6 bg-card border-border/60 shadow-sm relative overflow-hidden">
          {/* Background decoration Auto Mode */}
          {isAutoMode && (
            <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
              <Zap className="w-40 h-40 text-primary" />
            </div>
          )}

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="font-bold text-foreground text-lg tracking-tight flex items-center gap-2 flex-wrap">
                FAN CONTROL
                {isAutoMode && (
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-700 border-green-200 gap-1"
                  >
                    <Zap className="w-3 h-3 fill-current" />
                    AUTO ACTIVE
                  </Badge>
                )}
                {/* Firebase connectivity indicator */}
                {isFirebaseConnected ? (
                  <Badge
                    variant="outline"
                    className="gap-1 text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30"
                  >
                    <Wifi className="w-3 h-3" />
                    Firebase
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 text-rose-500 border-rose-300 bg-rose-50 dark:bg-rose-950/30"
                  >
                    <WifiOff className="w-3 h-3" />
                    Offline
                  </Badge>
                )}
                {/* Syncing spinner */}
                {isSyncing && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {isAutoMode
                  ? "Kecepatan kipas diatur otomatis berdasarkan kualitas udara dari Realtime Monitoring."
                  : "Kontrol manual aktif. Pilih kecepatan di bawah."}
              </p>
            </div>

            {/* Auto Mode Switch */}
            <div className="flex items-center space-x-3 bg-muted/50 p-2 rounded-lg border">
              <span
                className={`text-sm font-medium ${
                  isAutoMode ? "text-primary" : "text-muted-foreground"
                }`}
              >
                Auto Mode
              </span>
              <Switch
                checked={isAutoMode}
                onCheckedChange={handleAutoModeChange}
                disabled={isSyncing}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>

          <div className="space-y-4">
            {/* Status Indicator Bar */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Current Status
                </span>
                <div className="flex items-center gap-2">
                  <Wind
                    className={`w-5 h-5 ${
                      fanSpeed === "off"
                        ? "text-muted-foreground"
                        : "text-primary animate-pulse"
                    }`}
                  />
                  <span className="text-lg font-bold text-foreground">
                    {fanSpeed === "off"
                      ? "System Off"
                      : `${fanSpeed.toUpperCase()} SPEED`}
                  </span>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <span className="text-xs text-muted-foreground">
                  Sensor Recommendation
                </span>
                <div className="font-medium text-sm text-foreground">
                  {recommendedSpeed.toUpperCase()}
                </div>
              </div>
            </div>

            {/* Control Buttons */}
            <div className="grid grid-cols-4 gap-3 relative">
              {/* Lock Overlay saat Auto Mode */}
              {isAutoMode && (
                <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-[1px] flex items-center justify-center rounded-lg border border-dashed border-muted-foreground/20 cursor-not-allowed">
                  <div className="bg-background/90 px-4 py-2 rounded-full shadow-sm border flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Lock className="w-4 h-4" />
                    Controls Locked
                  </div>
                </div>
              )}

              {(["off", "low", "normal", "high"] as FanSpeed[]).map(
                (speed) => (
                  <button
                    key={speed}
                    onClick={() => handleManualChange(speed)}
                    disabled={isAutoMode || isSyncing}
                    className={`
                      relative group flex flex-col items-center justify-center py-4 rounded-xl transition-all duration-200 border
                      ${getStatusColor(speed, fanSpeed === speed)}
                      ${
                        !isAutoMode && fanSpeed !== speed
                          ? "hover:border-primary/30 hover:bg-muted/80"
                          : ""
                      }
                    `}
                  >
                    {speed !== "off" && (
                      <Wind className="w-5 h-5 mb-2 opacity-80" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wide">
                      {speed}
                    </span>
                  </button>
                )
              )}
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
