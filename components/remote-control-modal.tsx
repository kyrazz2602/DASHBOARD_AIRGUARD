"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Target, RotateCcw, Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { setGerakCommand } from "@/lib/firebase-data";

// ── Color Palette ─────────────────────────────────────────────────────────────
const C = {
  bg: "#0B0E14",
  bgAlt: "#0D1117",
  fill: "#152238",
  fillAct: "#1A2B42",
  neon: "#00F2FF",
  neonAct: "#00D1FF",
  stop: "#FF3B30",
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
}

// ── CSS 3D Radar ──────────────────────────────────────────────────────────────
function RadarView({
  posX,
  posY,
  activeDir,
  className,
  style,
}: {
  posX: number;
  posY: number;
  activeDir: string | null;
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
  const [activeDir, setActiveDir] = useState<
    "up" | "down" | "left" | "right" | null
  >(null);
  const [isSyncing, setIsSyncing] = useState(false);

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

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    activeDirRef.current = null;
    setActiveDir(null);
    setPosition({ x: 0, y: 0 });
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
      if (e.repeat) return; // ignore key-repeat — RAF handles continuous movement
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === " ") {
        handleReset();
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
  }, [isOpen, handlePressStart, handlePressEnd, handleReset, onClose]);

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
          {/* Sync indicator */}
          {isSyncing && (
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: C.neon }}
            />
          )}
          {/* Active direction label */}
          {activeDir && (
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded"
              style={{ background: `${C.neon}18`, color: C.neon }}
            >
              {GERAK_MAP[activeDir]}
            </span>
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
          activeDir={activeDir}
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
            Tahan untuk bergerak
          </p>

          <DPad
            onPressStart={handlePressStart}
            onPressEnd={handlePressEnd}
            activeDir={activeDir}
          />

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
            <span>Tahan Arrow Keys / WASD</span>
          </div>
        </div>
      </div>
    </div>
  );
}
