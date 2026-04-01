"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Target,
  RotateCcw,
  Power,
  Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RemoteControlModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RemoteControlModal({
  isOpen,
  onClose,
}: RemoteControlModalProps) {
  // Batas pergerakan (dalam pixel atau unit)
  const MAX_RANGE = 100;
  const STEP = 20;

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [activeDirection, setActiveDirection] = useState<string | null>(null);

  // Logika pergerakan dengan batasan (Clamping)
  const move = useCallback((dir: "up" | "down" | "left" | "right") => {
    setActiveDirection(dir);
    setTimeout(() => setActiveDirection(null), 150); // Efek visual tombol ditekan

    setPosition((prev) => {
      const newPos = { ...prev };
      switch (dir) {
        case "up":
          newPos.y = Math.max(prev.y - STEP, -MAX_RANGE);
          break;
        case "down":
          newPos.y = Math.min(prev.y + STEP, MAX_RANGE);
          break;
        case "left":
          newPos.x = Math.max(prev.x - STEP, -MAX_RANGE);
          break;
        case "right":
          newPos.x = Math.min(prev.x + STEP, MAX_RANGE);
          break;
      }
      return newPos;
    });
  }, []);

  const handleReset = () => {
    setPosition({ x: 0, y: 0 });
    setActiveDirection("reset");
    setTimeout(() => setActiveDirection(null), 150);
  };

  // Event Listener untuk Keyboard (Arrow Keys / WASD)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Mencegah scrolling halaman saat tekan panah
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }

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
          onClose(); // Opsional: Tutup modal dengan Esc
          break;
        case " ": // Spasi untuk Reset
          handleReset();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, move, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm bg-background/80 backdrop-blur-xl border-primary/20 shadow-2xl">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-xl font-bold tracking-wider text-primary flex items-center justify-center gap-2">
            <Target className="w-5 h-5" /> REMOTE CONTROL
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Use keyboard arrows or buttons to move
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6">
          {/* --- RADAR VISUALIZER --- */}
          {/* Area kotak ini merepresentasikan area jangkauan */}
          <Card className="relative w-full aspect-video bg-black/40 border-primary/30 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
            {/* Grid Background Lines */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "linear-gradient(var(--primary) 1px, transparent 1px), linear-gradient(90deg, var(--primary) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                backgroundPosition: "center",
              }}
            />

            {/* Crosshair Center */}
            <div className="absolute w-full h-[1px] bg-primary/30" />
            <div className="absolute h-full w-[1px] bg-primary/30" />

            {/* The Moving Dot (Drone/Camera) */}
            <div
              className="absolute w-4 h-4 bg-primary rounded-full shadow-[0_0_15px_var(--primary)] transition-all duration-300 ease-out border-2 border-white z-10"
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
              }}>
              {/* Ripple Effect on the dot */}
              <div className="absolute inset-0 rounded-full animate-ping bg-primary opacity-50" />
            </div>

            {/* Coordinates Overlay */}
            <div className="absolute bottom-2 right-3 font-mono text-[10px] text-primary/80">
              X: {position.x} | Y: {position.y * -1}
            </div>
          </Card>

          {/* --- CONTROLLER PAD --- */}
          <div className="relative p-4 rounded-full bg-secondary/30 border border-white/5 shadow-xl">
            <div className="grid grid-cols-3 gap-2">
              {/* Row 1 */}
              <div />
              <ControlBtn
                icon={ChevronUp}
                isActive={activeDirection === "up"}
                onClick={() => move("up")}
              />
              <div />

              {/* Row 2 */}
              <ControlBtn
                icon={ChevronLeft}
                isActive={activeDirection === "left"}
                onClick={() => move("left")}
              />

              {/* Center / Reset Button */}
              <button
                onClick={handleReset}
                className={cn(
                  "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 shadow-inner",
                  "bg-gradient-to-b from-slate-800 to-black border border-white/10",
                  "hover:scale-105 active:scale-95",
                  activeDirection === "reset"
                    ? "text-primary shadow-[0_0_15px_var(--primary)]"
                    : "text-muted-foreground"
                )}>
                <RotateCcw className="w-5 h-5" />
              </button>

              <ControlBtn
                icon={ChevronRight}
                isActive={activeDirection === "right"}
                onClick={() => move("right")}
              />

              {/* Row 3 */}
              <div />
              <ControlBtn
                icon={ChevronDown}
                isActive={activeDirection === "down"}
                onClick={() => move("down")}
              />
              <div />
            </div>
          </div>

          {/* --- FOOTER ACTIONS --- */}
          <div className="flex w-full gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 gap-2 border-primary/20 hover:bg-primary/10"
              onClick={onClose}>
              Close
            </Button>
            <Button
              variant="destructive"
              className="flex-1 gap-2 shadow-[0_0_10px_rgba(220,38,38,0.3)]"
              onClick={() => {
                handleReset();
                onClose();
              }}>
              <Power className="w-4 h-4" />
              Emergency Stop
            </Button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <Keyboard className="w-3 h-3" />
            <span>Supports Arrow Keys & WASD</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper Component untuk Tombol agar kode lebih rapi
function ControlBtn({
  icon: Icon,
  onClick,
  isActive,
}: {
  icon: any;
  onClick: () => void;
  isActive: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-150",
        "bg-card border border-border shadow-sm hover:bg-primary/20 hover:border-primary/50",
        "active:scale-95 active:bg-primary/40",
        isActive
          ? "bg-primary text-primary-foreground scale-95 shadow-[0_0_10px_var(--primary)] border-primary"
          : "text-foreground"
      )}>
      <Icon className="w-8 h-8" />
    </button>
  );
}
