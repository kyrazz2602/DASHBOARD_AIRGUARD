import { database, ref, onValue, off, set, get } from "./firebase";
import { SensorReading, HistoricalData, FanSpeed } from "./sensor-data";
import type { DataSnapshot } from "firebase/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FanControlState {
  speed: FanSpeed;
  isAutoMode: boolean;
  updatedAt?: number;
}

/**
 * Status perangkat yang dibaca dari /Status (ditulis oleh Arduino, read-only)
 */
export interface DeviceStatus {
  kipas: FanSpeed; // Status kipas aktual dari device
  gerak: string; // Arah gerak aktual ("MAJU", "MUNDUR", dll)
  rpmKanan: number;
  rpmKiri: number;
}

// ─── Paths ────────────────────────────────────────────────────────────────────

const UDARA_PATH = "Udara";
const STATUS_PATH = "Status";
const COMMAND_PATH = "Command";

// ─── Sensor Data ─────────────────────────────────────────────────────────────

/**
 * Subscribe ke perubahan data sensor real-time dari /Udara
 * Struktur Firebase:
 *   /Udara/{ PM25, PM10, CO, VOC, Suhu, Tegangan, Persentase }
 */
export function listenToSensorData(
  callback: (data: SensorReading) => void,
  onError?: (error: Error) => void,
): () => void {
  const sensorsRef = ref(database, UDARA_PATH);

  const listener = onValue(
    sensorsRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        const sensorReading: SensorReading = {
          pm25: Number(data.PM25) || 0,
          pm10: Number(data.PM10) || 0,
          co: Number(data.CO) || 0,
          voc: Number(data.VOC) || 0,
          suhu: Number(data.Suhu) || 25,
          tegangan: Number(data.Tegangan) || 0,
          battery: Number(data.Persentase) || 0,
          timestamp: new Date(),
        };
        callback(sensorReading);
      }
    },
    (error: Error) => {
      console.error("Firebase sensor error:", error);
      if (onError) onError(error);
    },
  );

  return () => off(sensorsRef, "value", listener);
}

// ─── Device Status (read-only, ditulis Arduino) ───────────────────────────────

/**
 * Subscribe ke /Status — status aktual perangkat dari Arduino
 * Struktur: /Status/{ kipas, gerak, rpmKanan, rpmKiri }
 */
export function listenToDeviceStatus(
  callback: (status: DeviceStatus) => void,
  onError?: (error: Error) => void,
): () => void {
  const statusRef = ref(database, STATUS_PATH);

  const listener = onValue(
    statusRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          kipas: (data.kipas as FanSpeed) || "off",
          gerak: String(data.gerak || "DIAM"),
          rpmKanan: Number(data.rpmKanan || 0),
          rpmKiri: Number(data.rpmKiri || 0),
        });
      }
    },
    (error: Error) => {
      console.error("Firebase status error:", error);
      if (onError) onError(error);
    },
  );

  return () => off(statusRef, "value", listener);
}

// ─── Fan / Command Control ────────────────────────────────────────────────────

/**
 * Menulis perintah ke /Command
 * Struktur: /Command/{ speed, gerak, isAutoMode, updatedAt }
 * - speed  : "OFF" | "LOW" | "NORMAL" | "HIGH"
 * - gerak  : "MAJU" | "MUNDUR" | "KIRI" | "KANAN" | "DIAM"
 */
export async function setFanControl(state: FanControlState): Promise<void> {
  const fanRef = ref(database, COMMAND_PATH);
  await set(fanRef, {
    speed: state.speed.toUpperCase(),
    gerak: "MAJU", // default gerak; diubah via remote control
    isAutoMode: state.isAutoMode,
    updatedAt: Date.now(),
  });
}

/**
 * Menulis perintah gerak ke /Command/gerak
 */
export async function setGerakCommand(gerak: string): Promise<void> {
  const gerakRef = ref(database, `${COMMAND_PATH}/gerak`);
  await set(gerakRef, gerak.toUpperCase());
}

/**
 * Membaca state command dari Firebase sekali (one-shot)
 */
export async function getFanControl(): Promise<FanControlState | null> {
  const fanRef = ref(database, COMMAND_PATH);
  const snapshot = await get(fanRef);
  if (snapshot.exists()) {
    const data = snapshot.val();
    return {
      speed: ((data.speed as string)?.toLowerCase() as FanSpeed) || "off",
      isAutoMode:
        data.isAutoMode !== undefined ? Boolean(data.isAutoMode) : true,
      updatedAt: data.updatedAt,
    };
  }
  return null;
}

/**
 * Subscribe ke perubahan /Command secara real-time
 */
export function listenToFanControl(
  callback: (state: FanControlState) => void,
  onError?: (error: Error) => void,
): () => void {
  const fanRef = ref(database, COMMAND_PATH);

  const listener = onValue(
    fanRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          speed: ((data.speed as string)?.toLowerCase() as FanSpeed) || "off",
          isAutoMode:
            data.isAutoMode !== undefined ? Boolean(data.isAutoMode) : true,
          updatedAt: data.updatedAt,
        });
      } else {
        callback({ speed: "off", isAutoMode: true });
      }
    },
    (error: Error) => {
      console.error("Firebase fan control error:", error);
      if (onError) onError(error);
    },
  );

  return () => off(fanRef, "value", listener);
}

// ─── Filter Status ────────────────────────────────────────────────────────────

export async function resetFilterStartDate(): Promise<void> {
  const filterRef = ref(database, `${COMMAND_PATH}/filterStartDate`);
  await set(filterRef, Date.now());
}

export function listenToFilterStartDate(
  callback: (timestamp: number | null) => void,
): () => void {
  const filterRef = ref(database, `${COMMAND_PATH}/filterStartDate`);

  const listener = onValue(
    filterRef,
    (snapshot: DataSnapshot) => {
      callback(snapshot.exists() ? Number(snapshot.val()) : null);
    },
    (error: Error) => {
      console.error("Firebase filter error:", error);
    },
  );

  return () => off(filterRef, "value", listener);
}

// ─── Historical Data ──────────────────────────────────────────────────────────

export async function getHistoricalData(
  days: number,
): Promise<HistoricalData[]> {
  return new Promise((resolve) => {
    const historyRef = ref(database, "history");

    onValue(
      historyRef,
      (snapshot: DataSnapshot) => {
        const data = snapshot.val();
        if (!data) {
          resolve([]);
          return;
        }

        const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;
        const historicalData: HistoricalData[] = [];

        Object.entries(data).forEach(([timestamp, values]: [string, any]) => {
          const ts = Number(timestamp);
          if (ts >= cutoffTime) {
            historicalData.push({
              timestamp: new Date(ts),
              pm25: Number(values.pm25) || 0,
              pm10: Number(values.pm10) || 0,
              co: Number(values.co) || 0,
              voc: Number(values.voc) || 0,
              suhu: Number(values.suhu) || 0,
              tegangan: Number(values.tegangan) || 0,
              battery: Number(values.battery) || 0,
            });
          }
        });

        historicalData.sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );
        resolve(historicalData);
      },
      (error: Error) => {
        console.error("Error fetching historical data:", error);
        resolve([]);
      },
      { onlyOnce: true },
    );
  });
}
