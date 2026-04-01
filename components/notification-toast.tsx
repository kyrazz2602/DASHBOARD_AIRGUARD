"use client";

import { useEffect, useRef } from "react";
import {
  AlertTriangle,
  X,
  CheckCircle2,
  Info,
  AlertOctagon,
} from "lucide-react";

export type NotificationType = "success" | "info" | "warning" | "danger";

interface NotificationToastProps {
  message: string;
  type?: NotificationType; // Opsional, default ke 'info'
  visible: boolean;
  onClose: () => void;
  duration?: number; // Opsional, default 5000ms
}

// Konfigurasi Tampilan berdasarkan Tipe
const toastConfig = {
  success: {
    icon: CheckCircle2,
    styles:
      "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400",
    iconColor: "text-green-500",
  },
  info: {
    icon: Info,
    styles:
      "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
    iconColor: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    styles:
      "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400",
    iconColor: "text-yellow-500",
  },
  danger: {
    icon: AlertOctagon,
    styles: "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
    iconColor: "text-red-500",
  },
};

export function NotificationToast({
  message,
  type = "info",
  visible,
  onClose,
  duration = 5000,
}: NotificationToastProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fungsi untuk memulai timer
  const startTimer = () => {
    // Clear existing timer if any
    if (timerRef.current) clearTimeout(timerRef.current);

    // Set new timer
    timerRef.current = setTimeout(() => {
      onClose();
    }, duration);
  };

  // Fungsi untuk menghentikan timer (saat hover)
  const pauseTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  useEffect(() => {
    if (visible) {
      startTimer();
    } else {
      // Cleanup jika komponen disembunyikan manual
      if (timerRef.current) clearTimeout(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, duration, onClose]);

  if (!visible) return null;

  const config = toastConfig[type];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      className={`
        fixed top-20 right-4 z-50 w-full max-w-sm
        flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-md
        animate-in slide-in-from-right-5 fade-in duration-300
        ${config.styles}
      `}>
      <div className={`mt-0.5 shrink-0 ${config.iconColor}`}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-sm capitalize mb-0.5">{type}</h4>
        <p className="text-sm opacity-90 leading-relaxed break-words">
          {message}
        </p>
      </div>

      <button
        onClick={onClose}
        className="shrink-0 -mr-1 -mt-1 p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors opacity-60 hover:opacity-100"
        aria-label="Close notification">
        <X className="w-4 h-4" />
      </button>

      {/* Optional: Progress Bar Visual (Garis tipis di bawah) */}
      <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-current opacity-20 overflow-hidden">
        <div
          className="h-full w-full bg-current origin-left animate-[shrink_5s_linear_forwards]"
          style={{ animationDuration: `${duration}ms` }}
        />
      </div>
    </div>
  );
}
