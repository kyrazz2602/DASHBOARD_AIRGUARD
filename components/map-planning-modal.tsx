"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, X, Navigation, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendNavGoal, setNavigationMode } from "@/lib/firebase-data";

const C = {
  bg: "#0B0E14",
  bgAlt: "#0D1117",
  fill: "#152238",
  neon: "#00F2FF",
  redNeon: "#FF0055",
} as const;

interface MapPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MapPlanningModal({ isOpen, onClose }: MapPlanningModalProps) {
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sentStatus, setSentStatus] = useState<"idle" | "success" | "error">("idle");
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset states and set autonomous mode when opened
  useEffect(() => {
    if (isOpen) {
      setNavigationMode(true).catch((err) => {
        console.error("[MapPlanning] Failed to set autonomous navigation mode:", err);
      });
    } else {
      setSelectedPoint(null);
      setSentStatus("idle");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Grid bounds in meters
  const MIN_METERS = -5.0;
  const MAX_METERS = 5.0;
  const RANGE = MAX_METERS - MIN_METERS;

  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert pixel to percentage
    const pctX = clickX / rect.width;
    const pctY = clickY / rect.height;

    // Convert percentage to meter coordinates
    // X goes from left (MIN) to right (MAX)
    // Y goes from top (MAX) to bottom (MIN) in standard Cartesian layout
    const xMeters = MIN_METERS + pctX * RANGE;
    const yMeters = MAX_METERS - pctY * RANGE;

    setSelectedPoint({
      x: Math.round(xMeters * 100) / 100,
      y: Math.round(yMeters * 100) / 100,
    });
    setSentStatus("idle");
  };

  const handleSendGoal = async () => {
    if (!selectedPoint) return;
    setIsSending(true);
    setSentStatus("idle");
    try {
      await sendNavGoal(selectedPoint.x, selectedPoint.y);
      setSentStatus("success");
    } catch (err) {
      console.error("Failed to send nav goal:", err);
      setSentStatus("error");
    } finally {
      setIsSending(false);
    }
  };

  // Convert meters back to percentages for plotting on the UI
  const getDotStyle = (x: number, y: number) => {
    const left = ((x - MIN_METERS) / RANGE) * 100;
    const top = ((MAX_METERS - y) / RANGE) * 100;
    return {
      left: `${left}%`,
      top: `${top}%`,
    };
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: C.bg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0 backdrop-blur-md"
        style={{
          background: `${C.bgAlt}ee`,
          borderBottom: `1px solid ${C.neon}22`,
        }}
      >
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4" style={{ color: C.neon }} />
          <span
            className="font-bold tracking-wider text-sm uppercase"
            style={{ color: C.neon }}
          >
            A* Map Planning — Rute Otomatis (Nav2)
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: `${C.neon}88` }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.neon)}
          onMouseLeave={(e) => (e.currentTarget.style.color = `${C.neon}88`)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Interactive Grid Map */}
        <div className="flex-1 w-full min-h-[45vh] lg:min-h-0 relative flex items-center justify-center p-6 select-none bg-slate-950/20">
          <div className="relative w-full max-w-[480px] aspect-square rounded-2xl border border-slate-800 bg-black/40 overflow-hidden shadow-2xl">
            {/* Grid Pattern */}
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0, 242, 255, 0.05) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0, 242, 255, 0.05) 1px, transparent 1px)
                `,
                backgroundSize: "10% 10%",
              }}
            />

            {/* Axes */}
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-slate-800/80" />
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-slate-800/80" />

            {/* Clickable Area */}
            <div
              ref={containerRef}
              onClick={handleGridClick}
              className="absolute inset-0 cursor-crosshair z-10"
            />

            {/* Grid Labels (Meters) */}
            <span className="absolute top-2 right-2 text-[9px] font-mono text-slate-600">Y+ (+5m)</span>
            <span className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-600">Y- (-5m)</span>
            <span className="absolute bottom-2 left-2 text-[9px] font-mono text-slate-600">X- (-5m)</span>
            <span className="absolute top-2 left-2 text-[9px] font-mono text-slate-600">X+ (+5m)</span>

            {/* Center (0,0) Marker */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-700/80 border border-slate-500" />

            {/* Target Pin Marker */}
            {selectedPoint && (
              <div
                className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-300"
                style={getDotStyle(selectedPoint.x, selectedPoint.y)}
              >
                <div
                  className="absolute inset-0 rounded-full animate-ping opacity-60"
                  style={{ background: C.redNeon }}
                />
                <MapPin className="w-4 h-4 filter drop-shadow-[0_0_8px_rgba(255,0,85,0.8)]" style={{ color: C.redNeon }} />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div
          className="px-5 py-6 flex flex-col justify-between gap-6 shrink-0 lg:w-80 border-t lg:border-t-0 lg:border-l"
          style={{ background: C.bgAlt, borderColor: `${C.neon}18` }}
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Navigasi Rute Otomatis</h3>
              <p className="text-xs text-muted-foreground">
                Tentukan target koordinat perjalanan robot pada area 2D di sebelah kiri.
              </p>
            </div>

            {/* Coordinates Display Card */}
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-mono">Coordinate (Meter)</span>
                <span className="text-[10px] uppercase font-bold text-slate-500">Origin: (0.0, 0.0)</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 rounded-lg bg-black/30 border border-slate-800">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Target X</p>
                  <p className="text-base font-mono font-bold text-white">
                    {selectedPoint ? `${selectedPoint.x.toFixed(2)} m` : "—"}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-black/30 border border-slate-800">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase">Target Y</p>
                  <p className="text-base font-mono font-bold text-white">
                    {selectedPoint ? `${selectedPoint.y.toFixed(2)} m` : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Instruction Alert */}
            <div className="p-3.5 rounded-lg bg-slate-950 text-[10px] leading-relaxed text-slate-400 border border-slate-800 space-y-1.5 animate-in fade-in duration-200">
              <p className="font-bold text-slate-300 mb-1">💡 Petunjuk Penggunaan:</p>
              <ol className="list-decimal list-inside space-y-1 text-justify">
                <li>Klik pada area grid koordinat di sebelah kiri untuk meletakkan target perjalanan (tanda Pin merah).</li>
                <li>Target koordinat (X, Y) dalam meter akan terhitung otomatis berdasarkan pusat titik awal (0.0, 0.0).</li>
                <li>Klik tombol <span className="text-cyan-400 font-semibold">Kirim Navigasi (A*)</span> di bawah untuk mengirim data ke robot (Orange Pi). Robot akan otomatis merencanakan rute terpendek yang aman menghindari rintangan (menggunakan ROS 2 Nav2).</li>
              </ol>
            </div>
          </div>

          <div className="space-y-3">
            {/* Status alerts */}
            {sentStatus === "success" && (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 text-emerald-400 text-xs font-mono text-center">
                ✓ Navigasi terkirim ke Orange Pi!
              </div>
            )}
            {sentStatus === "error" && (
              <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-xs font-mono text-center">
                ✗ Gagal mengirim koordinat.
              </div>
            )}

            {/* Action buttons */}
            <button
              onClick={handleSendGoal}
              disabled={!selectedPoint || isSending}
              className={cn(
                "w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm tracking-wide transition-all duration-200 border-0",
                selectedPoint
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/25"
                  : "bg-slate-800 text-slate-500 cursor-not-allowed"
              )}
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Mengirim Rute...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 fill-current" />
                  Kirim Navigasi (A*)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
