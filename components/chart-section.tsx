"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Calendar, Activity, Radio, Wifi, WifiOff } from "lucide-react";
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

const SENSOR_CONFIG = {
  pm25: {
    label: "PM2.5",
    color: "#8B5CF6",
    unit: "μg/m³",
    description: "Particulate Matter",
    min: 5, // Batas bawah simulasi
    max: 60, // Batas atas simulasi
  },
  pm10: {
    label: "PM10",
    color: "#3B82F6",
    unit: "μg/m³",
    description: "Particulate Matter",
    min: 10,
    max: 80,
  },
  co: {
    label: "CO",
    color: "#F59E0B",
    unit: "ppm",
    description: "Carbon Monoxide",
    min: 1,
    max: 15,
  },
  voc: {
    label: "VOC",
    color: "#10B981",
    unit: "ppm",
    description: "Volatile Organic Compounds",
    min: 0.1,
    max: 8,
  },
} as const;

type SensorType = keyof typeof SENSOR_CONFIG;

export function ChartSection() {
  const [timeRange, setTimeRange] = useState<"1h" | "3d" | "7d">("1h"); // Default ke 1h agar langsung kelihatan live
  const [selectedSensor, setSelectedSensor] = useState<SensorType>("pm25");
  const [data, setData] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // Ref untuk menyimpan timer interval agar bisa dibersihkan
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const firebaseCleanupRef = useRef<(() => void) | null>(null);

  // 1. Inisialisasi Data Awal saat Time Range berubah
  useEffect(() => {
    const daysMap = { "1h": 0.04, "3d": 3, "7d": 7 };
    
    // Try to fetch from Firebase first, fallback to simulated data
    const loadData = async () => {
      try {
        // For all time ranges, try Firebase first
        const firebaseData = await getHistoricalData(Math.ceil(daysMap[timeRange]));
        
        if (firebaseData.length > 0) {
          // Use Firebase data if available
          const processedData = timeRange === "1h" 
            ? firebaseData.slice(-50) // Ambil 50 data terakhir untuk 1h
            : firebaseData.filter((_, i) => i % 6 === 0).slice(-50);
          setData(processedData);
          setIsFirebaseConnected(true);
          return;
        }
      } catch (error) {
        console.warn("Failed to load Firebase data, using simulated:", error);
      }
      
      // Fallback to simulated data
      setIsFirebaseConnected(false);
      const initialData = generateHistoricalData(Math.ceil(daysMap[timeRange]));
      const processedData =
        timeRange === "1h"
          ? initialData.slice(-30)
          : initialData.filter((_, i) => i % 6 === 0).slice(-50);
      setData(processedData);
    };
    
    loadData();
  }, [timeRange]);

  // 2. Real-Time Update (Firebase or Simulated)
  useEffect(() => {
    // Cleanup previous listeners/intervals
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (firebaseCleanupRef.current) firebaseCleanupRef.current();

    // Only activate 'Live' mode for "1h" range
    if (timeRange === "1h") {
      // Try Firebase real-time first
      try {
        firebaseCleanupRef.current = listenToSensorData(
          (sensorData) => {
            setIsFirebaseConnected(true);
            setData((prevData) => {
              if (prevData.length === 0) return prevData;

              const newPoint = {
                timestamp: sensorData.timestamp.getTime(),
                pm25: sensorData.pm25,
                pm10: sensorData.pm10,
                co: sensorData.co,
                voc: sensorData.voc,
                suhu: sensorData.suhu,
              };

              // Add new point, remove oldest to maintain window size
              return [...prevData.slice(1), newPoint];
            });
          },
          (error) => {
            console.error("Firebase real-time error:", error);
            setIsFirebaseConnected(false);
            // Fall back to simulated on error
            startSimulatedUpdates();
          }
        );
      } catch (error) {
        console.warn("Failed to start Firebase listener, using simulated:", error);
        setIsFirebaseConnected(false);
        startSimulatedUpdates();
      }
    }

    function startSimulatedUpdates() {
      intervalRef.current = setInterval(() => {
        setData((prevData) => {
          if (prevData.length === 0) return prevData;

          const lastPoint = prevData[prevData.length - 1];
          const config = SENSOR_CONFIG[selectedSensor];

          let newValue = lastPoint[selectedSensor] + (Math.random() - 0.5) * 5;
          newValue = Math.max(config.min, Math.min(newValue, config.max));

          const newPoint = {
            ...lastPoint,
            timestamp: Date.now(),
            [selectedSensor]: newValue,
            pm25:
              selectedSensor === "pm25"
                ? newValue
                : Math.max(5, lastPoint.pm25 + (Math.random() - 0.5) * 2),
            co:
              selectedSensor === "co"
                ? newValue
                : Math.max(1, lastPoint.co + (Math.random() - 0.5) * 0.5),
            suhu: lastPoint.suhu || 25 + (Math.random() - 0.5) * 3,
          };

          return [...prevData.slice(1), newPoint];
        });
      }, 2000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (firebaseCleanupRef.current) firebaseCleanupRef.current();
    };
  }, [timeRange, selectedSensor]);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      let exportData: any[] = [];
      
      // Ambil data sesuai time range yang dipilih
      if (timeRange === "1h") {
        // Menggunakan data state secara langsung karena berisi data realtime murni
        exportData = [...data];
      } else {
        // Untuk historical data, ambil fresh dari Firebase
        const daysMap = { "3d": 3, "7d": 7 };
        try {
          const firebaseData = await getHistoricalData(daysMap[timeRange as "3d" | "7d"]);
          if (firebaseData.length > 0) {
            exportData = firebaseData.map(item => ({
              timestamp: item.timestamp.getTime(),
              pm25: item.pm25,
              pm10: item.pm10,
              co: item.co,
              voc: item.voc,
              suhu: item.suhu,
            }));
          } else {
            // Fallback ke simulated data jika Firebase kosong
            exportData = generateHistoricalData(daysMap[timeRange as "3d" | "7d"]).map(item => ({
              timestamp: item.timestamp.getTime(),
              pm25: item.pm25,
              pm10: item.pm10,
              co: item.co,
              voc: item.voc,
              suhu: item.suhu,
            }));
          }
        } catch (error) {
          console.warn("Failed to get Firebase data for export, using simulated:", error);
          // Fallback ke simulated data
          exportData = generateHistoricalData(daysMap[timeRange as "3d" | "7d"]).map(item => ({
            timestamp: item.timestamp.getTime(),
            pm25: item.pm25,
            pm10: item.pm10,
            co: item.co,
            voc: item.voc,
            suhu: item.suhu,
          }));
        }
      }

      // 1. Deduplikasi data berdasarkan timestamp persis untuk menghindari input berulang
      const uniqueDataMap = new Map();
      exportData.forEach((item) => {
        uniqueDataMap.set(item.timestamp, item);
      });
      exportData = Array.from(uniqueDataMap.values());

      // 2. Sort data by timestamp ascending
      exportData.sort((a, b) => a.timestamp - b.timestamp);

      // Generate CSV content
      const csvContent = [
        ["Timestamp", "PM2.5", "PM10", "CO", "VOC", "Suhu", "Data Source"],
        ...exportData.map((row) => [
          new Date(row.timestamp).toISOString(),
          (row.pm25 || 0).toFixed(2),
          (row.pm10 || 0).toFixed(2),
          (row.co || 0).toFixed(2),
          (row.voc || 0).toFixed(2),
          (row.suhu || 0).toFixed(2),
          isFirebaseConnected ? "Firebase" : "Simulated",
        ]),
      ]
        .map((row) => row.join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `airguard-${timeRange}-data-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const config = SENSOR_CONFIG[selectedSensor];

  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeRange === "1h") {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    return date.toLocaleDateString([], { weekday: "short", day: "numeric" });
  };

  return (
    <Card className="p-6 md:p-8 bg-card/60 backdrop-blur-md border border-border/50 shadow-lg col-span-full rounded-3xl">
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground text-xl tracking-tight">
              Real-Time Monitoring
            </h3>

            {/* LIVE INDICATOR */}
            {timeRange === "1h" && (
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                isFirebaseConnected 
                  ? "bg-green-500/10 border-green-500/20" 
                  : "bg-red-500/10 border-red-500/20"
              }`}>
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isFirebaseConnected ? "bg-green-500" : "bg-red-500"
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    isFirebaseConnected ? "bg-green-500" : "bg-red-500"
                  }`}></span>
                </span>
                <span className={`text-[10px] font-bold tracking-widest ${
                  isFirebaseConnected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                }`}>
                  {isFirebaseConnected ? "LIVE" : "SIMULATED"}
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Grafik pergerakan sensor{" "}
            <span className="font-semibold text-foreground">
              {config.description}
            </span>
          </p>
        </div>
        <Button
          onClick={handleExportData}
          disabled={isExporting}
          variant="outline"
          size="sm"
          className="text-xs font-semibold border-primary/20 hover:bg-primary/5 hover:text-primary">
          <Download className="w-3 h-3 mr-2" />
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* --- CONTROLS SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sensor Selector */}
        <div>
          <p className="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-wider">
            Parameter Sensor
          </p>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(SENSOR_CONFIG) as SensorType[]).map((sensor) => (
              <Button
                key={sensor}
                variant={selectedSensor === sensor ? "default" : "secondary"}
                size="sm"
                onClick={() => setSelectedSensor(sensor)}
                className={`text-xs font-semibold transition-all duration-300 ${
                  selectedSensor === sensor
                    ? "shadow-md scale-105"
                    : "opacity-70 hover:opacity-100"
                }`}
                style={
                  selectedSensor === sensor
                    ? {
                        backgroundColor: SENSOR_CONFIG[sensor].color,
                        borderColor: SENSOR_CONFIG[sensor].color,
                      }
                    : {}
                }>
                {SENSOR_CONFIG[sensor].label}
              </Button>
            ))}
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="lg:text-right">
          <p className="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-1 lg:justify-end">
            <Calendar className="w-3 h-3" /> Rentang Waktu
          </p>
          <div className="flex gap-2 flex-wrap lg:justify-end">
            {(["1h", "3d", "7d"] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? "outline" : "ghost"}
                size="sm"
                onClick={() => setTimeRange(range)}
                className={`text-xs font-semibold border ${
                  timeRange === range
                    ? "border-primary/50 bg-primary/5 text-primary"
                    : "border-transparent hover:bg-secondary"
                }`}>
                {range === "1h"
                  ? "LIVE (1 Jam)"
                  : range === "3d"
                  ? "3 Hari"
                  : "7 Hari"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* --- CHART AREA --- */}
      <div className="h-[350px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient
                id={`colorGradient-${selectedSensor}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1">
                <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={config.color} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(var(--border))"
              vertical={false}
              opacity={0.4}
            />

            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              stroke="oklch(var(--muted-foreground))"
              style={{ fontSize: "11px", fontFamily: "var(--font-sans)" }}
              tickLine={false}
              axisLine={false}
              dy={10}
              // Agar X-Axis tidak berantakan saat live
              interval="preserveStartEnd"
              minTickGap={30}
            />

            <YAxis
              stroke="oklch(var(--muted-foreground))"
              style={{ fontSize: "11px", fontFamily: "var(--font-sans)" }}
              tickLine={false}
              axisLine={false}
              dx={-10}
              domain={[config.min, "auto"]} // Agar sumbu Y dinamis tapi tidak terlalu loncat
            />

            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(var(--card))",
                border: "1px solid oklch(var(--border))",
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                color: "oklch(var(--foreground))",
                fontSize: "12px",
              }}
              itemStyle={{ color: config.color, fontWeight: 600 }}
              labelFormatter={(ts) =>
                new Date(ts).toLocaleString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })
              }
              formatter={(value: any) => [
                `${value.toFixed(1)} ${config.unit}`,
                config.label,
              ]}
            />

            <Area
              type="monotone"
              dataKey={selectedSensor}
              stroke={config.color}
              strokeWidth={3}
              fillOpacity={1}
              fill={`url(#colorGradient-${selectedSensor})`}
              // Penting untuk animasi smooth saat data baru masuk:
              isAnimationActive={true}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
