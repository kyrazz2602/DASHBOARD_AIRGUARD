"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { FanSpeed } from "@/lib/sensor-data";
import {
  listenToFanControl,
  setFanControl,
  FanControlState,
} from "@/lib/firebase-data";

interface UseFanControlReturn {
  fanSpeed: FanSpeed;
  isAutoMode: boolean;
  isSyncing: boolean;
  isFirebaseConnected: boolean;
  setManualSpeed: (speed: FanSpeed) => Promise<void>;
  setAutoMode: (auto: boolean) => Promise<void>;
}

/**
 * Hook untuk mengelola Fan Control yang tersinkronisasi dengan Firebase.
 *
 * - Membaca state awal dari Firebase saat mount
 * - Subscribe ke perubahan real-time dari Firebase
 * - Menulis setiap perubahan (kecepatan / auto mode) kembali ke Firebase
 */
export function useFanControl(
  recommendedSpeed: FanSpeed
): UseFanControlReturn {
  const [fanSpeed, setFanSpeedLocal] = useState<FanSpeed>("off");
  const [isAutoMode, setIsAutoModeLocal] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // Referensi agar auto-mode logic bisa diakses dalam listener Firebase
  const isAutoModeRef = useRef(isAutoMode);
  const recommendedSpeedRef = useRef(recommendedSpeed);

  useEffect(() => {
    isAutoModeRef.current = isAutoMode;
  }, [isAutoMode]);

  useEffect(() => {
    recommendedSpeedRef.current = recommendedSpeed;
  }, [recommendedSpeed]);

  // ── Subscribe ke Firebase ──────────────────────────────────────────────────
  useEffect(() => {
    const cleanup = listenToFanControl(
      (state: FanControlState) => {
        setIsFirebaseConnected(true);
        setIsAutoModeLocal(state.isAutoMode);
        setFanSpeedLocal(state.speed);
      },
      (error) => {
        console.error("[useFanControl] Firebase error:", error);
        setIsFirebaseConnected(false);
      }
    );

    return cleanup;
  }, []);

  // ── Auto Mode: tulis rekomendasi ke Firebase saat berubah ─────────────────
  useEffect(() => {
    if (!isAutoMode) return;
    if (fanSpeed === recommendedSpeed) return;

    // Update Firebase dengan recommended speed
    setFanControl({ speed: recommendedSpeed, isAutoMode: true }).catch(
      (err) => console.error("[useFanControl] Failed to sync auto speed:", err)
    );
  }, [isAutoMode, recommendedSpeed, fanSpeed]);

  // ── Handler: ubah kecepatan manual ────────────────────────────────────────
  const setManualSpeed = useCallback(
    async (speed: FanSpeed) => {
      if (isAutoModeRef.current) return; // guard: jangan tulis jika auto mode aktif
      setIsSyncing(true);
      try {
        await setFanControl({ speed, isAutoMode: false });
      } catch (err) {
        console.error("[useFanControl] Failed to set manual speed:", err);
      } finally {
        setIsSyncing(false);
      }
    },
    []
  );

  // ── Handler: toggle auto mode ──────────────────────────────────────────────
  const setAutoMode = useCallback(
    async (auto: boolean) => {
      setIsSyncing(true);
      try {
        const speedToWrite = auto
          ? recommendedSpeedRef.current
          : fanSpeed;
        await setFanControl({ speed: speedToWrite, isAutoMode: auto });
      } catch (err) {
        console.error("[useFanControl] Failed to toggle auto mode:", err);
      } finally {
        setIsSyncing(false);
      }
    },
    [fanSpeed]
  );

  return {
    fanSpeed,
    isAutoMode,
    isSyncing,
    isFirebaseConnected,
    setManualSpeed,
    setAutoMode,
  };
}
