"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Target, RotateCcw, Power, Keyboard, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface RemoteControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const JOYSTICK_RADIUS = 60;
const KNOB_RADIUS = 24;

// ── CSS 3D Radar (same look as before, just with perspective tilt) ────────────
function RadarView({
  posX,
  posY,
  className,
  style,
}: {
  posX: number;
  posY: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const dotX = 50 + posX * 0.35;
  const dotY = 50 + posY * 0.35;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-black/40 select-none",
        className,
      )}
      style={{ perspective: "500px", ...style }}
    >
      {/* 3D tilted plane — same grid/crosshair/dot as before */}
      <div
        className="absolute inset-0"
        style={{
          transform: "rotateX(40deg) scale(1.35) translateY(8%)",
          transformOrigin: "50% 55%",
        }}
      >
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            backgroundPosition: "center",
          }}
        />

        {/* Crosshair */}
        <div className="absolute w-full h-[1px] top-1/2 bg-primary/30" />
        <div className="absolute h-full w-[1px] left-1/2 bg-primary/30" />

        {/* Moving dot */}
        <div
          className="absolute w-4 h-4 bg-primary rounded-full border-2 border-white shadow-[0_0_15px_var(--primary)] z-10 transition-all duration-300 ease-out"
          style={{
            left: `${dotX}%`,
            top: `${dotY}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="absolute inset-0 rounded-full animate-ping bg-primary opacity-50" />
        </div>
      </div>

      {/* Coordinates — flat overlay, not inside the 3D plane */}
      <div className="absolute bottom-2 right-3 z-20 font-mono text-[10px] text-primary/80">
        X: {posX} | Y: {posY * -1}
      </div>
    </div>
  );
}

// ── Joystick ─────────────────────────────────────────────────────────────────
function Joystick({
  onMove,
  onRelease,
  size = "lg",
}: {
  onMove: (nx: number, ny: number) => void;
  onRelease: () => void;
  size?: "sm" | "lg";
}) {
  const radius = size === "lg" ? JOYSTICK_RADIUS : 48;
  const knob = size === "lg" ? KNOB_RADIUS : 20;
  const total = radius * 2 + knob * 2;

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const getCenter = () => {
    if (!ref.current) return { x: 0, y: 0 };
    const r = ref.current.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  const updateKnob = (
    cx: number,
    cy: number,
    center: { x: number; y: number },
  ) => {
    const dx = cx - center.x;
    const dy = cy - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);
    const ox = Math.cos(angle) * clamped;
    const oy = Math.sin(angle) * clamped;
    setOffset({ x: ox, y: oy });
    onMove(ox / radius, oy / radius);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    updateKnob(e.clientX, e.clientY, getCenter());
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!active) return;
    updateKnob(e.clientX, e.clientY, getCenter());
  };

  const handlePointerUp = () => {
    setActive(false);
    setOffset({ x: 0, y: 0 });
    onRelease();
  };

  return (
    <div
      ref={ref}
      className="relative rounded-full select-none touch-none cursor-grab active:cursor-grabbing"
      style={{
        width: total,
        height: total,
        background: "radial-gradient(circle at 40% 35%, #1e293b, #0f172a)",
        boxShadow: active
          ? "0 0 0 2px var(--primary), inset 0 2px 8px rgba(0,0,0,0.6), 0 0 20px color-mix(in srgb, var(--primary) 30%, transparent)"
          : "0 0 0 1px #334155, inset 0 2px 8px rgba(0,0,0,0.6)",
        transition: "box-shadow 0.15s",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Direction ticks */}
      {[0, 90, 180, 270].map((deg) => (
        <div
          key={deg}
          className="absolute rounded-full bg-primary/30"
          style={{
            width: 6,
            height: 6,
            left: "50%",
            top: "50%",
            transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-${radius + 2}px)`,
          }}
        />
      ))}

      {/* Knob */}
      <div
        className="absolute rounded-full"
        style={{
          width: knob * 2,
          height: knob * 2,
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
          transition: active
            ? "none"
            : "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          background: active
            ? "radial-gradient(circle at 35% 30%, #60a5fa, #1d4ed8)"
            : "radial-gradient(circle at 35% 30%, #475569, #1e293b)",
          boxShadow: active
            ? "0 0 16px rgba(59,130,246,0.8), 0 4px 12px rgba(0,0,0,0.5)"
            : "0 4px 12px rgba(0,0,0,0.5)",
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: "40%",
            height: "40%",
            top: "15%",
            left: "20%",
            background: "rgba(255,255,255,0.15)",
          }}
        />
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function RemoteControlModal({
  isOpen,
  onClose,
}: RemoteControlModalProps) {
  const isMobile = useIsMobile();

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [activeDir, setActiveDir] = useState<string | null>(null);
  const moveRef = useRef<{ nx: number; ny: number } | null>(null);
  const rafRef = useRef<number | null>(null);

  const clamp = (v: number) => Math.max(-100, Math.min(100, v));

  // Continuous movement loop
  useEffect(() => {
    const loop = () => {
      if (moveRef.current) {
        const { nx, ny } = moveRef.current;
        if (Math.abs(nx) > 0.05 || Math.abs(ny) > 0.05) {
          setPosition((p) => ({
            x: clamp(p.x + nx * 2.5),
            y: clamp(p.y + ny * 2.5),
          }));
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleJoystickMove = useCallback((nx: number, ny: number) => {
    moveRef.current = { nx, ny };
  }, []);
  const handleJoystickRelease = useCallback(() => {
    moveRef.current = null;
  }, []);

  const handleReset = () => {
    setPosition({ x: 0, y: 0 });
    moveRef.current = null;
    setActiveDir("reset");
    setTimeout(() => setActiveDir(null), 200);
  };

  // Keyboard
  const move = useCallback((dir: "up" | "down" | "left" | "right") => {
    setActiveDir(dir);
    setTimeout(() => setActiveDir(null), 150);
    const STEP = 15;
    setPosition((p) => {
      switch (dir) {
        case "up":
          return { ...p, y: clamp(p.y - STEP) };
        case "down":
          return { ...p, y: clamp(p.y + STEP) };
        case "left":
          return { ...p, x: clamp(p.x - STEP) };
        case "right":
          return { ...p, x: clamp(p.x + STEP) };
      }
    });
  }, []);

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
  }, [isOpen, move, onClose]);

  // ── MOBILE: fullscreen ────────────────────────────────────────────────────
  if (isMobile) {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span className="font-bold tracking-wider text-primary text-sm uppercase">
              Remote Control
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Radar — fills remaining space */}
        <RadarView
          posX={position.x}
          posY={position.y}
          className="flex-1 w-full"
        />

        {/* Controls */}
        <div className="bg-card border-t border-border px-5 py-5 flex flex-col items-center gap-4 shrink-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest">
            Drag to navigate
          </p>
          <Joystick
            onMove={handleJoystickMove}
            onRelease={handleJoystickRelease}
            size="lg"
          />
          <div className="flex w-full gap-3">
            <Button
              variant="outline"
              className="flex-1 h-10 gap-2"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
            <Button
              variant="destructive"
              className="flex-1 h-10 gap-2 shadow-[0_0_12px_rgba(220,38,38,0.4)]"
              onClick={() => {
                handleReset();
                onClose();
              }}
            >
              <Power className="w-4 h-4" />
              Stop
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── DESKTOP: dialog (original layout) ────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-background/80 backdrop-blur-xl border-primary/20 shadow-2xl">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-xl font-bold tracking-wider text-primary flex items-center justify-center gap-2">
            <Target className="w-5 h-5" /> REMOTE CONTROL
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Drag joystick or use Arrow Keys / WASD
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6">
          {/* 3D Radar */}
          <RadarView
            posX={position.x}
            posY={position.y}
            className="w-full rounded-xl overflow-hidden border border-primary/20"
            style={{ aspectRatio: "16/9" }}
          />

          {/* Joystick */}
          <div className="relative p-4 rounded-full bg-secondary/30 border border-white/5 shadow-xl">
            <Joystick
              onMove={handleJoystickMove}
              onRelease={handleJoystickRelease}
              size="sm"
            />
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
              "border-border hover:border-primary/40 hover:bg-primary/10",
              activeDir === "reset"
                ? "text-primary border-primary/40 bg-primary/10"
                : "text-muted-foreground",
            )}
          >
            <RotateCcw className="w-3 h-3" />
            Reset Position
          </button>

          {/* Footer */}
          <div className="flex w-full gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 border-primary/20 hover:bg-primary/10"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2 shadow-[0_0_10px_rgba(220,38,38,0.3)]"
              onClick={() => {
                handleReset();
                onClose();
              }}
            >
              <Power className="w-4 h-4" />
              Emergency Stop
            </Button>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <Keyboard className="w-3 h-3" />
            <span>Supports Arrow Keys & WASD</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
