"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Square, Circle, Calendar, Activity, Info } from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { generateHistoricalData, getStatusLabel, WHO_STANDARDS } from "@/lib/sensor-data";
import { getHistoricalData, listenToSensorData } from "@/lib/firebase-data";
import { cn } from "@/lib/utils";

// ─── Sensor config ────────────────────────────────────────────────────────────

const SENSOR_CONFIG = {
  pm25: {
    label: "PM2.5",
    color: "#8B5CF6",
    unit: "μg/m³",
    description: "Particulate Matter 2.5",
    min: 0,
    max: 60,
  },
  pm10: {
    label: "PM10",
    color: "#3B82F6",
    unit: "μg/m³",
    description: "Particulate Matter 10",
    min: 0,
    max: 80,
  },
  co: {
    label: "CO",
    color: "#F59E0B",
    unit: "ppm",
    description: "Carbon Monoxide",
    min: 0,
    max: 15,
  },
  voc: {
    label: "VOC",
    color: "#10B981",
    unit: "ppm",
    description: "Volatile Organic Compounds",
    min: 0,
    max: 8,
  },
  all: {
    label: "Gabungan",
    color: "#6366F1",
    unit: "",
    description: "Grafik komparatif real-time yang memadukan seluruh parameter kualitas udara",
    min: 0,
    max: 100,
  },
} as const;

type SensorType = keyof typeof SENSOR_CONFIG;

// ─── CSV buffer row type ──────────────────────────────────────────────────────

interface DataRow {
  timestamp: number;
  pm25: number;
  pm10: number;
  co: number;
  voc: number;
  suhu: number;
}

// ─── Custom Tooltip Component ───────────────────────────────────────────────

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: number;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const formattedTime = label
    ? new Date(label).toLocaleString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "";

  return (
    <div className="bg-card border border-border rounded-xl p-3.5 shadow-lg backdrop-blur-md min-w-[230px] z-50 animate-in fade-in zoom-in-95 duration-150">
      <p className="text-[11px] font-semibold text-muted-foreground mb-2">
        {formattedTime}
      </p>
      <div className="space-y-2.5">
        {payload.map((item: any) => {
          const key = item.dataKey as SensorType;
          if (key === "all") return null;

          const conf = SENSOR_CONFIG[key];
          if (!conf) return null;

          const val = item.value as number;
          const stdType = key === "pm25" ? "PM2_5" : key === "pm10" ? "PM10" : key === "co" ? "CO" : "VOC";
          const status = getStatusLabel(val, stdType) as "Safe" | "Warning" | "Danger";
          const standards = WHO_STANDARDS[stdType];

          const statusColors = {
            Safe: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
            Warning: "text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
            Danger: "text-red-600 bg-red-500/10 border-red-500/20 dark:text-red-400 dark:border-red-500/30",
          };
          const statusLabels = {
            Safe: "Aman",
            Warning: "Perhatian",
            Danger: "Bahaya",
          };

          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color || item.stroke || conf.color }} />
                  <span className="font-bold text-foreground">{conf.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tabular-nums">
                    {val.toFixed(2)} <span className="text-[10px] text-muted-foreground font-normal">{conf.unit}</span>
                  </span>
                  <span className={cn("px-1.5 py-0.5 rounded-md text-[9px] font-bold border", statusColors[status])}>
                    {statusLabels[status]}
                  </span>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground/70 pl-4 leading-none">
                Batas WHO: Aman ≤{standards.safe} | Peringatan ≤{standards.warning} {conf.unit}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helper to downsample data points to prevent Recharts lag while maintaining the last data point
function downsampleData(data: DataRow[], maxPoints: number): DataRow[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  const result: DataRow[] = [];
  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
  }
  // Ensure the last element is always included to show the latest state
  const lastPoint = data[data.length - 1];
  if (result.length > 0 && result[result.length - 1].timestamp !== lastPoint.timestamp) {
    if (result.length >= maxPoints) {
      result[result.length - 1] = lastPoint;
    } else {
      result.push(lastPoint);
    }
  }
  return result;
}

// Helper to escape CSV cells to prevent Excel parsing bugs
function escapeCSVCell(val: any): string {
  const str = String(val ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper to format CSV date consistently across operating systems and locales
function formatCSVDate(ts: number) {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return {
    waktuPerekaman: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`,
    tanggal: `${dd}/${mm}/${yyyy}`,
    jam: `${hh}:${min}:${ss}`,
  };
}

// Helper to generate simulated fallback data for different time ranges
function generateSimulatedData(range: "1h" | "3d" | "7d"): DataRow[] {
  const now = Date.now();
  const data: DataRow[] = [];
  if (range === "1h") {
    // 60 points, one every 1 minute
    for (let i = 59; i >= 0; i--) {
      const ts = now - i * 60 * 1000;
      const tFactor = ts / 100000;
      data.push({
        timestamp: ts,
        pm25: Math.max(0, 12 + Math.sin(tFactor / 5) * 8 + Math.random() * 4),
        pm10: Math.max(0, 18 + Math.cos(tFactor / 4) * 10 + Math.random() * 5),
        co: Math.max(0, 5 + Math.sin(tFactor / 6) * 3 + Math.random() * 2),
        voc: Math.max(0, 1.2 + Math.cos(tFactor / 5.5) * 0.4 + Math.random() * 0.3),
        suhu: Math.max(15, Math.min(45, 26 + Math.sin(tFactor / 7) * 2 + Math.random() * 1)),
      });
    }
  } else if (range === "3d") {
    // 72 points, one every 1 hour
    for (let i = 71; i >= 0; i--) {
      const ts = now - i * 3600000;
      const tFactor = ts / 3600000;
      data.push({
        timestamp: ts,
        pm25: Math.max(0, 15 + Math.sin(tFactor / 6) * 5 + Math.random() * 4),
        pm10: Math.max(0, 22 + Math.cos(tFactor / 8) * 8 + Math.random() * 5),
        co: Math.max(0, 6 + Math.sin(tFactor / 12) * 3 + Math.random() * 2),
        voc: Math.max(0, 1.5 + Math.cos(tFactor / 10) * 0.5 + Math.random() * 0.3),
        suhu: Math.max(15, Math.min(45, 27 + Math.sin(tFactor / 24) * 3 + Math.random() * 1)),
      });
    }
  } else {
    // 7d: 168 points, one every 1 hour
    for (let i = 167; i >= 0; i--) {
      const ts = now - i * 3600000;
      const tFactor = ts / 3600000;
      data.push({
        timestamp: ts,
        pm25: Math.max(0, 14 + Math.sin(tFactor / 12) * 6 + Math.random() * 4),
        pm10: Math.max(0, 20 + Math.cos(tFactor / 16) * 9 + Math.random() * 5),
        co: Math.max(0, 5.5 + Math.sin(tFactor / 24) * 3 + Math.random() * 2),
        voc: Math.max(0, 1.4 + Math.cos(tFactor / 20) * 0.5 + Math.random() * 0.3),
        suhu: Math.max(15, Math.min(45, 26 + Math.sin(tFactor / 48) * 3 + Math.random() * 1)),
      });
    }
  }
  return data;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChartSection() {
  const [timeRange, setTimeRange] = useState<"1h" | "3d" | "7d">("1h");
  const [selectedSensor, setSelectedSensor] = useState<SensorType>("pm25");
  const [chartData, setChartData] = useState<DataRow[]>([]);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [visibleLines, setVisibleLines] = useState<Record<"pm25" | "pm10" | "co" | "voc", boolean>>({
    pm25: true,
    pm10: true,
    co: true,
    voc: true,
  });

  // ── Recording state ──────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordedCount, setRecordedCount] = useState(0);

  /**
   * csvBufferRef holds ALL rows captured during a recording session.
   * Using a ref (not state) avoids re-renders on every Firebase update.
   */
  const csvBufferRef = useRef<DataRow[]>([]);

  // ── High-resolution raw data ref for 1h sliding window ───────────────────
  const fullRawDataRef = useRef<DataRow[]>([]);

  // ── Recording status ref to prevent tearing down listeners ────────────────
  const isRecordingRef = useRef(false);

  // Sync the ref with state changes
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // ── Cleanup refs ─────────────────────────────────────────────────────────
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const firebaseCleanupRef = useRef<(() => void) | null>(null);

  // ── 1. Load initial / historical data ────────────────────────────────────
  useEffect(() => {
    const daysMap = { "1h": 1, "3d": 3, "7d": 7 };

    const loadData = async () => {
      try {
        const firebaseData = await getHistoricalData(daysMap[timeRange]);
        if (firebaseData.length > 0) {
          const rows: DataRow[] = firebaseData.map((d) => ({
            timestamp: d.timestamp.getTime(),
            pm25: d.pm25,
            pm10: d.pm10,
            co: d.co,
            voc: d.voc,
            suhu: d.suhu,
          }));

          // Sort chronologically
          rows.sort((a, b) => a.timestamp - b.timestamp);

          const now = Date.now();
          if (timeRange === "1h") {
            const oneHourAgo = now - 3600000;
            let filtered = rows.filter((r) => r.timestamp >= oneHourAgo);
            if (filtered.length === 0) {
              // Fallback to last 50 historical points if no data in the last hour
              filtered = rows.slice(-50);
            }
            fullRawDataRef.current = filtered;
            setChartData(downsampleData(filtered, 120));
          } else if (timeRange === "3d") {
            const threeDaysAgo = now - 3 * 86400000;
            const filtered = rows.filter((r) => r.timestamp >= threeDaysAgo);
            setChartData(downsampleData(filtered, 150));
          } else {
            // 7d
            const sevenDaysAgo = now - 7 * 86400000;
            const filtered = rows.filter((r) => r.timestamp >= sevenDaysAgo);
            setChartData(downsampleData(filtered, 150));
          }
          setIsFirebaseConnected(true);
          return;
        }
      } catch (err) {
        console.error("Error loading historical data:", err);
      }

      // Fallback to simulated data if Firebase has no data or fails
      setIsFirebaseConnected(false);
      const simulated = generateSimulatedData(timeRange);
      if (timeRange === "1h") {
        fullRawDataRef.current = simulated;
        setChartData(downsampleData(simulated, 120));
      } else {
        setChartData(downsampleData(simulated, 150));
      }
    };

    loadData();
  }, [timeRange]);

  // ── 2. Real-time listener (live mode only) ────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (firebaseCleanupRef.current) firebaseCleanupRef.current();

    if (timeRange !== "1h") return;

    const handleNewPoint = (row: DataRow) => {
      // Append to CSV buffer if recording
      if (isRecordingRef.current) {
        csvBufferRef.current.push(row);
        setRecordedCount(csvBufferRef.current.length);
      }

      // Update full raw data ref and slide window
      const oneHourAgo = Date.now() - 3600000;
      fullRawDataRef.current = [...fullRawDataRef.current, row].filter(
        (r) => r.timestamp >= oneHourAgo,
      );

      // Downsample and update chart state
      setChartData(downsampleData(fullRawDataRef.current, 120));
    };

    try {
      firebaseCleanupRef.current = listenToSensorData(
        (sd) => {
          setIsFirebaseConnected(true);
          handleNewPoint({
            timestamp: sd.timestamp.getTime(),
            pm25: sd.pm25,
            pm10: sd.pm10,
            co: sd.co,
            voc: sd.voc,
            suhu: sd.suhu,
          });
        },
        () => {
          setIsFirebaseConnected(false);
          // Simulated fallback interval with functional update to prevent stale closures
          intervalRef.current = setInterval(() => {
            setChartData((prev) => {
              const last = prev[prev.length - 1] || {
                timestamp: Date.now(),
                pm25: 15,
                pm10: 22,
                co: 5.5,
                voc: 1.2,
                suhu: 26,
              };
              const row: DataRow = {
                timestamp: Date.now(),
                pm25: Math.max(0, last.pm25 + (Math.random() - 0.5) * 3),
                pm10: Math.max(0, last.pm10 + (Math.random() - 0.5) * 4),
                co: Math.max(0, last.co + (Math.random() - 0.5) * 0.1),
                voc: Math.max(0, last.voc + (Math.random() - 0.5) * 0.05),
                suhu: Math.max(15, Math.min(45, last.suhu + (Math.random() - 0.5) * 0.2)),
              };

              // Append to CSV buffer if recording
              if (isRecordingRef.current) {
                csvBufferRef.current.push(row);
                setRecordedCount(csvBufferRef.current.length);
              }

              // Update raw ref and slide window
              const oneHourAgo = Date.now() - 3600000;
              fullRawDataRef.current = [...fullRawDataRef.current, row].filter(
                (r) => r.timestamp >= oneHourAgo,
              );

              return downsampleData(fullRawDataRef.current, 120);
            });
          }, 3000);
        },
      );
    } catch (err) {
      console.error("Error subscribing to sensor data:", err);
      setIsFirebaseConnected(false);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (firebaseCleanupRef.current) firebaseCleanupRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  // ── Recording controls ────────────────────────────────────────────────────

  const startRecording = useCallback(() => {
    csvBufferRef.current = [];
    setRecordedCount(0);
    setIsRecording(true);
  }, []);

  const stopAndExport = useCallback(() => {
    setIsRecording(false);

    const rows = csvBufferRef.current;
    if (rows.length === 0) return;

    const header = [
      "No",
      "Waktu Perekaman (WIB)",
      "Tanggal",
      "Jam",
      "PM2.5 (μg/m³)",
      "PM10 (μg/m³)",
      "CO (ppm)",
      "VOC (ppm)",
      "Suhu (°C)",
      "Sumber Data",
    ];

    const body = rows.map((r, idx) => {
      const { waktuPerekaman, tanggal, jam } = formatCSVDate(r.timestamp);
      return [
        escapeCSVCell(idx + 1),
        escapeCSVCell(waktuPerekaman),
        escapeCSVCell(tanggal),
        escapeCSVCell(jam),
        escapeCSVCell(r.pm25.toFixed(2)),
        escapeCSVCell(r.pm10.toFixed(2)),
        escapeCSVCell(r.co.toFixed(2)),
        escapeCSVCell(r.voc.toFixed(2)),
        escapeCSVCell(r.suhu.toFixed(2)),
        escapeCSVCell(isFirebaseConnected ? "Firebase" : "Simulasi"),
      ];
    });

    const csvContent = "sep=,\n" + [header, ...body].map((row) => row.join(",")).join("\n");
    // Prepend UTF-8 BOM for Microsoft Excel compatibility
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `airguard-realtime-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    csvBufferRef.current = [];
    setRecordedCount(0);
  }, [isFirebaseConnected]);

  // Automatically export and stop recording if user switches time range
  useEffect(() => {
    if (timeRange !== "1h" && isRecordingRef.current) {
      stopAndExport();
    }
  }, [timeRange, stopAndExport]);

  // Export snapshot (historical / non-live)
  const exportSnapshot = useCallback(async () => {
    const daysMap = { "1h": 1, "3d": 3, "7d": 7 };
    let rows: DataRow[] = [];
    let isSnapshotFirebase = isFirebaseConnected;

    if (timeRange === "1h") {
      rows = [...fullRawDataRef.current];
    } else {
      try {
        const fb = await getHistoricalData(daysMap[timeRange]);
        if (fb.length > 0) {
          rows = fb.map((d) => ({
            timestamp: d.timestamp.getTime(),
            pm25: d.pm25,
            pm10: d.pm10,
            co: d.co,
            voc: d.voc,
            suhu: d.suhu,
          }));
          isSnapshotFirebase = true;
        } else {
          rows = generateSimulatedData(timeRange);
          isSnapshotFirebase = false;
        }
      } catch (err) {
        console.error("Error fetching historical data for export:", err);
        rows = generateSimulatedData(timeRange);
        isSnapshotFirebase = false;
      }
    }

    // Sort chronologically
    rows.sort((a, b) => a.timestamp - b.timestamp);

    // Filter to range limit
    const now = Date.now();
    let timeLimit = now - 7 * 86400000;
    if (timeRange === "1h") {
      timeLimit = now - 3600000;
    } else if (timeRange === "3d") {
      timeLimit = now - 3 * 86400000;
    }
    const filteredRows = rows.filter((r) => r.timestamp >= timeLimit);

    const header = [
      "No",
      "Waktu Perekaman (WIB)",
      "Tanggal",
      "Jam",
      "PM2.5 (μg/m³)",
      "PM10 (μg/m³)",
      "CO (ppm)",
      "VOC (ppm)",
      "Suhu (°C)",
      "Sumber Data",
    ];

    const body = filteredRows.map((r, idx) => {
      const { waktuPerekaman, tanggal, jam } = formatCSVDate(r.timestamp);
      return [
        escapeCSVCell(idx + 1),
        escapeCSVCell(waktuPerekaman),
        escapeCSVCell(tanggal),
        escapeCSVCell(jam),
        escapeCSVCell(r.pm25.toFixed(2)),
        escapeCSVCell(r.pm10.toFixed(2)),
        escapeCSVCell(r.co.toFixed(2)),
        escapeCSVCell(r.voc.toFixed(2)),
        escapeCSVCell(r.suhu.toFixed(2)),
        escapeCSVCell(isSnapshotFirebase ? "Firebase" : "Simulasi"),
      ];
    });

    const csvContent = "sep=,\n" + [header, ...body].map((row) => row.join(",")).join("\n");
    // Prepend UTF-8 BOM for Microsoft Excel compatibility
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `airguard-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [timeRange, isFirebaseConnected]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const config = SENSOR_CONFIG[selectedSensor];

  const formatXAxis = (ts: number) => {
    const d = new Date(ts);
    return timeRange === "1h"
      ? d.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric" });
  };

  const isLive = timeRange === "1h";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card className="p-5 md:p-6 bg-card border border-border/60 shadow-sm">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-primary shrink-0" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-foreground text-base">
                Real-Time Monitoring
              </h3>

              {/* Live / Simulated pill */}
              {isLive && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-widest",
                    isFirebaseConnected
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300",
                  )}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span
                      className={cn(
                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                        isFirebaseConnected ? "bg-emerald-500" : "bg-amber-500",
                      )}
                    />
                    <span
                      className={cn(
                        "relative inline-flex rounded-full h-1.5 w-1.5",
                        isFirebaseConnected ? "bg-emerald-500" : "bg-amber-500",
                      )}
                    />
                  </span>
                  {isFirebaseConnected ? "LIVE" : "SIMULASI"}
                </span>
              )}

              {/* Recording indicator */}
              {isRecording && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-700 dark:text-red-300 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  REC · {recordedCount} baris
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {config.description}
            </p>
          </div>
        </div>

        {/* Export controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isLive ? (
            // Live mode: record & export
            isRecording ? (
              <Button
                onClick={stopAndExport}
                size="sm"
                className="text-xs font-semibold bg-red-500 hover:bg-red-600 text-white gap-1.5"
              >
                <Square className="w-3 h-3 fill-current" />
                Stop & Export CSV
              </Button>
            ) : (
              <Button
                onClick={startRecording}
                size="sm"
                variant="outline"
                className="text-xs font-semibold border-red-400/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 gap-1.5"
              >
                <Circle className="w-3 h-3 fill-current" />
                Rekam CSV
              </Button>
            )
          ) : (
            // Historical mode: snapshot export
            <Button
              onClick={exportSnapshot}
              size="sm"
              variant="outline"
              className="text-xs font-semibold border-border hover:bg-muted gap-1.5 text-foreground"
            >
              <Download className="w-3 h-3" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        {/* Sensor selector */}
        <div className="flex-1">
          <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider">
            Parameter Sensor
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(SENSOR_CONFIG) as SensorType[]).map((s) => (
              <button
                key={s}
                onClick={() => setSelectedSensor(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200",
                  selectedSensor === s
                    ? "text-white border-transparent shadow-sm scale-105"
                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
                style={
                  selectedSensor === s
                    ? {
                        backgroundColor: SENSOR_CONFIG[s].color,
                        borderColor: SENSOR_CONFIG[s].color,
                      }
                    : {}
                }
              >
                {SENSOR_CONFIG[s].label}
              </button>
            ))}
          </div>

          {/* Line Toggles for Combined Chart */}
          {selectedSensor === "all" && (
            <div className="flex gap-2 flex-wrap items-center mt-3 p-1.5 bg-muted/30 border border-border/40 rounded-xl max-w-fit animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-2">
                Filter:
              </span>
              {(["pm25", "pm10", "co", "voc"] as const).map((key) => {
                const colors = {
                  pm25: "#8B5CF6",
                  pm10: "#3B82F6",
                  co: "#F59E0B",
                  voc: "#10B981",
                };
                const labels = {
                  pm25: "PM2.5",
                  pm10: "PM10",
                  co: "CO",
                  voc: "VOC",
                };
                const active = visibleLines[key];
                return (
                  <button
                    key={key}
                    onClick={() =>
                      setVisibleLines((prev) => ({
                        ...prev,
                        [key]: !prev[key],
                      }))
                    }
                    className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border transition-all duration-150",
                      active
                        ? "bg-card text-foreground shadow-xs"
                        : "bg-muted/10 border-dashed border-border/60 text-muted-foreground/50 hover:text-muted-foreground",
                    )}
                    style={{
                      borderColor: active ? colors[key] : "transparent",
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: colors[key] }}
                    />
                    {labels[key]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Time range selector */}
        <div className="sm:text-right">
          <p className="text-[10px] font-bold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1 sm:justify-end">
            <Calendar className="w-3 h-3" /> Rentang Waktu
          </p>
          <div className="flex gap-1.5 flex-wrap sm:justify-end">
            {(["1h", "3d", "7d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200",
                  timeRange === r
                    ? "border-primary/50 bg-primary/10 text-primary dark:text-primary"
                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {r === "1h" ? "Live (1 Jam)" : r === "3d" ? "3 Hari" : "7 Hari"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="h-[300px] sm:h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {selectedSensor === "all" ? (
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-border/40"
                vertical={false}
              />

              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                tick={{
                  fontSize: 11,
                  fill: "currentColor",
                  className: "text-muted-foreground",
                }}
                tickLine={false}
                axisLine={false}
                dy={8}
                interval="preserveStartEnd"
                minTickGap={40}
              />

              <YAxis
                tick={{
                  fontSize: 11,
                  fill: "currentColor",
                  className: "text-muted-foreground",
                }}
                tickLine={false}
                axisLine={false}
                dx={-8}
                domain={[0, "auto"]}
              />

              <Tooltip content={<CustomTooltip />} />

              {visibleLines.pm25 && (
                <Line
                  type="monotone"
                  dataKey="pm25"
                  name="PM2.5 (μg/m³)"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              )}
              {visibleLines.pm10 && (
                <Line
                  type="monotone"
                  dataKey="pm10"
                  name="PM10 (μg/m³)"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              )}
              {visibleLines.co && (
                <Line
                  type="monotone"
                  dataKey="co"
                  name="CO (ppm)"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              )}
              {visibleLines.voc && (
                <Line
                  type="monotone"
                  dataKey="voc"
                  name="VOC (ppm)"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          ) : (
            <AreaChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`grad-${selectedSensor}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-border/40"
                vertical={false}
              />

              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                tick={{
                  fontSize: 11,
                  fill: "currentColor",
                  className: "text-muted-foreground",
                }}
                tickLine={false}
                axisLine={false}
                dy={8}
                interval="preserveStartEnd"
                minTickGap={40}
              />

              <YAxis
                tick={{
                  fontSize: 11,
                  fill: "currentColor",
                  className: "text-muted-foreground",
                }}
                tickLine={false}
                axisLine={false}
                dx={-8}
                domain={[config.min, "auto"]}
              />

              <Tooltip content={<CustomTooltip />} />

              <Area
                type="monotone"
                dataKey={selectedSensor}
                stroke={config.color}
                strokeWidth={2.5}
                fillOpacity={1}
                fill={`url(#grad-${selectedSensor})`}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* ── Recording hint ── */}
      {isLive && !isRecording && (
        <p className="text-[11px] text-muted-foreground text-center mt-3 animate-in fade-in duration-200">
          {selectedSensor === "all" ? (
            <span>
              Parameter memiliki satuan berbeda (ppm / μg/m³). Gunakan filter tombol di atas untuk memfokuskan grafik.
            </span>
          ) : (
            <span>
              Klik <span className="font-semibold text-foreground">Rekam CSV</span>{" "}
              untuk mulai merekam data real-time dari Firebase. Data tersimpan
              setiap update (~3 detik).
            </span>
          )}
        </p>
      )}
      {isRecording && (
        <p className="text-[11px] text-red-600 dark:text-red-400 text-center mt-3 font-medium">
          Sedang merekam… {recordedCount} baris tersimpan. Klik{" "}
          <span className="font-semibold">Stop & Export CSV</span> untuk
          mengunduh.
        </p>
      )}
      {/* ── Collapsible Guide ── */}
      <div className="mt-4 pt-4 border-t border-border/40">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 focus:outline-none"
        >
          <Info className="w-3.5 h-3.5" />
          {showGuide ? "Sembunyikan Panduan Kualitas Udara" : "Tampilkan Panduan Kualitas Udara & Batas Ambang WHO"}
        </button>

        {showGuide && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-2.5 p-3 rounded-xl bg-muted/20 border border-border/30">
              <p className="font-bold text-foreground text-[11px] uppercase tracking-wider text-indigo-500">
                Partikel Debu (Partikulat)
              </p>
              <div className="space-y-2 text-justify">
                <p>
                  <span className="font-semibold text-foreground">PM2.5 (Debu Halus):</span> Partikel berukuran &lt; 2.5 µm yang berasal dari asap kendaraan dan industri. Karena ukurannya yang sangat kecil, ia dapat menembus sistem paru-paru terdalam dan masuk ke aliran darah.
                  <br />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Aman: ≤35.4 μg/m³</span> | <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Perhatian: ≤125.4 μg/m³</span>
                </p>
                <p>
                  <span className="font-semibold text-foreground">PM10 (Debu Kasar):</span> Partikel berukuran &lt; 10 µm berupa debu jalanan, konstruksi, atau serbuk sari. Dapat mengiritasi mata, hidung, dan tenggorokan.
                  <br />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Aman: ≤154 μg/m³</span> | <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Perhatian: ≤354 μg/m³</span>
                </p>
              </div>
            </div>

            <div className="space-y-2.5 p-3 rounded-xl bg-muted/20 border border-border/30">
              <p className="font-bold text-foreground text-[11px] uppercase tracking-wider text-indigo-500">
                Gas Polutan & Bahan Kimia
              </p>
              <div className="space-y-2 text-justify">
                <p>
                  <span className="font-semibold text-foreground">CO (Karbon Monoksida):</span> Gas berbahaya tidak berwarna dan tidak berbau hasil pembakaran mesin. Menghalangi darah membawa oksigen ke otak dan jantung.
                  <br />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Aman: ≤15 ppm</span> | <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Perhatian: ≤50 ppm</span>
                </p>
                <p>
                  <span className="font-semibold text-foreground">VOC (Senyawa Organik Menguap):</span> Uap kimia dari cat, parfum, pembersih rumah, dan lem. Dapat memicu pusing, iritasi mata, dan gangguan pernapasan.
                  <br />
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Aman: ≤20 ppm</span> | <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">Perhatian: ≤100 ppm</span>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
