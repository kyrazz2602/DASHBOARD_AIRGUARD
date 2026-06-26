"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Target, Keyboard, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { setGerakCommand, setNavigationMode, listenToDeviceStatus } from "@/lib/firebase-data";

// ── Color Palette ─────────────────────────────────────────────────────────────
const C = {
  bg: "#0B0E14",
  bgAlt: "#0D1117",
  fill: "#152238",
  fillAct: "#1A2B42",
  neon: "#00F2FF",
  neonAct: "#00D1FF",
} as const;

// D-Pad direction → Firebase gerak value
const GERAK_MAP: Record<"up" | "down" | "left" | "right", string> = {
  up: "MAJU",
  down: "MUNDUR",
  left: "KIRI",
  right: "KANAN",
};

interface RemoteControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToAuto?: () => void;
}

// ── CSS 3D Radar ──────────────────────────────────────────────────────────────
function RadarView({
  posX,
  posY,
  activeDir,
  deviceStatus,
  className,
  style,
}: {
  posX: number;
  posY: number;
  activeDir: string | null;
  deviceStatus: any;
  className?: string;
  style?: React.CSSProperties;
}) {
  const dotX = 50 + posX * 0.35;
  const dotY = 50 + posY * 0.35;

  // Continuous position update while a direction is held
  // (handled in parent via RAF, posX/posY already updated)

  return (
    <div
      className={cn("relative overflow-hidden select-none", className)}
      style={{ background: C.bg, perspective: "500px", ...style }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: "rotateX(40deg) scale(1.35) translateY(8%)",
          transformOrigin: "50% 55%",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.18,
            backgroundImage: `linear-gradient(${C.neon} 1px, transparent 1px), linear-gradient(90deg, ${C.neon} 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            backgroundPosition: "center",
          }}
        />
        <div
          className="absolute w-full h-[1px] top-1/2"
          style={{ background: `${C.neon}33` }}
        />
        <div
          className="absolute h-full w-[1px] left-1/2"
          style={{ background: `${C.neon}33` }}
        />

        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white z-10 ease-out"
          style={{
            left: `${dotX}%`,
            top: `${dotY}%`,
            transform: "translate(-50%, -50%)",
            background: C.neon,
            boxShadow: `0 0 14px ${C.neon}, 0 0 28px ${C.neon}88`,
            // Smooth when moving, instant when stopped
            transition: activeDir
              ? "left 0.1s linear, top 0.1s linear"
              : "left 0.3s ease-out, top 0.3s ease-out",
          }}
        >
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-50"
            style={{ background: C.neon }}
          />
        </div>
      </div>

      {/* Live Telemetry Display */}
      <div className="absolute top-3 left-3 lg:top-4 lg:left-auto lg:right-4 z-20 flex flex-col gap-2 p-3 rounded-xl bg-slate-950/85 border border-slate-800 text-[11px] font-mono text-slate-300 min-w-[140px] shadow-lg shadow-black/50 pointer-events-none">
        <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider border-b border-slate-800 pb-1 flex items-center justify-between">
          <span>Telemetri Gerak</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        </div>
        
        <div className="space-y-1.5 text-[10px]">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Arah Rill:</span>
            <span className="font-bold text-cyan-300">{deviceStatus?.gerak ?? "DIAM"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Status:</span>
            <span className={cn("font-bold", activeDir ? "text-emerald-400 animate-pulse" : "text-slate-400")}>
              {activeDir ? "BERGERAK" : "DIAM"}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-t border-slate-900 pt-1.5">
            <span className="text-slate-400">RPM Kiri:</span>
            <span className="font-bold text-cyan-300">{deviceStatus?.rpmKiri !== undefined ? deviceStatus.rpmKiri.toFixed(1) : "0.0"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">RPM Kanan:</span>
            <span className="font-bold text-cyan-300">{deviceStatus?.rpmKanan !== undefined ? deviceStatus.rpmKanan.toFixed(1) : "0.0"}</span>
          </div>
        </div>
      </div>

      {/* Compass Dial Indicator */}
      <div className="absolute bottom-3 right-3 lg:bottom-4 lg:right-4 z-20 flex flex-col items-center justify-center p-2 rounded-xl bg-slate-950/80 border border-slate-800 text-[10px] font-mono text-slate-300 shadow-lg shadow-black/50 pointer-events-none select-none">
        <div className="relative w-14 h-14 rounded-full border border-slate-850 flex items-center justify-center bg-black/40">
          <span className="absolute top-1 text-[7px] text-red-500 font-bold">N</span>
          <span className="absolute bottom-1 text-[7px] text-slate-500">S</span>
          <span className="absolute left-1 text-[7px] text-slate-500">W</span>
          <span className="absolute right-1 text-[7px] text-slate-500">E</span>
          
          {/* Compass needle */}
          <div 
            className="w-1.5 h-10 bg-gradient-to-b from-red-500 via-slate-300 to-slate-500 rounded transition-transform duration-300"
            style={{
              transform: `rotate(${
                deviceStatus?.gerak === "KIRI" ? -90 :
                deviceStatus?.gerak === "KANAN" ? 90 :
                deviceStatus?.gerak === "MUNDUR" ? 180 :
                0
              }deg)`
            }}
          />
        </div>
        <span className="mt-1 text-[8px] text-slate-400 uppercase tracking-widest font-semibold">Compass</span>
      </div>
    </div>
  );
}

// ── D-Pad ─────────────────────────────────────────────────────────────────────
function DPad({
  onPressStart,
  onPressEnd,
  activeDir,
}: {
  onPressStart: (dir: "up" | "down" | "left" | "right") => void;
  onPressEnd: () => void;
  activeDir: string | null;
}) {
  const SIZE = 200;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const outerR = 90;
  const innerR = 54;
  const GAP = 8;

  const isAct = (d: string) => activeDir === d;

  const pt = (r: number, deg: number) => ({
    x: cx + r * Math.sin((deg * Math.PI) / 180),
    y: cy - r * Math.cos((deg * Math.PI) / 180),
  });

  const arcPath = (r1: number, r2: number, a1: number, a2: number) => {
    const A = pt(r1, a1),
      B = pt(r1, a2);
    const Cv = pt(r2, a2),
      D = pt(r2, a1);
    const lg = a2 - a1 > 180 ? 1 : 0;
    return [
      `M ${A.x} ${A.y}`,
      `A ${r1} ${r1} 0 ${lg} 1 ${B.x} ${B.y}`,
      `L ${Cv.x} ${Cv.y}`,
      `A ${r2} ${r2} 0 ${lg} 0 ${D.x} ${D.y}`,
      "Z",
    ].join(" ");
  };

  const triPath = (
    dir: "up" | "down" | "left" | "right",
    x: number,
    y: number,
    s: number,
  ) => {
    switch (dir) {
      case "up":
        return `M ${x} ${y - s} L ${x + s * 0.8} ${y + s * 0.5} L ${x - s * 0.8} ${y + s * 0.5} Z`;
      case "down":
        return `M ${x} ${y + s} L ${x + s * 0.8} ${y - s * 0.5} L ${x - s * 0.8} ${y - s * 0.5} Z`;
      case "left":
        return `M ${x - s} ${y} L ${x + s * 0.5} ${y - s * 0.8} L ${x + s * 0.5} ${y + s * 0.8} Z`;
      case "right":
        return `M ${x + s} ${y} L ${x - s * 0.5} ${y - s * 0.8} L ${x - s * 0.5} ${y + s * 0.8} Z`;
    }
  };

  const dirArcs: { dir: "up" | "down" | "left" | "right"; mid: number }[] = [
    { dir: "up", mid: 0 },
    { dir: "right", mid: 90 },
    { dir: "down", mid: 180 },
    { dir: "left", mid: 270 },
  ];

  return (
    <div
      className="relative select-none touch-none w-[170px] h-[170px] lg:w-[200px] lg:h-[200px]"
    >
      <svg
        viewBox="0 0 200 200"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        <defs>
          <filter id="glow-idle" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-on" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="arc-fill" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor={C.fillAct} />
            <stop offset="100%" stopColor={C.fill} />
          </radialGradient>
          <radialGradient id="arc-fill-active" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#00F2FF" stopOpacity="0.45" />
            <stop offset="100%" stopColor={C.fillAct} />
          </radialGradient>
        </defs>

        <circle
          cx={cx}
          cy={cy}
          r={outerR + 1}
          fill="none"
          stroke={C.neon}
          strokeWidth="1"
          opacity="0.2"
          filter="url(#glow-idle)"
        />

        {dirArcs.map(({ dir, mid }) => {
          const act = isAct(dir);
          const a1 = mid - 50 + GAP;
          const a2 = mid + 50 - GAP;
          const lp = pt((innerR + outerR) / 2, mid);
          const stroke = act ? C.neonAct : C.neon;
          return (
            <g
              key={dir}
              // Press & hold — pointer events for touch + mouse
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                onPressStart(dir);
              }}
              onPointerUp={onPressEnd}
              onPointerCancel={onPressEnd}
              // Prevent context menu on long-press mobile
              onContextMenu={(e) => e.preventDefault()}
              style={{ cursor: "pointer", userSelect: "none" }}
              filter={act ? "url(#glow-on)" : "url(#glow-idle)"}
            >
              {/* Invisible wider hit path to expand touch target size (covers 29px-105px range) */}
              <path
                d={arcPath(29, 105, a1 - 4, a2 + 4)}
                fill="transparent"
                style={{ cursor: "pointer" }}
              />
              <path
                d={arcPath(innerR, outerR, a1, a2)}
                fill={act ? "url(#arc-fill-active)" : "url(#arc-fill)"}
                stroke={stroke}
                strokeWidth={act ? "2.4" : "2"}
              />
              <path
                d={triPath(dir, lp.x, lp.y, 5)}
                fill={stroke}
                style={{ pointerEvents: "none" }}
              />
            </g>
          );
        })}
      </svg>


    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function RemoteControlModal({
  isOpen,
  onClose,
  onSwitchToAuto,
}: RemoteControlModalProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [activeDir, setActiveDir] = useState<
    "up" | "down" | "left" | "right" | null
  >(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Status state from Firebase
  const [deviceStatus, setDeviceStatus] = useState<{
    kipas: string;
    gerak: string;
    rpmKiri: number;
    rpmKanan: number;
  } | null>(null);

  // Initialize manual mode and subscribe to status
  useEffect(() => {
    if (!isOpen) return;

    // Set robot to manual mode when remote control is opened
    setNavigationMode(false).catch((error) => {
      console.error("[RemoteControl] Failed to set manual navigation mode:", error);
    });

    // Subscribe to actual robot device status (RPM and movement)
    const unsubscribeStatus = listenToDeviceStatus(
      (status) => {
        setDeviceStatus(status);
      },
      (error) => {
        console.error("Firebase Device Status error:", error);
      }
    );

    return () => {
      unsubscribeStatus();
    };
  }, [isOpen]);

  const clamp = (v: number) => Math.max(-100, Math.min(100, v));

  // Refs to avoid stale closures in RAF
  const activeDirRef = useRef<"up" | "down" | "left" | "right" | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSendRef = useRef<number>(0);

  // ── Send gerak to Firebase (throttled to 1x per 100ms) ───────────────────
  const sendGerak = useCallback(async (gerak: string) => {
    const now = Date.now();
    if (now - lastSendRef.current < 100) return;
    lastSendRef.current = now;
    try {
      setIsSyncing(true);
      await setGerakCommand(gerak);
    } catch (err) {
      console.error("[RemoteControl] Failed to send gerak:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // ── RAF loop: move dot + send Firebase while held ─────────────────────────
  useEffect(() => {
    const STEP = 0.8; // pixels per frame at 60fps

    const loop = () => {
      const dir = activeDirRef.current;
      if (dir) {
        setPosition((prev) => {
          switch (dir) {
            case "up":
              return { ...prev, y: clamp(prev.y - STEP) };
            case "down":
              return { ...prev, y: clamp(prev.y + STEP) };
            case "left":
              return { ...prev, x: clamp(prev.x - STEP) };
            case "right":
              return { ...prev, x: clamp(prev.x + STEP) };
          }
        });
        // Throttled Firebase send
        sendGerak(GERAK_MAP[dir]);
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [sendGerak]);

  // ── Press start ───────────────────────────────────────────────────────────
  const handlePressStart = useCallback(
    (dir: "up" | "down" | "left" | "right") => {
      activeDirRef.current = dir;
      setActiveDir(dir);
      // Send immediately on first press (don't wait for RAF throttle)
      setGerakCommand(GERAK_MAP[dir]).catch(console.error);
    },
    [],
  );

  // ── Press end → send DIAM ─────────────────────────────────────────────────
  const handlePressEnd = useCallback(() => {
    if (!activeDirRef.current) return;
    activeDirRef.current = null;
    setActiveDir(null);
    setGerakCommand("DIAM").catch(console.error);
  }, []);

  // ── Emergency STOP ────────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    activeDirRef.current = null;
    setActiveDir(null);
    setGerakCommand("DIAM").catch(console.error);
  }, []);

  // ── Keyboard: keydown = press start, keyup = press end ───────────────────
  useEffect(() => {
    if (!isOpen) return;

    const KEY_MAP: Record<string, "up" | "down" | "left" | "right"> = {
      ArrowUp: "up",
      w: "up",
      W: "up",
      ArrowDown: "down",
      s: "down",
      S: "down",
      ArrowLeft: "left",
      a: "left",
      A: "left",
      ArrowRight: "right",
      d: "right",
      D: "right",
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
        e.preventDefault();
      if (e.repeat) return;
      
      // Emergency STOP on Space
      if (e.key === " " || e.key === "Spacebar") {
        e.preventDefault();
        handleStop();
        return;
      }
      
      // Emergency STOP and close on Escape
      if (e.key === "Escape") {
        handleStop();
        onClose();
        return;
      }
      
      const dir = KEY_MAP[e.key];
      if (dir) handlePressStart(dir);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.key];
      if (dir && activeDirRef.current === dir) handlePressEnd();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [isOpen, handlePressStart, handlePressEnd, handleStop, onClose]);

  // ── Cleanup on close ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      activeDirRef.current = null;
      setActiveDir(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: C.bg }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 shrink-0 backdrop-blur-md"
        style={{
          background: `${C.bgAlt}ee`,
          borderBottom: `1px solid ${C.neon}22`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Target className="w-4 h-4 shrink-0" style={{ color: C.neon }} />
          <span
            className="font-bold tracking-wider text-xs lg:text-sm uppercase truncate hidden xs:inline"
            style={{ color: C.neon }}
          >
            Kontrol Manual
          </span>
          {/* Sync indicator */}
          {isSyncing && (
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0 bg-[#00F2FF]"
            />
          )}
          {/* Active direction label */}
          {activeDir && (
            <span
              className="text-[9px] lg:text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 bg-cyan-950 text-cyan-300 border border-cyan-800"
            >
              {GERAK_MAP[activeDir]}
            </span>
          )}
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-slate-800/80 text-[10px] font-bold uppercase tracking-wider">
          <button
            onClick={onSwitchToAuto}
            className="px-2.5 py-1 rounded text-slate-400 hover:text-slate-200 transition-all bg-transparent border-0 cursor-pointer font-bold uppercase"
          >
            Rute Otomatis (A*)
          </button>
          <span 
            className="px-2.5 py-1 rounded font-bold transition-all"
            style={{ background: C.fill, color: C.neon }}
          >
            Kontrol Manual
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-3 sm:p-1.5 min-h-[44px] sm:min-h-0 min-w-[44px] sm:min-w-0 flex items-center justify-center rounded-lg transition-colors shrink-0"
          style={{ color: `${C.neon}88` }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.neon)}
          onMouseLeave={(e) => (e.currentTarget.style.color = `${C.neon}88`)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Radar */}
        <RadarView
          posX={position.x}
          posY={position.y}
          activeDir={activeDir}
          deviceStatus={deviceStatus}
          className="flex-1 w-full min-h-[30vh] lg:min-h-0"
        />

        {/* Controls panel */}
        <div
          className="p-4 lg:px-5 lg:py-8 flex flex-col items-center justify-center gap-4 lg:gap-6 shrink-0 lg:w-72 border-t lg:border-t-0 lg:border-l"
          style={{ background: C.bgAlt, borderColor: `${C.neon}18` }}
        >
          <p
            className="text-[10px] lg:text-[11px] uppercase tracking-widest font-bold text-slate-200"
          >
            Tahan untuk bergerak
          </p>

          <DPad
            onPressStart={handlePressStart}
            onPressEnd={handlePressEnd}
            activeDir={activeDir}
          />

          {/* Keyboard hint */}
          <div
            className="hidden lg:flex flex-col gap-1 items-center text-[10px] text-center"
            style={{ color: `${C.neon}cc` }}
          >
            <div className="flex items-center gap-2 font-semibold">
              <Keyboard className="w-3.5 h-3.5" />
              <span>Tahan tombol arah Panah / WASD</span>
            </div>
            <span className="text-[9px] text-slate-400">Tekan [Space] untuk Stop Darurat</span>
          </div>
        </div>
      </div>
    </div>
  );
}
