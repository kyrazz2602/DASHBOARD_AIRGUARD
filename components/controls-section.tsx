"use client";

import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Wind,
  Zap,
  Lock,
  Wifi,
  WifiOff,
  Loader2,
  Map,
  Radio,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  LockKeyhole,
  Signal,
  RefreshCw,
} from "lucide-react";
import { RemoteControlModal } from "./remote-control-modal";
import { MapPlanningModal } from "./map-planning-modal";
import {
  detectRecommendedFanSpeed,
  FanSpeed,
  SensorReading,
} from "@/lib/sensor-data";
import { useFanControl } from "@/hooks/use-fan-control";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  triggerWifiChange,
  listenToWifiStatus,
  listenToDetectedWifis,
  triggerWifiScan,
  clearWifiStatus,
  getWifiCommandTimestamp,
} from "@/lib/firebase-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      "border-border text-muted-foreground hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300",
    active:
      "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/25",
  },
  normal: {
    label: "Normal",
    desc: "Sedang",
    color:
      "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-300",
    active:
      "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/25",
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
  const [isMapOpen, setIsMapOpen] = useState(false);

  const recommendedSpeed = detectRecommendedFanSpeed(sensorData);

  const {
    fanSpeed,
    isAutoMode,
    isSyncing,
    isFirebaseConnected,
    setManualSpeed,
    setAutoMode,
  } = useFanControl(recommendedSpeed);

  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiStatus, setWifiStatus] = useState({ wifiStatus: "", wifiError: "" });
  const [isWifiConnecting, setIsWifiConnecting] = useState(false);
  const [isWifiSettingsOpen, setIsWifiSettingsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [detectedWifis, setDetectedWifis] = useState<string[]>([]);
  const [isManualSsid, setIsManualSsid] = useState(false);
  const [selectedSsid, setSelectedSsid] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Bersihkan status stale jika perintah wifi terakhir sudah > 30 detik lalu
    const checkStaleStatus = async () => {
      try {
        const lastUpdated = await getWifiCommandTimestamp();
        const now = Date.now();
        if (now - lastUpdated > 30000) {
          await clearWifiStatus();
        }
      } catch (err) {
        console.error("Failed to check stale wifi status:", err);
      }
    };
    checkStaleStatus();

    const unsubscribe = listenToWifiStatus((status) => {
      setWifiStatus(status);
      if (status.wifiStatus === "Connecting...") {
        setIsWifiConnecting(true);
      } else {
        setIsWifiConnecting(false);
      }
    });
    return unsubscribe;
  }, []);

  // Efek untuk mengelola timeout koneksi WiFi selama 30 detik
  useEffect(() => {
    if (isWifiConnecting) {
      const timer = setTimeout(async () => {
        setIsWifiConnecting(false);
        setWifiStatus((prev) => ({
          ...prev,
          wifiStatus: "",
          wifiError: "Tidak ada respon dari Orange Pi. Pastikan script python bridge di Orange Pi sedang berjalan.",
        }));
        // Bersihkan status di Firebase agar tidak stuck
        try {
          await clearWifiStatus();
        } catch (err) {
          console.error("Failed to auto-clear wifi status on timeout:", err);
        }
      }, 30000);

      return () => clearTimeout(timer);
    }
  }, [isWifiConnecting]);

  useEffect(() => {
    const unsubscribe = listenToDetectedWifis((wifis) => {
      setDetectedWifis(wifis);
      setIsScanning(false);
    });
    return unsubscribe;
  }, []);

  const handleScanWifi = async () => {
    setIsScanning(true);
    try {
      await triggerWifiScan();
      // Reset scanning state automatically after 15 seconds if no response
      setTimeout(() => setIsScanning(false), 15000);
    } catch (err) {
      console.error("Failed to trigger WiFi scan:", err);
      setIsScanning(false);
    }
  };

  const handleSelectWifi = (value: string) => {
    setSelectedSsid(value);
    if (value === "MANUAL") {
      setIsManualSsid(true);
      setWifiSsid("");
    } else {
      setIsManualSsid(false);
      setWifiSsid(value);
    }
  };

  const handleConnectWifi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiSsid.trim()) return;
    setIsWifiConnecting(true);
    try {
      await triggerWifiChange(wifiSsid, wifiPassword);
    } catch (err) {
      console.error("Failed to connect WiFi:", err);
      setIsWifiConnecting(false);
    }
  };

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
          <button
            onClick={() => setIsMapOpen(true)}
            className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 group text-left"
          >
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
        <Card className="p-5 sm:p-6 bg-card border border-border/60 overflow-hidden relative">
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
                      Tersambung
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
                    ? `Mode Auto · Kecepatan: ${fanSpeed.toUpperCase()} (Rekomendasi)`
                    : `Mode Manual · Kecepatan: ${fanSpeed.toUpperCase()}`}
                </p>
              </div>
            </div>

            {/* Auto Mode Toggle */}
            <label className="flex items-center gap-2 shrink-0 cursor-pointer min-h-[44px] py-1 select-none">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                Auto
                {isAutoMode && <Lock className="w-3 h-3 text-amber-500 animate-[bounce_1.5s_infinite]" />}
              </span>
              <Switch
                checked={isAutoMode}
                onCheckedChange={handleAutoModeChange}
                disabled={isSyncing}
                className="data-[state=checked]:bg-emerald-500"
              />
            </label>
          </div>

          {/* Speed Buttons */}
          <div className="space-y-3">
            {isAutoMode && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-medium animate-in slide-in-from-top-1 duration-200">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Manual dikunci — Nonaktifkan Auto untuk mengubah kecepatan</span>
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
                    title={isAutoMode ? "Nonaktifkan Auto untuk mengubah kecepatan manual" : undefined}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 sm:py-3.5 rounded-xl border-2 transition-all duration-200 min-h-[64px] sm:min-h-[72px] gap-0.5 sm:gap-1",
                      isActive ? cfg.active : cn("bg-card", cfg.color),
                      isAutoMode && "opacity-40 cursor-not-allowed",
                    )}
                  >
                    {speed !== "off" && (
                      <Wind
                        className={cn(
                          "w-3.5 h-3.5 sm:w-4 sm:h-4",
                          isActive ? "opacity-90" : "opacity-50",
                        )}
                      />
                    )}
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* WiFi Settings Card */}
        <Card className="p-5 sm:p-6 bg-card border border-border/60 overflow-hidden relative">
          <div 
            className="flex items-center justify-between cursor-pointer select-none min-h-[44px]"
            onClick={() => setIsWifiSettingsOpen(!isWifiSettingsOpen)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Wifi className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Pengaturan WiFi
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {wifiStatus.wifiStatus ? `Status: ${wifiStatus.wifiStatus}` : "Hubungkan Orange Pi ke WiFi baru"}
                </p>
              </div>
            </div>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-1">
              {isWifiSettingsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isWifiSettingsOpen && (
            <form onSubmit={handleConnectWifi} className="mt-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
              {wifiStatus.wifiError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs leading-relaxed flex items-start gap-2">
                  <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{wifiStatus.wifiError}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-foreground/80 tracking-wide uppercase">
                      Pilih Jaringan WiFi
                    </label>
                    <button
                      type="button"
                      onClick={handleScanWifi}
                      disabled={isScanning || isWifiConnecting}
                      className="text-[10px] text-primary hover:text-primary/80 transition-colors font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={cn("w-3 h-3", isScanning && "animate-spin")} />
                      <span>{isScanning ? "Memindai..." : "Scan Ulang"}</span>
                    </button>
                  </div>
                  
                  <Select
                    value={selectedSsid}
                    onValueChange={handleSelectWifi}
                    disabled={isWifiConnecting}
                  >
                    <SelectTrigger className="w-full h-11 rounded-xl bg-transparent border-input pl-3.5">
                      <SelectValue placeholder={detectedWifis.length > 0 ? "Pilih WiFi terdeteksi..." : "Tidak ada WiFi terdeteksi..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {detectedWifis.map((ssid) => (
                        <SelectItem key={ssid} value={ssid}>
                          {ssid}
                        </SelectItem>
                      ))}
                      <SelectItem value="MANUAL">
                        Tulis manual / Hidden SSID...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(isManualSsid || detectedWifis.length === 0) && (
                  <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                    <label className="text-[11px] font-bold text-foreground/80 tracking-wide uppercase">
                      SSID / Nama WiFi (Manual)
                    </label>
                    <div className="relative">
                      <Signal className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                      <Input
                        type="text"
                        placeholder="Nama jaringan WiFi..."
                        value={wifiSsid}
                        onChange={(e) => setWifiSsid(e.target.value)}
                        disabled={isWifiConnecting}
                        className="pl-10 h-11 rounded-xl"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-foreground/80 tracking-wide uppercase">
                    Password / Kata Sandi
                  </label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password WiFi..."
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      disabled={isWifiConnecting}
                      className="pl-10 pr-10 h-11 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isWifiConnecting}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isWifiConnecting || !wifiSsid.trim()}
                className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isWifiConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menghubungkan...</span>
                  </>
                ) : (
                  <span>Hubungkan</span>
                )}
              </button>
            </form>
          )}
        </Card>
      </div>

      <RemoteControlModal
        isOpen={isRemoteOpen}
        onClose={() => setIsRemoteOpen(false)}
        onSwitchToAuto={() => {
          setIsRemoteOpen(false);
          setIsMapOpen(true);
        }}
      />

      <MapPlanningModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSwitchToManual={() => {
          setIsMapOpen(false);
          setIsRemoteOpen(true);
        }}
      />
    </>
  );
}

