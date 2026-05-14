"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Target, RotateCcw, Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { setGerakCommand } from "@/lib/firebase-data";

// ── Color Palette ─────────────────────────────────────────────────────────────
const C = {
  bg: "#0B0E14", // deep background
  bgAlt: "#0D1117", // panel / header
  fill: "#152238", // button fill
  fillAct: "#1A2B42", // button fill active
  neon: "#00F2FF", // primary neon cyan
  neonAct: "#00D1FF", // neon active
  stop: "#FF3B30", // emergency stop
} as const;

interface RemoteControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── CSS 3D Radar ──────────────────────────────────────────────────────────────
function RadarView({
  posX,
  posY,
  className,
  style,
}: {
  posX: number;
  posY: number;
  nx?: number;
  ny?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const dotX = 50 + posX * 0.35;
  const dotY = 50 + posY * 0.35;

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
          className="absolute w-4 h-4 rounded-full border-2 border-white z-10 transition-all duration-300 ease-out"
          style={{
            left: `${dotX}%`,
            top: `${dotY}%`,
            transform: "translate(-50%, -50%)",
            background: C.neon,
            boxShadow: `0 0 14px ${C.neon}, 0 0 28px ${C.neon}88`,
          }}
        >
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-50"
            style={{ background: C.neon }}
          />
        </div>
      </div>

      <div
        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 font-mono text-[10px] whitespace-nowrap"
        style={{ color: `${C.neon}99` }}
      >
        X: {(posX * -0.782655510043378).toFixed(12)} | Y:{" "}
        {(posY * -0.0573081694326074).toFixed(12)} | Z: 12.345678901235
      </div>
    </div>
  );
}

// ── D-Pad ─────────────────────────────────────────────────────────────────────
// Only 4 arc buttons (N/E/S/W) — no side paddles, no center circle
function DPad({
  onMove,
  activeDir,
}: {
  onMove: (dir: "up" | "down" | "left" | "right") => void;
  activeDir: string | null;
}) {
  const SIZE = 200;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const outerR = 90;
  const innerR = 54;
  const GAP = 8; // degrees gap between segments

  const isAct = (d: string) => activeDir === d;

  // polar → cartesian (0° = top, clockwise)
  const pt = (r: number, deg: number) => ({
    x: cx + r * Math.sin((deg * Math.PI) / 180),
    y: cy - r * Math.cos((deg * Math.PI) / 180),
  });

  // Annular arc (donut slice) path
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

  // Small filled triangle pointing in the direction
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
      className="relative select-none touch-none"
      style={{ width: SIZE, height: SIZE }}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
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
        </defs>

        {/* Outer decorative ring */}
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

        {/* 4 directional arc buttons */}
        {dirArcs.map(({ dir, mid }) => {
          const act = isAct(dir);
          const a1 = mid - 50 + GAP;
          const a2 = mid + 50 - GAP;
          const lp = pt((innerR + outerR) / 2, mid);
          const stroke = act ? C.neonAct : C.neon;
          return (
            <g
              key={dir}
              onClick={() => onMove(dir)}
              style={{ cursor: "pointer" }}
              filter={act ? "url(#glow-on)" : "url(#glow-idle)"}
            >
              <path
                d={arcPath(innerR, outerR, a1, a2)}
                fill={act ? C.fillAct : "url(#arc-fill)"}
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
}: RemoteControlModalProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [activeDir, setActiveDir] = useState<string | null>(null);
  const [joystickVec, setJoystickVec] = useState({ nx: 0, ny: 0 });
  const [isSyncing, setIsSyncing] = useState(false);

  const clamp = (v: number) => Math.max(-100, Math.min(100, v));

  // Map D-Pad direction → Firebase gerak command
  const GERAK_MAP: Record<"up" | "down" | "left" | "right", string> = {
    up: "MAJU",
    down: "MUNDUR",
    left: "KIRI",
    right: "KANAN",
  };

  // Debounce ref — kirim ke Firebase max 1x per 200ms
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendGerak = useCallback((gerak: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setIsSyncing(true);
        await setGerakCommand(gerak);
      } catch (err) {
        console.error("[RemoteControl] Failed to send gerak:", err);
      } finally {
        setIsSyncing(false);
      }
    }, 80);
  }, []);

  const move = useCallback(
    (dir: "up" | "down" | "left" | "right") => {
      setActiveDir(dir);
      const vecMap = {
        up: { nx: 0, ny: -1 },
        down: { nx: 0, ny: 1 },
        left: { nx: -1, ny: 0 },
        right: { nx: 1, ny: 0 },
      };
      setJoystickVec(vecMap[dir]);
      setTimeout(() => {
        setActiveDir(null);
        setJoystickVec({ nx: 0, ny: 0 });
      }, 150);

      // Update radar dot
      const STEP = 15;
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

      // Send to Firebase
      sendGerak(GERAK_MAP[dir]);
    },
    [sendGerak],
  );

  const handleReset = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setJoystickVec({ nx: 0, ny: 0 });
    setActiveDir("reset");
    setTimeout(() => setActiveDir(null), 200);
    // Stop movement
    sendGerak("DIAM");
  }, [sendGerak]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
        e.preventDefault();
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          move("up");
          break;
        case "ArrowDown":
        case "s":
        case "S":
          move("down");
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          move("left");
          break;
        case "ArrowRight":
        case "d":
        case "D":
          move("right");
          break;
        case "Escape":
          onClose();
          break;
        case " ":
          handleReset();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, move, onClose, handleReset]);

  if (!isOpen) return null;

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
          <Target className="w-4 h-4" style={{ color: C.neon }} />
          <span
            className="font-bold tracking-wider text-sm uppercase"
            style={{ color: C.neon }}
          >
            Remote Control
          </span>
          {isSyncing && (
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: C.neon }}
            />
          )}
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
        {/* Radar */}
        <RadarView
          posX={position.x}
          posY={position.y}
          nx={joystickVec.nx}
          ny={joystickVec.ny}
          className="flex-1 w-full min-h-[40vh] lg:min-h-0"
        />

        {/* Controls panel */}
        <div
          className="px-5 py-5 flex flex-col items-center justify-center gap-6 shrink-0 lg:w-72 lg:py-8"
          style={{ background: C.bgAlt, borderTop: `1px solid ${C.neon}18` }}
        >
          <p
            className="text-[11px] uppercase tracking-widest"
            style={{ color: `${C.neon}66` }}
          >
            Drag to navigate
          </p>

          <DPad onMove={move} activeDir={activeDir} />

          {/* STOP & RESET */}
          <div className="flex flex-col w-full gap-3">
            <button
              className="w-full h-11 flex items-center justify-center gap-2 rounded-md text-sm font-bold tracking-wider uppercase transition-all"
              style={{
                background: C.stop,
                color: "#fff",
                boxShadow: `0 0 16px ${C.stop}66`,
                border: `1px solid ${C.stop}`,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  `0 0 28px ${C.stop}99`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  `0 0 16px ${C.stop}66`;
              }}
              onClick={() => {
                handleReset();
                onClose();
              }}
            >
              <span className="w-2 h-2 rounded-full bg-white inline-block" />
              Stop
            </button>

            <button
              className="w-full h-11 flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all"
              style={{
                background: "transparent",
                color: `${C.neon}cc`,
                border: `1px solid ${C.neon}44`,
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = C.fill;
                el.style.borderColor = `${C.neon}99`;
                el.style.color = C.neon;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.background = "transparent";
                el.style.borderColor = `${C.neon}44`;
                el.style.color = `${C.neon}cc`;
              }}
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          {/* Keyboard hint */}
          <div
            className="flex items-center gap-2 text-[10px]"
            style={{ color: `${C.neon}33` }}
          >
            <Keyboard className="w-3 h-3" />
            <span>Arrow Keys / WASD supported</span>
          </div>
        </div>
      </div>
    </div>
  );
}
