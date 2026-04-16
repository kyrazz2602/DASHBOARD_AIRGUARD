"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Square, Circle, Calendar, Activity } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { generateHistoricalData } from "@/lib/sensor-data";
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ChartSection() {
  const [timeRange, setTimeRange] = useState<"1h" | "3d" | "7d">("1h");
  const [selectedSensor, setSelectedSensor] = useState<SensorType>("pm25");
  const [chartData, setChartData] = useState<DataRow[]>([]);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // ── Recording state ──────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordedCount, setRecordedCount] = useState(0);

  /**
   * csvBufferRef holds ALL rows captured during a recording session.
   * Using a ref (not state) avoids re-renders on every Firebase update.
   */
  const csvBufferRef = useRef<DataRow[]>([]);

  // ── Cleanup refs ─────────────────────────────────────────────────────────
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const firebaseCleanupRef = useRef<(() => void) | null>(null);

  // ── 1. Load initial / historical data ────────────────────────────────────
  useEffect(() => {
    const daysMap = { "1h": 0.04, "3d": 3, "7d": 7 };

    const loadData = async () => {
      try {
        const firebaseData = await getHistoricalData(
          Math.ceil(daysMap[timeRange]),
        );
        if (firebaseData.length > 0) {
          const rows: DataRow[] = firebaseData.map((d) => ({
            timestamp: d.timestamp.getTime(),
            pm25: d.pm25,
            pm10: d.pm10,
            co: d.co,
            voc: d.voc,
            suhu: d.suhu,
          }));
          const processed =
            timeRange === "1h"
              ? rows.slice(-50)
              : rows.filter((_, i) => i % 6 === 0).slice(-50);
          setChartData(processed);
          setIsFirebaseConnected(true);
          return;
        }
      } catch {
        // fall through to simulated
      }
      setIsFirebaseConnected(false);
      const sim = generateHistoricalData(Math.ceil(daysMap[timeRange]));
      const processed =
        timeRange === "1h"
          ? sim.slice(-30)
          : sim.filter((_, i) => i % 6 === 0).slice(-50);
      setChartData(
        processed.map((d) => ({
          timestamp: d.timestamp.getTime(),
          pm25: d.pm25,
          pm10: d.pm10,
          co: d.co,
          voc: d.voc,
          suhu: d.suhu,
        })),
      );
    };

    loadData();
  }, [timeRange]);

  // ── 2. Real-time listener (live mode only) ────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (firebaseCleanupRef.current) firebaseCleanupRef.current();

    if (timeRange !== "1h") return;

    const handleNewPoint = (row: DataRow) => {
      // Update chart
      setChartData((prev) => {
        if (prev.length === 0) return prev;
        return [...prev.slice(-49), row];
      });

      // Append to CSV buffer if recording
      if (isRecording) {
        csvBufferRef.current.push(row);
        setRecordedCount(csvBufferRef.current.length);
      }
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
          // Simulated fallback
          intervalRef.current = setInterval(() => {
            const last = chartData[chartData.length - 1];
            if (!last) return;
            const row: DataRow = {
              timestamp: Date.now(),
              pm25: Math.max(0, last.pm25 + (Math.random() - 0.5) * 3),
              pm10: Math.max(0, last.pm10 + (Math.random() - 0.5) * 4),
              co: Math.max(0, last.co + (Math.random() - 0.5) * 0.5),
              voc: Math.max(0, last.voc + (Math.random() - 0.5) * 0.3),
              suhu: Math.max(0, last.suhu + (Math.random() - 0.5) * 0.5),
            };
            handleNewPoint(row);
          }, 3000);
        },
      );
    } catch {
      setIsFirebaseConnected(false);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (firebaseCleanupRef.current) firebaseCleanupRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, isRecording]);

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
      "Timestamp",
      "Tanggal",
      "Waktu",
      "PM2.5 (μg/m³)",
      "PM10 (μg/m³)",
      "CO (ppm)",
      "VOC (ppm)",
      "Suhu (°C)",
      "Sumber",
    ];
    const body = rows.map((r) => {
      const d = new Date(r.timestamp);
      return [
        r.timestamp,
        d.toLocaleDateString("id-ID"),
        d.toLocaleTimeString("id-ID"),
        r.pm25.toFixed(2),
        r.pm10.toFixed(2),
        r.co.toFixed(2),
        r.voc.toFixed(2),
        r.suhu.toFixed(2),
        isFirebaseConnected ? "Firebase" : "Simulasi",
      ];
    });

    const csv = [header, ...body].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
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

  // Export snapshot (historical / non-live)
  const exportSnapshot = useCallback(async () => {
    const daysMap = { "1h": 0, "3d": 3, "7d": 7 };
    let rows: DataRow[] = [];

    if (timeRange === "1h") {
      rows = [...chartData];
    } else {
      try {
        const fb = await getHistoricalData(daysMap[timeRange]);
        rows =
          fb.length > 0
            ? fb.map((d) => ({
                timestamp: d.timestamp.getTime(),
                pm25: d.pm25,
                pm10: d.pm10,
                co: d.co,
                voc: d.voc,
                suhu: d.suhu,
              }))
            : generateHistoricalData(daysMap[timeRange]).map((d) => ({
                timestamp: d.timestamp.getTime(),
                pm25: d.pm25,
                pm10: d.pm10,
                co: d.co,
                voc: d.voc,
                suhu: d.suhu,
              }));
      } catch {
        rows = generateHistoricalData(daysMap[timeRange]).map((d) => ({
          timestamp: d.timestamp.getTime(),
          pm25: d.pm25,
          pm10: d.pm10,
          co: d.co,
          voc: d.voc,
          suhu: d.suhu,
        }));
      }
    }

    rows.sort((a, b) => a.timestamp - b.timestamp);

    const header = [
      "Timestamp",
      "Tanggal",
      "Waktu",
      "PM2.5 (μg/m³)",
      "PM10 (μg/m³)",
      "CO (ppm)",
      "VOC (ppm)",
      "Suhu (°C)",
    ];
    const body = rows.map((r) => {
      const d = new Date(r.timestamp);
      return [
        r.timestamp,
        d.toLocaleDateString("id-ID"),
        d.toLocaleTimeString("id-ID"),
        r.pm25.toFixed(2),
        r.pm10.toFixed(2),
        r.co.toFixed(2),
        r.voc.toFixed(2),
        r.suhu.toFixed(2),
      ];
    });

    const csv = [header, ...body].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `airguard-${timeRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [timeRange, chartData]);

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

            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "10px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
                color: "hsl(var(--foreground))",
                fontSize: "12px",
              }}
              labelStyle={{
                color: "hsl(var(--muted-foreground))",
                marginBottom: 4,
              }}
              itemStyle={{ color: config.color, fontWeight: 600 }}
              labelFormatter={(ts) =>
                new Date(ts).toLocaleString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              }
              formatter={(v: number) => [
                `${v.toFixed(2)} ${config.unit}`,
                config.label,
              ]}
            />

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
        </ResponsiveContainer>
      </div>

      {/* ── Recording hint ── */}
      {isLive && !isRecording && (
        <p className="text-[11px] text-muted-foreground text-center mt-3">
          Klik <span className="font-semibold text-foreground">Rekam CSV</span>{" "}
          untuk mulai merekam data real-time dari Firebase. Data tersimpan
          setiap update (~3 detik).
        </p>
      )}
      {isRecording && (
        <p className="text-[11px] text-red-600 dark:text-red-400 text-center mt-3 font-medium">
          Sedang merekam… {recordedCount} baris tersimpan. Klik{" "}
          <span className="font-semibold">Stop & Export CSV</span> untuk
          mengunduh.
        </p>
      )}
    </Card>
  );
}
