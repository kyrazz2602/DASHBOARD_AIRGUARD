import { database, ref, onValue, off, set, get, update } from "./firebase";
import { SensorReading, HistoricalData, FanSpeed } from "./sensor-data";
import type { DataSnapshot } from "firebase/database";

// ============================================================================
// 1. TYPE DEFINITIONS & INTERFACES
// ============================================================================

/**
 * State untuk kontrol kipas dan mode navigasi yang dikirim ke robot
 */
export interface FanControlState {
  speed: FanSpeed;      // Kecepatan kipas: "off" | "low" | "normal" | "high"
  isAutoMode: boolean;   // Mode navigasi otomatis (true) atau manual (false)
  updatedAt?: number;    // Timestamp pembaruan terakhir (ms)
}

/**
 * Status aktual robot yang dikirim balik oleh Arduino (Read-Only dari aplikasi)
 */
export interface DeviceStatus {
  kipas: FanSpeed;      // Status kecepatan kipas aktual
  gerak: string;        // Arah gerak aktual ("MAJU", "MUNDUR", "KIRI", "KANAN", "DIAM")
  rpmKanan: number;     // Kecepatan putaran roda kanan (RPM)
  rpmKiri: number;      // Kecepatan putaran roda kiri (RPM)
}

/**
 * Data sensor jarak LiDAR terupdate
 */
export interface LidarData {
  timestamp: string;          // Timestamp ISO dari pembacaan LiDAR
  jarak_terdekat_cm: number;  // Jarak hambatan terdekat dalam centimeter
}

// ============================================================================
// 2. DATABASE PATHS
// ============================================================================

const UDARA_PATH = "Udara";
const STATUS_PATH = "Status";
const COMMAND_PATH = "Command";
const LIDAR_PATH = "LiDAR/latest";
const HISTORY_PATH = "history";

// ============================================================================
// 3. REAL-TIME DATA SUBSCRIBERS (LISTENERS)
// ============================================================================

/**
 * Mendengarkan perubahan data sensor kualitas udara secara real-time dari /Udara
 * 
 * @param callback Fungsi handler ketika data baru diterima
 * @param onError Fungsi handler opsional ketika terjadi error
 * @returns Fungsi unsubscribe untuk membersihkan listener
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
      console.error("[listenToSensorData] Firebase error:", error);
      if (onError) onError(error);
    },
  );

  return () => off(sensorsRef, "value", listener);
}

/**
 * Mendengarkan status riil robot dari /Status (ditulis oleh Arduino)
 * 
 * @param callback Fungsi handler ketika data status baru diterima
 * @param onError Fungsi handler opsional ketika terjadi error
 * @returns Fungsi unsubscribe untuk membersihkan listener
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
      console.error("[listenToDeviceStatus] Firebase error:", error);
      if (onError) onError(error);
    },
  );

  return () => off(statusRef, "value", listener);
}

/**
 * Mendengarkan perubahan konfigurasi kontrol kipas secara real-time dari /Command
 * 
 * @param callback Fungsi handler ketika konfigurasi berubah
 * @param onError Fungsi handler opsional ketika terjadi error
 * @returns Fungsi unsubscribe untuk membersihkan listener
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
          isAutoMode: data.isAutoMode !== undefined ? Boolean(data.isAutoMode) : true,
          updatedAt: data.updatedAt,
        });
      } else {
        callback({ speed: "off", isAutoMode: true });
      }
    },
    (error: Error) => {
      console.error("[listenToFanControl] Firebase error:", error);
      if (onError) onError(error);
    },
  );

  return () => off(fanRef, "value", listener);
}

/**
 * Mendengarkan status reset filter terakhir dari /Command/filterStartDate
 * 
 * @param callback Fungsi handler ketika tanggal filter berubah
 * @returns Fungsi unsubscribe untuk membersihkan listener
 */
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
      console.error("[listenToFilterStartDate] Firebase error:", error);
    },
  );

  return () => off(filterRef, "value", listener);
}

/**
 * Mendengarkan data sensor LiDAR secara real-time dari /LiDAR/latest
 * 
 * @param callback Fungsi handler ketika data LiDAR baru diterima
 * @param onError Fungsi handler opsional ketika terjadi error
 * @returns Fungsi unsubscribe untuk membersihkan listener
 */
export function listenToLidarData(
  callback: (data: LidarData) => void,
  onError?: (error: Error) => void,
): () => void {
  const lidarRef = ref(database, LIDAR_PATH);

  const listener = onValue(
    lidarRef,
    (snapshot: DataSnapshot) => {
      const data = snapshot.val();
      if (data) {
        callback({
          timestamp: String(data.timestamp || ""),
          jarak_terdekat_cm: Number(data.jarak_terdekat_cm) || 0,
        });
      }
    },
    (error: Error) => {
      console.error("[listenToLidarData] Firebase error:", error);
      if (onError) onError(error);
    },
  );

  return () => off(lidarRef, "value", listener);
}

// ============================================================================
// 4. DATA WRITER & ACTIONS (COMMANDS)
// ============================================================================

/**
 * Memperbarui pengaturan kontrol kipas dan navigasi di /Command secara parsial.
 * Menggunakan `update` alih-alih `set` agar tidak menimpa atau menghapus field lain
 * seperti target navigasi (goal_x, goal_y) atau tanggal filter.
 * 
 * @param state Konfigurasi kontrol kipas yang baru
 */
export async function setFanControl(state: FanControlState): Promise<void> {
  const fanRef = ref(database, COMMAND_PATH);
  await update(fanRef, {
    speed: state.speed.toUpperCase(),
    isAutoMode: state.isAutoMode,
    updatedAt: Date.now(),
  });
}

/**
 * Mengatur mode navigasi robot (Otonom / Manual) di Firebase secara bersamaan
 * 
 * @param isAuto true untuk otonom (autonomous), false untuk manual
 */
export async function setNavigationMode(isAuto: boolean): Promise<void> {
  const fanRef = ref(database, COMMAND_PATH);
  await update(fanRef, {
    isAutoMode: isAuto,
    updatedAt: Date.now(),
  });

  const robotModeRef = ref(database, "robot/control/mode");
  await set(robotModeRef, isAuto ? "autonomous" : "manual");
}

/**
 * Menulis perintah arah pergerakan manual ke /Command/gerak
 * 
 * @param gerak Arah gerak ("MAJU", "MUNDUR", "KIRI", "KANAN", "DIAM")
 */
export async function setGerakCommand(gerak: string): Promise<void> {
  const gerakRef = ref(database, `${COMMAND_PATH}/gerak`);
  await set(gerakRef, gerak.toUpperCase());
}

/**
 * Mengirim koordinat target rute navigasi otonom A* ke /Command
 * 
 * @param x Posisi target sumbu X (meter)
 * @param y Posisi target sumbu Y (meter)
 */
export async function sendNavGoal(x: number, y: number): Promise<void> {
  const goalXRef = ref(database, `${COMMAND_PATH}/goal_x`);
  const goalYRef = ref(database, `${COMMAND_PATH}/goal_y`);
  await set(goalXRef, x);
  await set(goalYRef, y);
}

/**
 * Membaca pengaturan kontrol kipas saat ini secara satu kali (one-shot)
 * 
 * @returns Konfigurasi kipas saat ini atau null jika data tidak ditemukan
 */
export async function getFanControl(): Promise<FanControlState | null> {
  const fanRef = ref(database, COMMAND_PATH);
  const snapshot = await get(fanRef);
  
  if (snapshot.exists()) {
    const data = snapshot.val();
    return {
      speed: ((data.speed as string)?.toLowerCase() as FanSpeed) || "off",
      isAutoMode: data.isAutoMode !== undefined ? Boolean(data.isAutoMode) : true,
      updatedAt: data.updatedAt,
    };
  }
  return null;
}

/**
 * Mereset tanggal mulai penggunaan filter udara baru di /Command/filterStartDate
 */
export async function resetFilterStartDate(): Promise<void> {
  const filterRef = ref(database, `${COMMAND_PATH}/filterStartDate`);
  await set(filterRef, Date.now());
}

// ============================================================================
// 5. HISTORICAL DATA SERVICES
// ============================================================================

/**
 * Mengambil data historis sensor kualitas udara untuk visualisasi grafik.
 * 
 * @param days Jumlah rentang hari ke belakang yang ingin diambil
 * @returns Array data historis kualitas udara terurut kronologis
 */
export async function getHistoricalData(
  days: number,
): Promise<HistoricalData[]> {
  return new Promise((resolve) => {
    const historyRef = ref(database, HISTORY_PATH);

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

        // Urutkan data berdasarkan timestamp terlama ke terbaru
        historicalData.sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );
        resolve(historicalData);
      },
      (error: Error) => {
        console.error("[getHistoricalData] Error fetching historical data:", error);
        resolve([]);
      },
      { onlyOnce: true },
    );
  });
}
